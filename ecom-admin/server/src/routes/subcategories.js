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

router.get('/', protect, authorizePermission(PERMISSIONS.SUBCATEGORY_READ), async (req, res) => {
  const data = await ecomWeb.get(`/admin/subcategories${forwardQuery(req.query)}`);
  res.json(data);
});

router.get('/:id', protect, authorizePermission(PERMISSIONS.SUBCATEGORY_READ), async (req, res) => {
  const data = await ecomWeb.get(`/admin/subcategories/${req.params.id}`);
  res.json(data);
});

router.post('/', protect, authorizePermission(PERMISSIONS.SUBCATEGORY_CREATE), async (req, res) => {
  const item = await ecomWeb.post('/admin/subcategories', req.body);
  res.status(201).json(item);
});

router.patch('/:id', protect, authorizePermission(PERMISSIONS.SUBCATEGORY_UPDATE), async (req, res) => {
  const item = await ecomWeb.patch(`/admin/subcategories/${req.params.id}`, req.body);
  res.json(item);
});

router.patch('/:id/status', protect, authorizePermission(PERMISSIONS.SUBCATEGORY_UPDATE), async (req, res) => {
  const item = await ecomWeb.patch(`/admin/subcategories/${req.params.id}/status`, req.body);
  res.json(item);
});

router.delete('/:id', protect, authorizePermission(PERMISSIONS.SUBCATEGORY_DELETE), async (req, res) => {
  const item = await ecomWeb.delete(`/admin/subcategories/${req.params.id}`);
  res.json(item);
});

module.exports = router;
