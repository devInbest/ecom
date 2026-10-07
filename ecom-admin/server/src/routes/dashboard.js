const express = require('express');
const { protect, authorizePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const ecomWeb = require('../services/ecomWebClient');

const router = express.Router();

router.get('/stats', protect, authorizePermission(PERMISSIONS.ANALYTICS_READ), async (req, res) => {
  const data = await ecomWeb.get('/admin/stats');
  res.json({
    stats: data.stats,
    message: 'Live metrics from the NONSENSE storefront API.',
  });
});

module.exports = router;
