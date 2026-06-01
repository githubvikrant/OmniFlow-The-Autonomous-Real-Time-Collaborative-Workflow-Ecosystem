import Board from '../models/board.model.js';
import User from '../models/user.model.js';
import AppError from '../utils/AppError.js';

/**
 * BOARD SERVICE — Pure business logic. No req/res objects here.
 *
 * Why separate from the controller?
 * - Unit-testable without spinning up Express or MongoDB mock.
 * - Socket.IO handlers (Day 8) can call these same methods directly.
 * - Clear separation: controller handles HTTP, service handles business rules.
 *
 * Authorization model:
 * - Board-level RBAC is enforced here — not in a middleware.
 * - Why? Because access rules depend on the board's own data (owner, members),
 *   which requires a DB read. The service is the correct layer for that.
 * - Global roles (admin/member/viewer) are checked by the `protect` middleware.
 *   Board-level roles (owner / member with 'admin' role) are checked here.
 *
 * Pattern: every mutating method follows:
 *   1. findById()       — confirm the board exists
 *   2. Permission check — throw 403 if unauthorized
 *   3. Perform mutation — update or soft-delete
 *   4. Return result    — let the controller format the HTTP response
 */

class BoardService {
  // ─── CREATE ──────────────────────────────────────────────────────────────────

  /**
   * Create a new board and assign the creator as owner.
   *
   * Why set owner from userId and NOT from req.body?
   * - Trusting the client to set their own owner field is a privilege escalation risk.
   * - A malicious user could set owner to any user ID.
   * - We always derive owner from the authenticated user's ID (set by protect middleware).
   *
   * @param {string} userId - The authenticated user's ID (from req.user._id)
   * @param {Object} data   - Board fields from req.body (name, description, color, columns, etc.)
   * @returns {Promise<Board>} The newly created board document
   */
  async createBoard(userId, data) {
    // Prevent clients from injecting an owner field — always use the authenticated user
    const { owner: _ignored, ...safeData } = data;

    const board = await Board.create({
      ...safeData,
      owner: userId,
    });
    return board;
  }

  // ─── READ (LIST) ──────────────────────────────────────────────────────────────

