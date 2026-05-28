import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Ensure local upload directory exists
const UPLOAD_DIR = './data/uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 1. Configure Multer Disk Storage for local backup copies
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File validation filter (images and videos)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|ogg|mov/i;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Only images and videos are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB maximum size limit
});

// 2. Configure Cloudinary using credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dcrrid7jz',
  api_key: process.env.CLOUDINARY_API_KEY || '753846945321863',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'jbBmkOuc3Jd_dRfzRp-ELNTgBbc'
});

// 3. POST /api/upload - Handlers file upload, stores locally, uploads to Cloudinary
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please send file in form-data with the key "file".' });
  }

  try {
    const localFilePath = req.file.path.replace(/\\/g, '/'); // standardise slash format
    
    // Upload local backup to Cloudinary
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: 'NewsPortal_Uploads',
      resource_type: 'auto'
    });

    // Generate local access url
    const localUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
      message: 'Media uploaded successfully to Cloudinary and local backup!',
      url: result.secure_url,
      localPath: localUrl,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      originalName: req.file.originalname,
      sizeBytes: req.file.size
    });
  } catch (error) {
    console.error('Cloudinary / Upload error:', error);
    res.status(500).json({ error: 'Failed to process media upload.' });
  }
});

export default router;
