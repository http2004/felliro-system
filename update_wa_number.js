const { Client } = require('ssh2');

const NEW_IP = '198.44.123.14';
const NEW_PASS = '47dL5vt55M0itPVwGQ';

const cmd = `
  echo "--- Updating DB ---"
  mysql -u felliro_user -pFelliro@2024DB felliro_db -e "UPDATE system_settings SET setting_value = '+94729985368' WHERE setting_key = 'whatsapp_number';"
  
  echo "--- Updating .env ---"
  cd /var/www/felliro
  sed -i "s/WHATSAPP_NUMBER=.*/WHATSAPP_NUMBER=94729985368/g" .env
  
  echo "--- Committing Local Changes (Wait, this is on the VPS) ---"
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', code => {
      console.log('\\nExit code:', code);
      conn.end();
      process.exit(code);
    });
  });
}).on('error', err => {
  console.error(err);
  process.exit(1);
}).connect({ host: NEW_IP, port: 22, username: 'root', password: NEW_PASS, readyTimeout: 20000 });
