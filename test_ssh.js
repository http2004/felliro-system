const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('✅ SSH Connection Successful!');
  conn.exec('uname -a && cat /etc/os-release | grep PRETTY_NAME', (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', (d) => out += d.toString());
    stream.on('close', () => {
      console.log('Server Info:', out.trim());
      conn.end();
      process.exit(0);
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Connection Failed:', err.message);
  process.exit(1);
}).connect({ host: '198.44.123.14', port: 22, username: 'root', password: '47dL5vt55M0itPVwGQ', readyTimeout: 20000 });
