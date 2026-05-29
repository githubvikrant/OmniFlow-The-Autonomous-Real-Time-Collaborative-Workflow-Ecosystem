import catchAsync from '../utils/catchAsync.js';
import * as AuthService from '../services/auth.service.js';
import { createAndSendTokens } from '../services/auth.service.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import config from '../config/index.js';

/**
 * AUTH CONTROLLER — Handles HTTP request/response for authentication endpoints.
 *
 * Thin by design — mirrors the layered architecture pattern from Day 1:
 * 1. Extract data from req (body, cookies, user)
 * 2. Call the service function (all logic lives there)
 * 3. Format and send the HTTP response
 *
 * NO business logic here — that lives in auth.service.js.
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
// True revocation requires a token blacklist in Redis (Day 10).
export const logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.isProduction,
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

// ─── GET /api/v1/auth/google/callback ─────────────────────────────────────────
/**
 * Google OAuth callback handler — runs AFTER passport.authenticate() succeeds.
 *
 * By this point, passport.middleware.js has already:
 *   1. Exchanged Google's one-time `code` for the user's profile
 *   2. Upserted the User document in MongoDB (find or create)
 *   3. Set req.user to our MongoDB User document
 *
 * Our job: issue OUR OWN JWTs (not Google's tokens) and deliver the access
 * token to the frontend browser.
 *
 * ── The delivery challenge ──────────────────────────────────────────────────
 * This is a browser redirect, NOT a normal API JSON call. The browser followed
 * a redirect from Google → it's expecting another redirect, not JSON.
 *
 * If we did res.json({ accessToken }), the browser would display raw JSON
 * text in the tab — the frontend JavaScript would never receive it.
 *
 * Solution: redirect to a frontend "/auth/callback" page with the access token
 * in the URL query string. That page reads the token, stores it in memory,
 * then navigates to /dashboard. This is the same pattern used by Supabase,
 * Auth0, and GitHub's own OAuth implementation.
 *
 * ── Is putting the token in the URL safe? ────────────────────────────────────
 * It's a reasonable trade-off:
 *   ✅ Token is short-lived (15 minutes) — limited exploitation window
 *   ✅ HTTPS in production encrypts the URL in transit
 *   ✅ The frontend callback page immediately moves the token to memory
 *      and replaces the URL (history.replaceState) so it's not in history
 *   ✅ The refresh token (long-lived) goes in an HttpOnly cookie — never in the URL
 *   ⚠️ Could appear in server access logs (mitigated by short TTL + HTTPS)
 *
 * ── Why sameSite: 'lax' for the OAuth cookie (not 'strict')? ────────────────
 * 'strict' cookies are NOT sent when the browser follows a cross-site redirect.
 * The flow is: Google → our backend → frontend (cross-site redirect).
 * If we used 'strict', the refresh token cookie would be dropped at the
 * final step. 'lax' allows the cookie to be sent with top-level navigations.
 */
export const googleCallback = (req, res) => {
  // req.user is set by passport — our full MongoDB User document
  const user = req.user;

  // Issue OUR tokens (not Google's) — same signing logic as normal login
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);

  // Set the refresh token as an HttpOnly cookie — JS cannot read it
  // sameSite: 'lax' (not 'strict') because of the cross-site redirect chain
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  // Redirect the browser to the frontend callback page with the access token
  // The frontend reads ?token= from the URL, stores it in memory, then navigates
  const redirectUrl = `${config.frontend.url}/auth/callback?token=${accessToken}`;
  res.redirect(redirectUrl);
};
