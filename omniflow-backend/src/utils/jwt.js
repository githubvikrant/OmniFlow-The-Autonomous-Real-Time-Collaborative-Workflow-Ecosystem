import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Sign a short-lived ACCESS token (15 minutes by default).
 * Payload carries the user's _id and role — that's all the
 * auth middleware needs to identify and authorize the caller.
 */
export const signAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }   // default '15m'
  );
};

/**
 * Sign a long-lived REFRESH token (7 days by default).
 * Stored in an HttpOnly cookie so JS cannot read it.
 * Used ONLY on the /auth/refresh-token route to issue a new access token.
 */
export const signRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    config.jwt.secret,                          // same secret; could be a separate one for production
    { expiresIn: config.jwt.refreshExpiresIn }  // default '7d'
  );
};

/**
 * Verify and decode any JWT.
 * Throws a JsonWebTokenError if invalid/expired — caught by catchAsync → error middleware.
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};
