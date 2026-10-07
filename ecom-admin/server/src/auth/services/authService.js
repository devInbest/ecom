const env = require('../../config/env');
const User = require('../../models/User');
const { USER_STATUS, normalizeEmail } = require('../../models/User');
const AdminInvitation = require('../models/AdminInvitation');
const PasswordResetToken = require('../models/PasswordResetToken');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const Session = require('../models/Session');
const { signAccessToken } = require('./tokenService');
const {
  createSession,
  revokeSession,
  revokeAllUserSessions,
  rotateRefreshToken,
  findSessionByRefreshToken,
  handleRefreshTokenReuse,
  getUserSessions,
  touchStepUpAuth,
  isStepUpValid,
} = require('./sessionService');
const { validatePassword } = require('./passwordService');
const { recordAudit } = require('./auditService');
const {
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendVerificationEmail,
} = require('./emailService');
const { hashToken, generateSecureToken } = require('../utils/crypto');
const { AUTH_ERRORS, AppError } = require('../utils/errors');
const {
  COOKIE_NAMES,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getCsrfCookieOptions,
  clearAuthCookies,
} = require('../../config/cookies');
const { getPermissionsForRole, INVITABLE_ROLES, ROLES } = require('../../config/permissions');
const { generateSecureToken: genCsrf } = require('../utils/crypto');

const getClientMeta = (req) => ({
  ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
  userAgent: req.headers['user-agent'] || '',
});

const setAuthCookies = (res, accessToken, refreshToken, csrfToken) => {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, getAccessTokenCookieOptions());
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, getRefreshTokenCookieOptions());
  res.cookie(COOKIE_NAMES.CSRF_TOKEN, csrfToken, getCsrfCookieOptions());
};

const issueAuthResponse = async (res, user, session, refreshToken) => {
  const accessToken = signAccessToken(user, String(session._id));
  const csrfToken = genCsrf(32);
  setAuthCookies(res, accessToken, refreshToken, csrfToken);

  return {
    user: user.toPublicJSON(),
    permissions: getPermissionsForRole(user.role),
    csrfToken,
  };
};

const checkAccountStatus = (user) => {
  if (user.isLocked()) throw AUTH_ERRORS.ACCOUNT_LOCKED(user.lockedUntil);
  if (user.status === USER_STATUS.SUSPENDED || !user.isActive) {
    throw AUTH_ERRORS.ACCOUNT_SUSPENDED();
  }
  if (user.status === USER_STATUS.PENDING) throw AUTH_ERRORS.ACCOUNT_PENDING();
};

const recordFailedLogin = async (user, req) => {
  if (!user) return;
  user.failedLoginAttempts += 1;
  if (user.failedLoginAttempts >= env.auth.maxFailedLoginAttempts) {
    user.lockedUntil = new Date(Date.now() + env.auth.lockoutDurationMs);
    user.status = USER_STATUS.LOCKED;
  }
  await user.save({ validateBeforeSave: false });
  await recordAudit({
    actorId: user._id,
    action: 'LOGIN_FAILED',
    ipAddress: getClientMeta(req).ipAddress,
    userAgent: getClientMeta(req).userAgent,
    metadata: { attempts: user.failedLoginAttempts },
  });
};

const login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  const meta = getClientMeta(req);

  const user = await User.findOne({ normalizedEmail: email }).select('+password +avatarImage');
  const invalid = () => {
    throw AUTH_ERRORS.INVALID_CREDENTIALS();
  };

  if (!user) {
    await recordAudit({
      action: 'LOGIN_FAILED',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { email },
    });
    invalid();
  }

  checkAccountStatus(user);

  const passwordValid = await user.comparePassword(password);
  if (!passwordValid) {
    await recordFailedLogin(user, req);
    invalid();
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  if (user.status === USER_STATUS.LOCKED) user.status = USER_STATUS.ACTIVE;
  user.lastLoginAt = new Date();
  user.lastLoginIp = meta.ipAddress;
  await user.save({ validateBeforeSave: false });

  const { session, refreshToken } = await createSession({
    userId: user._id,
    ...meta,
  });

  const payload = await issueAuthResponse(res, user, session, refreshToken);

  await recordAudit({
    actorId: user._id,
    action: 'LOGIN_SUCCESS',
    resourceType: 'session',
    resourceId: session._id,
    ...meta,
  });
  await recordAudit({
    actorId: user._id,
    action: 'SESSION_CREATED',
    resourceType: 'session',
    resourceId: session._id,
    ...meta,
  });

  return payload;
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
  if (!refreshToken) throw AUTH_ERRORS.UNAUTHENTICATED();

  const session = await findSessionByRefreshToken(refreshToken);
  if (!session) throw AUTH_ERRORS.INVALID_TOKEN();

  if (session.revokedAt) {
    await handleRefreshTokenReuse(session);
  }

  if (!session.isActive()) throw AUTH_ERRORS.SESSION_REVOKED();

  const user = await User.findById(session.userId).select('+avatarImage');
  if (!user) throw AUTH_ERRORS.UNAUTHENTICATED();
  checkAccountStatus(user);

  const meta = getClientMeta(req);
  const newRefreshToken = await rotateRefreshToken(session, meta.ipAddress, meta.userAgent);
  const payload = await issueAuthResponse(res, user, session, newRefreshToken);
  return payload;
};

