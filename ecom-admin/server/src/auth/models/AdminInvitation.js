const mongoose = require('mongoose');
const { ROLES } = require('../../config/permissions');

const invitationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    normalizedEmail: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.STAFF,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
  },
  { timestamps: true }
);

invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AdminInvitation', invitationSchema);
