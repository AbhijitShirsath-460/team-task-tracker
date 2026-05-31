const Joi = require('joi');

// ── Register ─────────────────────────────────────────────────
const registerSchema = Joi.object({
  orgName: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Organization name must be at least 2 characters',
    'any.required': 'Organization name is required',
  }),
  firstName: Joi.string().min(1).max(50).required(),
  lastName:  Joi.string().min(1).max(50).required(),
  email:     Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

// ── Login ────────────────────────────────────────────────────
const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
