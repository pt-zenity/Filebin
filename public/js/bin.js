// ====================================
// FileBin - Bin Page
// ====================================

let binData = null;
let binPassword = '';
const binId = window.location.pathname.split('/bin/')[1]?.split('/')[0];

// ==================
// INIT
// ==================
document.addEventListener('DOMContentLoaded', () => {
  if (!binId) {
    showError('ID Bin Tidak Valid', 'URL bin tidak valid.');
    return;
  }
  loadBin();
});

async function loadBin(password = '') {
  showState('loading');
  
  try {
    const url = `/api/bin/${binId}${password ? `?password=${encodeURIComponent(password)}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();

    if (res.status === 404) {
      showError('Bin Tidak Ditemukan', 'Bin yang Anda cari tidak ada atau sudah dihapus.');
      return;
    }

    if (res.status === 410) {
      showError('Bin Kedaluwarsa', `Bin ini sudah tidak tersedia (kedaluwarsa pada ${data.expiredAt ? new Date(data.expiredAt).toLocaleString('id-ID') : 'waktu yang lalu'}).`);
      return;
    }

    if (res.status === 200 && data.requiresPassword && !password) {
      showState('password');
      return;
    }

    if (res.status === 401) {
      const errorEl = document.getElementById('passwordError');
      errorEl.classList.remove('hidden');
      showState('password');
      return;
    }

    if (res.status === 200) {
      binData = data;
      binPassword = password;
      renderBin(data);
      showState('content');
      return;
    }

    showError('Terjadi Kesalahan', data.error || 'Gagal memuat bin.');

  } catch (e) {
    showError('Koneksi Gagal', 'Tidak dapat terhubung ke server.');
  }
}

function unlockBin() {
  const passwordInput = document.getElementById('binPasswordInput');
  const password = passwordInput.value.trim();
  if (!password) {
    showToast('Masukkan password terlebih dahulu', 'error');
    return;
  }
  document.getElementById('passwordError').classList.add('hidden');
  loadBin(password);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const gate = document.getElementById('passwordGate');
    if (!gate.classList.contains('hidden')) unlockBin();
    if (document.getElementById('previewModal') && !document.getElementById('previewModal').classList.contains('hidden')) closePreview();
  }
  if (e.key === 'Escape') closePreview();
});

