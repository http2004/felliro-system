const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const PHONE_NUMBER_ID = process.env.META_WA_PHONE_NUMBER_ID || '1146512761888812';
const ACCESS_TOKEN = process.env.META_WA_ACCESS_TOKEN || '';
const GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

/**
 * Perform HTTPS Request helper
 */
function apiRequest(endpoint, method = 'GET', data = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_API_BASE}${endpoint}`;
    const parsedUrl = new URL(url);

    const headers = {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'User-Agent': 'FelliRo-WhatsApp-Bot',
      ...customHeaders
    };

    if (data && typeof data === 'object' && !(data instanceof Buffer)) {
      data = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
    }

    const req = https.request(parsedUrl, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
          try {
            const json = JSON.parse(buffer.toString());
            return resolve({ status: res.statusCode, data: json, headers: res.headers });
          } catch (e) {}
        }
        resolve({ status: res.statusCode, buffer, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/**
 * Send a Text Message via Meta Cloud API
 */
async function sendMessage(to, text) {
  try {
    const cleanTo = to.replace(/[^0-9]/g, '');
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: { preview_url: true, body: text }
    };

    const res = await apiRequest(`/${PHONE_NUMBER_ID}/messages`, 'POST', payload);
    if (res.status >= 200 && res.status < 300) {
      console.log(`📤 [Cloud API] Sent message to ${cleanTo}`);
      return { success: true, data: res.data };
    } else {
      console.error(`❌ [Cloud API] Send error (${res.status}):`, res.data);
      return { success: false, error: res.data };
    }
  } catch (err) {
    console.error('❌ [Cloud API] Network error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send an Image via Meta Cloud API
 */
async function sendImage(to, imageUrl, caption = '') {
  try {
    const cleanTo = to.replace(/[^0-9]/g, '');
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'image',
      image: { link: imageUrl, caption }
    };

    const res = await apiRequest(`/${PHONE_NUMBER_ID}/messages`, 'POST', payload);
    return res.status >= 200 && res.status < 300 ? { success: true } : { success: false, error: res.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Download Media (PDF, JPG, PNG) from Meta Cloud API
 * Returns { publicUrl, fileType, fileName, size }
 */
async function downloadMedia(mediaId, orderNumber = 'receipt') {
  try {
    // 1. Get media URL
    const metaRes = await apiRequest(`/${mediaId}`);
    if (!metaRes.data || !metaRes.data.url) {
      throw new Error(`Failed to retrieve media metadata for ID: ${mediaId}`);
    }

    const downloadUrl = metaRes.data.url;
    const mimeType = metaRes.data.mime_type || 'image/jpeg';
    let ext = '.jpg';
    let fileType = 'image';

    if (mimeType.includes('pdf')) {
      ext = '.pdf';
      fileType = 'pdf';
    } else if (mimeType.includes('png')) {
      ext = '.png';
    } else if (mimeType.includes('webp')) {
      ext = '.webp';
    }

    // 2. Fetch binary media
    const binaryRes = await apiRequest(downloadUrl, 'GET', null);
    if (!binaryRes.buffer || binaryRes.buffer.length === 0) {
      throw new Error('Received empty binary buffer from Meta CDN');
    }

    // 3. Save to disk
    const receiptsDir = path.join(__dirname, '../public/uploads/receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    const cleanOrder = (orderNumber || 'order').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `receipt-${cleanOrder}-${Date.now()}${ext}`;
    const filePath = path.join(receiptsDir, fileName);

    fs.writeFileSync(filePath, binaryRes.buffer);
    const publicUrl = `/uploads/receipts/${fileName}`;

    console.log(`✅ [Cloud API] Downloaded & Saved receipt (${binaryRes.buffer.length} bytes): ${publicUrl}`);
    return {
      success: true,
      publicUrl,
      fileType,
      fileName,
      mimeType,
      size: binaryRes.buffer.length
    };
  } catch (err) {
    console.error('❌ [Cloud API] Download media error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendMessage,
  sendImage,
  downloadMedia,
  PHONE_NUMBER_ID
};
