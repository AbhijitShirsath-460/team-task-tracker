const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { ERROR_CODES } = require('../constants');

/**
 * RBAC Middleware — enforces role-based access at the route layer.
 * MUST be applied AFTER authenticate middleware (needs req.user).
 *
 * Usage in routes:
 *   router.post('/tasks', authenticate, authorize('ADMIN', 'MANAGER'), tasksController.create);
 *
 * @param {...string} allowedRoles - roles permitted to access this route
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  const userRole = req.user?.role;

  if (!allowedRoles.includes(userRole)) {
    logger.warn('Unauthorized access attempt', {
      userId: req.user?.id,
      userRole,
      requiredRoles: allowedRoles,
      path: req.originalUrl,
    });
    return next(
      new AppError(403, ERROR_CODES.FORBIDDEN, 'You do not have permission to perform this action')
    );
  }

  next();
};

module.exports = { authorize };
