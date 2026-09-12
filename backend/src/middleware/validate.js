const validate = (schema) => {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    const validator = typeof schema === 'function' ? schema : schema.validate;

    if (!validator || typeof validator !== 'function') {
      return next({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation middleware was configured incorrectly.',
      });
    }

    try {
      const result = validator.call(schema, req.body, { abortEarly: false, allowUnknown: false });

      if (!result) {
        return next();
      }

      const validationError = result.error || result.errors || result.details;

      if (validationError) {
        const details = Array.isArray(validationError)
          ? validationError
          : validationError.details || [{ message: validationError.message || 'Validation failed.' }];

        return next({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details:
            details && details.length
              ? details.map((item) => ({
                  field: item.path ? item.path.join('.') : undefined,
                  message: item.message || 'Invalid value',
                }))
              : [{ message: 'Invalid request payload.' }],
        });
      }

      if (result.value !== undefined) {
        req.body = result.value;
      }

      return next();
    } catch (error) {
      return next({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        details: [{ message: error.message || 'Invalid request payload.' }],
      });
    }
  };
};

module.exports = validate;
