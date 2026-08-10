/**
 * Spidey Tracker — Social Media Feed Panel (v2 — Infinite Scroll)
 * Three platforms (YouTube / Reddit / X) each with independent infinite scroll.
 * Each platform tracks its own offset and loads the next page when scrolling to bottom.
 * The refresh button still works and resets all platforms to fresh data.
 */
(function () {
  'use strict';

  const API_BASE = '/api/social';
  const PAGE_SIZE = 10;

  let panelVisible = false;
  let currentTab = 'youtube';

  // Per-tab state
  const state = {
    youtube: { items: [], offset: 0, loading: false, hasMore: true, initialized: false, live: false },
    reddit:  { items: [], offset: 0, loading: false, hasMore: true, initialized: false, live: false },
    x:       { items: [], offset: 0, loading: false, hasMore: true, initialized: false, live: false },
  };

  // ============================================================
  // 1. Inject styles
  // ============================================================
  function injectStyles() {
    if (document.getElementById('social-feed-styles')) {
      document.getElementById('social-feed-styles').remove();
    }
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
        width: 420px; max-width: 95vw; height: 75vh; max-height: 720px;
        background: rgba(10, 20, 40, 0.96); color: #c8d6e5;
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
      #social-feed-header h3 { margin: 0; font-size: 14px; color: #96e0f7; text-transform: uppercase; letter-spacing: 0.08em; }
      .sf-header-actions { display: flex; gap: 8px; align-items: center; }
      #social-feed-refresh {
        background: none; border: 1px solid rgba(150,224,247,0.4); color: #96e0f7;
        font-size: 14px; cursor: pointer; padding: 2px 10px; border-radius: 4px;
        transition: all 0.2s; line-height: 1.2;
      }
      #social-feed-refresh:hover { background: rgba(150,224,247,0.15); }
      #social-feed-refresh:disabled { opacity: 0.4; cursor: wait; }
      #social-feed-refresh.spin { animation: sf-spin 0.8s linear infinite; }
      @keyframes sf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      #social-feed-close { background: none; border: none; color: #96e0f7; font-size: 18px; cursor: pointer; }
      #social-feed-tabs {
        display: flex; border-bottom: 1px solid rgba(150,224,247,0.15); padding: 0 8px;
      }
      .social-tab {
        padding: 8px 14px; border: none; background: none; color: #8899aa;
        font-size: 11px; cursor: pointer; text-transform: uppercase;
        border-bottom: 2px solid transparent; transition: all 0.2s;
        font-family: inherit; flex: 1;
      }
      .social-tab.active { color: #96e0f7; border-bottom-color: #96e0f7; }
      .social-tab:hover { color: #c8d6e5; }
      #social-feed-content {
        flex: 1; overflow-y: auto; padding: 12px;
        scrollbar-width: thin;
        scrollbar-color: rgba(150,224,247,0.3) transparent;
      }
      #social-feed-content::-webkit-scrollbar { width: 6px; }
      #social-feed-content::-webkit-scrollbar-thumb { background: rgba(150,224,247,0.3); border-radius: 3px; }
      .social-post {
        padding: 10px 12px; margin-bottom: 8px;
        background: rgba(255,255,255,0.04); border-radius: 8px;
        border-left: 3px solid rgba(150,224,247,0.3);
        transition: background 0.2s;
        animation: sf-fadein 0.3s ease-out;
      }
      @keyframes sf-fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .social-post:hover { background: rgba(255,255,255,0.08); }
      .social-post-author { font-size: 11px; color: #96e0f7; margin-bottom: 4px; }
      .social-post-text { font-size: 12px; line-height: 1.5; color: #c8d6e5; }
      .social-post-meta { font-size: 10px; color: #667788; margin-top: 6px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
      .social-post-thumb { float: right; width: 60px; height: 45px; border-radius: 4px; margin-left: 8px; object-fit: cover; }
      .social-post a { color: #96e0f7; text-decoration: none; }
      .social-post a:hover { text-decoration: underline; }
      .social-post a:visited { color: #7db8d4; }
      .social-loading { text-align: center; padding: 16px 8px; color: #667788; font-size: 12px; }
      .social-loading-dots::after {
        content: ''; animation: sf-dots 1.2s steps(4, end) infinite;
      }
      @keyframes sf-dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
      }
      .social-badge {
        display: inline-block; font-size: 9px; padding: 1px 6px; border-radius: 8px;
        margin-left: 6px; vertical-align: middle; letter-spacing: 0.05em;
      }
      .social-badge-live { background: rgba(0,255,80,0.15); color: #00ff50; }
      .social-badge-cached { background: rgba(150,224,247,0.15); color: #8899aa; }
      .social-end { text-align: center; padding: 12px; color: #445566; font-size: 11px; font-style: italic; }
      @media (max-width: 480px) {
        #social-feed-panel { width: 95vw; right: 2.5vw; height: 80vh; }
        #social-feed-btn { right: 16px; bottom: 120px; width: 40px; height: 40px; font-size: 16px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // 2. Create button + panel
  // ============================================================
  function createButton() {
    if (document.getElementById('social-feed-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'social-feed-btn';
    btn.title = 'Social feeds';
    btn.innerHTML = '\uD83C\uDF10';
    btn.addEventListener('click', togglePanel);
    document.body.appendChild(btn);
  }

  function createPanel() {
    if (document.getElementById('social-feed-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'social-feed-panel';
    panel.innerHTML = `
      <div id="social-feed-header">
        <h3>\uD83D\uDD78\uFE0F SOCIAL FEEDS</h3>
        <div class="sf-header-actions">
          <button id="social-feed-refresh" title="Refresh all">\uD83D\uDD04</button>
          <button id="social-feed-close">\u2715</button>
        </div>
      </div>
      <div id="social-feed-tabs">
        <button class="social-tab active" data-tab="youtube">\u25B6 YouTube</button>
        <button class="social-tab" data-tab="reddit">\uD83D\uDCAC Reddit</button>
        <button class="social-tab" data-tab="x">\uD835\uDD4F X</button>
      </div>
      <div id="social-feed-content"></div>
    `;
    document.body.appendChild(panel);

    document.getElementById('social-feed-close').addEventListener('click', () => {
      panelVisible = false;
      panel.classList.remove('visible');
    });

    const refreshBtn = document.getElementById('social-feed-refresh');
    refreshBtn.addEventListener('click', () => refreshAll());

    panel.querySelectorAll('.social-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        panel.querySelectorAll('.social-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderActiveTab();
        // Lazy-init the tab if never loaded before
        const st = state[currentTab];
        if (!st.initialized) loadMore(currentTab);
      });
    });

    // Scroll-to-bottom triggers next page load
    const content = document.getElementById('social-feed-content');
    content.addEventListener('scroll', () => {
      const threshold = 150;
      if (content.scrollTop + content.clientHeight >= content.scrollHeight - threshold) {
        const st = state[currentTab];
        if (st.hasMore && !st.loading) {
          loadMore(currentTab);
        }
      }
    });
  }

  // ============================================================
  // 3. Fetch a single page for a platform
  // ============================================================
  async function fetchPage(platform, offset, refresh) {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(PAGE_SIZE),
    });
    if (refresh && offset === 0) params.set('refresh', 'true');
    const url = API_BASE + '/' + platform + '?' + params.toString();
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  }

  // ============================================================
  // 4. Load more items for a platform (appends to state)
  // ============================================================
  async function loadMore(platform, refresh) {
    const st = state[platform];
    if (st.loading || (!st.hasMore && !refresh)) return;
    st.loading = true;
    if (platform === currentTab) renderActiveTab();

    try {
      const offset = refresh ? 0 : st.offset;
      const data = await fetchPage(platform, offset, refresh);
      let items = [];
      let live = false;
      let hasMore = true;

      if (platform === 'youtube') {
        items = Array.isArray(data.videos) ? data.videos : [];
        live = !!data.live;
        hasMore = data.has_more !== false;
      } else if (platform === 'reddit') {
        items = Array.isArray(data.posts) ? data.posts : [];
        live = !!data.live;
        hasMore = data.has_more !== false;
      } else if (platform === 'x') {
        items = Array.isArray(data.tweets) ? data.tweets : [];
        hasMore = data.has_more !== false;
      }

      if (refresh) {
        st.items = items;
        st.offset = items.length;
      } else {
        // Deduplicate by id to avoid rendering the same item twice
        const seen = new Set(st.items.map(it => it.id));
        const fresh = items.filter(it => !seen.has(it.id));
        st.items = st.items.concat(fresh);
        st.offset += fresh.length;
      }
      st.live = live;
      st.hasMore = hasMore && items.length >= PAGE_SIZE;
      st.initialized = true;
    } catch (e) {
      console.warn('[Social Feed] Failed to load ' + platform + ':', e.message);
      st.initialized = true;
      if (!st.items.length) st.hasMore = false;
    } finally {
      st.loading = false;
      if (platform === currentTab) renderActiveTab();
    }
  }

  // ============================================================
  // 5. Render
  // ============================================================
  function renderActiveTab() {
    const content = document.getElementById('social-feed-content');
    if (!content) return;
    const st = state[currentTab];
    const scrollTop = content.scrollTop;

    if (!st.initialized && !st.loading) {
      content.innerHTML = '<div class="social-loading social-loading-dots">Loading</div>';
      return;
    }

    let html = '';
    // Status header
    const liveBadge = st.live
      ? '<span class="social-badge social-badge-live">\u25CF LIVE</span>'
      : '<span class="social-badge social-badge-cached">\u25CF CACHED</span>';
    html += '<div style="text-align:center;margin-bottom:10px;font-size:11px;color:#667788">' +
            st.items.length + ' items ' + liveBadge + '</div>';

    if (st.items.length === 0 && !st.loading) {
      html += '<div class="social-loading">\u26A0\uFE0F Unable to load feed. Please try refresh.</div>';
    }

    if (currentTab === 'youtube') {
      html += st.items.map(renderYouTubeItem).join('');
    } else if (currentTab === 'reddit') {
      html += st.items.map(renderRedditItem).join('');
    } else if (currentTab === 'x') {
      html += st.items.map(renderXItem).join('');
    }

    if (st.loading) {
      html += '<div class="social-loading social-loading-dots">Loading</div>';
    } else if (!st.hasMore && st.items.length > 0) {
      html += '<div class="social-end">\u2014 End of feed \u2014</div>';
    }

    content.innerHTML = html;
    // Restore scroll position after re-render
    content.scrollTop = scrollTop;
  }

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderYouTubeItem(v) {
    const thumb = v.thumbnail
      ? '<img class="social-post-thumb" src="' + esc(v.thumbnail) + '" alt="' + esc(v.title) + '" loading="lazy" onerror="this.style.display=\'none\'">'
      : '';
    return '<div class="social-post">' +
      '<a href="' + esc(v.url) + '" target="_blank" rel="noopener">' +
        thumb +
        '<div class="social-post-author">' + esc(v.channel) + '</div>' +
        '<div class="social-post-text">' + esc(v.title) + '</div>' +
      '</a>' +
      '<div class="social-post-meta">' +
        '<span>\uD83D\uDC41 ' + esc(v.views) + '</span>' +
        '<span>\uD83D\uDCC5 ' + esc(v.date) + '</span>' +
        '<a href="' + esc(v.url) + '" target="_blank" rel="noopener">Watch \u2197</a>' +
      '</div>' +
    '</div>';
  }

  function renderRedditItem(p) {
    const thumb = p.thumbnail
      ? '<img class="social-post-thumb" src="' + esc(p.thumbnail) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '';
    const spoiler = p.is_spoiler ? ' <span style="color:#ff4040">[SPOILER]</span>' : '';
    const preview = p.preview
      ? '<div class="social-post-text" style="font-size:11px;color:#8899aa;margin-top:4px">' + esc(p.preview.substring(0, 140)) + '...</div>'
      : '';
    return '<div class="social-post">' +
      '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' +
        thumb +
        '<div class="social-post-author">r/' + esc(p.subreddit) + ' \u00B7 ' + esc(p.author) + '</div>' +
        '<div class="social-post-text">' + esc(p.title) + spoiler + '</div>' +
        preview +
      '</a>' +
      '<div class="social-post-meta">' +
        (p.score ? '<span>\u2B06 ' + p.score + '</span>' : '') +
        (p.num_comments ? '<span>\uD83D\uDCAC ' + p.num_comments + '</span>' : '') +
        '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">View \u2197</a>' +
      '</div>' +
    '</div>';
  }

  function renderXItem(t) {
    const handle = t.handle ? '<span style="color:#667788">' + esc(t.handle) + '</span>' : '';
    let text = esc(t.text || '');
    text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    const link = t.url && /^https?:\/\//.test(t.url)
      ? t.url
      : 'https://x.com/search?q=' + encodeURIComponent(t.text || t.author || '');
    return '<div class="social-post">' +
      '<a href="' + esc(link) + '" target="_blank" rel="noopener" class="social-post-link">' +
        '<div class="social-post-author">' + esc(t.author) + ' ' + handle + '</div>' +
        '<div class="social-post-text">' + text + '</div>' +
      '</a>' +
      '<div class="social-post-meta">' +
        '<span>\u2764 ' + esc(t.likes) + '</span>' +
        '<span>\uD83D\uDD04 ' + esc(t.retweets) + '</span>' +
        '<span>\uD83D\uDCC5 ' + esc(t.date) + '</span>' +
        '<a href="' + esc(link) + '" target="_blank" rel="noopener">View on X \u2197</a>' +
      '</div>' +
    '</div>';
  }

  // ============================================================
  // 6. Refresh all (reset every tab's state)
  // ============================================================
  async function refreshAll() {
    const btn = document.getElementById('social-feed-refresh');
    if (btn) { btn.disabled = true; btn.classList.add('spin'); }
    try {
      ['youtube', 'reddit', 'x'].forEach(p => {
        state[p].items = [];
        state[p].offset = 0;
        state[p].hasMore = true;
        state[p].initialized = false;
        state[p].loading = false;
      });
      // Load current tab with refresh=true
      await loadMore(currentTab, true);
      // Pre-load the other two tabs in background
      for (const p of ['youtube', 'reddit', 'x']) {
        if (p !== currentTab) loadMore(p, true).catch(() => {});
      }
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove('spin'); }
    }
  }

  // ============================================================
  // 7. Toggle panel
  // ============================================================
  function togglePanel() {
    panelVisible = !panelVisible;
    const panel = document.getElementById('social-feed-panel');
    if (!panel) return;
    if (panelVisible) {
      panel.classList.add('visible');
      renderActiveTab();
      const st = state[currentTab];
      if (!st.initialized) loadMore(currentTab);
    } else {
      panel.classList.remove('visible');
    }
  }

  // ============================================================
  // 8. Init
  // ============================================================
  function init() {
    injectStyles();
    createButton();
    createPanel();
    console.log('[Social Feed v2] Three-platform infinite scroll panel ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
