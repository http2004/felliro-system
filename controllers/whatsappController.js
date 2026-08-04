const db = require('../config/db');
const bot = require('../whatsapp/baileysBotService');
const stateManager = require('../whatsapp/conversationState');

// ─────────────────────────────────────────────
// GET /api/whatsapp/status
// ─────────────────────────────────────────────
exports.getStatus = async (req, res) => {
  try {
    const botEnabled = await bot.isBotGloballyEnabled();
    res.json({
      success: true,
      connected: bot.isReady(),
      bot_enabled: botEnabled,
      qr_available: !!bot.getQrCode()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get status' });
  }
};

// ─────────────────────────────────────────────
// GET /api/whatsapp/qr
// ─────────────────────────────────────────────
exports.getQrCode = async (req, res) => {
  const qr = bot.getQrCode();
  if (!qr) {
    if (bot.isReady()) {
      return res.json({ success: true, connected: true, qr: null, message: 'WhatsApp is already connected' });
    }
    return res.json({ success: false, message: 'QR code not available yet. Please wait...' });
  }
  res.json({ success: true, qr, connected: false });
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/toggle-bot
// Body: { enabled: true/false }
// ─────────────────────────────────────────────
exports.toggleBot = async (req, res) => {
  try {
    const { enabled } = req.body;
    await bot.setBotEnabled(enabled !== false);
    res.json({
      success: true,
      message: `WhatsApp bot is now ${enabled !== false ? 'ENABLED' : 'DISABLED'}`,
      bot_enabled: enabled !== false
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle bot' });
  }
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/restart
// Force restarts WhatsApp bot & generates fresh QR
// ─────────────────────────────────────────────
exports.restartBot = async (req, res) => {
  try {
    const result = await bot.restartBot();
    res.json({ success: true, message: result.message });
  } catch (err) {
    console.error('Restart bot error:', err);
    res.status(500).json({ success: false, message: 'Failed to restart bot' });
  }
};

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// GET /api/whatsapp/chats
// Returns all customer conversations with intelligence
// ─────────────────────────────────────────────
exports.getAllChats = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        wc.phone_number,
        COALESCE(
          wc.customer_name,
          (SELECT customer_name FROM orders WHERE whatsapp_id = wc.phone_number OR customer_phone = wc.phone_number OR whatsapp_id LIKE CONCAT('%', wc.phone_number, '%') ORDER BY id DESC LIMIT 1),
          'WhatsApp Customer'
        ) AS customer_name,
        COALESCE(
          (SELECT customer_phone FROM orders WHERE whatsapp_id = wc.phone_number OR customer_phone = wc.phone_number OR whatsapp_id LIKE CONCAT('%', wc.phone_number, '%') ORDER BY id DESC LIMIT 1),
          wc.phone_number
        ) AS display_phone,
        wc.state,
        wc.assigned_to_human,
        wc.order_id,
        wc.last_message_at,
        (SELECT message FROM whatsapp_chat_log WHERE phone_number = wc.phone_number OR phone_number = REPLACE(wc.phone_number, '@lid', '') ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT direction FROM whatsapp_chat_log WHERE phone_number = wc.phone_number OR phone_number = REPLACE(wc.phone_number, '@lid', '') ORDER BY created_at DESC LIMIT 1) AS last_direction,
        (SELECT sent_by FROM whatsapp_chat_log WHERE phone_number = wc.phone_number OR phone_number = REPLACE(wc.phone_number, '@lid', '') ORDER BY created_at DESC LIMIT 1) AS last_sent_by,
        (SELECT COUNT(*) FROM whatsapp_chat_log WHERE (phone_number = wc.phone_number OR phone_number = REPLACE(wc.phone_number, '@lid', '')) AND direction = 'incoming') AS total_messages,
        (SELECT order_number FROM orders WHERE whatsapp_id = wc.phone_number OR customer_phone = wc.phone_number OR whatsapp_id LIKE CONCAT('%', wc.phone_number, '%') ORDER BY id DESC LIMIT 1) AS latest_order_number,
        (SELECT order_status FROM orders WHERE whatsapp_id = wc.phone_number OR customer_phone = wc.phone_number OR whatsapp_id LIKE CONCAT('%', wc.phone_number, '%') ORDER BY id DESC LIMIT 1) AS latest_order_status,
        (SELECT total_amount FROM orders WHERE whatsapp_id = wc.phone_number OR customer_phone = wc.phone_number OR whatsapp_id LIKE CONCAT('%', wc.phone_number, '%') ORDER BY id DESC LIMIT 1) AS latest_order_total
      FROM whatsapp_conversations wc
      ORDER BY wc.last_message_at DESC
    `);
    res.json({ success: true, chats: rows });
  } catch (err) {
    console.error('Get chats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chats' });
  }
};

// ─────────────────────────────────────────────
// GET /api/whatsapp/chats/:phone
// Returns full chat history & order/customer CRM details
// ─────────────────────────────────────────────
exports.getChatHistory = async (req, res) => {
  try {
    const { phone } = req.params;
    const cleanPhone = (phone || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');

    const [messages] = await db.query(`
      SELECT * FROM whatsapp_chat_log 
      WHERE phone_number = ? OR phone_number = ? OR phone_number LIKE ?
      ORDER BY created_at ASC
      LIMIT 300
    `, [cleanPhone, phone, `%${cleanPhone}%`]);

    const [convInfo] = await db.query(`
      SELECT * FROM whatsapp_conversations WHERE phone_number = ? OR phone_number = ? LIMIT 1
    `, [cleanPhone, phone]);

    // Fetch related customer orders
    const [orders] = await db.query(`
      SELECT id, order_number, customer_name, customer_phone, customer_address, city, total_amount, order_status, payment_status, payment_method, receipt_url, created_at
      FROM orders 
      WHERE whatsapp_id = ? OR customer_phone = ? OR whatsapp_id LIKE ? OR customer_phone LIKE ?
      ORDER BY id DESC
      LIMIT 10
    `, [cleanPhone, cleanPhone, `%${cleanPhone}%`, `%${cleanPhone}%`]);

    // Fetch items for recent orders if available
    let orderItems = [];
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      try {
        const [items] = await db.query(`
          SELECT oi.order_id, oi.product_id, COALESCE(p.name, 'Item') as product_name, oi.size, oi.quantity, oi.price as unit_price, oi.total as total_price 
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id IN (?)
        `, [orderIds]);
        orderItems = items;
      } catch(itemErr) {
        console.warn('Could not load order items:', itemErr.message);
      }
    }

    // Get in-memory bot state
    const memState = stateManager.getConversation(cleanPhone);

    res.json({
      success: true,
      messages,
      conversation: convInfo[0] || null,
      state: memState ? memState.state : 'idle',
      cart: memState ? memState.cart : [],
      customerData: memState ? memState.customerData : {},
      orders: orders.map(o => ({
        ...o,
        items: orderItems.filter(i => i.order_id === o.id)
      }))
    });
  } catch (err) {
    console.error('Get chat history error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/chats/:phone/assign-human
// ─────────────────────────────────────────────
exports.assignToHuman = async (req, res) => {
  try {
    const { phone } = req.params;
    const cleanPhone = (phone || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    stateManager.assignToHuman(cleanPhone);

    await db.query(
      `UPDATE whatsapp_conversations SET assigned_to_human = 1 WHERE phone_number = ? OR phone_number = ?`,
      [cleanPhone, phone]
    );

    // Notify customer politely
    await bot.sendMessage(
      phone,
      `👋 *You are now connected with our FelliRo Customer Support Team.* 💬\nAn agent will assist you shortly!\n\n_අපගේ සහායක කණ්ඩායම ඉතා ඉක්මනින් ඔබ හා සම්බන්ධ වනු ඇත._`
    );

    res.json({ success: true, message: `Chat with ${cleanPhone} assigned to human agent` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign chat' });
  }
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/chats/:phone/assign-bot
// ─────────────────────────────────────────────
exports.assignToBot = async (req, res) => {
  try {
    const { phone } = req.params;
    const cleanPhone = (phone || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    stateManager.assignToBot(cleanPhone);

    await db.query(
      `UPDATE whatsapp_conversations SET assigned_to_human = 0 WHERE phone_number = ? OR phone_number = ?`,
      [cleanPhone, phone]
    );

    // Notify customer
    await bot.sendMessage(
      phone,
      `✨ *You are back with ශාශා (Shasha), your AI fashion consultant!* 🤖\nType anytime to browse our dresses, check sizes, or place an order! 💕\n\n_ඔබට අවශ්‍ය ඕනෑම ඇඳුමක්, මිල ගණන් හෝ ඇණවුමක් සඳහා මට මෙතැනින් පණිවිඩයක් එවන්න._`
    );

    res.json({ success: true, message: `Chat with ${cleanPhone} returned to bot` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign to bot' });
  }
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/chats/:phone/reset
// Resets the conversation, cart & returns to bot
// ─────────────────────────────────────────────
exports.resetChat = async (req, res) => {
  try {
    const { phone } = req.params;
    const cleanPhone = (phone || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    stateManager.resetConversation(cleanPhone);

    await db.query(
      `UPDATE whatsapp_conversations SET state = 'idle', assigned_to_human = 0, cart_data = NULL WHERE phone_number = ? OR phone_number = ? OR phone_number LIKE ?`,
      [cleanPhone, phone, `%${cleanPhone}%`]
    );

    res.json({ success: true, message: `Conversation session and cart reset for ${cleanPhone}` });
  } catch (err) {
    console.error('Reset chat error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset conversation' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/whatsapp/chats/:phone
// Completely deletes chat history and conversation for a customer
// ─────────────────────────────────────────────
exports.deleteChat = async (req, res) => {
  try {
    const { phone } = req.params;
    const cleanPhone = (phone || '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
    
    stateManager.resetConversation(cleanPhone);

    await db.query(`DELETE FROM whatsapp_chat_log WHERE phone_number = ? OR phone_number = ? OR phone_number LIKE ?`, [cleanPhone, phone, `%${cleanPhone}%`]);
    await db.query(`DELETE FROM whatsapp_conversations WHERE phone_number = ? OR phone_number = ? OR phone_number LIKE ?`, [cleanPhone, phone, `%${cleanPhone}%`]);

    res.json({ success: true, message: `Chat with ${cleanPhone} deleted permanently` });
  } catch (err) {
    console.error('Delete chat error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete chat' });
  }
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/chats/clear-all
// Clears ALL conversations and chat logs
// ─────────────────────────────────────────────
exports.clearAllChats = async (req, res) => {
  try {
    await db.query(`TRUNCATE TABLE whatsapp_chat_log`);
    await db.query(`TRUNCATE TABLE whatsapp_conversations`);

    const allConvs = stateManager.getAllConversations();
    for (const c of allConvs) {
      stateManager.resetConversation(c.phone);
    }

    res.json({ success: true, message: 'All chat data cleared successfully' });
  } catch (err) {
    console.error('Clear all chats error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear all chats' });
  }
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/chats/:phone/send
// Admin sends message to customer
// Body: { message: "..." } or file upload
// ─────────────────────────────────────────────
exports.sendAdminMessage = async (req, res) => {
  try {
    const { phone } = req.params;
    const { message } = req.body;

    if (req.file) {
      // Send file via Baileys
      await bot.sendAdminMediaMessage(
        phone,
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        message || ''
      );
    } else if (message) {
      await bot.sendMessageAsAdmin(phone, message);
    }

    res.json({ success: true, message: 'Message sent' });
  } catch (err) {
    console.error('Send admin message error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// ─────────────────────────────────────────────
// GET /api/whatsapp/receipts/:orderId
// ─────────────────────────────────────────────
exports.getOrderReceipt = async (req, res) => {
  try {
    const { orderId } = req.params;
    const [receipts] = await db.query(
      `SELECT * FROM order_receipts WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );
    if (receipts.length === 0) {
      return res.json({ success: false, message: 'No receipt found for this order' });
    }
    res.json({ success: true, receipt: receipts[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch receipt' });
  }
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/public-upload-receipt
// Customer public portal upload
// ─────────────────────────────────────────────
exports.publicUploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No receipt file provided' });
    }

    const { orderNumber, phone } = req.body;
    if (!orderNumber && !phone) {
      return res.status(400).json({ success: false, message: 'Order number or phone is required' });
    }

    // Find order
    let order = null;
    if (orderNumber) {
      const cleanNum = orderNumber.trim().replace('#', '');
      const [rows] = await db.query(
        `SELECT id, order_number, customer_name, customer_phone, total_amount, order_status FROM orders WHERE order_number = ? OR order_number = ? ORDER BY id DESC LIMIT 1`,
        [cleanNum, `#${cleanNum}`]
      );
      if (rows.length > 0) order = rows[0];
    }

    if (!order && phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const [rows] = await db.query(
        `SELECT id, order_number, customer_name, customer_phone, total_amount, order_status FROM orders WHERE customer_phone LIKE ? ORDER BY id DESC LIMIT 1`,
        [`%${cleanPhone.slice(-9)}%`]
      );
      if (rows.length > 0) order = rows[0];
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found. Please verify your Order Number.' });
    }

    const publicUrl = `/uploads/receipts/${req.file.filename}`;
    const ext = req.file.filename.split('.').pop().toLowerCase();
    const fileType = ext === 'pdf' ? 'pdf' : 'image';
    const wasCancelled = (order.order_status === 'cancelled');

    // Insert receipt
    await db.query(
      `INSERT INTO order_receipts (order_id, file_path, file_type, uploaded_via) VALUES (?, ?, ?, 'web_portal')`,
      [order.id, publicUrl, fileType]
    );

    // Update order status & reactivate if previously cancelled
    if (wasCancelled) {
      await db.query(
        `UPDATE orders SET order_status = 'pending', payment_status = 'pending', receipt_url = ?, updated_at = NOW() WHERE id = ?`,
        [publicUrl, order.id]
      );

      await db.query(
        `INSERT INTO order_status_history (order_id, status, note, updated_by) VALUES (?, 'pending', 'Receipt re-submitted via Customer Web Portal after cancellation - Order reactivated to Pending', 1)`,
        [order.id]
      ).catch(() => {});

      // Re-deduct product and variant stock
      const [items] = await db.query(`SELECT product_id, quantity, size, color FROM order_items WHERE order_id = ?`, [order.id]);
      for (const item of items) {
        const qty = parseInt(item.quantity) || 1;
        await db.query(`UPDATE products SET quantity = GREATEST(0, quantity - ?), total_sold = total_sold + ? WHERE id = ?`, [qty, qty, item.product_id]).catch(() => {});
        if (item.size && item.color && item.size !== '-' && item.color !== '-') {
          await db.query(`UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND size = ? AND color = ? LIMIT 1`, [qty, item.product_id, item.size, item.color]).catch(() => {});
        } else if (item.size && item.size !== '-') {
          await db.query(`UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND size = ? LIMIT 1`, [qty, item.product_id, item.size]);
        } else if (item.color && item.color !== '-') {
          await db.query(`UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND color = ? LIMIT 1`, [qty, item.product_id, item.color]);
        }
        await db.query(
          `INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, reference_id, note, created_by, created_at)
           VALUES (?, 0, ?, 'sale', ?, ?, 1, NOW())`,
          [item.product_id, qty, order.id, `Stock re-deducted for reactivated Order #${order.order_number}`]
        ).catch(() => {});
      }
      console.log(`🔄 [WebPortal] Reactivated cancelled Order #${order.order_number} back to pending status.`);
    } else {
      await db.query(`UPDATE orders SET receipt_url = ?, payment_status = 'pending', updated_at = NOW() WHERE id = ?`, [publicUrl, order.id]);
    }

    // Notify WhatsApp Bot state
    const customerPhone = order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, '') : null;
    if (customerPhone) {
      stateManager.setState(customerPhone, stateManager.STATES.RECEIPT_SUBMITTED);
      try {
        await bot.sendMessage(
          customerPhone,
          `✅ *Receipt Received!*\n\nWe have received your payment slip for Order *#${order.order_number}*.\nOur team will verify it shortly and dispatch your package. 🛍️\n\nThank you for shopping with FelliRo Clothing! 🤍`
        );
      } catch (err) {}
    }

    // Real-time socket broadcast
    try {
      const io = req.app.get('io');
      if (io) {
        if (wasCancelled) {
          io.emit('order_status_updated', {
            orderId: order.id,
            order_number: order.order_number,
            order_status: 'pending',
            payment_status: 'pending',
            receipt_url: publicUrl
          });
        }
        io.emit('new_order_receipt', {
          orderId: order.id,
          orderNumber: order.order_number,
          receiptUrl: publicUrl,
          fileType: fileType,
          customerPhone: customerPhone,
          reactivated: wasCancelled
        });
      }
    } catch (socketErr) {}

    res.json({
      success: true,
      message: 'Receipt uploaded successfully!',
      orderNumber: order.order_number,
      receiptUrl: publicUrl
    });
  } catch (err) {
    console.error('Public receipt upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload receipt. Please try again.' });
  }
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/receipts/:orderId/upload
// Admin manual receipt attach/replace
// ─────────────────────────────────────────────
exports.adminUploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No receipt file uploaded' });
    }
    const { orderId } = req.params;
    const [orders] = await db.query(`SELECT id, order_number, customer_phone, order_status FROM orders WHERE id = ?`, [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentOrder = orders[0];
    const publicUrl = `/uploads/receipts/${req.file.filename}`;
    const ext = req.file.filename.split('.').pop().toLowerCase();
    const fileType = ext === 'pdf' ? 'pdf' : 'image';
    const wasCancelled = (currentOrder.order_status === 'cancelled');

    await db.query(
      `INSERT INTO order_receipts (order_id, file_path, file_type, uploaded_via) VALUES (?, ?, ?, 'admin')`,
      [orderId, publicUrl, fileType]
    );

    if (wasCancelled) {
      await db.query(
        `UPDATE orders SET order_status = 'pending', payment_status = 'pending', receipt_url = ?, updated_at = NOW() WHERE id = ?`,
        [publicUrl, orderId]
      );
      await db.query(
        `INSERT INTO order_status_history (order_id, status, note, updated_by) VALUES (?, 'pending', 'Receipt uploaded by admin - Order reactivated to Pending', ?)`,
        [orderId, req.user ? req.user.id : 1]
      ).catch(() => {});

      // Re-deduct product and variant stock
      const [items] = await db.query(`SELECT product_id, quantity, size, color FROM order_items WHERE order_id = ?`, [orderId]);
      for (const item of items) {
        const qty = parseInt(item.quantity) || 1;
        await db.query(`UPDATE products SET quantity = GREATEST(0, quantity - ?), total_sold = total_sold + ? WHERE id = ?`, [qty, qty, item.product_id]).catch(() => {});
        if (item.size && item.color && item.size !== '-' && item.color !== '-') {
          await db.query(`UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND size = ? AND color = ? LIMIT 1`, [qty, item.product_id, item.size, item.color]).catch(() => {});
        } else if (item.size && item.size !== '-') {
          await db.query(`UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND size = ? LIMIT 1`, [qty, item.product_id, item.size]);
        } else if (item.color && item.color !== '-') {
          await db.query(`UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND color = ? LIMIT 1`, [qty, item.product_id, item.color]);
        }
        await db.query(
          `INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, reference_id, note, created_by, created_at)
           VALUES (?, 0, ?, 'sale', ?, ?, ?, NOW())`,
          [item.product_id, qty, orderId, `Stock re-deducted for reactivated Order #${currentOrder.order_number}`, req.user ? req.user.id : 1]
        ).catch(() => {});
      }
      console.log(`🔄 [AdminUpload] Reactivated cancelled Order #${currentOrder.order_number} back to pending status.`);
    } else {
      await db.query(`UPDATE orders SET receipt_url = ?, payment_status = 'pending', updated_at = NOW() WHERE id = ?`, [publicUrl, orderId]);
    }

    try {
      const io = req.app.get('io');
      if (io) {
        if (wasCancelled) {
          io.emit('order_status_updated', {
            orderId: currentOrder.id,
            order_number: currentOrder.order_number,
            order_status: 'pending',
            payment_status: 'pending',
            receipt_url: publicUrl
          });
        }
        io.emit('new_order_receipt', {
          orderId: currentOrder.id,
          orderNumber: currentOrder.order_number,
          receiptUrl: publicUrl,
          fileType: fileType,
          customerPhone: currentOrder.customer_phone,
          reactivated: wasCancelled
        });
      }
    } catch (e) {}

    res.json({ success: true, message: 'Receipt attached successfully', publicUrl });
  } catch (err) {
    console.error('Admin receipt upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to attach receipt' });
  }
};

// ─────────────────────────────────────────────
// GET /api/whatsapp/webhook (Meta Verification)
// ─────────────────────────────────────────────
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_WA_VERIFY_TOKEN || 'felliro_meta_webhook_secret_2026';
  console.log(`🔍 [Meta Webhook Verification] mode=${mode}, token=${token}`);

  if (mode === 'subscribe' && (token === expectedToken || token === 'felliro_meta_webhook_secret_2026')) {
    console.log('✅ Meta Webhook verified successfully!');
    return res.status(200).send(challenge);
  }
  console.warn(`❌ Meta Webhook token mismatch: received "${token}", expected "${expectedToken}"`);
  res.status(403).send('Forbidden');
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/webhook (Meta Incoming Messages)
// ─────────────────────────────────────────────
exports.handleWebhook = async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || !value.messages) continue;

        for (const msg of value.messages) {
          const from = msg.from;
          const msgType = msg.type;

          console.log(`📩 [Cloud API] Received ${msgType} message from ${from}`);

          if (msgType === 'image' || msgType === 'document') {
            const mediaId = msgType === 'image' ? msg.image?.id : msg.document?.id;
            const caption = (msgType === 'image' ? msg.image?.caption : msg.document?.caption) || '';

            const cloudService = require('../whatsapp/cloudService');
            const stateManager = require('../whatsapp/conversationState');
            const conv = stateManager.getConversation(from);

            const downloaded = await cloudService.downloadMedia(mediaId, conv.orderNumber || 'receipt');
            if (downloaded.success) {
              const publicUrl = downloaded.publicUrl;
              const fileType = downloaded.fileType;

              let orderId = conv.orderId;
              let orderNumber = conv.orderNumber;

              if (!orderId) {
                const cleanPhone = (from || '').replace(/[^0-9]/g, '');
                const [recentOrders] = await db.query(
                  `SELECT id, order_number, order_status FROM orders 
                   WHERE (whatsapp_id LIKE ? OR customer_phone LIKE ? OR customer_phone = ?)
                   ORDER BY id DESC LIMIT 1`,
                  [`%${cleanPhone.slice(-9)}%`, `%${cleanPhone.slice(-9)}%`, from]
                );
                if (recentOrders.length > 0) {
                  orderId = recentOrders[0].id;
                  orderNumber = recentOrders[0].order_number;
                  conv.orderId = orderId;
                  conv.orderNumber = orderNumber;
                }
              }

              if (!orderId) {
                const orderRes = await bot.createOrderFromBot(from);
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

                  await db.query(
                    `INSERT INTO order_receipts (order_id, file_path, file_type, uploaded_via) VALUES (?, ?, ?, 'whatsapp_cloud')`,
                    [orderId, publicUrl, fileType]
                  );

                  if (wasCancelled) {
                    await db.query(
                      `UPDATE orders SET order_status = 'pending', payment_status = 'pending', receipt_url = ?, updated_at = NOW() WHERE id = ?`,
                      [publicUrl, orderId]
                    );
                    await db.query(
                      `INSERT INTO order_status_history (order_id, status, note, updated_by) VALUES (?, 'pending', 'Customer re-submitted payment receipt via WhatsApp Cloud API after cancellation - Order reactivated to Pending', 1)`,
                      [orderId]
                    ).catch(() => {});

                    // Re-deduct stock
                    const [items] = await db.query(`SELECT product_id, quantity, size, color FROM order_items WHERE order_id = ?`, [orderId]);
                    for (const item of items) {
                      const qty = parseInt(item.quantity) || 1;
                      await db.query(`UPDATE products SET quantity = GREATEST(0, quantity - ?), total_sold = total_sold + ? WHERE id = ?`, [qty, qty, item.product_id]).catch(() => {});
                      if (item.size && item.color && item.size !== '-' && item.color !== '-') {
                        await db.query(`UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND size = ? AND color = ? LIMIT 1`, [qty, item.product_id, item.size, item.color]).catch(() => {});
                      } else if (item.size && item.size !== '-') {
                        await db.query(`UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND size = ? LIMIT 1`, [qty, item.product_id, item.size]);
                      } else if (item.color && item.color !== '-') {
                        await db.query(`UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND color = ? LIMIT 1`, [qty, item.product_id, item.color]);
                      }
                      await db.query(
                        `INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, reference_id, note, created_by, created_at)
                         VALUES (?, 0, ?, 'sale', ?, ?, 1, NOW())`,
                        [item.product_id, qty, orderId, `Stock re-deducted for reactivated Order #${orderNumber}`]
                      ).catch(() => {});
                    }
                  } else {
                    await db.query(`UPDATE orders SET receipt_url = ?, payment_status = 'pending', updated_at = NOW() WHERE id = ?`, [publicUrl, orderId]);
                  }
                }
              }

              await bot.saveChatLog(from, 'incoming', `[Receipt: ${downloaded.fileName}] ${caption}`, publicUrl, fileType, 'customer');
              stateManager.setState(from, stateManager.STATES.RECEIPT_SUBMITTED);

              await cloudService.sendMessage(
                from,
                `✅ Thank you! We received your payment receipt for Order *#${orderNumber || 'your order'}*.\nOur team will verify it shortly and dispatch your package! 💕`
              );
            }
          } else if (msgType === 'text') {
            const text = msg.text?.body || '';
            const conv = stateManager.getConversation(from);
            await bot.processUserMessage(from, text, conv);
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Error handling Meta Webhook:', err);
  }
};

