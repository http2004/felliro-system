const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'felliro_db',
    multipleStatements: true
  });

  console.log('✅ Connected to DB. Running WhatsApp bot migration...');

  // 1. whatsapp_conversations table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_conversations (
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
    );
  `);
  console.log('✅ whatsapp_conversations table ready');

  // 2. order_receipts table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS order_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(50) DEFAULT 'image',
      uploaded_via VARCHAR(20) DEFAULT 'whatsapp',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `);
  console.log('✅ order_receipts table ready');

  // 3. system_settings table (if not exists)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT,
      setting_group VARCHAR(50) DEFAULT 'general',
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ system_settings table ready');

  // 4. Seed: global bot toggle
  await conn.query(`
    INSERT INTO system_settings (setting_key, setting_value, setting_group, description)
    VALUES ('whatsapp_bot_enabled', 'true', 'whatsapp', 'Global WhatsApp bot on/off toggle')
    ON DUPLICATE KEY UPDATE setting_key = setting_key;
  `);

  // 5. Seed: bank details
  await conn.query(`
    INSERT INTO system_settings (setting_key, setting_value, setting_group, description)
    VALUES ('bank_details', '{"bank":"Commercial Bank","account_name":"U.I. WIJESINGHE","account_number":"8029695559","branch":"Anuradhapura"}', 'whatsapp', 'Bank details for payment instructions')
    ON DUPLICATE KEY UPDATE setting_key = setting_key;
  `);

  console.log('✅ System settings seeded');

  // 6. Add whatsapp_chat_log table for admin chat history
  await conn.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_chat_log (
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
    );
  `);
  console.log('✅ whatsapp_chat_log table ready');

  await conn.end();
  console.log('\n🎉 WhatsApp bot migration complete!');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
