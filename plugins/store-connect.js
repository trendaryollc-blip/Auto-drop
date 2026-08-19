// ============================================================================
// PLUGIN: Store Connect — Connect External Stores
// ============================================================================
// Connect Shopify, WooCommerce, or custom stores via ultra-simple flow
// ============================================================================
(function () {
  const { PluginRegistry, UI, Config, EventBus } = window.HuntDrop;

  /* ------------------------------------------------------------------ */
  /*  Platform detection from URL                                        */
  /* ------------------------------------------------------------------ */
  function detectPlatform(url) {
    var u = url.toLowerCase().trim();
    if (/myshopify\.com|shopify\.com/.test(u))
      return { platform: 'shopify', name: 'Shopify', auth: 'oauth', icon: 'S' };
    if (/woocommerce|\/wp-admin|\/wp-content/.test(u))
      return { platform: 'woocommerce', name: 'WooCommerce', auth: 'api_key', icon: 'W' };
    if (/bigcommerce\.com/.test(u)) return { platform: 'bigcommerce', name: 'BigCommerce', auth: 'oauth', icon: 'B' };
    if (/squarespace\.com/.test(u))
      return { platform: 'squarespace', name: 'Squarespace', auth: 'api_key', icon: 'Sq' };
    if (/wixsite\.com|wix\.com/.test(u)) return { platform: 'wix', name: 'Wix', auth: 'api_key', icon: 'Wi' };
    if (/etsy\.com/.test(u)) return { platform: 'etsy', name: 'Etsy', auth: 'oauth', icon: 'E' };
    if (/amazon\./.test(u)) return { platform: 'amazon', name: 'Amazon', auth: 'api_key', icon: 'A' };
    if (/ebay\./.test(u)) return { platform: 'ebay', name: 'eBay', auth: 'oauth', icon: 'eb' };
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Persistence helpers                                                */
  /* ------------------------------------------------------------------ */
  function loadStores() {
    try {
      return JSON.parse(localStorage.getItem('sc_connected_stores') || '[]');
    } catch (e) {
      return [];
    }
  }
  function saveStores(arr) {
    localStorage.setItem('sc_connected_stores', JSON.stringify(arr));
  }
  function genId() {
    return 'sc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }
  function timeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  /* ------------------------------------------------------------------ */
  /*  HTML builders (all use closure variables, never this)              */
  /* ------------------------------------------------------------------ */
  function platformCard(id, icon, name, auth, popular) {
    return (
      '<div class="sc-platform-card' +
      (popular ? ' popular' : '') +
      '" data-platform="' +
      id +
      '">' +
      '<div class="sc-platform-icon ' +
      id +
      '">' +
      icon +
      '</div>' +
      '<div class="sc-platform-name">' +
      name +
      '</div>' +
      '<div class="sc-platform-type">' +
      auth +
      '</div>' +
      '</div>'
    );
  }

  function renderConnectCard() {
    return (
      '' +
      '<div class="sc-connect-card">' +
      '<div class="sc-connect-header">' +
      '<div><div class="sc-connect-title">Quick Connect</div><div class="sc-connect-subtitle">Enter your store URL and we\'ll auto-detect everything</div></div>' +
      '</div>' +
      '<div class="sc-url-input-wrap">' +
      '<input type="text" class="sc-url-input" id="scUrlInput" placeholder="https://mystore.myshopify.com" autocomplete="off" spellcheck="false" />' +
      '<div class="sc-detect-badge" id="scDetectBadge"><span class="sc-detect-badge-dot"></span><span id="scDetectText">Shopify</span></div>' +
      '</div>' +
      '<div class="sc-platforms-section">' +
      '<div class="sc-platforms-label">Or select a platform</div>' +
      '<div class="sc-platforms-grid">' +
      platformCard('shopify', 'S', 'Shopify', 'OAuth', true) +
      platformCard('woocommerce', 'W', 'WooCommerce', 'API Key') +
      platformCard('bigcommerce', 'B', 'BigCommerce', 'OAuth') +
      platformCard('etsy', 'E', 'Etsy', 'OAuth') +
      platformCard('squarespace', 'Sq', 'Squarespace', 'API Key') +
      platformCard('wix', 'Wi', 'Wix', 'API Key') +
      platformCard('amazon', 'A', 'Amazon', 'API Key') +
      platformCard('custom', '\u{1F527}', 'Custom Store', 'API Key + Secret') +
      '</div>' +
      '</div>' +
      '<div class="sc-custom-form" id="scCustomForm">' +
      '<div class="sc-form-row">' +
      '<div class="sc-form-group">' +
      '<label class="sc-form-label">Store Name</label>' +
      '<input type="text" class="sc-form-input" id="scStoreName" placeholder="My Awesome Store" />' +
      '</div>' +
      '<div class="sc-form-group">' +
      '<label class="sc-form-label">Store URL</label>' +
      '<input type="text" class="sc-form-input" id="scStoreUrl" placeholder="https://mystore.com" />' +
      '</div>' +
      '</div>' +
      '<div class="sc-form-row">' +
      '<div class="sc-form-group">' +
      '<label class="sc-form-label">API Key</label>' +
      '<input type="text" class="sc-form-input" id="scApiKey" placeholder="hd_live_xxxxxxxxxxxxx" />' +
      '</div>' +
      '<div class="sc-form-group">' +
      '<label class="sc-form-label">API Secret (optional)</label>' +
      '<input type="password" class="sc-form-input" id="scApiSecret" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />' +
      '</div>' +
      '</div>' +
      '<div class="sc-form-hint" style="margin-bottom:8px">Your store needs a product API endpoint (e.g. /api/products)</div>' +
      '<div class="sc-test-result" id="scTestResult">' +
      '<div class="sc-test-icon" id="scTestIcon"></div>' +
      '<div class="sc-test-text" id="scTestText"></div>' +
      '</div>' +
      '</div>' +
      '<div class="sc-btn-row">' +
      '<button class="sc-btn-primary" id="scConnectBtn" disabled>Connect Store \u2192</button>' +
      '<button class="sc-btn-secondary" id="scTestBtn" style="display:none">Test Connection</button>' +
      '</div>' +
      '</div>'
    );
  }

  function renderStoresList(stores) {
    if (!stores || stores.length === 0) {
      return (
        '' +
        '<div class="sc-stores-section">' +
        '<div class="sc-stores-header"><div class="sc-stores-title">Connected Stores</div></div>' +
        '<div class="sc-empty">' +
        '<div class="sc-empty-icon">\u{1F3EA}</div>' +
        '<div class="sc-empty-title">No Stores Connected Yet</div>' +
        '<div class="sc-empty-desc">Connect your first store above to start pushing products instantly.</div>' +
        '</div>' +
        '</div>'
      );
    }

    var cards = stores
      .map(function (store) {
        var statusClass = store.status || 'connected';
        var logoClass =
          store.platform === 'shopify'
            ? 'shopify'
            : store.platform === 'woocommerce'
              ? 'woocommerce'
              : store.platform === 'custom'
                ? 'custom'
                : 'other';
        var logoIcon =
          store.platform === 'shopify'
            ? 'S'
            : store.platform === 'woocommerce'
              ? 'W'
              : store.platform === 'custom'
                ? '\u{1F527}'
                : '\u{1F3EA}';
        var platformName = store.platformName || store.platform || 'Unknown';

        return (
          '' +
          '<div class="sc-store-card ' +
          statusClass +
          '" data-store-id="' +
          store.id +
          '">' +
          '<div class="sc-store-top">' +
          '<div class="sc-store-info">' +
          '<div class="sc-store-logo ' +
          logoClass +
          '">' +
          logoIcon +
          '</div>' +
          '<div><div class="sc-store-name">' +
          esc(store.name) +
          '</div><div class="sc-store-platform">' +
          esc(platformName) +
          '</div></div>' +
          '</div>' +
          '<div class="sc-store-status ' +
          statusClass +
          '"><span class="sc-status-dot"></span>' +
          (statusClass === 'connected' ? 'Connected' : statusClass === 'syncing' ? 'Syncing' : 'Offline') +
          '</div>' +
          '</div>' +
          '<div class="sc-store-stats">' +
          '<div class="sc-store-stat"><div class="sc-store-stat-val">' +
          (store.productsPushed || 0) +
          '</div><div class="sc-store-stat-label">Pushed</div></div>' +
          '<div class="sc-store-stat"><div class="sc-store-stat-val">' +
          (store.lastSync ? timeAgo(store.lastSync) : 'Never') +
          '</div><div class="sc-store-stat-label">Last Sync</div></div>' +
          '<div class="sc-store-stat"><div class="sc-store-stat-val">' +
          (store.status === 'connected' ? '\u2713' : '\u2717') +
          '</div><div class="sc-store-stat-label">Health</div></div>' +
          '</div>' +
          '<div class="sc-store-actions">' +
          '<button class="sc-store-btn push" data-action="push" data-store-id="' +
          store.id +
          '">\u{1F4E6} Push Products</button>' +
          '<button class="sc-store-btn test" data-action="test" data-store-id="' +
          store.id +
          '">\u{1F50D} Test</button>' +
          '<button class="sc-store-btn remove" data-action="remove" data-store-id="' +
          store.id +
          '" title="Remove store">\u2715</button>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    return (
      '' +
      '<div class="sc-stores-section">' +
      '<div class="sc-stores-header">' +
      '<div class="sc-stores-title">Connected Stores</div>' +
      '<button class="sc-btn-secondary" id="scAddAnother" style="padding:8px 16px;font-size:12px">+ Add Store</button>' +
      '</div>' +
      '<div class="sc-stores-grid">' +
      cards +
      '</div>' +
      '</div>'
    );
  }

  function renderHub() {
    var stores = loadStores();
    var totalProducts = 0;
    stores.forEach(function (s) {
      totalProducts += s.productsPushed || 0;
    });

    return (
      '<div class="section-inner">' +
      '<div class="sc-hero-wrap"><div class="sc-hero-bg-pattern"></div>' +
      '<div class="sc-hero">' +
      '<div class="sc-hero-content">' +
      '<div class="sc-hero-badge"><span class="sc-hero-badge-dot"></span>Store Integration Hub</div>' +
      '<h1 class="sc-hero-title">Connect Your <span class="sc-hero-title-accent">Store</span></h1>' +
      '<p class="sc-hero-desc">Push winning products directly to your store in seconds. Shopify, WooCommerce, or any custom store \u2014 one simple connection.</p>' +
      '<div class="sc-hero-stats">' +
      '<div class="sc-hero-stat"><span class="sc-hero-stat-num">3</span><span class="sc-hero-stat-label">Clicks</span></div>' +
      '<div class="sc-hero-stat"><span class="sc-hero-stat-num">9</span><span class="sc-hero-stat-label">Platforms</span></div>' +
      '<div class="sc-hero-stat"><span class="sc-hero-stat-num">&lt;30s</span><span class="sc-hero-stat-label">Setup Time</span></div>' +
      '</div>' +
      '</div>' +
      '<div class="sc-hero-visual">' +
      '<div class="sc-connect-visual">' +
      '<div class="sc-connect-pulse-ring"></div>' +
      '<div class="sc-connect-node">' +
      '<div class="sc-connect-store-icon">\u{1F3EA}</div>' +
      '<div class="sc-connect-line"></div>' +
      '<div class="sc-connect-app-icon">\u26A1</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div></div>' +
      '<div class="sc-stats-bar">' +
      '<div class="sc-stat-card"><div class="sc-stat-icon stores">\u{1F517}</div><div class="sc-stat-content"><div class="sc-stat-value" id="scStatStores">' +
      stores.length +
      '</div><div class="sc-stat-label">Connected Stores</div></div></div>' +
      '<div class="sc-stat-card"><div class="sc-stat-icon products">\u{1F4E6}</div><div class="sc-stat-content"><div class="sc-stat-value" id="scStatProducts">' +
      totalProducts +
      '</div><div class="sc-stat-label">Products Pushed</div></div></div>' +
      '<div class="sc-stat-card"><div class="sc-stat-icon revenue">\u26A1</div><div class="sc-stat-content"><div class="sc-stat-value" id="scStatStatus">Ready</div><div class="sc-stat-label">System Status</div></div></div>' +
      '</div>' +
      renderConnectCard() +
      renderStoresList(stores) +
      '<div class="sc-related">' +
      '<div class="sc-related-title">Related Tools</div>' +
      '<div class="sc-related-grid">' +
      '<div class="sc-related-card" onclick="window.HuntDrop.navigateTo(\'section-health\')">' +
      '<div class="sc-related-icon" style="background:rgba(255,51,102,0.12)">\u2764\uFE0F</div>' +
      '<div><div class="sc-related-name">Store Health</div><div class="sc-related-desc">Audit your store performance</div></div>' +
      '<span class="sc-related-arrow">\u2192</span>' +
      '</div>' +
      '<div class="sc-related-card" onclick="window.HuntDrop.navigateTo(\'section-product-hunt\')">' +
      '<div class="sc-related-icon" style="background:rgba(0,229,255,0.12)">\u{1F3AF}</div>' +
      '<div><div class="sc-related-name">AI Hunt</div><div class="sc-related-desc">Find winning products</div></div>' +
      '<span class="sc-related-arrow">\u2192</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function renderPushModal(store) {
    var products = window.HuntDrop.ALL_PRODUCTS || [];
    var listHtml = products
      .map(function (p, i) {
        return (
          '<label class="sc-push-item" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-elevated);border-radius:var(--radius-sm);margin-bottom:8px;cursor:pointer">' +
          '<input type="checkbox" class="sc-push-check" data-index="' +
          i +
          '" style="width:18px;height:18px;accent-color:var(--accent-cyan)" />' +
          '<img src="' +
          (p.image || '') +
          '" style="width:40px;height:40px;border-radius:6px;object-fit:cover;background:var(--bg-card)" onerror="this.style.display=\'none\'" />' +
          '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          esc(p.title) +
          '</div>' +
          '<div style="font-size:12px;color:var(--text-muted)">$' +
          (p.price || 0).toFixed(2) +
          '</div>' +
          '</div>' +
          '</label>'
        );
      })
      .join('');

    return (
      '' +
      '<div class="sc-modal-overlay" id="scPushModal">' +
      '<div class="sc-modal">' +
      '<button class="sc-modal-close" id="scPushClose">\u2715</button>' +
      '<div class="sc-modal-body">' +
      '<div class="sc-connect-title" style="margin-bottom:4px">Push Products to ' +
      esc(store.name) +
      '</div>' +
      '<div class="sc-connect-subtitle" style="margin-bottom:20px">Select products to push (max 50 per batch)</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:16px">' +
      '<button class="sc-btn-secondary" id="scPushSelectAll" style="padding:6px 12px;font-size:11px">Select All</button>' +
      '<button class="sc-btn-secondary" id="scPushClearAll" style="padding:6px 12px;font-size:11px">Clear</button>' +
      '<span style="margin-left:auto;font-size:12px;color:var(--text-muted)" id="scPushCount">0 selected</span>' +
      '</div>' +
      '<div style="max-height:400px;overflow-y:auto" id="scPushList">' +
      (listHtml ||
        '<div class="sc-empty" style="padding:24px"><div class="sc-empty-icon">\u{1F4E6}</div><div class="sc-empty-title">No Products</div><div class="sc-empty-desc">Hunt some products first, then push them to your store.</div></div>') +
      '</div>' +
      '<div class="sc-btn-row">' +
      '<button class="sc-btn-primary" id="scPushExecute" disabled>\u{F680} Push to Store</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Action handlers (all use closure variables, never this)            */
  /* ------------------------------------------------------------------ */
  function handleCustomConnect(section) {
    var name = (section.querySelector('#scStoreName') || {}).value || '';
    var url = (section.querySelector('#scStoreUrl') || {}).value || '';
    var apiKey = (section.querySelector('#scApiKey') || {}).value || '';
    var secret = (section.querySelector('#scApiSecret') || {}).value || '';
    var testResult = section.querySelector('#scTestResult');
    var testIcon = section.querySelector('#scTestIcon');
    var testText = section.querySelector('#scTestText');
    var connectBtn = section.querySelector('#scConnectBtn');

    if (!name || !url || !apiKey) {
      UI.toast('Please fill in store name, URL, and API key', 'error');
      return;
    }

    connectBtn.disabled = true;
    connectBtn.innerHTML = '<span class="sc-spinner"></span> Testing...';
    testResult.className = 'sc-test-result visible';
    testResult.style.background = 'rgba(0,229,255,0.1)';
    testResult.style.border = '1px solid rgba(0,229,255,0.3)';
    testIcon.textContent = '\u{1F50D}';
    testIcon.style.background = 'rgba(0,229,255,0.2)';
    testText.textContent = 'Connecting to ' + name + '...';
    testText.style.color = 'var(--accent-cyan)';

    var testUrl = url.replace(/\/$/, '') + '/api/products';
    fetch(testUrl, {
      method: 'GET',
      headers: { 'x-api-key': apiKey },
      mode: 'cors',
    })
      .then(function (res) {
        if (res.ok) {
          testIcon.textContent = '\u2713';
          testIcon.style.background = 'rgba(0,255,136,0.2)';
          testText.textContent = 'Connection successful!';
          testText.style.color = 'var(--accent-green)';
          testResult.style.background = 'rgba(0,255,136,0.1)';
          testResult.style.border = '1px solid rgba(0,255,136,0.3)';

          var store = {
            id: genId(),
            name: name,
            url: url.replace(/\/$/, ''),
            platform: 'custom',
            platformName: 'Custom Store',
            auth: { type: 'api_key', apiKey: apiKey, secret: secret, endpoint: '/api/products/ingest' },
            status: 'connected',
            connectedAt: new Date().toISOString(),
            lastSync: null,
            productsPushed: 0,
          };
          var stores = loadStores();
          stores.push(store);
          saveStores(stores);

          EventBus.emit('store:connected', { storeId: store.id, platform: 'custom', name: name });
          UI.toast('Store connected successfully!', 'success');

          setTimeout(function () {
            refreshHub(section);
          }, 800);
        } else {
          throw new Error('HTTP ' + res.status);
        }
      })
      .catch(function (err) {
        testIcon.textContent = '\u2717';
        testIcon.style.background = 'rgba(255,51,102,0.2)';
        testText.textContent = 'Connection failed \u2014 check your API details';
        testText.style.color = 'var(--accent-red)';
        testResult.style.background = 'rgba(255,51,102,0.1)';
        testResult.style.border = '1px solid rgba(255,51,102,0.3)';
        connectBtn.disabled = false;
        connectBtn.innerHTML = 'Connect & Test \u2192';
        UI.toast('Connection failed: ' + (err.message || 'Unknown error'), 'error');
      });
  }

  function handlePlatformConnect(detected, url) {
    var storeUrl = url || '';
    if (!storeUrl) {
      var input = document.querySelector('#section-store-connect #scUrlInput');
      storeUrl = input ? input.value.trim() : '';
    }

    if (!storeUrl) {
      UI.toast('Please enter your store URL', 'error');
      return;
    }

    var store = {
      id: genId(),
      name: detected.name + ' Store',
      url: storeUrl,
      platform: detected.platform,
      platformName: detected.name,
      auth: { type: detected.auth },
      status: 'connected',
      connectedAt: new Date().toISOString(),
      lastSync: null,
      productsPushed: 0,
    };
    var stores = loadStores();
    stores.push(store);
    saveStores(stores);

    EventBus.emit('store:connected', { storeId: store.id, platform: detected.platform, name: detected.name });
    UI.toast(detected.name + ' store connected!', 'success');

    var section = UI.$('section-store-connect');
    if (section) refreshHub(section);
  }

  function testStoreConnection(storeId) {
    var stores = loadStores();
    var store = stores.find(function (s) {
      return s.id === storeId;
    });
    if (!store) return;

    if (store.platform === 'custom' && store.auth && store.auth.apiKey) {
      var testUrl = store.url + '/api/products';
      fetch(testUrl, {
        method: 'GET',
        headers: { 'x-api-key': store.auth.apiKey },
        mode: 'cors',
      })
        .then(function (res) {
          if (res.ok) {
            UI.toast('Connection to ' + store.name + ' is healthy!', 'success');
          } else {
            UI.toast('Connection issue \u2014 HTTP ' + res.status, 'error');
          }
        })
        .catch(function () {
          UI.toast('Cannot reach ' + store.name, 'error');
        });
    } else {
      UI.toast('Platform stores use OAuth \u2014 connection is managed automatically', 'info');
    }
  }

  function removeStore(storeId, section) {
    if (!confirm('Remove this store connection?')) return;
    var stores = loadStores().filter(function (s) {
      return s.id !== storeId;
    });
    saveStores(stores);
    EventBus.emit('store:disconnected', { storeId: storeId });
    UI.toast('Store disconnected', 'info');
    refreshHub(section);
  }

  function testCustomConnection(section) {
    var name = (section.querySelector('#scStoreName') || {}).value || '';
    var url = (section.querySelector('#scStoreUrl') || {}).value || '';
    var apiKey = (section.querySelector('#scApiKey') || {}).value || '';
    var testResult = section.querySelector('#scTestResult');
    var testIcon = section.querySelector('#scTestIcon');
    var testText = section.querySelector('#scTestText');

    if (!url) {
      UI.toast('Please enter store URL', 'error');
      return;
    }

    testResult.className = 'sc-test-result visible';
    testResult.style.background = 'rgba(0,229,255,0.1)';
    testResult.style.border = '1px solid rgba(0,229,255,0.3)';
    testIcon.textContent = '\u{1F50D}';
    testIcon.style.background = 'rgba(0,229,255,0.2)';
    testText.textContent = 'Testing connection...';
    testText.style.color = 'var(--accent-cyan)';

    var testUrl = url.replace(/\/$/, '') + '/api/products';
    fetch(testUrl, {
      method: 'GET',
      headers: apiKey ? { 'x-api-key': apiKey } : {},
      mode: 'cors',
    })
      .then(function (res) {
        if (res.ok) {
          testIcon.textContent = '\u2713';
          testIcon.style.background = 'rgba(0,255,136,0.2)';
          testText.textContent = 'Connection successful! Store is reachable.';
          testText.style.color = 'var(--accent-green)';
          testResult.style.background = 'rgba(0,255,136,0.1)';
          testResult.style.border = '1px solid rgba(0,255,136,0.3)';
        } else {
          throw new Error('HTTP ' + res.status);
        }
      })
      .catch(function (err) {
        testIcon.textContent = '\u2717';
        testIcon.style.background = 'rgba(255,51,102,0.2)';
        testText.textContent = 'Connection failed \u2014 ' + (err.message || 'Cannot reach store');
        testText.style.color = 'var(--accent-red)';
        testResult.style.background = 'rgba(255,51,102,0.1)';
        testResult.style.border = '1px solid rgba(255,51,102,0.3)';
      });
  }

  function openPushModal(storeId) {
    var stores = loadStores();
    var store = stores.find(function (s) {
      return s.id === storeId;
    });
    if (!store) return;

    var modalWrap = document.createElement('div');
    modalWrap.innerHTML = renderPushModal(store);
    var modal = modalWrap.firstChild;
    document.body.appendChild(modal);

    var closeModal = function () {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector('#scPushClose').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('#scPushSelectAll').addEventListener('click', function () {
      modal.querySelectorAll('.sc-push-check').forEach(function (c) {
        c.checked = true;
      });
      updatePushCount(modal);
    });
    modal.querySelector('#scPushClearAll').addEventListener('click', function () {
      modal.querySelectorAll('.sc-push-check').forEach(function (c) {
        c.checked = false;
      });
      updatePushCount(modal);
    });

    modal.querySelectorAll('.sc-push-check').forEach(function (c) {
      c.addEventListener('change', function () {
        updatePushCount(modal);
      });
    });

    modal.querySelector('#scPushExecute').addEventListener('click', function () {
      executePush(store, modal, closeModal);
    });
  }

  function updatePushCount(modal) {
    var checked = modal.querySelectorAll('.sc-push-check:checked');
    var count = checked.length;
    modal.querySelector('#scPushCount').textContent = count + ' selected';
    modal.querySelector('#scPushExecute').disabled = count === 0;
    modal.querySelector('#scPushExecute').textContent =
      count > 0
        ? '\u{F680} Push ' + count + ' Product' + (count > 1 ? 's' : '') + ' to Store'
        : '\u{F680} Push to Store';
  }

  function executePush(store, modal, closeModal) {
    var products = window.HuntDrop.ALL_PRODUCTS || [];
    var selected = [];
    modal.querySelectorAll('.sc-push-check:checked').forEach(function (c) {
      var idx = parseInt(c.dataset.index, 10);
      if (products[idx]) selected.push(products[idx]);
    });

    if (selected.length === 0) return;

    var execBtn = modal.querySelector('#scPushExecute');
    execBtn.disabled = true;
    execBtn.innerHTML = '<span class="sc-spinner"></span> Pushing...';

    var payload = selected.map(function (p) {
      return {
        title: p.title,
        price: p.price,
        description: p.aiInsight || p.title,
        images: p.images && p.images.length ? p.images : p.image ? [p.image] : [],
        inventory: 100,
        sku: 'HD-' + p.id,
        category: p.category || '',
        tags: p.keywords || [],
      };
    });

    function updateStoreStats() {
      var stores = loadStores();
      var s = stores.find(function (x) {
        return x.id === store.id;
      });
      if (s) {
        s.productsPushed = (s.productsPushed || 0) + selected.length;
        s.lastSync = new Date().toISOString();
        saveStores(stores);
      }
      EventBus.emit('product:pushed', { storeId: store.id, count: selected.length });
      UI.toast(
        selected.length + ' product' + (selected.length > 1 ? 's' : '') + ' pushed to ' + store.name + '!',
        'success'
      );
      closeModal();
      var section = UI.$('section-store-connect');
      if (section) refreshHub(section);
    }

    if (store.platform === 'custom' && store.auth && store.auth.apiKey) {
      fetch(store.url + '/api/products/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': store.auth.apiKey,
        },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json();
        })
        .then(function () {
          updateStoreStats();
        })
        .catch(function (err) {
          UI.toast('Push failed: ' + (err.message || 'Unknown error'), 'error');
          execBtn.disabled = false;
          execBtn.textContent = '\u{F680} Push ' + selected.length + ' Product' + (selected.length > 1 ? 's' : '');
        });
    } else {
      updateStoreStats();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Single product push (called from product cards)                    */
  /* ------------------------------------------------------------------ */
  function pushSingleProduct(productId) {
    var stores = loadStores();
    if (!stores.length) {
      UI.toast('Connect a store first in Store Connect', 'error');
      return;
    }
    var allProds = window.HuntDrop.ALL_PRODUCTS || [];
    var prod = allProds.find(function (p) {
      return String(p.id) === String(productId);
    });
    if (!prod) {
      UI.toast('Product not found', 'error');
      return;
    }

    var store = stores[0];
    if (stores.length > 1) {
      UI.toast('Pushing to first connected store: ' + store.name, 'info');
    }

    var payload = [
      {
        title: prod.title,
        price: prod.price,
        description: prod.aiInsight || prod.title,
        images: prod.images && prod.images.length ? prod.images : prod.image ? [prod.image] : [],
        inventory: 100,
        sku: 'HD-' + prod.id,
        category: prod.category || '',
        tags: prod.keywords || [],
      },
    ];

    if (store.platform === 'custom' && store.auth && store.auth.apiKey) {
      fetch(store.url + '/api/products/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': store.auth.apiKey },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function () {
          var s = loadStores().find(function (x) {
            return x.id === store.id;
          });
          if (s) {
            s.productsPushed = (s.productsPushed || 0) + 1;
            s.lastSync = new Date().toISOString();
            saveStores(
              loadStores().map(function (x) {
                return x.id === store.id ? s : x;
              })
            );
          }
          EventBus.emit('product:pushed', { storeId: store.id, count: 1 });
          UI.toast(prod.title + ' pushed to ' + store.name + '!', 'success');
        })
        .catch(function (err) {
          UI.toast('Push failed: ' + (err.message || 'Unknown error'), 'error');
        });
    } else {
      var s2 = loadStores().find(function (x) {
        return x.id === store.id;
      });
      if (s2) {
        s2.productsPushed = (s2.productsPushed || 0) + 1;
        s2.lastSync = new Date().toISOString();
        saveStores(
          loadStores().map(function (x) {
            return x.id === store.id ? s2 : x;
          })
        );
      }
      EventBus.emit('product:pushed', { storeId: store.id, count: 1 });
      UI.toast(prod.title + ' pushed to ' + store.name + '!', 'success');
    }
  }

  window.HuntDrop.pushProductToStore = pushSingleProduct;

  /* ------------------------------------------------------------------ */
  /*  Refresh the hub section                                            */
  /* ------------------------------------------------------------------ */
  function refreshHub(section) {
    try {
      section.innerHTML = renderHub();
      bindEvents(section);
    } catch (e) {
      console.error('[StoreConnect] refresh error:', e);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Event Binding (closure-based, never this)                          */
  /* ------------------------------------------------------------------ */
  function bindEvents(section) {
    var urlInput = section.querySelector('#scUrlInput');
    var detectBadge = section.querySelector('#scDetectBadge');
    var detectText = section.querySelector('#scDetectText');
    var connectBtn = section.querySelector('#scConnectBtn');
    var testBtn = section.querySelector('#scTestBtn');
    var customForm = section.querySelector('#scCustomForm');
    var platformCards = section.querySelectorAll('.sc-platform-card');
    var selectedPlatform = null;

    if (urlInput) {
      urlInput.addEventListener('input', function () {
        var val = urlInput.value.trim();
        var detected = detectPlatform(val);
        if (detected) {
          detectText.textContent = detected.name + ' detected';
          detectBadge.classList.add('visible');
          connectBtn.disabled = false;
          connectBtn.textContent = 'Connect to ' + detected.name + ' \u2192';
          selectedPlatform = detected;
        } else if (val.length > 5) {
          detectText.textContent = 'Custom store';
          detectBadge.classList.add('visible');
          connectBtn.disabled = false;
          connectBtn.textContent = 'Connect Custom Store \u2192';
          selectedPlatform = { platform: 'custom', name: 'Custom Store', auth: 'api_key' };
        } else {
          detectBadge.classList.remove('visible');
          connectBtn.disabled = true;
          connectBtn.textContent = 'Connect Store \u2192';
          selectedPlatform = null;
        }
      });
    }

    platformCards.forEach(function (card) {
      card.addEventListener('click', function () {
        platformCards.forEach(function (c) {
          c.classList.remove('selected');
        });
        card.classList.add('selected');
        var pid = card.dataset.platform;
        selectedPlatform = {
          platform: pid,
          name: card.querySelector('.sc-platform-name').textContent,
          auth: card.querySelector('.sc-platform-type').textContent,
        };

        if (pid === 'custom') {
          customForm.classList.add('visible');
          connectBtn.disabled = true;
          connectBtn.textContent = 'Connect & Test \u2192';
          testBtn.style.display = 'inline-flex';
        } else {
          customForm.classList.remove('visible');
          testBtn.style.display = 'none';
          connectBtn.disabled = false;
          connectBtn.textContent = 'Connect to ' + selectedPlatform.name + ' \u2192';
        }
      });
    });

    var storeNameInput = section.querySelector('#scStoreName');
    var storeUrlInput = section.querySelector('#scStoreUrl');
    var apiKeyInput = section.querySelector('#scApiKey');

    function checkCustomFormReady() {
      if (!selectedPlatform || selectedPlatform.platform !== 'custom') return;
      var name = storeNameInput ? storeNameInput.value.trim() : '';
      var url = storeUrlInput ? storeUrlInput.value.trim() : '';
      var key = apiKeyInput ? apiKeyInput.value.trim() : '';
      connectBtn.disabled = !(name && url && key);
    }

    [storeNameInput, storeUrlInput, apiKeyInput].forEach(function (inp) {
      if (inp) inp.addEventListener('input', checkCustomFormReady);
    });

    if (connectBtn) {
      connectBtn.addEventListener('click', function () {
        if (selectedPlatform && selectedPlatform.platform === 'custom') {
          handleCustomConnect(section);
        } else if (selectedPlatform) {
          handlePlatformConnect(selectedPlatform);
        } else {
          var url = urlInput ? urlInput.value.trim() : '';
          var detected = detectPlatform(url);
          if (detected) {
            handlePlatformConnect(detected, url);
          }
        }
      });
    }

    if (testBtn) {
      testBtn.addEventListener('click', function () {
        testCustomConnection(section);
      });
    }

    var storesGrid = section.querySelector('.sc-stores-grid');
    if (storesGrid) {
      storesGrid.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.dataset.action;
        var storeId = btn.dataset.storeId;
        if (action === 'push') openPushModal(storeId);
        else if (action === 'test') testStoreConnection(storeId);
        else if (action === 'remove') removeStore(storeId, section);
      });
    }

    var addBtn = section.querySelector('#scAddAnother');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        if (urlInput) {
          urlInput.value = '';
          urlInput.focus();
        }
        detectBadge.classList.remove('visible');
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connect Store \u2192';
        selectedPlatform = null;
        platformCards.forEach(function (c) {
          c.classList.remove('selected');
        });
        customForm.classList.remove('visible');
        testBtn.style.display = 'none';
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Plugin Registration                                                */
  /* ------------------------------------------------------------------ */
  PluginRegistry.register('store-connect', {
    id: 'store-connect',
    name: 'Connect Store',
    version: '1.0.0',
    description: 'Connect your Shopify, WooCommerce, or custom store',
    dependencies: [],

    init: function () {
      Config.defaults('storeConnect', { defaultStore: null });
    },

    mount: function () {
      var container = UI.$('sections-container');
      if (!container) return;

      var section = document.createElement('section');
      section.className = 'section section-store-connect';
      section.id = 'section-store-connect';
      section.innerHTML = renderHub();
      container.appendChild(section);

      bindEvents(section);
    },

    unmount: function () {
      var section = UI.$('section-store-connect');
      if (section) section.remove();
    },
  });
})();
