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

router.get('/', protect, authorizePermission(PERMISSIONS.CATEGORY_READ), async (req, res) => {
  const data = await ecomWeb.get(`/admin/categories${forwardQuery(req.query)}`);
  res.json(data);
});

router.get('/:id', protect, authorizePermission(PERMISSIONS.CATEGORY_READ), async (req, res) => {
  const data = await ecomWeb.get(`/admin/categories/${req.params.id}`);
  res.json(data);
});

router.post('/', protect, authorizePermission(PERMISSIONS.CATEGORY_CREATE), async (req, res) => {
  const category = await ecomWeb.post('/admin/categories', req.body);
  res.status(201).json(category);
});

router.patch('/:id', protect, authorizePermission(PERMISSIONS.CATEGORY_UPDATE), async (req, res) => {
  const category = await ecomWeb.patch(`/admin/categories/${req.params.id}`, req.body);
  res.json(category);
});

router.patch('/:id/status', protect, authorizePermission(PERMISSIONS.CATEGORY_UPDATE), async (req, res) => {
  const category = await ecomWeb.patch(`/admin/categories/${req.params.id}/status`, req.body);
  res.json(category);
});

router.delete('/:id', protect, authorizePermission(PERMISSIONS.CATEGORY_DELETE), async (req, res) => {
  const category = await ecomWeb.delete(`/admin/categories/${req.params.id}`);
  res.json(category);
});

module.exports = router;
