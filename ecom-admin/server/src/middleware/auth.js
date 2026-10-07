const { authenticate } = require('../auth/middleware/authenticate');
const { authorize, authorizeRoles } = require('../auth/middleware/authorize');

/** Backward-compatible exports — prefer auth module middleware directly */
const protect = authenticate;
const authorizeLegacy = authorizeRoles;

module.exports = { protect, authorize: authorizeLegacy, authenticate, authorizePermission: authorize };
