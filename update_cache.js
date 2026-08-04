const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const v = Date.now();

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/src="\/js\/admin\.js(\?v=\d+)?"/g, `src="/js/admin.js?v=${v}"`);
  content = content.replace(/href="\/css\/main\.css(\?v=\d+)?"/g, `href="/css/main.css?v=${v}"`);
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
