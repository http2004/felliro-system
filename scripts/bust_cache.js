const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../public/admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes('admin.js')) {
    content = content.replace(/admin\.js\?v=[a-zA-Z0-9_]+/g, 'admin_v2.js?v=2026')
                     .replace(/admin\.js\"/g, 'admin_v2.js?v=2026\"');
    fs.writeFileSync(p, content);
    console.log('Updated', file);
  }
}
