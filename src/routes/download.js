const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const mime = require('mime-types');
const { getBin, incrementDownload } = require('../utils/database');

const router = express.Router();

router.get('/:binId/:fileId', (req, res) => {
  try {
    const { binId, fileId } = req.params;
    const bin = getBin(binId);
    if (!bin) return res.status(404).json({ error: 'Bin tidak ditemukan' });
    if (bin.expiresAt && bin.expiresAt < Date.now()) return res.status(410).json({ error: 'Bin sudah kedaluwarsa' });

    if (bin.password) {
      const binPass = Buffer.from(bin.password, 'base64').toString();
      if (req.query.password !== binPass) return res.status(401).json({ error: 'Password salah' });
    }

    // Handle zip/all specially
    if (fileId === 'zip') return res.status(400).json({ error: 'Gunakan /zip/all' });

    const fileRecord = bin.files && bin.files.find(f => f.id === fileId);
    if (!fileRecord) return res.status(404).json({ error: 'File tidak ditemukan' });

    const filePath = path.join(__dirname, '../../uploads', binId, fileRecord.storedName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ada di storage' });

    incrementDownload(fileId);
    const mimeType = fileRecord.mimeType || mime.lookup(fileRecord.originalName) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent(fileRecord.originalName) + '"');
    res.setHeader('Content-Length', fileRecord.size);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Download gagal' });
  }
});

router.get('/:binId/zip/all', (req, res) => {
  try {
    const { binId } = req.params;
    const bin = getBin(binId);
    if (!bin) return res.status(404).json({ error: 'Bin tidak ditemukan' });
    if (bin.expiresAt && bin.expiresAt < Date.now()) return res.status(410).json({ error: 'Bin kedaluwarsa' });

    if (bin.password) {
      const binPass = Buffer.from(bin.password, 'base64').toString();
      if (req.query.password !== binPass) return res.status(401).json({ error: 'Password salah' });
    }

    if (!bin.files || bin.files.length === 0) return res.status(404).json({ error: 'Bin kosong' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="filebin-' + binId + '.zip"');

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);
    for (const file of bin.files) {
      const filePath = path.join(__dirname, '../../uploads', binId, file.storedName);
      if (fs.existsSync(filePath)) { archive.file(filePath, { name: file.originalName }); incrementDownload(file.id); }
    }
    archive.finalize();
  } catch (error) {
    res.status(500).json({ error: 'Download ZIP gagal' });
  }
});

router.get('/:binId/:fileId/preview', (req, res) => {
  try {
    const { binId, fileId } = req.params;
    const bin = getBin(binId);
    if (!bin) return res.status(404).json({ error: 'Bin tidak ditemukan' });
    if (bin.expiresAt && bin.expiresAt < Date.now()) return res.status(410).json({ error: 'Bin kedaluwarsa' });

    if (bin.password) {
      const binPass = Buffer.from(bin.password, 'base64').toString();
      if (req.query.password !== binPass) return res.status(401).json({ error: 'Password salah' });
    }

    const fileRecord = bin.files && bin.files.find(f => f.id === fileId);
    if (!fileRecord) return res.status(404).json({ error: 'File tidak ditemukan' });

    const filePath = path.join(__dirname, '../../uploads', binId, fileRecord.storedName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ada' });

    const mimeType = fileRecord.mimeType || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Preview gagal' });
  }
});

module.exports = router;
