const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/admin/returns', authenticateToken, authorizeRoles('admin', 'cashier'), returnController.getReturns);
router.post('/admin/returns', authenticateToken, authorizeRoles('admin', 'cashier'), returnController.createReturn);
router.delete('/admin/returns/:id', authenticateToken, authorizeRoles('admin'), returnController.deleteReturn);

module.exports = router;
