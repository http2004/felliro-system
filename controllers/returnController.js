const db = require('../config/db');

// Fetch all returns with order details, product info, size & color variants
exports.getReturns = async (req, res) => {
  try {
    const [returns] = await db.query(`
      SELECT r.*, 
             COALESCE(o.order_number, CONCAT('ORDER-#', r.order_id)) AS order_number, 
             COALESCE(p.name, 'Product Item') AS product_name, 
             COALESCE(u.name, 'Admin') AS processor_name
      FROM returns r
      LEFT JOIN orders o ON r.order_id = o.id
      LEFT JOIN products p ON r.product_id = p.id
      LEFT JOIN users u ON r.processed_by = u.id
      ORDER BY r.id DESC
    `);
    res.json({ success: true, returns });
  } catch (error) {
    console.error('Error fetching returns:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch returns' });
  }
};

// Create a new return record and adjust main product + variant inventory stock, and order totals
exports.createReturn = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { order_id, product_id, quantity, size, color, reason, description, return_type } = req.body;

    if (!order_id || !product_id || !quantity) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Order ID, Product ID, and Quantity are required' });
    }

    const returnQty = parseInt(quantity);
    const type = return_type || 'restock';
    const itemSize = size || '-';
    const itemColor = color || '-';

    // 1. Validate order item and quantity
    let querySizeCondition = itemSize === '-' ? "AND (size = '-' OR size IS NULL)" : "AND size = ?";
    let queryColorCondition = itemColor === '-' ? "AND (color = '-' OR color IS NULL)" : "AND color = ?";
    
    const queryParams = [parseInt(order_id), parseInt(product_id)];
    if (itemSize !== '-') queryParams.push(itemSize);
    if (itemColor !== '-') queryParams.push(itemColor);

    const [orderItems] = await connection.query(`
      SELECT * FROM order_items 
      WHERE order_id = ? AND product_id = ? ${querySizeCondition} ${queryColorCondition}
      LIMIT 1
    `, queryParams);

    if (orderItems.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Order item not found in this order' });
    }

    const orderItem = orderItems[0];
    if (returnQty > orderItem.quantity) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: `Cannot return more than purchased quantity (${orderItem.quantity})` });
    }

    // 2. Insert into returns table
    const [result] = await connection.query(`
      INSERT INTO returns (order_id, product_id, quantity, size, color, reason, description, return_type, status, processed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processed', ?)
    `, [parseInt(order_id), parseInt(product_id), returnQty, itemSize, itemColor, reason || 'defective', description || 'Customer return', type, req.user ? req.user.id : 1]);

    // 3. Deduct from order_items and order totals
    const deductAmount = parseFloat(orderItem.price) * returnQty;
    
    await connection.query(`
      UPDATE order_items 
      SET quantity = quantity - ?, total = total - ? 
      WHERE id = ?
    `, [returnQty, deductAmount, orderItem.id]);

    await connection.query(`
      UPDATE orders 
      SET total_amount = GREATEST(0, total_amount - ?), 
          net_amount = GREATEST(0, net_amount - ?) 
      WHERE id = ?
    `, [deductAmount, deductAmount, parseInt(order_id)]);

    // 4. Update product stock if restocking
    if (type === 'restock') {
      await connection.query(`UPDATE products SET quantity = quantity + ?, total_sold = GREATEST(0, total_sold - ?) WHERE id = ?`, [returnQty, returnQty, parseInt(product_id)]);
      
      if (itemSize !== '-' && itemColor !== '-') {
        await connection.query(`
          UPDATE product_variants 
          SET quantity = quantity + ? 
          WHERE product_id = ? AND size = ? AND color = ?
        `, [returnQty, parseInt(product_id), itemSize, itemColor]);
      }

      await connection.query(`
        INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, note, created_by)
        VALUES (?, 0, ?, 'return', ?, ?)
      `, [parseInt(product_id), returnQty, `Restocked from Customer Return (Order ID #${order_id}, Size: ${itemSize}, Color: ${itemColor})`, req.user ? req.user.id : 1]);
    } else {
      await connection.query(`
        INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, note, created_by)
        VALUES (?, 0, 0, 'damage', ?, ?)
      `, [parseInt(product_id), `Marked as Damaged from Return (Order ID #${order_id})`, req.user ? req.user.id : 1]);
    }

    await connection.commit();
    connection.release();

    res.json({ success: true, message: 'Customer return processed and order updated successfully!', returnId: result.insertId });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Error logging return:', error);
    res.status(500).json({ success: false, message: 'Failed to process return' });
  }
};

// Delete Return Log
exports.deleteReturn = async (req, res) => {
  try {
    const returnId = req.params.id;
    await db.query(`DELETE FROM returns WHERE id = ?`, [returnId]);
    res.json({ success: true, message: 'Return record deleted successfully' });
  } catch (error) {
    console.error('Error deleting return:', error);
    res.status(500).json({ success: false, message: 'Failed to delete return record' });
  }
};
