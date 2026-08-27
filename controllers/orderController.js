const db = require('../config/db');
const { generateInvoice } = require('../services/pdfService');
const { fetchCourierTracking } = require('../services/courierService');

// WhatsApp bot notification (lazy-loaded to avoid circular dependency)
function getBotService() {
  try { return require('../whatsapp/baileysBotService'); } catch(e) { return null; }
}

// Track Order Public Endpoint
exports.trackOrder = async (req, res) => {
  try {
    const orderNumber = req.params.order_number.trim().toUpperCase();

    const [orders] = await db.query(`
      SELECT * FROM orders WHERE order_number = ?
    `, [orderNumber]);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orders[0];

    const [items] = await db.query(`
      SELECT oi.*, p.name AS product_name, pi.image_url AS product_image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE oi.order_id = ?
    `, [order.id]);

    const [rawHistory] = await db.query(`
      SELECT status, note, created_at
      FROM order_status_history
      WHERE order_id = ?
      ORDER BY id ASC
    `, [order.id]);

    // Deduplicate consecutive identical statuses in history
    const history = [];
    let lastSeenStatus = null;
    for (const h of rawHistory) {
      if (h.status !== lastSeenStatus) {
        history.push(h);
        lastSeenStatus = h.status;
      }
    }

    // Live Courier tracking lookup if tracking number is present
    let courierTracking = null;
    if (order.tracking_number && order.tracking_number.trim()) {
      try {
        courierTracking = await fetchCourierTracking(order.tracking_number.trim());
      } catch (cErr) {
        console.error('Error fetching live courier tracking for order:', order.order_number, cErr);
      }
    }

    // Sanitize order object for public tracking to protect customer privacy
    const maskedPhone = order.customer_phone ? order.customer_phone.replace(/(\d{3})\d+(\d{3})/, '$1****$2') : '';
    const safeOrder = {
      id: order.id,
      order_number: order.order_number,
      order_status: order.order_status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      customer_name: order.customer_name ? (order.customer_name.split(' ')[0] + ' ***') : 'Customer',
      customer_phone: maskedPhone,
      city: order.city,
      province: order.province,
      total_amount: order.total_amount,
      delivery_fee: order.delivery_fee,
      tracking_number: order.tracking_number,
      courier_tracking: courierTracking,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: items.map(i => ({
        product_name: i.product_name,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        price: i.price,
        total: i.total,
        product_image: i.product_image
      })),
      history: history
    };

    res.json({ success: true, order: safeOrder });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve order tracking info' });
  }
};

// Live Courier Tracking Endpoint (Public & Admin)
exports.getCourierTracking = async (req, res) => {
  try {
    const trackingNumber = req.params.tracking_number;
    if (!trackingNumber || !trackingNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Tracking number is required' });
    }

    const courierResult = await fetchCourierTracking(trackingNumber.trim());
    res.json(courierResult);
  } catch (error) {
    console.error('Error fetching courier tracking:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch courier tracking status' });
  }
};

