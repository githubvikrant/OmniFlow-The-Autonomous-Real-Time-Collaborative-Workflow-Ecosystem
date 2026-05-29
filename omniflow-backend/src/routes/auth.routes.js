import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../utils/validators.js';

const router = Router();

/**
 * PUBLIC ROUTES — No authentication required
 *
 * POST /api/v1/auth/register  — Create a new account
 * POST /api/v1/auth/login     — Login and receive access + refresh tokens
 * POST /api/v1/auth/logout    — Clear the refresh token cookie
 * POST /api/v1/auth/refresh-token — Exchange refresh token for new access token
 */
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh-token', AuthController.refreshToken);

/**
 * PROTECTED ROUTES — require a valid JWT (Bearer token in Authorization header)
 *
 * GET   /api/v1/auth/me              — Get logged-in user's profile
 * PATCH /api/v1/auth/change-password — Change password (must know current password)
 */
router.get('/me', protect, AuthController.getMe);
router.patch(
  '/change-password',
  protect,
  validate(changePasswordSchema),
  AuthController.changePassword
);

export default router;
