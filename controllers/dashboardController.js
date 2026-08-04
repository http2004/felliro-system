const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const [[{ total_orders }]] = await db.query(`SELECT COUNT(*) AS total_orders FROM orders`);
    const [[{ total_revenue }]] = await db.query(`SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE payment_status = 'paid' OR order_status != 'cancelled'`);
    const [[{ total_products }]] = await db.query(`SELECT COUNT(*) AS total_products FROM products WHERE status = 'active'`);
    const [[{ low_stock_count }]] = await db.query(`SELECT COUNT(*) AS low_stock_count FROM products WHERE quantity <= min_stock_alert AND status = 'active'`);
    const [[{ total_returns }]] = await db.query(`SELECT COUNT(*) AS total_returns FROM returns`);

    // Fetch 5 most recent orders
    const [recent_orders] = await db.query(`
      SELECT id, order_number, customer_name, total_amount, order_status, created_at
      FROM orders
      ORDER BY id DESC
      LIMIT 5
    `);

    // Fetch low stock items list
    const [low_stock_items] = await db.query(`
      SELECT id, name, quantity, min_stock_alert
      FROM products
      WHERE quantity <= min_stock_alert AND status = 'active'
      ORDER BY quantity ASC
      LIMIT 5
    `);

    res.json({
      success: true,
      stats: {
        total_orders,
        total_revenue: parseFloat(total_revenue),
        total_products,
        low_stock_count,
        total_returns
      },
      recent_orders,
      low_stock_items
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
};

exports.getChartsData = async (req, res) => {
  try {
    // Sales trends grouped by day
    const [salesTrends] = await db.query(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count, SUM(total_amount) AS revenue
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Category distribution
    const [categoryShare] = await db.query(`
      SELECT c.name AS category_name, COUNT(p.id) AS product_count, SUM(p.total_sold) AS total_sold
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
    `);

    res.json({
      success: true,
      salesTrends,
      categoryShare
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch charts data' });
  }
};

exports.getReportsData = async (req, res) => {
  try {
    const { period } = req.query;
    let dateCondition = "";
    
    if (period === 'today') {
      dateCondition = "AND DATE(o.created_at) = CURDATE()";
    } else if (period === 'week') {
      dateCondition = "AND YEARWEEK(o.created_at, 1) = YEARWEEK(CURDATE(), 1)";
    } else if (period === 'month') {
      dateCondition = "AND MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())";
    }

    // Gross Sales Revenue
    const [[{ gross_sales }]] = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS gross_sales 
      FROM orders o
      WHERE (o.payment_status = 'paid' OR o.order_status != 'cancelled') ${dateCondition}
    `);
    
    // Net Profit
    const [[{ net_profit }]] = await db.query(`
      SELECT COALESCE(SUM(oi.total) - SUM(oi.quantity * COALESCE(p.cost_price, p.price * 0.6)), 0) AS net_profit
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE (o.payment_status = 'paid' OR o.order_status != 'cancelled') ${dateCondition}
    `);

    const avg_profit_margin = gross_sales > 0 ? (net_profit / gross_sales) * 100 : 0;

    // Top Selling Items
    const [top_items] = await db.query(`
      SELECT p.name AS product_name, c.name AS category_name, SUM(oi.quantity) AS units_sold, SUM(oi.total) AS revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE (o.payment_status = 'paid' OR o.order_status != 'cancelled') ${dateCondition}
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT 5
    `);

    // Regional Sales
    const [regional_sales] = await db.query(`
      SELECT o.province, COUNT(o.id) AS orders_count, SUM(o.delivery_fee) AS delivery_charges_collected
      FROM orders o
      WHERE (o.payment_status = 'paid' OR o.order_status != 'cancelled') ${dateCondition}
      GROUP BY o.province
      ORDER BY orders_count DESC
      LIMIT 5
    `);

    const total_cost = gross_sales - net_profit;

    res.json({
      success: true,
      data: {
        gross_sales: parseFloat(gross_sales),
        total_cost: parseFloat(total_cost),
        net_profit: parseFloat(net_profit),
        avg_profit_margin: parseFloat(avg_profit_margin).toFixed(1),
        top_items,
        regional_sales
      }
    });
  } catch (error) {
    console.error('Reports data error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports data' });
  }
};
