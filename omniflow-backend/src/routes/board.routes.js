import { Router } from 'express';
import {
  createBoard,
  getBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  addMember,
} from '../controllers/board.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

/**
 * BOARD ROUTES — /api/v1/boards
 *
 * All routes are protected by the `protect` middleware (applied at the router
 * level via router.use(protect)), which verifies the JWT and attaches
 * req.user before any handler runs.
 *
 * Board-level RBAC (owner vs. admin member) is enforced inside board.service.js,
 * NOT here — because it depends on board data that requires a DB read.
 *
 * Route map:
 *   POST   /api/v1/boards        → createBoard  (any authenticated user)
 *   GET    /api/v1/boards        → getBoards    (any authenticated user)
 *   GET    /api/v1/boards/:id    → getBoard     (owner or member only)
 *   PATCH  /api/v1/boards/:id    → updateBoard  (owner or admin member only)
 *   DELETE /api/v1/boards/:id    → deleteBoard  (owner or admin member only)
 */

const router = Router();

// Apply protect middleware to ALL board routes.
// This is more concise than adding `protect` to every individual route definition.
router.use(protect);

// Collection-level routes: /api/v1/boards
router
  .route('/')
  .post(createBoard)   // Create a new board
  .get(getBoards);     // List all boards for the current user

// Resource-level routes: /api/v1/boards/:id
router
  .route('/:id')
  .get(getBoard)       // Get a specific board
  .patch(updateBoard)  // Update board details
  .delete(deleteBoard); // Soft-delete (archive) a board

// Route to add a member to a board
router.post('/:id/members', addMember);

export default router;