const logout = async (req, res) => {
  const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
  if (refreshToken) {
    const session = await findSessionByRefreshToken(refreshToken);
    if (session) {
      await revokeSession(session._id);
      await recordAudit({
        actorId: session.userId,
        action: 'SESSION_REVOKED',
        resourceType: 'session',
        resourceId: session._id,
        ...getClientMeta(req),
      });
    }
  }
  if (req.auth?.sessionId) {
    await revokeSession(req.auth.sessionId);
  }
  clearAuthCookies(res);
  await recordAudit({
    actorId: req.auth?.userId,
    action: 'LOGOUT',
    ...getClientMeta(req),
  });
};

const logoutAll = async (req, res) => {
  if (!req.auth?.userId) throw AUTH_ERRORS.UNAUTHENTICATED();
  await revokeAllUserSessions(req.auth.userId);
  clearAuthCookies(res);
  await recordAudit({
    actorId: req.auth.userId,
    action: 'LOGOUT_ALL',
    ...getClientMeta(req),
  });
};

const getMe = async (req) => {
  const user = await User.findById(req.auth.userId).select('+avatarImage');
  if (!user) throw AUTH_ERRORS.UNAUTHENTICATED();
  checkAccountStatus(user);
  return {
    ...user.toPublicJSON(),
    permissions: getPermissionsForRole(user.role),
  };
};

const changePassword = async (req) => {
  const { currentPassword, newPassword } = req.body;
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw AUTH_ERRORS.PASSWORD_WEAK(passwordError);

  const user = await User.findById(req.auth.userId).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400, 'AUTH_INVALID_PASSWORD');
  }

  user.password = newPassword;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  await revokeAllUserSessions(user._id, req.auth.sessionId);
  await touchStepUpAuth(req.auth.sessionId);

  await recordAudit({
    actorId: user._id,
    action: 'PASSWORD_CHANGED',
    ...getClientMeta(req),
  });

  return { message: 'Password updated successfully' };
};

