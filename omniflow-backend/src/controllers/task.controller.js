import taskService from '../services/task.service.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

/**
 * TASK CONTROLLER — Handles HTTP request/response for task endpoints.
 *
 * Thin by design — mirrors the board.controller.js and auth.controller.js patterns:
 * 1. Extract and validate data from req (params, body, query, user)
 * 2. Call the service method
 * 3. Format and send the HTTP response
 * NO business logic here — that lives entirely in task.service.js.
 *
 * Every handler is wrapped in catchAsync() so any thrown AppError
 * automatically flows to the global error handler without try/catch blocks.
 *
 * Response shape convention:
 *   { status: 'success', data: { task } }              ← single resource
 *   { status: 'success', results: N, data: { tasks } } ← collection
 *   HTTP 204 No Content                                 ← delete (no body)
 *
 * Route structure (see task.routes.js):
 *   POST   /api/v1/tasks              → createTask
 *   GET    /api/v1/tasks?board=<id>   → getTasks
 *   GET    /api/v1/tasks/:id          → getTask
 *   PATCH  /api/v1/tasks/:id          → updateTask
 *   DELETE /api/v1/tasks/:id          → deleteTask
 *   POST   /api/v1/tasks/:id/move     → moveTask (drag-and-drop)
 */

// ─── POST /api/v1/tasks ───────────────────────────────────────────────────────
/**
 * Create a new task on a board.
 *
 * The boardId must be provided as `board` in the request body.
 * We validate its presence here (controller input validation) before
 * passing to the service (which validates board access and column).
 *
 * Expected body: { board: "<boardId>", title: "...", column: "To Do", ... }
 */
export const createTask = catchAsync(async (req, res) => {
  const boardId = req.body.board;

  if (!boardId) {
    throw new AppError('A board ID is required to create a task. Provide it as "board" in the request body.', 400);
  }

  const task = await taskService.createTask(req.user._id, boardId, req.body);
  res.status(201).json({
    status: 'success',
    data: { task },
  });
});

// ─── GET /api/v1/tasks?board=<boardId>&column=<col>&priority=<p> ──────────────
/**
 * Get all tasks for a board, with optional column/priority/status filters.
 *
 * Why boardId from query params instead of a nested route (/boards/:id/tasks)?
 * - Both patterns are valid REST. We chose flat routes because:
 *   a) The frontend (Day 6) queries tasks independently of the board route.
 *   b) Filtering by column and priority is easier with query params.
 *   c) /api/v1/boards/:id/tasks is still a valid future enhancement.
 *
 * The `board` param is extracted from query and passed to the service.
 * All remaining query params become Mongoose filter conditions.
 *
 * Example: GET /api/v1/tasks?board=<id>&column=In%20Progress&priority=high
 */
export const getTasks = catchAsync(async (req, res) => {
  const { board: boardId, ...filters } = req.query;

  if (!boardId) {
    throw new AppError('A board ID is required. Provide it as "board" in the query string.', 400);
  }

  const tasks = await taskService.getTasks(boardId, req.user._id, filters);
  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: { tasks },
  });
});

// ─── GET /api/v1/tasks/:id ────────────────────────────────────────────────────
/**
 * Get a single task by its MongoDB ObjectId.
 * Returns 404 if not found, 403 if the user can't access the parent board.
 */
export const getTask = catchAsync(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id, req.user._id);
  res.status(200).json({
    status: 'success',
    data: { task },
  });
});

// ─── PATCH /api/v1/tasks/:id ──────────────────────────────────────────────────
/**
 * Update a task's editable fields (title, description, priority, assignees, etc.).
 * To change a task's column or position, use POST /:id/move instead.
 * Returns 200 with the updated task document.
 */
export const updateTask = catchAsync(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.user._id, req.body);
  res.status(200).json({
    status: 'success',
    data: { task },
  });
});

// ─── POST /api/v1/tasks/:id/move ──────────────────────────────────────────────
/**
 * Move a task to a new column and/or position (drag-and-drop persistence).
 *
 * Why a dedicated /move endpoint instead of PATCH /:id?
 * - Drag-and-drop is semantically different from editing task content.
 * - The service must re-sequence ALL sibling tasks atomically, not just
 *   update a single field.
 * - A dedicated endpoint makes the intent explicit and allows different
 *   validation rules (targetColumn and newOrder are required here).
 * - The Day 8 WebSocket handler will also call this endpoint's logic
 *   to emit real-time board sync events.
 *
 * Expected body: { targetColumn: "In Progress", newOrder: 2 }
 */
export const moveTask = catchAsync(async (req, res) => {
  const { targetColumn, newOrder } = req.body;

  if (!targetColumn) {
    throw new AppError('targetColumn is required to move a task.', 400);
  }
  if (newOrder === undefined || newOrder === null) {
    throw new AppError('newOrder is required to move a task.', 400);
  }

  const task = await taskService.moveTask(req.params.id, req.user._id, {
    targetColumn,
    newOrder: Number(newOrder),
  });
  res.status(200).json({
    status: 'success',
    data: { task },
  });
});

// ─── DELETE /api/v1/tasks/:id ─────────────────────────────────────────────────
/**
 * Soft-delete a task (sets isArchived: true).
 *
 * Returns HTTP 204 No Content.
 * We call res.status(204).send() — NOT .json() — because the HTTP spec
 * prohibits a message body on 204 responses.
 */
export const deleteTask = catchAsync(async (req, res) => {
  await taskService.deleteTask(req.params.id, req.user._id);
  res.status(204).send(); // 204 No Content — no body allowed
});
