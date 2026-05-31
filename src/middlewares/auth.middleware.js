const { verifyAccessToken } = require('../utils/jwtHelper');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../config/db');
const { ERROR_CODES } = require('../constants');

/**
 * Auth Middleware — verifies Bearer JWT and populates req.user.
 *
 * Flow:
 *  1. Extract token from Authorization header
 *  2. Verify signature + expiry
 *  3. Confirm user still exists in DB (handles deleted users)
 *  4. Attach req.user = { id, role, organizationId }
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Expect "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, ERROR_CODES.AUTH_ERROR, 'Access token is required');
  }

  const token = authHeader.split(' ')[1];

  // Throws JsonWebTokenError or TokenExpiredError if invalid
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new AppError(401, ERROR_CODES.AUTH_ERROR, 'Invalid or expired access token');
  }

  // Confirm user still exists (guards against deleted accounts)
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, role: true, organizationId: true },
  });

  if (!user) {
    throw new AppError(401, ERROR_CODES.AUTH_ERROR, 'User no longer exists');
  }

  // Attach to request — used by rbac and services
  req.user = user;
  next();
});

module.exports = { authenticate };
