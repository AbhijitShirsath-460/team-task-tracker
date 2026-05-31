const logger = require('../utils/logger');

/**
 * Global Error Middleware — must have exactly 4 params for Express to treat it as error handler.
 * Converts all errors (AppError + unexpected) into the standard JSON shape:
 *
 * { "status": 400, "code": "VALIDATION_ERROR", "message": "..." }
 *
 * Must be registered LAST in app.js (after all routes).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status  = err.statusCode || 500;
  const code    = err.code       || 'INTERNAL_SERVER_ERROR';
  const message = err.message    || 'Something went wrong';

  // Log server errors (5xx) — these are unexpected bugs
  if (status >= 500) {
    logger.error('Internal server error', {
      message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    });
  }

  res.status(status).json({ status, code, message });
};

module.exports = { errorHandler };
