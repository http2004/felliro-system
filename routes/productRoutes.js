const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public APIs
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductById);

// Admin APIs
router.get('/admin/products', authenticateToken, authorizeRoles('admin', 'cashier'), productController.getAdminProducts);
router.post('/admin/products', authenticateToken, authorizeRoles('admin'), upload.array('photos', 5), productController.createProduct);
router.put('/admin/products/:id', authenticateToken, authorizeRoles('admin'), upload.array('photos', 5), productController.updateProduct);
router.patch('/admin/products/:id/stock', authenticateToken, authorizeRoles('admin', 'cashier'), productController.updateStock);
router.delete('/admin/products/:id', authenticateToken, authorizeRoles('admin'), productController.deleteProduct);

// Category Management APIs
router.get('/admin/categories', authenticateToken, authorizeRoles('admin', 'cashier'), productController.getCategories);
router.post('/admin/categories', authenticateToken, authorizeRoles('admin'), productController.createCategory);
router.delete('/admin/categories/:id', authenticateToken, authorizeRoles('admin'), productController.deleteCategory);

module.exports = router;
