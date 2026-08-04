const express = require('express');
const router = express.Router();
const regionController = require('../controllers/regionController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Public route for customer checkout region list
router.get('/regions', regionController.getRegions);

// Admin routes to add, update, and delete cities/charges
router.post('/admin/regions', authenticateToken, authorizeRoles('admin', 'cashier'), regionController.createRegion);
router.put('/admin/regions/:id', authenticateToken, authorizeRoles('admin', 'cashier'), regionController.updateRegion);
router.delete('/admin/regions/:id', authenticateToken, authorizeRoles('admin'), regionController.deleteRegion);

module.exports = router;
