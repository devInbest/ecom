const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const SENSITIVE_METADATA_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'mfaSecret',
]);

const sanitizeMetadata = (metadata = {}) => {
  const out = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_METADATA_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
};

const recordAudit = async ({
  actorId = null,
  action,
  resourceType = '',
  resourceId = '',
  ipAddress = '',
  userAgent = '',
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      actorId,
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : '',
      ipAddress,
      userAgent,
      metadata: sanitizeMetadata(metadata),
    });
  } catch (err) {
    logger.error('Failed to write audit log', { action, error: err.message });
  }
};

module.exports = { recordAudit };
