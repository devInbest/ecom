const env = require('../../config/env');
const { COOKIE_NAMES } = require('../../config/cookies');
const { AUTH_ERRORS } = require('../utils/errors');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const authPaths = ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/forgot-password'];
  if (authPaths.some((p) => req.originalUrl.startsWith(p))) return next();

  const cookieToken = req.cookies?.[COOKIE_NAMES.CSRF_TOKEN];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    const err = AUTH_ERRORS.CSRF_INVALID();
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  if (env.isProduction) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const allowed = env.corsOrigins.map((o) => o.toLowerCase());
    const originOk =
      !origin ||
      allowed.some((o) => origin.toLowerCase().startsWith(o)) ||
      allowed.includes(origin.toLowerCase());
    if (!originOk && referer) {
      const refererOk = allowed.some((o) => referer.toLowerCase().startsWith(o));
      if (!refererOk) {
        const err = AUTH_ERRORS.CSRF_INVALID();
        return res.status(err.statusCode).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
      }
    }
  }

  next();
};

module.exports = { csrfProtection };
