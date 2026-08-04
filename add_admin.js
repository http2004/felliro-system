const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function run() {
  const pwd = await bcrypt.hash('123456', 10);
  await db.query("INSERT INTO users (name, email, password, role) VALUES ('Bot Admin', 'botadmin@feelliro.com', ?, 'admin') ON DUPLICATE KEY UPDATE password = ?", [pwd, pwd]);
  console.log('Test admin created.');
  process.exit();
}
run();
