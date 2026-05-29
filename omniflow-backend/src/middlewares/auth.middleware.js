import AppError from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';
import User from '../models/user.model.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * PROTECT middleware — verifies the JWT on every protected route.
 *
 * Flow:
 * 1. Extract token from Authorization header ("Bearer <token>")
 * 2. Verify the token signature and expiry
 * 3. Fetch the user from DB (confirms they still exist and are active)
 * 4. Check if password was changed AFTER the token was issued
 * 5. Attach user to req.user for downstream handlers
 *
 * Why fetch the user from DB on every request?
 * - JWTs are stateless — there's no built-in way to invalidate them.
 * - If an admin deletes a user mid-session, the deleted user's token
 *   would still pass signature verification without this DB check.
 * - changedPasswordAfter() catches the "stolen token" scenario:
 *   user changes password → all old tokens are invalid.
 */
export const protect = catchAsync(async (req, res, next) => {
  // 1. Get token from Authorization header
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to access this route.', 401));
  }

  // 2. Verify token (throws if invalid or expired)
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid token. Please log in again.', 401));
  }

  // 3. Fetch the user (confirm they still exist and are active)
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 401));
  }

  // 4. Check if password was changed after this token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('Your password was recently changed. Please log in again.', 401)
    );
  }

  // 5. Grant access — attach user to request object
  req.user = currentUser;
  next();
});

/**
 * AUTHORIZE middleware — checks if the authenticated user has the required role(s).
 *
 * Usage: router.delete('/board/:id', protect, authorize('admin'), boardController.delete)
 *
 * Must be used AFTER `protect` (req.user must exist).
 *
 * Why factory function pattern?
 * - authorize('admin') or authorize('admin', 'member') — flexible.
 * - The roles list is checked at request time, not at route-definition time.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `You do not have permission to perform this action. Required role: ${roles.join(' or ')}`,
          403
        )
      );
    }
    next();
  };
};
