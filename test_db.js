const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  const cmd = `mysql -u felliro_user -p"Felliro@2024DB" felliro_db -e "UPDATE regions SET delivery_charge = 999 WHERE name = 'Ampara';" && curl -s http://localhost:5000/api/regions`;
  conn.exec(cmd, (err, stream) => { 
    if (err) throw err;
    let data = '';
    stream.on('data', d => data += d.toString()); 
    stream.stderr.on('data', d => process.stderr.write(d.toString())); 
    stream.on('close', () => { 
      console.log(data.substring(0, 1000)); // just print a bit to see if it returned
      if(data.includes('999')) console.log("FOUND 999!");
      conn.end(); 
    }); 
  }); 
}).connect({ host: '198.44.123.14', port: 22, username: 'root', password: 'kSiUB158BIbg15sQ3l' });
