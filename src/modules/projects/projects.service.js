const prisma = require('../../config/db');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { ERROR_CODES } = require('../../constants');

/**
 * List all projects in the org.
 */
const listProjects = (orgId) => {
  return prisma.project.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { tasks: true } } }, // include task count
  });
};

/**
 * Get a single project — must belong to org.
 */
const getProject = async (orgId, projectId) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: orgId },
    include: { _count: { select: { tasks: true } } },
  });
  if (!project) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Project not found');
  }
  return project;
};

/**
 * Create a project inside the org.
 */
const createProject = async (orgId, data) => {
  const project = await prisma.project.create({
    data: { ...data, organizationId: orgId },
  });
  logger.info('Project created', { projectId: project.id, orgId });
  return project;
};

/**
 * Update project — org-scoped.
 */
const updateProject = async (orgId, projectId, data) => {
  await getProject(orgId, projectId); // throws 404 if not found
  return prisma.project.update({ where: { id: projectId }, data });
};

/**
 * Delete project — ADMIN only (enforced at route level).
 */
const deleteProject = async (orgId, projectId) => {
  await getProject(orgId, projectId);
  await prisma.project.delete({ where: { id: projectId } });
  logger.info('Project deleted', { projectId, orgId });
};

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject };
