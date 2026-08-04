const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDB() {
  console.log('🚀 Initializing FelliRo Database...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  const dbName = process.env.DB_NAME || 'felliro_db';
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await connection.query(`USE \`${dbName}\`;`);

  console.log(`✅ Database '${dbName}' ready.`);

  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'cashier', 'customer') DEFAULT 'customer',
      phone VARCHAR(15),
      profile_image VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      is_active BOOLEAN DEFAULT TRUE
    );`,

    `CREATE TABLE IF NOT EXISTS categories (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      parent_id INT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      cost_price DECIMAL(10,2),
      category_id INT,
      size VARCHAR(255),
      color VARCHAR(255),
      quantity INT DEFAULT 0,
      min_stock_alert INT DEFAULT 5,
      status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
      is_trending BOOLEAN DEFAULT FALSE,
      rating DECIMAL(3,2) DEFAULT 4.5,
      total_views INT DEFAULT 0,
      total_sold INT DEFAULT 0,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS product_images (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT NOT NULL,
      image_url VARCHAR(255) NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS product_variants (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT NOT NULL,
      size VARCHAR(50),
      color VARCHAR(50),
      quantity INT DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS orders (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      customer_id INT NULL,
      customer_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(15) NOT NULL,
      customer_email VARCHAR(100),
      customer_address TEXT,
      city VARCHAR(100),
      province VARCHAR(100),
      total_amount DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) DEFAULT 0,
      tax DECIMAL(10,2) DEFAULT 0,
      net_amount DECIMAL(10,2) NOT NULL,
      delivery_fee DECIMAL(10,2) DEFAULT 0,
      payment_method ENUM('cash', 'bank_transfer', 'whatsapp', 'cod') DEFAULT 'whatsapp',
      payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
      receipt_url VARCHAR(255) NULL,
      order_status ENUM('pending', 'processing', 'ready_for_dispatch', 'handed_to_courier', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
      tracking_number VARCHAR(50),
      delivery_notes TEXT,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS order_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      size VARCHAR(50),
      color VARCHAR(50),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS order_status_history (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      status VARCHAR(50) NOT NULL,
      note TEXT,
      updated_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS returns (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      size VARCHAR(50),
      color VARCHAR(50),
      reason ENUM('defective', 'wrong_size', 'wrong_color', 'damaged', 'other') NOT NULL,
      description TEXT,
      status ENUM('pending', 'approved', 'rejected', 'processed') DEFAULT 'pending',
      return_type ENUM('restock', 'damage') DEFAULT 'restock',
      processed_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS inventory_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT NOT NULL,
      previous_quantity INT,
      new_quantity INT,
      change_type ENUM('purchase', 'sale', 'return', 'damage', 'adjustment') NOT NULL,
      reference_id INT NULL,
      note TEXT,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS email_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      recipient VARCHAR(100) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      template VARCHAR(100),
      content TEXT,
      status ENUM('sent', 'failed') DEFAULT 'sent',
      reference_type VARCHAR(50),
      reference_id INT,
      error_message TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT NULL,
      phone_number VARCHAR(15) NOT NULL,
      message TEXT,
      status ENUM('sent', 'failed') DEFAULT 'sent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS product_views (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      session_id VARCHAR(100),
      viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS regions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      province VARCHAR(100),
      delivery_charge DECIMAL(10,2) DEFAULT 350.00,
      is_active BOOLEAN DEFAULT TRUE
    );`,

    `CREATE TABLE IF NOT EXISTS system_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      setting_group VARCHAR(50),
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS reports (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50),
      report_data JSON,
      filters JSON,
      generated_by INT NULL,
      generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS order_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(50) DEFAULT 'image',
      uploaded_via VARCHAR(20) DEFAULT 'whatsapp',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS whatsapp_conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone_number VARCHAR(30) NOT NULL UNIQUE,
      customer_name VARCHAR(100),
      order_id INT DEFAULT NULL,
      state VARCHAR(50) DEFAULT 'idle',
      cart_data TEXT DEFAULT NULL,
      customer_data TEXT DEFAULT NULL,
      assigned_to_human TINYINT(1) DEFAULT 0,
      last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS whatsapp_chat_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone_number VARCHAR(30) NOT NULL,
      direction ENUM('incoming','outgoing') NOT NULL,
      message TEXT,
      media_url VARCHAR(500),
      media_type VARCHAR(50),
      sent_by VARCHAR(20) DEFAULT 'bot',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_phone (phone_number),
      INDEX idx_created (created_at)
    );`,

    `CREATE TABLE IF NOT EXISTS chat_sessions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      phone_number VARCHAR(20) NOT NULL UNIQUE,
      state ENUM('bot', 'human') DEFAULT 'bot',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      session_id INT NOT NULL,
      sender ENUM('user', 'bot', 'admin') NOT NULL,
      message_type ENUM('text', 'image', 'document') DEFAULT 'text',
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );`
  ];

  for (const query of tables) {
    await connection.query(query);
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('✅ All tables created successfully.');

  // Seed Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);

  await connection.query(`
    INSERT INTO users (id, name, email, password, role, phone)
    VALUES 
      (1, 'FelliRo Admin', 'admin@felliro.com', ?, 'admin', '+94771234567'),
      (2, 'Senior Cashier', 'cashier@felliro.com', ?, 'cashier', '+94777654321')
    ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password);
  `, [adminPassword, cashierPassword]);

  // Seed Categories
  await connection.query(`
    INSERT INTO categories (id, name, description) VALUES
      (1, 'Dresses', 'Elegant party, casual, and formal dresses'),
      (2, 'Tops & Blouses', 'Modern stylish tops, t-shirts, and blouses'),
      (3, 'Bottoms', 'Skirts, pants, trousers, and denim'),
      (4, 'Outerwear', 'Jackets, blazers, and coats'),
      (5, 'Accessories', 'Bags, scarves, and fashion accessories')
    ON DUPLICATE KEY UPDATE name=VALUES(name);
  `);

  // Seed Products
  const sampleProducts = [
    [1, 'FelliRo Magenta Floral Summer Dress', 'Premium lightweight floral dress with waist tie and soft cotton lining.', 4850.00, 2200.00, 1, 'M', 'Magenta', 28, 5, 'active', true, 4.8, 450, 64],
    [2, 'FelliRo Satin Evening Gown', 'Luxurious satin long gown perfect for evening occasions and parties.', 9500.00, 4200.00, 1, 'L', 'Black', 14, 3, 'active', true, 4.9, 320, 38],
    [3, 'Casual Linen Button Top', 'Breathable linen blend top with wooden buttons. Ideal for warm weather.', 3200.00, 1400.00, 2, 'S', 'White', 40, 8, 'active', false, 4.6, 210, 52],
    [4, 'Chic Crop Top - Electric Pink', 'Trendy cropped top with stretch fit and crew neck.', 2650.00, 1100.00, 2, 'M', 'Magenta', 3, 5, 'active', true, 4.7, 580, 89],
    [5, 'High-Waist Tailored Trousers', 'Smart casual high-waisted trousers with side pockets.', 5400.00, 2400.00, 3, 'M', 'Black', 18, 5, 'active', false, 4.5, 190, 26],
    [6, 'Flowy Pleated Midi Skirt', 'Vibrant pleated midi skirt with elasticized waistband.', 4200.00, 1800.00, 3, 'L', 'Magenta', 22, 5, 'active', true, 4.8, 310, 44],
    [7, 'FelliRo Signature Blazer', 'Tailored structured blazer with gold buttons.', 8900.00, 3900.00, 4, 'M', 'Black', 12, 4, 'active', true, 4.9, 410, 30],
    [8, 'Minimalist Leather Tote Bag', 'Spacious vegan leather tote with magnetic snap closure.', 6500.00, 2800.00, 5, 'Free Size', 'Black', 15, 4, 'active', false, 4.7, 180, 21]
  ];

  for (const p of sampleProducts) {
    await connection.query(`
      INSERT INTO products 
        (id, name, description, price, cost_price, category_id, size, color, quantity, min_stock_alert, status, is_trending, rating, total_views, total_sold, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), quantity=VALUES(quantity);
    `, p);
  }

  // Seed Product Images
  const sampleImages = [
    [1, 1, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80', true],
    [2, 2, 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=80', true],
    [3, 3, 'https://images.unsplash.com/photo-1534126511673-b6899657816a?w=800&auto=format&fit=crop&q=80', true],
    [4, 4, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80', true],
    [5, 5, 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80', true],
    [6, 6, 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&auto=format&fit=crop&q=80', true],
    [7, 7, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=80', true],
    [8, 8, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80', true]
  ];

  for (const img of sampleImages) {
    await connection.query(`
      INSERT INTO product_images (id, product_id, image_url, is_primary)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE image_url=VALUES(image_url);
    `, img);
  }

  // Seed Orders
  await connection.query(`
    INSERT INTO orders 
      (id, order_number, customer_name, customer_phone, customer_email, customer_address, city, province, total_amount, net_amount, payment_method, payment_status, order_status, tracking_number, created_by)
    VALUES 
      (1, 'FELLIRO-2026-001', 'Kasun Perera', '+94719876543', 'kasun@example.com', 'No 45, Galle Road, Bambalapitiya', 'Colombo', 'Western Province', 9050.00, 9050.00, 'whatsapp', 'paid', 'handed_to_courier', 'TRK-LK-90214', 1),
      (2, 'FELLIRO-2026-002', 'Nipuni Fernando', '+94772345678', 'nipuni@example.com', '12 Lake Drive, Kandy', 'Kandy', 'Central Province', 4200.00, 4200.00, 'cod', 'pending', 'processing', 'TRK-LK-90215', 2)
    ON DUPLICATE KEY UPDATE order_number=VALUES(order_number);
  `);

  await connection.query(`
    INSERT INTO order_items (id, order_id, product_id, quantity, price, total, size, color)
    VALUES 
      (1, 1, 1, 1, 4850.00, 4850.00, 'M', 'Magenta'),
      (2, 1, 6, 1, 4200.00, 4200.00, 'L', 'Magenta'),
      (3, 2, 6, 1, 4200.00, 4200.00, 'L', 'Magenta')
    ON DUPLICATE KEY UPDATE order_id=VALUES(order_id);
  `);

  // Seed Returns so Returns page is never empty
  await connection.query(`
    INSERT INTO returns (id, order_id, product_id, quantity, reason, description, status, return_type, processed_by)
    VALUES 
      (1, 1, 6, 1, 'wrong_size', 'Customer requested size M exchange', 'processed', 'restock', 1),
      (2, 2, 6, 1, 'defective', 'Minor seam defect reported on delivery', 'processed', 'damage', 2)
    ON DUPLICATE KEY UPDATE reason=VALUES(reason);
  `);

  // Seed Regions
  await connection.query(`
    INSERT INTO regions (id, name, province, delivery_charge) VALUES
      (1, 'Colombo Metro', 'Western', 350.00),
      (2, 'Greater Colombo & Suburbs', 'Western', 400.00),
      (3, 'Kandy & Central Province', 'Central', 450.00),
      (4, 'Galle & Southern Coast', 'Southern', 450.00),
      (5, 'Jaffna & Northern Province', 'Northern', 500.00),
      (6, 'Kurunegala & North Western', 'North Western', 450.00)
    ON DUPLICATE KEY UPDATE name=VALUES(name);
  `);

  // Seed System Settings
  await connection.query(`
    INSERT INTO system_settings (setting_key, setting_value, setting_group, description) VALUES
      ('site_name', 'FelliRo', 'general', 'Brand Name'),
      ('site_slogan', 'For a better version of you', 'general', 'Brand Slogan'),
      ('currency', 'LKR', 'general', 'System Currency Code'),
      ('currency_symbol', 'Rs.', 'general', 'System Currency Display Symbol'),
      ('whatsapp_number', '+94717716005', 'contact', 'Main WhatsApp Order Desk'),
      ('contact_email', 'info@felliro.com', 'contact', 'Customer Support Email'),
      ('bank_details', '{"bank":"Commercial Bank","account_name":"U.I. WIJESINGHE","account_number":"8029695559","branch":"Anuradhapura"}', 'whatsapp', 'Bank details for payment instructions')
    ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);
  `);

  console.log('✨ FelliRo database initialization complete!');
  await connection.end();
}

initDB().catch(err => {
  console.error('❌ Database Initialization Error:', err);
  process.exit(1);
});
