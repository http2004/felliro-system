const db = require('../config/db');

// Public Product Catalog Query
exports.getAllProducts = async (req, res) => {
  try {
    const { category, size, color, min_price, max_price, search, sort, is_trending } = req.query;

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
    } else if (sort === 'popular') {
      sql += ` ORDER BY p.total_sold DESC, p.total_views DESC`;
    } else {
      sql += ` ORDER BY p.id DESC`;
    }

    const [products] = await db.query(sql, params);
    
    // Fetch variants for all returned products
    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      const [variants] = await db.query(`SELECT * FROM product_variants WHERE product_id IN (?)`, [productIds]);
      products.forEach(p => {
        p.variants = variants.filter(v => v.product_id === p.id);
        // Ensure total quantity is accurately reflecting the variants
        p.quantity = p.variants.reduce((sum, v) => sum + v.quantity, 0);
      });
    }

    const [categories] = await db.query(`SELECT * FROM categories ORDER BY name ASC`);
    
    res.json({
      success: true,
      count: products.length,
      products,
      categories
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

// Single Product Details + View Tracker
exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    const [products] = await db.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [productId]);

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = products[0];
    const [images] = await db.query(`SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC`, [productId]);
    product.images = images;

    const [variants] = await db.query(`SELECT * FROM product_variants WHERE product_id = ?`, [productId]);
    product.variants = variants;

    // View tracking
    db.query(`UPDATE products SET total_views = total_views + 1 WHERE id = ?`, [productId]).catch(() => {});
    db.query(`INSERT INTO product_views (product_id, ip_address) VALUES (?, ?)`, [productId, req.ip || '127.0.0.1']).catch(() => {});

    res.json({ success: true, product });
  } catch (error) {
    console.error('Error getting product details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product details' });
  }
};