// ==================
// RENDER BIN
// ==================
function renderBin(data) {
  // Update meta
  document.title = `FileBin - Bin ${data.id}`;
  document.getElementById('binIdDisplay').textContent = data.id;
  
  if (data.description) {
    const descEl = document.getElementById('binDescription');
    descEl.textContent = data.description;
    descEl.classList.remove('hidden');
  }

  document.getElementById('binCreatedAt').textContent = formatDate(data.createdAt);
  document.getElementById('binFileCount').textContent = data.files.length;
  document.getElementById('binTotalSize').textContent = formatBytes(data.totalSize || 0);

  if (data.expiresAt) {
    document.getElementById('binExpiresAt').textContent = formatDate(data.expiresAt);
  } else {
    document.getElementById('binExpiresAt').textContent = 'Tidak pernah';
  }

  // Render files
  const container = document.getElementById('fileListContainer');
  
  if (data.files.length === 0) {
    container.innerHTML = `
      <div class="state-card" style="margin:0;grid-column:1/-1">
        <div style="font-size:48px;margin-bottom:16px">📂</div>
        <h3>Bin Kosong</h3>
        <p>Tidak ada file dalam bin ini.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = data.files.map(file => renderFileCard(file)).join('');
}

function renderFileCard(file) {
  const isImage = file.type && file.type.startsWith('image/');
  const isVideo = file.type && file.type.startsWith('video/');
  const isAudio = file.type && file.type.startsWith('audio/');
  const isText = file.type && (file.type.startsWith('text/') || file.type === 'application/json');
  const isPdf = file.type === 'application/pdf';
  
  const canPreview = isImage || isVideo || isAudio || isText || isPdf;
  const emoji = getFileEmoji(file.type || '', file.name);
  const downloadUrl = `/api/download/${binId}/${file.id}${binPassword ? `?password=${encodeURIComponent(binPassword)}` : ''}`;
  const previewUrl = `/api/download/${binId}/${file.id}/preview${binPassword ? `?password=${encodeURIComponent(binPassword)}` : ''}`;

  const previewContent = isImage 
    ? `<img src="${previewUrl}" alt="${escapeHtml(file.name)}" loading="lazy">`
    : `<div class="file-card-preview-icon">${emoji}</div>`;

  return `
    <div class="file-card">
      <div class="file-card-preview" ${canPreview ? `onclick="openPreview('${file.id}', '${escapeHtml(file.name)}', '${file.type || ''}', '${previewUrl}', '${downloadUrl}')"` : ''} 
           style="${canPreview ? 'cursor:pointer' : 'cursor:default'}">
        ${previewContent}
      </div>
      <div class="file-card-body">
        <div class="file-card-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
        <div class="file-card-meta">
          <span class="file-card-size">${formatBytes(file.size)}</span>
          <span class="file-card-type">${getFileTypeLabel(file.type, file.name)}</span>
        </div>
        <div class="file-card-actions">
          ${canPreview ? `
            <button class="btn btn-secondary" onclick="openPreview('${file.id}', '${escapeHtml(file.name)}', '${file.type || ''}', '${previewUrl}', '${downloadUrl}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Preview
            </button>
          ` : ''}
          <a href="${downloadUrl}" class="btn btn-primary" download="${escapeHtml(file.name)}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Download
          </a>
        </div>
      </div>
    </div>
  `;
}

// ==================
// PREVIEW MODAL
// ==================
function openPreview(fileId, fileName, fileType, previewUrl, downloadUrl) {
  const modal = document.getElementById('previewModal');
  const body = document.getElementById('previewBody');
  document.getElementById('previewFileName').textContent = fileName;

  let content = '';
  
  if (fileType.startsWith('image/')) {
    content = `<img src="${previewUrl}" alt="${escapeHtml(fileName)}">`;
  } else if (fileType.startsWith('video/')) {
    content = `<video controls style="max-height:60vh;width:100%"><source src="${previewUrl}">Browser tidak mendukung video ini.</video>`;
  } else if (fileType.startsWith('audio/')) {
    content = `<div style="width:100%;padding:20px 0"><audio controls style="width:100%"><source src="${previewUrl}">Browser tidak mendukung audio ini.</audio></div>`;
  } else if (fileType === 'application/pdf') {
    content = `<iframe src="${previewUrl}" style="width:100%;height:60vh;border:none;border-radius:8px"></iframe>`;
  } else {
    // Text preview - fetch content
    fetch(previewUrl)
      .then(r => r.text())
      .then(text => {
        body.innerHTML = `<pre>${escapeHtml(text.substring(0, 50000))}</pre>`;
      })
      .catch(() => {
        body.innerHTML = `
          <div style="text-align:center;padding:40px;color:var(--text-muted)">
            <div style="font-size:48px;margin-bottom:16px">📄</div>
            <p>Preview tidak tersedia</p>
            <a href="${downloadUrl}" class="btn btn-primary" style="margin-top:16px">Download File</a>
          </div>
        `;
      });
    content = '<div style="color:var(--text-muted)">Memuat preview...</div>';
  }

  body.innerHTML = content;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closePreview() {
  const modal = document.getElementById('previewModal');
  modal.classList.add('hidden');
  document.getElementById('previewBody').innerHTML = '';
  document.body.style.overflow = '';
}

// ==================
// ACTIONS
// ==================
function downloadAll(e) {
  e.preventDefault();
  if (!binData || !binData.files || binData.files.length === 0) {
    showToast('Tidak ada file untuk didownload', 'error');
    return;
  }
  const zipUrl = `/api/download/${binId}/zip/all${binPassword ? `?password=${encodeURIComponent(binPassword)}` : ''}`;
  window.location.href = zipUrl;
}

function copyBinLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link bin berhasil disalin!', 'success');
  }).catch(() => showToast('Gagal menyalin link', 'error'));
}

// ==================
// UI STATE
// ==================
function showState(state) {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('passwordGate').classList.add('hidden');
  document.getElementById('errorState').classList.add('hidden');
  document.getElementById('binContent').classList.add('hidden');

  if (state === 'loading') document.getElementById('loadingState').classList.remove('hidden');
  else if (state === 'password') document.getElementById('passwordGate').classList.remove('hidden');
  else if (state === 'error') document.getElementById('errorState').classList.remove('hidden');
  else if (state === 'content') document.getElementById('binContent').classList.remove('hidden');
}

function showError(title, message) {
  document.getElementById('errorTitle').textContent = title;
  document.getElementById('errorMessage').textContent = message;
  showState('error');
}

// ==================
// UTILITIES
// ==================
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getFileEmoji(mimeType, name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (!mimeType) mimeType = '';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📕';
  const codeExts = ['js','ts','html','css','py','java','c','cpp','php','go','rs','json','xml','yaml','yml'];
  const archiveExts = ['zip','rar','7z','tar','gz','bz2'];
  if (codeExts.includes(ext)) return '💻';
  if (archiveExts.includes(ext)) return '📦';
  if (['doc','docx'].includes(ext)) return '📝';
  if (['xls','xlsx','csv'].includes(ext)) return '📊';
  if (['ppt','pptx'].includes(ext)) return '📋';
  if (['txt','md','log'].includes(ext)) return '📄';
  return '📎';
}

function getFileTypeLabel(mimeType, name) {
  const ext = (name || '').split('.').pop().toUpperCase();
  if (!mimeType) return ext || 'FILE';
  if (mimeType.startsWith('image/')) return 'Gambar';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('text/')) return 'Teks';
  return ext || 'FILE';
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
