const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../constants');

/**
 * Validation Middleware — validates request data against a Joi schema.
 *
 * Usage:
 *   router.post('/tasks', validate(createTaskSchema), controller.create);
 *   router.get('/tasks',  validate(listQuerySchema, 'query'), controller.list);
 *
 * @param {object} schema   - Joi schema object
 * @param {string} target   - 'body' | 'query' | 'params' (default: 'body')
 */
const validate = (schema, target = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[target], {
    abortEarly: false,    // collect all errors, not just the first
    stripUnknown: true,   // remove extra fields not in schema
  });

  if (error) {
    // Join all Joi error messages into one readable string
    const message = error.details.map((d) => d.message.replace(/"/g, '')).join(', ');
    return next(new AppError(400, ERROR_CODES.VALIDATION_ERROR, message));
  }

  // Replace raw input with validated+sanitized value
  req[target] = value;
  next();
};

module.exports = { validate };
