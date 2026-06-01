import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  moveTask,
  deleteTask,
  addAttachment,
  deleteAttachment,
  generateTasks,
} from '../controllers/task.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.middleware.js';

/**
 * TASK ROUTES — /api/v1/tasks
 *
 * All routes are protected by the `protect` middleware (applied at the router
 * level via router.use(protect)), which verifies the JWT and attaches
 * req.user before any handler runs.
 *
 * Board membership authorization is enforced inside task.service.js —
 * every task operation verifies the user belongs to the task's parent board.
 *
 * Route map:
 *   POST   /api/v1/tasks              → createTask   body: { board, title, column, ... }
 *   GET    /api/v1/tasks?board=<id>   → getTasks     query: { board (required), column?, priority? }
 *   GET    /api/v1/tasks/:id          → getTask
 *   PATCH  /api/v1/tasks/:id          → updateTask   body: { title?, description?, priority?, ... }
 *   DELETE /api/v1/tasks/:id          → deleteTask   → 204 No Content
 *   POST   /api/v1/tasks/:id/move     → moveTask     body: { targetColumn, newOrder }
 *
 * Why is /move a POST and not PATCH?
 * - PATCH semantically means "partially update the resource's own fields."
 * - Moving a task triggers a bulk re-sequencing of sibling tasks (a side effect
 *   beyond updating the task document itself).
 * - POST /tasks/:id/move more accurately describes a "perform this action"
 *   operation (an RPC-style action endpoint), which is a common REST convention
 *   for operations that have side effects beyond the target resource.
 */

const router = Router();

// Apply protect middleware to ALL task routes
router.use(protect);

// ─── IMPORTANT: Specific routes must be defined BEFORE parameterized routes ───
// POST /tasks/:id/move must be registered before /:id to avoid Express
// interpreting "move" as an :id parameter value.
router.post('/:id/move', moveTask);

// ─── Attachments ───
router.post('/:id/attachments', upload.single('file'), addAttachment);
router.delete('/:taskId/attachments/:attachmentId', deleteAttachment);

// Collection-level routes: /api/v1/tasks
router.post('/generate', generateTasks);

router
  .route('/')
  .post(createTask)  // Create a task (board ID required in body)
  .get(getTasks);    // List tasks for a board (board ID required in query)

// Resource-level routes: /api/v1/tasks/:id
router
  .route('/:id')
  .get(getTask)        // Get a single task
  .patch(updateTask)   // Update task content fields
  .delete(deleteTask); // Soft-delete a task

export default router;
