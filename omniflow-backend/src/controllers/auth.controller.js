import catchAsync from '../utils/catchAsync.js';
import * as AuthService from '../services/auth.service.js';
import { createAndSendTokens } from '../services/auth.service.js';

/**
 * AUTH CONTROLLER — Handles HTTP request/response objects.
 *
 * Thin by design:
 * - Extract data from req
 * - Call the service
 * - Format and send the response
 * - NO business logic here — that lives in auth.service.js
 *
 * Every handler is wrapped in catchAsync() so any thrown AppError
 * automatically flows to the global error middleware in app.js.
 */

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────
export const register = catchAsync(async (req, res) => {
  const user = await AuthService.register(req.body);
  createAndSendTokens(user, 201, res);
});

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await AuthService.login(email, password);
  createAndSendTokens(user, 200, res);
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
// Stateless logout: clear the refresh token cookie.
// The access token expires naturally (15 minutes).
// Why not invalidate the access token? → JWTs are stateless.
// True revocation requires a token blacklist in Redis (we'll add on Day 10).
export const logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully.',
  });
};

// ─── POST /api/v1/auth/refresh-token ──────────────────────────────────────────
export const refreshToken = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  const { accessToken, user } = await AuthService.refreshToken(token);

  res.status(200).json({
    status: 'success',
    accessToken,
    data: { user },
  });
});

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────
// Protected route — req.user is set by the protect middleware
export const getMe = catchAsync(async (req, res) => {
  const user = await AuthService.getMe(req.user._id);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

// ─── PATCH /api/v1/auth/change-password ───────────────────────────────────────
// Protected route
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await AuthService.changePassword(req.user._id, currentPassword, newPassword);

  // Issue new tokens so the user stays logged in after changing password
  createAndSendTokens(user, 200, res);
});
