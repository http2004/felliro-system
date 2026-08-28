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
const apiKey = process.env.GEMINI_API_KEY || '';
const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
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

    const receiptAck = `🌸 *Payment Receipt Received!* 🌸\n\nඔබගේ බැංකු ගෙවීම් රිසිට්පත Order *#${orderNumber || 'your order'}* වෙත සාර්ථකව සම්බන්ධ කරන ලදී. 💖\n\nඅපගේ කණ්ඩායම විසින් ගෙවීම් තහවුරු කළ පසු, ඔබගේ ඇසුරුම *Fardar Express* කුරියර් සේවාව මඟින් කඩිනමින් එවනු ඇත. 🚚✨\n\n📄 ඕනෑම වේලාවක ඔබේ Order එකේ තත්ත්වය මෙතැනින් පරීක්ෂා කළ හැක:\n🔗 https://felliro.com/tracking\n\n_Thank you for choosing FelliRo!_ 💕`;

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

  return `You are "ශාශා (Shasha)", the friendly, stylish, intelligent AI Fashion Consultant for "FelliRo" — Sri Lanka's leading boutique for women's clothing.

CORE BEHAVIOR & GUIDELINES:
1. NATURAL CONVERSATION:
   - Talk warmly, charmingly, and naturally in Sinhala, Singlish, or English depending on how the customer speaks.
   - DO NOT repeat rigid templates or welcome menus in a loop.
   - If the customer asks questions like "සිංහල පුළුවන්ද?", "හායි", "කොහොමද?", reply naturally and warmly (e.g., "ආයුබෝවන්! ඔව් මට සිංහලෙන් කතා කරන්න පුළුවන්. මම FelliRo හි Fashion Consultant ශාශා. ඔබට අද මොනවගේ ලස්සන ඇඳුම්ද බලන්න ඕනේ? 💕").

2. EXPLORING DESIGNS & CATEGORIES:
   - If the customer asks to see dresses or designs ("ලස්සන ඇඳුම් ටිකක් බලන්න පුළුවන්ද", "ගවුම් තියෙනවද", "Crop tops පෙන්නන්න", etc.):
     • If they mention a specific category (${categoriesFormatted}), introduce our collection, mention that the entire stock and all design details can also be viewed on our official website: https://felliro.com/products , and append [ACTION:send_category_photos,category=CategoryName] so high-quality photos are sent to WhatsApp.
     • If they ask generally, mention our available categories, provide our official website link https://felliro.com/products for full browsing, and ask what style they are looking for (Casual, Party wear, Work wear, Frocks, etc.).

3. SELECTING AN ITEM & CONFIGURING:
   - When the customer picks an item (by name, design number, ID, or photo):
     • Check available colors and sizes in AVAILABLE PRODUCTS.
     • Tell them the price and available colors/sizes, and ask which Color, Size (S/M/L/XL/Free Size), and Quantity they prefer.
     • You can append [ACTION:send_product_photo,product_id=X] to show that specific dress photo.

4. ADDING TO CART & ORDERING:
   - When the customer gives Color, Size, and Quantity:
     • Append [ACTION:add_to_cart,product_id=X,size=Y,color=Z,quantity=N].
     • Confirm that it's added to their cart, mention the Cart Total, and ask if they want to browse more designs or proceed to Bill/Checkout.

5. CHECKOUT & BILLING:
   - When the customer says "Bill කරන්න", "Order eka danna", or wants to finalize:
     • If Name, Phone, Address, City are missing, politely ask for their delivery details.
     • When details are provided, append [ACTION:update_customer_all,name=X,phone=Y,address=Z,city=C] and [ACTION:confirm_order].
     • Share the bill summary along with Commercial Bank details (Account: 8029695559, U.I. WIJESINGHE, Commercial Bank Anuradhapura) and request a screenshot of the payment slip.

6. FAQ & STORE INFO:
   - Location: Anuradhapura showroom + Islandwide delivery.
   - Delivery: Colombo/Gampaha Rs. 350, other districts Rs. 400-450 via Fardar Express (2-3 days).
   - Contact / Phone: 071 771 6005.
   - Tracking: Check RECENT CUSTOMER ORDERS or link https://felliro.com/tracking.

AVAILABLE STORE DATA:
• Active Categories: ${categoriesFormatted}
• Available Products & Variants:
${productsList}

CUSTOMER STATE:
• Cart Items: ${cartSummary}
• Cart Total: Rs. ${cartTotal.toFixed(2)}
• Customer Name: ${conv.customerData.name || 'Not provided'}
• Customer City: ${conv.customerData.city || 'Not provided'}
• Active Order: ${conv.orderNumber || 'None'}
• Recent Orders:
${recentOrdersContext}

AVAILABLE ACTIONS (Place at the end of your response when taking an action):
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
    const rawApiKey = process.env.GEMINI_API_KEY || '';
    if (!rawApiKey || rawApiKey === 'AIzaSyDummy') {
      return null;
    }

    const currentGenAI = new GoogleGenerativeAI(rawApiKey);
    const activeModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const targetModel = currentGenAI.getGenerativeModel({ model: activeModel });

    const list = Array.isArray(history) ? history : [];
    let historyForApi = list.slice(-8).map(h => ({
      role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text || h.content || '' }]
    })).filter(h => h.parts[0].text);

    if (historyForApi.length > 0 && historyForApi[0].role === 'model') {
      historyForApi.shift();
    }

    const chat = targetModel.startChat({
      history: historyForApi,
      generationConfig: { maxOutputTokens: 1000, temperature: 0.65 }
    });

    const result = await chat.sendMessage(systemPrompt);
    return result.response.text();
  } catch (err) {
    console.error('Gemini AI call note:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Local Rule-Based Engine (Shasha Core)
// Guarantees 100% reliable 5-step sales flow when AI is unavailable
// ─────────────────────────────────────────────
async function handleLocalRuleBasedFlow(targetJid, phone, rawText, conv) {
  const text = (rawText || '').trim();
  const lowerText = text.toLowerCase();
  const { categories, products, variants, regions } = await getCachedCatalog();

  // 0. Human Agent Assistance Request Check
  if (
    lowerText.includes('agent') ||
    lowerText.includes('human') ||
    lowerText.includes('සහයක්') ||
    lowerText.includes('සහාය') ||
    lowerText.includes('help') ||
    lowerText.includes('කතා කරන්න') ||
    lowerText.includes('call') ||
    lowerText.includes('support') ||
    lowerText.includes('owner') ||
    lowerText.includes('manager')
  ) {
    stateManager.setState(phone, stateManager.STATES.HUMAN_HANDOFF);
    const agentMsg = `👩‍💼 *FelliRo Human Support Team* 👩‍💼\n\nඔබගේ පණිවිඩය අපගේ පාරිභෝගික සේවා කණ්ඩායම වෙත යොමු කරන ලදී. අපගේ නිලධාරියෙකු සුළු වේලාවකින් ඔබව සම්බන්ධ කරගනු ඇත. 💕\n\n📞 ක්ෂණික සහය සඳහා අප අමතන්න:\n📱 *071 771 6005*\n\nස්තූතියි! ✨`;
    await sendMessage(targetJid || phone, agentMsg);
    stateManager.addMessageToHistory(phone, 'assistant', agentMsg);
    return;
  }

  // 1. Order Tracking Inquiry Check
  if (
    lowerText.includes('track') ||
    lowerText.includes('koheda') && lowerText.includes('order') ||
    lowerText.includes('order eka') && (lowerText.includes('koheda') || lowerText.includes('status') || lowerText.includes('awada')) ||
    lowerText.includes('status') ||
    lowerText.includes('where is my order') ||
    lowerText.includes('felliro-') ||
    lowerText.startsWith('ord-')
  ) {
    try {
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      const [orders] = await db.query(
        `SELECT order_number, total_amount, order_status, payment_status, tracking_number, created_at 
         FROM orders 
         WHERE whatsapp_id LIKE ? OR customer_phone LIKE ? OR order_number LIKE ?
         ORDER BY id DESC LIMIT 1`,
        [`%${cleanPhone}%`, `%${cleanPhone}%`, `%${text.trim()}%`]
      );

      if (orders.length > 0) {
        const ord = orders[0];
        const statusMap = {
          pending: '⏳ Pending (අපගේ කණ්ඩායම විසින් ගෙවීම් පරීක්ෂා කරමින් පවතී)',
          processing: '📦 Processing (ඇසුරුම් කරමින් පවතී)',
          shipped: '🚚 Dispatched / Shipped (කුරියර් සේවාව වෙත භාර දී ඇත)',
          delivered: '✅ Delivered (භාණ්ඩය සාර්ථකව බෙදාහැර ඇත)',
          cancelled: '❌ Cancelled (අවලංගු කර ඇත)'
        };
        const stText = statusMap[ord.order_status] || ord.order_status;
        const msg = `📦 *Order Tracking Status: #${ord.order_number}* 📦\n\n🔹 *වත්මන් තත්ත්වය:* ${stText}\n🔹 *Payment Status:* ${ord.payment_status}\n🔹 *Tracking Number:* ${ord.tracking_number || 'තවම නිකුත් කර නැත'}\n🔹 *Total Amount:* Rs. ${parseFloat(ord.total_amount).toFixed(2)}\n\n📄 වැඩිදුර විස්තර සඳහා පිවිසෙන්න:\n🔗 https://felliro.com/tracking\n\nඔබට තව යමක් දැනගැනීමට අවශ්‍යද? 💕`;
        await sendMessage(targetJid || phone, msg);
        stateManager.addMessageToHistory(phone, 'assistant', msg);
        return;
      }
    } catch(e) {
      console.warn('Tracking query error:', e.message);
    }
  }

  // 2. Returns & Exchanges Inquiry Check
  if (
    lowerText.includes('return') ||
    lowerText.includes('exchange') ||
    lowerText.includes('maru karanna') ||
    lowerText.includes('maru karaganna') ||
    lowerText.includes('damage') ||
    lowerText.includes('defect') ||
    lowerText.includes('size madi') ||
    lowerText.includes('size wadi')
  ) {
    const returnMsg = `🌸 *FelliRo Exchange & Return Policy* 🌸\n\nඔබට ලැබුණු භාණ්ඩයේ කිසියම් Size ගැටලුවක් හෝ Damage එකක් ඇත්නම්, භාණ්ඩය ලැබී දින 7ක් ඇතුළත ඉතා පහසුවෙන් Exchange කරගත හැක. 💕\n\n1️⃣ භාණ්ඩයේ Photo එකක් අප වෙත එවන්න.\n2️⃣ ඔබට අවශ්‍ය අලුත් Size එක හෝ වෙනත් Design එක අපට දන්වන්න.\n3️⃣ අපගේ කණ්ඩායම පැය කිහිපයක් ඇතුළත ඔබව සම්බන්ධ කරගනු ඇත. ✨\n\n_අපගේ පාරිභෝගික සේවාව: 071 771 6005_ 💖`;
    await sendMessage(targetJid || phone, returnMsg);
    stateManager.addMessageToHistory(phone, 'assistant', returnMsg);
    return;
  }

  // 3. FAQs & Common Questions (Store location, Delivery, COD, Bank Details, Contact)
  if (
    (lowerText.includes('shop') || lowerText.includes('kade') || lowerText.includes('store') || lowerText.includes('location') || lowerText.includes('address') || lowerText.includes('koheda thiyenne') || lowerText.includes('thiyenne koheda')) &&
    !lowerText.includes('order')
  ) {
    const shopMsg = `🏬 *FelliRo Boutique Location & Delivery* 🏬\n\nඅපගේ ප්‍රධාන ශාඛාව *අනුරාධපුරය (Anuradhapura)* නගරයේ පිහිටා ඇති අතර, දිවයිනේ ඕනෑම ප්‍රදේශයකට *Fardar Express* මඟින් ඉතා ආරක්ෂිතව භාණ්ඩ නිවසටම ගෙන්වා ගත හැක! 🚚✨\n\n📍 *Showroom:* Anuradhapura, Sri Lanka\n🌐 *Website:* https://felliro.com\n📞 *Hotline:* 071 771 6005\n\nඔබට ඇඳුම් Designs බැලීමට අවශ්‍යද? 💕`;
    await sendMessage(targetJid || phone, shopMsg);
    stateManager.addMessageToHistory(phone, 'assistant', shopMsg);
    return;
  }

  if (
    lowerText.includes('delivery fee') ||
    lowerText.includes('delivery charge') ||
    lowerText.includes('delivery keeyada') ||
    lowerText.includes('delivery cost') ||
    lowerText.includes('shipping') ||
    lowerText.includes('dawas keeyak') ||
    lowerText.includes('how many days') ||
    lowerText.includes('deliver karanna')
  ) {
    // Calculate min and max from DB regions
    let minCharge = 450;
    let maxCharge = 450;
    if (regions && regions.length > 0) {
      const charges = regions.map(r => parseFloat(r.delivery_charge) || 0).filter(c => c > 0);
      if (charges.length > 0) {
        minCharge = Math.min(...charges);
        maxCharge = Math.max(...charges);
      }
    }
    
    let priceText = '';
    if (minCharge === maxCharge) {
      priceText = `රු. ${minCharge}/=`;
    } else {
      priceText = `රු. ${minCharge}/= - ${maxCharge}/=`;
    }

    const delMsg = `🚚 *FelliRo Delivery Information (Fardar Express)* 🚚\n\n🔹 *දිවයින පුරා ඩිලිවරි ගාස්තුව:* ${priceText}\n⏱️ *කාලය:* Order එක තහවුරු කර දින 2-3ක් ඇතුළත ඔබේ නිවසටම ලැබෙනු ඇත. ✨\n\nඔබට කැමති ඇඳුම් වර්ගයක් තෝරා ගැනීමට අපගේ Categories පෙන්වන්නද? 💕`;
    await sendMessage(targetJid || phone, delMsg);
    stateManager.addMessageToHistory(phone, 'assistant', delMsg);
    return;
  }

  if (
    lowerText.includes('cod') ||
    lowerText.includes('cash on delivery') ||
    lowerText.includes('payment method') ||
    lowerText.includes('gewanna puluwan') ||
    lowerText.includes('salli gewanna')
  ) {
    const payMsg = `💳 *FelliRo Payment Methods* 💳\n\nදැනට අපගේ සියලුම Orders සඳහා ගෙවීම් සිදු කරනු ලබන්නේ *Commercial Bank Online Transfer* හෝ *Bank Deposit* මඟිනි. 💕\n_(ගෙවීම සිදු කළ පසු Slip පතේ Photo එකක් අප වෙත එවූ වහාම පාර්සලය Dispatch කරනු ලැබේ)_ ✨\n\n🏦 *Commercial Bank Details:*\n• Account Name: *U.I. WIJESINGHE*\n• Account Number: *8029695559*\n• Branch: *Anuradhapura*\n\nඔබට Order එකක් දැමීමට අවශ්‍යද? 💕`;
    await sendMessage(targetJid || phone, payMsg);
    stateManager.addMessageToHistory(phone, 'assistant', payMsg);
    return;
  }

  if (
    lowerText.includes('bank details') ||
    lowerText.includes('account number') ||
    lowerText.includes('acc no') ||
    lowerText.includes('bank account')
  ) {
    const bankMsg = `🏦 *FelliRo Official Bank Details* 🏦\n\n• Bank: *Commercial Bank*\n• Account Name: *U.I. WIJESINGHE*\n• Account Number: *8029695559*\n• Branch: *Anuradhapura*\n\nගෙවීම සිදු කර Transfer / Deposit Slip එකේ Photo එකක් මෙතැනට එවන්න. 💕`;
    await sendMessage(targetJid || phone, bankMsg);
    stateManager.addMessageToHistory(phone, 'assistant', bankMsg);
    return;
  }

  if (
    lowerText.includes('hotline') ||
    lowerText.includes('phone number') ||
    lowerText.includes('number eka') ||
    lowerText.includes('contact number') ||
    lowerText.includes('call karanna')
  ) {
    const contactMsg = `📞 *FelliRo Contact Details* 📞\n\n📱 *Customer Care:* 071 771 6005\n💬 *WhatsApp:* 071 771 6005\n🌐 *Website:* https://felliro.com\n\nඔබට වෙනත් යමක් දැනගැනීමට අවශ්‍යද? 💕`;
    await sendMessage(targetJid || phone, contactMsg);
    stateManager.addMessageToHistory(phone, 'assistant', contactMsg);
    return;
  }

  // 4. Checkout / Bill Request Check
  if (
    lowerText === 'bill' ||
    lowerText === 'checkout' ||
    lowerText.includes('bill karanna') ||
    lowerText.includes('bill eka') ||
    lowerText.includes('order eka danna') ||
    lowerText.includes('order danna') ||
    lowerText.includes('order karanna') ||
    lowerText.includes('buy now')
  ) {
    if (conv.cart.length === 0) {
      const emptyMsg = `🛍️ ඔබේ Cart එක දැනට හිස්ව පවතී. 💕\n\nකරුණාකර පහත Categories වලින් ඔබට අවශ්‍ය එකක් තෝරා ඇඳුමක් Cart එකට එකතු කරන්න: ✨\n\n${categories.map((c, i) => `${i + 1}️⃣ *${c.name}*`).join('\n')}`;
      await sendMessage(targetJid || phone, emptyMsg);
      stateManager.addMessageToHistory(phone, 'assistant', emptyMsg);
      return;
    }

    stateManager.setState(phone, stateManager.STATES.COLLECTING_DETAILS);
    const billPrompt = `📦 *Order එක සම්පූර්ණ කිරීමට පහත විස්තර අපට එවන්න:* 💕\n\n1️⃣ සම්පූර්ණ නම (Full Name):\n2️⃣ දුරකථන අංකය (Phone Number):\n3️⃣ බෙදාහැරීමේ ලිපිනය (Delivery Address):\n4️⃣ නගරය / දිස්ත්‍රික්කය (City / District):\n\n_(කරුණාකර මේ පණිවිඩයට පිළිතුරු ලෙස ඔබේ විස්තර එවන්න)_ ✨`;
    await sendMessage(targetJid || phone, billPrompt);
    stateManager.addMessageToHistory(phone, 'assistant', billPrompt);
    return;
  }

  // 5. Delivery Details Submission (If in COLLECTING_DETAILS state or text contains customer address info)
  const isDetailsFormat = (
    conv.state === stateManager.STATES.COLLECTING_DETAILS ||
    (lowerText.includes('address') || lowerText.includes('colombo') || lowerText.includes('kandy') || lowerText.includes('galle') || lowerText.includes('road') || lowerText.includes('street') || /\d{9,10}/.test(text))
  );

  if (isDetailsFormat && conv.cart.length > 0 && !conv.orderId) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let parsedName = '';
    let parsedPhone = '';
    let parsedAddress = '';
    let parsedCity = '';

    for (const line of lines) {
      const phoneMatch = line.match(/(?:0|\+?94)?(7\d{8})/);
      if (phoneMatch && !parsedPhone) {
        parsedPhone = phoneMatch[0];
      }

      if (/name|නම/i.test(line)) {
        parsedName = line.replace(/.*(?:name|නම)[\:\-\s]*/i, '').trim();
      } else if (/address|ලිපිනය/i.test(line)) {
        parsedAddress = line.replace(/.*(?:address|ලිපිනය)[\:\-\s]*/i, '').trim();
      } else if (/city|district|නගරය|දිස්ත්‍රික්කය/i.test(line)) {
        parsedCity = line.replace(/.*(?:city|district|නගරය|දිස්ත්‍රික්කය)[\:\-\s]*/i, '').trim();
      }
    }

    if (!parsedName && lines.length > 0 && !/\d{5,}/.test(lines[0])) parsedName = lines[0];
    if (!parsedPhone) {
      const m = text.match(/(?:0|\+?94)?(7\d{8})/);
      parsedPhone = m ? m[0] : phone;
    }
    if (!parsedAddress && lines.length >= 3) {
      parsedAddress = lines.slice(2).join(', ');
    } else if (!parsedAddress) {
      parsedAddress = text;
    }

    if (!parsedCity) {
      for (const r of regions) {
        if (text.toLowerCase().includes(r.name.toLowerCase())) {
          parsedCity = r.name;
          break;
        }
      }
    }
    if (!parsedCity) parsedCity = 'Colombo';

    stateManager.setCustomerData(phone, {
      name: parsedName || 'WhatsApp Customer',
      phone: parsedPhone || phone,
      address: parsedAddress || 'Home Delivery',
      city: parsedCity
    });

    const orderRes = await createOrderFromBot(targetJid, phone);
    if (orderRes.success) {
      conv.orderId = orderRes.orderId;
      conv.orderNumber = orderRes.orderNumber;
      stateManager.setState(phone, stateManager.STATES.AWAITING_RECEIPT);

      const deliveryFee = calculateDeliveryFee(parsedCity, '', regions);
      const subtotal = stateManager.getCartTotal(phone);
      const grandTotal = subtotal + deliveryFee;

      const itemsList = conv.cart.map(i => `• *${i.name}* (${i.color || '-'} / ${i.size || '-'}) x ${i.quantity} = Rs. ${(i.price * i.quantity).toFixed(2)}`).join('\n');

      const billMsg = `🎉 *Order Confirmed! (#${orderRes.orderNumber})* 🎉\n\n👤 *Customer:* ${parsedName || 'Valued Customer'}\n📞 *Phone:* ${parsedPhone || phone}\n📍 *Delivery Address:* ${parsedAddress}, ${parsedCity}\n\n🛍️ *Ordered Items:*\n${itemsList}\n\n💵 *Items Subtotal:* Rs. ${subtotal.toFixed(2)}\n🚚 *Delivery Fee (Fardar Express):* Rs. ${deliveryFee.toFixed(2)}\n💰 *Grand Total:* Rs. ${grandTotal.toFixed(2)}\n\n══════════════════════════════\n🏦 *Bank Payment Details (Commercial Bank):*\n• Bank: *Commercial Bank*\n• Account Name: *U.I. WIJESINGHE*\n• Account Number: *8029695559*\n• Branch: *Anuradhapura*\n══════════════════════════════\n\n📸 කරුණාකර ගෙවීම සිදු කර Transfer / Deposit Slip එකේ Photo / Screenshot එකක් මෙතැනට එවන්න. 💕\n\n_ස්තූතියි!_ 💖`;

      await sendMessage(targetJid || phone, billMsg);
      stateManager.addMessageToHistory(phone, 'assistant', billMsg);
      return;
    }
  }

  // 6. Branching in ASKING_MORE_OR_BILL State
  if (conv.state === stateManager.STATES.ASKING_MORE_OR_BILL) {
    if (
      lowerText.includes('more') ||
      lowerText.includes('thawa') ||
      lowerText.includes('තව') ||
      lowerText.includes('twa') ||
      lowerText.includes('other') ||
      lowerText.includes('category') ||
      lowerText.includes('designs') ||
      lowerText.includes('balanna')
    ) {
      let catsListStr = categories.map((c, idx) => {
        const prodsInCat = products.filter(p => p.category_id === c.id && p.quantity > 0);
        return `${idx + 1}️⃣ *${c.name}* (${prodsInCat.length} designs available)`;
      }).join('\n');

      const moreMsg = `✨ *අපගේ අනෙකුත් Categories:*\n\n${catsListStr}\n\nඔබට බැලීමට අවශ්‍ය Category එක කුමක්ද? (නම හෝ අංකය එවන්න) 💕`;
      stateManager.setState(phone, stateManager.STATES.SELECTING_CATEGORY);
      await sendMessage(targetJid || phone, moreMsg);
      stateManager.addMessageToHistory(phone, 'assistant', moreMsg);
      return;
    }
  }

  // 7. Product Selection Check (PRIORITY: Exact Product Name or Specific Product ID or Item in Current Category)
  let matchedProduct = null;

  // 7a. Exact or near match by Product Name (e.g. "Crop Top 1", "Frock 2", "Coart 3", "Night Dress 1")
  matchedProduct = products.find(p => p.name.toLowerCase() === lowerText);

  // 7b. Match by Product ID (e.g. "ID:61", "61", "#61")
  if (!matchedProduct) {
    const idMatch = text.match(/(?:id[\:\s#]*)(\d+)/i);
    if (idMatch) {
      const pid = parseInt(idMatch[1]);
      matchedProduct = products.find(p => p.id === pid && p.quantity > 0);
    }
  }

  // 7c. In BROWSING_CATEGORY state, if user sends a number 1-8, pick the N-th product in that category!
  if (!matchedProduct && conv.state === stateManager.STATES.BROWSING_CATEGORY && conv.currentCategory) {
    const catObj = categories.find(c => c.name.toLowerCase() === conv.currentCategory.toLowerCase());
    if (catObj) {
      const catProds = products.filter(p => p.category_id === catObj.id && p.quantity > 0);
      const choiceNum = parseInt(text);
      if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= catProds.length) {
        matchedProduct = catProds[choiceNum - 1];
      }
    }
  }

  // 7d. Substring product name match (e.g. "frock 3", "crop top 2", "coart 1")
  if (!matchedProduct) {
    for (const p of products) {
      if (lowerText.includes(p.name.toLowerCase()) && p.quantity > 0) {
        matchedProduct = p;
        break;
      }
    }
  }

  // 7e. Digits only direct ID match if >= 10
  if (!matchedProduct) {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly && digitsOnly.length >= 2 && digitsOnly.length <= 4) {
      const directId = parseInt(digitsOnly);
      matchedProduct = products.find(p => p.id === directId && p.quantity > 0);
    }
  }

  if (matchedProduct) {
    conv.pendingProduct = matchedProduct;
    stateManager.setState(phone, stateManager.STATES.CONFIGURING_ITEM);

    const prodVars = variants.filter(v => v.product_id === matchedProduct.id && v.quantity > 0);
    const colors = [...new Set(prodVars.map(v => v.color).filter(c => c && c !== '-'))].join(', ') || 'Standard';
    const sizes = [...new Set(prodVars.map(v => v.size).filter(s => s && s !== '-'))].join(', ') || 'Free Size';

    if (matchedProduct.image_url) {
      await sendProductWithImage(
        targetJid || phone,
        matchedProduct.image_url,
        `✨ *[ID:${matchedProduct.id}] ${matchedProduct.name}*\n💰 *Rs. ${parseFloat(matchedProduct.price).toFixed(2)}*`
      );
    }

    const askVariantMsg = `✨ *${matchedProduct.name}* (Rs. ${parseFloat(matchedProduct.price).toFixed(2)})\n\n🎨 *Available Colors:* ${colors}\n📏 *Available Sizes:* ${sizes}\n\nඔබ කැමති Color එක, Size එක, සහ ඔබට අවශ්‍ය ප්‍රමාණය (Quantity) කීයද? 💕\n\n_(උදා: ${colors.split(',')[0].trim() || 'Pink'} 1 හෝ White 2)_`;
    await sendMessage(targetJid || phone, askVariantMsg);
    stateManager.addMessageToHistory(phone, 'assistant', askVariantMsg);
    return;
  }

  // 8. Configuring Item (Customer specifying Color / Size / Qty)
  const isColorOrSizeMentioned = (
    /\b(pink|black|white|red|blue|yellow|green|maroon|purple|beige|brown|rose|grey|gray|cream|navy|standard)\b/i.test(lowerText) ||
    /\b(s|m|l|xl|xxl|small|medium|large|free size)\b/i.test(lowerText) ||
    lowerText.includes('පාට') || lowerText.includes('සයිස්') || lowerText.includes('කලර්')
  );

  if (conv.pendingProduct || (conv.state === stateManager.STATES.CONFIGURING_ITEM && (isColorOrSizeMentioned || /\d+/.test(text)))) {
    const prod = conv.pendingProduct || products[0];
    const prodVars = variants.filter(v => v.product_id === prod.id && v.quantity > 0);

    const qtyMatch = text.match(/\b([1-9]|10)\b/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    let selectedColor = '-';
    for (const v of prodVars) {
      if (v.color && lowerText.includes(v.color.toLowerCase())) {
        selectedColor = v.color;
        break;
      }
    }
    if (selectedColor === '-' && prodVars.length > 0 && prodVars[0].color) {
      selectedColor = prodVars[0].color;
    }

    let selectedSize = 'Free Size';
    if (/\b(s|small)\b/i.test(text)) selectedSize = 'S';
    else if (/\b(m|medium)\b/i.test(text)) selectedSize = 'M';
    else if (/\b(l|large)\b/i.test(text)) selectedSize = 'L';
    else if (/\b(xl|extra large)\b/i.test(text)) selectedSize = 'XL';
    else if (/\b(xxl)\b/i.test(text)) selectedSize = 'XXL';
    else if (prodVars.length > 0 && prodVars[0].size) selectedSize = prodVars[0].size;

    stateManager.addToCart(phone, {
      product_id: prod.id,
      name: prod.name,
      price: parseFloat(prod.price),
      size: selectedSize,
      color: selectedColor,
      quantity: qty
    });

    conv.pendingProduct = null;
    stateManager.setState(phone, stateManager.STATES.ASKING_MORE_OR_BILL);

    const cartTotal = stateManager.getCartTotal(phone);
    const cartAck = `🛍️ *${prod.name} (Color: ${selectedColor}, Size: ${selectedSize}, Qty: ${qty})* ඔබේ Cart එකට සාර්ථකව එකතු කළා! 🎉\n\n📦 *Cart Total:* Rs. ${cartTotal.toFixed(2)}\n\nඔබට තව වෙනත් ඇඳුම් හෝ Categories බැලීමට අවශ්‍යද? නැතිනම් මේ සඳහා Order එක Bill කරන්නද? 💕\n\n_(තව අවශ්‍ය නම් කැමති Category එක කියන්න, නැතිනම් *'Bill කරන්න'* කියන්න)_`;

    await sendMessage(targetJid || phone, cartAck);
    stateManager.addMessageToHistory(phone, 'assistant', cartAck);
    return;
  }

  // 9. Category Selection Check (By Name, Sinhala keyword, or Index 1-5)
  let matchedCategory = null;
  const numChoice = parseInt(text);
  if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= categories.length && (conv.state === stateManager.STATES.SELECTING_CATEGORY || conv.state === stateManager.STATES.IDLE || conv.cart.length === 0)) {
    matchedCategory = categories[numChoice - 1];
  } else {
    matchedCategory = categories.find(c =>
      c.name.toLowerCase() === lowerText
    );
  }

  if (!matchedCategory) {
    if (lowerText.includes('crop') || lowerText.includes('top') || lowerText.includes('ටොප්')) {
      matchedCategory = categories.find(c => /crop/i.test(c.name));
    } else if (lowerText.includes('frock') || lowerText.includes('dress') || lowerText.includes('gauma') || lowerText.includes('gaum') || lowerText.includes('ගවුම') || lowerText.includes('ගවුම්') || lowerText.includes('ඩ්‍රස්')) {
      matchedCategory = categories.find(c => /frock/i.test(c.name));
    } else if (lowerText.includes('coat') || lowerText.includes('coart') || lowerText.includes('blazer') || lowerText.includes('කෝට්') || lowerText.includes('බ්ලේසර්')) {
      matchedCategory = categories.find(c => /coart|coat/i.test(c.name));
    } else if (lowerText.includes('full kit') || lowerText.includes('fullkit') || lowerText.includes('කිට්') || lowerText.includes('ෆුල් කිට්')) {
      matchedCategory = categories.find(c => /full/i.test(c.name));
    } else if (lowerText.includes('night') || lowerText.includes('sleep') || lowerText.includes('nighty') || lowerText.includes('නයිට්') || lowerText.includes('නයිටි')) {
      matchedCategory = categories.find(c => /night/i.test(c.name));
    }
  }

  if (matchedCategory) {
    conv.currentCategory = matchedCategory.name;
    stateManager.setState(phone, stateManager.STATES.BROWSING_CATEGORY);

    const catProds = products.filter(p => p.category_id === matchedCategory.id && p.quantity > 0);
    const topToSend = catProds.slice(0, 8);

    if (topToSend.length > 0) {
      await sendMessage(targetJid || phone, `✨ *${matchedCategory.name}* Designs ඔබ වෙත එවමින් පවතී... 💕`);

      for (let i = 0; i < topToSend.length; i++) {
        const p = topToSend[i];
        if (p.image_url) {
          const prodVars = variants.filter(v => v.product_id === p.id && v.quantity > 0);
          const colors = [...new Set(prodVars.map(v => v.color).filter(c => c && c !== '-'))].join(', ') || 'Standard';
          const sizes = [...new Set(prodVars.map(v => v.size).filter(s => s && s !== '-'))].join(', ') || 'Free Size';

          const caption = `✨ *${i + 1}️⃣ [ID:${p.id}] ${p.name}*\n💰 *Rs. ${parseFloat(p.price).toFixed(2)}*\n🎨 Colors: ${colors}\n📏 Sizes: ${sizes}\n📦 In Stock: ${p.quantity}`;
          await sendProductWithImage(targetJid || phone, p.image_url, caption);
          await sleep(350);
        }
      }

      const chooseMsg = `✨ ඉහත දැක්වෙන්නේ *${matchedCategory.name}* හි අප සතු අලංකාර Designs වේ. 😍\n\nමෙහි ඇති ඔබ කැමති Design එක කුමක්ද? (නම, ID අංකය, හෝ අංක 1-${topToSend.length} එවන්න) 💕\n_(උදා: ${topToSend[0].name} හෝ 1 හෝ ID:${topToSend[0].id})_`;
      await sendMessage(targetJid || phone, chooseMsg);
      stateManager.addMessageToHistory(phone, 'assistant', chooseMsg);
      return;
    }
  }

  // 10. Default Welcome Header with Categories List
  let catsListStr = categories.map((c, idx) => {
    const prodsInCat = products.filter(p => p.category_id === c.id && p.quantity > 0);
    return `${idx + 1}️⃣ *${c.name}* (${prodsInCat.length} designs available)`;
  }).join('\n');

  if (!catsListStr) {
    catsListStr = '1️⃣ Crop Top\n2️⃣ Coart\n3️⃣ Frock\n4️⃣ Full Kit\n5️⃣ Night Dress';
  }

  const welcomeHeader = `🌸 *Welcome to FelliRo Boutique!* 🌸\nසාදරයෙන් පිළිගනිමු! | அன்புடன் வரவேற்கிறோம்!\n\nමම *ශාශා (Shasha)*, ඔබේ AI Fashion Consultant. 💕\n\n✨ *අපගේ නවතම විලාසිතා Categories:*\n${catsListStr}\n\nඔබට බැලීමට අවශ්‍ය කුමන Category එකද? (නම හෝ අංකය එවන්න) 💕`;

  stateManager.setState(phone, stateManager.STATES.SELECTING_CATEGORY);
  await sendMessage(targetJid || phone, welcomeHeader);
  stateManager.addMessageToHistory(phone, 'assistant', welcomeHeader);
}

