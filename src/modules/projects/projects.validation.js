const Joi = require('joi');

const createProjectSchema = Joi.object({
  name:        Joi.string().min(2).max(100).required().messages({
    'any.required': 'Project name is required',
    'string.min': 'Project name must be at least 2 characters',
  }),
  description: Joi.string().max(500).optional().allow(''),
});

const updateProjectSchema = Joi.object({
  name:        Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
}).min(1).messages({
  'object.min': 'At least one field must be provided to update',
});

module.exports = { createProjectSchema, updateProjectSchema };
