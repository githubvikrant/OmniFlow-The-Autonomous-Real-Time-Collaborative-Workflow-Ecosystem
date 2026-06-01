import taskService from '../services/task.service.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import Task from '../models/task.model.js'; // ← Day 8: needed to fetch boardId before delete
import {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskMoved,
  emitTaskDeleted,
  emitTasksBulkAdded,
} from '../sockets/socket.service.js'; // ← Day 8: real-time broadcast helpers
import aiService from '../services/ai.service.js';

/**
 * TASK CONTROLLER — Handles HTTP request/response for task endpoints.
 *
 * Thin by design — mirrors the board.controller.js and auth.controller.js patterns:
 * 1. Extract and validate data from req (params, body, query, user)
 * 2. Call the service method
 * 3. Emit a Socket.IO event to all board members  ← NEW Day 8
 * 4. Format and send the HTTP response
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
 *
 * DAY 8 — Socket.IO emit pattern:
 *   After every mutation, we call the corresponding socketService.emit*() helper.
 *   We pass `req.socketId` (the client's socket ID from the request header) so we
 *   can use Socket.IO's .except(socketId) to avoid sending the event back to the
 *   actor — they already updated their UI optimistically.
 *
 *   How the client sends its socketId:
 *     axios interceptor sends: X-Socket-ID: <socket.id>
 *     We read it here:         req.headers['x-socket-id']
 *
 *   Why not include boardId in the task route URL?
 *   - The task service derives boardId from the task document.
 *   - For create: boardId comes from req.body.board.
 *   - For update/move/delete: the service returns the task which has task.board.
 *   - We extract boardId from the returned task to pass to socketService.
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
 *
 * Socket event: task:created → all other users on the same board
 */
export const createTask = catchAsync(async (req, res) => {
  const boardId = req.body.board;

  if (!boardId) {
    throw new AppError('A board ID is required to create a task. Provide it as "board" in the request body.', 400);
  }

  const task = await taskService.createTask(req.user._id, boardId, req.body);

  // Day 8: Broadcast the new task to all other users on this board.
  // The actor (who made the POST request) has already added the task
  // to their local Zustand store optimistically — so we exclude them.
  const actorSocketId = req.headers['x-socket-id'] || null;
  emitTaskCreated(boardId, task, actorSocketId);

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
 *
 * No socket event: this is a read — nothing changed on the board.
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
 *
 * No socket event: this is a read — nothing changed on the board.
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
 *
 * Socket event: task:updated → all other users on the same board.
 * The boardId is read from task.board (the returned updated task document).
 */
export const updateTask = catchAsync(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.user._id, req.body);

  // Day 8: Broadcast the update to everyone else on the board
  const boardId = task.board.toString();
  const actorSocketId = req.headers['x-socket-id'] || null;
  emitTaskUpdated(boardId, task, actorSocketId);

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
 *
 * Expected body: { targetColumn: "In Progress", newOrder: 2 }
 *
 * Socket event: task:moved → all other users on the same board.
 * This event is what makes drag-and-drop feel real-time for teammates.
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

  // Day 8: Broadcast the move to all other users in the board room.
  // We send just the minimal payload (not the full task) — the client already
  // has all task details; it just needs to know the new position.
  const boardId = task.board.toString();
  const actorSocketId = req.headers['x-socket-id'] || null;
  emitTaskMoved(boardId, task._id.toString(), targetColumn, Number(newOrder), actorSocketId);

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
 *
 * Socket event: task:deleted → all other users on the same board.
 * We need the boardId BEFORE deleting, so we fetch the task first.
 */
export const deleteTask = catchAsync(async (req, res) => {
  // Day 8: We need task.board for the socket event, but deleteTask() returns null.
  // Fetch the board reference BEFORE the service deletes it.
  const taskForBoard = await Task.findById(req.params.id).select('board');

  await taskService.deleteTask(req.params.id, req.user._id);

  // Broadcast deletion to all other users on the board
  if (taskForBoard) {
    const boardId = taskForBoard.board.toString();
    const actorSocketId = req.headers['x-socket-id'] || null;
    emitTaskDeleted(boardId, req.params.id, actorSocketId);
  }

  res.status(204).send(); // 204 No Content — no body allowed
});

// ─── POST /api/v1/tasks/:id/attachments ───────────────────────────────────────
/**
 * Add a file attachment to a task via Cloudinary.
 * The file is intercepted by the Multer middleware.
 */
export const addAttachment = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('Please provide a file to upload.', 400);
  }

  const fileData = {
    url: req.file.path,
    publicId: req.file.filename,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    fileType: req.file.mimetype,
  };

  const task = await taskService.addAttachment(req.params.id, req.user._id, fileData);

  // Broadcast the update to everyone else on the board
  const boardId = task.board.toString();
  const actorSocketId = req.headers['x-socket-id'] || null;
  emitTaskUpdated(boardId, task, actorSocketId);

  res.status(200).json({
    status: 'success',
    data: { task },
  });
});

// ─── DELETE /api/v1/tasks/:taskId/attachments/:attachmentId ───────────────────
/**
 * Delete a file attachment from a task.
 */
export const deleteAttachment = catchAsync(async (req, res) => {
  const task = await taskService.deleteAttachment(
    req.params.taskId,
    req.params.attachmentId,
    req.user._id
  );

  // Broadcast the update to everyone else on the board
  const boardId = task.board.toString();
  const actorSocketId = req.headers['x-socket-id'] || null;
  emitTaskUpdated(boardId, task, actorSocketId);

  res.status(200).json({
    status: 'success',
    data: { task },
  });
});

// ─── POST /api/v1/tasks/generate ──────────────────────────────────────────────
/**
 * Generate tasks using AI and bulk add them to the board.
 */
export const generateTasks = catchAsync(async (req, res) => {
  const { board, prompt } = req.body;

  if (!board) {
    throw new AppError('board ID is required', 400);
  }
  if (!prompt) {
    throw new AppError('prompt is required', 400);
  }

  // 1. Ask AI to generate tasks
  const generatedTasksData = await aiService.generateTasks(prompt);

  if (!generatedTasksData || generatedTasksData.length === 0) {
    throw new AppError('AI failed to generate any tasks.', 500);
  }

  // 2. Bulk insert tasks to DB
  const createdTasks = await taskService.bulkCreateTasks(req.user._id, board, generatedTasksData);

  // 3. Broadcast to board
  const actorSocketId = req.headers['x-socket-id'] || null;
  emitTasksBulkAdded(board, createdTasks, actorSocketId);

  res.status(201).json({
    status: 'success',
    results: createdTasks.length,
    data: { tasks: createdTasks },
  });
});
