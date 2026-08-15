const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    cd /var/www/felliro
    sed -i "s/require('dotenv').config();/require('dotenv').config({ path: __dirname + '\\/..\\/.env' });/g" config/db.js
    pm2 restart felliro --update-env
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', (d) => out += d.toString());
    stream.on('close', () => {
      console.log(out);
      conn.end();
      process.exit(0);
    });
  });
}).connect({ host: '153.75.250.138', port: 22, username: 'root', password: 'Kelawalla@2004' });
