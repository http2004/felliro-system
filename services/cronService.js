const db = require('../config/db');
const { fetchCourierTracking } = require('./courierService');

/**
 * Periodically checks the courier API for active orders and updates
 * the database if the order is delivered.
 */
async function syncCourierStatuses() {
  console.log('[Cron] Starting scheduled courier synchronization...');
  
  try {
    // Find all orders that are with the courier but not yet marked delivered in our DB
    const [orders] = await db.query(`
      SELECT id, order_number, tracking_number, order_status 
      FROM orders 
      WHERE order_status IN ('handed_to_courier', 'shipped', 'out_for_delivery')
      AND tracking_number IS NOT NULL
      AND tracking_number != ''
    `);

    if (orders.length === 0) {
      console.log('[Cron] No active courier orders to sync at this time.');
      return;
    }

    console.log(`[Cron] Found ${orders.length} active orders to check.`);

    let updatedCount = 0;

    for (const order of orders) {
      try {
        const trackingNo = order.tracking_number.trim();
        const cTrk = await fetchCourierTracking(trackingNo);

        if (cTrk && cTrk.success) {
          const statusLower = (cTrk.courierStatus || '').toLowerCase();
          
          // If the courier has marked it delivered
          if (statusLower.includes('deliver') || statusLower.includes('completed')) {
            console.log(`[Cron] Order ${order.order_number} (${trackingNo}) marked as DELIVERED by courier. Updating DB...`);
            
            // Update order status
            await db.query(`
              UPDATE orders 
              SET order_status = 'delivered', updated_at = NOW() 
              WHERE id = ?
            `, [order.id]);

            // Add history record
            await db.query(`
              INSERT INTO order_status_history (order_id, status, note) 
              VALUES (?, 'delivered', 'Status automatically updated by Courier Sync (System)')
            `, [order.id]);

            updatedCount++;
          }
        }
        
        // Wait 1.5 seconds between each API request to avoid rate limiting from Fardar
        await new Promise(r => setTimeout(r, 1500));
        
      } catch (err) {
        console.error(`[Cron] Error syncing order ${order.order_number}:`, err);
      }
    }

    console.log(`[Cron] Synchronization complete. Successfully updated ${updatedCount} orders to delivered.`);

  } catch (error) {
    console.error('[Cron] Critical error during courier synchronization:', error);
  }
}

/**
 * Initializes all background jobs for the server
 */
function startCronJobs() {
  console.log('[Cron] Initializing background jobs...');
  
  setInterval(syncCourierStatuses, 60 * 60 * 1000);
  
  console.log('[Cron] Courier sync job scheduled to run every 1 hour.');
}

module.exports = {
  syncCourierStatuses,
  startCronJobs
};
