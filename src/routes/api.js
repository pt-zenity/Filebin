const express = require('express');
const { getStats, getAllBins } = require('../utils/database');

const router = express.Router();

router.get('/stats', (req, res) => {
  try {
    const stats = getStats();
    const bins = getAllBins();
    const now = Date.now();
    const activeBins = bins.filter(b => !b.expiresAt || b.expiresAt > now).length;
    const totalFiles = bins.reduce((s, b) => s + (b.files ? b.files.length : 0), 0);
    const totalStorageBytes = bins.reduce((s, b) => s + (b.totalSize || 0), 0);
    res.json({
      totalBins: stats.totalBins, activeBins, totalFiles,
      totalUploads: stats.totalUploads, totalDownloads: stats.totalDownloads,
      totalStorage: formatBytes(totalStorageBytes)
    });
  } catch (error) { res.status(500).json({ error: 'Gagal mendapatkan statistik' }); }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
