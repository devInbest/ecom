const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');
const { PERMISSIONS, hasPermission, ROLES } = require('../config/permissions');

const authorizeProductWrite = (req, res, next) => {
  const role = req.auth?.role;
  if (role === ROLES.SUPERADMIN || role === ROLES.SUPER_ADMIN) return next();
  if (
    hasPermission(role, PERMISSIONS.PRODUCT_CREATE) ||
    hasPermission(role, PERMISSIONS.PRODUCT_UPDATE)
  ) {
    return next();
  }
  return res.status(403).json({ error: { message: 'Insufficient permissions' } });
};

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  },
});

const getServiceConfig = () => {
  const baseURL = (process.env.ECOM_WEB_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
  const secret = process.env.ECOM_WEB_JWT_SECRET;
  const adminUserId = process.env.ECOM_WEB_ADMIN_USER_ID;
  if (!secret || !adminUserId) {
    const error = new Error('Store API is not configured');
    error.statusCode = 503;
    throw error;
  }
  return { baseURL, secret, adminUserId };
};

const getServiceToken = () => {
  const { secret, adminUserId } = getServiceConfig();
  return jwt.sign({ sub: adminUserId, role: 'ADMIN' }, secret, { expiresIn: '30d' });
};

router.post(
  '/',
  protect,
  authorizeProductWrite,
  upload.array('files', 8),
  async (req, res) => {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: { message: 'No image files provided' } });
    }

    const form = new FormData();
    for (const file of files) {
      form.append('files', file.buffer, {
        filename: file.originalname || 'image.jpg',
        contentType: file.mimetype,
      });
    }

    const { baseURL } = getServiceConfig();
    try {
      const response = await axios.post(`${baseURL}/admin/uploads`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${getServiceToken()}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000,
      });
      return res.status(201).json(response.data);
    } catch (err) {
      const status = err.response?.status || 502;
      const message =
        err.response?.data?.message || err.message || 'Upload failed';
      return res.status(status).json({ error: { message } });
    }
  },
);

module.exports = router;
