const tasksService = require('./tasks.service');
const asyncHandler = require('../../utils/asyncHandler');

/** GET /api/v1/tasks — Paginated + filtered task list */
const list = asyncHandler(async (req, res) => {
  const result = await tasksService.listTasks(req.user, req.query);
  res.status(200).json({ status: 200, ...result });
});

/** GET /api/v1/tasks/:id */
const getOne = asyncHandler(async (req, res) => {
  const data = await tasksService.getTask(req.user, req.params.id);
  res.status(200).json({ status: 200, data });
});

/** POST /api/v1/tasks */
const create = asyncHandler(async (req, res) => {
  const data = await tasksService.createTask(req.user, req.body);
  res.status(201).json({ status: 201, message: 'Task created', data });
});

/** PATCH /api/v1/tasks/:id — Update metadata */
const update = asyncHandler(async (req, res) => {
  const data = await tasksService.updateTask(req.user, req.params.id, req.body);
  res.status(200).json({ status: 200, message: 'Task updated', data });
});

/** PATCH /api/v1/tasks/:id/status — Advance status */
const updateStatus = asyncHandler(async (req, res) => {
  const data = await tasksService.updateTaskStatus(req.user, req.params.id, req.body.status);
  res.status(200).json({ status: 200, message: 'Task status updated', data });
});

/** DELETE /api/v1/tasks/:id */
const remove = asyncHandler(async (req, res) => {
  await tasksService.deleteTask(req.user, req.params.id);
  res.status(200).json({ status: 200, message: 'Task deleted' });
});

module.exports = { list, getOne, create, update, updateStatus, remove };
