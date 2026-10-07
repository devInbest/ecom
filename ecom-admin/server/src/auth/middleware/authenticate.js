const User = require('../../models/User');
const Session = require('../models/Session');
const { COOKIE_NAMES } = require('../../config/cookies');
const { verifyAccessToken } = require('../services/tokenService');
const { checkAccountStatus } = require('../services/authService');
const { getPermissionsForRole } = require('../../config/permissions');
const { AUTH_ERRORS } = require('../utils/errors');

const extractAccessToken = (req) => {
  if (req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN]) {
    return req.cookies[COOKIE_NAMES.ACCESS_TOKEN];
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

const authenticate = async (req, res, next) => {
  try {
    const token = extractAccessToken(req);
    if (!token) throw AUTH_ERRORS.UNAUTHENTICATED();

    const decoded = verifyAccessToken(token);
    if (!decoded.sub || !decoded.sid) throw AUTH_ERRORS.INVALID_TOKEN();

    const session = await Session.findById(decoded.sid);
    if (!session || !session.isActive()) throw AUTH_ERRORS.SESSION_REVOKED();

    const user = await User.findById(decoded.sub);
    if (!user) throw AUTH_ERRORS.UNAUTHENTICATED();

    checkAccountStatus(user);

    const permissions = getPermissionsForRole(user.role);
    req.auth = {
      userId: user._id,
      sessionId: session._id,
      role: user.role,
      permissions,
      email: user.email,
    };
    req.user = user;
    next();
  } catch (err) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message, ...(err.metadata || {}) },
      });
    }
    next(err);
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractAccessToken(req);
    if (!token) return next();
    const decoded = verifyAccessToken(token);
    const session = await Session.findById(decoded.sid);
    const user = await User.findById(decoded.sub);
    if (session?.isActive() && user) {
      req.auth = {
        userId: user._id,
        sessionId: session._id,
        role: user.role,
        permissions: getPermissionsForRole(user.role),
        email: user.email,
      };
      req.user = user;
    }
    next();
  } catch {
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate, extractAccessToken };
