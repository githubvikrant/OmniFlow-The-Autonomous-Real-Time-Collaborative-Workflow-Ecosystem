import AppError from '../utils/AppError.js';
import config from '../config/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// ERROR TRANSFORMER HELPERS
// These functions convert raw MongoDB / JWT errors into clean AppError instances
// so the client always receives a consistent, safe JSON error response.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle MongoDB CastError — invalid ObjectId format.
 *
 * Triggered when: a route param like /:id receives "123" instead of a valid
 * 24-character hex string (e.g. "507f1f77bcf86cd799439011").
 *
 * Example: GET /api/v1/boards/not-a-real-id
 * → MongooseError: Cast to ObjectId failed for value "not-a-real-id" at path "_id"
 * → We transform it to: 400 "Invalid _id: not-a-real-id."
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB duplicate key error (code 11000).
 *
 * Triggered when: a unique-indexed field receives a value that already exists.
 * Example: creating a second user with the same email address.
 *
 * Why use err.keyValue instead of parsing err.errmsg with regex?
 * - err.keyValue is a structured object: { email: "test@example.com" }
 * - err.errmsg is a raw string that varies between MongoDB versions
 * - Structured data is always more reliable than regex on a string
 *
 * Example response: 409 "Duplicate field value: email. Please use another value!"
 */
const handleDuplicateFieldsDB = (err) => {
  // err.keyValue is the authoritative structured duplicate field info
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue?.[field];
  const message = `Duplicate field value: ${field} (${value}). Please use another value!`;
  return new AppError(message, 409); // 409 Conflict
};

/**
 * Handle Mongoose ValidationError — schema validation failure.
 *
 * Triggered when: a document fails schema-level validation before being saved.
 * Example: required field missing, enum value not in allowed list.
 *
 * We collect ALL validation failure messages and join them into one response,
 * so the client gets the full picture in a single request rather than fixing
 * errors one by one.
 *
 * Example response: 400 "Invalid input data. Name is required. Priority must be
 *                       one of: low, medium, high, critical."
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle JsonWebTokenError — token signature is invalid or tampered.
 *
 * Triggered by: jwt.verify() when the token has an invalid signature,
 * wrong format, or has been tampered with.
 *
 * Why a generic message? Telling the client exactly what's wrong with the
 * token structure could help an attacker craft a valid one.
 */
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

/**
 * Handle TokenExpiredError — the JWT's exp claim is in the past.
 *
 * Triggered by: jwt.verify() when the access token's 15-minute window has passed.
 * The frontend should catch this 401 and call POST /auth/refresh-token to get a
 * new access token using the HttpOnly refresh token cookie.
 *
 * This is handled in the Day 3 Axios response interceptor (Day 5 frontend).
 */
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE FORMATTERS
// Two separate formatters for development and production environments.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Development error response — sends FULL error detail.
 *
 * Includes: status, HTTP status code, human-readable message, raw error object,
 * and the full stack trace.
 *
 * Why send the stack trace in development?
 * - You need to know exactly which line threw the error.
 * - There is no security risk — this only runs locally, never in production.
 */
const sendErrorDev = (err, req, res) => {
  // Also log to console in dev so it's visible in the terminal
  console.error('ERROR 💥 [DEV]', err);

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Production error response — sends SAFE, sanitized output only.
 *
 * Operational errors (AppError instances with isOperational: true):
 * → These are intentional, expected errors we threw (404, 403, 401, etc.).
 * → Safe to send the message to the client.
 *
 * Programming bugs (unexpected crashes, typos, third-party library failures):
 * → We do NOT know what the error contains — it might have DB credentials,
 *   internal paths, or sensitive logic in the stack trace.
 * → Log the full error to the server console only.
 * → Send the client a generic 500 "Something went very wrong!" — revealing nothing.
 *
 * This dual-path approach is the industry standard for production error handling.
 */
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥 [PROD]', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went very wrong!',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER — Express 4-argument error middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Global Error Handling Middleware.
 *
 * This is the SINGLE destination for ALL errors in the application:
 * - Errors thrown with `throw new AppError(...)` in any service
 * - Errors caught by `catchAsync` and forwarded via `next(err)`
 * - Errors forwarded by `next(new AppError(...)` in any middleware
 * - Unhandled Express errors (body-parser, multer failures, etc.)
 *
 * Why centralize error handling?
 * - Without this, every controller needs its own try/catch + error formatting.
 * - This guarantees a CONSISTENT JSON error shape across all 50+ endpoints.
 * - In Day 13 (Testing), integration tests rely on predictable error structures.
 *
 * How it's wired:
 * - Registered LAST in app.js: app.use(globalErrorHandler)
 * - Express recognizes it as an error handler because it has 4 parameters (err, req, res, next)
 *
 * @param {Error} err  - The error object (AppError or native Error)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function (required for Express to recognize as error middleware)
 */
const globalErrorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.nodeEnv === 'development') {
    sendErrorDev(err, req, res);
  } else {
    // Deep-clone the error so we don't mutate the original object
    // Object.assign + Object.create preserves the prototype chain (e.g., err.name)
    let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
    error.message = err.message;

    // ── MongoDB Error Transformers ──────────────────────────────────────────
    // MongoDB bad ObjectId (e.g., GET /boards/not-a-real-id)
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    // MongoDB duplicate key violation (e.g., duplicate email on register)
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    // Mongoose schema validation failure (e.g., missing required field)
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);

    // ── JWT Error Transformers ─────────────────────────────────────────────
    // Token signature invalid or malformed
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    // Token exp claim is in the past
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

export default globalErrorHandler;
