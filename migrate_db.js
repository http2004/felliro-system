const { Client } = require('ssh2');
const fs = require('fs');

const OLD_IP = '153.75.250.138';
const OLD_PASS = 'Kelawalla@2004';
const NEW_IP = '198.44.123.14';
const NEW_PASS = '47dL5vt55M0itPVwGQ';

function execRemote(ip, pass, cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = '', errOut = '';
        stream.on('data', d => out += d.toString());
        stream.stderr.on('data', d => errOut += d.toString());
        stream.on('close', code => {
          conn.end();
          resolve({ code, out, errOut });
        });
      });
    }).on('error', reject).connect({ host: ip, port: 22, username: 'root', password: pass, readyTimeout: 20000 });
  });
}

function sftpDownload(ip, pass, remoteFile, localFile) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastGet(remoteFile, localFile, err => {
          conn.end();
          if (err) reject(err);
          else resolve();
        });
      });
    }).on('error', reject).connect({ host: ip, port: 22, username: 'root', password: pass, readyTimeout: 20000 });
  });
}

function sftpUpload(ip, pass, localFile, remoteFile) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastPut(localFile, remoteFile, err => {
          conn.end();
          if (err) reject(err);
          else resolve();
        });
      });
    }).on('error', reject).connect({ host: ip, port: 22, username: 'root', password: pass, readyTimeout: 20000 });
  });
}

(async () => {
  try {
    console.log('1. Dumping DB on Old Server...');
    await execRemote(OLD_IP, OLD_PASS, 'mysqldump -u root felliro_db > /root/dump.sql');
    
    console.log('2. Downloading DB to Local...');
    await sftpDownload(OLD_IP, OLD_PASS, '/root/dump.sql', 'dump.sql');
    
    console.log('3. Uploading DB to New Server...');
    await sftpUpload(NEW_IP, NEW_PASS, 'dump.sql', '/root/dump.sql');

    console.log('4. Also downloading .env file to copy over...');
    await sftpDownload(OLD_IP, OLD_PASS, '/var/www/felliro/.env', 'old_env.txt');
    await sftpUpload(NEW_IP, NEW_PASS, 'old_env.txt', '/root/.env');

    console.log('✅ Transfer Complete!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
})();
