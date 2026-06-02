function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (process.env.NODE_ENV === 'development') {
    console.error('[api:error]', {
      code: err.errorCode,
      message: err.message,
      details: err.details,
      stack: err.stack
    });
  }

  res.status(status).json({
    errorCode: err.errorCode || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Internal server error',
    details: err.details || null
  });
}

module.exports = errorHandler;
