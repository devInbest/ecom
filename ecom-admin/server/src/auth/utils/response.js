const sendSuccess = (res, statusCode, data = {}) => {
  res.status(statusCode).json({ success: true, ...data });
};

const sendError = (res, err) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal Server Error',
      ...(err.metadata && Object.keys(err.metadata).length ? { metadata: err.metadata } : {}),
    },
  });
};

module.exports = { sendSuccess, sendError };
