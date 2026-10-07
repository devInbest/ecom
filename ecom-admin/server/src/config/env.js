const parseDuration = (value, fallbackMs) => {
  if (!value) return fallbackMs;
  const match = String(value).trim().match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
};

const requireInProduction = (name, value) => {
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
};

const normalizePem = (value) => {
  if (!value) return '';
  return String(value).replace(/\\n/g, '\n').trim();
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5004,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecom-admin',
  adminAppUrl: process.env.ADMIN_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5176',
  corsOrigins: [
    process.env.ADMIN_APP_URL,
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || process.env.FRONTEND_URLS || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    'http://localhost:5176',
  ].filter(Boolean),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  jwt: {
    issuer: process.env.JWT_ISSUER || 'ecom-admin',
    audience: process.env.JWT_AUDIENCE || 'ecom-admin-api',
    privateKey: normalizePem(process.env.JWT_PRIVATE_KEY),
    publicKey: normalizePem(process.env.JWT_PUBLIC_KEY),
    secret: process.env.JWT_SECRET,
    algorithm: process.env.JWT_ALGORITHM || undefined,
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    accessTokenTtlMs: parseDuration(process.env.ACCESS_TOKEN_TTL || '15m', 15 * 60_000),
    refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '30d',
    refreshTokenTtlMs: parseDuration(process.env.REFRESH_TOKEN_TTL || '30d', 30 * 86_400_000),
  },
  redis: {
    url: process.env.REDIS_URL || '',
    enabled: Boolean(process.env.REDIS_URL),
  },
  email: {
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    providerApiKey: process.env.EMAIL_PROVIDER_API_KEY || '',
  },
  auth: {
    maxFailedLoginAttempts: Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS) || 5,
    lockoutDurationMs: parseDuration(process.env.LOCKOUT_DURATION || '15m', 15 * 60_000),
    passwordResetTtlMs: parseDuration(process.env.PASSWORD_RESET_TTL || '1h', 3_600_000),
    invitationTtlMs: parseDuration(process.env.INVITATION_TTL || '7d', 7 * 86_400_000),
    emailVerificationTtlMs: parseDuration(process.env.EMAIL_VERIFICATION_TTL || '24h', 86_400_000),
    stepUpAuthMaxAgeMs: parseDuration(process.env.STEP_UP_AUTH_MAX_AGE || '5m', 5 * 60_000),
  },
};

const resolveJwtAlgorithm = () => {
  if (env.jwt.algorithm) return env.jwt.algorithm;
  if (env.jwt.privateKey && env.jwt.publicKey) return 'RS256';
  return 'HS256';
};

env.jwt.algorithm = resolveJwtAlgorithm();

const validateEnv = () => {
  requireInProduction('MONGODB_URI', env.mongodbUri);

  if (env.isProduction) {
    requireInProduction('ADMIN_APP_URL', env.adminAppUrl);
    if (env.jwt.algorithm === 'RS256') {
      requireInProduction('JWT_PRIVATE_KEY', env.jwt.privateKey);
      requireInProduction('JWT_PUBLIC_KEY', env.jwt.publicKey);
    } else {
      requireInProduction('JWT_SECRET', env.jwt.secret);
    }
    if (!env.redis.enabled) {
      console.warn('[auth] REDIS_URL not set — rate limiting uses in-memory store (not suitable for multi-instance production)');
    }
  } else if (env.jwt.algorithm === 'HS256' && !env.jwt.secret) {
    env.jwt.secret = 'dev-only-insecure-jwt-secret-change-me';
    console.warn('[auth] JWT_SECRET not set — using insecure development default');
  }
};

validateEnv();

module.exports = env;
