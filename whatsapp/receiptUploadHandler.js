const fs = require('fs');
const path = require('path');

const receiptsDir = path.join(__dirname, '../public/uploads/receipts');

// Ensure receipts directory exists
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

/**
 * Save receipt media from WhatsApp message
 * @param {object} media - MessageMedia from whatsapp-web.js
 * @param {string} orderNumber - Order number for filename
 * @returns {{ filePath: string, publicUrl: string, fileType: string }}
 */
async function saveReceiptMedia(media, orderNumber) {
  try {
    const timestamp = Date.now();
    const mimeType = (media.mimetype || '').toLowerCase();
    
    let ext = 'jpg';
    if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (media.filename && media.filename.includes('.')) {
      ext = media.filename.split('.').pop().toLowerCase();
    }

    const fileName = `receipt-${orderNumber}-${timestamp}.${ext}`;
    const filePath = path.join(receiptsDir, fileName);
    const publicUrl = `/uploads/receipts/${fileName}`;

    // Decode base64 and save
    const buffer = Buffer.from(media.data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const fileType = ext === 'pdf' ? 'pdf' : 'image';

    return { filePath, publicUrl, fileType, fileName };
  } catch (err) {
    console.error('❌ Error saving receipt:', err);
    throw err;
  }
}

/**
 * Save receipt from file path (for re-use)
 */
function getReceiptPublicUrl(fileName) {
  return `/uploads/receipts/${fileName}`;
}

module.exports = { saveReceiptMedia, getReceiptPublicUrl };
