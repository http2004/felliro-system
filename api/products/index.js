const db = require('../../config/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { category, size, color, min_price, max_price, search, sort, is_trending } = req.query || {};

    let sql = `
      SELECT p.*, c.name AS category_name, pi.image_url AS primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE p.status = 'active'
    `;
    const params = [];

    if (category) {
      sql += ` AND (p.category_id = ? OR c.name = ?)`;
      params.push(category, category);
    }
    if (size) {
      sql += ` AND p.size = ?`;
      params.push(size);
    }
    if (color) {
      sql += ` AND p.color = ?`;
      params.push(color);
    }
    if (min_price) {
      sql += ` AND p.price >= ?`;
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      sql += ` AND p.price <= ?`;
      params.push(parseFloat(max_price));
    }
    if (is_trending === 'true') {
      sql += ` AND p.is_trending = TRUE`;
    }
    if (search) {
      sql += ` AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (sort === 'price_asc') {
      sql += ` ORDER BY p.price ASC`;
    } else if (sort === 'price_desc') {
      sql += ` ORDER BY p.price DESC`;
    } else {
      sql += ` ORDER BY p.created_at DESC`;
    }

    const [products] = await db.query(sql, params);
    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error('Products fetch error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
