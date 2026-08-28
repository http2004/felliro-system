const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Ensure uploads folder exists safely
let uploadDir;
if (process.env.VERCEL) {
  uploadDir = path.join(os.tmpdir(), 'uploads');
} else {
  uploadDir = path.join(__dirname, '../public/uploads');
}

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Upload dir mkdir notice:', e.message);
}

const optimizeImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      if (file.mimetype.startsWith('image/')) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'product-' + uniqueSuffix + '.webp';
        const filepath = path.join(uploadDir, filename);

        await sharp(file.buffer)
          .resize({ width: 1000, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filepath);

        // Update the file object so the controller can use file.filename
        file.filename = filename;
        file.path = filepath;
      }
    }
    next();
  } catch (error) {
    console.error('Image optimization error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process images.' });
  }
};

module.exports = optimizeImages;
