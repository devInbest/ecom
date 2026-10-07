const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { getPermissionsForRole, normalizeRole } = require('../../config/permissions');
const { AUTH_ERRORS } = require('../utils/errors');

const getSigningKey = () => {
  if (env.jwt.algorithm === 'RS256') return env.jwt.privateKey;
  return env.jwt.secret;
};

const getVerificationKey = () => {
  if (env.jwt.algorithm === 'RS256') return env.jwt.publicKey;
  return env.jwt.secret;
};

const signAccessToken = (user, sessionId) => {
  const role = normalizeRole(user.role);
  const permissions = getPermissionsForRole(user.role);

  return jwt.sign(
    {
      sub: String(user._id),
      sid: sessionId,
      role,
      permissions,
    },
    getSigningKey(),
    {
      algorithm: env.jwt.algorithm,
      expiresIn: env.jwt.accessTokenTtl,
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    }
  );
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, getVerificationKey(), {
      algorithms: [env.jwt.algorithm],
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw AUTH_ERRORS.TOKEN_EXPIRED();
    throw AUTH_ERRORS.INVALID_TOKEN();
  }
};

module.exports = { signAccessToken, verifyAccessToken };
