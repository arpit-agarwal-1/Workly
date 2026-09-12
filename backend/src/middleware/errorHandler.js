const errorHandler = (err, req, res, next) => {
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = req && req.id ? req.id : undefined;
  const isUnexpectedError = statusCode >= 500;

  const response = {
    status: 'error',
    message:
      isProduction && isUnexpectedError
        ? 'Something went wrong'
        : err?.message || 'Something went wrong',
    code: err?.code || (isUnexpectedError ? 'SERVER_ERROR' : 'ERROR'),
    ...(requestId ? { requestId } : {}),
  };

  if (!isProduction && err?.stack) {
    response.stack = err.stack;
  }

  if (err?.details) {
    response.details = err.details;
  }

  if (isUnexpectedError) {
    console.error(`[${requestId || 'unknown'}] ${err?.message || 'Unhandled server error'}`);
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
