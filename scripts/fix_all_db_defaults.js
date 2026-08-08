const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixAllDefaults() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'felliro_db'
  });

  console.log('Connected to DB:', process.env.DB_NAME);

  // Disable strict SQL mode for this session while running migrations
  await connection.query(`SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'`);

  // 1. Get all tables in database
  const [tables] = await connection.query(`
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = ?
  `, [process.env.DB_NAME || 'felliro_db']);

  for (const t of tables) {
    const tableName = t.TABLE_NAME;
    const [cols] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `, [process.env.DB_NAME || 'felliro_db', tableName]);

    // First clean up any zero dates
    for (const c of cols) {
      const colName = c.COLUMN_NAME;
      const dataType = c.DATA_TYPE.toLowerCase();
      if (dataType === 'datetime' || dataType === 'timestamp') {
        try {
          await connection.query(`UPDATE \`${tableName}\` SET \`${colName}\` = NOW() WHERE \`${colName}\` = '0000-00-00 00:00:00' OR \`${colName}\` IS NULL`);
        } catch (e) {
          // ignore
        }
      }
    }

    for (const c of cols) {
      if (c.EXTRA && c.EXTRA.includes('auto_increment')) continue;

      const colName = c.COLUMN_NAME;
      const dataType = c.DATA_TYPE.toLowerCase();

      try {
        if (colName === 'created_at') {
          console.log(`Fixing ${tableName}.${colName} -> TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
          await connection.query(`ALTER TABLE \`${tableName}\` MODIFY \`${colName}\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        } else if (colName === 'updated_at') {
          console.log(`Fixing ${tableName}.${colName} -> TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
          await connection.query(`ALTER TABLE \`${tableName}\` MODIFY \`${colName}\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        } else if (c.IS_NULLABLE === 'NO' && c.COLUMN_DEFAULT === null) {
          if (dataType === 'datetime' || dataType === 'timestamp') {
            console.log(`Fixing datetime ${tableName}.${colName} -> NULL DEFAULT NULL`);
            await connection.query(`ALTER TABLE \`${tableName}\` MODIFY \`${colName}\` ${c.COLUMN_TYPE} NULL DEFAULT CURRENT_TIMESTAMP`);
          } else if (dataType === 'varchar' || dataType === 'text' || dataType === 'mediumtext' || dataType === 'longtext') {
            console.log(`Fixing text ${tableName}.${colName} -> NULL DEFAULT NULL`);
            await connection.query(`ALTER TABLE \`${tableName}\` MODIFY \`${colName}\` ${c.COLUMN_TYPE} NULL DEFAULT NULL`);
          } else if (dataType === 'int' || dataType === 'tinyint' || dataType === 'bigint' || dataType === 'smallint') {
            if (colName !== 'id') {
              console.log(`Fixing int ${tableName}.${colName} -> DEFAULT 0`);
              await connection.query(`ALTER TABLE \`${tableName}\` MODIFY \`${colName}\` ${c.COLUMN_TYPE} DEFAULT 0`);
            }
          } else if (dataType === 'decimal' || dataType === 'float' || dataType === 'double') {
            console.log(`Fixing decimal ${tableName}.${colName} -> DEFAULT 0.00`);
            await connection.query(`ALTER TABLE \`${tableName}\` MODIFY \`${colName}\` ${c.COLUMN_TYPE} DEFAULT 0.00`);
          }
        }
      } catch (err) {
        console.warn(`Could not modify ${tableName}.${colName}:`, err.message);
      }
    }
  }

  console.log('✅ All table columns fixed and zero dates converted successfully!');
  await connection.end();
}

fixAllDefaults().catch(console.error);
