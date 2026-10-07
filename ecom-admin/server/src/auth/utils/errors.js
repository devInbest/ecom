class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', metadata = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
    this.isOperational = true;
  }
}

const AUTH_ERRORS = {
  INVALID_CREDENTIALS: () =>
    new AppError('Invalid email or password', 401, 'AUTH_INVALID_CREDENTIALS'),
  ACCOUNT_LOCKED: (lockedUntil) =>
    new AppError(
      'Account temporarily locked due to too many failed login attempts',
      423,
      'AUTH_ACCOUNT_LOCKED',
      { lockedUntil }
    ),
  ACCOUNT_SUSPENDED: () =>
    new AppError(
      'This account has been deactivated. Please contact your administrator.',
      403,
      'AUTH_ACCOUNT_SUSPENDED'
    ),
  ACCOUNT_PENDING: () =>
    new AppError('Account is pending activation', 403, 'AUTH_ACCOUNT_PENDING'),
  UNAUTHENTICATED: () =>
    new AppError('Authentication required', 401, 'AUTH_UNAUTHENTICATED'),
  UNAUTHORIZED: () =>
    new AppError('You do not have permission to perform this action', 403, 'AUTH_UNAUTHORIZED'),
  INVALID_TOKEN: () => new AppError('Invalid token', 401, 'AUTH_INVALID_TOKEN'),
  TOKEN_EXPIRED: () => new AppError('Token expired', 401, 'AUTH_TOKEN_EXPIRED'),
  SESSION_REVOKED: () => new AppError('Session has been revoked', 401, 'AUTH_SESSION_REVOKED'),
  REFRESH_REUSE: () =>
    new AppError('Session invalidated due to suspicious activity', 401, 'AUTH_REFRESH_REUSE'),
  CSRF_INVALID: () => new AppError('Invalid CSRF token', 403, 'AUTH_CSRF_INVALID'),
  RATE_LIMITED: () =>
    new AppError('Too many requests. Please try again later.', 429, 'AUTH_RATE_LIMITED'),
  PASSWORD_WEAK: (message) =>
    new AppError(message || 'Password does not meet requirements', 400, 'AUTH_PASSWORD_WEAK'),
  STEP_UP_REQUIRED: () =>
    new AppError('Recent authentication required', 403, 'AUTH_STEP_UP_REQUIRED'),
};

module.exports = { AppError, AUTH_ERRORS };
