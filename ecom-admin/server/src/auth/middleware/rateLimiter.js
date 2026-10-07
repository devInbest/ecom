const Redis = require('ioredis');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const env = require('../../config/env');
const { AUTH_ERRORS } = require('../utils/errors');

let redisClient = null;

const getRedisClient = () => {
  if (!env.redis.enabled) return null;
  if (!redisClient) {
    redisClient = new Redis(env.redis.url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    redisClient.on('error', (err) => {
      console.warn('[rate-limit] Redis error:', err.message);
    });
  }
  return redisClient;
};

const defaultKeyGenerator = (req) => req.ip || 'unknown';

const createLimiter = ({ windowMs, max, keyGenerator, message }) => {
  const redis = getRedisClient();
  const config = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || defaultKeyGenerator,
    validate: { keyGeneratorIpFallback: false },
    handler: (req, res) => {
      const err = AUTH_ERRORS.RATE_LIMITED();
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    },
    message,
  };

  if (redis) {
    config.store = new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    });
  }

  return rateLimit(config);
};

const loginIpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 20 : 100,
});

const loginAccountLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 10 : 50,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return email ? `login:${email}` : defaultKeyGenerator(req);
  },
});

const authRefreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 60 : 200,
});

const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: env.isProduction ? 5 : 20,
});

module.exports = {
  loginIpLimiter,
  loginAccountLimiter,
  authRefreshLimiter,
  passwordResetLimiter,
};
