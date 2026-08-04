const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'felliro_db'
  });

  try {
    console.log('Adding receipt_url to orders...');
    await connection.query('ALTER TABLE orders ADD COLUMN receipt_url VARCHAR(255) NULL AFTER payment_status;');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('Column receipt_url already exists.');
    else throw e;
  }

  try {
    console.log('Creating chat_sessions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        phone_number VARCHAR(20) NOT NULL UNIQUE,
        state ENUM('bot', 'human') DEFAULT 'bot',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
  } catch (e) { throw e; }

  try {
    console.log('Creating chat_messages table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id INT NOT NULL,
        sender ENUM('user', 'bot', 'admin') NOT NULL,
        message_type ENUM('text', 'image', 'document') DEFAULT 'text',
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      );
    `);
  } catch (e) { throw e; }

  console.log('DB Update complete!');
  await connection.end();
}
run().catch(console.error);
