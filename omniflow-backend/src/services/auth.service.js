import User from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';
import { sendEmail } from '../utils/sendEmail.js';
import crypto from 'crypto';

// ─── FORGOT PASSWORD ────────────────────────────────────────────────────────
/**
 * Generate password reset token for user with given email and send via email.
 */
export const forgotPassword = async (email) => {
  const normalizedEmail = email ? email.toLowerCase().trim() : '';
  const user = await User.findOne({
    $or: [
      { email: normalizedEmail },
      { email: new RegExp(`^${normalizedEmail}$`, 'i') },
    ],
  });
  if (!user) {
    throw new AppError('There is no user with that email address.', 404);
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  const message = `Forgot your password? Reset your password by clicking the link below:\n\n${resetUrl}\n\nThis reset link is valid for 10 minutes. If you did not request a password reset, please ignore this email.`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'OmniFlow Password Reset Instructions',
      message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-top: 0;">OmniFlow Password Reset</h2>
          <p style="color: #475569;">You requested a password reset for your OmniFlow account (<strong>${user.email}</strong>).</p>
          <p style="color: #475569;">Click the button below to reset your password. This link is valid for <strong>10 minutes</strong>:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 0;">If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (err) {
    console.error('📧 Email delivery notice:', err.message);
    console.log('🔑 PASSWORD RESET FALLBACK URL:', resetUrl);
    
    // Return fallback URL if SMTP credentials are not yet configured on host server
    return { success: true, resetUrl };
  }
};

// ─── RESET PASSWORD ─────────────────────────────────────────────────────────
/**
 * Reset password using valid, unexpired token.
 */
export const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired.', 400);
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return user;
};

/**
 * AUTH SERVICE — Pure business logic. No req/res objects here.
 *
 * Why separate from the controller?
 * - Unit-testable without spinning up Express or connecting to MongoDB mock.
 * - Socket.IO handlers (Day 8) could call these same functions.
 * - Clear separation: controller handles HTTP, service handles business rules.
 */

// ─── Helper: attach tokens to response ───────────────────────────────────────
/**
 * Signs both tokens and sets the refresh token as an HttpOnly cookie.
 *
 * Why HttpOnly cookie for refresh token?
 * - JS (and therefore XSS attacks) CANNOT read HttpOnly cookies.
 * - The access token lives in memory (JS variable) — short-lived (15m).
 * - The refresh token lives in the cookie — long-lived (7d) but untouchable by JS.
 *
 * Why NOT put both in cookies?
 * - The access token needs to be read by the frontend to attach to API calls.
 * - Cookies are automatically sent with every request (including CSRF attacks).
 * - Short-lived access token in memory = minimal exposure.
 */
const createAndSendTokens = (user, statusCode, res) => {
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);

  const isProd = process.env.NODE_ENV === 'production';

  // Set refresh token as a secure, HttpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,                                // JS cannot read this
    secure: isProd,                                // HTTPS required for sameSite: 'none'
    sameSite: isProd ? 'none' : 'lax',             // 'none' for cross-domain Vercel -> Render cookies
    maxAge: 7 * 24 * 60 * 60 * 1000,             // 7 days in milliseconds
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    data: { user },
  });
};

// ─── REGISTER ─────────────────────────────────────────────────────────────────
/**
 * Create a new user account.
 *
 * Security decisions:
 * - Password hashing happens in the Mongoose pre-save hook (user.model.js).
 *   This ensures the password is ALWAYS hashed, regardless of where the user
 *   is created in the codebase.
 * - We check for duplicate email BEFORE calling User.create() so we can throw
 *   a clean 409 error instead of a raw MongoDB duplicate key error (code 11000).
 */
export const register = async (userData) => {
  const { name, email, password, role } = userData;

  // Check for duplicate email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409);
  }

  // Create user (password hashed by pre-save hook)
  const user = await User.create({ name, email, password, role });
  return user;
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
/**
 * Authenticate a user with email and password.
 *
 * Security: We use the SAME error message for "user not found" and "wrong password".
 * Why? If we said "user not found", an attacker can enumerate valid email addresses.
 * "Invalid email or password" reveals nothing.
 *
 * Why `.select('+password')`?
 * - The User schema has `select: false` on the password field.
 * - This means Mongoose NEVER returns the password in normal queries.
 * - We MUST explicitly include it here so we can call comparePassword().
 */
export const login = async (email, password) => {
  const cleanEmail = email ? email.toLowerCase().trim() : '';
  const user = await User.findOne({ email: cleanEmail }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.password) {
    throw new AppError('This account was created via Google Sign-In. Please click "Sign in with Google" or use "Forgot password?" to set a password.', 400);
  }

  if (!password || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 401);
  }

  return user;
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
/**
 * Issue a new access token using the refresh token from the cookie.
 *
 * Flow:
 * 1. Read refresh token from HttpOnly cookie (JS cannot do this — server only)
 * 2. Verify the token signature
 * 3. Confirm user still exists
 * 4. Issue new access token
 *
 * This is how you implement "stay logged in" without storing sessions in a DB.
 */
export const refreshToken = async (token) => {
  if (!token) {
    throw new AppError('No refresh token provided. Please log in again.', 401);
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError('The user belonging to this token no longer exists.', 401);
  }

  const newAccessToken = signAccessToken(user._id, user.role);
  return { accessToken: newAccessToken, user };
};

// ─── GET ME ───────────────────────────────────────────────────────────────────
/**
 * Return the currently authenticated user's profile.
 * req.user is already set by the protect middleware — just return it.
 */
export const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return user;
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
/**
 * Change the authenticated user's password.
 *
 * Why not User.findByIdAndUpdate() for password changes?
 * - findByIdAndUpdate() BYPASSES Mongoose middleware — the pre-save hook that
 *   hashes the password would NOT run.
 * - We MUST use .save() so the pre-save hook fires and hashes the new password.
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Verify current password before allowing change
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Your current password is incorrect.', 401);
  }

  user.password = newPassword;  // pre-save hook will hash this
  await user.save();

  return user;
};

export { createAndSendTokens };
