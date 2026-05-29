import Task from '../models/task.model.js';
import Board from '../models/board.model.js';
import AppError from '../utils/AppError.js';

/**
 * TASK SERVICE — Pure business logic. No req/res objects here.
 *
 * Why separate from the controller?
 * - Unit-testable without spinning up Express or MongoDB mock.
 * - Day 8 (WebSockets): Socket.IO handlers call these same methods
 *   so real-time events and HTTP requests share identical business logic.
 * - Day 12 (AI): The AI worker calls createTask() directly to bulk-insert
 *   AI-generated tasks without going through the HTTP layer.
 *
 * Authorization model:
 * - Every method that touches a task first verifies board membership.
 * - Board access is the gate: if you can see the board, you can CRUD its tasks.
 * - The private _checkBoardAccess() helper centralizes this check so it's
 *   never accidentally forgotten in any public method.
 *
 * Drag-and-drop algorithm:
 * - Every Task has an integer `order` field within its column.
 * - moveTask() uses MongoDB's $inc operator to bulk-shift sibling tasks,
 *   preserving a gap-free, sequential ordering.
 * - This avoids floating-point "position between two numbers" strategies
 *   that lead to precision drift over time.
 */

class TaskService {
  // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

  /**
   * Verify that a user is authorized to access tasks for a given board.
   *
   * Called by every public method before touching any task data.
   * This single helper ensures authorization is never forgotten.
   *
   * @param {string} boardId - The board's MongoDB ObjectId
   * @param {string} userId  - The authenticated user's ID
   * @returns {Promise<Board>} The board document (reused by callers to avoid extra DB reads)
   * @throws {AppError} 404 if board not found, 403 if user is not a member or owner
   */
  async _checkBoardAccess(boardId, userId) {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new AppError('Board not found', 404);
    }

    const isOwner = board.owner.toString() === userId.toString();
    const isMember = board.members.some(
      (m) => m.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember) {
      throw new AppError('You do not have permission to access tasks for this board', 403);
    }

    return board;
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────

  /**
   * Create a new task and automatically assign it the next sequential order.
   *
   * Order calculation:
   * - Query for the highest-ordered task in the same column.
   * - New task gets that order + 1, placing it at the bottom.
   * - Why not use tasks.length? If any tasks were soft-deleted, the count
   *   would be wrong and orders would collide.
   *
   * Column validation:
   * - The requested column must exist in the board's columns[] array.
   * - Without this check, tasks could end up in ghost columns that the
   *   frontend Kanban doesn't render, making them invisible and unrecoverable.
   *
   * Security: createdBy is always set from the authenticated userId.
   * Never trust the client to set createdBy in the request body.
   *
   * @param {string} userId  - The authenticated user's ID (becomes createdBy)
   * @param {string} boardId - The parent board's ObjectId
   * @param {Object} data    - Task fields: title, description, column, priority, assignees, etc.
   * @returns {Promise<Task>} The newly created task document
   * @throws {AppError} 404 if board not found, 403 if unauthorized, 400 if invalid column
   */
  async createTask(userId, boardId, data) {
    const board = await this._checkBoardAccess(boardId, userId);

    // Validate that the requested column exists in the board's defined columns
    const targetColumn = data.column || board.columns[0]; // default to first column
    if (!board.columns.includes(targetColumn)) {
      throw new AppError(
        `Column "${targetColumn}" does not exist on this board. Valid columns: ${board.columns.join(', ')}`,
        400
      );
    }

    // Auto-calculate the order: place at the bottom of the column
    const highestTask = await Task.findOne({ board: boardId, column: targetColumn })
      .sort('-order')
      .select('order');
    const order = highestTask ? highestTask.order + 1 : 1;

    // Strip client-supplied fields that must be server-controlled
    const { createdBy: _cb, board: _b, order: _o, ...safeData } = data;

    const task = await Task.create({
      ...safeData,
      board: boardId,
      column: targetColumn,
      createdBy: userId,
      order,
    });

    return task;
  }

  // ─── READ (LIST) ──────────────────────────────────────────────────────────────