// Create Order (Public WhatsApp Checkout or POS Cashier Order)
exports.createOrder = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { customer_name, customer_phone, customer_email, customer_address, city, province, items, payment_method, delivery_notes, delivery_fee } = req.body;

    if (!customer_name || !customer_phone || !items || items.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Customer name, phone, and items are required' });
    }

    const orderNum = `FELLIRO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let itemsSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const [prod] = await connection.query(`SELECT id, name, price, quantity FROM products WHERE id = ?`, [item.product_id]);
      if (prod.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: `Product ID ${item.product_id} not found` });
      }

      const product = prod[0];
      const qty = parseInt(item.quantity || 1);
      const size = item.size || '-';
      const color = item.color || '-';

      // Check main product stock
      if (product.quantity < qty) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: `Insufficient stock for '${product.name}'. Available: ${product.quantity}` });
      }

      // Check variant stock if variants exist
      const [allVariants] = await connection.query(
        `SELECT id, size, color, quantity FROM product_variants WHERE product_id = ?`,
        [product.id]
      );

      let targetVariant = null;
      if (allVariants.length > 0) {
        if (size !== '-' && color !== '-') {
          targetVariant = allVariants.find(v =>
            (v.size || '').trim().toLowerCase() === size.trim().toLowerCase() &&
            (v.color || '').trim().toLowerCase() === color.trim().toLowerCase()
          );
        }
        if (!targetVariant && size !== '-' && color !== '-') {
          targetVariant = allVariants.find(v =>
            (v.size || '').trim().toLowerCase() === size.trim().toLowerCase() &&
            ((v.color || '').trim().toLowerCase().includes(color.trim().toLowerCase()) ||
             color.trim().toLowerCase().includes((v.color || '').trim().toLowerCase()))
          );
        }
        if (!targetVariant && size !== '-') {
          targetVariant = allVariants.find(v => (v.size || '').trim().toLowerCase() === size.trim().toLowerCase());
        }
        if (!targetVariant && color !== '-') {
          targetVariant = allVariants.find(v => (v.color || '').trim().toLowerCase() === color.trim().toLowerCase());
        }
        if (!targetVariant) {
          targetVariant = allVariants.find(v => v.quantity >= qty) || allVariants[0];
        }

        if (targetVariant && targetVariant.quantity < qty) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for '${product.name}' (${targetVariant.color ? targetVariant.color + ' ' : ''}${targetVariant.size ? targetVariant.size : ''}). Available: ${targetVariant.quantity}`
          });
        }
      }

      const finalSize = targetVariant && targetVariant.size ? targetVariant.size : size;
      const finalColor = targetVariant && targetVariant.color ? targetVariant.color : color;
      const itemTotal = product.price * qty;
      itemsSubtotal += itemTotal;

      validatedItems.push({
        product_id: product.id,
        quantity: qty,
        price: product.price,
        total: itemTotal,
        size: finalSize,
        color: finalColor
      });

      // Deduct main stock
      await connection.query(`UPDATE products SET quantity = GREATEST(0, quantity - ?), total_sold = total_sold + ? WHERE id = ?`, [qty, qty, product.id]);

      // Deduct variant stock for ONLY the matched single variant by ID
      if (targetVariant && targetVariant.id) {
        await connection.query(`
          UPDATE product_variants 
          SET quantity = GREATEST(0, quantity - ?) 
          WHERE id = ?
        `, [qty, targetVariant.id]);
      }

      // Inventory Log
      await connection.query(`
        INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, note, created_by)
        VALUES (?, ?, ?, 'sale', ?, ?)
      `, [product.id, product.quantity, Math.max(0, product.quantity - qty), `Sale on Order ${orderNum}${targetVariant ? ` (${targetVariant.color || ''} ${targetVariant.size || ''})` : ''}`, req.user ? req.user.id : null]);
    }

    const deliveryFeeNum = parseFloat(delivery_fee) || 0;
    const grandTotal = itemsSubtotal + deliveryFeeNum;

    // Insert Order
    const [orderResult] = await connection.query(`
      INSERT INTO orders
        (order_number, customer_name, customer_phone, customer_email, customer_address, city, province, total_amount, net_amount, delivery_fee, payment_method, delivery_notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [orderNum, customer_name, customer_phone, customer_email || '', customer_address || '', city || 'Colombo', province || 'Western', grandTotal, grandTotal, deliveryFeeNum, payment_method || 'whatsapp', delivery_notes || '', req.user ? req.user.id : null]);

    const orderId = orderResult.insertId;

    for (const item of validatedItems) {
      await connection.query(`
        INSERT INTO order_items (order_id, product_id, quantity, price, total, size, color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [orderId, item.product_id, item.quantity, item.price, item.total, item.size, item.color]);
    }

    await connection.query(`
      INSERT INTO order_status_history (order_id, status, note, updated_by)
      VALUES (?, 'pending', 'Order placed successfully', ?)
    `, [orderId, req.user ? req.user.id : null]);

    await connection.commit();
    connection.release();

    res.json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: orderId,
        order_number: orderNum,
        total_amount: grandTotal
      }
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

