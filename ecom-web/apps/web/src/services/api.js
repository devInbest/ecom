import env from '@/constants/env';

const TOKEN_KEY = 'nonsense_token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, token, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const authToken = token ?? (auth ? getToken() : null);
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fieldErrors = data.details?.fieldErrors;
    const firstField = fieldErrors
      ? Object.values(fieldErrors)
          .flat()
          .find(Boolean)
      : null;
    throw new ApiError(
      firstField || data.message || 'Request failed',
      res.status,
      data.error,
      data.details,
    );
  }
  return data;
}

export const catalogApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ''),
    ).toString();
    return api(`/products${qs ? `?${qs}` : ''}`);
  },
  featured: () => api('/products/featured'),
  bySlug: (slug) => api(`/products/${slug}`),
  categories: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ''),
    ).toString();
    return api(`/categories${qs ? `?${qs}` : ''}`);
  },
};

export const authApi = {
  sendOtp: (phone) => api('/auth/otp/send', { method: 'POST', body: { phone } }),
  verifyOtp: (phone, code) =>
    api('/auth/otp/verify', { method: 'POST', body: { phone, code } }),
  google: (idToken) => api('/auth/google', { method: 'POST', body: { idToken } }),
  me: () => api('/auth/me', { auth: true }),
  update: (payload) => api('/auth/me', { method: 'PATCH', body: payload, auth: true }),
  addAddress: (payload) =>
    api('/auth/me/addresses', { method: 'POST', body: payload, auth: true }),
  updateAddress: (addressId, payload) =>
    api(`/auth/me/addresses/${encodeURIComponent(addressId)}`, {
      method: 'PATCH',
      body: payload,
      auth: true,
    }),
  deleteAddress: (addressId) =>
    api(`/auth/me/addresses/${encodeURIComponent(addressId)}`, {
      method: 'DELETE',
      auth: true,
    }),
  setDefaultAddress: (addressId) =>
    api(`/auth/me/addresses/${encodeURIComponent(addressId)}/default`, {
      method: 'POST',
      auth: true,
    }),
};

export const cartApi = {
  get: () => api('/cart', { auth: true }),
  add: (variantId, quantity = 1) =>
    api('/cart/items', { method: 'POST', body: { variantId, quantity }, auth: true }),
  update: (itemId, quantity) =>
    api(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity }, auth: true }),
  remove: (itemId) => api(`/cart/items/${itemId}`, { method: 'DELETE', auth: true }),
  clear: () => api('/cart', { method: 'DELETE', auth: true }),
};

export const wishlistApi = {
  get: () => api('/wishlist', { auth: true }),
  add: (productId) =>
    api('/wishlist/items', { method: 'POST', body: { productId }, auth: true }),
  remove: (productId) =>
    api(`/wishlist/items/${encodeURIComponent(productId)}`, { method: 'DELETE', auth: true }),
  clear: () => api('/wishlist', { method: 'DELETE', auth: true }),
};

export const orderApi = {
  checkout: (payload) => api('/checkout', { method: 'POST', body: payload, auth: true }),
  verifyPayment: (payload) =>
    api('/payments/verify', { method: 'POST', body: payload, auth: true }),
  mockPay: (orderId) => api(`/payments/mock-pay/${orderId}`, { method: 'POST', auth: true }),
  list: () => api('/orders', { auth: true }),
  get: (orderId) => api(`/orders/${encodeURIComponent(orderId)}`, { auth: true }),
};
