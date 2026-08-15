const { Client } = require('ssh2');

const NEW_IP = '198.44.123.14';
const NEW_PASS = '47dL5vt55M0itPVwGQ';

const cmd = `
  set -e
  export DEBIAN_FRONTEND=noninteractive
  echo "--- Installing Nginx ---"
  apt update
  apt install -y nginx
  
  echo "--- Configuring Nginx ---"
  cat << 'EOF' > /etc/nginx/sites-available/felliro
server {
    listen 80;
    server_name felliro.com www.felliro.com felliro.lk www.felliro.lk 198.44.123.14;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

  echo "--- Enabling Site ---"
  ln -sf /etc/nginx/sites-available/felliro /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default

  echo "--- Restarting Nginx ---"
  systemctl restart nginx
  systemctl enable nginx

  echo "DONE!"
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
