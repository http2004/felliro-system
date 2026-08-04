const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'felliro_db'
    });
    
    console.log("Creating product_variants table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        size VARCHAR(50),
        color VARCHAR(50),
        quantity INT DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);
    
    // Migrate existing sizes and colors from products into product_variants
    // Note: since the tag format was just implemented, some might be "S, M" etc.
    // For simplicity, we will just create one variant per product taking the raw string
    // and let the admin fix it via the UI.
    
    console.log("Migrating existing data...");
    const [products] = await connection.query(`SELECT id, size, color, quantity FROM products`);
    for (const p of products) {
      await connection.query(`
        INSERT INTO product_variants (product_id, size, color, quantity)
        VALUES (?, ?, ?, ?)
      `, [p.id, p.size || 'M', p.color || 'Default', p.quantity || 0]);
    }

    console.log("Success!");
    await connection.end();
  } catch(err) {
    console.error(err);
  }
}
run();
