// ============================================================================
// PLUGIN: Backend Bridge v2 — Connects frontend to backend API
// ============================================================================
// This plugin intercepts EventBus events and routes them through the
// backend REST API instead of localStorage. It replaces local persistence
// with server-backed persistence.
//
// Features:
//   - Intercepts product:saved, product:analyze, filter:changed events
//   - Routes search through backend when connected
//   - Provides auth login/logout/register via EventBus
//   - Exposes window.HuntDrop.BackendAPI for all plugins
//   - Graceful fallback to local mode when backend is unavailable
//
// BACKEND_URL defaults to http://localhost:3001/api
// Set window.HuntDrop.BACKEND_URL before this script loads to customize.
// ============================================================================
(function () {
  const { EventBus, PluginRegistry, Config, Store, UI } = window.HuntDrop;

  const PRODUCTION_BACKEND = 'https://auto-drop-backend-3jhmeqd3z-trendaryo-s-projects.vercel.app/api';
  const API_BASE = window.HuntDrop.BACKEND_URL
    || (window.HuntDrop._proxyUrl ? window.HuntDrop._proxyUrl.replace(/\/api\/platform\/?$/, '/api') : '')
    || PRODUCTION_BACKEND;
  let _token = localStorage.getItem('huntdrop_token') || null;
  let _user = null;
  let _connected = false;
  let _cleanups = [];
  let _searchMode = 'local'; // 'local' | 'remote'

  // ===== API Client with retry + timeout =====
  async function api(method, path, body, { timeout = 15000, retries = 1 } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (_token) headers['Authorization'] = 'Bearer ' + _token;

    const opts = { method, headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      opts.signal = controller.signal;

      try {
        const resp = await fetch(API_BASE + path, opts);
        clearTimeout(timer);
        const data = await resp.json();
        if (!resp.ok) {
          const err = new Error(data.error?.message || 'API request failed');
          err.code = data.error?.code;
          err.status = resp.status;
          throw err;
        }
        return data;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        if (err.name === 'AbortError') {
          lastError = new Error('Request timed out');
        }
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  // ===== Auth API =====
  async function login(email, password) {
    const result = await api('POST', '/auth/login', { email, password });
    _token = result.data.token;
    _user = result.data.user;
    localStorage.setItem('huntdrop_token', _token);
    Store.set('auth.user', _user);
    Store.set('auth.token', _token);
    EventBus.emit('auth:login', { user: _user });
    return result.data;
  }

  async function register(email, password, displayName) {
    const result = await api('POST', '/auth/register', { email, password, displayName });
    _token = result.data.token;
    _user = result.data.user;
    localStorage.setItem('huntdrop_token', _token);
    Store.set('auth.user', _user);
    Store.set('auth.token', _token);
    EventBus.emit('auth:login', { user: _user });
    return result.data;
  }

  function logout() {
    _token = null;
    _user = null;
    localStorage.removeItem('huntdrop_token');
    Store.set('auth.user', null);
    Store.set('auth.token', null);
    EventBus.emit('auth:logout', {});
  }

  async function checkSession() {
    if (!_token) return false;
    try {
      const result = await api('GET', '/auth/profile');
      _user = result.data;
      Store.set('auth.user', _user);
      _connected = true;
      return true;
    } catch {
      logout();
      return false;
    }
  }

  // ===== Search API =====
  async function searchProducts(query, filters) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters?.platform && filters.platform !== 'all') params.set('platform', filters.platform);
    if (filters?.priceMax) params.set('priceMax', String(filters.priceMax));
    if (filters?.minScore) params.set('minScore', String(filters.minScore));
    if (filters?.competition && filters.competition !== 'all') params.set('competition', filters.competition);
    if (filters?.margin && filters.margin !== 'all') params.set('margin', String(filters.margin));
    if (filters?.sort) params.set('sort', filters.sort);

    const result = await api('GET', '/search?' + params.toString());
    return result.data;
  }

  // ===== Product API =====
  async function getProduct(id) {
    const result = await api('GET', '/products/' + id);
    return result.data;
  }

  async function saveProduct(productId) {
    if (!_token) {
      EventBus.emit('auth:required', { action: 'save', productId });
      return null;
    }
    const result = await api('POST', '/products/' + productId + '/save');
    EventBus.emit('product:saved:remote', { productId, saved: result.data });
    return result.data;
  }

  async function unsaveProduct(productId) {
    if (!_token) return;
    await api('DELETE', '/products/' + productId + '/save');
    EventBus.emit('product:unsaved:remote', { productId });
  }

  async function getSavedProducts() {
    if (!_token) return [];
    const result = await api('GET', '/products/saved');
    return result.data;
  }

  async function isProductSaved(productId) {
    if (!_token) return false;
    try {
      const result = await api('GET', '/products/' + productId + '/save/check');
      return result.data.saved;
    } catch {
      return false;
    }
  }

  // ===== Batch API =====
  async function batchSave(productIds) {
    if (!_token) {
      EventBus.emit('auth:required', { action: 'batch-save' });
      return [];
    }
    const result = await api('POST', '/products/batch/save', { productIds });
    return result.data;
  }

  async function batchUnsave(productIds) {
    if (!_token) return;
    const result = await api('POST', '/products/batch/unsave', { productIds });
    return result.data;
  }

  // ===== Calculator API =====
  async function calculate(params) {
    const result = await api('POST', '/calculator/calculate', params);
    return result.data;
  }

  async function quickCalculate(params) {
    const result = await api('POST', '/calculator/preview', params);
    return result.data;
  }

  async function getCalcHistory() {
    if (!_token) return [];
    const result = await api('GET', '/calculator/history');
    return result.data;
  }

  // ===== Settings API =====
  async function getSettings() {
    if (!_token) return null;
    const result = await api('GET', '/settings');
    return result.data;
  }

  async function updateSettings(settings) {
    if (!_token) return null;
    const result = await api('PATCH', '/settings', settings);
    return result.data;
  }

  // ===== Analytics API =====
  async function trackEvent(eventType, data) {
    if (!_token || !_connected) return;
    // Fire and forget — don't block UI
    api('POST', '/analytics/track', { eventType, data }).catch(() => {});
  }

  // ===== Export API =====
  async function exportData(format = 'json') {
    if (!_token) return null;
    const result = await api('GET', '/export?format=' + format);
    return result.data;
  }

  // ===== Health Check =====
  async function checkHealth() {
    try {
      const result = await api('GET', '/health', null, { timeout: 5000, retries: 0 });
      _connected = true;
      return result.data.status === 'ok';
    } catch {
      _connected = false;
      return false;
    }
  }

  // ===== EventBus Interceptors =====
  // When backend is connected, intercept these events and route through API

  function setupEventInterceptors() {
    // Intercept product:save requests — route through API
    const c1 = EventBus.on('product:save', async (data) => {
      if (!_connected || _searchMode === 'local') return;
      if (data?.productId) {
        await saveProduct(data.productId);
      }
    });

    // Intercept product:unsave requests
    const c2 = EventBus.on('product:unsave', async (data) => {
      if (!_connected || _searchMode === 'local') return;
      if (data?.productId) {
        await unsaveProduct(data.productId);
      }
    });

    // Intercept calculator:calculate — route through API
    const c3 = EventBus.on('calculator:calculate', async (data) => {
      if (!_connected || _searchMode === 'local') return;
      const result = await calculate(data);
      EventBus.emit('calculator:result', result);
    });

    // Intercept auth:login-request
    const c4 = EventBus.on('auth:login-request', async (data) => {
      if (data?.email && data?.password) {
        await login(data.email, data.password);
      }
    });

    // Intercept auth:register-request
    const c5 = EventBus.on('auth:register-request', async (data) => {
      if (data?.email && data?.password) {
        await register(data.email, data.password, data.displayName);
      }
    });

    // Intercept auth:logout-request
    const c6 = EventBus.on('auth:logout-request', () => {
      logout();
    });

    // Track navigation events for analytics
    const c7 = EventBus.on('route:enter', (data) => {
      trackEvent('navigation', { path: data.path });
    });

    // Track product views
    const c8 = EventBus.on('product:analyze', (data) => {
      trackEvent('product:view', { productId: data.id });
    });

    _cleanups = [c1, c2, c3, c4, c5, c6, c7, c8];
  }

  function removeEventInterceptors() {
    _cleanups.forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
    _cleanups = [];
  }

  // ===== Plugin Definition =====
  const BackendBridge = {
    id: 'backend-bridge',
    name: 'Backend Bridge',
    version: '2.0.0',
    description: 'Connects frontend to backend API with automatic event interception',

    init(_ctx) {
      Config.defaults('backend', {
        url: API_BASE,
        connected: false,
        searchMode: 'local',
      });
    },

    async mount(_ctx) {
      // Check backend connection
      const healthy = await checkHealth();
      if (healthy) {
        Config.set('backend.connected', true);
        _searchMode = 'remote';
        Config.set('backend.searchMode', 'remote');
        console.debug('[BackendBridge] Connected to', API_BASE);

        // Try to restore session
        await checkSession();

        // Setup event interceptors for server-backed mode
        setupEventInterceptors();
      } else {
        Config.set('backend.connected', false);
        _searchMode = 'local';
        Config.set('backend.searchMode', 'local');
        console.warn('[BackendBridge] Backend not available at', API_BASE, '— using local mode');
      }

      // Expose comprehensive API on window.HuntDrop
      window.HuntDrop.BackendAPI = {
        auth: {
          login,
          register,
          logout,
          checkSession,
          getProfile: () => _user,
          getUser: () => _user,
          isLoggedIn: () => !!_user,
        },
        search: {
          searchProducts,
          getMode: () => _searchMode,
          setMode: (mode) => {
            _searchMode = mode;
            Config.set('backend.searchMode', mode);
          },
        },
        products: {
          getProduct,
          saveProduct,
          unsaveProduct,
          getSavedProducts,
          isProductSaved,
          batchSave,
          batchUnsave,
        },
        calculator: {
          calculate,
          quickCalculate,
          getCalcHistory,
        },
        settings: {
          getSettings,
          updateSettings,
        },
        analytics: {
          trackEvent,
        },
        export: {
          exportData,
        },
        health: {
          checkHealth,
          isConnected: () => _connected,
        },
        getToken: () => _token,
      };

      // Emit connection status
      EventBus.emit('backend:status', { connected: _connected });
    },

    unmount(_ctx) {
      removeEventInterceptors();
      delete window.HuntDrop.BackendAPI;
    },
  };

  PluginRegistry.register('backend-bridge', BackendBridge);
})();
