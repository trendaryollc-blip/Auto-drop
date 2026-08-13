// ============================================================================
// PLUGIN: Store Connect — Multi-platform store push and connection manager
// ============================================================================
(function () {
  'use strict';
  try {
    const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;
    const esc = (s) => UI.escapeHtml(String(s || ''));

    const LS_CONN_KEY = 'huntdrop_store_connect';
    const LS_HISTORY_KEY = 'huntdrop_store_connect_history';
    const STORE_CONNECT_API_PATH = '/store-connect';
    const FALLBACK_TRENDARYO = {
      apiUrl: 'https://trendaryo-llc-backend.vercel.app/api/products/ingest',
      storeUrl: 'https://trendaryo.com',
      apiKey: 'trnd_ingest_8f3a7b2c9d1e4f5a6b7c8d9e0f1a2b3c',
    };

    const PLATFORMS = {
      trendaryo: {
        id: 'trendaryo',
        name: 'Trendaryo',
        description: 'Push products directly to your Trendaryo store.',
        fields: [
          { id: 'storeId', label: 'Trendaryo Store ID', placeholder: 'trendaryo-store-123' },
          { id: 'apiKey', label: 'Trendaryo API Key', placeholder: 'trnd_...' },
        ],
      },
      shopify: {
        id: 'shopify',
        name: 'Shopify',
        description: 'Push products into Shopify using store credentials.',
        fields: [
          { id: 'storeUrl', label: 'Shopify Store URL', placeholder: 'yourstore.myshopify.com' },
          { id: 'accessToken', label: 'Store Access Token', placeholder: 'shpat_...', secret: true },
        ],
      },
      woocommerce: {
        id: 'woocommerce',
        name: 'WooCommerce',
        description: 'Push products into WooCommerce via REST API keys.',
        fields: [
          { id: 'storeUrl', label: 'WooCommerce Store URL', placeholder: 'https://example.com' },
          { id: 'consumerKey', label: 'Consumer Key', placeholder: 'ck_...' },
          { id: 'consumerSecret', label: 'Consumer Secret', placeholder: 'cs_...', secret: true },
        ],
      },
      amazon: {
        id: 'amazon',
        name: 'Amazon Seller',
        description: 'Prepare products for Amazon Seller Central upload.',
        fields: [
          { id: 'merchantId', label: 'Merchant ID', placeholder: 'A1BC23DEFG' },
          { id: 'marketplaceId', label: 'Marketplace ID', placeholder: 'ATVPDKIKX0DER' },
          { id: 'accessKey', label: 'Access Key', placeholder: 'AKIA...', secret: true },
          { id: 'secretKey', label: 'Secret Key', placeholder: '...', secret: true },
        ],
      },
      tiktok: {
        id: 'tiktok',
        name: 'TikTok Shop',
        description: 'Push products into TikTok Shop with seller credentials.',
        fields: [
          { id: 'businessId', label: 'TikTok Business ID', placeholder: '1234567890' },
          { id: 'accessToken', label: 'Access Token', placeholder: '...', secret: true },
        ],
      },
    };

    let _section = null;
    let _selectMode = false;
    const _selectedProducts = new Set();
    let _connection = loadConnection();

    function loadConnection() {
      try {
        const raw = localStorage.getItem(LS_CONN_KEY);
        if (!raw) return { platform: 'trendaryo', configs: {} };
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return Object.assign({ platform: 'trendaryo', configs: {} }, parsed);
        }
      } catch (e) {}
      return { platform: 'trendaryo', configs: {} };
    }

    function saveConnectionState() {
      try {
        localStorage.setItem(LS_CONN_KEY, JSON.stringify(_connection));
      } catch (e) {}
    }

    function getConnectionConfig(platform) {
      return (_connection.configs && _connection.configs[platform]) || {};
    }

    function setPlatform(platform) {
      if (!PLATFORMS[platform]) return false;
      _connection.platform = platform;
      saveConnectionState();
      return true;
    }

    function updateConnectionConfig(platform, values) {
      _connection.configs = _connection.configs || {};
      _connection.configs[platform] = Object.assign({}, getConnectionConfig(platform), values);
      saveConnectionState();
    }

    function getBackendBase() {
      const BACKEND_URL = window.HuntDrop && window.HuntDrop.BACKEND_URL;
      const proxyUrl = window.HuntDrop && window.HuntDrop._proxyUrl;
      if (BACKEND_URL) return BACKEND_URL.replace(/\/$/, '');
      if (proxyUrl) return proxyUrl.replace(/\/api\/platform\/?$/, '/api').replace(/\/$/, '');
      return '';
    }

    function getStoreConnectUrl() {
      const base = getBackendBase();
      return base ? base + STORE_CONNECT_API_PATH : '';
    }

    function getAuthHeaders() {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('huntdrop_token') || null;
      if (token) {
        headers.Authorization = 'Bearer ' + token;
      }
      return headers;
    }

    function isBackendAvailable() {
      return !!getStoreConnectUrl();
    }

    function getCurrentPlatform() {
      return _connection.platform || 'trendaryo';
    }

    let _remoteHistory = [];

    function getPushHistory() {
      if (_remoteHistory && _remoteHistory.length > 0) {
        return _remoteHistory;
      }
      try {
        return JSON.parse(localStorage.getItem(LS_HISTORY_KEY)) || [];
      } catch (e) {
        return [];
      }
    }

    function savePushHistory(history) {
      _remoteHistory = history.slice(0, 50);
      try {
        localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
      } catch (e) {}
    }

    function getStats() {
      const history = getPushHistory();
      const total = history.length;
      const success = history.filter((h) => h.status === 'success').length;
      const failed = history.filter((h) => h.status === 'failed').length;
      const lastPush = history.length > 0 ? history[0].timestamp : null;
      return { total, success, failed, lastPush };
    }

    function mapProductToTrendaryo(p) {
      const supplier = (p.suppliers && p.suppliers[0]) || {};
      return {
        name: p.title || 'Untitled Product',
        description: p.aiInsight || p.title || '',
        price: p.price || 0,
        originalPrice: p.originalPrice || 0,
        costPrice: p.price ? Math.round(p.price * (1 - (p.margin || 0) / 100) * 100) / 100 : 0,
        category: p.category || 'General',
        brand: supplier.name || 'Various',
        stock: 100,
        image: p.image || '',
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : p.image ? [p.image] : [],
        sku: 'HD-' + (p.id || Date.now()),
        supplier: supplier.name || '',
        supplierId: String(p.id || ''),
        supplierUrl: supplier.location || '',
        status: 'active',
        source: 'huntkit',
        huntkitProductId: 'hd-' + (p.id || Date.now()),
        tags: p.keywords || [],
        score: p.score || 0,
        badge: (p.badges && p.badges[0]) || 'new',
        rating: {
          average: Math.min(5, Math.round(((p.score || 0) / 20) * 10) / 10),
          count: p.reviews || 0,
        },
        featured: (p.score || 0) >= 80,
        metadata: {
          platform: p.platform || '',
          moq: 1,
          weeklySales: p.salesVelocity || 0,
          competition: p.competition || 'medium',
          margin: p.margin || 0,
          emoji: '',
          huntkitUrl: '',
          supplierUrl: supplier.location || '',
        },
      };
    }

    function mapProductToGeneric(p, platform) {
      return {
        title: p.title || 'Untitled Product',
        description: p.aiInsight || p.title || '',
        price: p.price || 0,
        sku: 'HD-' + (p.id || Date.now()),
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : p.image ? [p.image] : [],
        tags: p.keywords || [],
        platform: platform,
        source: 'huntkit',
        originalProductId: p.id || '',
      };
    }

    function buildPushPayload(products, status) {
      const platform = getCurrentPlatform();
      return products.map((p) => {
        const payload = platform === 'trendaryo' ? mapProductToTrendaryo(p) : mapProductToGeneric(p, platform);
        payload.status = status || Config.get('storeConnect.defaultStatus') || 'active';
        return payload;
      });
    }

    function getConnectionStatusText() {
      const platform = getCurrentPlatform();
      const connection = getConnectionConfig(platform);
      if (platform === 'trendaryo') return 'Connected';
      if (connection && Object.keys(connection).length > 0) return 'Configured';
      return 'Not configured';
    }

    async function callPushEndpoint(products, status) {
      const platform = getCurrentPlatform();
      const apiUrl = getStoreConnectUrl();
      const payload = buildPushPayload(products, status);

      if (apiUrl) {
        try {
          const response = await fetch(apiUrl + '/push', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              platform,
              status: status || Config.get('storeConnect.defaultStatus') || 'active',
              config: getConnectionConfig(platform),
              products: payload,
            }),
          });
          const data = await response.json();
          return data;
        } catch (e) {
          return { success: false, error: e.message || 'Network error' };
        }
      }

      if (platform === 'trendaryo') {
        return pushTrendaryoDirect(payload);
      }

      return { success: false, error: 'Backend unavailable for platform ' + platform };
    }

    async function pushTrendaryoDirect(payload) {
      try {
        const resp = await fetch(FALLBACK_TRENDARYO.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': FALLBACK_TRENDARYO.apiKey,
          },
          body: JSON.stringify({ products: payload }),
        });
        return resp.json();
      } catch (e) {
        return { success: false, error: e.message || 'Network error' };
      }
    }

    function updateHistory(products, apiResult) {
      const history = getPushHistory();
      const platform = getCurrentPlatform();
      const results = apiResult.results || [];
      products.forEach((p, index) => {
        const result = results[index] || {};
        history.unshift({
          productId: p.id,
          productTitle: p.title || 'Unknown Product',
          timestamp: new Date().toISOString(),
          status: result.success === false ? 'failed' : 'success',
          error: result.error || (apiResult.success === false ? apiResult.error : ''),
          platform,
        });
      });
      savePushHistory(history);
    }

    async function loadRemoteStoreConnectState() {
      const apiUrl = getStoreConnectUrl();
      if (!apiUrl) return;
      let changed = false;
      try {
        const statusResp = await fetch(apiUrl + '/status', {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        const statusData = await statusResp.json();
        if (statusResp.ok && statusData.success && statusData.data) {
          _connection.configs = Object.keys(statusData.data).reduce((acc, key) => {
            const entry = statusData.data[key];
            acc[key] = entry.config || entry;
            return acc;
          }, {});
          changed = true;
        }
      } catch (e) {
        // ignore remote status failures
      }
      try {
        const historyResp = await fetch(apiUrl + '/history', {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        const historyData = await historyResp.json();
        if (historyResp.ok && historyData.success) {
          _remoteHistory = Array.isArray(historyData.data) ? historyData.data : [];
          changed = true;
        }
      } catch (e) {
        // ignore remote history failures
      }
      if (changed) {
        render();
        bindEvents();
      }
    }

    async function saveConnectionToServer(platform, values) {
      const apiUrl = getStoreConnectUrl();
      if (!apiUrl) return null;
      try {
        const resp = await fetch(apiUrl + '/connect', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ platform, config: values }),
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
          _connection.configs = Object.assign({}, _connection.configs, { [platform]: data.data.config || values });
          return data;
        }
        return data;
      } catch (e) {
        return { success: false, error: e.message || 'Network error' };
      }
    }

    async function saveConnection(platform, values) {
      updateConnectionConfig(platform, values);
      if (!isBackendAvailable()) {
        return { success: true, data: { platform, config: getConnectionConfig(platform) } };
      }
      return await saveConnectionToServer(platform, values);
    }

    async function loadRemoteHistory() {
      const apiUrl = getStoreConnectUrl();
      if (!apiUrl) return;
      try {
        const resp = await fetch(apiUrl + '/history', { method: 'GET', headers: getAuthHeaders() });
        const data = await resp.json();
        if (resp.ok && data.success) {
          _remoteHistory = Array.isArray(data.data) ? data.data : [];
        }
      } catch (e) {
        // ignore
      }
    }

    async function testConnection(platform) {
      const target = platform || getCurrentPlatform();
      const apiUrl = getStoreConnectUrl();
      const config = getConnectionConfig(target);
      if (apiUrl) {
        const resp = await fetch(apiUrl + '/test', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ platform: target, config }),
        });
        return resp.json();
      }

      if (target === 'trendaryo') {
        try {
          const resp = await fetch(FALLBACK_TRENDARYO.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': FALLBACK_TRENDARYO.apiKey,
            },
            body: JSON.stringify({
              products: [
                {
                  name: 'Connection Test',
                  price: 0,
                  category: 'test',
                  source: 'huntkit',
                  status: 'draft',
                  huntkitProductId: 'hd-test-' + Date.now(),
                },
              ],
            }),
          });
          const data = await resp.json();
          return { success: data.success !== false, data };
        } catch (e) {
          return { success: false, error: e.message || 'Network error' };
        }
      }

      return { success: false, error: 'Backend unavailable for platform ' + target };
    }

    function renderPlatformOptions() {
      return Object.keys(PLATFORMS)
        .map((key) => {
          const platform = PLATFORMS[key];
          return `<option value="${esc(platform.id)}" ${platform.id === getCurrentPlatform() ? 'selected' : ''}>${esc(platform.name)}</option>`;
        })
        .join('');
    }

    function renderConnectionFields() {
      const platform = getCurrentPlatform();
      const platformDef = PLATFORMS[platform];
      const config = getConnectionConfig(platform);
      if (!platformDef) return '';

      let html = '';
      html += `<div class="sc-info-row"><span class="sc-info-label">Platform</span><span class="sc-info-value">${esc(platformDef.name)}</span></div>`;
      html += `<div class="sc-info-row"><span class="sc-info-label">Connection Status</span><span class="sc-info-value">${esc(getConnectionStatusText())}</span></div>`;
      if (platformDef.fields && platformDef.fields.length > 0) {
        html += '<div class="sc-connection-form">';
        platformDef.fields.forEach((field) => {
          html += `
            <label class="sc-label" for="scField-${esc(field.id)}">${esc(field.label)}</label>
            <input id="scField-${esc(field.id)}" class="sc-input" type="${field.secret ? 'password' : 'text'}" placeholder="${esc(field.placeholder || '')}" value="${esc(config[field.id] || '')}" />`;
        });
        html += '</div>';
      }

      if (platform === 'trendaryo') {
        html += `
          <div class="sc-info-row">
            <span class="sc-info-label">Store URL</span>
            <a href="${esc(FALLBACK_TRENDARYO.storeUrl)}" target="_blank" class="sc-info-value sc-link">${esc(FALLBACK_TRENDARYO.storeUrl)}</a>
          </div>`;
      }

      return html;
    }

    function renderConnectionPanel() {
      return `
    <div class="sc-panel">
      <div class="sc-panel-header">
        <h3 class="sc-panel-title">🔗 Store Connection</h3>
        <span class="sc-status-badge ${isBackendAvailable() ? 'sc-status-connected' : 'sc-status-warning'}">${
          isBackendAvailable() ? '● Backend Ready' : '● Backend Offline'
        }</span>
      </div>
      <div class="sc-panel-body">
        <div class="sc-info-row">
          <span class="sc-info-label">Connector API</span>
          <span class="sc-info-value sc-mono">${esc(getBackendBase() || 'no backend configured')}</span>
        </div>
        <div class="sc-info-row">
          <span class="sc-info-label">Target Platform</span>
          <select id="scPlatformSelect" class="sc-select">${renderPlatformOptions()}</select>
        </div>
        ${renderConnectionFields()}
        <div class="sc-connection-actions">
          <button class="sc-btn sc-btn-primary" id="scSaveConnection">Save Connection</button>
          <button class="sc-btn sc-btn-outline" id="scTestConnection">Test Connection</button>
        </div>
        <div id="scConnectionResult" class="sc-test-result"></div>
      </div>
    </div>`;
    }

    function renderPushPanel() {
      const stats = getStats();
      const defaultStatus = Config.get('storeConnect.defaultStatus') || 'active';
      return `
    <div class="sc-panel">
      <div class="sc-panel-header">
        <h3 class="sc-panel-title">🚀 Push Products</h3>
        <button class="sc-btn sc-btn-sm" id="scSelectModeBtn">
          ${_selectMode ? '✓ Select Mode ON' : '☑ Select Mode'}
        </button>
      </div>
      <div class="sc-panel-body">
        <div class="sc-info-row">
          <span class="sc-info-label">Active Platform</span>
          <span class="sc-info-value">${esc(PLATFORMS[getCurrentPlatform()].name)}</span>
        </div>
        <div class="sc-kpi-row">
          <div class="sc-kpi"><div class="sc-kpi-val">${stats.total}</div><div class="sc-kpi-label">Total Pushed</div></div>
          <div class="sc-kpi"><div class="sc-kpi-val" style="color:var(--accent-green)">${stats.success}</div><div class="sc-kpi-label">Succeeded</div></div>
          <div class="sc-kpi"><div class="sc-kpi-val" style="color:var(--accent-red)">${stats.failed}</div><div class="sc-kpi-label">Failed</div></div>
          <div class="sc-kpi"><div class="sc-kpi-val">${stats.lastPush ? new Date(stats.lastPush).toLocaleDateString() : '—'}</div><div class="sc-kpi-label">Last Push</div></div>
        </div>
        <div class="sc-push-status-row">
          <label class="sc-label">Default Status</label>
          <select id="scDefaultStatus" class="sc-select">
            <option value="active" ${defaultStatus === 'active' ? 'selected' : ''}>Active (Live immediately)</option>
            <option value="draft" ${defaultStatus === 'draft' ? 'selected' : ''}>Draft (Review first)</option>
          </select>
        </div>
        <div class="sc-hint">Use "Select Mode" then go to Search Results to pick products for bulk push.</div>
      </div>
    </div>`;
    }

    function renderHistoryPanel() {
      const history = getPushHistory();
      const recent = history.slice(0, 20);
      return `
    <div class="sc-panel">
      <div class="sc-panel-header">
        <h3 class="sc-panel-title">📋 Push History</h3>
        <button class="sc-btn sc-btn-sm sc-btn-danger" id="scClearHistory">Clear</button>
      </div>
      <div class="sc-panel-body">
        ${
          recent.length === 0
            ? '<div class="sc-empty">No products pushed yet. Go to Search Results and push your first product!</div>'
            : '<div class="sc-history-list">' +
              recent
                .map(
                  (h) => `
            <div class="sc-history-item sc-history-${h.status}">
              <div class="sc-history-status">${h.status === 'success' ? '✅' : '❌'}</div>
              <div class="sc-history-info">
                <div class="sc-history-title">${esc(h.productTitle || 'Unknown')}</div>
                <div class="sc-history-meta">${new Date(h.timestamp).toLocaleString()} · ${esc(h.platform || '')}</div>
                ${h.error && h.status === 'failed' ? '<div class="sc-history-error">' + esc(h.error) + '</div>' : ''}
              </div>
            </div>
          `
                )
                .join('') +
              '</div>'
        }
      </div>
    </div>`;
    }

    function render() {
      const el = UI.$('scContent');
      if (!el) return;
      el.innerHTML = `
    <div class="sc-hero">
      <div class="sc-hero-bg"></div>
      <div class="sc-hero-content">
        <div class="sc-hero-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Store Integration
        </div>
        <h1 class="sc-hero-title">Store Connect</h1>
        <p class="sc-hero-desc">Push winning products from HuntDrop to one or more connected stores.</p>
      </div>
    </div>
    <div class="sc-grid">
      ${renderConnectionPanel()}
      ${renderPushPanel()}
      ${renderHistoryPanel()}
    </div>
    <div class="sc-section">
      <div class="sc-section-header">
        <h2 class="sc-section-title">📖 How It Works</h2>
      </div>
      <div class="sc-steps">
        <div class="sc-step"><div class="sc-step-num">1</div><div class="sc-step-title">Connect a Platform</div><div class="sc-step-desc">Select Trendaryo, Shopify, WooCommerce, Amazon, or TikTok Shop and save the credentials.</div></div>
        <div class="sc-step"><div class="sc-step-num">2</div><div class="sc-step-title">Push Products</div><div class="sc-step-desc">Use the button on any product card or bulk select mode to push multiple listings.</div></div>
        <div class="sc-step"><div class="sc-step-num">3</div><div class="sc-step-title">Track Results</div><div class="sc-step-desc">See success and failure history inside Store Connect.</div></div>
        <div class="sc-step"><div class="sc-step-num">4</div><div class="sc-step-title">Manage Listings</div><div class="sc-step-desc">Use the connected store dashboard to review live listings and update as needed.</div></div>
      </div>
    </div>`;
    }

    function bindEvents() {
      if (!_section) return;

      UI.$('scPlatformSelect')?.addEventListener('change', function () {
        const selected = this.value;
        if (setPlatform(selected)) {
          render();
          bindEvents();
        }
      });

      UI.$('scSaveConnection')?.addEventListener('click', async function () {
        const platform = getCurrentPlatform();
        const platformDef = PLATFORMS[platform];
        const values = {};
        if (platformDef.fields) {
          platformDef.fields.forEach((field) => {
            const input = UI.$('scField-' + field.id);
            if (input) values[field.id] = input.value.trim();
          });
          const result = await saveConnection(platform, values);
          if (result && result.success) {
            UI.toast && UI.toast('Connection saved', 'success');
          } else {
            UI.toast && UI.toast('Connection saved locally', 'warning');
          }
          render();
          bindEvents();
        }
      });

      UI.$('scTestConnection')?.addEventListener('click', async function () {
        const btn = this;
        const resultEl = UI.$('scConnectionResult');
        btn.disabled = true;
        btn.textContent = 'Testing...';
        if (resultEl) resultEl.innerHTML = '';
        try {
          const result = await testConnection();
          if (result.success) {
            resultEl.innerHTML = '<div class="sc-test-success">✅ Connection validated.</div>';
          } else {
            resultEl.innerHTML = '<div class="sc-test-error">❌ ' + esc(result.error || 'Connection failed') + '</div>';
          }
        } catch (e) {
          if (resultEl)
            resultEl.innerHTML = '<div class="sc-test-error">❌ ' + esc(e.message || 'Test failed') + '</div>';
        }
        btn.disabled = false;
        btn.textContent = 'Test Connection';
      });

      UI.$('scDefaultStatus')?.addEventListener('change', function () {
        const status = this.value;
        HuntDrop.Config.set('storeConnect.defaultStatus', status);
      });

      UI.$('scSelectModeBtn')?.addEventListener('click', function () {
        _selectMode = !_selectMode;
        this.textContent = _selectMode ? '✓ Select Mode ON' : '☑ Select Mode';
        this.classList.toggle('sc-btn-active', _selectMode);
        _selectedProducts.clear();
        EventBus.emit('store:selectMode', { active: _selectMode });
        render();
        bindEvents();
      });

      UI.$('scClearHistory')?.addEventListener('click', function () {
        localStorage.removeItem(LS_HISTORY_KEY);
        render();
        UI.toast && UI.toast('Push history cleared', 'success');
      });
    }

    async function pushProducts(products, status) {
      const result = await callPushEndpoint(products, status);
      if (result && result.success) {
        updateHistory(products, result);
      }
      return result;
    }

    PluginRegistry.register('store-connect', {
      id: 'store-connect',
      name: 'Store Connect',
      version: '1.0.0',
      description: 'Connect and push products to Trendaryo, Shopify, WooCommerce, Amazon, and TikTok Shop.',

      init(_ctx) {
        Config.defaults('storeConnect', {
          defaultStatus: 'active',
          platform: getCurrentPlatform(),
        });
      },

      mount(_ctx) {
        const container = UI.$('sections-container');
        if (!container) return;

        const section = document.createElement('section');
        section.className = 'section section-store-connect';
        section.id = 'section-store-connect';
        section.innerHTML = `<div class="section-inner" id="scContent"></div>`;
        container.appendChild(section);
        _section = section;

        render();
        bindEvents();
        if (isBackendAvailable()) {
          loadRemoteStoreConnectState();
        }
      },

      unmount(_ctx) {
        const el = UI.$('section-store-connect');
        if (el) el.remove();
        _section = null;
        _selectMode = false;
        _selectedProducts.clear();
      },
    });

    window.HuntDrop.StoreConnect = {
      pushProduct: async function (product, status) {
        const s = status || Config.get('storeConnect.defaultStatus') || 'active';
        return await pushProducts([product], s);
      },
      pushProducts: async function (products, status) {
        const s = status || Config.get('storeConnect.defaultStatus') || 'active';
        return await pushProducts(products, s);
      },
      isSelectMode: function () {
        return _selectMode;
      },
      toggleProduct: function (id) {
        const key = String(id);
        if (_selectedProducts.has(key)) _selectedProducts.delete(key);
        else _selectedProducts.add(key);
        return _selectedProducts.size;
      },
      getSelectedProducts: function () {
        return Array.from(_selectedProducts);
      },
      clearSelection: function () {
        _selectedProducts.clear();
      },
      pushSelected: async function (allProducts, status) {
        const ids = Array.from(_selectedProducts);
        const products = allProducts.filter((p) => ids.includes(p.id) || ids.includes(String(p.id)));
        if (!products.length) return { success: false, error: 'No products selected' };
        const s = status || Config.get('storeConnect.defaultStatus') || 'active';
        const result = await pushProducts(products, s);
        _selectedProducts.clear();
        EventBus.emit('store:selectMode', { active: false });
        return result;
      },
      getStats: getStats,
      getHistory: getPushHistory,
      getPlatforms: function () {
        return Object.keys(PLATFORMS);
      },
      getCurrentPlatform: function () {
        return getCurrentPlatform();
      },
      setPlatform: function (platform) {
        return setPlatform(platform);
      },
      getConnectionConfig: function (platform) {
        return getConnectionConfig(platform);
      },
      updateConnectionConfig: function (platform, values) {
        updateConnectionConfig(platform, values);
      },
      saveConnection: async function (platform, values) {
        return await saveConnection(platform, values);
      },
      testConnection: async function (platform) {
        return await testConnection(platform);
      },
      isBackendAvailable: function () {
        return isBackendAvailable();
      },
      getBackendUrl: function () {
        return getStoreConnectUrl();
      },
    };
  } catch (e) {
    console.error('[StoreConnect] error:', e);
  }
})();