// ─────────────────────────────────────────────
// Process User Message & Execute Actions
// ─────────────────────────────────────────────
async function processUserMessage(targetJid, phone, text, conv) {
  const convObj = conv || stateManager.getConversation(phone);
  try {
    const systemPrompt = await buildSystemPrompt(phone, convObj, text);
    const historyList = convObj.messageHistory || [];
    const aiResponse = await callGemini(systemPrompt, historyList);

    if (aiResponse && aiResponse.trim().length > 0) {
      console.log(`🤖 Gemini 3.5 AI responded for ${phone}`);
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
        await executeAction(targetJid || phone, phone, actionType.trim(), params, convObj);
      }
      return;
    }

    // AI unavailable fallback
    console.log(`⚠️ Gemini AI did not return a response for ${phone}: "${text}"`);
    const fallbackMsg = "🌸 ආයුබෝවන්! FelliRo Boutique වෙත සාදරයෙන් පිළිගනිමු! මම ශාශා (Shasha). ඔබට අද මොනවගේ ඇඳුම්ද බලන්න අවශ්‍ය? 💕";
    await sendMessage(targetJid || phone, fallbackMsg);
    stateManager.addMessageToHistory(phone, 'assistant', fallbackMsg);
  } catch (err) {
    console.error('processUserMessage error:', err);
    const fallbackMsg = "🌸 සමාවෙන්න, මට සුළු තාක්ෂණික බාධාවක් ඇතිවිය. කරුණාකර නැවත ඔබගේ පණිවිඩය එවන්න. 💕";
    await sendMessage(targetJid || phone, fallbackMsg);
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
          catProducts = products.filter(p => p.quantity > 0).slice(0, 15);
        } else {
          catProducts = catProducts.slice(0, 25);
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

        const categoryTitle = matchedCat ? matchedCat.name : (data.category || 'විලාසිතා');
        const webCatalogMsg = `✨ *${categoryTitle}* හි සියලුම Designs, Colors, Sizes සහ සම්පූර්ණ Stock විස්තර අපගේ Website එකෙන් සෘජුවම බලාගත හැක:
🔗 https://felliro.com/products

ඔබ මෙහි ඇති ඇඳුමකට කැමති නම්, එහි *නම* හෝ *ID අංකය* සමඟ අවශ්‍ය *Color*, *Size*, *Quantity* එවන්න. මම Order එක සකස් කර දෙන්නම්! 💕`;
        await sendMessage(targetJid || phone, webCatalogMsg);
        stateManager.addMessageToHistory(phone, 'assistant', webCatalogMsg);
      } catch (err) {
        console.error('Error sending category photos:', err);
      }
      break;

    case 'show_products':
    case 'send_product_photos':
      try {
        const { products, variants } = await getCachedCatalog();
        const topProds = products.filter(p => p.quantity > 0).slice(0, 20);
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

        const generalWebMsg = `✨ අපගේ සම්පූර්ණ ඇඳුම් එකතුව (Full Stock & Designs) සහ විස්තර අපගේ Website එකෙන් සෘජුවම බලාගත හැක:
🔗 https://felliro.com/products

කැමති ඇඳුමේ නම හෝ ID අංකය සමඟ Color, Size, Quantity එවන්න! 💕`;
        await sendMessage(targetJid || phone, generalWebMsg);
        stateManager.addMessageToHistory(phone, 'assistant', generalWebMsg);
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

    const confirmText = `🎉 *Payment Confirmed!* 🎉\n\nDear Customer,\nYour payment receipt for Order *#${orderNumber}* has been verified by our team. 💖\n\nYour package is now being packed and prepared for dispatch via Fardar Express! 🚚✨\n\n📄 Your official invoice is attached below.\n\nTrack your order anytime:\n🔗 https://felliro.com/tracking\n\nThank you for shopping with FelliRo! 💕`;

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
  setBotEnabled, isBotGloballyEnabled, escalateToHuman,
  processUserMessage, handleLocalRuleBasedFlow, handleIncomingBaileysMessage
};
