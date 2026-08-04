const db = require('../config/db');

async function fix() {
  try {
    // 1. Update invalid zero dates
    await db.query("UPDATE orders SET created_at = NOW(), updated_at = NOW() WHERE CAST(created_at AS CHAR) = '0000-00-00 00:00:00'");
    
    // 2. Fix schema to enforce defaults
    await db.query("ALTER TABLE orders MODIFY created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    await db.query("ALTER TABLE orders MODIFY updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    
    console.log('Database orders table schema fixed and dates updated!');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

fix();
