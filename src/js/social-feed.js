/**
 * Spidey Tracker — Social Media Feed Panel
 * Aggregates YouTube, Reddit, and X/Twitter feeds
 */
(function () {
  'use strict';

  const API_BASE = 'http://127.0.0.1:5000/api/social';
  let panelVisible = false;
  let currentTab = 'youtube';
  let cachedData = null;

  // ============================================================
  // 1. Inject styles
  // ============================================================
  function injectStyles() {
    if (document.getElementById('social-feed-styles')) return;
    const style = document.createElement('style');
    style.id = 'social-feed-styles';
    style.textContent = `
      #social-feed-btn {
        position: fixed; bottom: 140px; right: 24px; z-index: 99998;
        width: 48px; height: 48px; border-radius: 50%;
        background: linear-gradient(135deg, #1da1f2, #ff4500, #ff0000);
        border: 2px solid rgba(255,255,255,0.4); color: #fff;
        font-size: 20px; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.2s ease;
      }
      #social-feed-btn:hover { transform: scale(1.1); }
      #social-feed-panel {
        position: fixed; bottom: 200px; right: 20px; z-index: 99997;
        width: 420px; max-width: 95vw; max-height: 70vh;
        background: rgba(10, 20, 40, 0.95); color: #c8d6e5;
        border: 2px solid rgba(150, 224, 247, 0.3);
        border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        display: none; flex-direction: column; overflow: hidden;
        font-family: 'PF Videotext Pro', monospace, sans-serif;
        backdrop-filter: blur(10px);
      }
      #social-feed-panel.visible { display: flex; }
      #social-feed-header {
        padding: 12px 16px; border-bottom: 1px solid rgba(150,224,247,0.2);
        display: flex; justify-content: space-between; align-items: center;
        background: rgba(0,0,0,0.3);
      }
      #social-feed-header h3 { margin: 0; font-size: 14px; color: #96e0f7; text-transform: uppercase; }
      #social-feed-refresh { background: none; border: 1px solid rgba(150,224,247,0.4); color: #96e0f7; font-size: 12px; cursor: pointer; padding: 2px 8px; border-radius: 4px; transition: all 0.2s; }
      #social-feed-refresh:hover { background: rgba(150,224,247,0.15); }
      #social-feed-refresh:disabled { opacity: 0.4; cursor: wait; }
      #social-feed-close { background: none; border: none; color: #96e0f7; font-size: 18px; cursor: pointer; }
      #social-feed-tabs {
        display: flex; border-bottom: 1px solid rgba(150,224,247,0.15);
        padding: 0 8px;
      }
      .social-tab {
        padding: 8px 14px; border: none; background: none; color: #8899aa;
        font-size: 11px; cursor: pointer; text-transform: uppercase;
        border-bottom: 2px solid transparent; transition: all 0.2s;
        font-family: inherit;
      }
      .social-tab.active { color: #96e0f7; border-bottom-color: #96e0f7; }
      .social-tab:hover { color: #c8d6e5; }
      #social-feed-content {
        flex: 1; overflow-y: auto; padding: 12px;
        max-height: 50vh; scrollbar-width: thin;
        scrollbar-color: rgba(150,224,247,0.3) transparent;
      }
      .social-post {
        padding: 10px 12px; margin-bottom: 8px;
        background: rgba(255,255,255,0.04); border-radius: 8px;
        border-left: 3px solid rgba(150,224,247,0.3);
        transition: background 0.2s;
      }
      .social-post:hover { background: rgba(255,255,255,0.08); }
      .social-post-author { font-size: 11px; color: #96e0f7; margin-bottom: 4px; }
      .social-post-text { font-size: 12px; line-height: 1.5; color: #c8d6e5; }
      .social-post-meta { font-size: 10px; color: #667788; margin-top: 6px; display: flex; gap: 12px; }
      .social-post-thumb { float: right; width: 60px; height: 45px; border-radius: 4px; margin-left: 8px; object-fit: cover; }
      .social-post a { color: #96e0f7; text-decoration: none; }
      .social-post a:hover { text-decoration: underline; }
      .social-loading { text-align: center; padding: 20px; color: #667788; font-size: 12px; }
      @media (max-width: 480px) {
        #social-feed-panel { width: 95vw; right: 2.5vw; }
        #social-feed-btn { right: 16px; bottom: 120px; width: 40px; height: 40px; font-size: 16px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // 2. Create button
  // ============================================================
  function createButton() {
    if (document.getElementById('social-feed-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'social-feed-btn';
    btn.title = '社交媒体动态';
    btn.innerHTML = '🌐';
    btn.addEventListener('click', togglePanel);
    document.body.appendChild(btn);
  }

  // ============================================================
  // 3. Create panel
  // ============================================================
  function createPanel() {
    if (document.getElementById('social-feed-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'social-feed-panel';
    panel.innerHTML = `
      <div id="social-feed-header">
        <h3>🕸️ 社交媒体动态</h3>
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="social-feed-refresh" title="刷新">🔄</button>
          <button id="social-feed-close">✕</button>
        </div>
      </div>
      <div id="social-feed-tabs">
        <button class="social-tab active" data-tab="youtube">▶ YouTube</button>
        <button class="social-tab" data-tab="reddit">💬 Reddit</button>
        <button class="social-tab" data-tab="x">𝕏 X</button>
      </div>
      <div id="social-feed-content">
        <div class="social-loading">加载中...</div>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('social-feed-close').addEventListener('click', () => {
      panelVisible = false;
      panel.classList.remove('visible');
    });

    const refreshBtn = document.getElementById('social-feed-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '...';
        cachedData = null;
        await renderFeed(true);
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄';
      });
    }

    panel.querySelectorAll('.social-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        panel.querySelectorAll('.social-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderFeed();
      });
    });
  }

  // ============================================================
  // 4. Fetch data
  // ============================================================
  async function fetchFeed(forceRefresh) {
    if (cachedData && !forceRefresh) return cachedData;
    try {
      const url = forceRefresh ? `${API_BASE}/all?refresh=true` : `${API_BASE}/all`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      cachedData = await resp.json();
      return cachedData;
    } catch (e) {
      console.warn('[Social Feed] 加载失败:', e.message);
      return null;
    }
  }

  // ============================================================
  // 5. Render feed
  // ============================================================
  async function renderFeed(forceRefresh) {
    const content = document.getElementById('social-feed-content');
    if (!content) return;
    content.innerHTML = '<div class="social-loading">加载中...</div>';

    const data = await fetchFeed(forceRefresh);
    if (!data) {
      content.innerHTML = '<div class="social-loading">⚠️ 无法加载社交媒体数据，请确保后端服务已启动</div>';
      return;
    }

    let html = '';
    if (currentTab === 'youtube') {
      const videos = data.youtube?.videos || [];
      const isLive = data.youtube?.live;
      const liveBadge = isLive ? '<span style="color:#00ff50;font-size:10px">● 实时</span>' : '<span style="color:#888;font-size:10px">○ 存档</span>';
      html = '<div style="text-align:center;margin-bottom:8px">' + liveBadge + ` 共 ${videos.length} 条视频</div>`;
      html += videos.map(v => `
        <div class="social-post">
          <a href="${v.url}" target="_blank" rel="noopener">
            ${v.thumbnail ? `<img class="social-post-thumb" src="${v.thumbnail}" alt="${v.title}" loading="lazy">` : ''}
            <div class="social-post-author">${v.channel}</div>
            <div class="social-post-text">${v.title}</div>
          </a>
          <div class="social-post-meta">
            <span>👁 ${v.views}</span>
            <span>📅 ${v.date}</span>
          </div>
        </div>
      `).join('') || '<div class="social-loading">暂无 YouTube 视频</div>';
    } else if (currentTab === 'reddit') {
      const posts = data.reddit?.posts || [];
      const isLive = data.reddit?.live;
      const liveBadge = isLive ? '<span style="color:#00ff50;font-size:10px">● 实时</span>' : '<span style="color:#888;font-size:10px">○ 存档</span>';
      if (data.reddit?.error && !posts.length) {
        html = `<div class="social-loading">⚠️ Reddit 数据获取失败: ${data.reddit.error}</div>`;
      } else {
        html = '<div style="text-align:center;margin-bottom:8px">' + liveBadge + ` 共 ${posts.length} 条帖子</div>`;
        html += posts.map(p => `
          <div class="social-post">
            <a href="${p.url}" target="_blank" rel="noopener">
              ${p.thumbnail ? `<img class="social-post-thumb" src="${p.thumbnail}" alt="" loading="lazy">` : ''}
              <div class="social-post-author">r/${p.subreddit} · ${p.author}</div>
              <div class="social-post-text">${p.title}${p.is_spoiler ? ' <span style="color:#ff4040">[剧透]</span>' : ''}</div>
              ${p.preview ? `<div class="social-post-text" style="font-size:11px;color:#8899aa;margin-top:4px">${p.preview.substring(0,100)}...</div>` : ''}
            </a>
            <div class="social-post-meta">
              ${p.score ? `<span>⬆ ${p.score}</span>` : ''}
              ${p.num_comments ? `<span>💬 ${p.num_comments}</span>` : ''}
              <a href="${p.url}" target="_blank" style="font-size:10px;color:#96e0f7">查看原帖 ↗</a>
            </div>
          </div>
        `).join('') || '<div class="social-loading">暂无 Reddit 帖子</div>';
      }
    } else if (currentTab === 'x') {
      const tweets = data.x?.tweets || [];
      const poolSize = data.x?.total_pool || 20;
      html = '<div style="text-align:center;margin-bottom:8px"><span style="color:#1da1f2;font-size:10px">🔀 随机抽取</span> 共 ' + tweets.length + ' 条推文 (内容池 ' + poolSize + ' 条)</div>';
      html += tweets.map(t => `
        <div class="social-post">
          <div class="social-post-author">${t.author} <span style="color:#667788">${t.handle}</span></div>
          <div class="social-post-text">${t.text}</div>
          <div class="social-post-meta">
            <span>❤ ${t.likes}</span>
            <span>🔄 ${t.retweets}</span>
            <span>📅 ${t.date}</span>
          </div>
        </div>
      `).join('') || '<div class="social-loading">暂无推文</div>';
    }

    content.innerHTML = html;
  }

  // ============================================================
  // 6. Toggle panel
  // ============================================================
  function togglePanel() {
    panelVisible = !panelVisible;
    const panel = document.getElementById('social-feed-panel');
    if (!panel) return;
    if (panelVisible) {
      panel.classList.add('visible');
      cachedData = null; // Refresh on open
      renderFeed();
    } else {
      panel.classList.remove('visible');
    }
  }

  // ============================================================
  // 7. Init
  // ============================================================
  function init() {
    injectStyles();
    createButton();
    createPanel();
    console.log('[Social Feed] 社交媒体面板已就绪');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();