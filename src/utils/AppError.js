/**
 * Custom error class for all operational errors.
 * Extends native Error so it works with Express error middleware.
 *
 * Usage:
 *   throw new AppError(404, 'NOT_FOUND', 'Task not found');
 */
class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // distinguish from unexpected bugs

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
