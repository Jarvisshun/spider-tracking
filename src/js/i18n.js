/**
 * Spidey Tracker 中文翻译引擎 v4
 * 利用原站 data-i18n 属性体系，在加载时注入中文翻译
 * 支持动态切换 EN ↔ 中文，地图语言同步切换
 *
 * ★ v4 修复（页面卡死根因）：
 * 1. DEFAULT_LANG = 'zh-CN'
 * 2. app:site-init-ready 监听器在 IIFE 顶层立即注册
 * 3. MutationObserver 防递归：修改 DOM 前断开，修改后重连；只监听 childList 不监听 characterData
 * 4. applyI18nToDOM 加 _applying 防重入标志
 * 5. 精简重试逻辑，避免 setTimeout 堆积
 * 6. 英文模式用 originalSiteInit 作为基础数据
 */
(function () {
  'use strict';

  // ============================================================
  // 0. 配置
  // ============================================================
  var STORAGE_KEY    = 'spidey_tracker_lang';
  var DEFAULT_LANG   = 'zh-CN';
  var currentLang    = DEFAULT_LANG;
  var zhCNData       = null;
  var originalSiteInit = null;
  var _siteInitReady = false;
  var _chineseDataLoaded = false;
  var _applying      = false;    // ★ 防重入标志
  var _mutObs        = null;
  var _retryCount    = 0;
  var MAX_RETRIES    = 3;
  var _debounceTimer = null;

  // ============================================================
  // 1. 工具函数
  // ============================================================

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    var output = deepClone(target);
    for (var key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      var sv = source[key];
      var tv = output[key];
      if (typeof sv === 'object' && sv !== null && !Array.isArray(sv) &&
          typeof tv === 'object' && tv !== null && !Array.isArray(tv)) {
        output[key] = deepMerge(tv, sv);
      } else {
        output[key] = sv;
      }
    }
    return output;
  }

  function getNestedValue(obj, path) {
    if (obj == null || typeof obj !== 'object') return undefined;
    var current = obj;
    for (var i = 0; i < path.length; i++) {
      if (current == null) { current = undefined; break; }
      current = current[path[i]];
    }
    if (current === undefined && obj.general && path[0] !== 'general') {
      current = obj.general;
      for (var j = 0; j < path.length; j++) {
        if (current == null) return undefined;
        current = current[path[j]];
      }
    }
    return current;
  }

  function getCurrentSiteInit() {
    return (window.mainData && window.mainData.init) || window.siteInit || originalSiteInit;
  }

  // ============================================================
  // 2. 加载中文翻译数据
  // ============================================================
  function loadChineseData() {
    return fetch('./siteInit.zh-CN.json')
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function (data) {
        zhCNData = data;
        _chineseDataLoaded = true;
        console.log('[i18n] 中文翻译数据加载成功');
        tryApplyChinese();
      })
      .catch(function (err) {
        console.warn('[i18n] 中文翻译数据加载失败:', err.message);
        _chineseDataLoaded = true;
      });
  }

  // ============================================================
  // 3. 获取翻译后的 siteInit
  // ============================================================
  function getTranslatedSiteInit() {
    var base;
    if (currentLang === 'zh-CN') {
      base = getCurrentSiteInit();
    } else {
      base = originalSiteInit || getCurrentSiteInit();
    }
    if (!base) return null;
    if (currentLang === 'zh-CN' && zhCNData) {
      return deepMerge(base, zhCNData);
    }
    return deepClone(base);
  }

  // ============================================================
  // 4. 更新所有 data-i18n 元素（★ 防重入 + 断开 Observer）
  // ============================================================
  function applyI18nToDOM(translatedInit) {
    if (!translatedInit) return 0;
    if (_applying) return 0;          // ★ 防重入
    _applying = true;

    // ★ 临时断开 MutationObserver，防止 DOM 修改触发回调循环
    if (_mutObs) _mutObs.disconnect();

    var count = 0;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var value = getNestedValue(translatedInit, key.split('.'));
      if (typeof value === 'string') {
        el.textContent = value;
        count++;
      }
    });

    document.querySelectorAll('[data-i18n-content]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-content');
      var value = getNestedValue(translatedInit, key.split('.'));
      if (typeof value === 'string') el.setAttribute('content', value);
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria-label');
      var value = getNestedValue(translatedInit, key.split('.'));
      if (typeof value === 'string') el.setAttribute('aria-label', value);
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var value = getNestedValue(translatedInit, key.split('.'));
      if (typeof value === 'string') el.innerHTML = value;
    });

    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-alt');
      var value = getNestedValue(translatedInit, key.split('.'));
      if (typeof value === 'string') el.setAttribute('alt', value);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var value = getNestedValue(translatedInit, key.split('.'));
      if (typeof value === 'string') el.setAttribute('title', value);
    });

    // ★ 重新连接 MutationObserver（只监听 childList，不监听 characterData）
    if (_mutObs) {
      var menuNav = document.querySelector('.main-menu__nav');
      if (menuNav) {
        _mutObs.observe(menuNav, { childList: true, subtree: false });
      }
    }

    _applying = false;
    return count;
  }

  // ============================================================
  // 5. 更新全局 siteInit
  // ============================================================
  function updateGlobalSiteInit(translatedInit) {
    if (!translatedInit) return;
    window.siteInit = translatedInit;
    if (window.mainData) {
      window.mainData.init = translatedInit;
    }
  }

  // ============================================================
  // 6. 更新地图语言参数
  // ============================================================
  function updateMapLanguage(lang) {
    var mapLang = (lang === 'zh-CN') ? 'zh-CN' : 'en';
    document.dispatchEvent(new CustomEvent('i18n:language-changed', {
      detail: { lang: lang, mapLang: mapLang }
    }));
  }

  // ============================================================
  // 7. 更新文档元数据
  // ============================================================
  function updateDocumentMeta(lang, translatedInit) {
    document.documentElement.setAttribute('lang', lang === 'zh-CN' ? 'zh-CN' : 'en');

    if (translatedInit && translatedInit.general && translatedInit.general.seo) {
      var seo = translatedInit.general.seo;
      var titleEl = document.querySelector('title[data-i18n]');
      if (titleEl && seo.title) titleEl.textContent = seo.title;
      var descEl = document.querySelector('meta[name="description"]');
      if (descEl && seo.description) descEl.setAttribute('content', seo.description);
      var ogDescEl = document.querySelector('meta[property="og:description"]');
      if (ogDescEl && seo.ogDescription) ogDescEl.setAttribute('content', seo.ogDescription);
      var twDescEl = document.querySelector('meta[name="twitter:description"]');
      if (twDescEl && seo.twitterDescription) twDescEl.setAttribute('content', seo.twitterDescription);
      var kwEl = document.querySelector('meta[name="keywords"]');
      if (kwEl && seo.keywords) kwEl.setAttribute('content', seo.keywords);
    }
  }

  // ============================================================
  // 8. 语言切换按钮 UI
  // ============================================================
  function updateToggleUI() {
    var btn = document.getElementById('lang-toggle');
    if (!btn) return;
    if (currentLang === 'zh-CN') {
      btn.textContent = 'EN';
      btn.setAttribute('title', 'Switch to English');
      btn.setAttribute('aria-label', 'Switch to English');
    } else {
      btn.textContent = 'CN';
      btn.setAttribute('title', '切换到中文');
      btn.setAttribute('aria-label', '切换到中文');
    }
  }

  // ============================================================
  // 9. 创建语言切换按钮
  // ============================================================
  function createToggleButton() {
    var btn = document.getElementById('lang-toggle');
    if (!btn) return;

    btn.type = 'button';
    btn.addEventListener('click', function () {
      switchLanguage(currentLang === 'zh-CN' ? 'en' : 'zh-CN');
    });
    updateToggleUI();
  }

  // ============================================================
  // 10. 注入语言切换按钮样式
  // ============================================================
  function injectStyles() {
    if (document.getElementById('lang-toggle-styles')) return;
    var style = document.createElement('style');
    style.id = 'lang-toggle-styles';
    style.textContent = [
      '.map-filter-btn--lang[data-astro-cid-ioqvmts2] {',
      '  font-family: "PF Videotext Pro", "Bitcount Prop Single", monospace, sans-serif;',
      '  font-size: 16px;',
      '  font-weight: 700;',
      '  line-height: 41px;',
      '  text-align: center;',
      '  color: #fff;',
      '  text-shadow: 1px 1px 0 rgba(0,0,0,0.7);',
      '  text-transform: uppercase;',
      '  user-select: none;',
      '}',
      '@media (max-width: 1024px) {',
      '  .map-filter-btn--lang[data-astro-cid-ioqvmts2] {',
      '    font-size: 14px;',
      '    line-height: 37px;',
      '  }',
      '}',
      '@media (max-width: 640px) {',
      '  .map-filter-btn--lang[data-astro-cid-ioqvmts2] {',
      '    font-size: 11px;',
      '    line-height: 30px;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ============================================================
  // 11. 核心：条件满足后应用中文翻译（★ 精简重试）
  // ============================================================
  function tryApplyChinese() {
    if (!_siteInitReady || !_chineseDataLoaded) return;
    if (currentLang !== 'zh-CN' || !zhCNData) return;

    if (!originalSiteInit) {
      var base = getCurrentSiteInit();
      if (base) {
        originalSiteInit = deepClone(base);
        console.log('[i18n] 已保存原始 siteInit');
      }
    }

    var translatedInit = getTranslatedSiteInit();
    if (!translatedInit) return;

    var count = applyI18nToDOM(translatedInit);
    updateGlobalSiteInit(translatedInit);
    updateDocumentMeta('zh-CN', translatedInit);
    updateMapLanguage('zh-CN');
    updateToggleUI();

    console.log('[i18n] 已应用中文翻译，更新了 ' + count + ' 个元素');

    // ★ 精简重试：只检查一次，300ms 后重试，最多 3 次
    var menuLinks = document.querySelectorAll('.main-menu__link');
    if (menuLinks.length > 0 && _retryCount < MAX_RETRIES) {
      var firstMenuText = menuLinks[0].textContent.trim();
      if (firstMenuText === 'ACTIVITY LOG') {
        _retryCount++;
        console.log('[i18n] 菜单仍为英文，300ms 后重试 (' + _retryCount + '/' + MAX_RETRIES + ')');
        setTimeout(function () { tryApplyChinese(); }, 300);
      } else {
        console.log('[i18n] ✓ 菜单翻译成功: ' + firstMenuText);
        _retryCount = 0;
      }
    }
  }

  // ============================================================
  // 12. MutationObserver — 防递归版（★ 核心修复）
  // 只监听 childList（子元素增删），不监听 characterData
  // 加防抖，避免快速连续触发
  // ============================================================
  function setupMutationObserver() {
    if (_mutObs || !window.MutationObserver) return;

    var menuNav = document.querySelector('.main-menu__nav');
    if (!menuNav) {
      setTimeout(setupMutationObserver, 500);
      return;
    }

    _mutObs = new MutationObserver(function () {
      if (_applying) return;             // ★ 防重入
      if (currentLang !== 'zh-CN' || !zhCNData) return;

      // ★ 防抖：500ms 后执行，避免快速连续触发
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(function () {
        if (currentLang !== 'zh-CN' || !zhCNData || _applying) return;
        var translatedInit = getTranslatedSiteInit();
        if (translatedInit) {
          applyI18nToDOM(translatedInit);
          console.log('[i18n] MutationObserver 回调已重新应用中文');
        }
      }, 500);
    });

    // ★ 只监听 childList，不监听 characterData — 这样 textContent 修改不会触发回调
    _mutObs.observe(menuNav, { childList: true, subtree: false });
    console.log('[i18n] MutationObserver 已安装（防递归版）');
  }

  // ============================================================
  // 13. 切换语言主函数
  // ============================================================
  function switchLanguage(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}

    var translatedInit = getTranslatedSiteInit();
    applyI18nToDOM(translatedInit);
    updateGlobalSiteInit(translatedInit);
    updateDocumentMeta(lang, translatedInit);
    updateMapLanguage(lang);
    updateToggleUI();

    console.log('[i18n] 语言已切换至: ' + lang);
  }

  // ============================================================
  // 14. 标记 siteInit 就绪
  // ============================================================
  function markSiteInitReady() {
    if (_siteInitReady) return;
    _siteInitReady = true;

    var base = getCurrentSiteInit();
    if (base && !originalSiteInit) {
      originalSiteInit = deepClone(base);
      console.log('[i18n] 已保存原始 siteInit');
    }

    tryApplyChinese();

    // ★ 单次延迟兜底（1 秒），不再堆叠多个定时器
    setTimeout(function () {
      if (currentLang === 'zh-CN' && zhCNData) {
        var translatedInit = getTranslatedSiteInit();
        if (translatedInit) {
          applyI18nToDOM(translatedInit);
          updateGlobalSiteInit(translatedInit);
          console.log('[i18n] 1 秒兜底重试完成');
        }
      }
    }, 1000);
  }

  // ============================================================
  // ★★★ 关键修复：事件监听器在 IIFE 顶层立即注册 ★★★
  // 不依赖 DOMContentLoaded / requestAnimationFrame
  // 确保 SiteFadeIn 派发的 app:site-init-ready 事件一定能收到
  // ============================================================
  document.addEventListener('app:site-init-ready', function () {
    console.log('[i18n] ✓ 收到 app:site-init-ready');
    markSiteInitReady();
  });

  // ============================================================
  // 15. 初始化
  // ============================================================
  function init() {
    console.log('[i18n] 初始化开始...');

    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) currentLang = saved;
      console.log('[i18n] 用户语言偏好: ' + currentLang);
    } catch (e) {}

    injectStyles();
    createToggleButton();
    loadChineseData();

    // ★ 兜底 A: siteInit 已存在
    if (!_siteInitReady && getCurrentSiteInit()) {
      console.log('[i18n] siteInit 已存在，直接捕获');
      markSiteInitReady();
    }

    // ★ 兜底 B: MutationObserver（延迟安装，避免阻塞渲染）
    setTimeout(setupMutationObserver, 500);

    // ★ 兜底 C: 2 秒定时器 fallback
    setTimeout(function () {
      if (!_siteInitReady) {
        console.log('[i18n] Fallback 定时器触发');
        markSiteInitReady();
      }
    }, 2000);

    // 暴露 API
    window.SpideyI18n = {
      switchLanguage: switchLanguage,
      getCurrentLanguage: function () { return currentLang; },
      applyCurrentLanguage: function () {
        var translatedInit = getTranslatedSiteInit();
        applyI18nToDOM(translatedInit);
        updateGlobalSiteInit(translatedInit);
      },
      _onSiteInitReady: markSiteInitReady
    };

    console.log('[i18n] 初始化完成');
  }

  // ---- 启动 ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      requestAnimationFrame(init);
    });
  } else {
    requestAnimationFrame(init);
  }
})();
