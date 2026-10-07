const express = require('express');
const { protect, authorizePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const ecomWeb = require('../services/ecomWebClient');

const router = express.Router();

router.get('/', protect, authorizePermission(PERMISSIONS.ORDER_READ), async (req, res) => {
  const items = await ecomWeb.get('/admin/orders');
  res.json({ items });
});

router.patch(
  '/:orderId/status',
  protect,
  authorizePermission(PERMISSIONS.ORDER_UPDATE),
  async (req, res) => {
    const order = await ecomWeb.patch(`/admin/orders/${req.params.orderId}`, {
      status: req.body.status,
    });
    res.json(order);
  }
);

module.exports = router;