// Admin List Orders
exports.getAdminOrders = async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT o.*, COUNT(oi.id) AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND o.order_status = ?`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ` GROUP BY o.id ORDER BY o.id DESC`;

    const [orders] = await db.query(sql, params);
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin orders' });
  }
};

// Admin Update Full Order Details
exports.updateOrder = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const orderId = req.params.id;
    const { customer_name, customer_phone, customer_email, customer_address, city, province, delivery_fee, tracking_number, delivery_notes, order_status, items } = req.body;

    const [existing] = await connection.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (existing.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentOrder = existing[0];
    const newDeliveryFee = delivery_fee !== undefined ? parseFloat(delivery_fee) || 0 : parseFloat(currentOrder.delivery_fee || 0);
    
    let itemsSubtotal = 0;

    // Handle Item Edits if items array is provided
    if (items && Array.isArray(items)) {
      // Fetch existing items to restore stock
      const [oldItems] = await connection.query(`SELECT * FROM order_items WHERE order_id = ?`, [orderId]);
      
      for (const oldItem of oldItems) {
        // Restore main product stock
        await connection.query(`UPDATE products SET quantity = quantity + ?, total_sold = GREATEST(0, total_sold - ?) WHERE id = ?`, [oldItem.quantity, oldItem.quantity, oldItem.product_id]);
        
        // Find variant to restore
        const [variants] = await connection.query(`SELECT id FROM product_variants WHERE product_id = ? AND (size = ? OR size = ?) AND (color = ? OR color = ?)`, [oldItem.product_id, oldItem.size, '-', oldItem.color, '-']);
        if (variants.length > 0) {
          // Just restore on the first match if multiple
          await connection.query(`UPDATE product_variants SET quantity = quantity + ? WHERE id = ?`, [oldItem.quantity, variants[0].id]);
        }
        
        // Inventory Log
        await connection.query(`
          INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, note, created_by)
          VALUES (?, (SELECT quantity - ? FROM products WHERE id = ?), (SELECT quantity FROM products WHERE id = ?), 'correction', ?, ?)
        `, [oldItem.product_id, oldItem.quantity, oldItem.product_id, oldItem.product_id, `Restored from Order ${currentOrder.order_number} Edit`, req.user ? req.user.id : null]);
      }

      // Delete old items
      await connection.query(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);

      // Deduct new items
      const validatedItems = [];
      for (const item of items) {
        const [prod] = await connection.query(`SELECT id, name, price, quantity FROM products WHERE id = ?`, [item.product_id]);
        if (prod.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ success: false, message: `Product ID ${item.product_id} not found` });
        }

        const product = prod[0];
        const qty = parseInt(item.quantity || 1);
        const size = item.size || '-';
        const color = item.color || '-';

        if (product.quantity < qty) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ success: false, message: `Insufficient stock for '${product.name}'. Available: ${product.quantity}` });
        }

        const [allVariants] = await connection.query(`SELECT id, size, color, quantity FROM product_variants WHERE product_id = ?`, [product.id]);

        let targetVariant = null;
        if (allVariants.length > 0) {
          if (size !== '-' && color !== '-') {
            targetVariant = allVariants.find(v => (v.size || '').trim().toLowerCase() === size.trim().toLowerCase() && (v.color || '').trim().toLowerCase() === color.trim().toLowerCase());
          }
          if (!targetVariant && size !== '-' && color !== '-') {
            targetVariant = allVariants.find(v => (v.size || '').trim().toLowerCase() === size.trim().toLowerCase() && ((v.color || '').trim().toLowerCase().includes(color.trim().toLowerCase()) || color.trim().toLowerCase().includes((v.color || '').trim().toLowerCase())));
          }
          if (!targetVariant && size !== '-') {
            targetVariant = allVariants.find(v => (v.size || '').trim().toLowerCase() === size.trim().toLowerCase());
          }
          if (!targetVariant && color !== '-') {
            targetVariant = allVariants.find(v => (v.color || '').trim().toLowerCase() === color.trim().toLowerCase());
          }
          if (!targetVariant) {
            targetVariant = allVariants.find(v => v.quantity >= qty) || allVariants[0];
          }

          if (targetVariant && targetVariant.quantity < qty) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: `Insufficient stock for '${product.name}' (${targetVariant.color ? targetVariant.color + ' ' : ''}${targetVariant.size ? targetVariant.size : ''}). Available: ${targetVariant.quantity}` });
          }
        }

        const finalSize = targetVariant && targetVariant.size ? targetVariant.size : size;
        const finalColor = targetVariant && targetVariant.color ? targetVariant.color : color;
        const itemTotal = product.price * qty;
        itemsSubtotal += itemTotal;

        validatedItems.push({
          product_id: product.id,
          quantity: qty,
          price: product.price,
          total: itemTotal,
          size: finalSize,
          color: finalColor
        });

        // Deduct main stock
        await connection.query(`UPDATE products SET quantity = GREATEST(0, quantity - ?), total_sold = total_sold + ? WHERE id = ?`, [qty, qty, product.id]);

        // Deduct variant stock
        if (targetVariant && targetVariant.id) {
          await connection.query(`UPDATE product_variants SET quantity = GREATEST(0, quantity - ?) WHERE id = ?`, [qty, targetVariant.id]);
        }

        // Inventory Log
        await connection.query(`
          INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, note, created_by)
          VALUES (?, (SELECT quantity + ? FROM products WHERE id = ?), (SELECT quantity FROM products WHERE id = ?), 'sale', ?, ?)
        `, [product.id, qty, product.id, product.id, `Sale on Order Edit ${currentOrder.order_number}`, req.user ? req.user.id : null]);
      }

      // Insert new items
      for (const item of validatedItems) {
        await connection.query(`
          INSERT INTO order_items (order_id, product_id, quantity, price, total, size, color)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [orderId, item.product_id, item.quantity, item.price, item.total, item.size, item.color]);
      }
    } else {
      // No items array passed, keep existing items sum
      const [oldItemsRes] = await connection.query(`SELECT SUM(total) AS items_total FROM order_items WHERE order_id = ?`, [orderId]);
      itemsSubtotal = parseFloat(oldItemsRes[0].items_total || 0);
    }

    const newTotalAmount = itemsSubtotal + newDeliveryFee;

    await connection.query(`
      UPDATE orders
      SET customer_name = ?, customer_phone = ?, customer_email = ?, customer_address = ?, city = ?, province = ?, delivery_fee = ?, total_amount = ?, net_amount = ?, tracking_number = ?, delivery_notes = ?, order_status = ?
      WHERE id = ?
    `, [
      customer_name || currentOrder.customer_name, customer_phone || currentOrder.customer_phone, customer_email || currentOrder.customer_email || '', customer_address || currentOrder.customer_address || '', city || currentOrder.city || 'Colombo', province || currentOrder.province || 'Western', newDeliveryFee, newTotalAmount, newTotalAmount, tracking_number || currentOrder.tracking_number || null, delivery_notes || currentOrder.delivery_notes || '', order_status || currentOrder.order_status, orderId
    ]);

    await connection.query(`
      INSERT INTO order_status_history (order_id, status, note, updated_by)
      VALUES (?, ?, ?, ?)
    `, [orderId, order_status || currentOrder.order_status, 'Order details updated by admin/cashier', req.user ? req.user.id : 1]);

    await connection.commit();
    connection.release();
    res.json({ success: true, message: 'Order details updated successfully!' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, message: 'Failed to update order details' });
  }
};

