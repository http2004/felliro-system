const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/admin/dashboard/stats', authenticateToken, authorizeRoles('admin', 'cashier'), dashboardController.getStats);
router.get('/admin/dashboard/charts', authenticateToken, authorizeRoles('admin', 'cashier'), dashboardController.getChartsData);
router.get('/admin/reports', authenticateToken, authorizeRoles('admin', 'cashier'), dashboardController.getReportsData);

module.exports = router;
