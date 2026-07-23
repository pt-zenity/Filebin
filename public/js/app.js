// ====================================
// FileBin - Main Upload App
// ====================================

let selectedFiles = [];
let currentBinId = null;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const uploadOptions = document.getElementById('uploadOptions');
const uploadCard = document.getElementById('uploadCard');
const uploadResult = document.getElementById('uploadResult');

// ==================
// DRAG & DROP
// ==================
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files);
  addFiles(files);
});

dropZone.addEventListener('click', (e) => {
  if (e.target !== document.getElementById('fileInput') && !e.target.closest('button')) {
    fileInput.click();
  }
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  addFiles(files);
  e.target.value = '';
});

// ==================
// FILE MANAGEMENT
// ==================
function addFiles(files) {
  const maxFiles = 20;
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  for (const file of files) {
    if (selectedFiles.length >= maxFiles) {
      showToast(`Maksimal ${maxFiles} file`, 'error');
      break;
    }
    if (file.size > maxSize) {
      showToast(`${file.name} terlalu besar (max 100MB)`, 'error');
      continue;
    }
    selectedFiles.push(file);
  }

  renderFileList();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
}

function renderFileList() {
  if (selectedFiles.length === 0) {
    fileList.classList.add('hidden');
    uploadOptions.classList.add('hidden');
    return;
  }

  fileList.classList.remove('hidden');
  uploadOptions.classList.remove('hidden');

  fileList.innerHTML = selectedFiles.map((file, index) => `
    <div class="file-item">
      <div class="file-type-icon" style="background:${getFileColor(file.type, file.name)}20">
        ${getFileEmoji(file.type, file.name)}
      </div>
      <div class="file-info">
        <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
        <div class="file-size">${formatBytes(file.size)}</div>
      </div>
      <button class="file-remove" onclick="removeFile(${index})" title="Hapus file">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');
}

// ==================
// UPLOAD
// ==================
async function startUpload() {
  if (selectedFiles.length === 0) {
    showToast('Pilih file terlebih dahulu', 'error');
    return;
  }

  const uploadBtn = document.getElementById('uploadBtn');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite">
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.3"/>
      <path d="M21 12c0-4.97-4.03-9-9-9"/>
    </svg>
    Mengupload...
  `;
  uploadProgress.classList.remove('hidden');

  const formData = new FormData();
  for (const file of selectedFiles) {
    formData.append('files', file);
  }

  formData.append('expiresIn', document.getElementById('expiresIn').value);
  formData.append('password', document.getElementById('password').value);
  formData.append('description', document.getElementById('description').value);

  try {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = percent + '%';
        progressPercent.textContent = percent + '%';
        progressText.textContent = percent < 100 ? 'Mengupload...' : 'Memproses...';
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        showResult(response);
      } else {
        let errorMsg = 'Upload gagal';
        try {
          const err = JSON.parse(xhr.responseText);
          errorMsg = err.error || errorMsg;
        } catch (e) {}
        showToast(errorMsg, 'error');
        resetUploadBtn();
      }
    });

    xhr.addEventListener('error', () => {
      showToast('Koneksi gagal, coba lagi', 'error');
      resetUploadBtn();
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);

  } catch (error) {
    showToast('Upload gagal: ' + error.message, 'error');
    resetUploadBtn();
  }

  function resetUploadBtn() {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
      </svg>
      Upload Sekarang
    `;
    uploadProgress.classList.add('hidden');
  }
}

function showResult(response) {
  const binUrl = `${window.location.origin}/bin/${response.binId}`;
  currentBinId = response.binId;
  
  document.getElementById('shareLink').value = binUrl;
  document.getElementById('openBinBtn').href = `/bin/${response.binId}`;
  
  uploadCard.classList.add('hidden');
  uploadResult.classList.remove('hidden');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetUpload() {
  selectedFiles = [];
  currentBinId = null;
  
  fileList.innerHTML = '';
  fileList.classList.add('hidden');
  uploadOptions.classList.add('hidden');
  document.getElementById('uploadProgress').classList.add('hidden');
  document.getElementById('description').value = '';
  document.getElementById('password').value = '';
  document.getElementById('expiresIn').value = '7d';

  const uploadBtn = document.getElementById('uploadBtn');
  uploadBtn.disabled = false;
  uploadBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
    </svg>
    Upload Sekarang
  `;
  
  uploadCard.classList.remove('hidden');
  uploadResult.classList.add('hidden');
}

