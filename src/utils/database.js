const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../uploads/db.json');

function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = { bins: {}, files: {}, stats: { totalUploads: 0, totalDownloads: 0, totalBins: 0 } };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
  return readDB();
}

function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) { return initDB(); }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getBin(binId) {
  const db = readDB();
  return db.bins[binId] || null;
}

function createBin(binId, binData) {
  const db = readDB();
  db.bins[binId] = binData;
  db.stats.totalBins++;
  writeDB(db);
  return binData;
}

function updateBin(binId, updates) {
  const db = readDB();
  if (db.bins[binId]) {
    db.bins[binId] = { ...db.bins[binId], ...updates };
    writeDB(db);
    return db.bins[binId];
  }
  return null;
}

function deleteBin(binId) {
  const db = readDB();
  if (db.bins[binId]) { delete db.bins[binId]; writeDB(db); return true; }
  return false;
}

function addFileRecord(fileId, fileData) {
  const db = readDB();
  db.files[fileId] = fileData;
  db.stats.totalUploads++;
  writeDB(db);
}

function getFileRecord(fileId) {
  const db = readDB();
  return db.files[fileId] || null;
}

function incrementDownload(fileId) {
  const db = readDB();
  if (db.files[fileId]) {
    db.files[fileId].downloads = (db.files[fileId].downloads || 0) + 1;
    db.stats.totalDownloads++;
    writeDB(db);
  }
}

function getStats() {
  const db = readDB();
  return db.stats;
}

function getAllBins() {
  const db = readDB();
  return Object.values(db.bins);
}

function cleanupExpired() {
  const db = readDB();
  const now = Date.now();
  let cleaned = 0;
  for (const [binId, bin] of Object.entries(db.bins)) {
    if (bin.expiresAt && bin.expiresAt < now) {
      if (bin.files) {
        for (const file of bin.files) {
          try { fs.unlinkSync(path.join(__dirname, '../../uploads', binId, file.storedName)); } catch(e) {}
        }
      }
      try { fs.rmdirSync(path.join(__dirname, '../../uploads', binId), { recursive: true }); } catch(e) {}
      delete db.bins[binId];
      cleaned++;
    }
  }
  if (cleaned > 0) { writeDB(db); console.log('Cleaned ' + cleaned + ' expired bins'); }
}

setInterval(cleanupExpired, 60 * 60 * 1000);

module.exports = { initDB, readDB, getBin, createBin, updateBin, deleteBin, addFileRecord, getFileRecord, incrementDownload, getStats, getAllBins, cleanupExpired };
