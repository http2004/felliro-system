const { Client } = require('ssh2');

const NEW_IP = '198.44.123.14';
const NEW_PASS = '47dL5vt55M0itPVwGQ';

const cmd = `
  set -e
  export DEBIAN_FRONTEND=noninteractive
  echo "--- Updating apt ---"
  apt update
  
  echo "--- Installing MySQL and Git ---"
  apt install -y mysql-server git curl
  
  echo "--- Installing Node.js ---"
  if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  fi
  
  echo "--- Installing PM2 ---"
  npm install -g pm2
  
  echo "--- Setting up DB ---"
  mysql -u root -e "CREATE DATABASE IF NOT EXISTS felliro_db;"
  mysql -u root -e "CREATE USER IF NOT EXISTS 'felliro_user'@'localhost' IDENTIFIED BY 'Felliro@2024DB';"
  mysql -u root -e "GRANT ALL PRIVILEGES ON felliro_db.* TO 'felliro_user'@'localhost';"
  mysql -u root -e "FLUSH PRIVILEGES;"
  
  echo "--- Importing DB ---"
  if [ -f /root/dump.sql ]; then
    mysql -u root felliro_db < /root/dump.sql
    echo "DB Imported successfully!"
  else
    echo "dump.sql not found!"
  fi
  
  echo "--- Cloning Repo ---"
  mkdir -p /var/www
  cd /var/www
  if [ ! -d felliro ]; then
    git clone https://github.com/http2004/felliro-system.git felliro
  else
    cd felliro
    git pull origin main
    cd ..
  fi
  cd felliro
  
  echo "--- Configuring .env ---"
  if [ -f /root/.env ]; then
    cp /root/.env .env
    # We update the DB configuration in .env just in case it's different on new server
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=Felliro@2024DB/g" .env
    sed -i "s/DB_USER=.*/DB_USER=felliro_user/g" .env
  fi
  
  echo "--- Installing Packages ---"
  npm install
  
  echo "--- Starting App ---"
  pm2 delete felliro || true
  pm2 start server.js --name "felliro" --update-env
  pm2 save
  env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root || true
  
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
