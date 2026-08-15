const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    echo '--- Top CPU Processes ---'
    ps aux --sort=-%cpu | head -n 5
    echo '--- PM2 Logs (tail 20) ---'
    pm2 logs felliro --lines 20 --nostream
    echo '--- Ping Test to Google (Latency) ---'
    ping -c 3 google.com
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
}).connect({ host: '198.44.123.14', port: 22, username: 'root', password: '47dL5vt55M0itPVwGQ', readyTimeout: 20000 });
