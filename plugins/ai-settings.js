// ============================================================================
// PLUGIN: AI Settings — COMMAND CENTER CONFIG v2.0
// ============================================================================
(function () {
  const { PluginRegistry, UI } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(s);

  // Module-level state (avoids PluginRegistry wrapper issues)
  const _s = { section: null };

  const AISettingsPlugin = {
    id: 'ai-settings',
    name: 'AI Settings',
    version: '2.0.0',

    init(_ctx) {},

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section section-ai-settings';
      section.id = 'section-ai-settings';
      section.innerHTML = AISettingsPlugin.renderHTML();
      container.appendChild(section);

      _s.section = section;
      AISettingsPlugin.bindEvents();
      AISettingsPlugin.updateStatus();
    },

    unmount(_ctx) {
      const el = UI.$('section-ai-settings');
      if (el) el.remove();
      _s.section = null;
    },

    renderHTML() {
      const status = window.HuntDrop.APIKeyManager
        ? window.HuntDrop.APIKeyManager.getStatus()
        : { provider: 'openai', model: 'gpt-4o', configured: false };
      const providers = window.HuntDrop.APIKeyManager ? window.HuntDrop.APIKeyManager.providers : {};
      const webSearch = window.HuntDrop.AIWebSearch;
      const searchProviders = webSearch ? webSearch.providers : {};

      let providerOptions = '';
      Object.keys(providers).forEach(function (key) {
        const p = providers[key];
        providerOptions +=
          '<option value="' + key + '"' + (key === status.provider ? ' selected' : '') + '>' + p.name + '</option>';
      });

      let modelOptions = '';
      const currentModels = (providers[status.provider] && providers[status.provider].models) || [];
      currentModels.forEach(function (m) {
        modelOptions +=
          '<option value="' + esc(m) + '"' + (m === status.model ? ' selected' : '') + '>' + esc(m) + '</option>';
      });

      let searchProviderOptions = '';
      Object.keys(searchProviders).forEach(function (key) {
        const p = searchProviders[key];
        const currentProvider = webSearch ? webSearch.getProvider() : '';
        searchProviderOptions +=
          '<option value="' + key + '"' + (key === currentProvider ? ' selected' : '') + '>' + p.name + '</option>';
      });

      const searchKey = webSearch ? webSearch.getKey() : '';
      const maskedSearchKey = searchKey
        ? searchKey.substring(0, 8) + '...' + searchKey.substring(searchKey.length - 4)
        : '';

      // Build feature assignment options
      const mgr = window.HuntDrop.APIKeyManager;
      const featureAssignments = mgr ? mgr.getFeatureAssignments() : {};
      const features = mgr ? mgr.FEATURES : {};
      let featureRows = '';
      let configuredCount = 0;
      const globalProviderId = mgr ? mgr.getProvider() : 'groq';
      Object.keys(features).forEach(function (fid) {
        const f = features[fid];
        const assignedProvider = featureAssignments[fid] || '';
        const effectiveProvider = assignedProvider || globalProviderId;
        const pInfo = providers[effectiveProvider];
        const isAssigned = !!assignedProvider;
        if (isAssigned) configuredCount++;
        const hasKeyForProvider = mgr ? mgr.hasKey(effectiveProvider) : false;
        const providerColor = pInfo ? pInfo.color : '#666';
        const tierLabel = pInfo && pInfo.tier === 'free' ? 'FREE' : 'PAID';
        let feOpts =
          '<option value="">(Use global: ' + esc(providers[globalProviderId]?.name || globalProviderId) + ')</option>';
        Object.keys(providers).forEach(function (pk) {
          const p = providers[pk];
          const selected = pk === assignedProvider ? ' selected' : '';
          const freeTag = p.tier === 'free' ? ' ★ FREE' : '';
          feOpts += '<option value="' + pk + '"' + selected + '>' + p.name + freeTag + '</option>';
        });
        const connDot = hasKeyForProvider
          ? '<span class="ais-fa-dot ais-fa-dot-live" title="Key configured"></span>'
          : '<span class="ais-fa-dot ais-fa-dot-off" title="No key for this provider"></span>';
        const badgeHtml = isAssigned
          ? '<span class="ais-fa-badge" style="--fa-color:' +
            providerColor +
            '"><span class="ais-fa-badge-dot" style="background:' +
            providerColor +
            '"></span>' +
            esc(pInfo ? pInfo.name : effectiveProvider) +
            '<span class="ais-fa-tier ais-fa-tier-' +
            (pInfo && pInfo.tier === 'free' ? 'free' : 'paid') +
            '">' +
            tierLabel +
            '</span></span>'
          : '<span class="ais-fa-badge ais-fa-badge-global" style="--fa-color:var(--text-secondary)">Global: ' +
            esc(providers[globalProviderId]?.name || globalProviderId) +
            '</span>';
        featureRows +=
          '<div class="ais-feature-row">' +
          '<div class="ais-feature-info"><span class="ais-feature-icon-r">' +
          (f.icon || '🤖') +
          '</span><div><div class="ais-feature-name">' +
          esc(f.name) +
          '</div><div class="ais-feature-desc">' +
          esc(f.desc) +
          '</div></div></div>' +
          '<div class="ais-fa-right">' +
          connDot +
          badgeHtml +
          '<select class="ais-select ais-feature-select" data-feature="' +
          fid +
          '">' +
          feOpts +
          '</select>' +
          '</div>' +
          '</div>';
      });
      const totalFeatures = Object.keys(features).length;
      const summaryLabel =
        configuredCount === 0
          ? 'No features configured — all use the global provider (' +
            esc(providers[globalProviderId]?.name || globalProviderId) +
            ')'
          : configuredCount === totalFeatures
            ? 'All ' + totalFeatures + ' features have their own provider assigned'
            : configuredCount + ' of ' + totalFeatures + ' features have custom providers assigned';

      return (
        '<div class="section-inner">' +
        // Hero
        '<div class="ais-hero">' +
        '<div class="ais-hero-badge"><span class="dot"></span> Configuration</div>' +
        '<h1 class="ais-hero-title"><span class="highlight">AI Settings</span></h1>' +
        '<p class="ais-hero-desc">Configure your AI providers and web search to unlock the full power of HuntDrop AI Coach.</p>' +
        '</div>' +
        // Security Warning
        '<div class="ais-security-banner" style="background:rgba(255,138,0,0.08);border:1px solid rgba(255,138,0,0.25);border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px">' +
        '<span style="font-size:20px;flex-shrink:0;margin-top:2px">&#9888;&#65039;</span>' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--accent-orange);margin-bottom:4px">Security Notice: Client-Side Key Storage</div>' +
        '<div style="font-size:12px;color:var(--text-secondary);line-height:1.5">API keys are encrypted with AES-GCM but remain accessible via browser DevTools. Secure for personal use on trusted machines. For production, deploy a backend proxy to hold keys server-side.</div>' +
        '</div>' +
        '</div>' +
        // Status Bar
        '<div class="ais-status-bar" id="aisStatusBar">' +
        AISettingsPlugin.buildStatusBar(status) +
        '</div>' +
        // Grid
        '<div class="ais-grid">' +
        // AI Provider Card
        '<div class="ais-card">' +
        '<div class="ais-card-header">' +
        '<div class="ais-card-icon cyan">🤖</div>' +
        '<div class="ais-card-info"><div class="ais-card-title">AI Provider</div><div class="ais-card-sub">Choose your AI backend and model</div></div>' +
        '</div>' +
        '<div class="ais-card-body">' +
        '<div class="ais-form">' +
        '<div class="ais-field">' +
        '<label class="ais-label">Provider</label>' +
        '<select class="ais-select" id="aisProvider">' +
        providerOptions +
        '</select>' +
        '</div>' +
        '<div class="ais-field">' +
        '<label class="ais-label">Model</label>' +
        '<select class="ais-select" id="aisModel">' +
        modelOptions +
        '</select>' +
        '</div>' +
        '<div class="ais-field">' +
        '<label class="ais-label">API Key</label>' +
        '<div class="ais-key-row">' +
        '<input type="password" class="ais-input" id="aisKeyInput" placeholder="Enter your API key">' +
        '<button class="ais-btn ais-btn-ghost" id="aisKeyToggle" title="Show/hide key">👁</button>' +
        '</div>' +
        '<div class="ais-key-hint"><span class="lock">🔒</span> Your key stays in your browser. Never sent to our servers.</div>' +
        '</div>' +
        '<div class="ais-actions">' +
        '<button class="ais-btn ais-btn-primary" id="aisKeyVerify">⚡ Verify & Save</button>' +
        '<button class="ais-btn ais-btn-danger" id="aisKeyClear">✕ Clear</button>' +
        '</div>' +
        '<div id="aisConnectionStatus"></div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        // Web Search Card
        '<div class="ais-card">' +
        '<div class="ais-card-header">' +
        '<div class="ais-card-icon purple">🌐</div>' +
        '<div class="ais-card-info"><div class="ais-card-title">Web Search</div><div class="ais-card-sub">Enable real-time market data in your coach</div></div>' +
        '</div>' +
        '<div class="ais-card-body">' +
        '<div class="ais-form">' +
        '<div class="ais-field">' +
        '<label class="ais-label">Search Provider</label>' +
        '<select class="ais-select" id="aisSearchProvider">' +
        searchProviderOptions +
        '</select>' +
        '</div>' +
        '<div class="ais-field">' +
        '<label class="ais-label">API Key</label>' +
        '<input type="password" class="ais-input" id="aisSearchKey" placeholder="Enter search API key" value="' +
        maskedSearchKey +
        '">' +
        '<div class="ais-key-hint"><span class="lock">🔑</span> For Tavily, Serper, or Brave Search API.</div>' +
        '</div>' +
        '<div class="ais-actions">' +
        '<button class="ais-btn ais-btn-primary" id="aisSearchSave">💾 Save Search Key</button>' +
        '</div>' +
        '<div class="ais-features">' +
        '<div class="ais-feature"><span class="ais-feature-icon">🔍</span><span>Product research</span><span class="ais-feature-check">✓</span></div>' +
        '<div class="ais-feature"><span class="ais-feature-icon">📈</span><span>Trend detection</span><span class="ais-feature-check">✓</span></div>' +
        '<div class="ais-feature"><span class="ais-feature-icon">⚔️</span><span>Competitor intel</span><span class="ais-feature-check">✓</span></div>' +
        '<div class="ais-feature"><span class="ais-feature-icon">💰</span><span>Price comparison</span><span class="ais-feature-check">✓</span></div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        // Platform Connectors
        AISettingsPlugin.buildPlatformConnectorsHTML() +
        // Feature Assignments
        '<div class="ais-grid">' +
        '<div class="ais-card ais-full">' +
        '<div class="ais-card-header">' +
        '<div class="ais-card-icon orange">🔀</div>' +
        '<div class="ais-card-info"><div class="ais-card-title">Feature Assignments</div><div class="ais-card-sub">' +
        summaryLabel +
        '</div></div>' +
        '</div>' +
        '<div class="ais-card-body">' +
        '<div class="ais-feature-notice">💡 Get free API keys from each provider and assign them to different features below to maximize your free tier usage across all features.</div>' +
        '<div class="ais-feature-list" id="aisFeatureList">' +
        featureRows +
        '</div>' +
        // Legend
        '<div class="ais-fa-legend">' +
        '<span><span class="ais-fa-dot ais-fa-dot-live"></span> Key configured</span>' +
        '<span><span class="ais-fa-dot ais-fa-dot-off"></span> No key</span>' +
        '<span class="ais-fa-legend-badge"><span class="ais-fa-tier ais-fa-tier-free">FREE</span> Free tier</span>' +
        '<span class="ais-fa-legend-badge"><span class="ais-fa-tier ais-fa-tier-paid">PAID</span> Paid tier</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        // Provider Guide
        '<div class="ais-grid">' +
        '<div class="ais-card ais-full">' +
        '<div class="ais-card-header">' +
        '<div class="ais-card-icon green">📋</div>' +
        '<div class="ais-card-info"><div class="ais-card-title">Provider Guide</div><div class="ais-card-sub">How to get API keys for each provider</div></div>' +
        '</div>' +
        '<div class="ais-card-body">' +
        '<div class="ais-guide-grid">' +
        AISettingsPlugin.buildGuideCards(providers) +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>'
      );
    },

    buildPlatformConnectorsHTML() {
      const PC = window.HuntDrop.PlatformConnectors;
      const configs = PC ? PC.configs : null;
      if (!configs) {
        return (
          '<div class="ais-grid">' +
          '<div class="ais-card ais-full">' +
          '<div class="ais-card-header">' +
          '<div class="ais-card-icon green">🔗</div>' +
          '<div class="ais-card-info"><div class="ais-card-title">Platform Connectors</div><div class="ais-card-sub">Loading platform connectors...</div></div>' +
          '</div>' +
          '<div class="ais-card-body"><div class="ais-feature-notice">⏳ Platform connectors are loading. If this persists, refresh the page.</div></div>' +
          '</div>' +
          '</div>'
        );
      }

      var platformCards = '';
      var connectedCount = 0;
      var totalCount = Object.keys(configs).length;

      // Group platforms by category
      var categories = {
        ecommerce: { name: 'E-Commerce Marketplaces', icon: '🛒', platforms: [] },
        wholesale: { name: 'Wholesale & B2B', icon: '🏭', platforms: [] },
        research: { name: 'Research & Discovery', icon: '🔬', platforms: [] },
      };

      Object.keys(configs).forEach(function (pid) {
        var cfg = configs[pid];
        var cat = cfg.category || 'ecommerce';
        if (!categories[cat]) categories[cat] = { name: cat, icon: '🔗', platforms: [] };
        categories[cat].platforms.push(pid);
      });

      Object.keys(categories).forEach(function (catKey) {
        var cat = categories[catKey];
        if (cat.platforms.length === 0) return;

        platformCards +=
          '<div class="ais-platform-category">' +
          '<div class="ais-platform-cat-header">' +
          '<span class="ais-platform-cat-icon">' +
          cat.icon +
          '</span>' +
          '<span class="ais-platform-cat-name">' +
          cat.name +
          '</span>' +
          '<span class="ais-platform-cat-count">' +
          cat.platforms.length +
          ' platforms</span>' +
          '</div>';

        cat.platforms.forEach(function (pid) {
          var cfg = configs[pid];
          var isConnected = PC.isConnected(pid);
          if (isConnected) connectedCount++;
          var statusDot = isConnected
            ? '<span class="ais-fa-dot ais-fa-dot-live" title="Connected"></span>'
            : '<span class="ais-fa-dot ais-fa-dot-off" title="Not connected"></span>';
          var statusBadge = isConnected
            ? '<span class="ais-conn-badge live" style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(0,255,136,0.15);color:var(--accent-green);border:1px solid rgba(0,255,136,0.3)">CONNECTED</span>'
            : '<span class="ais-conn-badge off" style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(255,255,255,0.05);color:var(--text-muted);border:1px solid var(--border-subtle)">NO KEY</span>';

          platformCards +=
            '<div class="ais-platform-card" data-platform="' +
            pid +
            '" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg-elevated);border:1px solid ' +
            (isConnected ? 'rgba(0,255,136,0.2)' : 'var(--border-subtle)') +
            ';border-radius:10px;transition:all 0.2s">' +
            '<span style="font-size:24px;flex-shrink:0">' +
            cfg.icon +
            '</span>' +
            '<div style="flex:1;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">' +
            '<span style="font-family:var(--font-display);font-size:13px;font-weight:600;color:var(--text-primary)">' +
            esc(cfg.name) +
            '</span>' +
            statusDot +
            statusBadge +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);line-height:1.4">' +
            esc(cfg.keyHint) +
            '</div>' +
            '</div>' +
            '<div style="flex-shrink:0;display:flex;gap:6px;align-items:center">' +
            '<input type="password" class="ais-input ais-platform-key-input" data-platform="' +
            pid +
            '" placeholder="' +
            (isConnected ? '••••••••' : 'Enter API key') +
            '" style="width:180px;font-size:11px;padding:6px 10px">' +
            '<button class="ais-btn ais-btn-primary ais-platform-save" data-platform="' +
            pid +
            '" style="font-size:11px;padding:6px 12px;white-space:nowrap">' +
            (isConnected ? 'Update' : 'Save') +
            '</button>' +
            (isConnected
              ? '<button class="ais-btn ais-btn-danger ais-platform-disconnect" data-platform="' +
                pid +
                '" style="font-size:11px;padding:6px 10px" title="Disconnect">✕</button>'
              : '') +
            '<a href="' +
            esc(cfg.keyUrl) +
            '" target="_blank" rel="noopener" class="ais-guide-btn" style="font-size:10px;padding:6px 10px;text-decoration:none;--gc:' +
            (cfg.color || 'var(--accent-cyan)') +
            '">Get Key ↗</a>' +
            '</div>' +
            '</div>';
        });

        platformCards += '</div>';
      });

      var summaryText =
        connectedCount === 0
          ? 'No platform keys configured — connect platforms to see live data'
          : connectedCount === totalCount
            ? 'All ' + totalCount + ' platforms connected — live data for every search'
            : connectedCount + ' of ' + totalCount + ' platforms connected';

      return (
        '<div class="ais-grid">' +
        '<div class="ais-card ais-full">' +
        '<div class="ais-card-header">' +
        '<div class="ais-card-icon green">🔗</div>' +
        '<div class="ais-card-info"><div class="ais-card-title">Platform Connectors</div><div class="ais-card-sub">' +
        summaryText +
        '</div></div>' +
        '</div>' +
        '<div class="ais-card-body">' +
        '<div class="ais-feature-notice">🔌 Add API keys for each platform to get real product data. Without keys, no product data will be shown. Add keys one at a time as you get them.</div>' +
        '<div class="ais-platform-search-wrap">' +
        '<input type="text" class="ais-input ais-platform-search" id="aisPlatformSearch" placeholder="🔍 Search platforms...">' +
        '</div>' +
        '<div id="aisPlatformList" style="display:flex;flex-direction:column;gap:16px">' +
        platformCards +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>'
      );
    },

    bindPlatformEvents() {
      const section = _s.section;
      if (!section) return;
      const PC = window.HuntDrop.PlatformConnectors;
      if (!PC) return;

      // Platform search
      var platformSearch = section.querySelector('#aisPlatformSearch');
      if (platformSearch) {
        platformSearch.addEventListener('input', function () {
          var query = platformSearch.value.toLowerCase();
          section.querySelectorAll('.ais-platform-card').forEach(function (card) {
            var name = (card.querySelector('.ais-fa-dot') ? card.textContent : '').toLowerCase();
            var pid = card.dataset.platform || '';
            var match = query === '' || name.indexOf(query) !== -1 || pid.indexOf(query) !== -1;
            card.style.display = match ? 'flex' : 'none';
          });
          // Show/hide category headers based on visible cards
          section.querySelectorAll('.ais-platform-category').forEach(function (cat) {
            var visibleCards = cat.querySelectorAll(
              '.ais-platform-card[style*="flex"], .ais-platform-card:not([style*="none"])'
            );
            var hasVisible = false;
            cat.querySelectorAll('.ais-platform-card').forEach(function (c) {
              if (c.style.display !== 'none') hasVisible = true;
            });
            cat.style.display = hasVisible ? 'block' : 'none';
          });
        });
      }

      // Save buttons
      section.querySelectorAll('.ais-platform-save').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var pid = btn.dataset.platform;
          var input = section.querySelector('.ais-platform-key-input[data-platform="' + pid + '"]');
          var key = input ? input.value.trim() : '';
          if (!key) {
            AISettingsPlugin.showToast('Please enter an API key', 'error');
            return;
          }
          btn.disabled = true;
          btn.textContent = 'Saving...';
          try {
            await PC.savePlatformKey(pid, key);
            AISettingsPlugin.showToast('✓ ' + PC.configs[pid].name + ' key saved!', 'success');
            AISettingsPlugin.refreshPlatformSection();
          } catch (e) {
            AISettingsPlugin.showToast('Failed to save key: ' + e.message, 'error');
          }
          btn.disabled = false;
          btn.textContent = 'Update';
        });
      });

      // Disconnect buttons
      section.querySelectorAll('.ais-platform-disconnect').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var pid = btn.dataset.platform;
          PC.removePlatformKey(pid);
          AISettingsPlugin.showToast(PC.configs[pid].name + ' disconnected', 'info');
          AISettingsPlugin.refreshPlatformSection();
        });
      });

      // Toggle show/hide key
      section.querySelectorAll('.ais-platform-key-input').forEach(function (input) {
        input.addEventListener('focus', function () {
          if (input.value === '••••••••') input.value = '';
        });
        input.addEventListener('blur', function () {
          var pid = input.dataset.platform;
          if (!input.value && PC.isConnected(pid)) {
            input.value = '••••••••';
          }
        });
      });
    },

    refreshPlatformSection() {
      const section = _s.section;
      if (!section) return;
      const platformList = section.querySelector('#aisPlatformList');
      if (platformList) {
        // Re-render the platform connectors section
        const PC = window.HuntDrop.PlatformConnectors;
        if (!PC) return;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = AISettingsPlugin.buildPlatformConnectorsHTML();
        const newContent = tempDiv.querySelector('#aisPlatformList');
        if (newContent) {
          platformList.innerHTML = newContent.innerHTML;
          AISettingsPlugin.bindPlatformEvents();
        }
      }
      AISettingsPlugin.updateStatus();
    },

    buildGuideCards(providers) {
      const guideData = {
        groq: { note: 'Free tier: 14,400 requests/day' },
        openai: { note: '~$0.15-2.50 per 1M tokens' },
        anthropic: { note: '~$0.25-15 per 1M tokens' },
        google: { note: 'Free tier: 60 requests/min' },
        deepseek: { note: '$5 free credit on signup' },
        mistral: { note: '500K free tokens' },
        cohere: { note: 'Free trial API key' },
        together: { note: '$1 free, many open models' },
        huggingface: { note: 'Free inference, 30K+ models' },
        perplexity: { note: '$5 free credit for new users' },
        fireworks: { note: '$0.50 free credit, fast inference' },
        openrouter: { note: '$1 free credit, 200+ models' },
        replicate: { note: 'Free tier with rate limits' },
        octoai: { note: 'Free trial credits, fast inference' },
        lepton: { note: 'Free credits on signup' },
      };
      let html = '';
      Object.keys(providers).forEach(function (pk) {
        const p = providers[pk];
        const note = (guideData[pk] && guideData[pk].note) || p.freeNote || '';
        const tierClass = p.tier === 'free' ? 'free' : 'paid';
        const tierLabel = p.tier === 'free' ? 'FREE' : 'PAID';
        html +=
          '<div class="ais-guide-card ' +
          pk +
          '">' +
          '<div class="ais-guide-header">' +
          '<span class="ais-guide-name" style="color:' +
          (p.color || '#666') +
          '">' +
          esc(p.name) +
          '</span>' +
          '<span class="ais-guide-price ' +
          tierClass +
          '">' +
          tierLabel +
          '</span>' +
          '</div>' +
          '<div class="ais-guide-steps">' +
          '<div class="ais-guide-step">Sign up at ' +
          esc(p.getKeyUrl || '') +
          '</div>' +
          '<div class="ais-guide-step">Create API key</div>' +
          '<div class="ais-guide-step">Paste key above</div>' +
          '</div>' +
          (note ? '<div class="ais-guide-note">✓ ' + esc(note) + '</div>' : '') +
          '<a href="' +
          esc(p.getKeyUrl || '#') +
          '" target="_blank" rel="noopener" class="ais-guide-btn" style="--gc:' +
          (p.color || 'var(--accent-cyan)') +
          '">Get API Key <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>' +
          '</div>';
      });
      return html;
    },

    buildStatusBar(status) {
      const webSearch = window.HuntDrop.AIWebSearch;
      const hasSearchKey = webSearch ? webSearch.hasKey() : false;
      return (
        '<div class="ais-status-item">' +
        '<span class="ais-status-dot ' +
        (status.connected ? 'live' : 'offline') +
        '"></span>' +
        '<span class="ais-status-label">AI:</span>' +
        '<span class="ais-status-value ' +
        (status.connected ? 'connected' : 'disconnected') +
        '">' +
        (status.connected ? esc(status.providerName) + ' (' + esc(status.model) + ')' : 'Not configured') +
        '</span>' +
        '</div>' +
        '<div class="ais-status-item">' +
        '<span class="ais-status-dot ' +
        (hasSearchKey ? 'live' : 'offline') +
        '"></span>' +
        '<span class="ais-status-label">Web Search:</span>' +
        '<span class="ais-status-value ' +
        (hasSearchKey ? 'connected' : 'disconnected') +
        '">' +
        (hasSearchKey && webSearch ? webSearch.getProvider().toUpperCase() + ' active' : 'Not configured') +
        '</span>' +
        '</div>' +
        '<div class="ais-status-item">' +
        '<span class="ais-status-dot ' +
        (status.connected && hasSearchKey ? 'live' : 'warning') +
        '"></span>' +
        '<span class="ais-status-label">Power Level:</span>' +
        '<span class="ais-status-value" style="color:' +
        (status.connected && hasSearchKey ? 'var(--accent-green)' : 'var(--accent-yellow)') +
        '">' +
        (status.connected && hasSearchKey ? 'FULL' : status.connected ? 'PARTIAL' : 'MINIMAL') +
        '</span>' +
        '</div>'
      );
    },

    bindEvents() {
      const section = _s.section;
      if (!section) return;

      const providerSelect = section.querySelector('#aisProvider');
      const modelSelect = section.querySelector('#aisModel');
      const keyInput = section.querySelector('#aisKeyInput');
      const keyToggle = section.querySelector('#aisKeyToggle');
      const verifyBtn = section.querySelector('#aisKeyVerify');
      const clearBtn = section.querySelector('#aisKeyClear');
      const searchProvider = section.querySelector('#aisSearchProvider');
      const searchKey = section.querySelector('#aisSearchKey');
      const searchSave = section.querySelector('#aisSearchSave');

      if (providerSelect) {
        providerSelect.addEventListener('change', function () {
          window.HuntDrop.APIKeyManager.setProvider(providerSelect.value);
          AISettingsPlugin.updateModelOptions();
          AISettingsPlugin.updateStatus();
        });
      }

      if (modelSelect) {
        modelSelect.addEventListener('change', function () {
          window.HuntDrop.APIKeyManager.setModel(modelSelect.value);
        });
      }

      if (keyToggle && keyInput) {
        keyToggle.addEventListener('click', function () {
          keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
          keyToggle.textContent = keyInput.type === 'password' ? '👁' : '🙈';
        });
      }

      if (verifyBtn) {
        verifyBtn.addEventListener('click', async function () {
          const key = keyInput ? keyInput.value.trim() : '';
          if (!key) {
            AISettingsPlugin.showToast('Please enter an API key', 'error');
            return;
          }
          verifyBtn.disabled = true;
          verifyBtn.innerHTML = '⏳ Verifying...';
          const provider = providerSelect ? providerSelect.value : 'groq';
          try {
            const valid = await window.HuntDrop.APIKeyManager.verifyKey(provider, key);
            if (valid) {
              await window.HuntDrop.APIKeyManager.saveKey(provider, key);
              AISettingsPlugin.showToast('✓ Key verified and saved!', 'success');
              AISettingsPlugin.updateStatus();
            } else {
              AISettingsPlugin.showToast('✗ Invalid key. Please check and try again.', 'error');
            }
          } catch (e) {
            AISettingsPlugin.showToast('✗ Verification failed: ' + e.message, 'error');
          }
          verifyBtn.disabled = false;
          verifyBtn.innerHTML = '⚡ Verify & Save';
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          const provider = providerSelect ? providerSelect.value : 'groq';
          window.HuntDrop.APIKeyManager.removeKey(provider);
          if (keyInput) keyInput.value = '';
          AISettingsPlugin.showToast('Key cleared', 'info');
          AISettingsPlugin.updateStatus();
        });
      }

      if (searchProvider) {
        searchProvider.addEventListener('change', function () {
          window.HuntDrop.AIWebSearch.setProvider(searchProvider.value);
          AISettingsPlugin.updateStatus();
        });
      }

      if (searchSave) {
        searchSave.addEventListener('click', function () {
          const key = searchKey ? searchKey.value.trim() : '';
          window.HuntDrop.AIWebSearch.setKey(key);
          AISettingsPlugin.showToast('Search key saved!', 'success');
          AISettingsPlugin.updateStatus();
        });
      }

      // Feature assignment dropdowns
      const featureSelects = section.querySelectorAll('.ais-feature-select');
      featureSelects.forEach(function (sel) {
        sel.addEventListener('change', function () {
          const featureId = this.dataset.feature;
          const provider = this.value;
          window.HuntDrop.APIKeyManager.setFeatureAssignment(featureId, provider || null);
          AISettingsPlugin.showToast(featureId + ' assigned to ' + (provider || 'global default'), 'info');
        });
      });

      // Platform connector events
      AISettingsPlugin.bindPlatformEvents();
    },

    updateModelOptions() {
      const section = _s.section;
      if (!section) return;
      const mgr = window.HuntDrop.APIKeyManager;
      if (!mgr) return;
      const provider = mgr.getProvider();
      const models = (mgr.providers[provider] && mgr.providers[provider].models) || [];
      const modelSelect = section.querySelector('#aisModel');
      if (modelSelect) {
        modelSelect.innerHTML = models
          .map(function (m) {
            return '<option value="' + esc(m) + '">' + esc(m) + '</option>';
          })
          .join('');
      }
    },

    updateStatus() {
      const section = _s.section;
      if (!section) return;
      const mgr = window.HuntDrop.APIKeyManager;
      if (!mgr) return;
      const status = mgr.getStatus();

      // Update status bar
      const statusBar = section.querySelector('#aisStatusBar');
      if (statusBar) statusBar.innerHTML = AISettingsPlugin.buildStatusBar(status);

      // Update connection status
      const connEl = section.querySelector('#aisConnectionStatus');
      if (connEl) {
        if (status.connected) {
          connEl.innerHTML =
            '<div class="ais-connection connected">' +
            '<span class="ais-conn-dot live"></span>' +
            '<span class="ais-conn-text">Connected to ' +
            esc(status.providerName) +
            ' (' +
            esc(status.model) +
            ')</span>' +
            '<span class="ais-conn-badge live">LIVE</span>' +
            '</div>';
        } else {
          connEl.innerHTML =
            '<div class="ais-connection disconnected">' +
            '<span class="ais-conn-dot off"></span>' +
            '<span class="ais-conn-text">Not connected — add API key to unlock AI power</span>' +
            '<span class="ais-conn-badge off">OFF</span>' +
            '</div>';
        }
      }
    },

    showToast(message, type) {
      const existing = document.querySelector('.ais-toast');
      if (existing) existing.remove();
      const toast = document.createElement('div');
      toast.className = 'ais-toast ' + (type || 'info');
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(function () {
          toast.remove();
        }, 300);
      }, 3500);
    },
  };

  PluginRegistry.register('ai-settings', AISettingsPlugin);
})();
