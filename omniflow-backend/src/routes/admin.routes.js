import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect and restrict ALL admin routes to admin role only
router.use(protect, authorize('admin'));

router.get('/stats', AdminController.getEcosystemStats);
router.get('/users', AdminController.getAllUsers);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.patch('/users/:id/role', AdminController.updateUserRole);
router.get('/projects', AdminController.getAllProjects);

export default router;
