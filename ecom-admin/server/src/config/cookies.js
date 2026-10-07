const env = require('./env');

const cookieBase = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? 'strict' : 'lax',
  ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
};

const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  CSRF_TOKEN: 'csrf_token',
};

const getAccessTokenCookieOptions = () => ({
  ...cookieBase,
  path: '/api/v1',
  maxAge: env.jwt.accessTokenTtlMs,
});

const getRefreshTokenCookieOptions = () => ({
  ...cookieBase,
  path: '/api/v1/auth',
  maxAge: env.jwt.refreshTokenTtlMs,
});

const getCsrfCookieOptions = () => ({
  httpOnly: false,
  secure: env.isProduction,
  sameSite: env.isProduction ? 'strict' : 'lax',
  path: '/',
  ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  maxAge: env.jwt.refreshTokenTtlMs,
});

const clearAuthCookies = (res) => {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { ...cookieBase, path: '/api/v1' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { ...cookieBase, path: '/api/v1/auth' });
  res.clearCookie(COOKIE_NAMES.CSRF_TOKEN, { ...getCsrfCookieOptions(), maxAge: 0 });
};

module.exports = {
  COOKIE_NAMES,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getCsrfCookieOptions,
  clearAuthCookies,
};