// Admin List all products (excluding archived ones by default)
exports.getAdminProducts = async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT p.*, c.name AS category_name, pi.image_url AS primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE p.status != 'archived'
    `;
    const params = [];
    
    if (status) {
      sql = sql.replace("p.status != 'archived'", "p.status = ?");
      params.push(status);
    }
    
    if (search) {
      sql += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ` ORDER BY p.id DESC`;
    
    const [products] = await db.query(sql, params);
    
    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      const [variants] = await db.query(`SELECT * FROM product_variants WHERE product_id IN (?)`, [productIds]);
      products.forEach(p => {
        p.variants = variants.filter(v => v.product_id === p.id);
        p.quantity = p.variants.reduce((sum, v) => sum + v.quantity, 0);
      });
    }

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin product list' });
  }
};

// Admin Create Product
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, cost_price, category_id, min_stock_alert, is_trending, image_url, variants } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Product name and price are required' });
    }

    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch(e) { console.error('Failed to parse variants', e); }
    }
    const totalQuantity = parsedVariants.reduce((sum, v) => sum + (parseInt(v.quantity) || 0), 0);

    const [result] = await db.query(`
      INSERT INTO products 
        (name, description, price, cost_price, category_id, quantity, min_stock_alert, is_trending, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description || '',
      parseFloat(price),
      parseFloat(cost_price || price * 0.5),
      category_id || 1,
      totalQuantity,
      parseInt(min_stock_alert || 5),
      (is_trending === true || is_trending === 'true') ? 1 : 0,
      req.user ? req.user.id : 1
    ]);

    const productId = result.insertId;

    if (parsedVariants.length > 0) {
      for (let i = 0; i < parsedVariants.length; i++) {
        const v = parsedVariants[i];
        let vImageUrl = null;
        
        const variantFile = req.files && req.files.find(f => f.fieldname === `variant_image_${i}`);
        if (variantFile) {
          vImageUrl = `/uploads/${variantFile.filename}`;
        } else if (v.image_url && v.image_url !== 'null' && v.image_url.trim() !== '') {
          vImageUrl = v.image_url;
        }

        await db.query(`
          INSERT INTO product_variants (product_id, size, color, quantity, image_url)
          VALUES (?, ?, ?, ?, ?)
        `, [productId, v.size || '', v.color || '', parseInt(v.quantity) || 0, vImageUrl]);
      }
    }

    let hasPrimary = false;
    if (req.files) {
      const mainPhotos = req.files.filter(f => f.fieldname === 'photos');
      if (mainPhotos.length > 0) {
        hasPrimary = true;
        for (let i = 0; i < mainPhotos.length; i++) {
          const filePath = `/uploads/${mainPhotos[i].filename}`;
          const isPrimary = (i === 0);
          await db.query(`INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)`, [productId, filePath, isPrimary]);
        }
      }
    }
    
    if (!hasPrimary && image_url) {
      await db.query(`INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, TRUE)`, [productId, image_url]);
      hasPrimary = true;
    } 
    
    if (!hasPrimary) {
      await db.query(`INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, TRUE)`, [productId, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80']);
    }

    res.json({ success: true, message: 'Product created successfully!', productId });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

// Admin Update Product
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price, cost_price, category_id, min_stock_alert, status, is_trending, image_url, variants } = req.body;

    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch(e) { console.error('Failed to parse variants', e); }
    }
    const totalQuantity = parsedVariants.reduce((sum, v) => sum + (parseInt(v.quantity) || 0), 0);

    await db.query(`
      UPDATE products 
      SET name = ?, description = ?, price = ?, cost_price = ?, category_id = ?, quantity = ?, min_stock_alert = ?, status = ?, is_trending = ?
      WHERE id = ?
    `, [
      name,
      description,
      parseFloat(price),
      parseFloat(cost_price),
      category_id,
      totalQuantity,
      parseInt(min_stock_alert),
      status || 'active',
      (is_trending === true || is_trending === 'true') ? 1 : 0,
      productId
    ]);

    // Update variants
    await db.query(`DELETE FROM product_variants WHERE product_id = ?`, [productId]);
    if (parsedVariants.length > 0) {
      for (let i = 0; i < parsedVariants.length; i++) {
        const v = parsedVariants[i];
        let vImageUrl = null;
        
        const variantFile = req.files && req.files.find(f => f.fieldname === `variant_image_${i}`);
        if (variantFile) {
          vImageUrl = `/uploads/${variantFile.filename}`;
        } else if (v.image_url && v.image_url !== 'null' && v.image_url.trim() !== '') {
          vImageUrl = v.image_url;
        }

        await db.query(`
          INSERT INTO product_variants (product_id, size, color, quantity, image_url)
          VALUES (?, ?, ?, ?, ?)
        `, [productId, v.size || '', v.color || '', parseInt(v.quantity) || 0, vImageUrl]);
      }
    }

    if (req.files) {
      const mainPhotos = req.files.filter(f => f.fieldname === 'photos');
      if (mainPhotos.length > 0) {
        await db.query(`DELETE FROM product_images WHERE product_id = ?`, [productId]);
        for (let i = 0; i < mainPhotos.length; i++) {
          const filePath = `/uploads/${mainPhotos[i].filename}`;
          const isPrimary = (i === 0);
          await db.query(`INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)`, [productId, filePath, isPrimary]);
        }
      }
    } else if (image_url) {
      // image_url from client means keep old or replace with single remote
      await db.query(`DELETE FROM product_images WHERE product_id = ?`, [productId]);
      await db.query(`INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, TRUE)`, [productId, image_url]);
    }

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

// Admin Update Stock
exports.updateStock = async (req, res) => {
  try {
    const productId = req.params.id;
    const { quantity, note } = req.body;

    const [prev] = await db.query(`SELECT quantity FROM products WHERE id = ?`, [productId]);
    if (prev.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const prevQty = prev[0].quantity;
    const newQty = parseInt(quantity);

    await db.query(`UPDATE products SET quantity = ? WHERE id = ?`, [newQty, productId]);

    await db.query(`
      INSERT INTO inventory_logs (product_id, previous_quantity, new_quantity, change_type, note, created_by)
      VALUES (?, ?, ?, 'adjustment', ?, ?)
    `, [productId, prevQty, newQty, note || 'Manual stock update', req.user ? req.user.id : 1]);

    res.json({ success: true, message: 'Stock updated successfully', newQuantity: newQty });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update stock' });
  }
};

// ==========================================
// Categories Management
// ==========================================

exports.getCategories = async (req, res) => {
  try {
    const [categories] = await db.query(`SELECT * FROM categories ORDER BY name ASC`);
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const [result] = await db.query(`INSERT INTO categories (name, description) VALUES (?, ?)`, [name, description || '']);
    res.json({ success: true, category: { id: result.insertId, name, description } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    // Disassociate all products from this category so it can be safely deleted
    await db.query(`UPDATE products SET category_id = NULL WHERE category_id = ?`, [categoryId]);
    
    await db.query(`DELETE FROM categories WHERE id = ?`, [categoryId]);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};
// Admin Delete / Archive Product
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    // Mark status as archived so it disappears from shop and stock list
    await db.query(`UPDATE products SET status = 'archived' WHERE id = ?`, [productId]);
    res.json({ success: true, message: 'Product deleted/archived successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};
