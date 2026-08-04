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
    
    console.log("Altering size and color columns...");
    await connection.query("ALTER TABLE products MODIFY size VARCHAR(255);");
    await connection.query("ALTER TABLE products MODIFY color VARCHAR(255);");
    console.log("Success!");
    
    await connection.end();
  } catch(err) {
    console.error(err);
  }
}
run();
