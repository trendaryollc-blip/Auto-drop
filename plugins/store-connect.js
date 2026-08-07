// ============================================================================
// PLUGIN: Store Connect — Push hunted products to Trendaryo
// ============================================================================
(function () {
  try {
    const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;
    const esc = (s) => UI.escapeHtml(String(s || ''));

    let _section = null;
    let _cleanups = [];
    let _selectMode = false;
    const _selectedProducts = new Set();

    const TRENDARYO_API = 'https://trendaryo-llc-backend.vercel.app/api/products/ingest';
    const TRENDARYO_KEY = 'trnd_ingest_8f3a7b2c9d1e4f5a6b7c8d9e0f1a2b3c';
    const TRENDARYO_STORE = 'https://trendaryo.com';

    function getPushHistory() {
      try {
        return JSON.parse(localStorage.getItem('sc_push_history')) || [];
      } catch (e) {
        return [];
      }
    }
    function savePushHistory(h) {
      try {
        localStorage.setItem('sc_push_history', JSON.stringify(h.slice(0, 50)));
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
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []),
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
        rating: { average: Math.min(5, Math.round(((p.score || 0) / 20) * 10) / 10), count: p.reviews || 0 },
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

    async function pushProducts(products, status) {
      const mapped = products.map((p) => {
        const m = mapProductToTrendaryo(p);
        m.status = status || 'active';
        return m;
      });

      try {
        const resp = await fetch(TRENDARYO_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': TRENDARYO_KEY,
          },
          body: JSON.stringify({ products: mapped }),
        });
        const data = await resp.json();
        const history = getPushHistory();
        products.forEach((p, i) => {
          const result = data.results && data.results[i];
          history.unshift({
            productId: p.id,
            productTitle: p.title,
            timestamp: new Date().toISOString(),
            status: result && result.success ? 'success' : 'failed',
            error: result ? result.error : data.error || 'Unknown error',
            trendaryoStatus: status || 'active',
          });
        });
        savePushHistory(history);
        return data;
      } catch (e) {
        const history = getPushHistory();
        products.forEach((p) => {
          history.unshift({
            productId: p.id,
            productTitle: p.title,
            timestamp: new Date().toISOString(),
            status: 'failed',
            error: e.message || 'Network error',
            trendaryoStatus: status || 'active',
          });
        });
        savePushHistory(history);
        return { success: false, error: e.message };
      }
    }

    function renderConnectionPanel() {
      return `
    <div class="sc-panel">
      <div class="sc-panel-header">
        <h3 class="sc-panel-title">🔗 Trendaryo Connection</h3>
        <span class="sc-status-badge sc-status-connected">● Connected</span>
      </div>
      <div class="sc-panel-body">
        <div class="sc-info-row">
          <span class="sc-info-label">Store URL</span>
          <a href="${TRENDARYO_STORE}" target="_blank" class="sc-info-value sc-link">${TRENDARYO_STORE}</a>
        </div>
        <div class="sc-info-row">
          <span class="sc-info-label">API Endpoint</span>
          <span class="sc-info-value sc-mono">${esc(TRENDARYO_API)}</span>
        </div>
        <div class="sc-info-row">
          <span class="sc-info-label">API Key</span>
          <span class="sc-info-value sc-mono">trnd_ingest_****...****</span>
        </div>
        <button class="sc-btn sc-btn-outline" id="scTestBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Test Connection
        </button>
        <div id="scTestResult" class="sc-test-result"></div>
      </div>
    </div>`;
    }

    function renderPushPanel() {
      const stats = getStats();
      return `
    <div class="sc-panel">
      <div class="sc-panel-header">
        <h3 class="sc-panel-title">🚀 Push Products</h3>
        <button class="sc-btn sc-btn-sm" id="scSelectModeBtn">
          ${_selectMode ? '✓ Select Mode ON' : '☑ Select Mode'}
        </button>
      </div>
      <div class="sc-panel-body">
        <div class="sc-kpi-row">
          <div class="sc-kpi"><div class="sc-kpi-val">${stats.total}</div><div class="sc-kpi-label">Total Pushed</div></div>
          <div class="sc-kpi"><div class="sc-kpi-val" style="color:var(--accent-green)">${stats.success}</div><div class="sc-kpi-label">Succeeded</div></div>
          <div class="sc-kpi"><div class="sc-kpi-val" style="color:var(--accent-red)">${stats.failed}</div><div class="sc-kpi-label">Failed</div></div>
          <div class="sc-kpi"><div class="sc-kpi-val">${stats.lastPush ? new Date(stats.lastPush).toLocaleDateString() : '—'}</div><div class="sc-kpi-label">Last Push</div></div>
        </div>
        <div class="sc-push-status-row">
          <label class="sc-label">Default Status</label>
          <select id="scDefaultStatus" class="sc-select">
            <option value="active">Active (Live immediately)</option>
            <option value="draft">Draft (Review first)</option>
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
                <div class="sc-history-meta">${new Date(h.timestamp).toLocaleString()} · ${h.trendaryoStatus || 'active'}</div>
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
        <p class="sc-hero-desc">Push winning products from HuntDrop directly to your Trendaryo store. Hunt, analyze, and list — all in one flow.</p>
        <div class="sc-hero-kpis">
          <a href="${TRENDARYO_STORE}" target="_blank" class="sc-hkpi sc-hkpi-link">
            <div class="sc-hkpi-val">🛍️</div>
            <div class="sc-hkpi-label">View Trendaryo Store</div>
          </a>
          <div class="sc-hkpi">
            <div class="sc-hkpi-val" style="color:var(--accent-green)">●</div>
            <div class="sc-hkpi-label">Connected</div>
          </div>
        </div>
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
        <div class="sc-step"><div class="sc-step-num">1</div><div class="sc-step-title">Hunt Products</div><div class="sc-step-desc">Search across 10 platforms. Find winning products with high scores and margins.</div></div>
        <div class="sc-step"><div class="sc-step-num">2</div><div class="sc-step-title">Push to Store</div><div class="sc-step-desc">Click "Push to Trendaryo" on any product card, or use Select Mode for bulk push.</div></div>
        <div class="sc-step"><div class="sc-step-num">3</div><div class="sc-step-title">Go Live</div><div class="sc-step-desc">Products appear on trendaryo.com instantly (or as drafts). Customers can buy immediately.</div></div>
        <div class="sc-step"><div class="sc-step-num">4</div><div class="sc-step-title">Fulfill Orders</div><div class="sc-step-desc">Orders come in on Trendaryo. You order from suppliers and ship directly to customers.</div></div>
      </div>
    </div>`;
    }

    function bindEvents() {
      if (!_section) return;

      UI.$('scTestBtn')?.addEventListener('click', async function () {
        const btn = this;
        const resultEl = UI.$('scTestResult');
        btn.disabled = true;
        btn.textContent = 'Testing...';
        if (resultEl) resultEl.innerHTML = '';
        try {
          const resp = await fetch(TRENDARYO_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': TRENDARYO_KEY },
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
          if (resultEl) {
            if (data.success) {
              resultEl.innerHTML = '<div class="sc-test-success">✅ Connection successful! API is responding.</div>';
            } else {
              resultEl.innerHTML =
                '<div class="sc-test-error">❌ API returned: ' + esc(JSON.stringify(data.error || data)) + '</div>';
            }
          }
        } catch (e) {
          if (resultEl)
            resultEl.innerHTML = '<div class="sc-test-error">❌ Network error: ' + esc(e.message) + '</div>';
        }
        btn.disabled = false;
        btn.textContent = 'Test Connection';
      });

      UI.$('scSelectModeBtn')?.addEventListener('click', function () {
        _selectMode = !_selectMode;
        this.textContent = _selectMode ? '✓ Select Mode ON' : '☑ Select Mode';
        this.classList.toggle('sc-btn-active', _selectMode);
        _selectedProducts.clear();
        EventBus.emit('store:selectMode', { active: _selectMode });
        render();
      });

      UI.$('scClearHistory')?.addEventListener('click', function () {
        localStorage.removeItem('sc_push_history');
        render();
        UI.toast && UI.toast('Push history cleared', 'success');
      });

      _section.addEventListener('click', function (e) {
        const card = e.target.closest('[data-section]');
        if (!card) return;
        if (e.target.closest('button, a, select, input')) return;
        e.preventDefault();
        const target = card.getAttribute('data-section');
        if (target && window.HuntDrop && window.HuntDrop.navigateTo) {
          window.HuntDrop.navigateTo(target);
        }
      });
    }

    PluginRegistry.register('store-connect', {
      id: 'store-connect',
      name: 'Store Connect',
      version: '1.0.0',
      description: 'Push hunted products to Trendaryo store — hunt, push, sell',

      init(_ctx) {
        Config.defaults('storeConnect', { defaultStatus: 'active' });
      },

      mount(_ctx) {
        const container = UI.$('sections-container');
        if (!container) return;

        const section = document.createElement('section');
        section.className = 'section section-store-connect';
        section.id = 'section-store-connect';
        section.innerHTML = `
      <div class="section-inner" id="scContent"></div>`;
        container.appendChild(section);
        _section = section;

        render();
        bindEvents();
      },

      unmount(_ctx) {
        (_cleanups || []).forEach((fn) => {
          try {
            fn();
          } catch (e) {}
        });
        _cleanups = [];
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
        if (_selectedProducts.has(id)) _selectedProducts.delete(id);
        else _selectedProducts.add(id);
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
    };
  } catch (e) {
    console.error('[StoreConnect] error:', e);
  }
})();
