const express = require('express');
const { protect, authorizePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const ecomWeb = require('../services/ecomWebClient');

const router = express.Router();

const forwardQuery = (query) => {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

router.get('/', protect, authorizePermission(PERMISSIONS.PRODUCT_READ), async (req, res) => {
  const data = await ecomWeb.get(`/admin/products${forwardQuery(req.query)}`);
  // Support both paginated `{ items, total }` and legacy array responses
  if (Array.isArray(data)) {
    return res.json({ items: data, page: 1, limit: data.length, total: data.length, totalPages: 1 });
  }
  res.json(data);
});

router.get('/:id', protect, authorizePermission(PERMISSIONS.PRODUCT_READ), async (req, res) => {
  const product = await ecomWeb.get(`/admin/products/${req.params.id}`);
  res.json(product);
});

router.post('/', protect, authorizePermission(PERMISSIONS.PRODUCT_CREATE), async (req, res) => {
  const product = await ecomWeb.post('/admin/products', req.body);
  res.status(201).json(product);
});

router.post('/:id/duplicate', protect, authorizePermission(PERMISSIONS.PRODUCT_CREATE), async (req, res) => {
  const product = await ecomWeb.post(`/admin/products/${req.params.id}/duplicate`, {});
  res.status(201).json(product);
});

router.patch('/:id', protect, authorizePermission(PERMISSIONS.PRODUCT_UPDATE), async (req, res) => {
  const product = await ecomWeb.patch(`/admin/products/${req.params.id}`, req.body);
  res.json(product);
});

router.patch('/:id/status', protect, authorizePermission(PERMISSIONS.PRODUCT_UPDATE), async (req, res) => {
  const product = await ecomWeb.patch(`/admin/products/${req.params.id}/status`, req.body);
  res.json(product);
});

router.patch('/:id/visibility', protect, authorizePermission(PERMISSIONS.PRODUCT_UPDATE), async (req, res) => {
  const product = await ecomWeb.patch(`/admin/products/${req.params.id}/visibility`, req.body);
  res.json(product);
});

router.patch('/:id/featured', protect, authorizePermission(PERMISSIONS.PRODUCT_UPDATE), async (req, res) => {
  const product = await ecomWeb.patch(`/admin/products/${req.params.id}/featured`, req.body);
  res.json(product);
});

router.delete('/:id', protect, authorizePermission(PERMISSIONS.PRODUCT_DELETE), async (req, res) => {
  const product = await ecomWeb.delete(`/admin/products/${req.params.id}`);
  res.json(product);
});

module.exports = router;
