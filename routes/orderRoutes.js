const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Public APIs
router.get('/track/:order_number', orderController.trackOrder);
router.get('/courier-track/:tracking_number', orderController.getCourierTracking);
router.post('/orders', orderController.createOrder);

// Admin / Cashier APIs
router.get('/admin/orders', authenticateToken, authorizeRoles('admin', 'cashier'), orderController.getAdminOrders);
router.put('/admin/orders/:id', authenticateToken, authorizeRoles('admin', 'cashier'), orderController.updateOrder);
router.put('/admin/orders/:id/status', authenticateToken, authorizeRoles('admin', 'cashier'), orderController.updateOrderStatus);
router.post('/admin/orders/:id/verify-receipt', authenticateToken, authorizeRoles('admin', 'cashier'), orderController.verifyReceipt);
router.delete('/admin/orders/:id', authenticateToken, authorizeRoles('admin'), orderController.deleteOrder);
router.get('/admin/orders/:id/invoice', authenticateToken, authorizeRoles('admin', 'cashier'), orderController.getOrderInvoice);

module.exports = router;
