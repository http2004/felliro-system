const { execSync } = require('child_process');
const { Client } = require('ssh2');

try {
  console.log('--- Committing to Git ---');
  execSync('git add .', { stdio: 'inherit' });
  try {
    execSync('git commit -m "Update premium UI and automated courier sync background job"', { stdio: 'inherit' });
  } catch (e) {
    console.log('Nothing to commit or error committing.');
  }
  execSync('git push', { stdio: 'inherit' });
} catch (e) {
  console.log('Git commands failed:', e.message);
}

const cmd = `
  cd /var/www/felliro
  git pull origin main
  pm2 restart felliro --update-env
`;

const conn = new Client();
console.log('--- Updating VPS ---');
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
}).connect({ host: '198.44.123.14', port: 22, username: 'root', password: 'kSiUB158BIbg15sQ3l', readyTimeout: 20000 });
