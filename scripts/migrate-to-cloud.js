// scripts/migrate-to-cloud.js
// High-speed chunked batch migration from local MySQL to Cloud MySQL (Aiven, etc.)

require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('🚀 Starting Fast Batch Migration to Cloud MySQL...');

  // 1. Local Database Connection
  const localPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'felliro_db',
    waitForConnections: true,
    connectionLimit: 5
  });

  // 2. Cloud Database Connection
  const cloudHost = process.env.CLOUD_DB_HOST || process.env.DB_HOST;
  const cloudPort = parseInt(process.env.CLOUD_DB_PORT || process.env.DB_PORT) || 3306;
  const cloudUser = process.env.CLOUD_DB_USER || process.env.DB_USER;
  const cloudPassword = process.env.CLOUD_DB_PASSWORD || process.env.DB_PASSWORD;
  const cloudDatabase = process.env.CLOUD_DB_NAME || process.env.DB_NAME || 'defaultdb';

  if (!cloudHost || cloudHost === 'localhost' || cloudHost === '127.0.0.1') {
    console.error('❌ Please set your DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env first!');
    process.exit(1);
  }

  console.log(`📡 Connecting to Cloud DB at: ${cloudHost}:${cloudPort}...`);
  const cloudPool = mysql.createPool({
    host: cloudHost,
    port: cloudPort,
    user: cloudUser,
    password: cloudPassword,
    database: cloudDatabase,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 5
  });

  try {
    await cloudPool.query('SELECT 1');
    console.log('✅ Connected to Cloud Database successfully!');

    const [tables] = await localPool.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    const tableNames = tables.map(r => Object.values(r)[0]);

    console.log(`📋 Found ${tableNames.length} tables to migrate: ${tableNames.join(', ')}`);

    // Disable foreign key checks on cloud
    await cloudPool.query('SET FOREIGN_KEY_CHECKS = 0;');
    try { await cloudPool.query("SET sql_mode = '';"); } catch(e) {}

    const nowFormatted = new Date().toISOString().slice(0, 19).replace('T', ' ');

    for (const tbl of tableNames) {
      process.stdout.write(`⏳ Migrating [${tbl}]... `);

      // Get CREATE TABLE statement
      const [[createRow]] = await localPool.query(`SHOW CREATE TABLE \`${tbl}\``);
      let createSql = createRow['Create Table']
        .replace(/`created_at` datetime NOT NULL/g, '`created_at` datetime DEFAULT CURRENT_TIMESTAMP')
        .replace(/`updated_at` datetime NOT NULL/g, '`updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

      // Drop and recreate table on cloud
      await cloudPool.query(`DROP TABLE IF EXISTS \`${tbl}\``);
      await cloudPool.query(createSql);

      // Copy rows in batches of 50
      const [rows] = await localPool.query(`SELECT * FROM \`${tbl}\``);
      if (rows.length > 0) {
        const colKeys = Object.keys(rows[0]);
        const columns = colKeys.map(c => `\`${c}\``).join(', ');

        const chunkSize = 50;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const valueRows = [];
          const allParams = [];

          for (const row of chunk) {
            const placeholders = colKeys.map(() => '?').join(', ');
            valueRows.push(`(${placeholders})`);
            for (const k of colKeys) {
              let v = row[k];
              if (v === null || v === undefined) {
                if (k === 'created_at' || k === 'updated_at' || k.endsWith('_at') || k.endsWith('_date')) {
                  v = nowFormatted;
                }
              }
              if (v instanceof Date) {
                v = isNaN(v.getTime()) ? nowFormatted : v.toISOString().slice(0, 19).replace('T', ' ');
              }
              allParams.push(v);
            }
          }

          const batchSql = `INSERT INTO \`${tbl}\` (${columns}) VALUES ${valueRows.join(', ')}`;
          await cloudPool.query(batchSql, allParams);
        }
        console.log(`✅ ${rows.length} rows`);
      } else {
        console.log(`⚪ 0 rows (schema ready)`);
      }
    }

    // Re-enable foreign key checks
    await cloudPool.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n🎉 ALL TABLES AND DATA MIGRATED SUCCESSFULLY TO AIVEN CLOUD MYSQL!');
  } catch (err) {
    console.error('\n❌ Migration Error:', err);
  } finally {
    await localPool.end();
    await cloudPool.end();
  }
}

migrate();
