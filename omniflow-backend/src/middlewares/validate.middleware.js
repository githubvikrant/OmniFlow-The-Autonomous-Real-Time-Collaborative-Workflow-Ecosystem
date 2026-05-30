import AppError from '../utils/AppError.js';

/**
 * Middleware factory: validates req.body against a Zod schema.
 *
 * Usage: router.post('/register', validate(registerSchema), authController.register)
 *
 * Why Zod instead of express-validator?
 * - Zod schemas are plain JS objects → reusable in services/tests without Express.
 * - Provides TypeScript-style type inference.
 * - Error messages are structured and easy to format.
 *
 * Without this middleware:
 * - Validation logic would be scattered across every controller.
 * - Easy to forget validation for one endpoint → security hole.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    // Format Zod errors into a readable message
    // e.g. "email: Please provide a valid email address; password: ..."
    const messages = result.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    return next(new AppError(`Validation failed — ${messages}`, 400));
  }

  // Replace req.body with the validated & transformed data
  // (Zod can coerce types, trim strings, lowercase emails, etc.)
  req.body = result.data;
  next();
};

export default validate;
