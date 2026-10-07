const env = require('../../config/env');
const Session = require('../models/Session');
const {
  hashToken,
  generateSecureToken,
  generateTokenFamilyId,
  generateDeviceId,
} = require('../utils/crypto');
const { AUTH_ERRORS } = require('../utils/errors');

const parseUserAgent = (userAgent = '') => {
  if (!userAgent) return 'Unknown browser';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown browser';
};

const createSession = async ({ userId, ipAddress, userAgent, deviceId, tokenFamilyId }) => {
  const refreshToken = generateSecureToken(32);
  const familyId = tokenFamilyId || generateTokenFamilyId();
  const expiresAt = new Date(Date.now() + env.jwt.refreshTokenTtlMs);

  const session = await Session.create({
    userId,
    refreshTokenHash: hashToken(refreshToken),
    tokenFamilyId: familyId,
    deviceId: deviceId || generateDeviceId(),
    userAgent,
    ipAddress,
    expiresAt,
    lastUsedAt: new Date(),
    lastAuthenticatedAt: new Date(),
  });

  return { session, refreshToken, tokenFamilyId: familyId };
};

const revokeSession = async (sessionId) => {
  await Session.findByIdAndUpdate(sessionId, { revokedAt: new Date() });
};

const revokeAllUserSessions = async (userId, exceptSessionId = null) => {
  const filter = { userId, revokedAt: null };
  if (exceptSessionId) filter._id = { $ne: exceptSessionId };
  await Session.updateMany(filter, { revokedAt: new Date() });
};

const revokeTokenFamily = async (tokenFamilyId) => {
  await Session.updateMany({ tokenFamilyId }, { revokedAt: new Date() });
};

const rotateRefreshToken = async (session, ipAddress, userAgent) => {
  if (!session.isActive()) {
    throw AUTH_ERRORS.SESSION_REVOKED();
  }

  const newRefreshToken = generateSecureToken(32);
  const newExpiresAt = new Date(Date.now() + env.jwt.refreshTokenTtlMs);

  session.refreshTokenHash = hashToken(newRefreshToken);
  session.lastUsedAt = new Date();
  session.ipAddress = ipAddress || session.ipAddress;
  session.userAgent = userAgent || session.userAgent;
  session.expiresAt = newExpiresAt;
  await session.save();

  return newRefreshToken;
};

const findSessionByRefreshToken = async (refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  return Session.findOne({ refreshTokenHash: tokenHash });
};

const handleRefreshTokenReuse = async (session) => {
  await revokeTokenFamily(session.tokenFamilyId);
  throw AUTH_ERRORS.REFRESH_REUSE();
};

const getUserSessions = async (userId) => {
  const sessions = await Session.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastUsedAt: -1 })
    .lean();

  return sessions.map((s) => ({
    _id: s._id,
    deviceId: s.deviceId,
    browser: parseUserAgent(s.userAgent),
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    lastUsedAt: s.lastUsedAt,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isCurrent: false,
  }));
};

const touchStepUpAuth = async (sessionId) => {
  await Session.findByIdAndUpdate(sessionId, { lastAuthenticatedAt: new Date() });
};

const isStepUpValid = (session) => {
  if (!session?.lastAuthenticatedAt) return false;
  const age = Date.now() - new Date(session.lastAuthenticatedAt).getTime();
  return age <= env.auth.stepUpAuthMaxAgeMs;
};

module.exports = {
  createSession,
  revokeSession,
  revokeAllUserSessions,
  revokeTokenFamily,
  rotateRefreshToken,
  findSessionByRefreshToken,
  handleRefreshTokenReuse,
  getUserSessions,
  touchStepUpAuth,
  isStepUpValid,
  parseUserAgent,
};
