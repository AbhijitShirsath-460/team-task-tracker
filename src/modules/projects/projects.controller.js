const projectsService = require('./projects.service');
const asyncHandler = require('../../utils/asyncHandler');

const list   = asyncHandler(async (req, res) => {
  const data = await projectsService.listProjects(req.user.organizationId);
  res.status(200).json({ status: 200, data });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await projectsService.getProject(req.user.organizationId, req.params.id);
  res.status(200).json({ status: 200, data });
});

const create = asyncHandler(async (req, res) => {
  const data = await projectsService.createProject(req.user.organizationId, req.body);
  res.status(201).json({ status: 201, message: 'Project created', data });
});

const update = asyncHandler(async (req, res) => {
  const data = await projectsService.updateProject(req.user.organizationId, req.params.id, req.body);
  res.status(200).json({ status: 200, message: 'Project updated', data });
});

const remove = asyncHandler(async (req, res) => {
  await projectsService.deleteProject(req.user.organizationId, req.params.id);
  res.status(200).json({ status: 200, message: 'Project deleted' });
});

module.exports = { list, getOne, create, update, remove };
