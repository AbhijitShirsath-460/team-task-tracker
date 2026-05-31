const prisma = require('../../config/db');
const { hashPassword, comparePassword } = require('../../utils/hashHelper');
const { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshTokenExpiry } = require('../../utils/jwtHelper');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { ERROR_CODES } = require('../../constants');

/**
 * Register a new organization + first ADMIN user.
 */
const register = async ({ orgName, firstName, lastName, email, password }) => {
  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, ERROR_CODES.CONFLICT, 'Email is already registered');
  }

  const passwordHash = await hashPassword(password);

  // Create org and ADMIN user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: orgName } });

    const user = await tx.user.create({
      data: { email, passwordHash, firstName, lastName, role: 'ADMIN', organizationId: org.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, organizationId: true },
    });

    return { org, user };
  });

  logger.info('New organization registered', { orgId: result.org.id, email });
  return result;
};

/**
 * Login — validate credentials and issue tokens.
 */
const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Use same error for both "not found" and "wrong password" — prevents user enumeration
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new AppError(401, ERROR_CODES.AUTH_ERROR, 'Invalid email or password');
  }

  const payload = { id: user.id, role: user.role, organizationId: user.organizationId };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: user.id });

  // Store refresh token in DB for rotation detection
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  logger.info('User logged in', { userId: user.id });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id, email: user.email,
      firstName: user.firstName, lastName: user.lastName,
      role: user.role,
    },
  };
};

/**
 * Refresh Token Rotation (RTR):
 *  1. Verify refresh token signature
 *  2. Check token exists in DB and is not revoked
 *  3. If reused (already revoked) → revoke ALL user tokens (breach detection)
 *  4. Delete old token, issue new pair
 */
const refresh = async (token) => {
  if (!token) {
    throw new AppError(401, ERROR_CODES.AUTH_ERROR, 'Refresh token is required');
  }

  // Verify JWT signature
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, ERROR_CODES.AUTH_ERROR, 'Invalid or expired refresh token');
  }

  // Look up token in DB
  const storedToken = await prisma.refreshToken.findUnique({ where: { token } });

  if (!storedToken) {
    // Token not in DB at all — could be reuse of an already-rotated token
    logger.warn('Refresh token not found — possible reuse attack', { userId: decoded.id });
    // Revoke all tokens for this user as precaution
    await prisma.refreshToken.updateMany({
      where: { userId: decoded.id },
      data: { isRevoked: true },
    });
    throw new AppError(401, ERROR_CODES.AUTH_ERROR, 'Refresh token is invalid');
  }

  if (storedToken.isRevoked || new Date() > storedToken.expiresAt) {
    // Already revoked or expired — treat as potential reuse
    logger.warn('Revoked/expired refresh token used — revoking all sessions', { userId: decoded.id });
    await prisma.refreshToken.updateMany({
      where: { userId: decoded.id },
      data: { isRevoked: true },
    });
    throw new AppError(401, ERROR_CODES.AUTH_ERROR, 'Refresh token is revoked or expired');
  }

  // Fetch user for new token payload
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, role: true, organizationId: true },
  });

  if (!user) {
    throw new AppError(401, ERROR_CODES.AUTH_ERROR, 'User no longer exists');
  }

  // Delete old token, create new one (rotation)
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  const newAccessToken  = signAccessToken({ id: user.id, role: user.role, organizationId: user.organizationId });
  const newRefreshToken = signRefreshToken({ id: user.id });

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  logger.info('Tokens rotated', { userId: user.id });
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Logout — revoke the refresh token stored in cookie.
 */
const logout = async (token) => {
  if (!token) return; // Nothing to do if no cookie

  await prisma.refreshToken.updateMany({
    where: { token },
    data: { isRevoked: true },
  });
};

module.exports = { register, login, refresh, logout };
