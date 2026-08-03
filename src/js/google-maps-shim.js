/**
 * Google Maps → Leaflet + OpenStreetMap 兼容层
 * 替代 Google Maps JavaScript API，使用 Leaflet 渲染暗色瓦片地图
 * 提供与原站 Map2D.js / Radar.js / flyToLocation.js 兼容的 API
 *
 * 限制：
 * - 3D Photorealistic Tiles 不可用（Google 独占，数据中 0 个 3D 模型）
 * - Google 街景 iframe 嵌入仍可工作（不依赖 JS API Key）
 */
(function () {
  'use strict';

  // 防止重复加载
  if (window.google && window.google.maps && window.google.maps.Map) return;

  // 等待 Leaflet 加载
  if (typeof L === 'undefined') {
    console.error('[Shim] Leaflet (L) not loaded — map will not work');
    return;
  }

  // 注入暗色主题样式
  var style = document.createElement('style');
  style.textContent =
    '.leaflet-container{background:#0f1727!important;outline:none!important}' +
    '.spidey-marker-icon{background:transparent!important;border:none!important}' +
    '.leaflet-control-attribution{font-size:9px!important;opacity:.5!important;background:transparent!important;color:#5a7a9a!important}' +
    '.leaflet-control-attribution a{color:#5a7a9a!important}';
  document.head.appendChild(style);

  // ============================================================
  // 工具：坐标转换
  // ============================================================
  function toLatLng(pos) {
    if (!pos) return null;
    if (typeof pos.lat === 'function' && typeof pos.lng === 'function')
      return { lat: pos.lat(), lng: pos.lng() };
    if (typeof pos.lat === 'number' && typeof pos.lng === 'number')
      return { lat: pos.lat, lng: pos.lng };
    return null;
  }

  // ============================================================
  // google.maps.LatLng
  // ============================================================
  function GmLatLng(lat, lng) {
    this._lat = Number(lat);
    this._lng = Number(lng);
  }
  GmLatLng.prototype.lat = function () { return this._lat; };
  GmLatLng.prototype.lng = function () { return this._lng; };
  GmLatLng.prototype.toJSON = function () { return { lat: this._lat, lng: this._lng }; };
  GmLatLng.prototype.toString = function () { return '(' + this._lat + ', ' + this._lng + ')'; };

  // ============================================================
  // google.maps.LatLngBounds
  // ============================================================
  function GmLatLngBounds(sw, ne) {
    var s = toLatLng(sw), n = toLatLng(ne);
    if (s && n) {
      this._south = Math.min(s.lat, n.lat);
      this._north = Math.max(s.lat, n.lat);
      this._west = Math.min(s.lng, n.lng);
      this._east = Math.max(s.lng, n.lng);
    } else {
      this._south = -90; this._north = 90; this._west = -180; this._east = 180;
    }
  }
  GmLatLngBounds.prototype.getNorthEast = function () { return new GmLatLng(this._north, this._east); };
  GmLatLngBounds.prototype.getSouthWest = function () { return new GmLatLng(this._south, this._west); };
  GmLatLngBounds.prototype.contains = function (ll) {
    var p = toLatLng(ll);
    return !!p && p.lat >= this._south && p.lat <= this._north && p.lng >= this._west && p.lng <= this._east;
  };

  // ============================================================
  // 事件系统
  // ============================================================
  var _idCounter = 0;
  var _registry = new WeakMap();

  function getListeners(obj) {
    if (!_registry.has(obj)) _registry.set(obj, {});
    return _registry.get(obj);
  }

  function GmEventEntry(obj, name, handler, once) {
    this.id = ++_idCounter;
    this.obj = obj;
    this.name = name;
    this.handler = handler;
    this.once = once;
    this._cleanup = null;
  }

  var gmapsEvent = {
    addListener: function (obj, eventName, handler) {
      var entry = new GmEventEntry(obj, eventName, handler, false);
      var list = getListeners(obj);
      if (!list[eventName]) list[eventName] = [];
      list[eventName].push(entry);
      _bridge(obj, eventName, entry);
      return entry;
    },

    addListenerOnce: function (obj, eventName, handler) {
      // 如果 idle 已触发，立即执行
      if (eventName === 'idle' && obj._idle) {
        try { handler(); } catch (e) { console.error(e); }
        return { id: ++_idCounter, _cleanup: null };
      }
      var entry = new GmEventEntry(obj, eventName, handler, true);
      var list = getListeners(obj);
      if (!list[eventName]) list[eventName] = [];
      list[eventName].push(entry);
      _bridge(obj, eventName, entry);
      return entry;
    },

    removeListener: function (entry) {
      if (!entry) return;
      if (entry._cleanup) entry._cleanup();
      var list = getListeners(entry.obj);
      var arr = list[entry.name];
      if (arr) {
        var i = arr.indexOf(entry);
        if (i >= 0) arr.splice(i, 1);
      }
    },

    trigger: function (obj, eventName) {
      var list = getListeners(obj);
      var arr = list[eventName];
      if (!arr || !arr.length) return;
      var args = Array.prototype.slice.call(arguments, 2);
      var keep = [];
      for (var i = 0; i < arr.length; i++) {
        try { arr[i].handler.apply(null, args); } catch (e) { console.error('[Shim] Event handler error:', e); }
        if (!arr[i].once) keep.push(arr[i]);
        else if (arr[i]._cleanup) arr[i]._cleanup();
      }
      list[eventName] = keep;
    },

    clearInstanceListeners: function (obj) {
      var list = getListeners(obj);
      for (var name in list) {
        var arr = list[name];
        for (var i = 0; i < arr.length; i++) {
          if (arr[i]._cleanup) arr[i]._cleanup();
        }
      }
      _registry.delete(obj);
    }
  };

  // 将 Google Maps 事件桥接到 Leaflet 事件
  function _bridge(obj, eventName, entry) {
    var lm = obj._leafletMap;
    var lmarker = obj._leafletMarker;

    if (lm) {
      // 地图级事件
      if (eventName === 'idle') return; // idle 由手动触发

      if (eventName === 'click') {
        var clickWrap = function (e) {
          entry.handler({
            latLng: new GmLatLng(e.latlng.lat, e.latlng.lng),
            placeId: null,
            stop: function () {}
          });
        };
        lm.on('click', clickWrap);
        entry._cleanup = function () { lm.off('click', clickWrap); };

      } else if (eventName === 'mousedown') {
        var el = obj._element;
        var mdWrap = function () { entry.handler(); };
        el.addEventListener('mousedown', mdWrap);
        entry._cleanup = function () { el.removeEventListener('mousedown', mdWrap); };

      } else if (eventName === 'zoom_changed' || eventName === 'center_changed') {
        // moveend 同时触发这两个事件
        var moveWrap = function () { entry.handler(); };
        lm.on('moveend', moveWrap);
        entry._cleanup = function () { lm.off('moveend', moveWrap); };
      }
    } else if (lmarker) {
      // 标记级事件
      if (eventName === 'gmp-click') {
        var clickWrap2 = function (e) {
          if (e.originalEvent) e.originalEvent.stopPropagation();
          entry.handler();
        };
        lmarker.on('click', clickWrap2);
        entry._cleanup = function () { lmarker.off('click', clickWrap2); };
      }
    }
  }

  // ============================================================
  // AdvancedMarkerElement（Leaflet Marker 封装）
  // ============================================================
  function AdvancedMarkerElement(opts) {
    opts = opts || {};
    this._position = opts.position || null;
    this._content = opts.content || null;
    this._zIndex = opts.zIndex || 0;
    this._title = opts.title || '';
    this._map = null;
    this._leafletMarker = null;
    if (opts.map) this.setMap(opts.map);
  }

  AdvancedMarkerElement.prototype.setMap = function (map) {
    // 从旧地图移除
    if (this._leafletMarker && this._map && this._map._leafletMap) {
      this._map._leafletMap.removeLayer(this._leafletMarker);
    }
    this._map = map;
    if (!map) return;

    var pos = toLatLng(this._position);
    if (!pos) return;

    if (!this._leafletMarker) {
      // 首次创建标记
      var self = this;
      var icon = L.divIcon({
        html: '',
        className: 'spidey-marker-icon',
        iconSize: [32, 40],
        iconAnchor: [16, 40]
      });

      this._leafletMarker = L.marker([pos.lat, pos.lng], {
        icon: icon,
        zIndexOffset: this._zIndex,
        interactive: true,
        bubblingMouseEvents: false,
        keyboard: false
      });

      // 将 content 元素插入 Leaflet 图标 DOM（保留事件监听器）
      this._leafletMarker.on('add', function () {
        var el = self._leafletMarker.getElement();
        if (el && self._content) {
          el.appendChild(self._content);
        }
      });

      // 点击 → gmp-click
      this._leafletMarker.on('click', function (e) {
        if (e.originalEvent) {
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
        }
        gmapsEvent.trigger(self, 'gmp-click');
      });
    } else {
      // 更新位置
      this._leafletMarker.setLatLng([pos.lat, pos.lng]);
    }

    this._leafletMarker.addTo(map._leafletMap);
  };

  AdvancedMarkerElement.prototype.addEventListener = function (type, handler) {
    gmapsEvent.addListener(this, type, handler);
  };
  AdvancedMarkerElement.prototype.removeEventListener = function () {};

  // 属性访问器（Map2D.js 直接读写 .map .content .position .zIndex）
  Object.defineProperty(AdvancedMarkerElement.prototype, 'map', {
    get: function () { return this._map; },
    set: function (m) { this.setMap(m); }
  });
  Object.defineProperty(AdvancedMarkerElement.prototype, 'content', {
    get: function () { return this._content; },
    set: function (c) { this._content = c; }
  });
  Object.defineProperty(AdvancedMarkerElement.prototype, 'position', {
    get: function () { return this._position; },
    set: function (p) { this._position = p; }
  });
  Object.defineProperty(AdvancedMarkerElement.prototype, 'zIndex', {
    get: function () { return this._zIndex; },
    set: function (z) { this._zIndex = z; }
  });

  // ============================================================
  // google.maps.Map（Leaflet Map 封装）
  // ============================================================
  function GmMap(element, opts) {
    opts = opts || {};
    this._element = element;
    this._opts = opts;
    this._idle = false;

    var center = toLatLng(opts.center) || { lat: 0, lng: 0 };
    var zoom = opts.zoom != null ? opts.zoom : 2;

    var leafletOpts = {
      center: [center.lat, center.lng],
      zoom: zoom,
      minZoom: opts.minZoom || 1,
      maxZoom: 20,
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0,          // 支持小数缩放（Google Maps 风格）
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
      worldCopyJump: true,
      maxBoundsViscosity: 1.0
    };

    // restriction → maxBounds
    if (opts.restriction && opts.restriction.latLngBounds) {
      var r = opts.restriction.latLngBounds;
      leafletOpts.maxBounds = L.latLngBounds([r.south, r.west], [r.north, r.east]);
    }

    if (opts.backgroundColor) {
      element.style.backgroundColor = opts.backgroundColor;
    }

    this._leafletMap = L.map(element, leafletOpts);
    this._leafletMap._gmMap = this;

    // CartoDB Dark Matter 暗色瓦片（免费、无需 Key）
    this._tileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }
    ).addTo(this._leafletMap);

    var self = this;

    // 首次瓦片加载 → idle
    this._tileLayer.once('load', function () {
      if (!self._idle) {
        self._idle = true;
        gmapsEvent.trigger(self, 'idle');
      }
    });

    // 移动/缩放结束 → center_changed + zoom_changed
    this._leafletMap.on('moveend', function () {
      gmapsEvent.trigger(self, 'center_changed');
      gmapsEvent.trigger(self, 'zoom_changed');
      if (!self._idle) {
        self._idle = true;
        gmapsEvent.trigger(self, 'idle');
      }
    });

    // 地图点击
    this._leafletMap.on('click', function (e) {
      gmapsEvent.trigger(self, 'click', {
        latLng: new GmLatLng(e.latlng.lat, e.latlng.lng),
        placeId: null,
        stop: function () {}
      });
    });

    // 3 秒保底 idle（防止瓦片加载慢导致卡死）
    setTimeout(function () {
      if (!self._idle) {
        self._idle = true;
        gmapsEvent.trigger(self, 'idle');
      }
    }, 3000);

    // 1 秒后刷新尺寸（确保容器已展开）
    setTimeout(function () {
      if (self._leafletMap) self._leafletMap.invalidateSize();
    }, 1000);
  }

  // ============================================================
  // Map 方法
  // ============================================================
  GmMap.prototype.getCenter = function () {
    var c = this._leafletMap.getCenter();
    return new GmLatLng(c.lat, c.lng);
  };

  GmMap.prototype.getZoom = function () {
    return this._leafletMap.getZoom();
  };

  GmMap.prototype.setZoom = function (zoom) {
    this._leafletMap.setZoom(zoom, { animate: false });
  };

  GmMap.prototype.setCenter = function (latLng) {
    var ll = toLatLng(latLng);
    if (ll) this._leafletMap.panTo([ll.lat, ll.lng], { animate: false });
  };

  GmMap.prototype.panTo = function (latLng) {
    var ll = toLatLng(latLng);
    if (ll) this._leafletMap.panTo([ll.lat, ll.lng]);
  };

  GmMap.prototype.addListener = function (eventName, handler) {
    return gmapsEvent.addListener(this, eventName, handler);
  };

  GmMap.prototype.addListenerOnce = function (eventName, handler) {
    return gmapsEvent.addListenerOnce(this, eventName, handler);
  };

  GmMap.prototype.get = function (key) {
    if (key === 'minZoom') return this._opts.minZoom;
    return undefined;
  };

  GmMap.prototype.set = function (key, value) {
    if (!this._custom) this._custom = {};
    this._custom[key] = value;
  };

  GmMap.prototype.getBounds = function () {
    var b = this._leafletMap.getBounds();
    return new GmLatLngBounds(
      { lat: b.getSouth(), lng: b.getWest() },
      { lat: b.getNorth(), lng: b.getEast() }
    );
  };

  GmMap.prototype.fitBounds = function (bounds) {
    if (bounds instanceof GmLatLngBounds) {
      this._leafletMap.fitBounds([[bounds._south, bounds._west], [bounds._north, bounds._east]]);
    }
  };

  // ============================================================
  // gmp-map-3d 自定义元素桩（防止控制台报错）
  // ============================================================
  if (!customElements.get('gmp-map-3d')) {
    customElements.define('gmp-map-3d', class extends HTMLElement {
      connectedCallback() {
        this.style.display = 'block';
        this.style.width = '100%';
        this.style.height = '100%';
      }
    });
  }

  // ============================================================
  // 构建 window.google 命名空间
  // ============================================================
  window.google = window.google || {};
  window.google.maps = window.google.maps || {};
  window.google.maps.Map = GmMap;
  window.google.maps.LatLng = GmLatLng;
  window.google.maps.LatLngBounds = GmLatLngBounds;
  window.google.maps.event = gmapsEvent;

  window.google.maps.importLibrary = function (libName) {
    if (libName === 'marker') {
      return Promise.resolve({ AdvancedMarkerElement: AdvancedMarkerElement });
    }
    if (libName === 'maps3d') {
      // 3D 不可用 — 返回空桩防止报错（数据中 0 个 3D 模型，不会实际使用）
      return Promise.resolve({
        Marker3DInteractiveElement: class { constructor() {} },
        Model3DInteractiveElement: class { constructor() {} }
      });
    }
    return Promise.resolve({});
  };

  console.log('[Shim] Google Maps → Leaflet + OpenStreetMap 兼容层已加载');

  // ============================================================
  // 触发 initMaps 回调
  // ============================================================
  function _callInitMaps() {
    if (typeof window.initMaps === 'function') {
      window.initMaps();
    } else {
      // initMaps 桩尚未定义，稍后重试
      setTimeout(_callInitMaps, 50);
    }
  }
  _callInitMaps();

})();
