/**
 * Wraps an async Express route handler to automatically catch errors
 * and forward them to Express's global error middleware via next(err).
 *
 * Eliminates the need for try/catch in every controller.
 *
 * Usage:
 *   router.get('/tasks', asyncHandler(tasksController.list));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
