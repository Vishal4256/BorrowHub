import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { protect } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// File filter strictly limiting to safe raster image formats (excluding SVG to eliminate XSS vectors)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

  if (isMimeValid && isExtValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image file. Only .jpg, .jpeg, .png, .webp, and .gif files are allowed.'), false);
  }
};

// Check if Cloudinary cloud storage is configured (Production on Render)
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// Local disk storage fallback (for local development and offline automated testing)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  }
});

// Use memoryStorage when Cloudinary is configured to avoid writing to ephemeral disk,
// otherwise use diskStorage for local development
const upload = multer({
  storage: isCloudinaryConfigured ? multer.memoryStorage() : diskStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// POST /api/upload - Secure authenticated image upload (Cloudinary in prod, Local disk in dev)
router.post('/', protect, (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image exceeds maximum allowed size of 5MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided in request.' });
    }

    // 1. Cloudinary upload path (Persistent storage on Render)
    if (isCloudinaryConfigured && req.file.buffer) {
      try {
        const streamUpload = (buffer) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: 'borrowhub/equipment',
                resource_type: 'image',
                transformation: [{ quality: 'auto', fetch_format: 'auto' }]
              },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            stream.end(buffer);
          });
        };

        const result = await streamUpload(req.file.buffer);
        return res.status(201).json({
          success: true,
          url: result.secure_url,
          publicId: result.public_id,
          size: result.bytes,
          format: result.format,
          storage: 'cloudinary'
        });
      } catch (uploadErr) {
        return res.status(500).json({
          error: 'Failed to upload image to cloud storage: ' + uploadErr.message
        });
      }
    }

    // 2. Local disk upload path (Local development / offline tests)
    const relativeUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({
      success: true,
      url: relativeUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      storage: 'local'
    });
  });
});

export default router;
