const { AUTH_ERRORS } = require('../utils/errors');
const { hasPermission, ROLES } = require('../../config/permissions');

const authorize =
  (...requiredPermissions) =>
  (req, res, next) => {
    if (!req.auth?.userId) {
      const err = AUTH_ERRORS.UNAUTHENTICATED();
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }

    const role = req.auth.role;
    if (role === ROLES.SUPERADMIN || role === ROLES.SUPER_ADMIN) {
      return next();
    }

    const allowed = requiredPermissions.every((perm) => hasPermission(role, perm));
    if (!allowed) {
      const err = AUTH_ERRORS.UNAUTHORIZED();
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    next();
  };

/** @deprecated Use authorize(permission) — kept for route migration */
const authorizeRoles =
  (...roles) =>
  (req, res, next) => {
    if (!req.auth?.userId && !req.user) {
      const err = AUTH_ERRORS.UNAUTHENTICATED();
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    const role = req.auth?.role || req.user?.role;
    const normalizedRoles = roles.flat();
    if (role === ROLES.SUPERADMIN) normalizedRoles.push(ROLES.SUPERADMIN);
    if (!normalizedRoles.includes(role)) {
      const err = AUTH_ERRORS.UNAUTHORIZED();
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    next();
  };

module.exports = { authorize, authorizeRoles };
