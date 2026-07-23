const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getBin, createBin, updateBin, addFileRecord } = require('../utils/database');

const router = express.Router();

let currentBinId = null;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const binId = req.headers['x-bin-id'] || uuidv4().substring(0, 8);
    req.binId = binId;
    const uploadDir = path.join(__dirname, '../../uploads', binId);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const blockedExts = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.scr'];
  if (blockedExts.includes(path.extname(file.originalname).toLowerCase())) {
    cb(new Error('Tipe file tidak diizinkan'), false);
  } else cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024, files: 20 } });

router.post('/', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Tidak ada file' });
    
    const binId = req.binId;
    const { expiresIn = '7d', password = '', description = '' } = req.body;
    const expiryMap = { '1h': 3600000, '6h': 21600000, '12h': 43200000, '1d': 86400000, '7d': 604800000, '30d': 2592000000, 'never': null };
    const expiryMs = expiryMap[expiresIn] !== undefined ? expiryMap[expiresIn] : expiryMap['7d'];
    const expiresAt = expiryMs ? Date.now() + expiryMs : null;

    const fileRecords = req.files.map(file => ({
      id: uuidv4(), originalName: file.originalname, storedName: file.filename,
      size: file.size, mimeType: file.mimetype, uploadedAt: Date.now(), downloads: 0
    }));

    for (const record of fileRecords) addFileRecord(record.id, { ...record, binId });

    let bin = getBin(binId);
    if (!bin) {
      bin = createBin(binId, {
        id: binId, createdAt: Date.now(), expiresAt, expiresIn,
        password: password ? Buffer.from(password).toString('base64') : '',
        description, files: fileRecords,
        totalSize: fileRecords.reduce((s, f) => s + f.size, 0), downloadCount: 0
      });
    } else {
      const updatedFiles = [...(bin.files || []), ...fileRecords];
      updateBin(binId, { files: updatedFiles, totalSize: updatedFiles.reduce((s, f) => s + f.size, 0) });
    }

    res.json({
      success: true, binId, binUrl: '/bin/' + binId,
      files: fileRecords.map(f => ({ id: f.id, name: f.originalName, size: f.size, type: f.mimeType })),
      expiresAt
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload gagal' });
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File terlalu besar (max 100MB)' });
    if (error.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'Terlalu banyak file (max 20)' });
  }
  res.status(400).json({ error: error.message });
});

module.exports = router;
