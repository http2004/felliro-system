const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log("Updating broken dates...");
    await db.query(`UPDATE order_status_history osh JOIN orders o ON osh.order_id = o.id SET osh.created_at = o.created_at WHERE osh.created_at = '0000-00-00 00:00:00'`);
    
    console.log("Altering table column...");
    await db.query(`ALTER TABLE order_status_history MODIFY created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    
    console.log("Fixed successfully.");
  } catch(e) {
    console.error(e);
  }
  
  db.end();
}
run();
