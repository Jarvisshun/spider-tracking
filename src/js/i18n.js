/**
 * Spidey Tracker 中文翻译引擎
 * 利用原站 data-i18n 属性体系，在加载时注入中文翻译
 * 支持动态切换 EN ↔ 中文，地图语言同步切换
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'spidey_tracker_lang';
  var DEFAULT_LANG = 'en';
  var currentLang = DEFAULT_LANG;
  var zhCNData = null;
  var originalSiteInit = null;

  // ============================================================
  // 1. 工具函数
  // ============================================================

  /** 深拷贝 JSON 可序列化对象 */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /** 深度合并：source 中的值覆盖 target，递归处理嵌套对象 */
  function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    var output = deepClone(target);
    for (var key in source) {
      if (!source.hasOwnProperty(key)) continue;
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

  /** 按 dot-path 获取嵌套值，如 getNested(obj, ['general','seo','title']) */
  function getNestedValue(obj, path) {
    var current = obj;
    for (var i = 0; i < path.length; i++) {
      if (current == null) return undefined;
      current = current[path[i]];
    }
    return current;
  }

  /** 按 dot-path 设置嵌套值 */
  function setNestedValue(obj, path, value) {
    var current = obj;
    for (var i = 0; i < path.length - 1; i++) {
      if (current[path[i]] == null) current[path[i]] = {};
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
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
        console.log('[i18n] 中文翻译数据加载成功');
      })
      .catch(function (err) {
        console.warn('[i18n] 中文翻译数据加载失败:', err.message);
      });
  }

  // ============================================================
  // 3. 获取翻译后的 siteInit
  // ============================================================
  function getTranslatedSiteInit() {
    var base = originalSiteInit || (window.mainData && window.mainData.init) || window.siteInit;
    if (!base) return null;
    if (currentLang === 'zh-CN' && zhCNData) {
      return deepMerge(base, zhCNData);
    }
    return deepClone(base);
  }

  // ============================================================
  // 4. 更新所有 data-i18n 元素
  // ============================================================
  function applyI18nToDOM(translatedInit) {
    if (!translatedInit) return;

    // 4a. data-i18n — 替换元素文本内容
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var value = getNestedValue(translatedInit, key.split('.'));
      if (typeof value === 'string') {
        el.textContent = value;
      }
    });

    // 4b. data-i18n-content — 替换元素 content 属性 (meta 标签)
    document.querySelectorAll('[data-i18n-content]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-content');
      var value = getNestedValue(translatedInit, key.split('.'));
      if (typeof value === 'string') {
        el.setAttribute('content', value);
      }
    });

    // 4c. data-i18n-aria-label — 替换 aria-label 属性
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria-label');
      var value = getNestedValue(translatedInit, key.split('.'));
      if (typeof value === 'string') {
        el.setAttribute('aria-label', value);
      }
    });
  }

  // ============================================================
  // 5. 更新全局 siteInit（供原站 JS 组件读取翻译后的文本）
  // ============================================================
  function updateGlobalSiteInit(translatedInit) {
    if (!translatedInit) return;
    window.siteInit = translatedInit;
    if (window.mainData) {
      window.mainData.init = translatedInit;
    }
  }

  // ============================================================
  // 6. 更新 Google Maps API 语言参数
  // ============================================================
  function updateMapLanguage(lang) {
    var mapLang = (lang === 'zh-CN') ? 'zh-CN' : 'en';

    // 找到 Maps JS API script 标签并替换 language 参数
    var scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    scripts.forEach(function (script) {
      var src = script.getAttribute('src') || '';
      var newSrc;
      if (src.indexOf('language=') !== -1) {
        newSrc = src.replace(/language=[^&]*/, 'language=' + mapLang);
      } else {
        newSrc = src + '&language=' + mapLang;
      }
      if (newSrc !== src) {
        // 移除旧 script，创建新 script 重新加载地图
        var newScript = document.createElement('script');
        newScript.type = 'text/javascript';
        // 保留回调名
        newScript.src = newSrc;
        newScript.async = true;
        script.parentNode.replaceChild(newScript, script);
      }
    });

    // 派发自定义事件，通知地图组件重新渲染
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
      var titleEl = document.querySelector('title[data-i18n]');
      if (titleEl) {
        titleEl.textContent = translatedInit.general.seo.title;
      }
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
      btn.textContent = '中文';
      btn.setAttribute('title', '切换到中文');
      btn.setAttribute('aria-label', '切换到中文');
    }
  }

  // ============================================================
  // 9. 创建语言切换按钮
  // ============================================================
  function createToggleButton() {
    if (document.getElementById('lang-toggle')) return;

    var btn = document.createElement('button');
    btn.id = 'lang-toggle';
    btn.className = 'lang-toggle-btn';
    btn.type = 'button';
    btn.addEventListener('click', function () {
      switchLanguage(currentLang === 'zh-CN' ? 'en' : 'zh-CN');
    });

    // 尝试插入到 header 区域
    var header = document.querySelector('.top-header') ||
                 document.querySelector('.site-header') ||
                 document.querySelector('header');
    if (header) {
      header.appendChild(btn);
    } else {
      // 降级：插入到 body 顶部，fixed 定位
      document.body.insertBefore(btn, document.body.firstChild);
    }

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
      '.lang-toggle-btn {',
      '  position: fixed;',
      '  top: 12px;',
      '  right: 12px;',
      '  z-index: 99999;',
      '  background: rgba(0, 0, 0, 0.75);',
      '  color: #fff;',
      '  border: 2px solid rgba(255, 255, 255, 0.6);',
      '  border-radius: 6px;',
      '  padding: 6px 14px;',
      '  font-family: monospace, sans-serif;',
      '  font-size: 13px;',
      '  font-weight: 700;',
      '  letter-spacing: 1px;',
      '  cursor: pointer;',
      '  transition: all 0.2s ease;',
      '  text-transform: uppercase;',
      '  backdrop-filter: blur(4px);',
      '  -webkit-backdrop-filter: blur(4px);',
      '}',
      '.lang-toggle-btn:hover {',
      '  background: rgba(220, 20, 20, 0.85);',
      '  border-color: #fff;',
      '  transform: scale(1.05);',
      '}',
      '.lang-toggle-btn:active {',
      '  transform: scale(0.95);',
      '}',
      '@media (max-width: 640px) {',
      '  .lang-toggle-btn {',
      '    top: 8px;',
      '    right: 8px;',
      '    font-size: 11px;',
      '    padding: 4px 10px;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ============================================================
  // 11. 切换语言主函数
  // ============================================================
  function switchLanguage(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // localStorage 不可用时静默降级
    }

    var translatedInit = getTranslatedSiteInit();
    applyI18nToDOM(translatedInit);
    updateGlobalSiteInit(translatedInit);
    updateDocumentMeta(lang, translatedInit);
    updateMapLanguage(lang);
    updateToggleUI();

    console.log('[i18n] 语言已切换至: ' + lang);
  }

  // ============================================================
  // 12. 初始化
  // ============================================================
  function init() {
    // 读取用户偏好
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) currentLang = saved;
    } catch (e) {}

    // 保存原始 siteInit 引用（在中文覆盖之前）
    if (window.siteInit && !originalSiteInit) {
      originalSiteInit = deepClone(window.siteInit);
    }

    // 注入样式和按钮
    injectStyles();
    createToggleButton();

    // 加载中文数据，如果用户偏好中文则立即应用
    loadChineseData().then(function () {
      if (currentLang === 'zh-CN' && zhCNData) {
        var translatedInit = getTranslatedSiteInit();
        applyI18nToDOM(translatedInit);
        updateGlobalSiteInit(translatedInit);
        updateDocumentMeta('zh-CN', translatedInit);
        updateMapLanguage('zh-CN');
        updateToggleUI();
        console.log('[i18n] 已应用中文翻译');
      }
    });

    // 暴露 API 供外部调用
    window.SpideyI18n = {
      switchLanguage: switchLanguage,
      getCurrentLanguage: function () { return currentLang; },
      applyCurrentLanguage: function () {
        var translatedInit = getTranslatedSiteInit();
        applyI18nToDOM(translatedInit);
        updateGlobalSiteInit(translatedInit);
      }
    };
  }

  // 在 DOM 就绪后初始化（延迟到 siteInit 已设置之后）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // 再等一帧确保 siteInit 脚本已执行
      requestAnimationFrame(init);
    });
  } else {
    requestAnimationFrame(init);
  }
})();
