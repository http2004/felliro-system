/**
 * FelliRo WhatsApp Bot Service (Powered by @whiskeysockets/baileys)
 * ─────────────────────────────────────────────────────────────
 * • Direct WebSocket connection — Ultra-fast, lightweight & reliable
 * • Message Deduplication & Concurrency Guard (No repeat messages)
 * • Instant WhatsApp Typing Status Indicator ('composing')
 * • In-Memory TTL Caching for Products, Variants, Categories & Delivery Regions
 * • AI-Driven Fashion Consultant (ශාශා - Shasha) via Google Gemini
 * • Fluent in Sinhala, Singlish, English, and Tamil
 * • Structured 5-Step Shopping Flow:
 *     1. 3-Language Welcome & Active Categories List
 *     2. Category Selection -> Photos & Item Showcase
 *     3. Item Selection -> Color, Size, Qty configuration
 *     4. Add to Cart -> "Anything else or Bill?"
 *     5. Checkout -> Delivery Details -> Commercial Bank Transfer -> Slip Linkage
 * • Accurate Variant-ID Stock Deduction (Size & Color specific)
 * • Real-Time Order Tracking & Returns Support
 * • Automatic Customer Receipt Attachment & PDF Invoice Delivery
 * • Seamless socket.io updates for Admin Panel & POS
 * ─────────────────────────────────────────────────────────────
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const stateManager = require('./conversationState');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
require('dotenv').config();

// ─────────────────────────────────────────────
// Gemini AI Setup (Preserves user's configured model)
// ─────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDummy';
const genAI = new GoogleGenerativeAI(apiKey);
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';
const model = genAI.getGenerativeModel({ model: modelName });

console.log(`🤖 AI Engine configured with model: ${modelName}`);

// ─────────────────────────────────────────────
// Global Bot State & Caching
// ─────────────────────────────────────────────
let sock = null;
let qrCodeDataUrl = null;
let botReady = false;
let io = null;
const AUTH_DIR = path.join(__dirname, '../.baileys_auth');

// Message Deduplication Cache (msgId -> timestamp)
const processedMessageIds = new Map();

function isDuplicateMessage(msgId) {
  if (!msgId) return false;
  const now = Date.now();
  for (const [id, timestamp] of processedMessageIds.entries()) {
    if (now - timestamp > 3 * 60 * 1000) {
      processedMessageIds.delete(id);
    }
  }
  if (processedMessageIds.has(msgId)) {
    return true;
  }
  processedMessageIds.set(msgId, now);
  return false;
}

// In-Memory Catalog, Categories & Regions Cache (TTL: 60s)
let cacheCatalog = null;
let cacheTime = 0;
const CATALOG_TTL_MS = 60 * 1000;

async function getCachedCatalog() {
  const now = Date.now();
  if (cacheCatalog && (now - cacheTime < CATALOG_TTL_MS)) {
    return cacheCatalog;
  }
  try {
    const [categories] = await db.query(
      `SELECT id, name, description FROM categories ORDER BY id ASC`
    );

    const [products] = await db.query(
      `SELECT p.id, p.name, p.price, p.description, p.quantity, p.category_id, c.name as category,
              (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.status = 'active'
       ORDER BY p.category_id ASC, p.id ASC`
    );

    let variants = [];
    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      const [varRows] = await db.query(
        `SELECT product_id, size, color, quantity FROM product_variants WHERE quantity > 0 AND product_id IN (?)`,
        [productIds]
      );
      variants = varRows;
    }

    const [regions] = await db.query(
      `SELECT name, province, delivery_charge FROM regions WHERE is_active = TRUE ORDER BY name ASC`
    );

    cacheCatalog = { categories, products, variants, regions };
    cacheTime = now;
    return cacheCatalog;
  } catch (err) {
    console.error('Error fetching cached catalog:', err);
    return cacheCatalog || { categories: [], products: [], variants: [], regions: [] };
  }
}

// ─────────────────────────────────────────────
// Helper: Calculate Delivery Fee by City/Province
// ─────────────────────────────────────────────
function calculateDeliveryFee(cityName, provinceName, regions = []) {
  if (!cityName && !provinceName) return 450;
  const cleanCity = (cityName || '').trim().toLowerCase();
  const cleanProv = (provinceName || '').trim().toLowerCase();

  // 1. Direct match on city / region name
  if (cleanCity) {
    const matchedByCity = regions.find(r =>
      cleanCity.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(cleanCity)
    );
    if (matchedByCity) return parseFloat(matchedByCity.delivery_charge) || 450;
  }

  // 2. Match by province
  if (cleanProv) {
    const matchedByProv = regions.find(r =>
      cleanProv.includes(r.province.toLowerCase()) || r.province.toLowerCase().includes(cleanProv)
    );
    if (matchedByProv) return parseFloat(matchedByProv.delivery_charge) || 450;
  }

  return 450;
}

// ─────────────────────────────────────────────
// Helper: Format Phone / JID for WhatsApp
// ─────────────────────────────────────────────
function formatJid(phoneOrJid) {
  if (!phoneOrJid) return '';
  const str = String(phoneOrJid).trim();
  if (str.includes('@')) return str;
  const clean = str.replace(/[^0-9]/g, '');
  if (clean.length > 12) {
    return `${clean}@lid`;
  }
  if (clean.startsWith('0') && clean.length === 10) {
    return `94${clean.substring(1)}@s.whatsapp.net`;
  }
  if (clean.length === 9 && !clean.startsWith('94')) {
    return `94${clean}@s.whatsapp.net`;
  }
  return `${clean}@s.whatsapp.net`;
}

// ─────────────────────────────────────────────
// Helper: WhatsApp Presence State (Composing / Typing)
// ─────────────────────────────────────────────
async function setTypingPresence(jid, state = 'composing') {
  if (!botReady || !sock || !jid) return;
  try {
    const targetJid = formatJid(jid);
    await sock.sendPresenceUpdate(state, targetJid);
  } catch (e) {
    // Ignore presence update errors
  }
}

// Helper: Clean corrupted or logged-out auth directory
function cleanAuthDirectory() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    console.log('🧹 Cleaned .baileys_auth session folder.');
  } catch (e) {
    console.warn('⚠️ Auth dir clean error:', e.message);
  }
}

// ─────────────────────────────────────────────
// Initialize Baileys WhatsApp Client
// ─────────────────────────────────────────────
async function initBot(socketIo) {
  if (socketIo) io = socketIo;

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307], isLatest: true }));

  console.log(`🤖 Initializing WhatsApp Baileys Bot (v${version.join('.')}, isLatest: ${isLatest})...`);

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['FelliRo Boutique', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 WhatsApp QR Code generated. Scan with WhatsApp Linked Devices.');
      try {
        qrCodeDataUrl = await qrcode.toDataURL(qr);
        if (io) io.emit('wa_qr', { qr: qrCodeDataUrl });
      } catch (err) {
        console.error('QR toDataURL error:', err);
      }
    }

    if (connection === 'close') {
      botReady = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
      console.warn(`⚠️ WhatsApp connection closed (Status: ${statusCode}). Logged out: ${isLoggedOut}`);

      if (io) io.emit('wa_status', { status: 'disconnected', logged_out: isLoggedOut });

      if (isLoggedOut) {
        console.log('🔒 Logged out from WhatsApp. Automatically clearing session and generating new QR code...');
        cleanAuthDirectory();
        qrCodeDataUrl = null;
        setTimeout(() => initBot(io), 1500);
      } else {
        setTimeout(() => initBot(io), 3000);
      }
    } else if (connection === 'open') {
      botReady = true;
      qrCodeDataUrl = null;
      console.log('✅ WhatsApp Baileys Bot is connected & ready!');
      if (io) io.emit('wa_status', { status: 'connected' });
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      await handleIncomingBaileysMessage(msg);
    }
  });
}

// ─────────────────────────────────────────────
// Force Restart WhatsApp Bot & Clear Session
// ─────────────────────────────────────────────
async function restartBot() {
  console.log('🔄 Force restarting WhatsApp Bot & resetting session credentials...');
  botReady = false;
  qrCodeDataUrl = null;

  if (sock) {
    try {
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('creds.update');
      sock.ev.removeAllListeners('messages.upsert');
      sock.end(new Error('Manual bot restart requested'));
    } catch (e) {
      console.warn('Socket termination note:', e.message);
    }
    sock = null;
  }

  cleanAuthDirectory();

  if (io) {
    io.emit('wa_status', { status: 'disconnected' });
    io.emit('wa_qr', { qr: null });
  }

  setTimeout(() => {
    initBot(io);
  }, 1000);

  return { success: true, message: 'WhatsApp session reset. Generating fresh QR code...' };
}

// ─────────────────────────────────────────────
// Extract clean text from any Baileys message
// ─────────────────────────────────────────────
function extractMessageText(msg) {
  if (!msg.message) return '';
  return (
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.documentMessage?.caption ||
    msg.message.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    msg.message.videoMessage?.caption ||
    ''
  ).trim();
}

// ─────────────────────────────────────────────
// Extract quoted message text from contextInfo
// ─────────────────────────────────────────────
function extractQuotedMessage(msg) {
  if (!msg.message) return null;
  const contextInfo =
    msg.message.extendedTextMessage?.contextInfo ||
    msg.message.imageMessage?.contextInfo ||
    msg.message.documentMessage?.contextInfo ||
    msg.message.documentWithCaptionMessage?.message?.documentMessage?.contextInfo ||
    msg.message.videoMessage?.contextInfo ||
    msg.message.audioMessage?.contextInfo;

  if (!contextInfo || !contextInfo.quotedMessage) return null;

  const q = contextInfo.quotedMessage;
  const quotedText = (
    q.conversation ||
    q.extendedTextMessage?.text ||
    q.imageMessage?.caption ||
    q.documentMessage?.caption ||
    q.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    q.videoMessage?.caption ||
    (q.audioMessage ? 'Voice Note / Audio' : '') ||
    (q.imageMessage ? 'Photo' : '') ||
    ''
  ).trim();

  return quotedText || null;
}

// ─────────────────────────────────────────────
// Universal Baileys Media Downloader & Saver
// ─────────────────────────────────────────────
async function downloadAndSaveMedia(msg, phone) {
  try {
    const rawMsg = msg.message?.documentMessage ||
      msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
      msg.message?.imageMessage ||
      msg.message?.audioMessage ||
      msg.message?.videoMessage ||
      msg.message?.stickerMessage || {};

    const mType = Object.keys(msg.message || {})[0];
    const mime = rawMsg.mimetype || '';
    const origFilename = rawMsg.fileName || '';
    const isPtt = rawMsg.ptt === true;

    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { logger: pino({ level: 'silent' }), reuploadRequest: sock?.updateMediaMessage }
    );

    if (!buffer || buffer.length === 0) return null;

    let ext = '.bin';
    let fileType = 'document';

    if (mType === 'imageMessage' || mime.startsWith('image/')) {
      fileType = 'image';
      ext = mime.includes('png') ? '.png' : (mime.includes('webp') ? '.webp' : '.jpg');
    } else if (mType === 'audioMessage' || mime.startsWith('audio/')) {
      fileType = 'audio';
      ext = mime.includes('ogg') ? '.ogg' : (mime.includes('mp4') ? '.m4a' : '.mp3');
    } else if (mType === 'videoMessage' || mime.startsWith('video/')) {
      fileType = 'video';
      ext = '.mp4';
    } else if (mType === 'stickerMessage') {
      fileType = 'image';
      ext = '.webp';
    } else if (mime.includes('pdf') || origFilename.toLowerCase().endsWith('.pdf')) {
      fileType = 'pdf';
      ext = '.pdf';
    } else {
      fileType = 'document';
      if (origFilename.includes('.')) {
        ext = '.' + origFilename.split('.').pop().toLowerCase();
      } else {
        ext = '.doc';
      }
    }

    const mediaDir = path.join(__dirname, '../public/uploads/whatsapp_media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    const cleanPhone = (phone || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `media-${cleanPhone}-${Date.now()}${ext}`;
    const filePath = path.join(mediaDir, filename);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/whatsapp_media/${filename}`;

    console.log(`📎 [Baileys] Media saved (${fileType}, ${mime}): ${publicUrl} (${buffer.length} bytes)`);

    return {
      publicUrl,
      fileType,
      filename,
      origFilename: origFilename || filename,
      mime,
      isPtt
    };
  } catch (err) {
    console.error('❌ Error downloading Baileys media:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Main Baileys Incoming Message Handler
// ─────────────────────────────────────────────
async function handleIncomingBaileysMessage(msg) {
  try {
    if (!msg.key || msg.key.fromMe) return;
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') return;

    // Deduplication check: Prevent duplicate processing on network retries
    const msgId = msg.key.id;
    if (isDuplicateMessage(msgId)) {
      console.log(`⏩ [Deduplication] Skipped duplicate message ID: ${msgId}`);
      return;
    }

    const phone = (msg.key.participant || remoteJid).replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    const textBody = extractMessageText(msg);
    const quotedText = extractQuotedMessage(msg);

    const mType = Object.keys(msg.message || {})[0];
    const isMedia = ['imageMessage', 'documentMessage', 'documentWithCaptionMessage', 'audioMessage', 'videoMessage', 'stickerMessage'].includes(mType);

    let mediaData = null;
    if (isMedia) {
      mediaData = await downloadAndSaveMedia(msg, phone);
    }

    let displayMessage = textBody;
    if (!displayMessage && mediaData) {
      if (mediaData.fileType === 'audio') displayMessage = mediaData.isPtt ? '🎙️ Voice Message' : '🎵 Audio Clip';
      else if (mediaData.fileType === 'image') displayMessage = '📷 Photo';
      else if (mediaData.fileType === 'pdf') displayMessage = `📄 Document: ${mediaData.origFilename}`;
      else if (mediaData.fileType === 'document') displayMessage = `📁 File: ${mediaData.origFilename}`;
      else if (mediaData.fileType === 'video') displayMessage = '🎥 Video Clip';
    }

    console.log(`📩 Incoming [${mType}] from ${phone} (${remoteJid}): "${(displayMessage || '').substring(0, 60)}"`);

    // Save Chat Log to DB
    await saveChatLog(
      phone,
      'incoming',
      displayMessage,
      mediaData ? mediaData.publicUrl : null,
      mediaData ? mediaData.fileType : null,
      'customer'
    );

    // Broadcast Real-time event to Admin Panel
    if (io) {
      io.emit('new_customer_message', {
        phone,
        message: displayMessage,
        quotedText: quotedText || null,
        mediaUrl: mediaData ? mediaData.publicUrl : null,
        mediaType: mediaData ? mediaData.fileType : null,
        timestamp: new Date().toISOString(),
        hasMedia: !!mediaData
      });
    }

    // Global toggle check
    const botEnabled = await isBotGloballyEnabled();
    if (!botEnabled) return;

    // Human handoff check
    if (stateManager.isHumanHandoff(phone)) return;

    // Trigger Typing Status instantly
    await setTypingPresence(remoteJid, 'composing');

    // Handle Order / Payment Receipt Linkage
    const conv = stateManager.getConversation(phone);
    const isReceiptCandidate = mediaData && (mediaData.fileType === 'image' || mediaData.fileType === 'pdf');
    let isOrderFlow = conv.orderId || conv.cart.length > 0 || conv.state === stateManager.STATES.AWAITING_RECEIPT || conv.state === stateManager.STATES.CONFIRMING_ORDER;

    // If receipt candidate is sent, check DB for customer's most recent order if not in memory
    if (isReceiptCandidate && !isOrderFlow) {
      try {
        const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
        const [recent] = await db.query(
          `SELECT id, order_number, order_status FROM orders 
           WHERE (whatsapp_id = ? OR whatsapp_id LIKE ? OR customer_phone LIKE ? OR customer_phone = ?)
           ORDER BY id DESC LIMIT 1`,
          [remoteJid, `%${cleanPhone.slice(-9)}%`, `%${cleanPhone.slice(-9)}%`, phone]
        );
        if (recent.length > 0) {
          isOrderFlow = true;
          conv.orderId = recent[0].id;
          conv.orderNumber = recent[0].order_number;
        }
      } catch (dbErr) {
        console.error('Error looking up recent order for receipt:', dbErr);
      }
    }

    if (isReceiptCandidate && isOrderFlow) {
      console.log(`📸 Attaching payment receipt from ${phone} to Order #${conv.orderNumber || 'new'}...`);
      await linkReceiptToOrder(remoteJid, phone, mediaData, textBody);
      return;
    }

    // If customer sent voice message
    if (mediaData && mediaData.fileType === 'audio') {
      await sendMessage(
        remoteJid || phone,
        `🎙️ සමාවෙන්න, මට Voice Messages තේරුම් ගැනීමට අපහසුයි. 🥺\nකරුණාකර ඔබට අවශ්‍ය දේ Text Message එකක් ලෙස එවන්න. මම ඔබට ඉක්මනින්ම උදව් කරන්නම්! 💕\n\n_(Please send your inquiry as a text message so I can assist you right away!)_`
      );
      return;
    }

    // Normal text message (or media with caption) -> Process with Gemini AI in ONE single response
    if (textBody || mediaData) {
      const userText = textBody || 'Hello';
      const messageWithContext = quotedText
        ? `[Customer replied to previous message: "${quotedText}"]\n${userText}`
        : userText;

      stateManager.addMessageToHistory(phone, 'customer', messageWithContext);
      await processUserMessage(remoteJid, phone, messageWithContext, conv);
    }
  } catch (err) {
    console.error('❌ Error handling incoming message:', err);
  }
}

// ─────────────────────────────────────────────
// Link Receipt to Order & DB (Auto-reactivates cancelled orders to pending)
// ─────────────────────────────────────────────
async function linkReceiptToOrder(remoteJid, phone, mediaData, caption) {
  try {
    const conv = stateManager.getConversation(phone);
    let orderId = conv.orderId;
    let orderNumber = conv.orderNumber;

    if (!orderId) {
      // Look up DB for recent order before attempting to create new
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      const [recentOrders] = await db.query(
        `SELECT id, order_number, order_status FROM orders 
         WHERE (whatsapp_id = ? OR whatsapp_id LIKE ? OR customer_phone LIKE ? OR customer_phone = ?)
         ORDER BY id DESC LIMIT 1`,
        [remoteJid, `%${cleanPhone.slice(-9)}%`, `%${cleanPhone.slice(-9)}%`, phone]
      );
      if (recentOrders.length > 0 && (conv.cart.length === 0 || recentOrders[0].order_status === 'cancelled' || recentOrders[0].order_status === 'pending')) {
        orderId = recentOrders[0].id;
        orderNumber = recentOrders[0].order_number;
        conv.orderId = orderId;
        conv.orderNumber = orderNumber;
      }
    }

    if (!orderId) {
      const orderRes = await createOrderFromBot(remoteJid, phone);
      if (orderRes.success) {
        orderId = orderRes.orderId;
        orderNumber = orderRes.orderNumber;
        conv.orderId = orderId;
        conv.orderNumber = orderNumber;
      }
    }

    if (orderId) {
      const [orderRows] = await db.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
      if (orderRows.length > 0) {
        const currentOrder = orderRows[0];
        orderNumber = currentOrder.order_number;
        const wasCancelled = (currentOrder.order_status === 'cancelled');

        // 1. Insert receipt entry
        await db.query(
          `INSERT INTO order_receipts (order_id, file_path, file_type, uploaded_via) VALUES (?, ?, ?, 'whatsapp_baileys')`,
          [orderId, mediaData.publicUrl, mediaData.fileType]
        ).catch((err) => console.warn('order_receipts insert error:', err.message));

        // 2. Reactivate order if it was cancelled
        if (wasCancelled) {
          await db.query(
            `UPDATE orders 
             SET order_status = 'pending', 
                 payment_status = 'pending', 
                 receipt_url = ?, 
                 whatsapp_id = ?, 
                 updated_at = NOW() 
             WHERE id = ?`,
            [mediaData.publicUrl, remoteJid, orderId]
          );

          await db.query(
            `INSERT INTO order_status_history (order_id, status, note, updated_by)
             VALUES (?, 'pending', 'Customer re-submitted payment receipt via WhatsApp after cancellation - Order reactivated to Pending', 1)`,
            [orderId]
          ).catch(() => {});

          // Re-deduct product and variant stock because stock was returned when order was cancelled
          const [items] = await db.query(
            `SELECT product_id, quantity, size, color FROM order_items WHERE order_id = ?`,
            [orderId]
          );

          for (const item of items) {
            const qty = parseInt(item.quantity) || 1;
            // Deduct main stock & increase total_sold
            await db.query(
              `UPDATE products SET quantity = GREATEST(0, quantity - ?), total_sold = total_sold + ? WHERE id = ?`,
              [qty, qty, item.product_id]
            ).catch(e => console.warn('Stock deduct error:', e.message));

            // Deduct variant stock
            if (item.size && item.color && item.size !== '-' && item.color !== '-') {
              await db.query(
                `UPDATE product_variants 
                 SET quantity = GREATEST(0, quantity - ?) 
                 WHERE product_id = ? AND size = ? AND color = ?
                 LIMIT 1`,
                [qty, item.product_id, item.size, item.color]
              ).catch(() => {});
            } else if (item.size && item.size !== '-') {
              await db.query(
                `UPDATE product_variants 
                 SET quantity = GREATEST(0, quantity - ?) 
                 WHERE product_id = ? AND size = ?
                 LIMIT 1`,
                [qty, item.product_id, item.size]
              ).catch(() => {});
            } else if (item.color && item.color !== '-') {
              await db.query(
                `UPDATE product_variants 
                 SET quantity = GREATEST(0, quantity - ?) 
                 WHERE product_id = ? AND color = ?
                 LIMIT 1`,
                [qty, item.product_id, item.color]
              ).catch(() => {});
            }

            // Inventory Log
            await db.query(
              `INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, reference_id, note, created_by, created_at)
               VALUES (?, 0, ?, 'sale', ?, ?, 1, NOW())`,
              [item.product_id, qty, orderId, `Stock re-deducted for reactivated Order #${orderNumber}`]
            ).catch(() => {});
          }

          cacheCatalog = null; // Invalidate cache catalog so bot has updated stock
          console.log(`🔄 [BaileysBot] Reactivated cancelled Order #${orderNumber} (ID: ${orderId}) back to pending status.`);
        } else {
          await db.query(
            `UPDATE orders 
             SET receipt_url = ?, 
                 whatsapp_id = ?, 
                 payment_status = 'pending', 
                 updated_at = NOW() 
             WHERE id = ?`,
            [mediaData.publicUrl, remoteJid, orderId]
          );
        }

        // Emit real-time updates
        if (io) {
          io.emit('order_status_updated', {
            orderId,
            order_number: orderNumber,
            order_status: 'pending',
            payment_status: 'pending',
            receipt_url: mediaData.publicUrl
          });
          io.emit('new_order_receipt', {
            orderId,
            orderNumber,
            receiptUrl: mediaData.publicUrl,
            fileType: mediaData.fileType,
            customerPhone: phone,
            reactivated: wasCancelled
          });
        }
      }
    }

    stateManager.setState(phone, stateManager.STATES.RECEIPT_SUBMITTED);

    const receiptAck = `🌸 *Payment Receipt Received!* 🌸\n\nඔබගේ බැංකු ගෙවීම් රිසිට්පත Order *#${orderNumber || 'your order'}* වෙත සාර්ථකව සම්බන්ධ කරන ලදී. 💖\n\nඅපගේ කණ්ඩායම විසින් ගෙවීම් තහවුරු කළ පසු, ඔබගේ ඇසුරුම *Fardar Express* කුරියර් සේවාව මඟින් කඩිනමින් එවනු ඇත. 🚚✨\n\n📄 ඕනෑම වේලාවක ඔබේ Order එකේ තත්ත්වය මෙතැනින් පරීක්ෂා කළ හැක:\n🔗 https://felliro.lk/tracking\n\n_Thank you for choosing FelliRo!_ 💕`;

    await sendMessage(remoteJid || phone, receiptAck);
    stateManager.addMessageToHistory(phone, 'assistant', receiptAck);
  } catch (err) {
    console.error('❌ Failed to link receipt to order:', err);
  }
}

// ─────────────────────────────────────────────
// Build AI System Prompt with Exact 5-Step Sales Flow
// ─────────────────────────────────────────────
async function buildSystemPrompt(phone, conv, userMessage) {
  const { categories, products, variants, regions } = await getCachedCatalog();

  // 1. Format Active Categories List
  let categoriesFormatted = '';
  if (categories.length > 0) {
    categoriesFormatted = categories.map((c, idx) => {
      const prodsInCat = products.filter(p => p.category_id === c.id && p.quantity > 0);
      return `${idx + 1}️⃣ *${c.name}* (${prodsInCat.length} designs available)`;
    }).join('\n');
  } else {
    categoriesFormatted = '1️⃣ Crop Top\n2️⃣ Coart\n3️⃣ Frock\n4️⃣ Full Kit\n5️⃣ Night Dress';
  }

  // 2. Format Available Products with Stock & Variants (Grouped by Category)
  let productsList = '';
  if (products.length > 0) {
    productsList = products.map(p => {
      const prodVariants = variants.filter(v => v.product_id === p.id && v.quantity > 0);
      let stockStr = '';
      if (prodVariants.length > 0) {
        stockStr = prodVariants.map(v => {
          const colorPart = (v.color && v.color !== '-' && v.color.trim() !== '') ? `${v.color.trim()} ` : '';
          const sizePart = (v.size && v.size !== '-' && v.size.trim() !== '') ? `Size: ${v.size.trim()}` : '';
          const variantDesc = [colorPart, sizePart].filter(Boolean).join(' ').trim() || 'Standard';
          return `${variantDesc} (${v.quantity} in stock)`;
        }).join(', ');
      } else {
        stockStr = p.quantity > 0 ? `${p.quantity} in stock` : 'Out of Stock';
      }
      return `• [ID:${p.id}] "${p.name}" (Cat: ${p.category || 'General'}) | Price: Rs. ${parseFloat(p.price).toFixed(2)} | Stock: ${stockStr}`;
    }).join('\n');
  } else {
    productsList = '• Premium dresses and stylish boutique clothing available.';
  }

  // 3. Format Delivery Regions & Charges
  const regionsList = regions.map(r => `• ${r.name} (${r.province}): Rs. ${parseFloat(r.delivery_charge).toFixed(2)}`).join('\n');

  // 4. Dynamic Delivery Fee calculation
  const deliveryFee = calculateDeliveryFee(conv.customerData.city, conv.customerData.province, regions);
  const cartTotal = stateManager.getCartTotal(phone);
  const grandTotal = cartTotal > 0 ? (cartTotal + deliveryFee) : 0;

  // 5. Cart Summary
  const cartSummary = conv.cart.length > 0
    ? conv.cart.map(i => `"${i.name}" (Color: ${i.color || '-'}, Size: ${i.size || '-'}, Qty: ${i.quantity}) - Rs. ${(i.price * i.quantity).toFixed(2)}`).join(', ')
    : 'Empty';

  // 6. Recent Orders Lookup for Live Tracking Inquiries
  let recentOrdersContext = 'No recent orders found.';
  try {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const [orders] = await db.query(
      `SELECT order_number, total_amount, order_status, payment_status, tracking_number, created_at 
       FROM orders 
       WHERE whatsapp_id LIKE ? OR customer_phone LIKE ? 
       ORDER BY id DESC LIMIT 2`,
      [`%${cleanPhone}%`, `%${cleanPhone}%`]
    );
    if (orders.length > 0) {
      recentOrdersContext = orders.map(o => 
        `Order #${o.order_number} | Status: ${o.order_status} | Payment: ${o.payment_status} | Tracking: ${o.tracking_number || 'TRK-Pending'} | Total: Rs. ${parseFloat(o.total_amount).toFixed(2)}`
      ).join('\n');
    }
  } catch(e) {}

  const isFirstInteraction = (!conv.messageHistory || conv.messageHistory.length <= 1);

  return `You are "ශාශා (Shasha)", the friendly, charming, stylish AI fashion consultant for "FelliRo" — Sri Lanka's leading women's clothing boutique.

MANDATORY 5-STEP SALES CONVERSATION FLOW (Follow this strictly):

══════════════════════════════════════════════════════════════════════
STEP 1: NEW CUSTOMER GREETING & CATEGORIES INTRODUCTION (3 LANGUAGES)
══════════════════════════════════════════════════════════════════════
• When a customer first messages or greets (First Contact / "Hi" / "හායි" / "Hello"):
• Greet them warmly with the 3-language welcome header, list our active categories, and ask which category they want to explore:
  "🌸 *Welcome to FelliRo Boutique!* 🌸
  සාදරයෙන් පිළිගනිමු! | அன்புடன் வரவேற்கிறோம்!
  
  මම *ශාශා (Shasha)*, ඔබේ AI Fashion Consultant. 💕
  
  ✨ *අපගේ නවතම විලාසිතා Categories:*
  ${categoriesFormatted}
  
  ඔබට බැලීමට අවශ්‍ය කුමන Category එකද? (නම හෝ අංකය එවන්න) 💕"

══════════════════════════════════════════════════════════════════════
STEP 2: CATEGORY SELECTED -> SHOW PRODUCTS & PHOTOS
══════════════════════════════════════════════════════════════════════
• When customer selects or mentions a category (e.g. "Crop Top" or "1" or "Frock" or "Coart"):
• Introduce the available items in that category with prices, colors and sizes from AVAILABLE PRODUCTS.
• ALWAYS append [ACTION:send_category_photos,category=CategoryName] so high-quality photos of those dresses are sent to their WhatsApp!
• Ask: "මෙහි ඇති කැමති ඇඳුම කුමක්ද? (නම හෝ ID අංකය එවන්න) 💕"

══════════════════════════════════════════════════════════════════════
STEP 3: ITEM SELECTED -> ASK COLOR, SIZE & QUANTITY
══════════════════════════════════════════════════════════════════════
• When customer picks an item (e.g., "Crop Top 22", "Frock 1", or quotes/replies to a product photo):
• Check available colors and sizes in stock for that product from AVAILABLE PRODUCTS.
• Append [ACTION:send_product_photo,product_id=X] if specific photo is needed.
• Ask: "✨ *[Product Name]* සඳහා ඔබ කැමති Color එක (Available Colors: [List of available colors for this item]), Size එක (S / M / L / Free Size), සහ ඔබට අවශ්‍ය ප්‍රමාණය (Quantity) කීයද? 💕"

══════════════════════════════════════════════════════════════════════
STEP 4: VARIANT SPECIFIED -> ADD TO CART & ASK "ANYTHING ELSE OR BILL?"
══════════════════════════════════════════════════════════════════════
• When customer specifies Color, Size, and Quantity:
• Append [ACTION:add_to_cart,product_id=X,size=Y,color=Z,quantity=N].
• Confirm:
  "🛍️ *[Product Name] (Color: [Color], Size: [Size], Qty: [Qty])* ඔබේ Cart එකට සාර්ථකව එකතු කළා!
  
  📦 *Cart Total:* Rs. [CartTotal]
  
  ඔබට තව වෙනත් ඇඳුම් හෝ Categories බැලීමට අවශ්‍යද? නැතිනම් මේ සඳහා Order එක Bill කරන්නද? 💕
  (තව අවශ්‍ය නම් කැමති Category එක කියන්න, නැතිනම් 'Bill කරන්න' හෝ 'Order එක දාන්න' කියන්න)"

══════════════════════════════════════════════════════════════════════
STEP 5: BRANCHING: MORE ITEMS VS BILLING
══════════════════════════════════════════════════════════════════════
• IF CUSTOMER WANTS MORE ("තව ඕනි", "තව බලන්න ඕනි", mentions another category):
  - Loop back to Step 2/3 and show the requested category/items, adding more items to the cart!
• IF CUSTOMER WANTS TO BILL ("Bill කරන්න", "Order eka danna", "No, that's all", "Checkout"):
  - Politely request delivery details: Full Name, Contact Number, Delivery Address, City/District.
  - When details are provided:
    - Append [ACTION:update_customer_all,name=X,phone=Y,address=Z,city=C] and [ACTION:confirm_order].
    - Present complete Order Summary:
      • Customer Name & Delivery Address
      • Ordered Items Breakdown
      • Subtotal
      • Delivery Fee (Calculated based on city/province via Fardar Express)
      • Grand Total
      • Commercial Bank Payment Details:
        - Bank: Commercial Bank
        - Account Name: U.I. WIJESINGHE
        - Account Number: 8029695559
        - Branch: Anuradhapura
    - Ask them to upload the bank transfer/deposit slip screenshot.

══════════════════════════════════════════════════════════════════════
STEP 6: RECEIPT CONFIRMATION & TRACKING
══════════════════════════════════════════════════════════════════════
• If customer asks about order status, tracking ("Order eka koheda?", "Track my order"): check RECENT CUSTOMER ORDERS and provide real-time status + tracking link: https://felliro.lk/tracking.
• If customer asks about Returns or Exchanges: explain our 7-day hassle-free exchange policy.

DELIVERY CHARGES BY REGION (Fardar Express Courier):
${regionsList}

ACTIVE CATEGORIES IN STORE:
${categoriesFormatted}

AVAILABLE PRODUCTS & VARIANTS IN DATABASE:
${productsList}

CUSTOMER'S CART & ORDER STATE:
• First Contact: ${isFirstInteraction ? 'Yes' : 'No'}
• Cart Items: ${cartSummary}
• Items Total: Rs. ${cartTotal.toFixed(2)}
• Delivery Fee: Rs. ${deliveryFee.toFixed(2)}
• Grand Total: Rs. ${grandTotal.toFixed(2)}
• Customer Name: ${conv.customerData.name || 'Not provided'}
• Customer Phone: ${conv.customerData.phone || 'Not provided'}
• Customer Address: ${conv.customerData.address || 'Not provided'}
• Customer City: ${conv.customerData.city || 'Not provided'}
• Active Order Number: ${conv.orderNumber || 'Pending'}

RECENT CUSTOMER ORDERS:
${recentOrdersContext}

AVAILABLE ACTIONS (Add to the end of your response when needed):
[ACTION:send_category_photos,category=CategoryName]
[ACTION:send_product_photo,product_id=X]
[ACTION:send_product_photos]
[ACTION:add_to_cart,product_id=X,size=Y,color=Z,quantity=N]
[ACTION:update_customer_all,name=X,phone=Y,address=Z,city=C]
[ACTION:confirm_order]
[ACTION:escalate_human]

CUSTOMER'S MESSAGE: "${userMessage}"`;
}

// ─────────────────────────────────────────────
// Call Gemini AI
// ─────────────────────────────────────────────
async function callGemini(systemPrompt, history = []) {
  try {
    const list = Array.isArray(history) ? history : [];
    let historyForApi = list.slice(-10).map(h => ({
      role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text || h.content || '' }]
    })).filter(h => h.parts[0].text);

    if (historyForApi.length > 0 && historyForApi[0].role === 'model') {
      historyForApi.shift();
    }

    const chat = model.startChat({
      history: historyForApi,
      generationConfig: { maxOutputTokens: 1000, temperature: 0.65 }
    });

    const result = await chat.sendMessage(systemPrompt);
    return result.response.text();
  } catch (err) {
    console.error('Gemini AI call error:', err.message);
    return 'ආයුබෝවන්! FelliRo Boutique වෙත සාදරයෙන් පිළිගනිමු. 💕 ඔබට අවශ්‍ය ඇඳුම්, මිල ගණන් හෝ Categories පිළිබඳව මට කියන්න, මම ඔබට උදව් කරන්නම්! ✨';
  }
}

// ─────────────────────────────────────────────
// Process User Message & Execute Actions
// ─────────────────────────────────────────────
async function processUserMessage(targetJid, phone, text, conv) {
  try {
    const systemPrompt = await buildSystemPrompt(phone, conv, text);
    const historyList = conv.messageHistory || [];
    const aiResponse = await callGemini(systemPrompt, historyList);

    const actionMatches = [...aiResponse.matchAll(/\[ACTION:([^\]]+)\]/g)];
    const cleanReply = aiResponse.replace(/\[ACTION:[^\]]+\]/g, '').trim();

    if (cleanReply) {
      await sendMessage(targetJid || phone, cleanReply);
      stateManager.addMessageToHistory(phone, 'assistant', cleanReply);
    }

    for (const match of actionMatches) {
      const actionRaw = match[1];
      const [actionType, ...paramPairs] = actionRaw.split(',');
      const params = {};
      paramPairs.forEach(p => {
        const [k, v] = p.split('=');
        if (k && v) params[k.trim()] = v.trim();
      });
      await executeAction(targetJid || phone, phone, actionType.trim(), params, conv);
    }
  } catch (err) {
    console.error('processUserMessage error:', err);
  }
}

// ─────────────────────────────────────────────
// Execute Structured Bot Actions
// ─────────────────────────────────────────────
async function executeAction(targetJid, phone, action, data, conv) {
  console.log(`⚡ Executing action [${action}] for ${phone}`, data);

  switch (action) {
    case 'send_category_photos':
      try {
        const { categories, products, variants } = await getCachedCatalog();
        const catQuery = (data.category || data.category_name || data.category_id || '').toLowerCase().trim();

        let matchedCat = categories.find(c =>
          c.name.toLowerCase() === catQuery ||
          c.name.toLowerCase().includes(catQuery) ||
          catQuery.includes(c.name.toLowerCase()) ||
          c.id === parseInt(catQuery)
        );

        let catProducts = [];
        if (matchedCat) {
          catProducts = products.filter(p => p.category_id === matchedCat.id && p.quantity > 0);
        } else {
          catProducts = products.filter(p =>
            (p.category || '').toLowerCase().includes(catQuery) && p.quantity > 0
          );
        }

        if (catProducts.length === 0) {
          catProducts = products.filter(p => p.quantity > 0).slice(0, 6);
        } else {
          catProducts = catProducts.slice(0, 8);
        }

        for (const p of catProducts) {
          if (p.image_url) {
            const prodVars = variants.filter(v => v.product_id === p.id && v.quantity > 0);
            const colors = [...new Set(prodVars.map(v => v.color).filter(c => c && c !== '-'))].join(', ') || 'Standard';
            const sizes = [...new Set(prodVars.map(v => v.size).filter(s => s && s !== '-'))].join(', ') || 'Free Size';

            const shortCaption = `✨ *[ID:${p.id}] ${p.name}*\n💰 *Rs. ${parseFloat(p.price).toFixed(2)}*\n🎨 Colors: ${colors}\n📏 Sizes: ${sizes}\n📦 In Stock: ${p.quantity}`;
            await sendProductWithImage(targetJid || phone, p.image_url, shortCaption);
            await sleep(400);
          }
        }
      } catch (err) {
        console.error('Error sending category photos:', err);
      }
      break;

    case 'show_products':
    case 'send_product_photos':
      try {
        const { products, variants } = await getCachedCatalog();
        const topProds = products.filter(p => p.quantity > 0).slice(0, 6);
        for (const p of topProds) {
          if (p.image_url) {
            const prodVars = variants.filter(v => v.product_id === p.id && v.quantity > 0);
            const colors = [...new Set(prodVars.map(v => v.color).filter(c => c && c !== '-'))].join(', ') || 'Standard';
            const sizes = [...new Set(prodVars.map(v => v.size).filter(s => s && s !== '-'))].join(', ') || 'Free Size';

            const shortCaption = `✨ *[ID:${p.id}] ${p.name}*\n💰 *Rs. ${parseFloat(p.price).toFixed(2)}*\n🎨 Colors: ${colors}\n📏 Sizes: ${sizes}`;
            await sendProductWithImage(targetJid || phone, p.image_url, shortCaption);
            await sleep(350);
          }
        }
      } catch (err) {
        console.error('Error sending product photos:', err);
      }
      break;

    case 'send_product_photo':
      if (data.product_id) {
        try {
          const { products, variants } = await getCachedCatalog();
          const target = products.find(p => p.id === parseInt(data.product_id));
          if (target && target.image_url) {
            const prodVars = variants.filter(v => v.product_id === target.id && v.quantity > 0);
            const colors = [...new Set(prodVars.map(v => v.color).filter(c => c && c !== '-'))].join(', ') || 'Standard';
            const sizes = [...new Set(prodVars.map(v => v.size).filter(s => s && s !== '-'))].join(', ') || 'Free Size';

            const shortCaption = `✨ *[ID:${target.id}] ${target.name}*\n💰 *Rs. ${parseFloat(target.price).toFixed(2)}*\n🎨 Colors: ${colors}\n📏 Sizes: ${sizes}`;
            await sendProductWithImage(targetJid || phone, target.image_url, shortCaption);
          }
        } catch (err) {
          console.error('Error sending single product photo:', err);
        }
      }
      break;

    case 'add_to_cart':
      if (data.product_id) {
        const { products } = await getCachedCatalog();
        const p = products.find(prod => prod.id === parseInt(data.product_id));
        if (p) {
          stateManager.addToCart(phone, {
            product_id: p.id,
            name: p.name,
            price: parseFloat(p.price),
            size: data.size || 'Free',
            color: data.color || '-',
            quantity: parseInt(data.quantity) || 1
          });
        }
      }
      break;

    case 'update_customer_all':
      stateManager.setCustomerData(phone, data);
      break;

    case 'confirm_order':
      if (!conv.orderId && conv.cart.length > 0) {
        const orderRes = await createOrderFromBot(targetJid, phone);
        if (orderRes.success) {
          conv.orderId = orderRes.orderId;
          conv.orderNumber = orderRes.orderNumber;
          console.log(`📦 WhatsApp Order created in DB: #${orderRes.orderNumber}`);
        }
      }
      break;

    case 'escalate_human':
      await escalateToHuman(targetJid || phone);
      break;
  }
}

// ─────────────────────────────────────────────
// Create Order in DB (Atomic MySQL Transaction & Accurate Stock Deduction)
// ─────────────────────────────────────────────
async function createOrderFromBot(remoteJid, phone) {
  const conv = stateManager.getConversation(phone);
  let connection = null;
  try {
    const { products, regions } = await getCachedCatalog();

    if (conv.cart.length === 0 && products.length > 0) {
      stateManager.addToCart(phone, {
        product_id: products[0].id,
        name: products[0].name,
        price: parseFloat(products[0].price),
        size: '-',
        color: '-',
        quantity: 1
      });
    }

    const subtotal = stateManager.getCartTotal(phone);
    const deliveryFee = calculateDeliveryFee(conv.customerData.city, conv.customerData.province, regions);
    const total = subtotal + deliveryFee;
    const orderNumber = `FELLIRO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const custPhone = conv.customerData.phone || phone;

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [orderResult] = await connection.query(
      `INSERT INTO orders (order_number, customer_name, customer_phone, customer_address, city, province, total_amount, net_amount, delivery_fee, payment_method, payment_status, order_status, whatsapp_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'bank_transfer', 'pending', 'pending', ?)`,
      [
        orderNumber,
        conv.customerData.name || 'WhatsApp Customer',
        custPhone,
        conv.customerData.address || 'Standard Delivery',
        conv.customerData.city || 'Colombo',
        conv.customerData.province || 'Western',
        total,
        total,
        deliveryFee,
        remoteJid || phone
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of conv.cart) {
      const qty = parseInt(item.quantity || 1);
      const size = (item.size || '-').trim();
      const color = (item.color || '-').trim();
      const itemPrice = parseFloat(item.price) || 0;

      // Find variants to match the exact variant row
      const [allVariants] = await connection.query(
        `SELECT id, size, color, quantity FROM product_variants WHERE product_id = ?`,
        [item.product_id]
      );

      let targetVariant = null;

      if (allVariants.length > 0) {
        // Priority 1: Exact size and color match
        if (size !== '-' && color !== '-') {
          targetVariant = allVariants.find(v =>
            (v.size || '').trim().toLowerCase() === size.toLowerCase() &&
            (v.color || '').trim().toLowerCase() === color.toLowerCase()
          );
        }

        // Priority 2: Partial color match
        if (!targetVariant && size !== '-' && color !== '-') {
          targetVariant = allVariants.find(v =>
            (v.size || '').trim().toLowerCase() === size.toLowerCase() &&
            ((v.color || '').trim().toLowerCase().includes(color.toLowerCase()) ||
             color.toLowerCase().includes((v.color || '').trim().toLowerCase()))
          );
        }

        // Priority 3: Color only
        if (!targetVariant && color !== '-') {
          targetVariant = allVariants.find(v =>
            (v.color || '').trim().toLowerCase() === color.toLowerCase()
          );
        }

        // Priority 4: Size only
        if (!targetVariant && size !== '-') {
          targetVariant = allVariants.find(v =>
            (v.size || '').trim().toLowerCase() === size.toLowerCase()
          );
        }

        // Priority 5: Fallback to variant with stock
        if (!targetVariant) {
          targetVariant = allVariants.find(v => v.quantity >= qty) || allVariants[0];
        }
      }

      const finalSize = targetVariant && targetVariant.size ? targetVariant.size : size;
      const finalColor = targetVariant && targetVariant.color ? targetVariant.color : color;

      // 1. Insert order item
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, size, color, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, finalSize, finalColor, qty, itemPrice, itemPrice * qty]
      );

      // 2. Fetch stock before deduction
      const [prodCheck] = await connection.query(`SELECT id, name, quantity FROM products WHERE id = ? FOR UPDATE`, [item.product_id]);
      const prevQty = prodCheck.length > 0 ? (prodCheck[0].quantity || 0) : 0;
      const newQty = Math.max(0, prevQty - qty);

      // 3. Deduct ONLY from the single matched variant ID
      if (targetVariant && targetVariant.id) {
        await connection.query(
          `UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE id = ?`,
          [qty, targetVariant.id]
        );
      }

      // 4. Deduct main product stock & increment total_sold
      await connection.query(
        `UPDATE products SET quantity = GREATEST(0, quantity - ?), total_sold = total_sold + ? WHERE id = ?`,
        [qty, qty, item.product_id]
      );

      // 5. Inventory Log
      await connection.query(
        `INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, reference_id, note, created_at)
         VALUES (?, ?, ?, 'sale', ?, ?, NOW())`,
        [
          item.product_id,
          prevQty,
          newQty,
          orderId,
          `Sale on WhatsApp Order #${orderNumber}${targetVariant ? ` (${targetVariant.color || '-'} / ${targetVariant.size || '-'})` : ''}`
        ]
      ).catch(logErr => console.warn('Inventory log warning:', logErr.message));
    }

    await connection.query(
      `INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'pending', 'Order created via WhatsApp Bot')`,
      [orderId]
    ).catch(() => {});

    await connection.commit();
    connection.release();
    connection = null;

    // Invalidate cached catalog so stock is always fresh
    cacheCatalog = null;

    if (io) {
      io.emit('new_order', {
        id: orderId,
        order_number: orderNumber,
        customer_name: conv.customerData.name || 'WhatsApp Customer',
        customer_phone: custPhone,
        total_amount: total,
        status: 'pending',
        payment_method: 'bank_transfer'
      });
    }

    return { success: true, orderId, orderNumber };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch(rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('Error creating order in DB:', err);
    return { success: false, message: err.message };
  }
}

// ─────────────────────────────────────────────
// Send Text Message
// ─────────────────────────────────────────────
async function sendMessage(recipient, text) {
  if (!botReady || !sock) return;
  try {
    const jid = formatJid(recipient);
    await sock.sendMessage(jid, { text });
    const cleanPhone = recipient.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    await saveChatLog(cleanPhone, 'outgoing', text, null, null, 'bot');
    if (io) io.emit('admin_message_sent', { phone: cleanPhone, message: text, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(`Send message error to ${recipient}:`, err.message);
  }
}

// ─────────────────────────────────────────────
// Send Admin Message
// ─────────────────────────────────────────────
async function sendMessageAsAdmin(recipient, text) {
  if (!botReady || !sock) return;
  try {
    const jid = formatJid(recipient);
    await sock.sendMessage(jid, { text });
    const cleanPhone = recipient.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    await saveChatLog(cleanPhone, 'outgoing', text, null, null, 'admin');
    if (io) io.emit('admin_message_sent', { phone: cleanPhone, message: text, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(`Admin send error to ${recipient}:`, err.message);
  }
}

// ─────────────────────────────────────────────
// Send Admin Media Message (Image / PDF / Doc / Audio / Video)
// ─────────────────────────────────────────────
async function sendAdminMediaMessage(recipient, buffer, mimetype = 'image/jpeg', filename = 'file', caption = '') {
  if (!botReady || !sock) return false;
  try {
    const jid = formatJid(recipient);
    const mime = (mimetype || '').toLowerCase();
    const isImage = mime.startsWith('image/');
    const isAudio = mime.startsWith('audio/');
    const isVideo = mime.startsWith('video/');
    const isPdf = mime.includes('pdf') || (filename && filename.toLowerCase().endsWith('.pdf'));

    let publicUrl = null;
    let fileType = 'document';
    try {
      const mediaDir = path.join(__dirname, '../public/uploads/whatsapp_media');
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }
      let ext = path.extname(filename || '') || (isImage ? '.jpg' : (isAudio ? '.mp3' : (isVideo ? '.mp4' : '.pdf')));
      if (isImage) fileType = 'image';
      else if (isAudio) fileType = 'audio';
      else if (isVideo) fileType = 'video';
      else if (isPdf) fileType = 'pdf';

      const cleanRecip = recipient.replace(/[^a-zA-Z0-9_-]/g, '');
      const savedName = `admin-${cleanRecip}-${Date.now()}${ext}`;
      const savedPath = path.join(mediaDir, savedName);
      fs.writeFileSync(savedPath, buffer);
      publicUrl = `/uploads/whatsapp_media/${savedName}`;
    } catch (saveErr) {
      console.warn('Could not save admin media copy:', saveErr.message);
    }

    let msgPayload = {};
    if (isImage) {
      msgPayload = { image: buffer, caption: caption || '' };
    } else if (isVideo) {
      msgPayload = { video: buffer, caption: caption || '' };
    } else if (isAudio) {
      msgPayload = { audio: buffer, mimetype: mime || 'audio/mp4' };
    } else {
      msgPayload = { document: buffer, mimetype: mime || 'application/pdf', fileName: filename || 'file.pdf', caption: caption || '' };
    }

    await sock.sendMessage(jid, msgPayload);
    const cleanPhone = recipient.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    await saveChatLog(cleanPhone, 'outgoing', caption || `[File: ${filename}]`, publicUrl, fileType, 'admin');
    if (io) {
      io.emit('admin_message_sent', {
        phone: cleanPhone,
        message: caption || `[File: ${filename}]`,
        mediaUrl: publicUrl,
        mediaType: fileType,
        timestamp: new Date().toISOString()
      });
    }
    return true;
  } catch (err) {
    console.error(`Admin media send error to ${recipient}:`, err.message);
    return false;
  }
}

// ─────────────────────────────────────────────
// Send Product Image (Direct Buffer Upload to WhatsApp CDN)
// ─────────────────────────────────────────────
async function sendProductWithImage(recipient, imageUrl, caption) {
  if (!botReady || !sock) return false;
  try {
    const jid = formatJid(recipient);
    let imageBuffer = null;

    if (!imageUrl) {
      await sock.sendMessage(jid, { text: caption });
      return true;
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const resp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 8000 });
        if (resp.data) {
          imageBuffer = Buffer.from(resp.data);
        }
      } catch (fetchErr) {
        console.warn(`⚠️ Could not fetch remote image (${imageUrl}):`, fetchErr.message);
      }
    } else {
      const cleanUrl = imageUrl.replace(/^\//, '');
      const candidatePaths = [
        path.join(__dirname, '..', 'public', cleanUrl),
        path.join(__dirname, '..', cleanUrl),
        path.join(__dirname, '..', 'public', 'uploads', path.basename(cleanUrl)),
        path.join(__dirname, '..', 'public', 'uploads', 'products', path.basename(cleanUrl))
      ];

      for (const cand of candidatePaths) {
        if (fs.existsSync(cand)) {
          imageBuffer = fs.readFileSync(cand);
          break;
        }
      }
    }

    if (imageBuffer && imageBuffer.length > 0) {
      await sock.sendMessage(jid, { image: imageBuffer, caption });
    } else {
      await sock.sendMessage(jid, { text: caption });
    }

    const cleanPhone = recipient.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    await saveChatLog(cleanPhone, 'outgoing', caption, imageUrl, 'image', 'bot');
    return true;
  } catch (err) {
    console.error(`Send product image error to ${recipient}:`, err.message);
    return false;
  }
}

// ─────────────────────────────────────────────
// Notify Customer: Payment / Receipt Confirmed + Send PDF Invoice
// ─────────────────────────────────────────────
async function notifyCustomerOrderConfirmed(phone, orderNumber, invoicePath) {
  if (!botReady || !sock) {
    console.warn(`⚠️ Cannot send WhatsApp confirmation: Bot not connected.`);
    return false;
  }
  let targetJid = null;
  try {
    try {
      const [orderRows] = await db.query(`SELECT whatsapp_id, customer_phone FROM orders WHERE order_number = ? LIMIT 1`, [orderNumber]);
      if (orderRows.length > 0 && orderRows[0].whatsapp_id) {
        targetJid = formatJid(orderRows[0].whatsapp_id);
      }
    } catch(e) {}

    if (!targetJid) {
      targetJid = formatJid(phone);
    }

    console.log(`📤 Sending Order Confirmation & Invoice to: ${targetJid} (Order #${orderNumber})`);

    const confirmText = `🎉 *Payment Confirmed!* 🎉\n\nDear Customer,\nYour payment receipt for Order *#${orderNumber}* has been verified by our team. 💖\n\nYour package is now being packed and prepared for dispatch via Fardar Express! 🚚✨\n\n📄 Your official invoice is attached below.\n\nTrack your order anytime:\n🔗 https://felliro.lk/tracking\n\nThank you for shopping with FelliRo! 💕`;

    await sock.sendMessage(targetJid, { text: confirmText });
    await saveChatLog(targetJid, 'outgoing', confirmText, null, null, 'bot');

    if (invoicePath && fs.existsSync(invoicePath)) {
      await sleep(600);
      const pdfBuffer = fs.readFileSync(invoicePath);
      const pdfFileName = `Invoice-${orderNumber}.pdf`;

      await sock.sendMessage(targetJid, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: pdfFileName,
        caption: `📄 *Official Invoice - Order #${orderNumber}*`
      });

      console.log(`📄 [Baileys] Invoice PDF delivered successfully to: ${targetJid}`);
      await saveChatLog(targetJid, 'outgoing', `[Invoice PDF: ${pdfFileName}]`, `/invoices/${pdfFileName}`, 'pdf', 'bot');
    }

    if (io) {
      io.emit('order_confirmed_notification_sent', { targetJid, orderNumber, timestamp: new Date().toISOString() });
    }

    return true;
  } catch (err) {
    console.error(`❌ Failed to send order confirmation to ${targetJid || phone}:`, err);
    return false;
  }
}

// ─────────────────────────────────────────────
// Notify Customer: Payment / Receipt Cancelled
// ─────────────────────────────────────────────
async function notifyCustomerOrderCancelled(phone, orderNumber) {
  if (!botReady || !sock) return false;
  let targetJid = null;
  try {
    try {
      const [orderRows] = await db.query(`SELECT whatsapp_id FROM orders WHERE order_number = ? LIMIT 1`, [orderNumber]);
      if (orderRows.length > 0 && orderRows[0].whatsapp_id) {
        targetJid = formatJid(orderRows[0].whatsapp_id);
      }
    } catch(e) {}

    if (!targetJid) {
      targetJid = formatJid(phone);
    }

    const cancelText = `⚠️ *Payment Verification Notice*\n\nDear Customer,\nWe were unable to verify the payment receipt for Order *#${orderNumber}*, and the order has been cancelled.\n\nIf you have already transferred the funds or need assistance, please reply to this message to chat with our support team. 🙏`;

    await sock.sendMessage(targetJid, { text: cancelText });
    await saveChatLog(targetJid, 'outgoing', cancelText, null, null, 'bot');
    return true;
  } catch (err) {
    console.error(`❌ Failed to send cancellation notice to ${targetJid || phone}:`, err);
    return false;
  }
}

// ─────────────────────────────────────────────
// Save Chat Log & State Helpers
// ─────────────────────────────────────────────
async function saveChatLog(phone, direction, message, mediaUrl, mediaType, sentBy) {
  try {
    const cleanPhone = (phone || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    await db.query(
      `INSERT INTO whatsapp_chat_log (phone_number, direction, message, media_url, media_type, sent_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanPhone, direction, message || '', mediaUrl || null, mediaType || null, sentBy || 'bot']
    );
    await db.query(
      `INSERT INTO whatsapp_conversations (phone_number, last_message_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_message_at = NOW()`,
      [cleanPhone]
    );
  } catch(e) {}
}

async function isBotGloballyEnabled() {
  try {
    const [rows] = await db.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'whatsapp_bot_enabled'`);
    if (rows.length === 0) return true;
    return rows[0].setting_value === '1' || rows[0].setting_value === 'true';
  } catch(e) {
    return true;
  }
}

async function setBotEnabled(enabled) {
  try {
    const val = enabled ? '1' : '0';
    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value, setting_group, description, updated_at) 
       VALUES ('whatsapp_bot_enabled', ?, 'whatsapp', 'Global WhatsApp bot toggle', NOW()) 
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [val, val]
    );
    if (io) io.emit('bot_status_changed', { enabled: !!enabled });
    console.log(`🤖 WhatsApp Bot globally ${enabled ? 'ENABLED' : 'DISABLED'}`);
  } catch(err) {
    console.error('Error in setBotEnabled:', err);
    throw err;
  }
}

async function escalateToHuman(recipient) {
  try {
    const cleanPhone = (recipient || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    stateManager.assignToHuman(cleanPhone);

    await db.query(
      `UPDATE whatsapp_conversations SET assigned_to_human = 1, state = 'human_handoff' WHERE phone_number = ? OR phone_number LIKE ?`,
      [cleanPhone, `%${cleanPhone}%`]
    );

    if (io) {
      io.emit('bot_escalated', { phone: cleanPhone, timestamp: new Date().toISOString() });
      io.emit('chat_status_updated', { phone: cleanPhone, assigned_to_human: 1, state: 'human_handoff' });
    }

    await sendMessage(recipient, `👤 You are now connected with a customer care agent. We will assist you shortly!`);
  } catch (err) {
    console.error('Error in escalateToHuman:', err);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getQrCode() { return qrCodeDataUrl; }
function isReady() { return botReady; }
function getClient() { return sock; }

module.exports = {
  initBot, isReady, getQrCode, getClient, restartBot, cleanAuthDirectory,
  sendMessage, sendMessageAsAdmin, sendAdminMediaMessage, sendProductWithImage,
  notifyCustomerOrderConfirmed, notifyCustomerOrderCancelled,
  setBotEnabled, isBotGloballyEnabled, escalateToHuman
};
