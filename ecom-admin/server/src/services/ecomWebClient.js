const axios = require('axios');
const jwt = require('jsonwebtoken');

let cachedToken = null;
let cachedTokenExp = 0;

const getConfig = () => {
  const baseURL = (process.env.ECOM_WEB_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
  const secret = process.env.ECOM_WEB_JWT_SECRET;
  const adminUserId = process.env.ECOM_WEB_ADMIN_USER_ID;

  if (!secret || !adminUserId) {
    const error = new Error(
      'Store API is not configured. Set ECOM_WEB_JWT_SECRET and ECOM_WEB_ADMIN_USER_ID in server/.env (run pnpm resolve:ecom).',
    );
    error.statusCode = 503;
    throw error;
  }

  return { baseURL, secret, adminUserId };
};

const getServiceToken = () => {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExp - 60 > now) {
    return cachedToken;
  }

  const { secret, adminUserId } = getConfig();
  cachedToken = jwt.sign({ sub: adminUserId, role: 'ADMIN' }, secret, { expiresIn: '30d' });
  cachedTokenExp = now + 30 * 24 * 3600;
  return cachedToken;
};

const createClient = () => {
  const { baseURL } = getConfig();
  const client = axios.create({
    baseURL,
    timeout: 20000,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${getServiceToken()}`;
    return config;
  });

  return client;
};

const wrapRequest = async (requestFn) => {
  try {
    const response = await requestFn();
    return response.data;
  } catch (err) {
    const status = err.response?.status || 502;
    const payload = err.response?.data;
    const message = payload?.message || payload?.error || err.message || 'Store API request failed';
    const error = new Error(message);
    error.statusCode = status;
    throw error;
  }
};

module.exports = {
  get: (path, config) => wrapRequest(() => createClient().get(path, config)),
  post: (path, data, config) => wrapRequest(() => createClient().post(path, data, config)),
  patch: (path, data, config) => wrapRequest(() => createClient().patch(path, data, config)),
  delete: (path, config) => wrapRequest(() => createClient().delete(path, config)),
};
