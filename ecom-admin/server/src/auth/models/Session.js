const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    tokenFamilyId: {
      type: String,
      required: true,
      index: true,
    },
    deviceId: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    location: { type: String, default: '' },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastUsedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    lastAuthenticatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, revokedAt: 1 });

sessionSchema.methods.isActive = function isActive() {
  return !this.revokedAt && this.expiresAt > new Date();
};

module.exports = mongoose.model('Session', sessionSchema);