// ==================
// COPY & SHARE
// ==================
function copyLink() {
  const link = document.getElementById('shareLink').value;
  const btn = document.getElementById('copyBtn');
  
  navigator.clipboard.writeText(link).then(() => {
    btn.classList.add('copied');
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Tersalin!
    `;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        Salin
      `;
    }, 2500);
    showToast('Link berhasil disalin!', 'success');
  }).catch(() => {
    const input = document.getElementById('shareLink');
    input.select();
    document.execCommand('copy');
    showToast('Link disalin!', 'success');
  });
}

function shareWhatsApp() {
  const link = document.getElementById('shareLink').value;
  const text = `Hei, ini file yang kubagikan via FileBin: ${link}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function shareTelegram() {
  const link = document.getElementById('shareLink').value;
  const text = `File dibagikan via FileBin:`;
  window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
}

function shareEmail() {
  const link = document.getElementById('shareLink').value;
  const subject = 'File dikirim via FileBin';
  const body = `Halo,\n\nSaya membagikan file kepada Anda melalui FileBin:\n${link}\n\nSalam.`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ==================
// STATS
// ==================
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();
    
    document.getElementById('statUploads').textContent = formatNumber(data.totalUploads);
    document.getElementById('statDownloads').textContent = formatNumber(data.totalDownloads);
    document.getElementById('statBins').textContent = formatNumber(data.activeBins);
    document.getElementById('statStorage').textContent = data.totalStorage;
  } catch (e) {}
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

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getFileEmoji(mimeType, name) {
  const ext = name.split('.').pop().toLowerCase();
  const imgExts = ['jpg','jpeg','png','gif','webp','svg','bmp','ico','avif'];
  const videoExts = ['mp4','webm','avi','mov','mkv','flv','wmv'];
  const audioExts = ['mp3','wav','ogg','flac','aac','m4a'];
  const docExts = ['pdf'];
  const codeExts = ['js','ts','html','css','py','java','c','cpp','php','go','rs','json','xml','yaml','yml'];
  const archiveExts = ['zip','rar','7z','tar','gz','bz2'];
  const wordExts = ['doc','docx'];
  const sheetExts = ['xls','xlsx'];
  const pptExts = ['ppt','pptx'];
  const textExts = ['txt','md','log','csv'];

  if (imgExts.includes(ext) || mimeType.startsWith('image/')) return '🖼️';
  if (videoExts.includes(ext) || mimeType.startsWith('video/')) return '🎬';
  if (audioExts.includes(ext) || mimeType.startsWith('audio/')) return '🎵';
  if (docExts.includes(ext) || mimeType === 'application/pdf') return '📕';
  if (codeExts.includes(ext)) return '💻';
  if (archiveExts.includes(ext)) return '📦';
  if (wordExts.includes(ext)) return '📝';
  if (sheetExts.includes(ext)) return '📊';
  if (pptExts.includes(ext)) return '📋';
  if (textExts.includes(ext)) return '📄';
  return '📎';
}

function getFileColor(mimeType, name) {
  const emoji = getFileEmoji(mimeType, name);
  const colors = { '🖼️': '#10b981', '🎬': '#ef4444', '🎵': '#f59e0b', '📕': '#ef4444', '💻': '#6366f1', '📦': '#f59e0b', '📝': '#3b82f6', '📊': '#10b981', '📋': '#f59e0b', '📄': '#94a3b8', '📎': '#6366f1' };
  return colors[emoji] || '#6366f1';
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

// Add spin animation
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

// Init
loadStats();
