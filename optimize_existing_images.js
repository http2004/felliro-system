const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mysql = require('mysql2/promise');
require('dotenv').config();

const uploadDir = path.join(__dirname, 'public/uploads');

async function migrateImages() {
  console.log('--- Starting Image Optimization Migration ---');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'felliro_db'
  });

  try {
    // 1. Migrate product_images
    const [images] = await connection.query(`SELECT id, image_url FROM product_images WHERE image_url LIKE '/uploads/%' AND image_url NOT LIKE '%.webp'`);
    console.log(`Found ${images.length} images in product_images to migrate.`);

    for (const img of images) {
      await processImageRecord(connection, 'product_images', img.id, img.image_url);
    }

    // 2. Migrate product_variants
    const [variants] = await connection.query(`SELECT id, image_url FROM product_variants WHERE image_url LIKE '/uploads/%' AND image_url NOT LIKE '%.webp'`);
    console.log(`Found ${variants.length} images in product_variants to migrate.`);

    for (const v of variants) {
      await processImageRecord(connection, 'product_variants', v.id, v.image_url);
    }

    console.log('--- Migration Completed Successfully! ---');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await connection.end();
  }
}

async function processImageRecord(connection, table, id, imageUrl) {
  try {
    const filename = path.basename(imageUrl);
    const oldFilePath = path.join(uploadDir, filename);

    if (!fs.existsSync(oldFilePath)) {
      console.warn(`File not found: ${oldFilePath}`);
      return;
    }

    const ext = path.extname(filename);
    const newFilename = filename.replace(ext, '.webp');
    const newFilePath = path.join(uploadDir, newFilename);

    // Convert to webp
    await sharp(oldFilePath)
      .resize({ width: 1000, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(newFilePath);

    // Update DB
    const newUrl = `/uploads/${newFilename}`;
    await connection.query(`UPDATE ${table} SET image_url = ? WHERE id = ?`, [newUrl, id]);

    // Delete old file
    fs.unlinkSync(oldFilePath);
    
    console.log(`Successfully migrated: ${filename} -> ${newFilename}`);
  } catch (err) {
    console.error(`Failed to process ${imageUrl}:`, err.message);
  }
}

migrateImages();
