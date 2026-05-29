import boardService from '../services/board.service.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * BOARD CONTROLLER — Handles HTTP request/response for board endpoints.
 *
 * Thin by design — mirrors the auth.controller.js pattern from Day 3:
 * 1. Extract data from req (params, body, user)
 * 2. Call the service method
 * 3. Format and send the HTTP response
 * NO business logic here — that lives entirely in board.service.js.
 *
 * Every handler is wrapped in catchAsync() so any thrown AppError
 * (or any other rejected promise) automatically flows to the global
 * error handler in app.js without needing explicit try/catch blocks.
 *
 * Response shape convention (consistent across all controllers):
 *   { status: 'success', data: { <resource> } }        ← single resource
 *   { status: 'success', results: N, data: { <list> } } ← collection
 *   HTTP 204 No Content                                  ← delete (no body)
 */

// ─── POST /api/v1/boards ──────────────────────────────────────────────────────
/**
 * Create a new board.
 * The authenticated user (req.user._id) automatically becomes the board owner.
 * Returns 201 Created with the new board document.
 */
export const createBoard = catchAsync(async (req, res) => {
  const board = await boardService.createBoard(req.user._id, req.body);
  res.status(201).json({
    status: 'success',
    data: { board },
  });
});

// ─── GET /api/v1/boards ───────────────────────────────────────────────────────
/**
 * Get all boards where the user is owner or a member.
 * Returns 200 with an array (can be empty []) and a results count.
 */
export const getBoards = catchAsync(async (req, res) => {
  const boards = await boardService.getBoards(req.user._id);
  res.status(200).json({
    status: 'success',
    results: boards.length,
    data: { boards },
  });
});

// ─── GET /api/v1/boards/:id ───────────────────────────────────────────────────
/**
 * Get a single board by ID.
 * Returns 404 if not found, 403 if user is not a member/owner.
 */
export const getBoard = catchAsync(async (req, res) => {
  const board = await boardService.getBoardById(req.params.id, req.user._id);
  res.status(200).json({
    status: 'success',
    data: { board },
  });
});

// ─── PATCH /api/v1/boards/:id ─────────────────────────────────────────────────
/**
 * Update board details (name, description, color, columns).
 * Only the board owner or an admin member may update.
 * Returns 200 with the updated board document.
 */
export const updateBoard = catchAsync(async (req, res) => {
  const board = await boardService.updateBoard(req.params.id, req.user._id, req.body);
  res.status(200).json({
    status: 'success',
    data: { board },
  });
});

// ─── DELETE /api/v1/boards/:id ────────────────────────────────────────────────
/**
 * Soft-delete a board (sets isArchived: true).
 * Only the board owner or an admin member may delete.
 *
 * Returns HTTP 204 No Content.
 * Why 204 instead of 200?
 * - 204 is the standard HTTP status for "operation succeeded, nothing to return."
 * - HTTP spec requires 204 responses to have NO body.
 * - We call res.status(204).send() — NOT .json() — to comply with the spec.
 *   Some HTTP clients (and Node.js itself) will strip the body from 204 responses
 *   even if you write one, causing client-side parse errors.
 */
export const deleteBoard = catchAsync(async (req, res) => {
  await boardService.deleteBoard(req.params.id, req.user._id);
  res.status(204).send(); // 204 No Content — no body allowed
});
