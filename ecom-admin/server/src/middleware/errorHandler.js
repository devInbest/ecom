const { AppError } = require('../auth/utils/errors');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal Server Error';
  let metadata = err.metadata || undefined;

  if (err.name === 'CastError') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  }

  if (err.code === 11000) {
    statusCode = 400;
    code = 'DUPLICATE_KEY';
    message = 'A record with that value already exists';
  }

  if (err.name === 'ValidationError' && !err.isOperational) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'AUTH_INVALID_TOKEN';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'AUTH_TOKEN_EXPIRED';
    message = 'Token expired';
  }

  if (statusCode >= 500 || process.env.NODE_ENV === 'development') {
    console.error(err.stack || err);
  }

  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(metadata ? { metadata } : {}),
      ...(isDev && statusCode >= 500 ? { stack: err.stack } : {}),
    },
    ...(isDev && !err.isOperational && statusCode < 500 ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;
