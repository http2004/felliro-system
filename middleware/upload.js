const path = require('path');
const fs = require('fs');
const multer = require('multer');
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

// Storage Configuration
const storage = multer.memoryStorage();

// File Filter for Images Only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
