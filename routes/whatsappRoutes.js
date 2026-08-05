const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const whatsappController = require('../controllers/whatsappController');
const multer = require('multer');
const path = require('path');

// Multer for admin file sending
const adminUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const fs = require('fs');
const os = require('os');

// Multer for receipt uploads
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseDir = process.env.VERCEL ? os.tmpdir() : path.join(__dirname, '../public/uploads');
    const dir = path.join(baseDir, 'receipts');
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const orderRef = (req.body.orderNumber || 'order').replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `receipt-${orderRef}-${Date.now()}${ext}`);
  }
});
const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// ── Public ──
router.get('/whatsapp/status', whatsappController.getStatus);
router.post('/whatsapp/public-upload-receipt', receiptUpload.single('receipt'), whatsappController.publicUploadReceipt);

// ── Meta Cloud API Webhook ──
router.get('/whatsapp/webhook', whatsappController.verifyWebhook);
router.post('/whatsapp/webhook', whatsappController.handleWebhook);
router.get('/webhook', whatsappController.verifyWebhook);
router.post('/webhook', whatsappController.handleWebhook);

// ── Admin Protected ──
router.get('/whatsapp/qr', authenticateToken, whatsappController.getQrCode);
router.post('/whatsapp/toggle-bot', authenticateToken, whatsappController.toggleBot);
router.post('/whatsapp/restart', authenticateToken, whatsappController.restartBot);
router.post('/admin/whatsapp/restart', authenticateToken, whatsappController.restartBot);
router.get('/whatsapp/restart', authenticateToken, whatsappController.restartBot);

// Chat management
router.get('/whatsapp/chats', authenticateToken, whatsappController.getAllChats);
router.get('/whatsapp/chats/:phone', authenticateToken, whatsappController.getChatHistory);
router.post('/whatsapp/chats/:phone/assign-human', authenticateToken, whatsappController.assignToHuman);
router.post('/whatsapp/chats/:phone/assign-bot', authenticateToken, whatsappController.assignToBot);
router.post('/whatsapp/chats/:phone/reset', authenticateToken, whatsappController.resetChat);
router.delete('/whatsapp/chats/:phone', authenticateToken, whatsappController.deleteChat);
router.post('/whatsapp/chats/clear-all', authenticateToken, whatsappController.clearAllChats);
router.post('/whatsapp/chats/:phone/send', authenticateToken, adminUpload.single('file'), whatsappController.sendAdminMessage);

// AI 1-Click Order Extraction
router.post('/whatsapp/ai-extract-order', authenticateToken, whatsappController.aiExtractOrder);
router.post('/whatsapp/chats/:phone/ai-extract-order', authenticateToken, whatsappController.aiExtractOrder);

// Receipt
router.get('/whatsapp/receipts/:orderId', authenticateToken, whatsappController.getOrderReceipt);
router.post('/whatsapp/receipts/:orderId/upload', authenticateToken, receiptUpload.single('receipt'), whatsappController.adminUploadReceipt);

module.exports = router;