  /**
   * Retrieve all active tasks for a board, with optional filters.
   *
   * Why sort by order: 1?
   * - The compound index { board: 1, column: 1, order: 1 } on the Task model
   *   (created Day 2) makes this query extremely fast — MongoDB satisfies
   *   both the filter AND the sort from a single index scan.
   *
   * Filters usage example:
   * - GET /api/v1/tasks?board=<id>&column=In%20Progress&priority=high
   * - The controller strips `board` from req.query and passes the rest as filters.
   *
   * @param {string} boardId  - The parent board's ObjectId
   * @param {string} userId   - The authenticated user's ID
   * @param {Object} filters  - Additional Mongoose query filters (column, priority, etc.)
   * @returns {Promise<Task[]>} Array of task documents, sorted by column order
   * @throws {AppError} 404/403 if board access fails
   */
  async getTasks(boardId, userId, filters = {}) {
    await this._checkBoardAccess(boardId, userId);

    const tasks = await Task.find({ board: boardId, isArchived: false, ...filters })
      .sort({ column: 1, order: 1 })
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    return tasks;
  }

  // ─── READ (SINGLE) ────────────────────────────────────────────────────────────

  /**
   * Retrieve a single task by ID.
   *
   * Authorization: we first fetch the task, then use its board field to call
   * _checkBoardAccess(). This means we always confirm the task exists AND
   * the user can access its parent board in two sequential checks.
   *
   * Why not pass boardId directly from the route?
   * - The task route is /api/v1/tasks/:id — there is no boardId in the URL.
   * - We derive the boardId from the task document itself, so the client can't
   *   attempt to trick us by passing a different boardId.
   *
   * @param {string} taskId - The task's MongoDB ObjectId
   * @param {string} userId - The authenticated user's ID
   * @returns {Promise<Task>} The populated task document
   * @throws {AppError} 404 if task not found, 403 if unauthorized
   */
  async getTaskById(taskId, userId) {
    const task = await Task.findById(taskId)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Verify board access using the task's own board reference
    await this._checkBoardAccess(task.board, userId);

    return task;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  /**
   * Update a task's editable fields.
   *
   * Security: the `order`, `board`, and `createdBy` fields are stripped from
   * the update payload. Changing the task's order must go through moveTask()
   * to ensure sibling tasks are properly re-sequenced.
   *
   * Why findByIdAndUpdate over task.save()?
   * - We only want to update specific user-provided fields.
   * - runValidators: true ensures schema-level validation fires on the new values.
   * - new: true returns the updated document (not the pre-update version).
   *
   * @param {string} taskId - The task's MongoDB ObjectId
   * @param {string} userId - The authenticated user's ID
   * @param {Object} data   - Fields to update (title, description, priority, assignees, etc.)
   * @returns {Promise<Task>} The updated task document
   * @throws {AppError} 404 if not found, 403 if unauthorized
   */
  async updateTask(taskId, userId, data) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    await this._checkBoardAccess(task.board, userId);

    // Strip fields that must not be changed via a standard update
    const { order: _o, board: _b, createdBy: _cb, ...safeData } = data;

    const updatedTask = await Task.findByIdAndUpdate(taskId, safeData, {
      new: true,
      runValidators: true,
    })
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    return updatedTask;
  }

  // ─── MOVE (DRAG AND DROP) ─────────────────────────────────────────────────────

