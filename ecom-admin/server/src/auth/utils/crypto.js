const crypto = require('crypto');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateSecureToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('base64url');

const generateTokenFamilyId = () => crypto.randomUUID();

const generateDeviceId = () => crypto.randomUUID();

const timingSafeEqualHex = (a, b) => {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
};

module.exports = {
  hashToken,
  generateSecureToken,
  generateTokenFamilyId,
  generateDeviceId,
  timingSafeEqualHex,
};
