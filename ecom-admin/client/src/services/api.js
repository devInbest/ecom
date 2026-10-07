import axios from 'axios';

const envBaseUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;

const normalizeApiBaseUrl = (url) => {
  if (!url) return '';
  const trimmed = String(url).trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api/v1')) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}/v1`;
  return `${trimmed}/api/v1`;
};

const baseURL = isDev
  ? (envBaseUrl || '/api/v1')
  : (normalizeApiBaseUrl(envBaseUrl) || '/api/v1');

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let csrfToken = '';
let refreshPromise = null;

export const setCsrfToken = (token) => {
  csrfToken = token || '';
};

export const getCsrfToken = () => csrfToken;

const GET_CACHE_TTL_MS = 15000;
const getCache = new Map();

const stableStringify = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${k}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return String(value);
};

const buildGetCacheKey = (url, params) => {
  const sessionKey = csrfToken ? csrfToken.slice(0, 8) : 'anonymous';
  return `${sessionKey}::${url}?${stableStringify(params || {})}`;
};

const clearGetCache = () => {
  getCache.clear();
};

const cachedGet = async (url, config = {}) => {
  const params = config?.params || {};
  const key = buildGetCacheKey(url, params);
  const hit = getCache.get(key);
  if (hit && Date.now() - hit.at < GET_CACHE_TTL_MS) {
    return hit.response;
  }
  const response = await api.get(url, config);
  getCache.set(key, { at: Date.now(), response });
  return response;
};

const readCsrfFromCookie = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

api.interceptors.request.use((config) => {
  const token = csrfToken || readCsrfFromCookie();
  const method = String(config.method || 'get').toLowerCase();
  if (token && !['get', 'head', 'options'].includes(method)) {
    config.headers['X-CSRF-Token'] = token;
  }
  if (method !== 'get') {
    clearGetCache();
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data?.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }
    return response;
  },
  async (error) => {
    const original = error.config || {};
    const requestUrl = String(original.url || '');
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = api.post('/auth/refresh').finally(() => {
          refreshPromise = null;
        });
      }
      try {
        const refreshRes = await refreshPromise;
        if (refreshRes.data?.csrfToken) {
          setCsrfToken(refreshRes.data.csrfToken);
        }
        return api(original);
      } catch {
        setCsrfToken('');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

const unwrap = (res) => res.data;

export const authAPI = {
  login: (data) => api.post('/auth/login', data).then(unwrap),
  logout: () => api.post('/auth/logout').then(unwrap),
  logoutAll: () => api.post('/auth/logout-all').then(unwrap),
  refresh: () => api.post('/auth/refresh').then(unwrap),
  register: (data) => api.post('/auth/register', data).then(unwrap),
  createUser: (data) => api.post('/auth/register', data).then(unwrap),
  createInvitation: (data) => api.post('/auth/admin/invitations', data).then(unwrap),
  acceptInvitation: (data) => api.post('/auth/admin/invitations/accept', data).then(unwrap),
  getMe: () => cachedGet('/auth/me').then(unwrap),
  getAvatar: () => api.get('/auth/me/avatar').then(unwrap),
  updateProfile: (data) => api.put('/auth/profile', data).then(unwrap),
  changePassword: (data) => api.put('/auth/change-password', data).then(unwrap),
  forgotPassword: (data) => api.post('/auth/forgot-password', data).then(unwrap),
  resetPassword: (data) => api.post('/auth/reset-password', data).then(unwrap),
  getSessions: () => api.get('/auth/sessions').then(unwrap),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`).then(unwrap),
  revokeAllSessions: () => api.delete('/auth/sessions').then(unwrap),
  getUsers: (options = {}) =>
    api
      .get('/auth/users', {
        params: options?.fresh ? { _ts: Date.now() } : undefined,
        headers: options?.fresh ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } : undefined,
      })
      .then(unwrap),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data).then(unwrap),
  resetUserPassword: (id, data) => api.patch(`/auth/users/${id}/password`, data).then(unwrap),
  deleteUser: (id) => api.delete(`/auth/users/${id}`).then(unwrap),
};

export const dashboardAPI = {
  getStats: () => cachedGet('/dashboard/stats'),
};

export const productsAPI = {
  list: (params = {}) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.patch(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
  duplicate: (id) => api.post(`/products/${id}/duplicate`),
  setStatus: (id, status) => api.patch(`/products/${id}/status`, { status }),
  setVisibility: (id, visibility) => api.patch(`/products/${id}/visibility`, { visibility }),
  setFeatured: (id, featured) => api.patch(`/products/${id}/featured`, { featured }),
};

export const uploadsAPI = {
  uploadImages: (files) => {
    const form = new FormData();
    for (const file of files) {
      form.append('files', file);
    }
    return api
      .post('/uploads', form, {
        timeout: 60000,
      })
      .then(unwrap);
  },
};

export const categoriesAPI = {
  list: (params = {}) => api.get('/categories', { params }).then(unwrap),
  get: (id) => api.get(`/categories/${id}`).then(unwrap),
  create: (data) => api.post('/categories', data).then(unwrap),
  update: (id, data) => api.patch(`/categories/${id}`, data).then(unwrap),
  setStatus: (id, status) => api.patch(`/categories/${id}/status`, { status }).then(unwrap),
  remove: (id) => api.delete(`/categories/${id}`).then(unwrap),
};

export const subcategoriesAPI = {
  list: (params = {}) => api.get('/subcategories', { params }).then(unwrap),
  get: (id) => api.get(`/subcategories/${id}`).then(unwrap),
  create: (data) => api.post('/subcategories', data).then(unwrap),
  update: (id, data) => api.patch(`/subcategories/${id}`, data).then(unwrap),
  setStatus: (id, status) => api.patch(`/subcategories/${id}/status`, { status }).then(unwrap),
  remove: (id) => api.delete(`/subcategories/${id}`).then(unwrap),
};

export const ordersAPI = {
  list: () => api.get('/orders'),
  updateStatus: (orderId, status) => api.patch(`/orders/${orderId}/status`, { status }),
};

export default api;