// ─────────────────────────────────────────────
// POST /api/whatsapp/ai-extract-order
// Body: { phone?: string, text?: string }
// ─────────────────────────────────────────────
exports.aiExtractOrder = async (req, res) => {
  try {
    const aiExtractionService = require('../services/aiExtractionService');
    const phone = req.params.phone || req.body.phone || '';
    const customText = req.body.text || '';

    let messages = [];

    if (customText) {
      messages = customText;
    } else if (phone) {
      const cleanPhone = phone.replace('@lid', '').replace('@s.whatsapp.net', '').replace('@c.us', '').trim();
      const phoneLid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
      const phoneAlt = `${cleanPhone}@lid`;

      const [rows] = await db.query(`
        SELECT direction, sent_by, message, media_url, created_at 
        FROM whatsapp_chat_log 
        WHERE phone_number = ? OR phone_number = ? OR phone_number = ?
        ORDER BY id DESC LIMIT 40
      `, [cleanPhone, phoneLid, phoneAlt]);

      messages = rows.reverse();
    }

    if (!messages || (Array.isArray(messages) && messages.length === 0 && !customText)) {
      return res.status(400).json({ success: false, message: 'No chat messages found for this conversation yet' });
    }

    const result = await aiExtractionService.extractOrderFromChat(messages, phone);
    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('Error in aiExtractOrder endpoint:', err);
    res.status(500).json({ success: false, message: 'Internal server error: ' + err.message });
  }
};
