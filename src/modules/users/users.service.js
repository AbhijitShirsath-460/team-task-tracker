const prisma = require('../../config/db');
const { hashPassword } = require('../../utils/hashHelper');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { ERROR_CODES } = require('../../constants');

// Shared select — never expose passwordHash in responses
const USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, organizationId: true, createdAt: true,
};

/**
 * List all users in the requesting ADMIN's organization.
 */
const listUsers = async (orgId) => {
  return prisma.user.findMany({
    where: { organizationId: orgId },
    select: USER_SELECT,
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Invite (create) a new user into the org.
 * ADMIN cannot be created via invite — use register endpoint.
 */
const inviteUser = async (orgId, data) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError(409, ERROR_CODES.CONFLICT, 'Email is already registered');
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'MEMBER',
      organizationId: orgId,
    },
    select: USER_SELECT,
  });

  logger.info('User invited to org', { orgId, email: data.email, role: user.role });
  return user;
};

/**
 * Update a user's role — ADMIN only.
 * Prevents ADMIN from changing their own role (guard against lockout).
 */
const updateUserRole = async (orgId, targetUserId, requestingUserId, role) => {
  if (targetUserId === requestingUserId) {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'You cannot change your own role');
  }

  // Ensure user belongs to same org
  const user = await prisma.user.findFirst({
    where: { id: targetUserId, organizationId: orgId },
  });
  if (!user) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'User not found in your organization');
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: USER_SELECT,
  });
};

/**
 * Remove a user from the org (soft: hard delete here for simplicity).
 */
const deleteUser = async (orgId, targetUserId, requestingUserId) => {
  if (targetUserId === requestingUserId) {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'You cannot delete your own account');
  }

  const user = await prisma.user.findFirst({
    where: { id: targetUserId, organizationId: orgId },
  });
  if (!user) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'User not found in your organization');
  }

  await prisma.user.delete({ where: { id: targetUserId } });
  logger.info('User removed from org', { orgId, targetUserId });
};

module.exports = { listUsers, inviteUser, updateUserRole, deleteUser };
