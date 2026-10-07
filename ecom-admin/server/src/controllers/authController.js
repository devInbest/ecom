const { validationResult } = require('express-validator');
const User = require('../models/User');
const { USER_STATUS, normalizeEmail } = require('../models/User');
const { processAvatarUpload, avatarBase64ToDataUri } = require('../utils/processAvatarImage');
const { validatePassword } = require('../auth/services/passwordService');
const { recordAudit } = require('../auth/services/auditService');
const { INVITABLE_ROLES, ROLES } = require('../config/permissions');
const { AppError } = require('../auth/utils/errors');

const getActorRole = (req) => req.auth?.role || req.user?.role;
const getActorId = (req) => req.auth?.userId || req.user?._id;

const canManageUser = (actorRole, targetRole) => {
  if (actorRole === ROLES.SUPERADMIN || actorRole === ROLES.SUPER_ADMIN) {
    return targetRole !== ROLES.SUPERADMIN && targetRole !== ROLES.SUPER_ADMIN;
  }
  if (actorRole === ROLES.ADMIN) return targetRole === ROLES.STAFF;
  return false;
};

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400, 'VALIDATION_ERROR');
  }

  const { name, email, password, role } = req.body;
  const normalized = normalizeEmail(email);
  const existingUser = await User.findOne({ normalizedEmail: normalized });
  if (existingUser) {
    throw new AppError('Email already registered', 400, 'AUTH_EMAIL_EXISTS');
  }

  const actorRole = getActorRole(req);
  const requestedRole = INVITABLE_ROLES.includes(role) ? role : ROLES.STAFF;
  if (actorRole === ROLES.ADMIN && requestedRole !== ROLES.STAFF) {
    throw new AppError('Admin can only create Staff users', 403, 'AUTH_UNAUTHORIZED');
  }

  const user = await User.create({
    name,
    email: normalized,
    normalizedEmail: normalized,
    password,
    role: requestedRole,
    status: USER_STATUS.ACTIVE,
  });

  await recordAudit({
    actorId: getActorId(req),
    action: 'ADMIN_CREATED',
    resourceType: 'user',
    resourceId: user._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: user.toPublicJSON(),
  });
};

const getMyAvatar = async (req, res) => {
  const user = await User.findById(getActorId(req)).select('+avatarImage');
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  res.json({
    success: true,
    hasAvatar: Boolean(user.avatarImage),
    avatarPreview: user.avatarImage ? avatarBase64ToDataUri(user.avatarImage) : '',
  });
};

const updateProfile = async (req, res) => {
  const { name, avatarImage, clearAvatar } = req.body;
  const user = await User.findById(getActorId(req)).select('+avatarImage');
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const role = getActorRole(req);
  const canEditProfileFields = role === ROLES.SUPERADMIN || role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
  if (canEditProfileFields && name !== undefined) {
    user.name = name;
  }

  if (clearAvatar) {
    user.avatarImage = '';
  } else if (avatarImage !== undefined) {
    try {
      user.avatarImage = processAvatarUpload(avatarImage);
    } catch (err) {
      throw new AppError(err.message || 'Invalid photo', 400, 'VALIDATION_ERROR');
    }
  }

  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    user: user.toPublicJSON(),
    avatarPreview: user.avatarImage ? avatarBase64ToDataUri(user.avatarImage) : '',
  });
};

const getUsers = async (req, res) => {
  const actorRole = getActorRole(req);
  const filter = {};
  if (actorRole === ROLES.ADMIN) {
    filter.role = { $in: [ROLES.ADMIN, ROLES.STAFF] };
  }

  const users = await User.find(filter)
    .select('_id name email role status isActive createdAt')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    users: users.map((u) => ({
      ...u,
      status: u.status || (u.isActive ? USER_STATUS.ACTIVE : USER_STATUS.SUSPENDED),
    })),
  });
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  const target = await User.findById(id);
  if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

  if (target.role === ROLES.SUPERADMIN || target.role === ROLES.SUPER_ADMIN) {
    throw new AppError('SUPERADMIN users cannot be deleted', 403, 'AUTH_UNAUTHORIZED');
  }

  if (!canManageUser(getActorRole(req), target.role)) {
    throw new AppError('You can only delete Staff users', 403, 'AUTH_UNAUTHORIZED');
  }

  await User.findByIdAndDelete(id);
  await recordAudit({
    actorId: getActorId(req),
    action: 'ADMIN_DISABLED',
    resourceType: 'user',
    resourceId: id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'User deleted successfully' });
};

const updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400, 'VALIDATION_ERROR');
  }

  const { id } = req.params;
  const { name, email, isActive } = req.body;

  const target = await User.findById(id);
  if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

  if (target.role === ROLES.SUPERADMIN || target.role === ROLES.SUPER_ADMIN) {
    throw new AppError('SUPERADMIN accounts cannot be updated from user management', 403, 'AUTH_UNAUTHORIZED');
  }

  if (!canManageUser(getActorRole(req), target.role)) {
    throw new AppError('You can only edit Staff users', 403, 'AUTH_UNAUTHORIZED');
  }

  const emailNorm = normalizeEmail(email);
  if (emailNorm !== target.email) {
    const taken = await User.findOne({ normalizedEmail: emailNorm, _id: { $ne: id } });
    if (taken) throw new AppError('Email already in use', 400, 'AUTH_EMAIL_EXISTS');
  }

  target.name = String(name).trim();
  target.email = emailNorm;
  target.normalizedEmail = emailNorm;
  target.isActive = Boolean(isActive);
  target.status = isActive ? USER_STATUS.ACTIVE : USER_STATUS.SUSPENDED;

  await target.save();

  await recordAudit({
    actorId: getActorId(req),
    action: 'ROLE_CHANGED',
    resourceType: 'user',
    resourceId: target._id,
    metadata: { isActive },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    user: target.toPublicJSON(),
  });
};

const resetUserPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400, 'VALIDATION_ERROR');
  }

  const role = getActorRole(req);
  if (role !== ROLES.SUPERADMIN && role !== ROLES.SUPER_ADMIN) {
    throw new AppError('Only Superadmin can reset user passwords', 403, 'AUTH_UNAUTHORIZED');
  }

  const target = await User.findById(req.params.id);
  if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

  if (target.role === ROLES.SUPERADMIN || target.role === ROLES.SUPER_ADMIN) {
    throw new AppError('Superadmin passwords cannot be reset from user management', 403, 'AUTH_UNAUTHORIZED');
  }

  const passwordError = validatePassword(req.body.newPassword);
  if (passwordError) throw new AppError(passwordError, 400, 'AUTH_PASSWORD_WEAK');

  target.password = req.body.newPassword;
  await target.save();

  res.json({
    success: true,
    message: 'Password reset successfully',
    user: target.toPublicJSON(),
  });
};

module.exports = {
  register,
  getMyAvatar,
  updateProfile,
  getUsers,
  deleteUser,
  updateUser,
  resetUserPassword,
};
