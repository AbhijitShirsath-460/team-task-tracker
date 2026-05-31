const Joi = require('joi');
const { ROLES } = require('../../constants');

// Invite a new user to the org
const inviteSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName:  Joi.string().min(1).max(50).required(),
  email:     Joi.string().email().required(),
  password:  Joi.string().min(6).required(),
  role:      Joi.string().valid(ROLES.MANAGER, ROLES.MEMBER).default(ROLES.MEMBER).messages({
    'any.only': 'Role must be MANAGER or MEMBER (ADMIN cannot be assigned via invite)',
  }),
});

// Update a user's role
const updateRoleSchema = Joi.object({
  role: Joi.string().valid(ROLES.ADMIN, ROLES.MANAGER, ROLES.MEMBER).required().messages({
    'any.only': 'Role must be one of: ADMIN, MANAGER, MEMBER',
    'any.required': 'Role is required',
  }),
});

module.exports = { inviteSchema, updateRoleSchema };