  /**
   * Move a task to a new position, persisting the drag-and-drop result.
   *
   * The algorithm maintains a perfectly sequential, gap-free order numbering
   * across all tasks in each column using MongoDB's atomic $inc operator.
   *
   * CASE 1 — Moved within the same column:
   *   Sub-case A: Dragged DOWN (order increases, e.g., position 2 → position 5)
   *     Tasks between old position (exclusive) and new position (inclusive) shift UP by -1.
   *     Example: [1, 2, 3, 4, 5] moving 2 → 5: tasks at 3,4,5 become 2,3,4; task becomes 5.
   *
   *   Sub-case B: Dragged UP (order decreases, e.g., position 5 → position 2)
   *     Tasks between new position (inclusive) and old position (exclusive) shift DOWN by +1.
   *     Example: [1, 2, 3, 4, 5] moving 5 → 2: tasks at 2,3,4 become 3,4,5; task becomes 2.
   *
   * CASE 2 — Moved to a different column:
   *   Step 1: In the SOURCE column, all tasks BELOW the moved task shift UP by -1.
   *           (Fills the gap left by the departing task.)
   *   Step 2: In the TARGET column, all tasks at newOrder AND ABOVE shift DOWN by +1.
   *           (Makes room for the arriving task.)
   *   Step 3: Update the task's own column and order.
   *
   * Why $inc instead of setting explicit order numbers on every sibling?
   * - $inc is atomic and affects only the relevant range of tasks.
   * - A single updateMany() call is one DB round-trip vs. N individual saves.
   * - Bulk atomic operations prevent race conditions from concurrent drags.
   *
   * @param {string} taskId      - The task's MongoDB ObjectId
   * @param {string} userId      - The authenticated user's ID
   * @param {Object} moveParams  - { targetColumn: string, newOrder: number }
   * @returns {Promise<Task>} The task after it has been moved
   * @throws {AppError} 404 if task not found, 403 if unauthorized, 400 if bad column
   */
  async moveTask(taskId, userId, { targetColumn, newOrder }) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const board = await this._checkBoardAccess(task.board, userId);

    // Validate the target column exists on this board
    if (!board.columns.includes(targetColumn)) {
      throw new AppError(
        `Column "${targetColumn}" does not exist on this board. Valid columns: ${board.columns.join(', ')}`,
        400
      );
    }

    // No-op: nothing to change
    if (task.column === targetColumn && task.order === newOrder) {
      return task;
    }

    if (task.column === targetColumn) {
      // ── CASE 1: Same column reorder ──────────────────────────────────────
      if (task.order < newOrder) {
        // Dragged DOWN: shift intermediate tasks UP
        await Task.updateMany(
          {
            board: task.board,
            column: targetColumn,
            order: { $gt: task.order, $lte: newOrder },
            isArchived: false,
          },
          { $inc: { order: -1 } }
        );
      } else {
        // Dragged UP: shift intermediate tasks DOWN
        await Task.updateMany(
          {
            board: task.board,
            column: targetColumn,
            order: { $gte: newOrder, $lt: task.order },
            isArchived: false,
          },
          { $inc: { order: 1 } }
        );
      }
    } else {
      // ── CASE 2: Cross-column move ─────────────────────────────────────────

      // Step 1: Close the gap in the SOURCE column
      await Task.updateMany(
        {
          board: task.board,
          column: task.column,
          order: { $gt: task.order },
          isArchived: false,
        },
        { $inc: { order: -1 } }
      );

      // Step 2: Open a slot in the TARGET column
      await Task.updateMany(
        {
          board: task.board,
          column: targetColumn,
          order: { $gte: newOrder },
          isArchived: false,
        },
        { $inc: { order: 1 } }
      );
    }

    // Step 3: Update the task's own column and order using findByIdAndUpdate
    // (safer than task.save() which could overwrite concurrent changes to other fields)
    const movedTask = await Task.findByIdAndUpdate(
      taskId,
      { column: targetColumn, order: newOrder },
      { new: true, runValidators: true }
    )
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    return movedTask;
  }

  // ─── DELETE (SOFT) ────────────────────────────────────────────────────────────

  /**
   * Soft-delete a task by setting isArchived: true.
   *
   * Why soft delete?
   * - Hard deletes are irreversible. Accidental deletions destroy user data.
   * - isArchived: true hides the task from all getTasks() queries but preserves
   *   the document for audit trails and potential restore functionality.
   * - All future queries explicitly filter isArchived: false.
   *
   * Important: soft-deleting a task does NOT re-sequence sibling task orders.
   * The gap is harmless — order is relative, not positional. When a user
   * later drags a task, moveTask() re-sequences everything correctly.
   *
   * @param {string} taskId - The task's MongoDB ObjectId
   * @param {string} userId - The authenticated user's ID
   * @returns {Promise<null>} null — 204 No Content has no body
   * @throws {AppError} 404 if task not found, 403 if unauthorized
   */
  async deleteTask(taskId, userId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    await this._checkBoardAccess(task.board, userId);

    task.isArchived = true;
    await task.save();

    return null;
  }
}

export default new TaskService();
