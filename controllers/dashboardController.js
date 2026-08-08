const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const [[{ total_orders }]] = await db.query(`SELECT COUNT(*) AS total_orders FROM orders`);
    const [[{ total_revenue }]] = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total_revenue 
      FROM orders 
      WHERE (payment_status = 'paid' OR order_status NOT IN ('cancelled', 'failed'))
    `);
    const [[{ total_products }]] = await db.query(`SELECT COUNT(*) AS total_products FROM products WHERE status = 'active'`);
    const [[{ low_stock_count }]] = await db.query(`SELECT COUNT(*) AS low_stock_count FROM products WHERE quantity <= min_stock_alert AND status = 'active'`);
    const [[{ total_returns }]] = await db.query(`SELECT COUNT(*) AS total_returns FROM returns`);

    // Month-over-month revenue comparison
    const [[{ this_month_rev }]] = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS this_month_rev
      FROM orders
      WHERE (payment_status = 'paid' OR order_status NOT IN ('cancelled', 'failed'))
        AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
    `);
    const [[{ last_month_rev }]] = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS last_month_rev
      FROM orders
      WHERE (payment_status = 'paid' OR order_status NOT IN ('cancelled', 'failed'))
        AND created_at >= DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01')
        AND created_at < DATE_FORMAT(NOW(), '%Y-%m-01')
    `);

    let monthly_growth = 0;
    const thisMonth = parseFloat(this_month_rev) || 0;
    const lastMonth = parseFloat(last_month_rev) || 0;
    if (lastMonth > 0) {
      monthly_growth = ((thisMonth - lastMonth) / lastMonth) * 100;
    } else if (thisMonth > 0) {
      monthly_growth = 100;
    }

    // Fetch 5 most recent orders
    const [recent_orders] = await db.query(`
      SELECT id, order_number, customer_name, total_amount, order_status, created_at
      FROM orders
      ORDER BY id DESC
      LIMIT 6
    `);

    // Fetch low stock items list
    const [low_stock_items] = await db.query(`
      SELECT id, name, quantity, min_stock_alert
      FROM products
      WHERE quantity <= min_stock_alert AND status = 'active'
      ORDER BY quantity ASC
      LIMIT 6
    `);

    res.json({
      success: true,
      stats: {
        total_orders: parseInt(total_orders) || 0,
        total_revenue: parseFloat(total_revenue) || 0,
        total_products: parseInt(total_products) || 0,
        low_stock_count: parseInt(low_stock_count) || 0,
        total_returns: parseInt(total_returns) || 0,
        this_month_revenue: thisMonth,
        monthly_growth: parseFloat(monthly_growth.toFixed(1))
      },
      recent_orders: recent_orders || [],
      low_stock_items: low_stock_items || []
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
};

exports.getChartsData = async (req, res) => {
  try {
    // Sales trends grouped by day for the last 14 days
    const [rawTrends] = await db.query(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS revenue
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        AND order_status NOT IN ('cancelled', 'failed')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Map trends into continuous daily dates so the chart is smooth
    const trendMap = {};
    rawTrends.forEach(t => {
      const dStr = new Date(t.date).toISOString().split('T')[0];
      trendMap[dStr] = {
        count: parseInt(t.count) || 0,
        revenue: parseFloat(t.revenue) || 0
      };
    });

    const salesTrends = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      salesTrends.push({
        date: dStr,
        count: trendMap[dStr]?.count || 0,
        revenue: trendMap[dStr]?.revenue || 0
      });
    }

    // Category distribution with safe GROUP BY
    const [categoryShare] = await db.query(`
      SELECT c.name AS category_name, 
             COUNT(p.id) AS product_count, 
             COALESCE(SUM(p.total_sold), 0) AS total_sold
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY total_sold DESC
    `);

    res.json({
      success: true,
      salesTrends,
      categoryShare: categoryShare || []
    });
  } catch (error) {
    console.error('Charts data error:', error);
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
