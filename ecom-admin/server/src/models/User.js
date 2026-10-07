const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/permissions');

const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  LOCKED: 'locked',
  PENDING: 'pending',
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
    },
    normalizedEmail: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 12,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.STAFF,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    mfaEnabled: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: '' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    avatarImage: {
      type: String,
      default: '',
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.index({ status: 1 });
userSchema.index({ role: 1 });

userSchema.pre('validate', function syncNormalizedEmail(next) {
  if (this.email) {
    this.normalizedEmail = normalizeEmail(this.email);
    this.email = this.normalizedEmail;
  }
  if (this.status === USER_STATUS.SUSPENDED) {
    this.isActive = false;
  } else if (this.status === USER_STATUS.ACTIVE) {
    this.isActive = true;
  }
  next();
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function isLocked() {
  return this.lockedUntil && this.lockedUntil > new Date();
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  const doc = this.toObject ? this.toObject() : this;
  return {
    _id: doc._id,
    name: doc.name,
    firstName: doc.firstName || doc.name?.split(' ')[0] || '',
    lastName: doc.lastName || doc.name?.split(' ').slice(1).join(' ') || '',
    email: doc.email,
    role: doc.role,
    status: doc.status || (doc.isActive ? USER_STATUS.ACTIVE : USER_STATUS.SUSPENDED),
    isActive: doc.isActive,
    emailVerifiedAt: doc.emailVerifiedAt,
    mfaEnabled: doc.mfaEnabled,
    lastLoginAt: doc.lastLoginAt,
    hasAvatar: Boolean(doc.avatarImage),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.USER_STATUS = USER_STATUS;
module.exports.normalizeEmail = normalizeEmail;
