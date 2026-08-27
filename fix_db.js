const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  conn.exec('cd /var/www/felliro && sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=Felliro@2024DB/g" .env && sed -i "s/DB_USER=.*/DB_USER=felliro_user/g" .env && pm2 restart felliro', (err, stream) => { 
    stream.on('data', d => process.stdout.write(d.toString())); 
    stream.stderr.on('data', d => process.stderr.write(d.toString())); 
    stream.on('close', code => { conn.end(); process.exit(code); }); 
  }); 
}).connect({ host: '198.44.123.14', port: 22, username: 'root', password: '47dL5vt55M0itPVwGQ' });
