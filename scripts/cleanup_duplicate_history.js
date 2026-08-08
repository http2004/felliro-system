require('dotenv').config();
const db = require('../config/db');

async function cleanupDuplicateHistory() {
  try {
    const [rows] = await db.query(`SELECT * FROM order_status_history ORDER BY order_id ASC, id ASC`);
    console.log(`Total history rows found: ${rows.length}`);

    const idsToDelete = [];
    let prevOrderId = null;
    let prevStatus = null;

    for (const r of rows) {
      if (r.order_id === prevOrderId && r.status === prevStatus) {
        // Duplicate consecutive status entry
        idsToDelete.push(r.id);
      } else {
        prevOrderId = r.order_id;
        prevStatus = r.status;
      }
    }

    console.log(`Duplicate history rows to delete: ${idsToDelete.length}`, idsToDelete);

    if (idsToDelete.length > 0) {
      await db.query(`DELETE FROM order_status_history WHERE id IN (?)`, [idsToDelete]);
      console.log('✅ Successfully removed duplicate history rows!');
    } else {
      console.log('✅ No duplicate history rows found.');
    }
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    process.exit(0);
  }
}

cleanupDuplicateHistory();
