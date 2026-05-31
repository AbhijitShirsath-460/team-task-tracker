const usersService = require('./users.service');
const asyncHandler = require('../../utils/asyncHandler');

/** GET /api/v1/users — List all users in org */
const list = asyncHandler(async (req, res) => {
  const users = await usersService.listUsers(req.user.organizationId);
  res.status(200).json({ status: 200, data: users });
});

/** POST /api/v1/users/invite — Add a new user */
const invite = asyncHandler(async (req, res) => {
  const user = await usersService.inviteUser(req.user.organizationId, req.body);
  res.status(201).json({ status: 201, message: 'User invited successfully', data: user });
});

/** PATCH /api/v1/users/:id/role — Change role */
const updateRole = asyncHandler(async (req, res) => {
  const user = await usersService.updateUserRole(
    req.user.organizationId,
    req.params.id,
    req.user.id,
    req.body.role
  );
  res.status(200).json({ status: 200, message: 'Role updated', data: user });
});

/** DELETE /api/v1/users/:id — Remove from org */
const remove = asyncHandler(async (req, res) => {
  await usersService.deleteUser(req.user.organizationId, req.params.id, req.user.id);
  res.status(200).json({ status: 200, message: 'User removed from organization' });
});

module.exports = { list, invite, updateRole, remove };
