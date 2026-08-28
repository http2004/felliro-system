const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const localBase = __dirname;
const remoteBase = '/var/www/felliro';

const filesToSync = [
  'package.json',
  'package-lock.json',
  'public/admin/products.html',
  'public/js/admin_v2.js',
  'middleware/upload.js',
  'middleware/imageOptimizer.js',
  'routes/productRoutes.js',
  'public/index.html',
  'public/products.html',
  'public/js/store.js',
  'server.js',
  'optimize_existing_images.js'
];

conn.on('ready', () => {
  console.log('SSH Ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    let i = 0;
    
    function nextFile() {
      if (i >= filesToSync.length) {
        console.log('All files uploaded. Restarting pm2...');
        conn.exec('cd /var/www/felliro && npm install && pm2 restart felliro && node optimize_existing_images.js', (err, stream) => {
          if (err) throw err;
          stream.on('data', d => process.stdout.write(d.toString()));
          stream.stderr.on('data', d => process.stderr.write(d.toString()));
          stream.on('close', code => {
            console.log('Exit code:', code);
            conn.end();
          });
        });
        return;
      }
      
      const file = filesToSync[i++];
      const localPath = path.join(localBase, file);
      const remotePath = remoteBase + '/' + file;
      
      if (fs.existsSync(localPath)) {
        sftp.fastPut(localPath, remotePath, err => {
          if (err) console.error('Error uploading ' + file + ':', err);
          else console.log('Uploaded ' + file);
          nextFile();
        });
      } else {
        console.log('Skipping ' + file + ' (not found)');
        nextFile();
      }
    }
    
    nextFile();
  });
}).connect({ host: '198.44.123.14', port: 22, username: 'root', password: 'kSiUB158BIbg15sQ3l' });
