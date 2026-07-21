// ============================================================================
// PLUGIN: AI Coach — COMMAND CENTER v5.0
// ============================================================================
// Split-panel layout: sidebar intelligence + main chat
// Capabilities: web search, product research, competitor analysis,
// trend detection, price intelligence, market analysis, command system
// ============================================================================
(function () {
  const { PluginRegistry, Config, UI } = window.HuntDrop;

  // === COMMAND DEFINITIONS ===
  const COMMANDS = {
    research: {
      section: 'Research',
      items: [
        {
          cmd: '/search',
          icon: '🔍',
          name: 'Web Search',
          desc: 'Search the web for anything',
          prompt: 'Search the web for: ',
        },
        {
          cmd: '/product',
          icon: '📦',
          name: 'Product Research',
          desc: 'Deep research on a product',
          prompt: 'Research this product from the web: ',
        },
        {
          cmd: '/trend',
          icon: '📈',
          name: 'Trend Analysis',
          desc: 'Check if a product is trending',
          prompt: 'Analyze trends for: ',
        },
        {
          cmd: '/niche',
          icon: '⭐',
          name: 'Niche Discovery',
          desc: 'Find untapped niches',
          prompt: 'Find me untapped niches in: ',
        },
      ],
    },
    intelligence: {
      section: 'Intelligence',
      items: [
        {
          cmd: '/competitor',
          icon: '⚔️',
          name: 'Competitor Spy',
          desc: 'Analyze competitor stores',
          prompt: 'Analyze competitors for: ',
        },
        {
          cmd: '/price',
          icon: '💰',
          name: 'Price Intel',
          desc: 'Check live prices across platforms',
          prompt: 'Check prices across platforms for: ',
        },
        {
          cmd: '/market',
          icon: '🌐',
          name: 'Market Analysis',
          desc: 'Market size and opportunity',
          prompt: 'Analyze the market for: ',
        },
        {
          cmd: '/supplier',
          icon: '🏭',
          name: 'Supplier Check',
          desc: 'Verify supplier reliability',
          prompt: 'Verify this supplier: ',
        },
      ],
    },
    strategy: {
      section: 'Strategy',
      items: [
        {
          cmd: '/analyze',
          icon: '🧠',
          name: 'Full Analysis',
          desc: 'Complete product analysis with AI',
          prompt: 'Give me a full analysis of: ',
        },
        {
          cmd: '/ad',
          icon: '📢',
          name: 'Ad Strategy',
          desc: 'Create ad campaigns and copy',
          prompt: 'Create an ad strategy for: ',
        },
        {
          cmd: '/seo',
          icon: '🔎',
          name: 'SEO Keywords',
          desc: 'Keyword research and suggestions',
          prompt: 'Find SEO keywords for: ',
        },
        {
          cmd: '/social',
          icon: '📱',
          name: 'Social Intel',
          desc: 'Social media trends and hashtags',
          prompt: 'Analyze social media trends for: ',
        },
      ],
    },
    tools: {
      section: 'Tools',
      items: [
        {
          cmd: '/compare',
          icon: '⚖️',
          name: 'Compare',
          desc: 'Compare products side by side',
          prompt: 'Compare these products: ',
        },
        {
          cmd: '/forecast',
          icon: '📊',
          name: 'Forecast',
          desc: 'Sales and profit forecasting',
          prompt: 'Forecast sales for: ',
        },
        {
          cmd: '/risk',
          icon: '⚠️',
          name: 'Risk Assessment',
          desc: 'Evaluate business risks',
          prompt: 'Assess the risks of: ',
        },
        {
          cmd: '/export',
          icon: '📋',
          name: 'Export Chat',
          desc: 'Download conversation as file',
          prompt: '__EXPORT__',
        },
      ],
    },
  };

  const CAPABILITIES = [
    {
      icon: '🔍',
      title: 'Web Search',
      desc: 'Search the live web for products, prices, trends, and market data',
      color: 'cyan',
      prompt: 'Search the web for trending dropshipping products in 2025',
    },
    {
      icon: '📦',
      title: 'Product Research',
      desc: 'Deep-dive research any product with live pricing and demand data',
      color: 'green',
      prompt: 'Research wireless earbuds — pricing, competition, and trends',
    },
    {
      icon: '⚔️',
      title: 'Competitor Intel',
      desc: 'Spy on competitor stores, pricing strategies, and ad campaigns',
      color: 'purple',
      prompt: 'Analyze my top competitors in the pet niche',
    },
    {
      icon: '📈',
      title: 'Trend Detection',
      desc: 'Real-time trend scanning from Google, TikTok, and social media',
      color: 'orange',
      prompt: 'What products are trending on TikTok right now?',
    },
    {
      icon: '💰',
      title: 'Price Intelligence',
      desc: 'Compare live prices across 10+ platforms instantly',
      color: 'yellow',
      prompt: 'Compare prices for LED galaxy projectors across all platforms',
    },
    {
      icon: '🧠',
      title: 'Market Analysis',
      desc: 'Market size, saturation levels, and opportunity scoring',
      color: 'red',
      prompt: 'Analyze the home fitness equipment market opportunity',
    },
    {
      icon: '📢',
      title: 'Ad Strategy',
      desc: 'Create high-converting ad copy and campaign strategies',
      color: 'cyan',
      prompt: 'Create a TikTok ad campaign for posture correctors',
    },
    {
      icon: '🏭',
      title: 'Supplier Verify',
      desc: 'Background-check suppliers using web intelligence',
      color: 'green',
      prompt: 'Verify TechGear Direct supplier reliability',
    },
    {
      icon: '🔎',
      title: 'SEO & Keywords',
      desc: 'Keyword research, search volume, and content suggestions',
      color: 'purple',
      prompt: 'Find SEO keywords for my pet water fountain product',
    },
  ];

  const TYPING_STAGES = [
    { text: 'ANALYZING QUERY', icon: '🧠' },
    { text: 'SEARCHING WEB', icon: '🌐' },
    { text: 'PROCESSING DATA', icon: '⚡' },
    { text: 'GENERATING INSIGHTS', icon: '💡' },
  ];

  const INTEL_FEED = [];

  function getTrendingProducts() {
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    return products
      .sort(function (a, b) {
        return b.salesVelocity - a.salesVelocity;
      })
      .slice(0, 5);
  }

  function getTime() {
    const now = new Date();
    return (
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0') +
      ':' +
      now.getSeconds().toString().padStart(2, '0')
    );
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function formatResponse(text) {
    if (!text) return '';
    // Always escape HTML first to prevent XSS
    text = UI.escapeHtml(text);
    // Convert markdown bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert markdown italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Convert line breaks
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  // === STATE (module-level, survives PluginRegistry wrapping) ===
  const _state = {
    section: null,
    els: {},
    sidebarOpen: true,
    activeTab: 'commands',
    msgCount: 0,
    processing: false,
    recognition: null,
  };

  // ============================================================================
  // PLUGIN
  // ============================================================================
  const AICoachPlugin = {
    id: 'ai-business-coach',
    name: 'AI Coach',
    version: '5.0.0',
    description: 'AI command center with web search, product research, competitor analysis, and live intelligence',
    dependencies: [
      'ai-key-manager',
      'ai-web-search',
      'ai-context-builder',
      'ai-system-health',
      'ai-risk-analyzer',
      'ai-chat-service',
    ],

    init(_ctx) {
      Config.defaults('coach', { history: [], topics: [], viewedProducts: [] });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section section-coach';
      section.id = 'section-coach';
      section.innerHTML = AICoachPlugin.buildHTML();
      container.appendChild(section);

      _state.section = section;
      AICoachPlugin.cacheElements();
      AICoachPlugin.bindEvents();
      AICoachPlugin.renderSidebarPanels();
      AICoachPlugin.renderWelcome();
      AICoachPlugin.updateStatus();
    },

    unmount(_ctx) {
      if (_state.section) {
        _state.section.remove();
        _state.section = null;
      }
      _state.els = {};
    },

    // === HTML BUILDER ===
    buildHTML() {
      const status = window.HuntDrop.APIKeyManager.getStatus();
      const connected = status.connected;
      const products = window.HuntDrop.ALL_PRODUCTS || [];
      const ticker = AICoachPlugin.buildTickerHTML(products);

      return (
        '<div class="coach-grid-overlay"></div>' +
        '<div class="coach-ticker">' +
        '<div class="coach-ticker-status ' +
        (connected ? 'live' : 'paper') +
        '">' +
        '<span class="coach-status-dot"></span>' +
        (connected ? 'LIVE' : 'PAPER') +
        ' · ' +
        products.length +
        ' tracked' +
        '</div>' +
        '<div class="coach-ticker-track">' +
        ticker +
        ticker +
        '</div>' +
        '</div>' +
        '<div class="coach-container">' +
        AICoachPlugin.buildSidebarHTML() +
        AICoachPlugin.buildMainHTML(connected) +
        '</div>'
      );
    },

    buildTickerHTML(products) {
      if (!products || !products.length) return '';
      const syms = ['DROP', 'SELL', 'MOON', 'CART', 'ADS', 'ROI', 'WIN', 'PROF', 'SCALP', 'HODL'];
      let html = '';
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const sym = syms[i % syms.length] + (i + 1);
        const price = p.price ? '$' + p.price.toFixed(2) : '—';
        const chg = Math.random() * 16 - 6;
        const up = chg >= 0;
        const chgStr = (up ? '▲ ' : '▼ ') + Math.abs(chg).toFixed(1) + '%';
        html +=
          '<span class="coach-ticker-item">' +
          '<span class="coach-ticker-sym">' +
          sym +
          '</span>' +
          '<span class="coach-ticker-price">' +
          price +
          '</span>' +
          '<span class="coach-ticker-chg ' +
          (up ? 'up' : 'down') +
          '">' +
          chgStr +
          '</span>' +
          '</span>';
      }
      return html;
    },

    buildSidebarHTML() {
      return (
        '<aside class="coach-sidebar" id="coachSidebar">' +
        '<div class="coach-sidebar-header">' +
        '<div class="coach-sidebar-title">' +
        '<span class="coach-live-dot"></span> COMMAND CENTER' +
        '</div>' +
        '<div class="coach-sidebar-tabs">' +
        '<button class="coach-sb-tab active" data-tab="commands">Cmd</button>' +
        '<button class="coach-sb-tab" data-tab="intel">Intel</button>' +
        '<button class="coach-sb-tab" data-tab="trending">Trends</button>' +
        '<button class="coach-sb-tab" data-tab="history">Log</button>' +
        '</div>' +
        '</div>' +
        '<div class="coach-sidebar-content">' +
        '<div class="coach-sb-panel active" id="coachPanelCommands"></div>' +
        '<div class="coach-sb-panel" id="coachPanelIntel"></div>' +
        '<div class="coach-sb-panel" id="coachPanelTrending"></div>' +
        '<div class="coach-sb-panel" id="coachPanelHistory"></div>' +
        '</div>' +
        '<div class="coach-sb-status" id="coachStatusBar"></div>' +
        '</aside>'
      );
    },

    buildMainHTML(connected) {
      return (
        '<main class="coach-main">' +
        '<div class="coach-main-header">' +
        '<div class="coach-header-left">' +
        '<button class="coach-toggle-sidebar" id="coachToggleSidebar" title="Toggle sidebar">☰</button>' +
        '<div class="coach-header-info">' +
        '<div class="coach-header-title">AI Coach</div>' +
        '<div class="coach-header-subtitle"><span class="dot"></span> ' +
        (connected ? 'Connected — Live intelligence active' : 'Paper mode — Add API key for full power') +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="coach-header-right">' +
        '<button class="coach-header-btn" id="coachExportBtn" title="Export conversation">📋</button>' +
        '<button class="coach-header-btn" id="coachClearBtn" title="New conversation">🗑</button>' +
        '<button class="coach-header-btn" id="coachSettingsBtn" title="AI Settings">⚙</button>' +
        '</div>' +
        '</div>' +
        '<div class="coach-context-bar" id="coachContextBar"></div>' +
        '<div class="coach-chat-messages" id="coachChatMessages"></div>' +
        '<div class="coach-input-area">' +
        '<div class="coach-input-container">' +
        '<div class="coach-input-wrapper">' +
        '<textarea class="coach-input" id="coachInput" placeholder="Ask anything… or type / for commands" rows="1"></textarea>' +
        '<div class="coach-input-actions">' +
        '<span class="coach-char-count" id="coachCharCount">0</span>' +
        '<button class="coach-input-btn" id="coachVoiceBtn" title="Voice input">🎤</button>' +
        '<button class="coach-send-btn" id="coachSendBtn">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<div class="coach-input-hint">Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line · <kbd>/</kbd> for commands</div>' +
        '</div>' +
        '</div>' +
        '</main>'
      );
    },

    cacheElements() {
      const s = _state.section;
      if (!s) return;
      _state.els = {
        sidebar: s.querySelector('#coachSidebar'),
        toggleSidebar: s.querySelector('#coachToggleSidebar'),
        chatMessages: s.querySelector('#coachChatMessages'),
        input: s.querySelector('#coachInput'),
        sendBtn: s.querySelector('#coachSendBtn'),
        voiceBtn: s.querySelector('#coachVoiceBtn'),
        charCount: s.querySelector('#coachCharCount'),
        contextBar: s.querySelector('#coachContextBar'),
        statusBar: s.querySelector('#coachStatusBar'),
        exportBtn: s.querySelector('#coachExportBtn'),
        clearBtn: s.querySelector('#coachClearBtn'),
        settingsBtn: s.querySelector('#coachSettingsBtn'),
        panelCommands: s.querySelector('#coachPanelCommands'),
        panelIntel: s.querySelector('#coachPanelIntel'),
        panelTrending: s.querySelector('#coachPanelTrending'),
        panelHistory: s.querySelector('#coachPanelHistory'),
      };
    },

    bindEvents() {
      const el = _state.els;

      if (el.sendBtn)
        el.sendBtn.addEventListener('click', function () {
          AICoachPlugin.sendMessage();
        });
      if (el.input) {
        el.input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            AICoachPlugin.sendMessage();
          }
        });
        el.input.addEventListener('input', function () {
          el.input.style.height = 'auto';
          el.input.style.height = Math.min(el.input.scrollHeight, 120) + 'px';
          if (el.charCount) el.charCount.textContent = el.input.value.length;
          if (el.input.value === '/') AICoachPlugin.showCommandPalette();
        });
      }

      if (el.toggleSidebar)
        el.toggleSidebar.addEventListener('click', function () {
          AICoachPlugin.toggleSidebar();
        });

      if (_state.section) {
        _state.section.querySelectorAll('.coach-sb-tab').forEach(function (tab) {
          tab.addEventListener('click', function () {
            AICoachPlugin.switchTab(tab.dataset.tab);
          });
        });
      }

      if (el.exportBtn)
        el.exportBtn.addEventListener('click', function () {
          AICoachPlugin.exportChat();
        });
      if (el.clearBtn)
        el.clearBtn.addEventListener('click', function () {
          AICoachPlugin.clearChat();
        });
      if (el.settingsBtn)
        el.settingsBtn.addEventListener('click', function () {
          window.HuntDrop.navigateTo('section-ai-settings');
        });
      if (el.voiceBtn)
        el.voiceBtn.addEventListener('click', function () {
          AICoachPlugin.toggleVoiceInput();
        });
    },

    renderSidebarPanels() {
      AICoachPlugin.renderCommandsPanel();
      AICoachPlugin.renderIntelPanel();
      AICoachPlugin.renderTrendingPanel();
      AICoachPlugin.renderHistoryPanel();
      AICoachPlugin.renderStatusBar();
    },

    renderCommandsPanel() {
      const el = _state.els.panelCommands;
      if (!el) return;
      const esc = UI.escapeHtml;
      let html =
        '<div class="coach-cmd-search"><input type="text" placeholder="Search commands…" id="coachCmdSearch"></div>';
      Object.keys(COMMANDS).forEach(function (key) {
        const group = COMMANDS[key];
        html += '<div class="coach-cmd-section"><div class="coach-cmd-section-title">' + esc(group.section) + '</div>';
        group.items.forEach(function (item) {
          html +=
            '<div class="coach-cmd-item" data-prompt="' +
            esc(item.prompt) +
            '">' +
            '<div class="coach-cmd-icon">' +
            esc(item.icon) +
            '</div>' +
            '<div class="coach-cmd-info"><div class="coach-cmd-name">' +
            esc(item.name) +
            '</div><div class="coach-cmd-desc">' +
            esc(item.desc) +
            '</div></div>' +
            '<span class="coach-cmd-shortcut">' +
            esc(item.cmd) +
            '</span>' +
            '</div>';
        });
        html += '</div>';
      });
      el.innerHTML = html;

      el.querySelectorAll('.coach-cmd-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const prompt = item.getAttribute('data-prompt');
          if (prompt && prompt !== '__EXPORT__') {
            if (_state.els.input) {
              _state.els.input.value = prompt;
              _state.els.input.focus();
            }
          } else if (prompt === '__EXPORT__') {
            AICoachPlugin.exportChat();
          }
        });
      });

      const searchInput = el.querySelector('#coachCmdSearch');
      if (searchInput) {
        searchInput.addEventListener('input', function () {
          const q = searchInput.value.toLowerCase();
          el.querySelectorAll('.coach-cmd-item').forEach(function (item) {
            const name = (item.querySelector('.coach-cmd-name')?.textContent || '').toLowerCase();
            const desc = (item.querySelector('.coach-cmd-desc')?.textContent || '').toLowerCase();
            const cmd = (item.querySelector('.coach-cmd-shortcut')?.textContent || '').toLowerCase();
            item.style.display =
              !q || name.indexOf(q) > -1 || desc.indexOf(q) > -1 || cmd.indexOf(q) > -1 ? '' : 'none';
          });
        });
      }
    },

    renderIntelPanel() {
      const el = _state.els.panelIntel;
      if (!el) return;
      let html = '';
      INTEL_FEED.forEach(function (intel) {
        html +=
          '<div class="coach-intel-card">' +
          '<div class="coach-intel-header">' +
          '<span class="coach-intel-badge ' +
          intel.badge +
          '">' +
          intel.badge +
          '</span>' +
          '<span class="coach-intel-time">' +
          intel.time +
          ' ago</span>' +
          '</div>' +
          '<div class="coach-intel-title">' +
          intel.title +
          '</div>' +
          '<div class="coach-intel-desc">' +
          intel.desc +
          '</div>' +
          '<div class="coach-intel-actions">' +
          '<button class="coach-intel-action" data-query="' +
          intel.title +
          '">' +
          intel.action +
          '</button>' +
          '</div>' +
          '</div>';
      });
      el.innerHTML = html;

      el.querySelectorAll('.coach-intel-action').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (_state.els.input) {
            _state.els.input.value = 'Research this: ' + btn.getAttribute('data-query');
            AICoachPlugin.sendMessage();
          }
        });
      });
    },

    renderTrendingPanel() {
      const el = _state.els.panelTrending;
      if (!el) return;
      const products = getTrendingProducts();
      let html = '';
      products.forEach(function (p, i) {
        const change = '+' + (Math.floor(Math.random() * 30) + 5) + '%';
        html +=
          '<div class="coach-trending-item" data-prompt="Analyze ' +
          p.title +
          ' — is it worth selling?">' +
          '<div class="coach-trending-rank">#' +
          (i + 1) +
          '</div>' +
          '<div class="coach-trending-info">' +
          '<div class="coach-trending-name">' +
          p.title +
          '</div>' +
          '<div class="coach-trending-meta"><span>' +
          p.platform +
          '</span><span>$' +
          p.price.toFixed(2) +
          '</span><span>' +
          p.margin +
          '% margin</span></div>' +
          '</div>' +
          '<div class="coach-trending-change up">' +
          change +
          '</div>' +
          '</div>';
      });
      el.innerHTML = html;

      el.querySelectorAll('.coach-trending-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const prompt = item.getAttribute('data-prompt');
          if (prompt && _state.els.input) {
            _state.els.input.value = prompt;
            AICoachPlugin.sendMessage();
          }
        });
      });
    },

    renderHistoryPanel() {
      const el = _state.els.panelHistory;
      if (!el) return;
      const history = Config.get('coach.history') || [];
      if (history.length === 0) {
        el.innerHTML =
          '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">No conversation history yet.<br>Start chatting to build your log.</div>';
        return;
      }
      let html = '';
      history
        .slice(-20)
        .reverse()
        .forEach(function (msg) {
          if (msg.role !== 'user') return;
          const time = new Date(msg.time);
          const timeStr =
            time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0');
          html +=
            '<div class="coach-history-item"><span class="coach-history-icon">💬</span><span class="coach-history-text">' +
            UI.escapeHtml(msg.content.substring(0, 50)) +
            (msg.content.length > 50 ? '…' : '') +
            '</span><span class="coach-history-time">' +
            timeStr +
            '</span></div>';
        });
      el.innerHTML = html;
    },

    renderStatusBar() {
      const el = _state.els.statusBar;
      if (!el) return;
      const status = window.HuntDrop.APIKeyManager.getStatus();
      const health = window.HuntDrop.AISystemHealth.getHealthSummary();
      const products = window.HuntDrop.ALL_PRODUCTS || [];
      const history = Config.get('coach.history') || [];
      el.innerHTML =
        '<div class="coach-status-row"><span class="coach-status-label">AI Provider</span><span class="coach-status-value ' +
        (status.connected ? 'connected' : 'disconnected') +
        '">' +
        (status.connected ? status.provider.toUpperCase() : 'NOT SET') +
        '</span></div>' +
        '<div class="coach-status-row"><span class="coach-status-label">Products</span><span class="coach-status-value live">' +
        products.length +
        ' loaded</span></div>' +
        '<div class="coach-status-row"><span class="coach-status-label">Health</span><span class="coach-status-value" style="color:' +
        (health.score >= 80 ? 'var(--accent-green)' : 'var(--accent-yellow)') +
        '">' +
        health.score +
        '/100</span></div>' +
        '<div class="coach-status-row"><span class="coach-status-label">Messages</span><span class="coach-status-value">' +
        history.length +
        '</span></div>';
    },

    updateContextBar() {
      const el = _state.els.contextBar;
      if (!el) return;
      const context = window.HuntDrop.AIContextBuilder.buildFullContext();
      const health = window.HuntDrop.AISystemHealth.getHealthSummary();
      const hc = health.score >= 80 ? '#00ff88' : health.score >= 60 ? '#fbbf24' : '#ff3366';
      el.innerHTML =
        '<div class="coach-ctx-pill"><div class="coach-ctx-ring" style="--progress:' +
        Math.min(100, context.products.length * 10) +
        '%;--ring-color:#00e5ff"><span class="coach-ctx-val">' +
        context.products.length +
        '</span></div><span class="coach-ctx-label">POS</span></div>' +
        '<div class="coach-ctx-pill"><div class="coach-ctx-ring" style="--progress:' +
        Math.min(100, context.userState.viewedProducts.length * 20) +
        '%;--ring-color:#a855f7"><span class="coach-ctx-val">' +
        context.userState.viewedProducts.length +
        '</span></div><span class="coach-ctx-label">WATCH</span></div>' +
        '<div class="coach-ctx-pill"><div class="coach-ctx-ring" style="--progress:' +
        Math.min(100, health.score) +
        '%;--ring-color:' +
        hc +
        '"><span class="coach-ctx-val">' +
        health.score +
        '</span></div><span class="coach-ctx-label">HEALTH</span></div>' +
        '<div class="coach-ctx-pill"><div class="coach-ctx-ring" style="--progress:' +
        Math.min(100, _state.msgCount * 5) +
        '%;--ring-color:#00ff88"><span class="coach-ctx-val">' +
        _state.msgCount +
        '</span></div><span class="coach-ctx-label">MSGS</span></div>';
    },

    updateStatus() {
      AICoachPlugin.updateContextBar();
      AICoachPlugin.renderStatusBar();
    },

    renderWelcome() {
      const el = _state.els.chatMessages;
      if (!el) return;
      const status = window.HuntDrop.APIKeyManager.getStatus();
      const products = window.HuntDrop.ALL_PRODUCTS || [];
      const topProducts = products
        .sort(function (a, b) {
          return b.score - a.score;
        })
        .slice(0, 3);

      let html =
        '<div class="coach-welcome-screen">' +
        '<div class="coach-welcome-hero">' +
        '<div class="coach-welcome-avatar"><div class="coach-avatar-glow"></div><div class="coach-welcome-avatar-main">🤖</div></div>' +
        '<h1 class="coach-welcome-title">Your <span class="highlight">AI Command Center</span></h1>' +
        '<p class="coach-welcome-desc">Search the live web, research products, analyze competitors, detect trends, and get data-driven recommendations — all in one place.</p>' +
        '</div>';

      if (!status.connected) {
        html +=
          '<div class="coach-api-banner"><div class="coach-api-banner-icon">🔑</div><div class="coach-api-banner-text"><strong>Paper Trading Mode</strong> — Add your AI API key in Strategy → AI Settings for live web search, real-time analysis, and full AI power.</div><button class="coach-api-banner-btn" onclick="window.HuntDrop.navigateTo(\'section-ai-settings\')">CONFIGURE</button></div>';
      }

      html += '<div class="coach-capability-grid">';
      CAPABILITIES.forEach(function (cap) {
        html +=
          '<div class="coach-cap-card" data-prompt="' +
          UI.escapeHtml(cap.prompt) +
          '"><div class="coach-cap-icon-wrap ' +
          cap.color +
          '">' +
          cap.icon +
          '</div><div class="coach-cap-title">' +
          UI.escapeHtml(cap.title) +
          '</div><div class="coach-cap-desc">' +
          UI.escapeHtml(cap.desc) +
          '</div></div>';
      });
      html += '</div>';

      if (topProducts.length > 0) {
        html +=
          '<div class="coach-top-products"><div class="coach-top-label">// TOP PRODUCTS IN YOUR CATALOG</div><div class="coach-top-list">';
        topProducts.forEach(function (p) {
          const sc = p.score >= 80 ? '#00ff88' : p.score >= 60 ? '#00e5ff' : '#fbbf24';
          html +=
            '<div class="coach-top-item" data-prompt="Give me a full analysis of ' +
            UI.escapeHtml(p.title) +
            ' — should I sell it?"><div class="coach-top-score" style="color:' +
            sc +
            '">' +
            p.score +
            '</div><div class="coach-top-info"><div class="coach-top-name">' +
            UI.escapeHtml(p.title) +
            '</div><div class="coach-top-meta">' +
            UI.escapeHtml(p.platform) +
            ' · ' +
            p.margin +
            '% margin · ' +
            p.competition +
            '</div></div><div class="coach-top-arrow">»</div></div>';
        });
        html += '</div></div>';
      }
      html += '</div>';
      el.innerHTML = html;

      el.querySelectorAll('.coach-cap-card, .coach-top-item').forEach(function (card) {
        card.addEventListener('click', function () {
          const prompt = card.getAttribute('data-prompt');
          if (prompt && _state.els.input) {
            _state.els.input.value = prompt;
            AICoachPlugin.sendMessage();
          }
        });
      });
    },

    async sendMessage() {
      if (_state.processing) return;
      const input = _state.els.input;
      const text = input ? input.value.trim() : '';
      if (!text) return;

      if (text === '/export') {
        AICoachPlugin.exportChat();
        input.value = '';
        return;
      }
      if (text === '/clear') {
        AICoachPlugin.clearChat();
        input.value = '';
        return;
      }

      _state.processing = true;
      _state.msgCount++;

      const el = _state.els.chatMessages;
      const welcome = el ? el.querySelector('.coach-welcome-screen') : null;
      if (welcome) welcome.remove();

      AICoachPlugin.addMessage('user', text);
      if (input) {
        input.value = '';
        input.style.height = 'auto';
        if (_state.els.charCount) _state.els.charCount.textContent = '0';
      }
      AICoachPlugin.saveToHistory('user', text);

      const needsSearch = AICoachPlugin.detectWebSearch(text);
      await AICoachPlugin.showTyping(needsSearch);

      const history = Config.get('coach.history') || [];
      let result;
      try {
        if (needsSearch) {
          result = await AICoachPlugin.processWithWebSearch(text, history);
        } else {
          result = await window.HuntDrop.AIChatService.searchAndRespond(text, history);
        }
      } catch (aiErr) {
        console.error('[AICoach] AI call failed:', aiErr);
        result = {
          response:
            'I encountered an error processing your request. Please check your API key in AI Settings and try again.',
          provider: 'error',
        };
      }

      AICoachPlugin.removeTyping();
      AICoachPlugin.renderCoachResponse(result, text);
      AICoachPlugin.saveToHistory('assistant', result.response || '');
      AICoachPlugin.updateStatus();
      AICoachPlugin.showSuggestions(text, result);
      _state.processing = false;
    },

    detectWebSearch(text) {
      const lower = text.toLowerCase();
      const cmdTriggers = [
        '/search',
        '/product',
        '/trend',
        '/competitor',
        '/price',
        '/market',
        '/supplier',
        '/seo',
        '/social',
        '/niche',
      ];
      const triggers = [
        'search',
        'find',
        'look up',
        'research',
        'check',
        'verify',
        'price',
        'cost',
        'buy',
        'trending',
        'viral',
        'competitor',
        'market',
        'compare',
        'supplier',
        'review',
        'latest',
        'current',
        'now',
        'today',
        '2025',
        '2026',
        'live',
        'real-time',
        'google',
        'web',
        'internet',
        'online',
      ];
      for (let i = 0; i < cmdTriggers.length; i++) {
        if (lower.indexOf(cmdTriggers[i]) > -1) return true;
      }
      for (let j = 0; j < triggers.length; j++) {
        if (lower.indexOf(triggers[j]) > -1) return true;
      }
      return false;
    },

    async processWithWebSearch(text, history) {
      let searchResult = null;
      try {
        searchResult = await window.HuntDrop.AIWebSearch.search(text, 6);
      } catch {
        /* ignored */
      }

      const featureKey = await window.HuntDrop.APIKeyManager.getFeatureKey('ai-business-coach');
      const provider = featureKey.provider;
      const key = featureKey.key;

      if (!key) {
        return {
          success: true,
          response: AICoachPlugin.buildFallbackWithSearch(text, searchResult),
          provider: 'fallback',
          webResults: searchResult,
        };
      }

      const result = await window.HuntDrop.AIChatService.searchAndRespond(text, history);
      result.webResults = searchResult;
      return result;
    },

    buildFallbackWithSearch(query, searchResult) {
      const products = window.HuntDrop.ALL_PRODUCTS || [];
      const lower = query.toLowerCase();
      let matchedProduct = null;
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (
          lower.indexOf(p.title.toLowerCase().substring(0, 15)) > -1 ||
          p.keywords.some(function (k) {
            return lower.indexOf(k.toLowerCase()) > -1;
          })
        ) {
          matchedProduct = p;
          break;
        }
      }

      let response = '';
      if (searchResult && searchResult.results && searchResult.results.length > 0) {
        response += '## 🌐 Web Search Results\n\n';
        if (searchResult.answer) response += '**Quick Answer:** ' + searchResult.answer + '\n\n';
        response += 'I found ' + searchResult.results.length + ' results:\n\n';
        searchResult.results.slice(0, 3).forEach(function (r, i) {
          response += i + 1 + '. **' + r.title + '**\n   ' + r.content.substring(0, 120) + '…\n\n';
        });
        response += '---\n';
      }

      if (matchedProduct) {
        response += '## 📦 Product Intelligence\n\n**' + matchedProduct.title + '**\n\n';
        response +=
          '- **Score:** ' +
          matchedProduct.score +
          '/100\n- **Price:** $' +
          matchedProduct.price.toFixed(2) +
          ' (margin: ' +
          matchedProduct.margin +
          '%)\n';
        response +=
          '- **Competition:** ' +
          matchedProduct.competition +
          '\n- **Risk Score:** ' +
          matchedProduct.riskScore +
          '/100\n';
        response += '- **Sales Velocity:** ' + matchedProduct.salesVelocity + '/mo\n\n';
        response +=
          '**Verdict:** ' +
          (matchedProduct.score >= 80 ? '✅ PROCEED' : matchedProduct.score >= 60 ? '⚠️ CAUTION' : '❌ RECONSIDER') +
          '\n\n';
      }

      if (!searchResult && !matchedProduct) response = AICoachPlugin.getSmartFallback(query);
      if (searchResult && searchResult.fallback)
        response +=
          '\n💡 Add a web search API key in AI Settings for live results. Supports Tavily, Serper, and Brave Search.';
      response += '\n\n💡 For full AI analysis: add your API key in Strategy → AI Settings.';
      return response;
    },

    getSmartFallback(query) {
      const lower = query.toLowerCase();
      const products = window.HuntDrop.ALL_PRODUCTS || [];

      if (lower.indexOf('trend') > -1) {
        const trending = products
          .sort(function (a, b) {
            return b.salesVelocity - a.salesVelocity;
          })
          .slice(0, 3);
        let resp = '## 📈 Trending Products\n\n';
        trending.forEach(function (p, i) {
          resp += i + 1 + '. **' + p.title + '** — ' + p.salesVelocity + ' sales/mo, ' + p.margin + '% margin\n';
        });
        resp += '\nUse **Niche Radar** and **Market Gap Finder** for deeper analysis.';
        return resp;
      }
      if (lower.indexOf('budget') > -1 || lower.indexOf('invest') > -1) {
        return '## 💰 Budget Strategy\n\n- **40% Ads** — Testing campaigns\n- **35% Inventory** — Samples + stock\n- **15% Tools** — Store, domain\n- **10% Reserve** — Emergency\n\nFor $500: Pick 1-2 products (score>80), test $200 in ads, keep $125 for scaling winners.\n\nUse **Budget Planner** for detailed allocation.';
      }
      if (lower.indexOf('ad') > -1 || lower.indexOf('campaign') > -1) {
        return '## 📢 Ad Strategy\n\n**Why ads fail:** Creative hook (40%), Audience mismatch (25%), Pricing (20%), Landing page (15%)\n\n**Action:** Test 3 variations at $10/day. Kill after 3 days if CPA>$5.\n\nUse **Ad Studio** for platform-specific copy.';
      }
      return '## What I Can Help With\n\n- 🔍 Web Search — Search the live web\n- 📦 Product Research — Deep-dive any product\n- ⚔️ Competitor Analysis — Spy on competitors\n- 📈 Trend Detection — Find what\'s trending\n- 💰 Price Intelligence — Compare across platforms\n- 🧠 Market Analysis — Evaluate opportunities\n- 📢 Ad Strategy — Create campaigns\n- 🏭 Supplier Verification — Check reliability\n\nTry: *"Search the web for trending products in 2025"*';
    },

    renderCoachResponse(result, _originalQuery) {
      const response = result.response || 'I had trouble processing that. Please try again.';
      const webResults = result.webResults || null;
      const hasWebData = webResults && webResults.results && webResults.results.length > 0;

      let html = '';
      if (hasWebData) html += AICoachPlugin.buildWebResultsCard(webResults);
      html += formatResponse(response);

      let badges = '<span class="coach-msg-badge">AI</span>';
      if (hasWebData) badges += ' <span class="coach-msg-badge web">WEB</span>';
      if (result.provider && result.provider !== 'fallback')
        badges += ' <span class="coach-msg-badge tool">' + result.provider.toUpperCase() + '</span>';

      AICoachPlugin.addMessageRaw('coach', html, badges);
    },

    buildWebResultsCard(webResults) {
      let html =
        '<div class="coach-web-results"><div class="coach-web-header"><span class="coach-web-header-icon">🌐</span><span class="coach-web-header-title">Live Web Results</span><span class="coach-web-header-count">' +
        webResults.results.length +
        ' results</span></div>';
      if (webResults.answer)
        html +=
          '<div class="coach-web-answer"><strong>AI Summary:</strong> ' + UI.escapeHtml(webResults.answer) + '</div>';
      webResults.results.slice(0, 5).forEach(function (r) {
        let domain = '';
        try {
          domain = new URL(r.url).hostname.replace('www.', '');
        } catch {
          domain = r.url;
        }
        html +=
          '<div class="coach-web-result" data-url="' +
          UI.escapeHtml(r.url) +
          '"><div class="coach-web-result-title"><span class="web-icon">🔗</span> ' +
          UI.escapeHtml(r.title || 'Untitled') +
          '</div><div class="coach-web-result-url">' +
          UI.escapeHtml(domain) +
          '</div><div class="coach-web-result-snippet">' +
          UI.escapeHtml((r.content || '').substring(0, 150)) +
          '…</div></div>';
      });
      html += '</div>';
      return html;
    },

    showSuggestions(originalQuery) {
      const el = _state.els.chatMessages;
      if (!el) return;
      const lower = originalQuery.toLowerCase();
      let suggestions;
      if (lower.indexOf('trend') > -1)
        suggestions = [
          'Research the top trending product',
          'Check competition for this niche',
          'Find suppliers for trending items',
          'Create ad strategy for trends',
        ];
      else if (lower.indexOf('competitor') > -1)
        suggestions = [
          'Check their pricing strategy',
          'Analyze their ad creatives',
          'Find their top-selling products',
          'Research their suppliers',
        ];
      else if (lower.indexOf('price') > -1)
        suggestions = [
          'Calculate profit margins',
          'Find cheaper suppliers',
          'Compare across all platforms',
          'Set up price alerts',
        ];
      else if (lower.indexOf('product') > -1 || lower.indexOf('sell') > -1)
        suggestions = [
          'Analyze competition level',
          'Check supplier reliability',
          'Create ad campaign',
          'Forecast monthly revenue',
        ];
      else
        suggestions = [
          'Search the web for trends',
          'Analyze top product',
          'Check competitor pricing',
          'Find new niches',
        ];

      let sugHtml =
        '<div style="max-width:820px;margin:0 auto;width:100%;padding:0 4px;"><div class="coach-suggestions">';
      suggestions.forEach(function (s) {
        sugHtml += '<button class="coach-suggestion" data-prompt="' + s + '">' + s + '</button>';
      });
      sugHtml += '</div></div>';

      const wrapper = document.createElement('div');
      wrapper.innerHTML = sugHtml;
      const sugEl = wrapper.firstChild;
      el.appendChild(sugEl);

      sugEl.querySelectorAll('.coach-suggestion').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const prompt = btn.getAttribute('data-prompt');
          if (prompt && _state.els.input) {
            _state.els.input.value = prompt;
            AICoachPlugin.sendMessage();
          }
          sugEl.remove();
        });
      });
      el.scrollTop = el.scrollHeight;
    },

    addMessage(role, text) {
      const el = _state.els.chatMessages;
      if (!el) return;
      const msg = document.createElement('div');
      msg.className = 'coach-msg coach-msg-' + role;
      if (role === 'coach') {
        msg.innerHTML =
          '<div class="coach-msg-avatar-wrap"><div class="coach-msg-avatar">🤖</div><div class="coach-msg-status"></div></div><div class="coach-msg-body"><div class="coach-msg-content">' +
          formatResponse(text) +
          '</div><div class="coach-msg-meta"><span class="coach-msg-time">' +
          getTime() +
          '</span><span class="coach-msg-badge">AI</span><button class="coach-msg-copy" onclick="navigator.clipboard.writeText(this.closest(\'.coach-msg\').querySelector(\'.coach-msg-content\').innerText)">Copy</button></div></div>';
      } else {
        msg.innerHTML =
          '<div class="coach-msg-avatar-wrap"><div class="coach-msg-avatar">👤</div></div><div class="coach-msg-body"><div class="coach-msg-content user-bubble">$ ' +
          UI.escapeHtml(text) +
          '</div><div class="coach-msg-meta user-meta"><span class="coach-msg-time">' +
          getTime() +
          '</span><span class="coach-msg-check">✓</span></div></div>';
      }
      el.appendChild(msg);
      el.scrollTop = el.scrollHeight;
    },

    /**
     * Adds a raw HTML message to the chat. This function should ONLY be called
     * with trusted content — never pass user input directly as htmlContent.
     */
    addMessageRaw(role, htmlContent, badges) {
      const el = _state.els.chatMessages;
      if (!el) return;
      const msg = document.createElement('div');
      msg.className = 'coach-msg coach-msg-' + role;
      msg.innerHTML =
        '<div class="coach-msg-avatar-wrap"><div class="coach-msg-avatar">🤖</div><div class="coach-msg-status"></div></div><div class="coach-msg-body"><div class="coach-msg-content">' +
        htmlContent +
        '</div><div class="coach-msg-meta"><span class="coach-msg-time">' +
        getTime() +
        '</span>' +
        (badges || '') +
        '<button class="coach-msg-copy" onclick="navigator.clipboard.writeText(this.closest(\'.coach-msg\').querySelector(\'.coach-msg-content\').innerText)">Copy</button></div></div>';
      el.appendChild(msg);
      el.scrollTop = el.scrollHeight;
      msg.querySelectorAll('.coach-web-result[data-url]').forEach(function (card) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function () {
          const url = card.getAttribute('data-url');
          if (url) window.open(url, '_blank');
        });
      });
    },

    async showTyping(withSearch) {
      const el = _state.els.chatMessages;
      if (!el) return;
      const stages = withSearch ? TYPING_STAGES : TYPING_STAGES.slice(0, 2);
      for (let i = 0; i < stages.length; i++) {
        AICoachPlugin.removeTyping();
        const stage = stages[i];
        const typing = document.createElement('div');
        typing.className = 'coach-msg coach-msg-coach coach-typing-msg';
        typing.id = 'coachTyping';
        typing.innerHTML =
          '<div class="coach-msg-avatar-wrap"><div class="coach-msg-avatar">🤖</div></div><div class="coach-msg-body"><div class="coach-typing-card"><div class="coach-typing-icon">' +
          UI.escapeHtml(stage.icon) +
          '</div><div class="coach-typing-text">' +
          UI.escapeHtml(stage.text) +
          '</div><div class="coach-typing-dots"><span></span><span></span><span></span></div></div></div>';
        el.appendChild(typing);
        el.scrollTop = el.scrollHeight;
        await delay(400 + Math.random() * 300);
      }
    },

    removeTyping() {
      const typing = document.getElementById('coachTyping');
      if (typing) typing.remove();
    },

    toggleSidebar() {
      const sidebar = _state.els.sidebar;
      if (!sidebar) return;
      _state.sidebarOpen = !_state.sidebarOpen;
      sidebar.classList.toggle('collapsed', !_state.sidebarOpen);
    },

    switchTab(tab) {
      _state.activeTab = tab;
      if (!_state.section) return;
      _state.section.querySelectorAll('.coach-sb-tab').forEach(function (t) {
        t.classList.toggle('active', t.dataset.tab === tab);
      });
      _state.section.querySelectorAll('.coach-sb-panel').forEach(function (p) {
        p.classList.remove('active');
      });
      const panelMap = {
        commands: 'coachPanelCommands',
        intel: 'coachPanelIntel',
        trending: 'coachPanelTrending',
        history: 'coachPanelHistory',
      };
      const panel = _state.section.querySelector('#' + panelMap[tab]);
      if (panel) panel.classList.add('active');
    },

    exportChat() {
      const history = Config.get('coach.history') || [];
      if (history.length === 0) {
        UI.toast('No conversation to export', 'warning');
        return;
      }
      let md = '# HuntDrop AI Coach — Conversation Export\n# Date: ' + new Date().toLocaleString() + '\n\n---\n\n';
      history.forEach(function (msg) {
        md +=
          '### ' +
          (msg.role === 'user' ? '👤 You' : '🤖 AI Coach') +
          ' — ' +
          new Date(msg.time).toLocaleTimeString() +
          '\n\n' +
          msg.content +
          '\n\n---\n\n';
      });
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'huntdrop-coach-export-' + Date.now() + '.md';
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('Conversation exported!', 'success');
    },

    clearChat() {
      Config.set('coach.history', []);
      _state.msgCount = 0;
      const el = _state.els.chatMessages;
      if (el) el.innerHTML = '';
      AICoachPlugin.renderWelcome();
      AICoachPlugin.updateStatus();
      UI.toast('Conversation cleared', 'info');
    },

    toggleVoiceInput() {
      const btn = _state.els.voiceBtn;
      const input = _state.els.input;
      if (!btn || !input) return;
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        UI.toast('Voice input not supported', 'warning');
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (_state.recognition) {
        _state.recognition.stop();
        _state.recognition = null;
        btn.classList.remove('recording');
        return;
      }
      _state.recognition = new SpeechRecognition();
      _state.recognition.continuous = false;
      _state.recognition.interimResults = true;
      _state.recognition.lang = 'en-US';
      _state.recognition.onstart = function () {
        btn.classList.add('recording');
        UI.toast('Listening…', 'info');
      };
      _state.recognition.onresult = function (e) {
        let t = '';
        for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
        input.value = t;
      };
      _state.recognition.onend = function () {
        btn.classList.remove('recording');
        _state.recognition = null;
      };
      _state.recognition.onerror = function (e) {
        btn.classList.remove('recording');
        _state.recognition = null;
        if (e.error !== 'no-speech') UI.toast('Voice error: ' + e.error, 'warning');
      };
      _state.recognition.start();
    },

    showCommandPalette() {
      AICoachPlugin.switchTab('commands');
      if (!_state.sidebarOpen) AICoachPlugin.toggleSidebar();
      const si = _state.section ? _state.section.querySelector('#coachCmdSearch') : null;
      if (si) si.focus();
    },

    saveToHistory(role, content) {
      let history = Config.get('coach.history') || [];
      history.push({ role: role, content: content, time: Date.now() });
      if (history.length > 100) history = history.slice(-100);
      Config.set('coach.history', history);
      AICoachPlugin.renderHistoryPanel();
    },
  };

  PluginRegistry.register('ai-business-coach', AICoachPlugin);
})();