const forgotPassword = async (req) => {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ normalizedEmail: email });

  if (user) {
    const rawToken = generateSecureToken(32);
    await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + env.auth.passwordResetTtlMs),
    });
    const resetUrl = `${env.adminAppUrl}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail({ to: user.email, resetUrl });
  }

  return {
    message: 'If an account exists for that email, a password reset link has been sent.',
  };
};

const resetPassword = async (req) => {
  const { token, newPassword } = req.body;
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw AUTH_ERRORS.PASSWORD_WEAK(passwordError);

  const tokenHash = hashToken(token);
  const resetRecord = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!resetRecord) {
    throw new AppError('Invalid or expired reset token', 400, 'AUTH_RESET_TOKEN_INVALID');
  }

  const user = await User.findById(resetRecord.userId).select('+password');
  if (!user) throw AUTH_ERRORS.INVALID_CREDENTIALS();

  user.password = newPassword;
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  if (user.status === USER_STATUS.LOCKED) user.status = USER_STATUS.ACTIVE;
  await user.save();

  resetRecord.usedAt = new Date();
  await resetRecord.save();
  await revokeAllUserSessions(user._id);

  await recordAudit({
    actorId: user._id,
    action: 'PASSWORD_RESET',
    ...getClientMeta(req),
  });

  return { message: 'Password reset successfully. Please sign in again.' };
};

const verifyEmail = async (req) => {
  const { token } = req.body;
  const tokenHash = hashToken(token);
  const record = await EmailVerificationToken.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!record) {
    throw new AppError('Invalid or expired verification token', 400, 'AUTH_VERIFY_TOKEN_INVALID');
  }

  const user = await User.findById(record.userId);
  if (!user) throw AUTH_ERRORS.INVALID_CREDENTIALS();

  user.emailVerifiedAt = new Date();
  if (user.status === USER_STATUS.PENDING) user.status = USER_STATUS.ACTIVE;
  await user.save({ validateBeforeSave: false });

  record.usedAt = new Date();
  await record.save();

  await recordAudit({
    actorId: user._id,
    action: 'EMAIL_VERIFIED',
    ...getClientMeta(req),
  });

  return { message: 'Email verified successfully' };
};

const listSessions = async (req) => {
  const sessions = await getUserSessions(req.auth.userId);
  return sessions.map((s) => ({
    ...s,
    isCurrent: String(s._id) === String(req.auth.sessionId),
  }));
};

const revokeUserSession = async (req) => {
  const session = await Session.findOne({
    _id: req.params.id,
    userId: req.auth.userId,
    revokedAt: null,
  });
  if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');

  await revokeSession(session._id);
  await recordAudit({
    actorId: req.auth.userId,
    action: 'SESSION_REVOKED',
    resourceType: 'session',
    resourceId: session._id,
    ...getClientMeta(req),
  });
  return { message: 'Session revoked' };
};

const revokeAllSessions = async (req) => {
  await revokeAllUserSessions(req.auth.userId, req.auth.sessionId);
  await recordAudit({
    actorId: req.auth.userId,
    action: 'SESSION_REVOKED',
    metadata: { all: true },
    ...getClientMeta(req),
  });
  return { message: 'All other sessions revoked' };
};

const createInvitation = async (req) => {
  const { email, role, firstName, lastName } = req.body;
  const normalized = normalizeEmail(email);
  const inviteRole = INVITABLE_ROLES.includes(role) ? role : ROLES.STAFF;

  if (req.auth.role !== ROLES.SUPERADMIN && req.auth.role !== ROLES.SUPER_ADMIN) {
    if (inviteRole !== ROLES.STAFF) throw AUTH_ERRORS.UNAUTHORIZED();
  }

  const existing = await User.findOne({ normalizedEmail: normalized });
  if (existing) {
    throw new AppError('Email already registered', 400, 'AUTH_EMAIL_EXISTS');
  }

  await AdminInvitation.updateMany(
    { normalizedEmail: normalized, usedAt: null, revokedAt: null },
    { revokedAt: new Date() }
  );

  const rawToken = generateSecureToken(32);
  const invitation = await AdminInvitation.create({
    email: normalized,
    normalizedEmail: normalized,
    tokenHash: hashToken(rawToken),
    role: inviteRole,
    invitedBy: req.auth.userId,
    expiresAt: new Date(Date.now() + env.auth.invitationTtlMs),
    firstName: firstName || '',
    lastName: lastName || '',
  });

  const inviteUrl = `${env.adminAppUrl}/accept-invitation?token=${rawToken}`;
  await sendInvitationEmail({ to: normalized, inviteUrl, role: inviteRole });

  await recordAudit({
    actorId: req.auth.userId,
    action: 'ADMIN_CREATED',
    resourceType: 'invitation',
    resourceId: invitation._id,
    metadata: { email: normalized, role: inviteRole },
    ...getClientMeta(req),
  });

  return { message: 'Invitation sent', invitationId: invitation._id };
};

const acceptInvitation = async (req, res) => {
  const { token, password, firstName, lastName, name } = req.body;
  const passwordError = validatePassword(password);
  if (passwordError) throw AUTH_ERRORS.PASSWORD_WEAK(passwordError);

  const tokenHash = hashToken(token);
  const invitation = await AdminInvitation.findOne({
    tokenHash,
    usedAt: null,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!invitation) {
    throw new AppError('Invalid or expired invitation', 400, 'AUTH_INVITATION_INVALID');
  }

  const displayName =
    name ||
    [firstName || invitation.firstName, lastName || invitation.lastName].filter(Boolean).join(' ') ||
    invitation.email.split('@')[0];

  const user = await User.create({
    name: displayName,
    firstName: firstName || invitation.firstName || displayName.split(' ')[0],
    lastName: lastName || invitation.lastName || '',
    email: invitation.normalizedEmail,
    normalizedEmail: invitation.normalizedEmail,
    password,
    role: invitation.role,
    status: USER_STATUS.ACTIVE,
    emailVerifiedAt: new Date(),
  });

  invitation.usedAt = new Date();
  await invitation.save();

  const { session, refreshToken } = await createSession({
    userId: user._id,
    ...getClientMeta(req),
  });

  const payload = await issueAuthResponse(res, user, session, refreshToken);

  await recordAudit({
    actorId: user._id,
    action: 'ADMIN_CREATED',
    resourceType: 'user',
    resourceId: user._id,
    ...getClientMeta(req),
  });

  return payload;
};

const requireStepUp = (req) => {
  if (!req.auth?.sessionId) throw AUTH_ERRORS.STEP_UP_REQUIRED();
  return Session.findById(req.auth.sessionId).then((session) => {
    if (!isStepUpValid(session)) throw AUTH_ERRORS.STEP_UP_REQUIRED();
  });
};

module.exports = {
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  listSessions,
  revokeUserSession,
  revokeAllSessions,
  createInvitation,
  acceptInvitation,
  requireStepUp,
  issueAuthResponse,
  checkAccountStatus,
};
