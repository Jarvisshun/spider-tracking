/**
 * Spidey Tracker UGC Upload System
 * 用户上传蜘蛛侠目击内容（图片/视频 + 描述 + GPS 定位）
 */
(function () {
  'use strict';

  var API_BASE = 'http://127.0.0.1:5000';
  var currentFile = null;
  var currentPreview = null;
  var userLocation = null;

  // ============================================================
  // 1. HTML 注入
  // ============================================================
  function injectHTML() {
    var html = [
      '<div class="ugc-upload-btn-wrap">',
      '  <button class="ugc-upload-btn" id="ugc-upload-btn" title="上报蜘蛛侠目击">',
      '    <span class="ugc-upload-btn-icon">📸</span>',
      '    <span class="ugc-upload-btn-text">上报目击</span>',
      '  </button>',
      '</div>',
      '<div class="ugc-modal-overlay" id="ugc-modal-overlay">',
      '  <div class="ugc-modal" id="ugc-modal">',
      '    <div class="ugc-modal-header">',
      '      <h2 class="ugc-modal-title">🕷️ 上报蜘蛛侠目击</h2>',
      '      <button class="ugc-modal-close" id="ugc-modal-close">&times;</button>',
      '    </div>',
      '    <div class="ugc-modal-body">',
      '      <div class="ugc-form-group">',
      '        <label class="ugc-label">选择文件</label>',
      '        <div class="ugc-file-area" id="ugc-file-area">',
      '          <span class="ugc-file-placeholder">点击或拖拽上传图片/视频</span>',
      '          <input type="file" id="ugc-file-input" accept="image/*,video/*" class="ugc-file-input">',
      '        </div>',
      '        <div class="ugc-preview" id="ugc-preview" style="display:none">',
      '          <img id="ugc-preview-img" style="display:none">',
      '          <video id="ugc-preview-video" controls style="display:none"></video>',
      '          <button class="ugc-remove-file" id="ugc-remove-file">移除</button>',
      '        </div>',
      '      </div>',
      '      <div class="ugc-form-group">',
      '        <label class="ugc-label" for="ugc-description">描述</label>',
      '        <textarea id="ugc-description" class="ugc-textarea" placeholder="描述你看到的蜘蛛侠...（需包含蜘蛛侠相关关键词）" maxlength="500" rows="3"></textarea>',
      '      </div>',
      '      <div class="ugc-form-group">',
      '        <label class="ugc-label" for="ugc-author">你的昵称</label>',
      '        <input type="text" id="ugc-author" class="ugc-input" placeholder="匿名用户" maxlength="30">',
      '      </div>',
      '      <div class="ugc-form-group">',
      '        <label class="ugc-label">位置</label>',
      '        <div class="ugc-location-row">',
      '          <button class="ugc-location-btn" id="ugc-location-btn">📍 获取当前位置</button>',
      '          <span class="ugc-location-status" id="ugc-location-status">未获取</span>',
      '        </div>',
      '        <div class="ugc-coords" id="ugc-coords" style="display:none">',
      '          <input type="text" id="ugc-lat" class="ugc-input-half" placeholder="纬度" readonly>',
      '          <input type="text" id="ugc-lng" class="ugc-input-half" placeholder="经度" readonly>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="ugc-modal-footer">',
      '      <span class="ugc-status" id="ugc-status"></span>',
      '      <button class="ugc-submit-btn" id="ugc-submit-btn" disabled>提交目击</button>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('\n');

    var container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
  }

  // ============================================================
  // 2. 样式注入
  // ============================================================
  function injectStyles() {
    if (document.getElementById('ugc-styles')) return;
    var style = document.createElement('style');
    style.id = 'ugc-styles';
    style.textContent = [
      '.ugc-upload-btn-wrap { position: fixed; bottom: 24px; right: 24px; z-index: 99990; }',
      '.ugc-upload-btn {',
      '  display: flex; align-items: center; gap: 8px;',
      '  padding: 12px 20px;',
      '  background: linear-gradient(135deg, #dc1414, #b01010);',
      '  color: #fff; border: 2px solid rgba(255,255,255,0.3);',
      '  border-radius: 12px; cursor: pointer;',
      '  font-family: monospace, sans-serif; font-size: 14px; font-weight: 700;',
      '  letter-spacing: 1px; text-transform: uppercase;',
      '  box-shadow: 0 4px 20px rgba(220,20,20,0.4);',
      '  transition: all 0.25s ease;',
      '}',
      '.ugc-upload-btn:hover {',
      '  transform: translateY(-2px) scale(1.03);',
      '  box-shadow: 0 6px 28px rgba(220,20,20,0.6);',
      '}',
      '.ugc-upload-btn-icon { font-size: 20px; }',
      '.ugc-modal-overlay {',
      '  display: none; position: fixed; inset: 0; z-index: 99999;',
      '  background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);',
      '  justify-content: center; align-items: center;',
      '}',
      '.ugc-modal-overlay.active { display: flex; }',
      '.ugc-modal {',
      '  background: #1a1a2e; border: 2px solid #dc1414;',
      '  border-radius: 16px; width: 90%; max-width: 520px;',
      '  max-height: 90vh; overflow-y: auto;',
      '  box-shadow: 0 0 60px rgba(220,20,20,0.3);',
      '  color: #e0e0e0; font-family: monospace, sans-serif;',
      '}',
      '.ugc-modal-header {',
      '  display: flex; justify-content: space-between; align-items: center;',
      '  padding: 16px 20px; border-bottom: 1px solid rgba(220,20,20,0.3);',
      '}',
      '.ugc-modal-title { margin: 0; font-size: 18px; color: #dc1414; }',
      '.ugc-modal-close {',
      '  background: none; border: none; color: #888; font-size: 28px;',
      '  cursor: pointer; line-height: 1;',
      '}',
      '.ugc-modal-close:hover { color: #fff; }',
      '.ugc-modal-body { padding: 20px; }',
      '.ugc-form-group { margin-bottom: 16px; }',
      '.ugc-label { display: block; margin-bottom: 6px; font-size: 12px; color: #96e0f7; text-transform: uppercase; letter-spacing: 1px; }',
      '.ugc-file-area {',
      '  border: 2px dashed rgba(220,20,20,0.4); border-radius: 10px;',
      '  padding: 30px; text-align: center; cursor: pointer; position: relative;',
      '  transition: border-color 0.2s;',
      '}',
      '.ugc-file-area:hover { border-color: #dc1414; }',
      '.ugc-file-placeholder { color: #666; font-size: 13px; }',
      '.ugc-file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }',
      '.ugc-preview { text-align: center; }',
      '.ugc-preview img, .ugc-preview video { max-width: 100%; max-height: 200px; border-radius: 8px; margin-bottom: 8px; }',
      '.ugc-remove-file { background: #333; color: #ff4444; border: 1px solid #ff4444; border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: 12px; }',
      '.ugc-textarea, .ugc-input {',
      '  width: 100%; padding: 10px; background: #0d0d1a; color: #e0e0e0;',
      '  border: 1px solid rgba(220,20,20,0.3); border-radius: 8px;',
      '  font-family: monospace, sans-serif; font-size: 13px;',
      '  resize: vertical; box-sizing: border-box;',
      '}',
      '.ugc-textarea:focus, .ugc-input:focus { border-color: #dc1414; outline: none; }',
      '.ugc-location-row { display: flex; align-items: center; gap: 10px; }',
      '.ugc-location-btn {',
      '  padding: 8px 14px; background: #2a2a4a; color: #96e0f7;',
      '  border: 1px solid #96e0f7; border-radius: 8px; cursor: pointer;',
      '  font-family: monospace; font-size: 12px;',
      '}',
      '.ugc-location-btn:hover { background: #3a3a5a; }',
      '.ugc-location-status { color: #666; font-size: 12px; }',
      '.ugc-location-status.success { color: #00ff50; }',
      '.ugc-coords { display: flex; gap: 8px; margin-top: 8px; }',
      '.ugc-input-half {',
      '  flex: 1; padding: 8px; background: #0d0d1a; color: #888;',
      '  border: 1px solid rgba(150,224,247,0.3); border-radius: 6px;',
      '  font-family: monospace; font-size: 12px;',
      '}',
      '.ugc-modal-footer {',
      '  display: flex; justify-content: space-between; align-items: center;',
      '  padding: 16px 20px; border-top: 1px solid rgba(220,20,20,0.3);',
      '}',
      '.ugc-status { font-size: 12px; color: #888; }',
      '.ugc-status.error { color: #ff4444; }',
      '.ugc-status.success { color: #00ff50; }',
      '.ugc-submit-btn {',
      '  padding: 10px 24px; background: #dc1414; color: #fff;',
      '  border: none; border-radius: 8px; cursor: pointer;',
      '  font-family: monospace; font-size: 14px; font-weight: 700;',
      '  letter-spacing: 1px; text-transform: uppercase;',
      '  transition: all 0.2s;',
      '}',
      '.ugc-submit-btn:disabled { background: #444; cursor: not-allowed; }',
      '.ugc-submit-btn:not(:disabled):hover { background: #ff2020; }',
      '@media (max-width: 640px) {',
      '  .ugc-upload-btn-wrap { bottom: 12px; right: 12px; }',
      '  .ugc-upload-btn { padding: 10px 16px; font-size: 12px; }',
      '  .ugc-upload-btn-text { display: none; }',
      '  .ugc-modal { width: 95%; max-width: none; }',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ============================================================
  // 3. 事件绑定
  // ============================================================
  function bindEvents() {
    var overlay = document.getElementById('ugc-modal-overlay');
    var btn = document.getElementById('ugc-upload-btn');
    var closeBtn = document.getElementById('ugc-modal-close');
    var fileInput = document.getElementById('ugc-file-input');
    var fileArea = document.getElementById('ugc-file-area');
    var removeBtn = document.getElementById('ugc-remove-file');
    var locationBtn = document.getElementById('ugc-location-btn');
    var submitBtn = document.getElementById('ugc-submit-btn');
    var description = document.getElementById('ugc-description');

    if (!overlay || !btn) return;

    btn.addEventListener('click', function () { overlay.classList.add('active'); });
    closeBtn.addEventListener('click', function () { overlay.classList.remove('active'); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('active');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') overlay.classList.remove('active');
    });

    fileInput.addEventListener('change', function (e) { handleFile(e.target.files[0]); });
    fileArea.addEventListener('dragover', function (e) { e.preventDefault(); fileArea.style.borderColor = '#dc1414'; });
    fileArea.addEventListener('dragleave', function () { fileArea.style.borderColor = ''; });
    fileArea.addEventListener('drop', function (e) {
      e.preventDefault();
      fileArea.style.borderColor = '';
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    removeBtn.addEventListener('click', function () { clearFile(); });
    locationBtn.addEventListener('click', getLocation);

    description.addEventListener('input', updateSubmitState);
    submitBtn.addEventListener('click', submitSighting);
  }

  // ============================================================
  // 4. 文件处理
  // ============================================================
  function handleFile(file) {
    if (!file) return;
    var ext = file.name.split('.').pop().toLowerCase();
    var allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov', 'avi'];
    if (allowed.indexOf(ext) === -1) {
      setStatus('不支持的文件类型: .' + ext, 'error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setStatus('文件过大，最大 50MB', 'error');
      return;
    }

    currentFile = file;
    var preview = document.getElementById('ugc-preview');
    var img = document.getElementById('ugc-preview-img');
    var video = document.getElementById('ugc-preview-video');
    var fileArea = document.getElementById('ugc-file-area');
    var placeholder = fileArea.querySelector('.ugc-file-placeholder');

    placeholder.textContent = file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + 'MB)';
    preview.style.display = 'block';

    var url = URL.createObjectURL(file);
    if (['mp4', 'webm', 'mov', 'avi'].indexOf(ext) !== -1) {
      video.style.display = 'block';
      video.src = url;
      img.style.display = 'none';
    } else {
      img.style.display = 'block';
      img.src = url;
      video.style.display = 'none';
    }
    currentPreview = url;
    setStatus('', '');
    updateSubmitState();
  }

  function clearFile() {
    currentFile = null;
    if (currentPreview) URL.revokeObjectURL(currentPreview);
    currentPreview = null;
    var preview = document.getElementById('ugc-preview');
    var img = document.getElementById('ugc-preview-img');
    var video = document.getElementById('ugc-preview-video');
    var fileInput = document.getElementById('ugc-file-input');
    var placeholder = document.querySelector('.ugc-file-placeholder');
    preview.style.display = 'none';
    img.style.display = 'none';
    video.style.display = 'none';
    img.src = '';
    video.src = '';
    fileInput.value = '';
    if (placeholder) placeholder.textContent = '点击或拖拽上传图片/视频';
    setStatus('', '');
    updateSubmitState();
  }

  // ============================================================
  // 5. GPS 定位
  // ============================================================
  function getLocation() {
    var status = document.getElementById('ugc-location-status');
    var coordsDiv = document.getElementById('ugc-coords');
    status.textContent = '获取中...';
    status.className = 'ugc-location-status';

    if (!navigator.geolocation) {
      status.textContent = '浏览器不支持定位';
      status.className = 'ugc-location-status error';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        document.getElementById('ugc-lat').value = userLocation.lat.toFixed(6);
        document.getElementById('ugc-lng').value = userLocation.lng.toFixed(6);
        coordsDiv.style.display = 'flex';
        status.textContent = '已获取 ✓';
        status.className = 'ugc-location-status success';
        updateSubmitState();
      },
      function (err) {
        var msg = err.code === 1 ? '请允许定位权限' : err.code === 2 ? '定位不可用' : '定位超时';
        status.textContent = msg;
        status.className = 'ugc-location-status error';
        userLocation = null;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  // ============================================================
  // 6. 提交逻辑
  // ============================================================
  function updateSubmitState() {
    var btn = document.getElementById('ugc-submit-btn');
    var desc = document.getElementById('ugc-description').value.trim();
    btn.disabled = !currentFile || !desc;
  }

  function setStatus(msg, type) {
    var el = document.getElementById('ugc-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'ugc-status ' + (type || '');
  }

  async function submitSighting() {
    var btn = document.getElementById('ugc-submit-btn');
    if (btn.disabled) return;

    setStatus('上传中...', '');
    btn.disabled = true;
    btn.textContent = '上传中...';

    var formData = new FormData();
    formData.append('file', currentFile);
    formData.append('description', document.getElementById('ugc-description').value.trim());
    formData.append('author', document.getElementById('ugc-author').value.trim());
    if (userLocation) {
      formData.append('lat', userLocation.lat);
      formData.append('lng', userLocation.lng);
    }

    try {
      var resp = await fetch(API_BASE + '/api/upload', {
        method: 'POST',
        body: formData,
      });
      var data = await resp.json();

      if (resp.ok && data.success) {
        setStatus('✅ 目击上报成功！', 'success');
        clearFile();
        document.getElementById('ugc-description').value = '';
        document.getElementById('ugc-author').value = '';
        setTimeout(function () {
          document.getElementById('ugc-modal-overlay').classList.remove('active');
        }, 1500);
      } else {
        setStatus('❌ ' + (data.error || '上传失败'), 'error');
      }
    } catch (e) {
      setStatus('❌ 网络错误，请确认后端服务已启动', 'error');
      console.error('[UGC] Upload error:', e);
    } finally {
      btn.disabled = false;
      btn.textContent = '提交目击';
      updateSubmitState();
    }
  }

  // ============================================================
  // 7. 初始化
  // ============================================================
  function init() {
    injectStyles();
    injectHTML();
    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(bindEvents, 500);
      });
    } else {
      setTimeout(bindEvents, 500);
    }
    console.log('[UGC] 上传系统已初始化');
  }

  init();
})();