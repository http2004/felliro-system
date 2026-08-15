const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    echo '--- Uptime ---'
    uptime
    echo '--- PM2 Status ---'
    pm2 status
    echo '--- Disk Space ---'
    df -h
    echo '--- RAM ---'
    free -m
    echo '--- PM2 Error Logs (tail 50) ---'
    cat /root/.pm2/logs/felliro-error.log | tail -n 50
    echo '--- PM2 Out Logs (tail 50) ---'
    cat /root/.pm2/logs/felliro-out.log | tail -n 50
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
}).connect({ host: '153.75.250.138', port: 22, username: 'root', password: 'Kelawalla@2004', readyTimeout: 20000 });
