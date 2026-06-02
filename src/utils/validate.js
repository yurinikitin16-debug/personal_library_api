const { createError } = require('./errors');

function validate(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw createError('VALIDATION_ERROR', 'Invalid request data', 400, result.error.flatten());
  }

  return result.data;
}

module.exports = validate;