// Admin Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, note, tracking_number } = req.body;

    const [existing] = await db.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentOrder = existing[0];

    let updateSql = `UPDATE orders SET order_status = ?`;
    const updateParams = [status];

    if (tracking_number) {
      updateSql += `, tracking_number = ?`;
      updateParams.push(tracking_number);
    }
    updateSql += ` WHERE id = ?`;
    updateParams.push(orderId);

    await db.query(updateSql, updateParams);

    // Avoid duplicate consecutive status history entries
    const [lastHistory] = await db.query(
      `SELECT status FROM order_status_history WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
      [orderId]
    );

    if (!lastHistory.length || lastHistory[0].status !== status) {
      await db.query(`
        INSERT INTO order_status_history (order_id, status, note, updated_by)
        VALUES (?, ?, ?, ?)
      `, [orderId, status, note || `Status updated to ${status}`, req.user ? req.user.id : 1]);
    }

    // Automatic Stock Restoration on Cancellation
    if (status === 'cancelled' && currentOrder.order_status !== 'cancelled') {
      const [items] = await db.query(`SELECT product_id, quantity, size, color FROM order_items WHERE order_id = ?`, [orderId]);
      for (const item of items) {
        // Restore main product stock & total_sold
        await db.query(`UPDATE products SET quantity = quantity + ?, total_sold = GREATEST(0, total_sold - ?) WHERE id = ?`, [item.quantity, item.quantity, item.product_id]);
        
        // Restore variant stock for matched variant
        if (item.size && item.color && item.size !== '-' && item.color !== '-') {
          await db.query(`
            UPDATE product_variants 
            SET quantity = quantity + ? 
            WHERE product_id = ? AND size = ? AND color = ?
            LIMIT 1
          `, [item.quantity, item.product_id, item.size, item.color]);
        } else if (item.size && item.size !== '-') {
          await db.query(`
            UPDATE product_variants 
            SET quantity = quantity + ? 
            WHERE product_id = ? AND size = ?
            LIMIT 1
          `, [item.quantity, item.product_id, item.size]);
        } else if (item.color && item.color !== '-') {
          await db.query(`
            UPDATE product_variants 
            SET quantity = quantity + ? 
            WHERE product_id = ? AND color = ?
            LIMIT 1
          `, [item.quantity, item.product_id, item.color]);
        }

        // Inventory log
        await db.query(`
          INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, note, created_by)
          VALUES (?, 0, ?, 'return', ?, ?)
        `, [item.product_id, item.quantity, `Stock restored from cancelled Order #${currentOrder.order_number}`, req.user ? req.user.id : 1]);
      }
    }

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

