const express = require('express');
const path = require('path');
const fs = require('fs');
const { getBin, updateBin, deleteBin } = require('../utils/database');

const router = express.Router();

router.get('/:binId', (req, res) => {
  try {
    const bin = getBin(req.params.binId);
    if (!bin) return res.status(404).json({ error: 'Bin tidak ditemukan' });
    if (bin.expiresAt && bin.expiresAt < Date.now()) {
      return res.status(410).json({ error: 'Bin sudah kedaluwarsa', expired: true, expiredAt: new Date(bin.expiresAt).toISOString() });
    }
    const hasPassword = !!bin.password;
    const { password } = req.query;
    if (hasPassword && !password) {
      return res.json({ id: bin.id, requiresPassword: true, createdAt: bin.createdAt, expiresAt: bin.expiresAt, fileCount: bin.files ? bin.files.length : 0, description: bin.description });
    }
    if (hasPassword && password) {
      const binPass = Buffer.from(bin.password, 'base64').toString();
      if (password !== binPass) return res.status(401).json({ error: 'Password salah', requiresPassword: true });
    }
    res.json({
      id: bin.id, createdAt: bin.createdAt, expiresAt: bin.expiresAt, expiresIn: bin.expiresIn,
      description: bin.description, hasPassword, downloadCount: bin.downloadCount || 0, totalSize: bin.totalSize || 0,
      files: (bin.files || []).map(f => ({ id: f.id, name: f.originalName, size: f.size, type: f.mimeType, uploadedAt: f.uploadedAt, downloads: f.downloads || 0 }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mendapatkan bin' });
  }
});

router.delete('/:binId', (req, res) => {
  try {
    const bin = getBin(req.params.binId);
    if (!bin) return res.status(404).json({ error: 'Bin tidak ditemukan' });
    if (bin.files) {
      for (const file of bin.files) {
        try { fs.unlinkSync(path.join(__dirname, '../../uploads', req.params.binId, file.storedName)); } catch(e) {}
      }
    }
    try { fs.rmdirSync(path.join(__dirname, '../../uploads', req.params.binId), { recursive: true }); } catch(e) {}
    deleteBin(req.params.binId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus bin' });
  }
});

module.exports = router;
