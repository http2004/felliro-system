const { Client } = require('ssh2');

const NEW_IP = '198.44.123.14';
const NEW_PASS = '47dL5vt55M0itPVwGQ';

const cmd = `
  cd /var/www/felliro
  sed -i "s/94717716005/94729985368/g" public/js/store.js
  sed -i "s/94717716005/94729985368/g" public/js/app.js
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.on('close', code => {
      conn.end();
      process.exit(code);
    });
  });
}).on('error', err => {
  process.exit(1);
}).connect({ host: NEW_IP, port: 22, username: 'root', password: NEW_PASS, readyTimeout: 20000 });
