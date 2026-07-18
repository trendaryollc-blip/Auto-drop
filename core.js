// ============================================================================
// HUNTDROP CORE v2.1 — Immovable Foundation
// ============================================================================
// RULE: This file is NEVER modified. Features are added via plugins.
// To add a feature: create a plugin file in /plugins/, register it. Done.
// ============================================================================
(function () {
  'use strict';

  // ===== 0. LOGGER =====
  /**
   * @typedef {'debug'|'info'|'warn'|'error'} LogLevel
   * @typedef {Object} LogEntry
   * @property {LogLevel} level
   * @property {string} message
   * @property {number} timestamp
   * @property {string} [context]
   * @property {*} [data]
   */
  const Logger = (() => {
    /** @type {LogLevel[]} */
    const LEVELS = ['debug', 'info', 'warn', 'error'];
    /** @type {Set<string>} */
    const _enabledContexts = new Set(['*']);
    /** @type {LogEntry[]} */
    const _buffer = [];
    const MAX_BUFFER = 500;
    let _minLevel = 'debug';

    /**
     * @param {LogLevel} level
     * @returns {number}
     */
    const levelIndex = (level) => LEVELS.indexOf(level);

    /**
     * @param {LogLevel} level
     * @param {string} message
     * @param {string} [context]
     * @param {*} [data]
     */
    const log = (level, message, context, data) => {
      if (levelIndex(level) < levelIndex(_minLevel)) return;
      if (!_enabledContexts.has('*') && context && !_enabledContexts.has(context)) return;
      /** @type {LogEntry} */
      const entry = { level, message, timestamp: Date.now(), context: context || 'app', data };
      _buffer.push(entry);
      if (_buffer.length > MAX_BUFFER) _buffer.shift();
      const prefix = context ? `[${context}]` : '[HuntDrop]';
      const logFn =
        level === 'debug'
          ? console.log
          : level === 'info'
            ? console.info
            : level === 'warn'
              ? console.warn
              : console.error;
      if (data !== undefined) {
        logFn(`${prefix} ${message}`, data);
      } else {
        logFn(`${prefix} ${message}`);
      }
    };

    return {
      /** @param {LogLevel} level */
      setLevel(level) {
        _minLevel = level;
      },
      /** @param {string} context */
      enableContext(context) {
        _enabledContexts.add(context);
      },
      /** @param {string} context */
      disableContext(context) {
        _enabledContexts.delete(context);
      },
      /** @returns {LogEntry[]} */
      getBuffer() {
        return [..._buffer];
      },
      clearBuffer() {
        _buffer.length = 0;
      },
      /** @param {string} message @param {*} [data] */
      debug(message, data, context) {
        log('debug', message, context, data);
      },
      /** @param {string} message @param {*} [data] */
      info(message, data, context) {
        log('info', message, context, data);
      },
      /** @param {string} message @param {*} [data] */
      warn(message, data, context) {
        log('warn', message, context, data);
      },
      /** @param {string} message @param {*} [data] */
      error(message, data, context) {
        log('error', message, context, data);
      },
    };
  })();

  // ===== 1. EVENT BUS =====
  /**
   * @typedef {Object} ListenerEntry
   * @property {Function} cb
   * @property {number} priority
   * @property {*} ctx
   * @property {boolean} [parallel]
   */
  const EventBus = (() => {
    /** @type {Map<string, ListenerEntry[]>} */
    const _l = new Map();
    /**
     * @param {string} eventName
     * @param {string} pattern
     * @returns {boolean}
     */
    const matchesEventPattern = (eventName, pattern) => {
      if (!pattern || pattern === '*' || pattern === eventName) return true;
      const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
      return regex.test(eventName);
    };
    return {
      /**
       * @param {string} e
       * @param {Function} cb
       * @param {{priority?: number, context?: *, parallel?: boolean}} [opts]
       * @returns {Function} unsubscribe function
       */
      on(e, cb, opts = {}) {
        if (!_l.has(e)) _l.set(e, []);
        const entry = { cb, priority: opts.priority || 0, ctx: opts.context || null, parallel: opts.parallel || false };
        _l.get(e).push(entry);
        _l.get(e).sort((a, b) => b.priority - a.priority);
        return () => {
          const a = _l.get(e);
          if (a) {
            const i = a.indexOf(entry);
            if (i > -1) a.splice(i, 1);
          }
        };
      },
      /**
       * @param {string} e
       * @param {Function} cb
       * @param {{priority?: number, context?: *}} [opts]
       * @returns {Function} unsubscribe function
       */
      once(e, cb, opts = {}) {
        const self = this;
        const w = (...args) => {
          self.off(e, w);
          cb.apply(opts.context || null, args);
        };
        return self.on(e, w, opts);
      },
      /**
       * @param {string} e
       * @param {Function} [cb]
       */
      off(e, cb) {
        const a = _l.get(e);
        if (a) {
          if (cb) {
            const i = a.findIndex((x) => x.cb === cb);
            if (i > -1) a.splice(i, 1);
          } else {
            _l.delete(e);
          }
        }
      },
      /**
       * Emit event. Listeners marked with {parallel: true} run in parallel via Promise.all.
       * Sequential listeners (default) run in priority order, awaiting each before the next.
       * @param {string} e
       * @param {*} [data]
       */
      async emit(e, data) {
        const matches = [];
        for (const [eventName, listeners] of _l.entries()) {
          if (matchesEventPattern(e, eventName)) {
            matches.push(...listeners.map((entry) => ({ eventName, entry })));
          }
        }
        // Separate parallel and sequential listeners
        const parallelListeners = matches.filter((m) => m.entry.parallel);
        const sequentialListeners = matches.filter((m) => !m.entry.parallel);
        // Run parallel listeners concurrently
        if (parallelListeners.length > 0) {
          await Promise.allSettled(
            parallelListeners.map(async ({ eventName, entry }) => {
              try {
                await entry.cb.call(entry.ctx, data);
              } catch (err) {
                Logger.error(`Error in parallel listener "${eventName}"`, err, 'EventBus');
              }
            })
          );
        }
        // Run sequential listeners in priority order
        for (const { eventName, entry } of sequentialListeners) {
          try {
            await entry.cb.call(entry.ctx, data);
          } catch (err) {
            Logger.error(`Error in "${eventName}"`, err, 'EventBus');
          }
        }
      },
      /** @param {string} e @returns {boolean} */
      has(e) {
        for (const [eventName, listeners] of _l.entries()) {
          if (matchesEventPattern(e, eventName) && listeners.length > 0) return true;
        }
        return false;
      },
      /** @returns {string[]} */
      events() {
        return [..._l.keys()];
      },
      clear() {
        _l.clear();
      },
    };
  })();

  // ===== 2. PLUGIN REGISTRY =====
  function rollbackDomChanges(addedNodes, removedNodes) {
    if (!document.body) return;
    addedNodes.forEach((node) => {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    removedNodes.forEach((entry) => {
      if (!entry || !entry.parent || !entry.node) return;
      if (entry.parent.contains(entry.node)) return;
      if (entry.index != null && entry.index >= 0) {
        const ref = entry.parent.childNodes[entry.index] || null;
        entry.parent.insertBefore(entry.node, ref);
      } else {
        entry.parent.appendChild(entry.node);
      }
    });
  }

  const PluginRegistry = (() => {
    const _p = new Map();
    const _h = new Map();
    return {
      register(id, plugin) {
        const def = {
          id,
          version: plugin.version || '1.0.0',
          name: plugin.name || id,
          description: plugin.description || '',
          author: plugin.author || 'unknown',
          dependencies: plugin.dependencies || [],
          routes: plugin.routes || [],
          components: plugin.components || {},
          hooks: plugin.hooks || {},
          config: plugin.config || {},
          init: plugin.init || (async () => {}),
          mount: plugin.mount || (async () => {}),
          unmount: plugin.unmount || (async () => {}),
          destroy: plugin.destroy || (async () => {}),
          _mounted: false,
          _initialized: false,
        };
        for (const dep of def.dependencies) {
          if (!_p.has(dep)) {
            console.error(`[Plugin] "${id}" needs "${dep}"`);
            return false;
          }
        }
        _p.set(id, def);
        Object.entries(def.hooks).forEach(([h, fn]) => this.addHook(h, id, fn));
        EventBus.emit('plugin:registered', { id, plugin: def });
        return true;
      },
      async init(id) {
        const p = _p.get(id);
        if (!p || p._initialized) return;
        try {
          await p.init({ EventBus, PluginRegistry, Config, DataLayer, UI });
          p._initialized = true;
          EventBus.emit('plugin:initialized', { id });
        } catch (e) {
          console.error(`[Plugin] Init "${id}" failed:`, e);
          EventBus.emit('plugin:error', { pluginId: id, error: e, phase: 'init' });
        }
      },
      async mount(id) {
        const p = _p.get(id);
        if (!p || p._mounted) return;
        const beforeChildren = document.body ? Array.from(document.body.childNodes) : [];
        try {
          await p.mount({ EventBus, PluginRegistry, Config, DataLayer, UI });
          p._mounted = true;
          EventBus.emit('plugin:mounted', { id });
        } catch (e) {
          const afterChildren = document.body ? Array.from(document.body.childNodes) : [];
          for (let i = afterChildren.length - 1; i >= 0; i--) {
            if (beforeChildren.indexOf(afterChildren[i]) === -1 && afterChildren[i].parentNode) {
              afterChildren[i].parentNode.removeChild(afterChildren[i]);
            }
          }
          p._mounted = false;
          console.error(`[Plugin] Mount "${id}" failed:`, e);
          EventBus.emit('plugin:error', { pluginId: id, error: e, phase: 'mount' });
        }
      },
      async unmount(id) {
        const p = _p.get(id);
        if (!p || !p._mounted) return;
        try {
          await p.unmount({ EventBus, PluginRegistry, Config, DataLayer, UI });
          p._mounted = false;
          EventBus.emit('plugin:unmounted', { id });
        } catch (e) {
          console.error(`[Plugin] Unmount "${id}" failed:`, e);
          EventBus.emit('plugin:error', { pluginId: id, error: e, phase: 'unmount' });
        }
      },
      async destroy(id) {
        await this.unmount(id);
        const p = _p.get(id);
        if (p) {
          try {
            await p.destroy({ EventBus, PluginRegistry, Config, DataLayer, UI });
          } catch (e) {}
          _p.delete(id);
          EventBus.emit('plugin:destroyed', { id });
        }
      },
      get(id) {
        return _p.get(id);
      },
      getAll() {
        return [..._p.values()];
      },
      addHook(hook, pluginId, fn) {
        if (!_h.has(hook)) _h.set(hook, []);
        _h.get(hook).push({ pluginId, handler: fn });
      },
      async executeHook(hook, data) {
        const handlers = _h.get(hook) || [];
        let result = { ...data };
        for (const { pluginId, handler } of handlers) {
          try {
            const m = await handler(result);
            if (m !== undefined) result = m;
          } catch (e) {
            console.error(`[Plugin] Hook "${hook}" in "${pluginId}":`, e);
          }
        }
        return result;
      },
    };
  })();

  // ===== 3. COMPONENT REGISTRY =====
  const ComponentRegistry = (() => {
    const _c = new Map();
    const _i = new Map();
    const captureFocusState = (el) => {
      if (!el || !el.tagName) return null;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        return {
          tag,
          value: el.value,
          selectionStart: el.selectionStart,
          selectionEnd: el.selectionEnd,
          id: el.id,
          name: el.name,
          type: el.type,
        };
      }
      if (tag === 'select') {
        return { tag, value: el.value, id: el.id, name: el.name };
      }
      if (tag === 'button') {
        return { tag, id: el.id, name: el.name };
      }
      return null;
    };
    const restoreFocusState = (container, state) => {
      if (!container || !state) return;
      const focusables = [...container.querySelectorAll('input, textarea, select, button, [tabindex]')];
      const match =
        focusables.find((el) => {
          const tag = el.tagName.toLowerCase();
          if (state.id && el.id !== state.id) return false;
          if (state.name && el.name !== state.name) return false;
          if (state.type && el.type !== state.type) return false;
          return true;
        }) || focusables[0];
      if (!match || typeof match.focus !== 'function') return;
      match.focus();
      if (state.selectionStart !== undefined && typeof match.setSelectionRange === 'function') {
        match.setSelectionRange(
          state.selectionStart,
          state.selectionEnd !== undefined ? state.selectionEnd : state.selectionStart
        );
      }
    };
    return {
      register(type, def) {
        _c.set(type, {
          render: def.render || (() => ''),
          mount: def.mount || (() => {}),
          unmount: def.unmount || (() => {}),
          defaultProps: def.defaultProps || {},
          validate: def.validate || (() => true),
        });
      },
      create(type, props = {}, container = null) {
        const d = _c.get(type);
        if (!d) {
          console.error(`[Component] Unknown: "${type}"`);
          return null;
        }
        const merged = { ...d.defaultProps, ...props };
        if (!d.validate(merged)) {
          console.error(`[Component] Invalid props: "${type}"`);
          return null;
        }
        const id = `c_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const inst = { id, type, props: merged, container, _mounted: false };
        _i.set(id, inst);
        if (container) {
          container.innerHTML = d.render(merged);
          d.mount(container, merged, id);
          inst._mounted = true;
        }
        return inst;
      },
      update(id, newProps) {
        const inst = _i.get(id);
        if (!inst) return;
        const d = _c.get(inst.type);
        if (!d || !inst.container) return;
        const activeElement =
          document.activeElement && inst.container.contains(document.activeElement) ? document.activeElement : null;
        const focusState = captureFocusState(activeElement);
        d.unmount(inst.container, inst.props, id);
        inst.props = { ...inst.props, ...newProps };
        inst.container.innerHTML = d.render(inst.props);
        d.mount(inst.container, inst.props, id);
        inst._mounted = true;
        restoreFocusState(inst.container, focusState);
      },
      destroy(id) {
        const inst = _i.get(id);
        if (!inst) return;
        const d = _c.get(inst.type);
        if (d && inst.container) d.unmount(inst.container, inst.props, id);
        _i.delete(id);
      },
      types() {
        return [..._c.keys()];
      },
    };
  })();

  // ===== 4. CONFIG MANAGER =====
  const Config = (() => {
    const _d = {};
    const _v = new Map();
    const _s = new Map();
    const getSchemaForPath = (path) => {
      const parts = path.split('.');
      while (parts.length) {
        const candidate = parts.join('.');
        if (_s.has(candidate)) return _s.get(candidate);
        parts.pop();
      }
      return null;
    };
    const validateAgainstSchema = (value, schema, key) => {
      if (!schema) return true;
      const currentSchema = key && schema[key] !== undefined ? schema[key] : schema;
      if (typeof currentSchema === 'function') return currentSchema(value);
      if (currentSchema && typeof currentSchema === 'object') {
        if (typeof currentSchema.validator === 'function') return currentSchema.validator(value);
        if (currentSchema.type) {
          switch (currentSchema.type) {
            case 'boolean':
              return typeof value === 'boolean';
            case 'number':
              return typeof value === 'number' && !Number.isNaN(value);
            case 'integer':
              return Number.isInteger(value);
            case 'string':
              return typeof value === 'string';
            case 'array':
              return Array.isArray(value);
            case 'object':
              return value !== null && typeof value === 'object' && !Array.isArray(value);
            default:
              return true;
          }
        }
      }
      return true;
    };
    return {
      defaults(ns, vals) {
        _d[ns] = { ...(_d[ns] || {}), ...vals };
      },
      registerSchema(path, schema) {
        _s.set(path, schema);
      },
      get(path, fallback) {
        const [ns, ...keys] = path.split('.');
        let val = _d[ns];
        for (const k of keys) {
          if (val === undefined || val === null) return fallback;
          val = val[k];
        }
        return val !== undefined ? val : fallback;
      },
      set(path, value) {
        const [ns, ...keys] = path.split('.');
        if (!_d[ns]) _d[ns] = {};
        let t = _d[ns];
        for (let i = 0; i < keys.length - 1; i++) {
          if (!t[keys[i]]) t[keys[i]] = {};
          t = t[keys[i]];
        }
        const last = keys[keys.length - 1];
        const old = t[last];
        const schema = getSchemaForPath(path);
        if (_v.has(path) && !_v.get(path)(value)) {
          t[last] = old;
          return false;
        }
        if (schema && !validateAgainstSchema(value, schema, last)) {
          t[last] = old;
          return false;
        }
        t[last] = value;
        EventBus.emit('config:changed', { path, value, oldValue: old, namespace: ns });
        return true;
      },
      validate(path, fn) {
        _v.set(path, fn);
      },
      getAll(ns) {
        return ns ? _d[ns] : { ..._d };
      },
      watch(path, cb) {
        return EventBus.on('config:changed', (d) => {
          if (d.path === path || d.path.startsWith(path + '.')) cb(d);
        });
      },
    };
  })();

  // ===== 5. DATA LAYER =====
  const DataLayer = (() => {
    const _adapters = new Map();
    const _cache = new Map();
    return {
      registerAdapter(platform, adapter) {
        _adapters.set(platform, {
          search: adapter.search || (async () => []),
          getProduct: adapter.getProduct || (async () => null),
          getTrends: adapter.getTrends || (async () => []),
          getSuppliers: adapter.getSuppliers || (async () => []),
          getPrices: adapter.getPrices || (async () => ({})),
          ...adapter,
        });
      },
      getAdapter(platform) {
        return _adapters.get(platform);
      },
      getAdapters() {
        return [..._adapters.entries()];
      },
      async searchAll(query, filters = {}) {
        const promises = [];
        for (const [name, adapter] of _adapters) {
          if (filters.platform && filters.platform !== 'all' && filters.platform !== name) {
            promises.push(Promise.resolve([]));
            continue;
          }
          promises.push(
            adapter
              .search(query, filters)
              .then((items) => items.map((item) => ({ ...item, _sourcePlatform: name })))
              .catch((e) => {
                console.error(`[DataLayer] Search "${name}":`, e);
                return [];
              })
          );
        }
        const allResults = await Promise.all(promises);
        return allResults.flat();
      },
      async getFromPlatform(platform, method, ...args) {
        const adapter = _adapters.get(platform);
        if (!adapter || !adapter[method]) {
          console.error(`[DataLayer] ${platform}.${method} not found`);
          return null;
        }
        return adapter[method](...args);
      },
      setCache(key, value, ttl = 300000) {
        _cache.set(key, { value, expires: Date.now() + ttl });
      },
      getCache(key) {
        const entry = _cache.get(key);
        if (!entry || Date.now() > entry.expires) {
          _cache.delete(key);
          return null;
        }
        return entry.value;
      },
      clearCache() {
        _cache.clear();
      },
    };
  })();

  // ===== 6. UI UTILITIES =====
  const normalizeImageUrl = (src, fallback = 'https://via.placeholder.com/300x200?text=Product') => {
    if (typeof src !== 'string' || !src.trim()) return fallback;
    const value = src.trim();
    if (value.indexOf('images.unsplash.com') === -1) return value;
    try {
      const url = new URL(value);
      const width = parseInt(url.searchParams.get('w') || '800', 10) || 800;
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('q', '80');
      url.searchParams.set('w', String(width));
      return url.toString();
    } catch (e) {
      return value;
    }
  };

  const getOptimizedImageAttributes = (src, alt = '', options = {}) => {
    const fallback = options.fallback || 'https://via.placeholder.com/300x200?text=Product';
    const normalized = normalizeImageUrl(src, fallback);
    const attrs = {
      src: normalized,
      alt: alt || '',
      loading: options.loading !== false ? 'lazy' : 'eager',
      decoding: 'async',
      fetchpriority: options.fetchpriority || 'low',
    };
    if (typeof normalized === 'string' && normalized.indexOf('images.unsplash.com') !== -1) {
      const baseUrl = normalized.split('?')[0];
      const params = new URL(normalized).searchParams;
      const width = parseInt(params.get('w') || '800', 10) || 800;
      const small = `${baseUrl}?${params.toString().replace(/w=\d+/, 'w=400')}`;
      const large = `${baseUrl}?${params.toString().replace(/w=\d+/, 'w=' + width)}`;
      attrs.srcset = `${small} 400w, ${large} ${width}w`;
      attrs.sizes = options.sizes || '(max-width: 768px) 100vw, 33vw';
    }
    return attrs;
  };

  const UI = (() => {
    let _toastContainer = null;
    return {
      $(id) {
        return document.getElementById(id);
      },
      $$(sel, ctx) {
        return (ctx || document).querySelectorAll(sel);
      },
      create(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => {
          if (k === 'className') el.className = v;
          else if (k === 'innerHTML') el.innerHTML = v;
          else if (k === 'textContent') el.textContent = v;
          else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
          else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
          else el.setAttribute(k, v);
        });
        children.forEach((c) => {
          if (typeof c === 'string') el.appendChild(document.createTextNode(c));
          else if (c) el.appendChild(c);
        });
        return el;
      },
      on(target, event, handler, opts) {
        if (typeof target === 'string') target = this.$(target);
        if (target) target.addEventListener(event, handler, opts);
      },
      off(target, event, handler) {
        if (typeof target === 'string') target = this.$(target);
        if (target) target.removeEventListener(event, handler);
      },
      toast(msg, type = 'info', duration = 3000) {
        if (!_toastContainer) {
          _toastContainer = this.create('div', {
            className: 'hd-toast-container',
            style: {
              position: 'fixed',
              top: '70px',
              right: '20px',
              zIndex: '10000',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            },
          });
          document.body.appendChild(_toastContainer);
        }
        // Limit toast count to prevent overflow (max 5 visible)
        const maxToasts = 5;
        let currentToasts = _toastContainer.querySelectorAll('.hd-toast');
        while (currentToasts.length >= maxToasts) {
          var oldest = currentToasts[0];
          if (oldest) {
            oldest.style.opacity = '0';
            oldest.style.transform = 'translateX(20px)';
            setTimeout(function () {
              if (oldest.parentNode) oldest.remove();
            }, 300);
          }
          currentToasts = _toastContainer.querySelectorAll('.hd-toast');
        }
        const colors = {
          info: 'var(--accent-cyan)',
          success: 'var(--accent-green)',
          warning: 'var(--accent-orange)',
          error: 'var(--accent-red)',
        };
        const t = this.create('div', {
          className: 'hd-toast hd-toast-' + type,
          innerHTML: msg,
          style: {
            padding: '10px 18px',
            borderRadius: '10px',
            background: 'var(--bg-card)',
            border: '1px solid ' + (colors[type] || colors.info),
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'var(--font-body)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeUp 0.3s ease',
            boxShadow: '0 0 20px ' + ((colors[type] || colors.info) + '22'),
          },
        });
        _toastContainer.appendChild(t);
        setTimeout(function () {
          t.style.opacity = '0';
          t.style.transform = 'translateX(20px)';
          setTimeout(function () {
            if (t.parentNode) t.remove();
          }, 300);
        }, duration);
      },
      /**
       * Show a modal dialog. Uses AbortController for event listener cleanup.
       * Includes focus trapping for accessibility.
       * @param {string} content - HTML content for the modal body
       * @param {Function} [onClose] - Callback when modal is closed
       */
      async modal(content, onClose) {
        // Clean up any previous modal event listeners
        Store.abortController('modal');
        const controller = Store.createController('modal');
        const signal = controller.signal;

        let overlay = document.querySelector('.hd-modal-overlay');
        let focusTrapBefore = null;
        let focusTrapAfter = null;

        if (!overlay) {
          overlay = this.create('div', {
            className: 'hd-modal-overlay',
            innerHTML:
              '<div tabindex="0" class="hd-modal-focus-start"></div><div class="hd-modal"><button class="hd-modal-close">&times;</button><div class="hd-modal-body"></div></div><div tabindex="0" class="hd-modal-focus-end"></div>',
            style: {
              position: 'fixed',
              inset: '0',
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(10px)',
              zIndex: '1000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: '0',
              pointerEvents: 'none',
              transition: 'opacity 0.3s',
            },
          });
          document.body.appendChild(overlay);
          overlay.querySelector('.hd-modal-close').addEventListener(
            'click',
            function () {
              UI.closeModal();
            },
            { signal }
          );
          overlay.addEventListener(
            'click',
            function (e) {
              if (e.target === overlay) UI.closeModal();
            },
            { signal }
          );

          // Focus trap: when leaving the end sentinel, focus back to start
          focusTrapBefore = overlay.querySelector('.hd-modal-focus-start');
          focusTrapAfter = overlay.querySelector('.hd-modal-focus-end');
          if (focusTrapBefore) {
            focusTrapBefore.addEventListener('focus', function () {
              const modal = overlay.querySelector('.hd-modal');
              if (modal) {
                const focusable = modal.querySelectorAll(
                  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length > 0) focusable[focusable.length - 1].focus();
              }
            });
          }
          if (focusTrapAfter) {
            focusTrapAfter.addEventListener('focus', function () {
              const modal = overlay.querySelector('.hd-modal');
              if (modal) {
                const focusable = modal.querySelectorAll(
                  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length > 0) focusable[0].focus();
              }
            });
          }
        }
        overlay.querySelector('.hd-modal-body').innerHTML = content;
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'all';
        document.body.style.overflow = 'hidden';

        // Focus the first focusable element inside the modal
        const modal = overlay.querySelector('.hd-modal');
        if (modal) {
          const focusable = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0 && typeof focusable[0].focus === 'function') {
            setTimeout(function () {
              focusable[0].focus();
            }, 100);
          }
        }

        // Store previously focused element to restore on close
        if (document.activeElement && document.activeElement !== document.body) {
          Store.set('modal.previousFocus', document.activeElement);
        }

        // Store onClose callback for cleanup
        if (onClose) Store.set('modal.onClose', onClose);
      },
      /**
       * Close the modal and clean up event listeners via AbortController.
       * Restores focus to the element that was focused before the modal opened.
       */
      closeModal() {
        const o = document.querySelector('.hd-modal-overlay');
        if (o) {
          o.style.opacity = '0';
          o.style.pointerEvents = 'none';
          document.body.style.overflow = '';
          // Restore focus to previous element
          const prevFocus = Store.get('modal.previousFocus');
          if (prevFocus && typeof prevFocus.focus === 'function') {
            try {
              prevFocus.focus();
            } catch (e) {}
            Store.set('modal.previousFocus', null);
          }
          // Abort all modal event listeners to prevent memory leaks
          Store.abortController('modal');
          // Call and clear onClose callback
          const onClose = Store.get('modal.onClose');
          if (onClose) {
            try {
              onClose();
            } catch (e) {
              Logger.error('Modal onClose error', e, 'UI');
            }
            Store.set('modal.onClose', null);
          }
        }
      },
      normalizeImageUrl,
      getOptimizedImageAttributes,
      escapeHtml(str) {
        if (str == null) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      },
      attr(val) {
        if (val == null) return '';
        return String(val)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      },
      escapeUrl(val) {
        if (val == null) return '';
        return String(val)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '%22')
          .replace(/'/g, '%27')
          .replace(/</g, '%3C')
          .replace(/>/g, '%3E');
      },
    };
  })();

  // ===== 7. STATE STORE =====
  /**
   * Centralized state management. All plugins read/write through this store.
   * Uses EventBus to notify state changes.
   * @typedef {Object} AppState
   * @property {Object<string, *>} slices - Named state slices
   */
  const Store = (() => {
    /** @type {Map<string, *>} */
    const _state = new Map();
    /** @type {Map<string, AbortController>} */
    const _controllers = new Map();

    return {
      /**
       * Get a state value by key (supports dot notation)
       * @param {string} key
       * @param {*} [fallback]
       * @returns {*}
       */
      get(key, fallback) {
        if (key.includes('.')) {
          const parts = key.split('.');
          let val = _state.get(parts[0]);
          for (let i = 1; i < parts.length; i++) {
            if (val == null || typeof val !== 'object') return fallback;
            val = val[parts[i]];
          }
          return val !== undefined ? val : fallback;
        }
        const val = _state.get(key);
        return val !== undefined ? val : fallback;
      },

      /**
       * Set a state value by key (supports dot notation)
       * Emits 'store:changed' event with {key, value, oldValue}
       * @param {string} key
       * @param {*} value
       */
      set(key, value) {
        let oldValue;
        if (key.includes('.')) {
          const parts = key.split('.');
          const root = parts[0];
          let obj = _state.get(root);
          if (obj == null || typeof obj !== 'object') {
            obj = {};
            _state.set(root, obj);
          }
          oldValue = obj;
          let target = obj;
          for (let i = 1; i < parts.length - 1; i++) {
            if (target[parts[i]] == null || typeof target[parts[i]] !== 'object') {
              target[parts[i]] = {};
            }
            target = target[parts[i]];
          }
          oldValue = target[parts[parts.length - 1]];
          target[parts[parts.length - 1]] = value;
        } else {
          oldValue = _state.get(key);
          _state.set(key, value);
        }
        EventBus.emit('store:changed', { key, value, oldValue });
      },

      /**
       * Get all state as a plain object
       * @returns {Object<string, *>}
       */
      getAll() {
        const result = {};
        for (const [k, v] of _state.entries()) {
          result[k] = v;
        }
        return result;
      },

      /**
       * Watch a key for changes
       * @param {string} key
       * @param {Function} callback
       * @returns {Function} unsubscribe
       */
      watch(key, callback) {
        return EventBus.on('store:changed', (data) => {
          if (data.key === key || data.key.startsWith(key + '.')) {
            callback(data.value, data.oldValue, data.key);
          }
        });
      },

      /**
       * Create an AbortController for cleanup (e.g., modal event listeners)
       * @param {string} id - Unique identifier for the controller
       * @returns {AbortController}
       */
      createController(id) {
        // Abort any existing controller with the same id
        this.abortController(id);
        const controller = new AbortController();
        _controllers.set(id, controller);
        return controller;
      },

      /**
       * Abort and remove a controller
       * @param {string} id
       */
      abortController(id) {
        const controller = _controllers.get(id);
        if (controller) {
          controller.abort();
          _controllers.delete(id);
        }
      },

      /**
       * Clear all state
       */
      clear() {
        _state.clear();
        EventBus.emit('store:cleared', {});
      },
    };
  })();

  // ===== 8. FEATURE FLAGS =====
  const FeatureFlags = (() => {
    /** @type {Object<string, boolean>} */
    const _flags = {};
    return {
      /** @param {string} flag @param {boolean} [defaultVal] */
      register(flag, defaultVal = false) {
        _flags[flag] = defaultVal;
      },
      /** @param {string} flag */
      enable(flag) {
        _flags[flag] = true;
        EventBus.emit('feature:enabled', { flag });
      },
      /** @param {string} flag */
      disable(flag) {
        _flags[flag] = false;
        EventBus.emit('feature:disabled', { flag });
      },
      /** @param {string} flag @returns {boolean} */
      isEnabled(flag) {
        return !!_flags[flag];
      },
      /** @returns {Object<string, boolean>} */
      getAll() {
        return { ..._flags };
      },
    };
  })();

  // ===== 9. ROUTER =====
  const Router = (() => {
    const _routes = new Map();
    let _current = null;
    return {
      register(path, handler) {
        _routes.set(path, handler);
      },
      async navigate(path) {
        if (!_routes.has(path)) {
          console.warn(`[Router] No route: "${path}"`);
          return;
        }
        if (_current) {
          await EventBus.emit('route:leave', { path: _current });
        }
        _current = path;
        await _routes.get(path)();
        await EventBus.emit('route:enter', { path });
      },
      current() {
        return _current;
      },
    };
  })();

  // ===== GLOBAL EXPORT =====
  window.HuntDrop = {
    EventBus,
    PluginRegistry,
    ComponentRegistry,
    Config,
    DataLayer,
    UI,
    FeatureFlags,
    Router,
    Store,
    Logger,
    normalizeImageUrl,
    getOptimizedImageAttributes,
  };
})();
