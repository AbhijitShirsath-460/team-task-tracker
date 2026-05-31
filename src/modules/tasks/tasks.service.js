const prisma = require('../../config/db');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { ERROR_CODES, ALLOWED_TRANSITIONS } = require('../../constants');
const { buildCacheKey, getCache, setCache, invalidateUserCache } = require('../../utils/cacheHelper');

// Shared task include for consistent response shape
const TASK_INCLUDE = {
  assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
  creator:  { select: { id: true, firstName: true, lastName: true } },
  project:  { select: { id: true, name: true } },
};

// ── Helpers ──────────────────────────────────────────────────

/**
 * Validate the status transition is allowed.
 * Throws 400 INVALID_STATUS_TRANSITION if not.
 */
const validateTransition = (currentStatus, newStatus) => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    logger.warn('Invalid status transition rejected', { from: currentStatus, to: newStatus });
    throw new AppError(
      400,
      ERROR_CODES.INVALID_TRANSITION,
      `Cannot transition from ${currentStatus} to ${newStatus}`
    );
  }
};

/**
 * Check if the requesting user can change task status.
 * Only the task's assignee OR a MANAGER/ADMIN can do so.
 */
const checkStatusPermission = (task, user) => {
  const isAssignee = task.assigneeId === user.id;
  const isManager  = ['MANAGER', 'ADMIN'].includes(user.role);
  if (!isAssignee && !isManager) {
    throw new AppError(
      403, ERROR_CODES.FORBIDDEN,
      'Only the task assignee or a MANAGER/ADMIN can change task status'
    );
  }
};

/**
 * Build org-scoped WHERE clause for task queries.
 * MEMBERs are restricted to their own assigned tasks.
 */
const buildWhereClause = (user, query = {}) => {
  const where = {
    project: { organizationId: user.organizationId }, // always org-scoped
  };

  if (user.role === 'MEMBER') {
    // MEMBER can ONLY see their own tasks — non-negotiable
    where.assigneeId = user.id;
  } else {
    // ADMIN/MANAGER: optional filter by assignee
    if (query.assignee && query.assignee !== 'all') where.assigneeId = query.assignee;
  }

  if (query.status   && query.status   !== 'all') where.status   = query.status;
  if (query.priority && query.priority !== 'all') where.priority = query.priority;

  return where;
};

// ── Service Functions ────────────────────────────────────────

/**
 * List tasks with pagination, filtering, and Redis caching.
 */
const listTasks = async (user, query) => {
  const { page, limit } = query;
  const cacheKey = buildCacheKey(user.organizationId, {
    assigneeId: user.role === 'MEMBER' ? user.id : (query.assignee || 'all'),
    page, limit,
    status: query.status || 'all',
    priority: query.priority || 'all',
  });

  // Try cache first
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const where = buildWhereClause(user, query);
  const skip  = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({ where, skip, take: limit, include: TASK_INCLUDE, orderBy: { createdAt: 'desc' } }),
    prisma.task.count({ where }),
  ]);

  const result = {
    data: tasks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };

  // Cache result and track key for invalidation
  const assigneeId = user.role === 'MEMBER' ? user.id : (query.assignee || 'all');
  await setCache(cacheKey, result, assigneeId !== 'all' ? assigneeId : null);

  return result;
};

/**
 * Get a single task — org-scoped, MEMBER restricted to own tasks.
 */
const getTask = async (user, taskId) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: { organizationId: user.organizationId },
      ...(user.role === 'MEMBER' ? { assigneeId: user.id } : {}),
    },
    include: TASK_INCLUDE,
  });

  if (!task) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Task not found');
  return task;
};

/**
 * Create a task — ADMIN/MANAGER only (enforced at route level).
 * Validates assignee belongs to the same org.
 */
const createTask = async (user, data) => {
  // Validate assignee belongs to org
  if (data.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: data.assigneeId, organizationId: user.organizationId },
    });
    if (!assignee) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Assignee must belong to your organization');
    }
  }

  // Validate project belongs to org
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, organizationId: user.organizationId },
  });
  if (!project) {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'Project not found in your organization');
  }

  const task = await prisma.task.create({
    data: { ...data, creatorId: user.id },
    include: TASK_INCLUDE,
  });

  // Invalidate assignee's cached task lists
  if (task.assigneeId) await invalidateUserCache(task.assigneeId);

  logger.info('Task created', { taskId: task.id, creatorId: user.id });
  return task;
};

/**
 * Update task metadata — ADMIN/MANAGER only.
 * If assignee changes, invalidates cache for both old and new assignee.
 */
const updateTask = async (user, taskId, data) => {
  const task = await getTask(user, taskId);

  // Validate new assignee if being changed
  if (data.assigneeId && data.assigneeId !== task.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: data.assigneeId, organizationId: user.organizationId },
    });
    if (!assignee) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'New assignee must belong to your organization');
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data,
    include: TASK_INCLUDE,
  });

  // Invalidate old assignee cache if assignee changed
  if (data.assigneeId && data.assigneeId !== task.assigneeId) {
    await invalidateUserCache(task.assigneeId);
  }
  // Invalidate new/current assignee cache
  if (updated.assigneeId) await invalidateUserCache(updated.assigneeId);

  return updated;
};

/**
 * Update task status — enforces transition rules and permission check.
 * Auto-sets completedAt when transitioning to DONE.
 */
const updateTaskStatus = async (user, taskId, newStatus) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: user.organizationId } },
  });
  if (!task) throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Task not found');

  // 1. Check transition is allowed
  validateTransition(task.status, newStatus);

  // 2. Check permission (assignee or manager)
  checkStatusPermission(task, user);

  // 3. Build update data — auto-set completedAt for DONE
  const updateData = { status: newStatus };
  if (newStatus === 'DONE') updateData.completedAt = new Date();

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: TASK_INCLUDE,
  });

  // Invalidate cache for the assignee
  if (updated.assigneeId) await invalidateUserCache(updated.assigneeId);

  logger.info('Task status updated', { taskId, from: task.status, to: newStatus, userId: user.id });
  return updated;
};

/**
 * Delete a task — ADMIN/MANAGER only.
 */
const deleteTask = async (user, taskId) => {
  const task = await getTask(user, taskId);
  await prisma.task.delete({ where: { id: taskId } });

  if (task.assigneeId) await invalidateUserCache(task.assigneeId);
  logger.info('Task deleted', { taskId, userId: user.id });
};

module.exports = { listTasks, getTask, createTask, updateTask, updateTaskStatus, deleteTask };
