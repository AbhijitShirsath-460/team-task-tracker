const Joi = require('joi');

// ── Create Task ───────────────────────────────────────────────
const createTaskSchema = Joi.object({
  title:       Joi.string().min(1).max(200).required().messages({ 'any.required': 'Title is required' }),
  description: Joi.string().max(1000).optional().allow(''),
  priority:    Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
  assigneeId:  Joi.string().uuid().optional().allow(null),
  projectId:   Joi.string().uuid().required().messages({ 'any.required': 'Project ID is required' }),
  dueDate:     Joi.date().iso().greater('now').optional().allow(null).messages({
    'date.greater': 'due_date must be a future date',
  }),
});

// ── Update Task Metadata ──────────────────────────────────────
const updateTaskSchema = Joi.object({
  title:       Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  priority:    Joi.string().valid('LOW', 'MEDIUM', 'HIGH').optional(),
  assigneeId:  Joi.string().uuid().optional().allow(null),
  dueDate:     Joi.date().iso().greater('now').optional().allow(null).messages({
    'date.greater': 'due_date must be a future date',
  }),
}).min(1).messages({ 'object.min': 'At least one field must be provided' });

// ── Update Status ─────────────────────────────────────────────
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED')
    .required()
    .messages({
      'any.required': 'New status is required',
      'any.only': 'Status must be one of: TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED',
    }),
});

// ── List Query Params ─────────────────────────────────────────
const listQuerySchema = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(10),
  status:    Joi.string().valid('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'all').default('all'),
  priority:  Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'all').default('all'),
  assignee:  Joi.string().uuid().optional().default('all'),
});

module.exports = { createTaskSchema, updateTaskSchema, updateStatusSchema, listQuerySchema };
