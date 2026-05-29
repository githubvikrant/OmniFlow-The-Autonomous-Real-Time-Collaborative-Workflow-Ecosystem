import { Router } from 'express';
import passport from 'passport';
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

/**
 * GOOGLE OAUTH ROUTES — Day 5
 *
 * These two routes together implement the full OAuth 2.0 Authorization Code flow.
 * There is no request body, no JSON — it's a browser redirect dance.
 *
 * Route 1: GET /api/v1/auth/google
 *   - Passport redirects the browser to Google's OAuth consent page.
 *   - `scope` tells Google what data we need: profile info and email address.
 *   - Google shows the user a "OmniFlow wants to access your account" screen.
 *
 * Route 2: GET /api/v1/auth/google/callback
 *   - After the user consents, Google redirects HERE with a one-time `code`.
 *   - Passport exchanges that code for user profile data (server-to-server call).
 *   - Our verify callback in passport.middleware.js runs (upserts the user).
 *   - On success → AuthController.googleCallback issues our JWTs and redirects to frontend.
 *   - On failure → redirects to /login with an error query param.
 *
 * Why `session: false`?
 *   Passport normally serializes the user into a server-side session after OAuth.
 *   We don't use sessions — our app is stateless (JWT-based). Passing
 *   `session: false` tells Passport to skip session serialization entirely.
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'], // request access to name, Google ID, and email
    session: false,              // we handle state via JWTs, not server sessions
  })
);

router.get(
  '/google/callback',
  // failureRedirect: if Google auth fails (user denied, network error, etc.)
  // send the browser back to the login page with a clear error message
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed`,
  }),
  // If passport.authenticate succeeds, req.user is set and this handler runs
  AuthController.googleCallback
);

export default router;