  /**
   * Get all active boards where the user is the owner OR an explicit member.
   *
   * Why $or query instead of two separate queries?
   * - A single query is one DB round-trip instead of two.
   * - MongoDB uses the compound index { owner: 1, createdAt: -1 } and
   *   { 'members.user': 1 } indexes we set up on Day 2 to serve this efficiently.
   *
   * Why filter isArchived: false?
   * - Soft-deleted boards are excluded from the normal list view.
   * - An admin can later query archived boards explicitly if needed.
   *
   * @param {string} userId - The authenticated user's ID
   * @returns {Promise<Board[]>} Array of boards, newest first
   */
  async getBoards(userId) {
    const boards = await Board.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
      isArchived: false,
    })
      .populate('owner', 'name email avatar')
      .sort({ createdAt: -1 });

    return boards;
  }

  // ─── READ (SINGLE) ────────────────────────────────────────────────────────────

  /**
   * Get a single board by ID, enforcing board-level access control.
   *
   * Authorization check:
   * - ONLY the board owner OR a user listed in members[] can see this board.
   * - If neither → 403 Forbidden (we know who you are, you just can't see this).
   *
   * Why populate members.user?
   * - The frontend needs user details (name, avatar) to render the member list.
   * - We only select non-sensitive fields: name, email, avatar.
   *
   * @param {string} boardId - The board's MongoDB ObjectId
   * @param {string} userId  - The authenticated user's ID
   * @returns {Promise<Board>} The populated board document
   * @throws {AppError} 404 if board not found, 403 if unauthorized
   */
  async getBoardById(boardId, userId) {
    const board = await Board.findById(boardId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    // Check authorization: must be owner or member
    const isOwner = board.owner._id.toString() === userId.toString();
    const isMember = board.members.some(
      (m) => m.user._id.toString() === userId.toString()
    );

    if (!isOwner && !isMember) {
      throw new AppError('You do not have permission to access this board', 403);
    }

    return board;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  /**
   * Update board details. Only the owner or an admin member may update.
   *
   * Two-step process:
   * 1. findById() — to read the current authorization state (owner, members)
   * 2. findByIdAndUpdate() — to apply the update with runValidators
   *
   * Why not combine into a single findByIdAndUpdate with a condition?
   * - MongoDB's filter in findByIdAndUpdate doesn't easily express the
   *   "owner OR (member WITH role=admin)" RBAC logic.
   * - Reading first and checking in JS keeps the authorization readable and testable.
   *
   * Security: we strip protected fields (owner, isArchived) from the update
   * payload to prevent privilege escalation via the update body.
   *
   * @param {string} boardId - The board's MongoDB ObjectId
   * @param {string} userId  - The authenticated user's ID
   * @param {Object} data    - Fields to update (name, description, color, columns)
   * @returns {Promise<Board>} The updated board document
   * @throws {AppError} 404 if not found, 403 if unauthorized
   */
  async updateBoard(boardId, userId, data) {
    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    const isOwner = board.owner.toString() === userId.toString();
    const member = board.members.find(
      (m) => m.user.toString() === userId.toString()
    );
    const isAdminMember = member && member.role === 'admin';

    if (!isOwner && !isAdminMember) {
      throw new AppError('Only the board owner or admins can update the board', 403);
    }

    // Strip fields that must not be updated via this endpoint
    const { owner: _o, isArchived: _a, ...safeData } = data;

    const updatedBoard = await Board.findByIdAndUpdate(
      boardId,
      safeData,
      { new: true, runValidators: true }
    ).populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    return updatedBoard;
  }

  // ─── DELETE (SOFT) ────────────────────────────────────────────────────────────

  /**
   * Soft-delete a board by setting isArchived: true.
   *
   * Why soft delete instead of Board.findByIdAndDelete()?
   * - Hard deletes are irreversible — a user mistake destroys weeks of work.
   * - isArchived: true hides the board from all queries but preserves the data.
   * - An admin restore feature (future day) can flip isArchived back to false.
   * - The associated Task documents are NOT deleted here — they remain for audit.
   *
   * Authorization: only the owner or an admin member can archive a board.
   * Why stricter than updateBoard? Archiving is a destructive action — regular
   * members should never be able to make a board disappear for the whole team.
   *
   * @param {string} boardId - The board's MongoDB ObjectId
   * @param {string} userId  - The authenticated user's ID
   * @returns {Promise<null>} null — 204 No Content response has no body
   * @throws {AppError} 404 if not found, 403 if unauthorized
   */
  async deleteBoard(boardId, userId) {
    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    const isOwner = board.owner.toString() === userId.toString();
    const member = board.members.find(
      (m) => m.user.toString() === userId.toString()
    );
    const isAdminMember = member && member.role === 'admin';

    if (!isOwner && !isAdminMember) {
      throw new AppError('Only the board owner or admins can delete the board', 403);
    }

    board.isArchived = true;
    await board.save();

    return null;
  }

  // ─── MEMBERS ──────────────────────────────────────────────────────────────────

  /**
   * Add a new member to the board by email.
   *
   * @param {string} boardId - The board's MongoDB ObjectId
   * @param {string} userId - The authenticated user's ID
   * @param {string} email - The email address of the user to invite
   * @param {string} role - The role to assign (default: 'member')
   */
  async addMember(boardId, userId, email, role = 'member') {
    const board = await Board.findById(boardId);

    if (!board) {
      throw new AppError('Board not found', 404);
    }

    const isOwner = board.owner.toString() === userId.toString();
    const member = board.members.find(
      (m) => m.user.toString() === userId.toString()
    );
    const isAdminMember = member && member.role === 'admin';

    if (!isOwner && !isAdminMember) {
      throw new AppError('Only the board owner or admins can add members', 403);
    }

    const newUser = await User.findOne({ email: email.toLowerCase() });
    if (!newUser) {
      throw new AppError('User not found with that email address', 404);
    }

    if (board.owner.toString() === newUser._id.toString()) {
      throw new AppError('This user is already the owner of the board', 400);
    }

    const isAlreadyMember = board.members.some(
      (m) => m.user.toString() === newUser._id.toString()
    );
    if (isAlreadyMember) {
      throw new AppError('User is already a member of this board', 400);
    }

    board.members.push({ user: newUser._id, role });
    await board.save();

    // Return the updated populated board
    return this.getBoardById(boardId, userId);
  }
}

export default new BoardService();
