// ============================================================================
// PLUGIN: AI Settings — COMMAND CENTER CONFIG v2.0
// ============================================================================
(function(){
const {PluginRegistry,Config,UI} = window.HuntDrop;
const esc = s => UI.escapeHtml(s);

// Module-level state (avoids PluginRegistry wrapper issues)
var _s = { section: null };

var AISettingsPlugin = {
  id: 'ai-settings',
  name: 'AI Settings',
  version: '2.0.0',

  init(ctx) {},

  mount(ctx) {
    var container = UI.$('sections-container');
    if (!container) return;

    var section = document.createElement('section');
    section.className = 'section section-ai-settings';
    section.id = 'section-ai-settings';
    section.innerHTML = AISettingsPlugin.renderHTML();
    container.appendChild(section);

    _s.section = section;
    AISettingsPlugin.bindEvents();
    AISettingsPlugin.updateStatus();
  },

  unmount(ctx) {
    var el = UI.$('section-ai-settings');
    if (el) el.remove();
    _s.section = null;
  },

  renderHTML() {
    var status = window.HuntDrop.APIKeyManager ? window.HuntDrop.APIKeyManager.getStatus() : {provider:'openai',model:'gpt-4o',configured:false};
    var providers = window.HuntDrop.APIKeyManager ? window.HuntDrop.APIKeyManager.providers : {};
    var webSearch = window.HuntDrop.AIWebSearch;
    var searchProviders = webSearch ? webSearch.providers : {};

    var providerOptions = '';
    Object.keys(providers).forEach(function(key) {
      var p = providers[key];
      providerOptions += '<option value="' + key + '"' + (key === status.provider ? ' selected' : '') + '>' + p.name + '</option>';
    });

    var modelOptions = '';
    var currentModels = (providers[status.provider] && providers[status.provider].models) || [];
    currentModels.forEach(function(m) {
      modelOptions += '<option value="' + esc(m) + '"' + (m === status.model ? ' selected' : '') + '>' + esc(m) + '</option>';
    });

    var searchProviderOptions = '';
    Object.keys(searchProviders).forEach(function(key) {
      var p = searchProviders[key];
      var currentProvider = webSearch ? webSearch.getProvider() : '';
      searchProviderOptions += '<option value="' + key + '"' + (key === currentProvider ? ' selected' : '') + '>' + p.name + '</option>';
    });

    var searchKey = webSearch ? webSearch.getKey() : '';
    var maskedSearchKey = searchKey ? searchKey.substring(0, 8) + '...' + searchKey.substring(searchKey.length - 4) : '';

    return '<div class="section-inner">' +

      // Hero
      '<div class="ais-hero">' +
        '<div class="ais-hero-badge"><span class="dot"></span> Configuration</div>' +
        '<h1 class="ais-hero-title"><span class="highlight">AI Settings</span></h1>' +
        '<p class="ais-hero-desc">Configure your AI providers and web search to unlock the full power of HuntDrop AI Coach.</p>' +
      '</div>' +

      // Status Bar
      '<div class="ais-status-bar" id="aisStatusBar">' + AISettingsPlugin.buildStatusBar(status) + '</div>' +

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
                '<select class="ais-select" id="aisProvider">' + providerOptions + '</select>' +
              '</div>' +
              '<div class="ais-field">' +
                '<label class="ais-label">Model</label>' +
                '<select class="ais-select" id="aisModel">' + modelOptions + '</select>' +
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
                '<select class="ais-select" id="aisSearchProvider">' + searchProviderOptions + '</select>' +
              '</div>' +
              '<div class="ais-field">' +
                '<label class="ais-label">API Key</label>' +
                '<input type="password" class="ais-input" id="aisSearchKey" placeholder="Enter search API key" value="' + maskedSearchKey + '">' +
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

      // Provider Guide
      '<div class="ais-grid">' +
        '<div class="ais-card ais-full">' +
          '<div class="ais-card-header">' +
            '<div class="ais-card-icon green">📋</div>' +
            '<div class="ais-card-info"><div class="ais-card-title">Provider Guide</div><div class="ais-card-sub">How to get API keys for each provider</div></div>' +
          '</div>' +
          '<div class="ais-card-body">' +
            '<div class="ais-guide-grid">' +
              '<div class="ais-guide-card groq">' +
                '<div class="ais-guide-header"><span class="ais-guide-name" style="color:#f55036">Groq</span><span class="ais-guide-price free">FREE</span></div>' +
                '<div class="ais-guide-steps">' +
                  '<div class="ais-guide-step">Go to console.groq.com</div>' +
                  '<div class="ais-guide-step">Sign up with email (free)</div>' +
                  '<div class="ais-guide-step">Create API key in Settings</div>' +
                  '<div class="ais-guide-step">Paste key above</div>' +
                '</div>' +
                '<div class="ais-guide-note">✓ Free tier: 14,400 requests/day</div>' +
              '</div>' +
              '<div class="ais-guide-card openai">' +
                '<div class="ais-guide-header"><span class="ais-guide-name" style="color:#10a37f">OpenAI</span><span class="ais-guide-price paid">PAID</span></div>' +
                '<div class="ais-guide-steps">' +
                  '<div class="ais-guide-step">Go to platform.openai.com</div>' +
                  '<div class="ais-guide-step">Add payment method</div>' +
                  '<div class="ais-guide-step">Create API key</div>' +
                  '<div class="ais-guide-step">Paste key above</div>' +
                '</div>' +
                '<div class="ais-guide-note">~$0.15-2.50 per 1M tokens</div>' +
              '</div>' +
              '<div class="ais-guide-card anthropic">' +
                '<div class="ais-guide-header"><span class="ais-guide-name" style="color:#d97706">Anthropic</span><span class="ais-guide-price paid">PAID</span></div>' +
                '<div class="ais-guide-steps">' +
                  '<div class="ais-guide-step">Go to console.anthropic.com</div>' +
                  '<div class="ais-guide-step">Add payment method</div>' +
                  '<div class="ais-guide-step">Create API key</div>' +
                  '<div class="ais-guide-step">Paste key above</div>' +
                '</div>' +
                '<div class="ais-guide-note">~$0.25-15 per 1M tokens</div>' +
              '</div>' +
              '<div class="ais-guide-card google">' +
                '<div class="ais-guide-header"><span class="ais-guide-name" style="color:#4285f4">Google AI</span><span class="ais-guide-price free">FREE</span></div>' +
                '<div class="ais-guide-steps">' +
                  '<div class="ais-guide-step">Go to aistudio.google.com</div>' +
                  '<div class="ais-guide-step">Get free API key</div>' +
                  '<div class="ais-guide-step">Paste key above</div>' +
                '</div>' +
                '<div class="ais-guide-note">✓ Free tier: 60 requests/min</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

    '</div>';
  },

  buildStatusBar(status) {
    var webSearch = window.HuntDrop.AIWebSearch;
    var hasSearchKey = webSearch ? webSearch.hasKey() : false;
    return '<div class="ais-status-item">' +
      '<span class="ais-status-dot ' + (status.connected ? 'live' : 'offline') + '"></span>' +
      '<span class="ais-status-label">AI:</span>' +
      '<span class="ais-status-value ' + (status.connected ? 'connected' : 'disconnected') + '">' +
        (status.connected ? esc(status.providerName) + ' (' + esc(status.model) + ')' : 'Not configured') +
      '</span>' +
    '</div>' +
    '<div class="ais-status-item">' +
      '<span class="ais-status-dot ' + (hasSearchKey ? 'live' : 'offline') + '"></span>' +
      '<span class="ais-status-label">Web Search:</span>' +
      '<span class="ais-status-value ' + (hasSearchKey ? 'connected' : 'disconnected') + '">' +
        (hasSearchKey && webSearch ? webSearch.getProvider().toUpperCase() + ' active' : 'Not configured') +
      '</span>' +
    '</div>' +
    '<div class="ais-status-item">' +
      '<span class="ais-status-dot ' + (status.connected && hasSearchKey ? 'live' : 'warning') + '"></span>' +
      '<span class="ais-status-label">Power Level:</span>' +
      '<span class="ais-status-value" style="color:' + (status.connected && hasSearchKey ? 'var(--accent-green)' : 'var(--accent-yellow)') + '">' +
        (status.connected && hasSearchKey ? 'FULL' : status.connected ? 'PARTIAL' : 'MINIMAL') +
      '</span>' +
    '</div>';
  },

  bindEvents() {
    var section = _s.section;
    if (!section) return;

    var providerSelect = section.querySelector('#aisProvider');
    var modelSelect = section.querySelector('#aisModel');
    var keyInput = section.querySelector('#aisKeyInput');
    var keyToggle = section.querySelector('#aisKeyToggle');
    var verifyBtn = section.querySelector('#aisKeyVerify');
    var clearBtn = section.querySelector('#aisKeyClear');
    var searchProvider = section.querySelector('#aisSearchProvider');
    var searchKey = section.querySelector('#aisSearchKey');
    var searchSave = section.querySelector('#aisSearchSave');

    if (providerSelect) {
      providerSelect.addEventListener('change', function() {
        window.HuntDrop.APIKeyManager.setProvider(providerSelect.value);
        AISettingsPlugin.updateModelOptions();
        AISettingsPlugin.updateStatus();
      });
    }

    if (modelSelect) {
      modelSelect.addEventListener('change', function() {
        window.HuntDrop.APIKeyManager.setModel(modelSelect.value);
      });
    }

    if (keyToggle && keyInput) {
      keyToggle.addEventListener('click', function() {
        keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
        keyToggle.textContent = keyInput.type === 'password' ? '👁' : '🙈';
      });
    }

    if (verifyBtn) {
      verifyBtn.addEventListener('click', async function() {
        var key = keyInput ? keyInput.value.trim() : '';
        if (!key) { AISettingsPlugin.showToast('Please enter an API key', 'error'); return; }
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '⏳ Verifying...';
        var provider = providerSelect ? providerSelect.value : 'groq';
        try {
          var valid = await window.HuntDrop.APIKeyManager.verifyKey(provider, key);
          if (valid) {
            await window.HuntDrop.APIKeyManager.saveKey(provider, key);
            AISettingsPlugin.showToast('✓ Key verified and saved!', 'success');
            AISettingsPlugin.updateStatus();
          } else {
            AISettingsPlugin.showToast('✗ Invalid key. Please check and try again.', 'error');
          }
        } catch(e) {
          AISettingsPlugin.showToast('✗ Verification failed: ' + e.message, 'error');
        }
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '⚡ Verify & Save';
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        var provider = providerSelect ? providerSelect.value : 'groq';
        window.HuntDrop.APIKeyManager.removeKey(provider);
        if (keyInput) keyInput.value = '';
        AISettingsPlugin.showToast('Key cleared', 'info');
        AISettingsPlugin.updateStatus();
      });
    }

    if (searchProvider) {
      searchProvider.addEventListener('change', function() {
        window.HuntDrop.AIWebSearch.setProvider(searchProvider.value);
        AISettingsPlugin.updateStatus();
      });
    }

    if (searchSave) {
      searchSave.addEventListener('click', function() {
        var key = searchKey ? searchKey.value.trim() : '';
        window.HuntDrop.AIWebSearch.setKey(key);
        AISettingsPlugin.showToast('Search key saved!', 'success');
        AISettingsPlugin.updateStatus();
      });
    }
  },

  updateModelOptions() {
    var section = _s.section;
    if (!section) return;
    var mgr = window.HuntDrop.APIKeyManager;
    if (!mgr) return;
    var provider = mgr.getProvider();
    var models = (mgr.providers[provider] && mgr.providers[provider].models) || [];
    var modelSelect = section.querySelector('#aisModel');
    if (modelSelect) {
      modelSelect.innerHTML = models.map(function(m) {
        return '<option value="' + esc(m) + '">' + esc(m) + '</option>';
      }).join('');
    }
  },

  updateStatus() {
    var section = _s.section;
    if (!section) return;
    var mgr = window.HuntDrop.APIKeyManager;
    if (!mgr) return;
    var status = mgr.getStatus();

    // Update status bar
    var statusBar = section.querySelector('#aisStatusBar');
    if (statusBar) statusBar.innerHTML = AISettingsPlugin.buildStatusBar(status);

    // Update connection status
    var connEl = section.querySelector('#aisConnectionStatus');
    if (connEl) {
      if (status.connected) {
        connEl.innerHTML = '<div class="ais-connection connected">' +
          '<span class="ais-conn-dot live"></span>' +
          '<span class="ais-conn-text">Connected to ' + esc(status.providerName) + ' (' + esc(status.model) + ')</span>' +
          '<span class="ais-conn-badge live">LIVE</span>' +
        '</div>';
      } else {
        connEl.innerHTML = '<div class="ais-connection disconnected">' +
          '<span class="ais-conn-dot off"></span>' +
          '<span class="ais-conn-text">Not connected — add API key to unlock AI power</span>' +
          '<span class="ais-conn-badge off">OFF</span>' +
        '</div>';
      }
    }
  },

  showToast(message, type) {
    var existing = document.querySelector('.ais-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'ais-toast ' + (type || 'info');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3500);
  }
};

PluginRegistry.register('ai-settings', AISettingsPlugin);
})();