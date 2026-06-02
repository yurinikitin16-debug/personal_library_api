function createError(errorCode, message, status, details) {
  const error = new Error(message);

  error.errorCode = errorCode;
  error.status = status;
  error.details = details;

  return error;
}

module.exports = {
  createError
};