// Admin Verify or Cancel Receipt
exports.verifyReceipt = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { action } = req.body; // 'confirm' or 'cancel'
    
    const [existing] = await db.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentOrder = existing[0];
    let newStatus = '';
    let newPaymentStatus = '';
    let messageToUser = '';

    if (action === 'confirm') {
      newStatus = 'processing';
      newPaymentStatus = 'paid';
      messageToUser = `🎉 Good news! Your payment receipt for Order #${currentOrder.order_number} has been verified. We are now processing your order.`;
    } else if (action === 'cancel') {
      newStatus = 'cancelled';
      newPaymentStatus = 'failed';
      messageToUser = `⚠️ We're sorry, but we could not verify your payment receipt for Order #${currentOrder.order_number}. Your order has been cancelled. Please contact us for support.`;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await db.query(`UPDATE orders SET order_status = ?, payment_status = ? WHERE id = ?`, [newStatus, newPaymentStatus, orderId]);
    
    await db.query(`
      INSERT INTO order_status_history (order_id, status, note, updated_by)
      VALUES (?, ?, ?, ?)
    `, [orderId, newStatus, `Receipt ${action}ed by admin`, req.user ? req.user.id : 1]);

    // Restore stock if cancelled
    if (action === 'cancel' && currentOrder.order_status !== 'cancelled') {
      const [items] = await db.query(`SELECT product_id, quantity, size, color FROM order_items WHERE order_id = ?`, [orderId]);
      for (const item of items) {
        await db.query(`UPDATE products SET quantity = quantity + ?, total_sold = GREATEST(0, total_sold - ?) WHERE id = ?`, [item.quantity, item.quantity, item.product_id]);
        
        if (item.size && item.color && item.size !== '-' && item.color !== '-') {
          await db.query(`
            UPDATE product_variants 
            SET quantity = quantity + ? 
            WHERE product_id = ? AND size = ? AND color = ?
            LIMIT 1
          `, [item.quantity, item.product_id, item.size, item.color]);
        } else if (item.size && item.size !== '-') {
          await db.query(`
            UPDATE product_variants 
            SET quantity = quantity + ? 
            WHERE product_id = ? AND size = ?
            LIMIT 1
          `, [item.quantity, item.product_id, item.size]);
        } else if (item.color && item.color !== '-') {
          await db.query(`
            UPDATE product_variants 
            SET quantity = quantity + ? 
            WHERE product_id = ? AND color = ?
            LIMIT 1
          `, [item.quantity, item.product_id, item.color]);
        }

        await db.query(`
          INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, note, created_by)
          VALUES (?, 0, ?, 'return', ?, ?)
        `, [item.product_id, item.quantity, `Stock restored from cancelled Order #${currentOrder.order_number}`, req.user ? req.user.id : 1]);
      }
    }

    // Notify customer via WhatsApp bot
    try {
      const botService = getBotService();
      const customerPhone = currentOrder.whatsapp_id || currentOrder.customer_phone;
      console.log(`🔍 [verifyReceipt] botService ready: ${botService ? botService.isReady() : false}, customerPhone: ${customerPhone}, orderNumber: ${currentOrder.order_number}`);
      if (botService && botService.isReady() && customerPhone) {
        if (action === 'confirm') {
          // Generate invoice and send to customer
          const [invoiceItems] = await db.query(
            `SELECT oi.*, p.name AS product_name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
            [orderId]
          );
          let invoicePath = null;
          try {
            invoicePath = await generateInvoice(currentOrder, invoiceItems);
            console.log(`📄 [verifyReceipt] Generated Invoice PDF: ${invoicePath}`);
          } catch(e) { console.error('Invoice gen error:', e); }
          await botService.notifyCustomerOrderConfirmed(customerPhone, currentOrder.order_number, invoicePath);
        } else if (action === 'cancel') {
          await botService.notifyCustomerOrderCancelled(customerPhone, currentOrder.order_number);
        }
      } else {
        console.warn(`⚠️ [verifyReceipt] Skipping notification. botReady: ${botService ? botService.isReady() : false}, phone: ${customerPhone}`);
      }
    } catch (notifyErr) {
      console.error('WhatsApp notification error (non-critical):', notifyErr.message);
    }

    res.json({ success: true, message: `Receipt ${action}ed successfully.` });
  } catch (error) {
    console.error('Error verifying receipt:', error);
    res.status(500).json({ success: false, message: 'Failed to process receipt verification' });
  }
};


// Admin Delete Order (Restores Item Stock & Removes Order)
exports.deleteOrder = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const orderId = req.params.id;
    const [orders] = await connection.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);

    if (orders.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orders[0];
    await connection.beginTransaction();

    // If order was not cancelled, restore item quantities back to stock
    if (order.order_status !== 'cancelled') {
      const [items] = await connection.query(`SELECT product_id, quantity FROM order_items WHERE order_id = ?`, [orderId]);
      for (const item of items) {
        await connection.query(`UPDATE products SET quantity = quantity + ? WHERE id = ?`, [item.quantity, item.product_id]);
        await connection.query(`
          INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, note, created_by)
          VALUES (?, 0, ?, 'adjustment', ?, ?)
        `, [item.product_id, item.quantity, `Stock restored from deleted Order #${order.order_number}`, req.user ? req.user.id : 1]);
      }
    }

    // Delete order (cascade deletes order_items and order_status_history)
    await connection.query(`DELETE FROM orders WHERE id = ?`, [orderId]);

    await connection.commit();
    connection.release();

    res.json({ success: true, message: `Order #${order.order_number} deleted and item stock restored!` });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error deleting order:', error);
    res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
};

// Get Invoice Data
exports.getOrderInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;
    const [orders] = await db.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orders[0];
    const [items] = await db.query(`
      SELECT oi.*, p.name AS product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    order.items = items;
    res.json({ success: true, invoice: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
  }
};
