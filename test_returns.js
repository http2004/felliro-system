const db = require('./config/db'); 
db.query(`SELECT r.*, COALESCE(o.order_number, CONCAT('ORDER-#', r.order_id)) AS order_number, COALESCE(p.name, 'Product Item') AS product_name, COALESCE(u.name, 'Admin') AS processor_name FROM returns r LEFT JOIN orders o ON r.order_id = o.id LEFT JOIN products p ON r.product_id = p.id LEFT JOIN users u ON r.processed_by = u.id ORDER BY r.id DESC`)
.then(r => { console.log(r[0]); process.exit(0); })
.catch(e => { console.error(e); process.exit(1); });
