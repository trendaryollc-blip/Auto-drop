// ============================================================================
// HUNTDROP APP — Main Orchestrator
// ============================================================================
// This file wires everything together using the core system.
// Plugins are loaded and initialized here.
// ============================================================================
(function () {
  'use strict';

  const { EventBus, PluginRegistry, Config, DataLayer, UI, FeatureFlags, Router } = window.HuntDrop;

  // ===== HTML Escape Utility =====
  const escapeHtml = UI.escapeHtml;

  // ===== Safe DOM Helpers — prevent XSS via innerHTML =====
  function safeSetText(el, text) {
    if (el) el.textContent = text;
  }
  function safeSetHTML(el, trustedHtml) {
    if (el) el.innerHTML = trustedHtml;
  }
  function safeCreateElement(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'textContent' || k === 'innerText') el[k] = attrs[k];
        else if (k === 'className') el.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(el.style, attrs[k]);
        else if (k.startsWith('on') && typeof attrs[k] === 'function')
          el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else el.setAttribute(k, attrs[k]);
      });
    }
    return el;
  }
  // Override UI.toast to escape message by default
  const _origToast = UI.toast;
  UI.toast = function (msg, type, duration) {
    if (typeof msg === 'string') msg = escapeHtml(msg);
    _origToast.call(UI, msg, type, duration);
  };

  // ===== Consistent Error Logging =====
  function _logError(context, e) {
    console.warn('[HuntDrop] ' + context + ':', e);
  }

  // NOTE: DataLayer.searchAll uses parallel execution natively (defined in core.js).
  // No monkey-patching needed.

  // ===== Debounce Utility =====
  function debounce(fn, delay) {
    let timer;
    function debounced() {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, delay);
    }
    debounced.cancel = function () {
      clearTimeout(timer);
      timer = null;
    };
    return debounced;
  }

  // ===== Chart.js Fallback Guard =====
  if (typeof Chart === 'undefined') {
    const _noop = function () {};
    const _noopReturn = function (v) {
      return v;
    };
    const ChartStub = function () {
      return {
        destroy: _noop,
        update: _noop,
        resize: _noop,
        render: _noop,
        toBase64Image: _noopReturn,
        reset: _noop,
        stop: _noop,
        start: _noop,
        data: { datasets: [], labels: [] },
        options: {},
        config: {},
      };
    };
    ChartStub.prototype = {};
    ChartStub.defaults = { color: '#555', font: {}, scale: {}, plugins: {} };
    ChartStub.getChart = function () {
      return null;
    };
    ChartStub.register = _noop;
    ChartStub.unregister = _noop;
    window.Chart = ChartStub;
    console.warn('[HuntDrop] Chart.js not loaded. Charts will be disabled.');
  }

  // ===== Global Error Handlers =====
  window.onerror = function (msg, url, line, col, error) {
    console.error('[HuntDrop] Uncaught error:', msg, 'at', url + ':' + line);
    showErrorBanner('JavaScript Error', msg + ' at ' + (url || '').split('/').pop() + ':' + line);
    return false;
  };
  window.addEventListener('unhandledrejection', function (e) {
    console.error('[HuntDrop] Unhandled promise rejection:', e.reason);
    showErrorBanner('Promise Error', (e.reason && e.reason.message) || 'An async operation failed');
    e.preventDefault();
  });

  // ===== Default Config =====
  Config.defaults('app', {
    name: 'HuntDrop AI',
    version: '3.0.0',
    defaultSection: 'dashboard',
  });
  Config.defaults('search', {
    platforms: [
      'all',
      'aliexpress',
      'amazon',
      'shopify',
      'ebay',
      'temu',
      'tiktok',
      'etsy',
      'cjdropshipping',
      'dhgate',
      'wish',
    ],
    defaultPlatform: 'all',
    sortBy: 'score',
  });

  // ===== localStorage Persistence with Size Limits =====
  const LS_MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
  const LS_PREFIX = 'huntdrop_';

  function safeSetItem(key, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      let totalSize = 0;
      const huntDropEntries = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(LS_PREFIX) === 0) {
          const itemSize = (localStorage.getItem(k) || '').length * 2;
          totalSize += itemSize;
          // Track entry size and key for age-based eviction
          huntDropEntries.push({ key: k, size: itemSize });
        }
      }
      if (totalSize + stringValue.length * 2 > LS_MAX_SIZE) {
        // FIX #17: Evict by age — most entries contain timestamps in JSON
        // Sort: non-critical keys first (recent searches, then old state), preserve critical keys last
        const criticalKeys = ['huntdrop_state', 'huntdrop_theme', 'huntdrop_welcome_dismissed'];
        const orderedEntries = huntDropEntries.filter(function (e) {
          return e.key !== key;
        });
        orderedEntries.sort(function (a, b) {
          const aCrit = criticalKeys.indexOf(a.key) !== -1;
          const bCrit = criticalKeys.indexOf(b.key) !== -1;
          if (aCrit && !bCrit) return 1; // critical keys last
          if (!aCrit && bCrit) return -1; // non-critical first
          return a.size - b.size; // smaller entries first within same priority
        });
        const spaceNeeded = totalSize + stringValue.length * 2 - LS_MAX_SIZE;
        let freed = 0;
        for (let r = 0; r < orderedEntries.length && freed < spaceNeeded; r++) {
          freed += orderedEntries[r].size;
          localStorage.removeItem(orderedEntries[r].key);
        }
      }
      localStorage.setItem(key, stringValue);
    } catch (e) {
      /* quota exceeded or other error */
    }
  }

  function safeGetItem(key, fallback) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : fallback || null;
    } catch (e) {
      return fallback || null;
    }
  }

  function loadPersistedState() {
    const saved = safeGetItem('huntdrop_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.search) Config.set('search', Object.assign(Config.get('search') || {}, state.search));
        if (state.lastSection) Config.set('app.currentSection', state.lastSection);
      } catch (e) {}
    }
  }
  function persistState() {
    try {
      const state = {
        search: {
          lastQuery: Config.get('search.lastQuery', ''),
          defaultPlatform: Config.get('search.defaultPlatform', 'all'),
          sortBy: Config.get('search.sortBy', 'score'),
        },
        lastSection: Config.get('app.currentSection', 'section-dashboard'),
      };
      safeSetItem('huntdrop_state', state);
    } catch (e) {
      /* silently fail on unload */
    }
  }
  loadPersistedState();
  window.addEventListener('beforeunload', persistState);

  // ===== Feature Flags =====
  FeatureFlags.register('darkMode', true);
  FeatureFlags.register('aiAnalysis', true);
  FeatureFlags.register('adStudio', true);
  FeatureFlags.register('profitCalc', true);

  // ===== Navigation History =====
  window.HuntDrop._navHistory = [];
  window.HuntDrop._navMaxHistory = 20;
  let _navSetup = false;

  // ===== Plugin Lifecycle on Navigation =====
  function _getPluginsForSection(sectionId) {
    const section = document.getElementById(sectionId);
    const suffix = sectionId.replace('section-', '');
    const isCritical = function (p) {
      return CRITICAL_PLUGINS.indexOf('plugins/' + p.id + '.js') !== -1;
    };
    if (!section) {
      return PluginRegistry.getAll().filter(function (p) {
        return !isCritical(p) && (p.id === suffix || sectionId === 'section-' + p.id);
      });
    }
    return PluginRegistry.getAll().filter(function (p) {
      return !isCritical(p) && ((p._mounted && section.querySelector('#' + p.id)) || section.id === 'section-' + p.id);
    });
  }

  async function _unmountSectionPlugins(sectionId) {
    const plugins = _getPluginsForSection(sectionId);
    for (let i = 0; i < plugins.length; i++) {
      try {
        await PluginRegistry.unmount(plugins[i].id);
      } catch (e) {
        _logError('unmountSectionPlugins:' + plugins[i].id, e);
      }
    }
  }

  async function _mountSectionPlugins(sectionId) {
    const plugins = _getPluginsForSection(sectionId);
    for (let i = 0; i < plugins.length; i++) {
      if (!plugins[i]._mounted) {
        try {
          await PluginRegistry.mount(plugins[i].id);
        } catch (e) {
          _logError('mountSectionPlugins:' + plugins[i].id, e);
        }
      }
    }
  }

  window.HuntDrop.navigateTo = async function (sectionId, skipHistory) {
    const current = Config.get('app.currentSection', 'section-dashboard');
    if (current && current !== sectionId) {
      if (!skipHistory) {
        window.HuntDrop._navHistory.push(current);
        if (window.HuntDrop._navHistory.length > window.HuntDrop._navMaxHistory) {
          window.HuntDrop._navHistory.shift();
        }
      }
      await _unmountSectionPlugins(current);
    }
    document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) {
      target.classList.add('active');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    Config.set('app.currentSection', sectionId);
    Config.set('app.currentSectionId', sectionId);
    persistState();
    const name = sectionId.replace('section-', '');
    // Update sidebar active state
    document.querySelectorAll('.sidebar-item, .sidebar-dashboard').forEach((l) => l.classList.remove('active'));
    document.querySelectorAll('[data-section]').forEach((l) => {
      if (l.dataset.section === name) l.classList.add('active');
    });
    // Auto-expand the category containing the active item in sidebar
    const activeItem = document.querySelector('.sidebar-item.active');
    if (activeItem) {
      const cat = activeItem.closest('.sidebar-cat');
      if (cat) cat.classList.add('open');
    }
    window.HuntDrop._updateSidebarActive = function (sectionId) {
      const n = (sectionId || '').replace('section-', '');
      document.querySelectorAll('.sidebar-item, .sidebar-dashboard').forEach((l) => l.classList.remove('active'));
      document.querySelectorAll('[data-section]').forEach((l) => {
        if (l.dataset.section === n) l.classList.add('active');
      });
      const ai = document.querySelector('.sidebar-item.active');
      if (ai) {
        const c = ai.closest('.sidebar-cat');
        if (c) c.classList.add('open');
      }
    };
    window.HuntDrop._updateBackBtn();
    // Lazy-load plugin scripts for the section, then mount them
    await loadPluginsForSection(sectionId);
    await _mountSectionPlugins(sectionId);
    // Re-check: plugin mount() may have dynamically created the section element
    const targetAfterMount = document.getElementById(sectionId);
    if (targetAfterMount && !targetAfterMount.classList.contains('active')) {
      document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
      targetAfterMount.classList.add('active');
    }
  };

  window.HuntDrop.goBack = function () {
    if (window.HuntDrop._navHistory.length === 0) return;
    const prev = window.HuntDrop._navHistory.pop();
    window.HuntDrop.navigateTo(prev, true);
  };

  window.HuntDrop._updateBackBtn = function () {
    const btn = document.getElementById('navBackBtn');
    if (btn) {
      btn.style.display = window.HuntDrop._navHistory.length > 0 ? 'flex' : 'none';
    }
  };

  // ===== Navigation =====
  function setupNavigation() {
    // Helper to navigate to a section (pushes to history)
    function navigateToSection(section) {
      window.HuntDrop.navigateTo('section-' + section);
    }

    // Only bind these once (use a flag)
    if (_navSetup) return;
    _navSetup = true;

    // Logo keyboard support (Enter/Space)
    const logoEl = document.querySelector('.logo');
    if (logoEl) {
      logoEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.HuntDrop.navigateTo('section-dashboard');
        }
      });
    }

    // Credits badge keyboard support (Enter/Space)
    const creditsEl = document.querySelector('.credits-badge');
    if (creditsEl) {
      creditsEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.HuntDrop.navigateTo('section-settings');
        }
      });
    }

    // Sidebar navigation: click delegation on sidebar items
    const sidebarNav = document.getElementById('sidebarNav');
    if (sidebarNav) {
      sidebarNav.addEventListener('click', (e) => {
        const item = e.target.closest('[data-section]');
        if (item) {
          e.preventDefault();
          navigateToSection(item.dataset.section);
          // On mobile, close sidebar after selection
          const sidebar = document.getElementById('appSidebar');
          if (sidebar && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
            const backdrop = document.querySelector('.sidebar-backdrop');
            if (backdrop) backdrop.classList.remove('visible');
          }
        }
      });
    }

    // Sidebar toggle buttons
    const sidebarToggle = document.getElementById('sidebarToggle');
    const navSidebarToggle = document.getElementById('navSidebarToggle');
    function toggleSidebar() {
      const sidebar = document.getElementById('appSidebar');
      if (!sidebar) return;
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        sidebar.classList.toggle('mobile-open');
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (backdrop) backdrop.classList.toggle('visible', sidebar.classList.contains('mobile-open'));
      } else {
        sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed', sidebar.classList.contains('collapsed'));
        try {
          localStorage.setItem('huntdrop_sidebar_collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
        } catch (e) {}
      }
    }
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (navSidebarToggle) navSidebarToggle.addEventListener('click', toggleSidebar);

    // Mobile sidebar backdrop click to close
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('sidebar-backdrop')) {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.classList.remove('mobile-open');
        e.target.classList.remove('visible');
      }
    });

    // Restore sidebar state from localStorage
    try {
      if (localStorage.getItem('huntdrop_sidebar_collapsed') === '1' && window.innerWidth > 768) {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) {
          sidebar.classList.add('collapsed');
          document.body.classList.add('sidebar-collapsed');
        }
      }
    } catch (e) {}

    // Sidebar click expand (expanded mode): categories unfold/toggle on click
    const sidebarCats = document.querySelectorAll('.sidebar-cat');
    sidebarCats.forEach((cat) => {
      const header = cat.querySelector('.sidebar-cat-header');
      if (!header) return;
      header.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sidebar = document.getElementById('appSidebar');
        if (sidebar && sidebar.classList.contains('collapsed')) return;
        const isOpen = cat.classList.contains('open');
        cat.classList.toggle('open', !isOpen);
      });
    });

    // Sidebar collapsed flyout: hover on category icons shows submenu
    setupSidebarFlyout();

    // Command palette (Ctrl+K)
    setupCommandPalette();

    // Quick tools card clicks (event delegation on the categories container)
    const qtCategories = document.querySelector('.qt-categories');
    if (qtCategories) {
      qtCategories.addEventListener('click', (e) => {
        const card = e.target.closest('.qt-card[data-section]');
        if (card) {
          e.preventDefault();
          navigateToSection(card.dataset.section);
        }
      });
    }

    // Quick tools tab filtering (show/hide category groups)
    const qtTabs = document.querySelector('.quick-tools-tabs');
    if (qtTabs) {
      qtTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.qt-tab');
        if (!tab) return;
        document.querySelectorAll('.qt-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.cat;
        document.querySelectorAll('.qt-category').forEach((group) => {
          if (cat === 'all' || group.dataset.cat === cat) {
            group.classList.add('qt-visible');
          } else {
            group.classList.remove('qt-visible');
          }
        });
      });
    }

    // KPI card clicks — navigate to linked sections or scroll to dashboard anchors
    const kpiBar = document.querySelector('.kpi-bar');
    if (kpiBar) {
      kpiBar.addEventListener('click', (e) => {
        const card = e.target.closest('.kpi-card[data-section]');
        if (!card) return;
        e.preventDefault();
        // If this KPI card links to search but specifies a platform, pre-filter it
        if (card.dataset.section === 'section-search' && card.dataset.platform) {
          const plat = card.dataset.platform;
          const platSelect = document.getElementById('platformSelect') || document.getElementById('searchPagePlatform');
          if (platSelect) platSelect.value = plat;
          const input = document.getElementById('searchPageInput') || document.getElementById('searchInput');
          if (input) input.value = '';
          if (window.HuntDrop) {
            window.HuntDrop.navigateTo('section-search');
          }
          return;
        }
        // Scroll-to behavior (stay on dashboard but scroll to element)
        if (card.dataset.scrollTo) {
          const target = document.getElementById(card.dataset.scrollTo);
          if (target) {
            // Ensure dashboard section is active
            if (window.HuntDrop) {
              window.HuntDrop.navigateTo('section-dashboard');
            }
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
        // Standard section navigation
        navigateToSection(card.dataset.section.replace('section-', ''));
      });
    }
  }

  // ===== Sidebar Flyout (collapsed mode) =====
  function setupSidebarFlyout() {
    const sidebar = document.getElementById('appSidebar');
    const flyout = document.getElementById('sidebarFlyout');
    if (!sidebar || !flyout) return;

    let flyoutTimeout = null;
    const cats = sidebar.querySelectorAll('.sidebar-cat');

    cats.forEach((cat) => {
      const header = cat.querySelector('.sidebar-cat-header');
      if (!header) return;

      header.addEventListener('mouseenter', () => {
        if (!sidebar.classList.contains('collapsed')) return;
        clearTimeout(flyoutTimeout);

        const catName = cat.dataset.cat;
        const label = cat.querySelector('.sidebar-cat-label');
        const items = cat.querySelectorAll('.sidebar-item');
        if (!label || items.length === 0) return;

        let html = `<div class="sidebar-flyout-cat">${label.textContent}</div>`;
        items.forEach((item) => {
          const icon = item.querySelector('.sidebar-item-icon');
          const itemLabel = item.querySelector('.sidebar-item-label');
          const isActive = item.classList.contains('active') ? ' active' : '';
          html += `<a href="#" class="sidebar-flyout-item${isActive}" data-section="${item.dataset.section}">${icon ? icon.textContent : ''} ${itemLabel ? itemLabel.textContent : ''}</a>`;
        });
        flyout.innerHTML = html;

        // Position flyout next to sidebar
        const rect = header.getBoundingClientRect();
        flyout.style.top = rect.top + 'px';

        flyout.classList.add('visible');
      });

      header.addEventListener('mouseleave', () => {
        flyoutTimeout = setTimeout(() => flyout.classList.remove('visible'), 100);
      });
    });

    // Keep flyout open when hovering over it
    flyout.addEventListener('mouseenter', () => clearTimeout(flyoutTimeout));
    flyout.addEventListener('mouseleave', () => flyout.classList.remove('visible'));

    // Flyout item clicks
    flyout.addEventListener('click', (e) => {
      const item = e.target.closest('.sidebar-flyout-item');
      if (item) {
        e.preventDefault();
        window.HuntDrop.navigateTo('section-' + item.dataset.section);
        flyout.classList.remove('visible');
      }
    });
  }

  // ===== Command Palette (Ctrl+K) =====
  function setupCommandPalette() {
    const overlay = document.getElementById('cmdPaletteOverlay');
    const input = document.getElementById('cmdPaletteInput');
    const results = document.getElementById('cmdPaletteResults');
    const trigger = document.getElementById('sidebarCmdTrigger');
    if (!overlay || !input || !results) return;

    // Build tool list from sidebar
    const tools = [];
    const sidebarNav = document.getElementById('sidebarNav');
    if (sidebarNav) {
      sidebarNav.querySelectorAll('.sidebar-cat').forEach((cat) => {
        const catLabel = cat.querySelector('.sidebar-cat-label')?.textContent || '';
        cat.querySelectorAll('.sidebar-item').forEach((item) => {
          const label = item.querySelector('.sidebar-item-label')?.textContent || '';
          const section = item.dataset.section || '';
          const iconHtml = item.querySelector('.sidebar-item-icon')?.innerHTML || '';
          tools.push({ label, section, cat: catLabel, iconHtml });
        });
      });
      // Add dashboard
      const dashLabel = sidebarNav.querySelector('.sidebar-dashboard-label')?.textContent || 'Dashboard';
      const dashIcon = sidebarNav.querySelector('.sidebar-dashboard-icon')?.innerHTML || '';
      tools.unshift({ label: dashLabel, section: 'dashboard', cat: '', iconHtml: dashIcon });
    }

    let focusedIdx = -1;

    function openPalette() {
      overlay.classList.add('visible');
      input.value = '';
      input.focus();
      focusedIdx = -1;
      renderResults('');
    }

    function closePalette() {
      overlay.classList.remove('visible');
      input.value = '';
      input.blur();
    }

    function fuzzyMatch(query, text) {
      if (!query) return true;
      const q = query.toLowerCase();
      const t = text.toLowerCase();
      if (t.includes(q)) return true;
      let qi = 0;
      for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) qi++;
      }
      return qi === q.length;
    }

    function renderResults(query) {
      const matched = query ? tools.filter((t) => fuzzyMatch(query, t.label)) : tools;
      if (matched.length === 0) {
        results.innerHTML = '<div class="cmd-palette-empty">No tools found</div>';
        focusedIdx = -1;
        return;
      }

      // Group by category
      const groups = {};
      matched.forEach((t) => {
        const key = t.cat || 'Quick';
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });

      let html = '';
      let idx = 0;
      for (const [cat, items] of Object.entries(groups)) {
        html += `<div class="cmd-palette-group-label">${cat}</div>`;
        items.forEach((t) => {
          const focused = idx === focusedIdx ? ' focused' : '';
          html += `<div class="cmd-palette-item${focused}" data-section="${t.section}" data-idx="${idx}">
            <span class="cmd-palette-item-icon">${t.iconHtml}</span>
            <span class="cmd-palette-item-label">${t.label}</span>
          </div>`;
          idx++;
        });
      }
      results.innerHTML = html;
    }

    function navigateToItem(section) {
      closePalette();
      if (section === 'dashboard') {
        navigateToSection('dashboard');
      } else {
        navigateToSection(section);
      }
    }

    // Open via trigger button
    if (trigger) {
      trigger.addEventListener('click', openPalette);
    }

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePalette();
    });

    // Input filtering + keyboard
    input.addEventListener('input', () => {
      focusedIdx = -1;
      renderResults(input.value.trim());
    });

    input.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.cmd-palette-item');
      const count = items.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusedIdx = focusedIdx < count - 1 ? focusedIdx + 1 : 0;
        renderResults(input.value.trim());
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusedIdx = focusedIdx > 0 ? focusedIdx - 1 : count - 1;
        renderResults(input.value.trim());
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIdx >= 0 && focusedIdx < count) {
          const section = items[focusedIdx].dataset.section;
          if (section) navigateToItem(section);
        }
      } else if (e.key === 'Escape') {
        closePalette();
      }
    });

    // Click on result item
    results.addEventListener('click', (e) => {
      const item = e.target.closest('.cmd-palette-item');
      if (item) {
        navigateToItem(item.dataset.section);
      }
    });

    // Global Ctrl+K / Cmd+K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (overlay.classList.contains('visible')) {
          closePalette();
        } else {
          openPalette();
        }
      }
    });

    // Sidebar settings button
    const settingsBtn = document.getElementById('sidebarSettingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => navigateToSection('section-settings'));
    }
  }

  // ===== Search & Filters =====
  function setupSearch() {
    const searchInput = UI.$('searchInput');
    const searchBtn = UI.$('searchBtn');
    const platformSelect = UI.$('platformSelect');
    const sortSelect = UI.$('sortSelect');
    const sortSelectSearch = document.getElementById('sortSelectSearch');
    const priceRange = UI.$('priceRange');
    const scoreRange = UI.$('scoreRange');
    const scoreValue = UI.$('scoreValue');
    const resetBtn = UI.$('resetFilters');

    // Search page elements
    const searchPageInput = UI.$('searchPageInput');
    const searchPageBtn = UI.$('searchPageBtn');
    const searchPagePlatform = UI.$('searchPagePlatform');

    let _searchSyncGuard = false;

    const getFilters = () => ({
      platform: searchPagePlatform?.value || platformSelect?.value || 'all',
      priceMax: parseInt(UI.$('priceMax')?.value) || 9999,
      margin: document.querySelector('.sr-pill[data-margin].active')?.dataset.margin || 'all',
      competition: document.querySelector('.sr-pill.comp-pill[data-comp].active')?.dataset.comp || 'all',
      sort: sortSelect?.value || 'score',
      minScore: parseInt(scoreRange?.value) || 0,
    });

    const doSearch = () => {
      const input = searchPageInput || searchInput;
      const query = input?.value?.trim() || '';
      Config.set('search.lastQuery', query);
      // Sync inputs across pages (with guard to prevent re-entrant loops)
      if (!_searchSyncGuard) {
        _searchSyncGuard = true;
        if (searchInput && input !== searchInput) searchInput.value = query;
        if (searchPageInput && input !== searchPageInput) searchPageInput.value = query;
        _searchSyncGuard = false;
      }
      EventBus.emit('filter:changed', { filters: getFilters(), query });
      // Navigate to search results page
      window.HuntDrop.navigateTo('section-search');
    };

    // Note: search:results is handled by product-grid plugin.
    // app.js only orchestrates — plugins do the rendering.

    // Dashboard search handlers
    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    if (searchInput)
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
      });

    // Search page handlers
    if (searchPageBtn) searchPageBtn.addEventListener('click', doSearch);
    if (searchPageInput)
      searchPageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
      });
    if (searchPagePlatform) searchPagePlatform.addEventListener('change', doSearch);
    if (sortSelectSearch) sortSelectSearch.addEventListener('change', doSearch);

    // Shared filter handlers
    if (platformSelect) platformSelect.addEventListener('change', doSearch);
    if (sortSelect) sortSelect.addEventListener('change', doSearch);

    // Note: priceRange and scoreRange input handlers are set up by setupDebouncedFilters()
    // with proper debouncing. Do NOT bind them here to avoid double-firing.

    // Search chips
    document.querySelectorAll('.search-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (searchInput) searchInput.value = chip.dataset.query;
        doSearch();
      });
    });

    // Filter buttons — margin pills
    document.querySelectorAll('.sr-pill[data-margin]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sr-pill[data-margin]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        doSearch();
      });
    });
    // Filter buttons — competition pills
    document.querySelectorAll('.sr-pill.comp-pill[data-comp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sr-pill.comp-pill[data-comp]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        doSearch();
      });
    });

    // Rating stars
    document.querySelectorAll('.star').forEach((star) => {
      star.addEventListener('click', () => {
        const r = parseInt(star.dataset.rating);
        document
          .querySelectorAll('.star')
          .forEach((s) => s.classList.toggle('active', parseInt(s.dataset.rating) <= r));
      });
    });

    // View toggles
    document.querySelectorAll('.sr-view-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sr-view-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const grid = UI.$('productsGrid');
        if (!grid) return;
        const isList = btn.dataset.view === 'list';
        grid.classList.toggle('list-view', isList);
        if (isList) {
          grid.style.setProperty('grid-template-columns', '1fr', 'important');
        } else {
          grid.style.setProperty('grid-template-columns', 'repeat(auto-fill, minmax(240px, 1fr))', 'important');
        }
      });
    });

    // Reset
    if (resetBtn)
      resetBtn.addEventListener('click', () => {
        const input = searchPageInput || searchInput;
        if (input) input.value = '';
        if (platformSelect) platformSelect.value = 'all';
        if (searchPagePlatform) searchPagePlatform.value = 'all';
        if (sortSelect) sortSelect.value = 'score';
        if (sortSelectSearch) sortSelectSearch.value = 'score';
        if (priceRange) priceRange.value = 200;
        if (scoreRange) {
          scoreRange.value = 0;
          if (scoreValue) scoreValue.textContent = '0';
        }
        const pm1 = UI.$('priceMin');
        if (pm1) pm1.value = '';
        const pm2 = UI.$('priceMax');
        if (pm2) pm2.value = '';
        document.querySelectorAll('.sr-pill[data-margin]').forEach((b, i) => b.classList.toggle('active', i === 0));
        document
          .querySelectorAll('.sr-pill.comp-pill[data-comp]')
          .forEach((b, i) => b.classList.toggle('active', i === 0));
        doSearch();
      });

    // Note: priceMin and priceMax input handlers are set up by setupDebouncedFilters()
    // with proper debouncing. Do NOT bind them here to avoid double-firing.
  }

  // ===== Skeleton & Empty State =====
  function setSearchEmptyState(mode, message, detail) {
    const empty = UI.$('productsEmpty');
    const grid = UI.$('productsGrid');
    const title = document.getElementById('srEmptyTitle');
    const desc = document.getElementById('srEmptyDesc');
    const notice = document.getElementById('srEmptyNotice');

    if (empty) {
      empty.classList.add('visible');
      empty.setAttribute('aria-live', 'polite');
    }
    if (grid) grid.innerHTML = '';
    if (title) title.textContent = message || 'No products found';
    if (desc) {
      desc.textContent = detail || 'Try adjusting your filters or search for something different.';
    }

    if (notice) {
      const PC = window.HuntDrop.PlatformConnectors;
      let hasConnected = false;
      if (PC) {
        Object.keys(PC.configs).forEach(function (p) {
          if (PC.isConnected(p)) hasConnected = true;
        });
      }
      if (mode === 'error') {
        notice.style.display = 'none';
      } else {
        notice.style.display = hasConnected ? 'none' : 'block';
      }
    }
  }

  function showSkeleton() {
    const skeleton = UI.$('productsSkeleton');
    const empty = UI.$('productsEmpty');
    const grid = UI.$('productsGrid');
    if (skeleton) {
      skeleton.classList.add('visible');
      skeleton.setAttribute('aria-busy', 'true');
    }
    if (empty) empty.classList.remove('visible');
    if (grid) grid.innerHTML = '';
  }

  function hideSkeleton() {
    const skeleton = UI.$('productsSkeleton');
    if (skeleton) {
      skeleton.classList.remove('visible');
      skeleton.removeAttribute('aria-busy');
    }
  }

  function showEmpty(query) {
    const safeQuery = typeof query === 'string' && query.trim() ? query.trim() : '';
    const title = safeQuery ? 'No matches for “' + safeQuery + '”' : 'No products found';
    const detail = safeQuery
      ? 'Try a broader search, lower the minimum score, or switch to another platform.'
      : 'Try adjusting your filters or search for something different.';
    setSearchEmptyState('empty', title, detail);
  }

  function showSearchFailure(data) {
    const query = data && data.query ? data.query : '';
    const detail = query
      ? 'Search failed while looking for “' + query + '”. Please retry or try a simpler query.'
      : 'Search failed. Please retry or adjust your filters.';
    setSearchEmptyState('error', 'Search failed', detail);
  }

  // Listen for search events to toggle skeleton/empty states
  EventBus.on('filter:changed', () => {
    showSkeleton();
  });
  EventBus.on('search:results', (data) => {
    hideSkeleton();
    if (!data.results || data.results.length === 0) {
      showEmpty(data.query || '');
    }
  });
  EventBus.on('search:error', (data) => {
    hideSkeleton();
    showSearchFailure(data || {});
  });

  // Listen for search results to add related tools to search page
  EventBus.on('search:results', function (data) {
    const container = document.getElementById('srRelatedTools');
    if (!container) return;
    const tools = [
      {
        section: 'section-ai-analyst',
        name: 'AI Analyst',
        desc: 'Deep AI-powered product analysis',
        icon: '🧠',
        color: 'var(--accent-purple)',
      },
      {
        section: 'section-profit-lab',
        name: 'Profit Calculator',
        desc: 'Calculate exact profit margins',
        icon: '💰',
        color: 'var(--accent-green)',
      },
      {
        section: 'section-spy-center',
        name: 'Spy Center',
        desc: 'Spy on competitor stores',
        icon: '🔍',
        color: 'var(--accent-orange)',
      },
      {
        section: 'section-supplier-hub',
        name: 'Supplier Hub',
        desc: 'Find verified suppliers',
        icon: '🏭',
        color: 'var(--accent-cyan)',
      },
    ];
    container.innerHTML = renderRelatedTools(tools);
    container.querySelectorAll('.related-tool-card[data-section]').forEach(function (card) {
      card.addEventListener('click', function () {
        const section = card.getAttribute('data-section');
        if (section) window.HuntDrop.navigateTo(section);
      });
    });
  });

  // ===== Related Tools Helper =====
  function renderRelatedTools(tools) {
    if (!tools || !tools.length) return '';
    const esc = (s) => UI.escapeHtml(s);
    const cards = tools
      .map((t) => {
        const bg = t.color || 'var(--accent-cyan)';
        return `<div class="related-tool-card" data-section="${esc(t.section)}" role="button" tabindex="0">
      <div class="related-tool-icon" style="background:${esc(bg)}15;color:${esc(bg)}">${t.icon || '🔗'}</div>
      <div class="related-tool-info"><div class="related-tool-name">${esc(t.name)}</div><div class="related-tool-desc">${esc(t.desc || '')}</div></div>
      <div class="related-tool-arrow">→</div>
    </div>`;
      })
      .join('');
    return `<div class="related-tools"><h3>🔗 Related Tools</h3><p class="related-tools-sub">Continue your workflow with these connected insights</p><div class="related-tools-grid">${cards}</div></div>`;
  }
  window.HuntDrop.renderRelatedTools = renderRelatedTools;

  // ===== Keyboard Shortcuts =====
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        UI.closeModal();
        // Close mobile sidebar
        const sidebar = document.getElementById('appSidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
          sidebar.classList.remove('mobile-open');
          const backdrop = document.querySelector('.sidebar-backdrop');
          if (backdrop) backdrop.classList.remove('visible');
        }
        document.querySelectorAll('.huntdrop-tooltip').forEach(function (t) {
          t.remove();
        });
      }
      if (e.key === '/' && document.activeElement?.id !== 'searchInput') {
        e.preventDefault();
        UI.$('searchInput')?.focus();
      }
      if (
        (e.altKey && e.key === 'ArrowLeft') ||
        (e.key === 'Backspace' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        window.HuntDrop.goBack();
      }
      // Ctrl+B: toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        const toggle = document.getElementById('sidebarToggle');
        if (toggle) toggle.click();
      }
      // Ctrl+K: command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const overlay = document.getElementById('cmdPaletteOverlay');
        if (overlay) {
          if (overlay.classList.contains('visible')) {
            overlay.classList.remove('visible');
          } else {
            overlay.classList.add('visible');
            const input = document.getElementById('cmdPaletteInput');
            if (input) input.focus();
          }
        }
      }
    });
  }

  // ===== First-Use Onboarding =====
  function setupOnboarding() {
    try {
      if (localStorage.getItem('huntdrop_onboarded')) return;
    } catch (e) {
      return;
    }

    const tips = [
      {
        target: '.hero-search',
        text: 'Search across 10 platforms at once! Try "wireless earbuds" or "pet gadgets".',
        pos: 'bottom',
      },
      { target: '.quick-tools', text: 'Quick Access cards let you jump to any tool instantly.', pos: 'top' },
      { target: '.trending-section', text: 'Product grid updates in real-time as you search and filter.', pos: 'top' },
    ];

    let tipIndex = 0;
    function showTip() {
      if (tipIndex >= tips.length) {
        try {
          localStorage.setItem('huntdrop_onboarded', '1');
        } catch (e) {}
        return;
      }
      const tip = tips[tipIndex];
      const el = document.querySelector(tip.target);
      if (!el) {
        tipIndex++;
        showTip();
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = 'huntdrop-tooltip';
      overlay.innerHTML =
        '<div class="huntdrop-tip-box">' +
        '<div class="huntdrop-tip-text">' +
        escapeHtml(tip.text) +
        '</div>' +
        '<div class="huntdrop-tip-actions">' +
        '<span class="huntdrop-tip-count">' +
        (tipIndex + 1) +
        '/' +
        tips.length +
        '</span>' +
        '<button class="huntdrop-tip-next">Got it</button>' +
        '</div></div>';

      document.body.appendChild(overlay);

      const rect = el.getBoundingClientRect();
      overlay.querySelector('.huntdrop-tip-box').style.top = rect.bottom + window.scrollY + 10 + 'px';

      overlay.querySelector('.huntdrop-tip-next').addEventListener('click', function () {
        overlay.remove();
        tipIndex++;
        showTip();
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.remove();
          tipIndex++;
          showTip();
        }
      });
    }
    setTimeout(showTip, 1500);
  }

  // ===== #15: Theme Toggle (Dark/Light Mode) =====
  function setupThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    // Restore saved theme
    const saved = localStorage.getItem('huntdrop_theme') || 'dark';
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }

    btn.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      if (next === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      try {
        localStorage.setItem('huntdrop_theme', next);
      } catch (e) {}
      if (window.HuntDrop.toast)
        window.HuntDrop.toast(next === 'light' ? '☀️ Light mode enabled' : '🌙 Dark mode enabled', 'info');
    });
  }

  // ===== #16: Error Boundaries — Comprehensive error handling and recovery =====

  // Error boundary state tracking
  const _errorBoundaryState = {
    errorCount: 0,
    maxErrors: 5,
    errorWindow: 60000, // 1 minute window
    firstErrorTime: null,
    isCircuitBroken: false,
  };

  // Error boundary wrapper for plugin lifecycle methods
  function withErrorBoundary(fn, context, fallback) {
    return async function (...args) {
      try {
        return await fn.apply(context, args);
      } catch (error) {
        const errorInfo = {
          message: error.message || 'Unknown error',
          stack: error.stack,
          context: context,
          timestamp: Date.now(),
        };

        // Track error frequency for circuit breaker
        trackError(errorInfo);

        // Log to console in development
        if (window.HuntDrop._debug) {
          console.error(`[ErrorBoundary] ${context}:`, error);
        }

        // Show user-friendly error banner
        showErrorBanner(`${context} Error`, error.message || 'An unexpected error occurred');

        // Return fallback if provided
        if (fallback !== undefined) {
          return typeof fallback === 'function' ? fallback(error) : fallback;
        }

        throw error;
      }
    };
  }

  // Track errors and implement circuit breaker pattern
  function trackError(errorInfo) {
    const now = Date.now();

    // Reset window if expired
    if (
      _errorBoundaryState.firstErrorTime &&
      now - _errorBoundaryState.firstErrorTime > _errorBoundaryState.errorWindow
    ) {
      _errorBoundaryState.errorCount = 0;
      _errorBoundaryState.firstErrorTime = null;
      _errorBoundaryState.isCircuitBroken = false;
    }

    // Record first error in window
    if (!_errorBoundaryState.firstErrorTime) {
      _errorBoundaryState.firstErrorTime = now;
    }

    _errorBoundaryState.errorCount++;

    // Circuit breaker: too many errors in short time
    if (_errorBoundaryState.errorCount >= _errorBoundaryState.maxErrors) {
      _errorBoundaryState.isCircuitBroken = true;
      showErrorBanner(
        'System Instability Detected',
        'Multiple errors occurred. Some features may be disabled. Please refresh the page.'
      );

      // Log to Logger if available
      if (window.HuntDrop.Logger) {
        window.HuntDrop.Logger.error(
          'Circuit breaker triggered',
          {
            errorCount: _errorBoundaryState.errorCount,
            window: _errorBoundaryState.errorWindow,
          },
          'ErrorBoundary'
        );
      }
    }
  }

  // Check if system is in circuit broken state
  function isCircuitBroken() {
    return _errorBoundaryState.isCircuitBroken;
  }

  // Reset error boundary state
  function resetErrorBoundary() {
    _errorBoundaryState.errorCount = 0;
    _errorBoundaryState.firstErrorTime = null;
    _errorBoundaryState.isCircuitBroken = false;
  }

  // Setup error boundaries for plugin lifecycle
  function setupErrorBoundaries() {
    // Wrap PluginRegistry methods with error boundaries that check circuit breaker
    const originalMount = window.HuntDrop.PluginRegistry.mount;
    const originalInit = window.HuntDrop.PluginRegistry.init;
    const originalUnmount = window.HuntDrop.PluginRegistry.unmount;

    window.HuntDrop.PluginRegistry.mount = async function (id) {
      if (isCircuitBroken()) {
        console.warn('[ErrorBoundary] Circuit broken — mount of "' + id + '" skipped');
        return false;
      }
      return withErrorBoundary(originalMount, 'PluginRegistry.mount', false).call(window.HuntDrop.PluginRegistry, id);
    };

    window.HuntDrop.PluginRegistry.init = async function (id) {
      if (isCircuitBroken()) {
        console.warn('[ErrorBoundary] Circuit broken — init of "' + id + '" skipped');
        return false;
      }
      return withErrorBoundary(originalInit, 'PluginRegistry.init', false).call(window.HuntDrop.PluginRegistry, id);
    };

    window.HuntDrop.PluginRegistry.unmount = async function (id) {
      if (isCircuitBroken()) {
        console.warn('[ErrorBoundary] Circuit broken — unmount of "' + id + '" skipped');
        return false;
      }
      return withErrorBoundary(originalUnmount, 'PluginRegistry.unmount', false).call(
        window.HuntDrop.PluginRegistry,
        id
      );
    };

    // Expose error boundary utilities
    window.HuntDrop.ErrorBoundary = {
      withErrorBoundary,
      trackError,
      isCircuitBroken,
      resetErrorBoundary,
      getState: function () {
        return {
          errorCount: _errorBoundaryState.errorCount,
          isCircuitBroken: _errorBoundaryState.isCircuitBroken,
          firstErrorTime: _errorBoundaryState.firstErrorTime,
        };
      },
    };

    // Listen for plugin errors
    window.HuntDrop.EventBus.on('plugin:error', function (data) {
      trackError({
        message: (data.error && data.error.message) || 'Plugin error',
        context: 'plugin:' + data.pluginId,
        timestamp: Date.now(),
      });
    });
  }

  // Enhanced error banner with better UX
  function showErrorBanner(title, detail, options = {}) {
    const { duration = 8000, dismissible = true, type = 'error' } = options;

    // Remove existing banner if present
    const existing = document.getElementById('hd-error-banner');
    if (existing) {
      existing.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'hd-error-banner';
    banner.className = `hd-error-banner hd-error-${type}`;
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');

    const colors = {
      error: { border: 'var(--accent-red)', bg: 'rgba(255,51,102,0.1)' },
      warning: { border: 'var(--accent-orange)', bg: 'rgba(255,138,0,0.1)' },
      info: { border: 'var(--accent-cyan)', bg: 'rgba(0,229,255,0.1)' },
    };

    const color = colors[type] || colors.error;

    banner.style.cssText = `
    position: fixed;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10001;
    background: var(--bg-card);
    border: 1px solid ${color.border};
    border-radius: var(--radius-md);
    padding: 12px 20px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 8px 32px ${color.bg};
    display: flex;
    align-items: center;
    gap: 12px;
    animation: fadeUp 0.3s ease;
  `;

    const icons = { error: '⚠️', warning: '⚡', info: 'ℹ️' };
    const icon = icons[type] || icons.error;

    banner.innerHTML = `
    <span style="font-size:20px">${icon}</span>
    <div style="flex:1;min-width:0">
      <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:${color.border};margin-bottom:2px">
        ${escapeHtml(title)}
      </div>
      <div style="font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${escapeHtml(detail)}
      </div>
    </div>
    ${
      dismissible
        ? `
      <button class="hd-error-dismiss" aria-label="Dismiss error" style="
        background: none;
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-sm);
        color: var(--text-muted);
        padding: 4px 10px;
        font-size: 11px;
        cursor: pointer;
        flex-shrink: 0;
        transition: all 0.2s;
      ">Dismiss</button>
    `
        : ''
    }
  `;

    document.body.appendChild(banner);

    // Add dismiss handler
    if (dismissible) {
      const dismissBtn = banner.querySelector('.hd-error-dismiss');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          banner.style.animation = 'fadeDown 0.3s ease';
          setTimeout(() => banner.remove(), 300);
        });

        // Hover effect
        dismissBtn.addEventListener('mouseenter', () => {
          dismissBtn.style.background = 'var(--bg-elevated)';
          dismissBtn.style.color = 'var(--text-primary)';
        });
        dismissBtn.addEventListener('mouseleave', () => {
          dismissBtn.style.background = 'none';
          dismissBtn.style.color = 'var(--text-muted)';
        });
      }
    }

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        if (banner.parentElement) {
          banner.style.animation = 'fadeDown 0.3s ease';
          setTimeout(() => banner.remove(), 300);
        }
      }, duration);
    }

    // Log error
    if (window.HuntDrop.Logger) {
      window.HuntDrop.Logger.error(`${title}: ${detail}`, null, 'ErrorBanner');
    }
  }

  // ===== #17: Plugin Loading States =====
  function showPluginLoading(sectionId, message) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const loader = section.querySelector('.plugin-loading-state');
    if (loader) return;
    const div = document.createElement('div');
    div.className = 'plugin-loading-state';
    div.style.cssText =
      'display:flex;align-items:center;justify-content:center;gap:10px;padding:40px 20px;color:var(--text-secondary);font-size:14px';
    div.innerHTML =
      '<div class="ph-scan-spinner" style="width:18px;height:18px;border:2px solid var(--border-primary);border-top-color:var(--accent-cyan);border-radius:50%;animation:spin 0.8s linear infinite"></div>' +
      '<span>' +
      escapeHtml(message || 'Loading...') +
      '</span>';
    const inner = section.querySelector('.section-inner');
    if (inner) inner.appendChild(div);
  }

  function hidePluginLoading(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const loader = section.querySelector('.plugin-loading-state');
    if (loader) loader.remove();
  }

  window.HuntDrop.showPluginLoading = showPluginLoading;
  window.HuntDrop.hidePluginLoading = hidePluginLoading;
  window.HuntDrop.showErrorBanner = showErrorBanner;

  // ===== #18: Export Helpers for All Tools =====
  window.HuntDrop.exportCSV = function (headers, rows, filename) {
    const csv = [headers]
      .concat(rows)
      .map(function (r) {
        return r
          .map(function (c) {
            return '"' + String(c).replace(/"/g, '""') + '"';
          })
          .join(',');
      })
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'huntdrop-export.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  window.HuntDrop.exportJSON = function (data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'huntdrop-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ===== #1: KPI Stats Bar =====
  function setupKPIBar() {
    const saved = parseInt(localStorage.getItem('huntdrop_saved_count') || '0');
    const analyses = parseInt(localStorage.getItem('huntdrop_analysis_count') || '0');
    const savedEl = document.getElementById('kpiSaved');
    const analysesEl = document.getElementById('kpiAnalyses');
    if (savedEl) savedEl.textContent = saved;
    if (analysesEl) analysesEl.textContent = analyses;

    // Listen for product saves and analyses
    EventBus.on('product:saved', function () {
      const count = parseInt(localStorage.getItem('huntdrop_saved_count') || '0') + 1;
      localStorage.setItem('huntdrop_saved_count', count);
      const el = document.getElementById('kpiSaved');
      if (el) el.textContent = count;
    });
    EventBus.on('product:analyze', function () {
      const count = parseInt(localStorage.getItem('huntdrop_analysis_count') || '0') + 1;
      localStorage.setItem('huntdrop_analysis_count', count);
      const el = document.getElementById('kpiAnalyses');
      if (el) el.textContent = count;
    });

    // Animate number counting on load — compute from actual data
    const allProducts = window.HuntDrop.ALL_PRODUCTS || [];
    const totalProducts = allProducts.length;
    const trendingCount = allProducts.filter(function (p) {
      return p.score >= 85;
    }).length;
    animateKPINumber('kpiProducts', totalProducts, 1200);
    animateKPINumber('kpiTrending', trendingCount, 800);
  }

  function animateKPINumber(id, target, duration) {
    const el = document.getElementById(id);
    if (!el) return;
    let startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      const current = Math.floor(eased * target);
      el.textContent = current >= 1000 ? current.toLocaleString() : current;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ===== #5: Quick Tools Collapse =====
  function setupQuickToolsCollapse() {
    const toggle = document.getElementById('qtCollapseToggle');
    const section = toggle ? toggle.closest('.quick-tools') : null;
    if (!toggle || !section) return;
    toggle.addEventListener('click', function () {
      section.classList.toggle('collapsed');
    });
  }

  // ===== AI Signal Bar =====
  function setupAISignalBar() {
    const track = document.getElementById('signalTrack');
    if (!track) return;
    const items = track.querySelectorAll('.signal-item');
    if (items.length < 2) return;

    let current = 0;
    items[0].classList.add('active');

    function showNext() {
      items[current].classList.remove('active');
      current = (current + 1) % items.length;
      items[current].classList.add('active');
    }
    setInterval(showNext, 5000);

    track.addEventListener('click', function (e) {
      const item = e.target.closest('.signal-item');
      if (!item) return;
      const section = item.getAttribute('data-section');
      if (section && window.HuntDrop) window.HuntDrop.navigateTo(section);
    });
  }

  // ===== #6: Welcome State =====
  function setupWelcomeState() {
    const card = document.getElementById('welcomeCard');
    if (!card) return;
    try {
      if (localStorage.getItem('huntdrop_welcome_dismissed')) return;
    } catch (e) {
      return;
    }

    card.style.display = 'block';

    const closeBtn = document.getElementById('welcomeClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        card.style.display = 'none';
        try {
          localStorage.setItem('huntdrop_welcome_dismissed', '1');
        } catch (e) {}
      });
    }

    const searchBtn = document.getElementById('welcomeSearchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', function () {
        const input = document.getElementById('searchInput');
        if (input) {
          input.value = 'wireless earbuds';
          input.dispatchEvent(new Event('keypress'));
          // Trigger search
          const btn = document.getElementById('searchBtn');
          if (btn) btn.click();
        }
        completeWelcomeStep(2);
      });
    }

    // Track progress
    updateWelcomeProgress();
  }

  function completeWelcomeStep(num) {
    try {
      const steps = JSON.parse(localStorage.getItem('huntdrop_welcome_steps') || '{}');
      steps[num] = true;
      localStorage.setItem('huntdrop_welcome_steps', JSON.stringify(steps));
    } catch (e) {}
    updateWelcomeProgress();
  }

  function updateWelcomeProgress() {
    try {
      const steps = JSON.parse(localStorage.getItem('huntdrop_welcome_steps') || '{}');
      const count = Object.keys(steps).filter(function (k) {
        return steps[k];
      }).length;
      const bar = document.getElementById('welcomeProgress');
      const text = document.getElementById('welcomeProgressText');
      if (bar) bar.style.width = (count / 3) * 100 + '%';
      if (text) text.textContent = count + '/3 completed';
      for (let i = 1; i <= 3; i++) {
        const el = document.getElementById('welcomeStep' + i);
        if (el) el.classList.toggle('completed', !!steps[i]);
      }
    } catch (e) {}
  }

  // ===== #3: Recent Searches =====
  const RECENT_SEARCHES_KEY = 'huntdrop_recent_searches';
  const MAX_RECENT = 8;

  function getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveRecentSearch(query) {
    if (!query || !query.trim()) return;
    let recent = getRecentSearches().filter(function (r) {
      return r.query !== query;
    });
    recent.unshift({ query: query, time: Date.now() });
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
    } catch (e) {}
    renderRecentSearches();
  }

  function renderRecentSearches() {
    const recent = getRecentSearches();
    // Recent chips in hero
    const chipsContainer = document.getElementById('recentChips');
    if (chipsContainer) {
      if (recent.length > 0) {
        chipsContainer.style.display = 'flex';
        chipsContainer.innerHTML = recent
          .slice(0, 5)
          .map(function (r) {
            return (
              '<span class="recent-chip" data-query="' +
              escapeHtml(r.query) +
              '"><span class="rc-icon">🕒</span>' +
              escapeHtml(r.query) +
              '</span>'
            );
          })
          .join('');
        // Bind click
        chipsContainer.querySelectorAll('.recent-chip').forEach(function (chip) {
          chip.addEventListener('click', function () {
            const input = document.getElementById('searchInput');
            if (input) input.value = chip.dataset.query;
            const btn = document.getElementById('searchBtn');
            if (btn) btn.click();
          });
        });
      } else {
        chipsContainer.style.display = 'none';
      }
    }

    // Recent searches section
    const section = document.getElementById('recentSearchesSection');
    const itemsContainer = document.getElementById('recentItems');
    if (section && itemsContainer) {
      if (recent.length > 0) {
        section.style.display = 'block';
        itemsContainer.innerHTML = recent
          .slice(0, 6)
          .map(function (r) {
            const ago = getTimeAgo(r.time);
            return (
              '<div class="recent-item" data-query="' +
              escapeHtml(r.query) +
              '"><span class="recent-item-icon">🔍</span><span>' +
              escapeHtml(r.query) +
              '</span><span class="recent-item-time">' +
              escapeHtml(ago) +
              '</span></div>'
            );
          })
          .join('');
        itemsContainer.querySelectorAll('.recent-item').forEach(function (item) {
          item.addEventListener('click', function () {
            const input = document.getElementById('searchInput');
            if (input) input.value = item.dataset.query;
            const btn = document.getElementById('searchBtn');
            if (btn) btn.click();
          });
        });
      } else {
        section.style.display = 'none';
      }
    }

    // Search dropdown recent items
    renderSearchDropdown();
  }

  function getTimeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  }

  function setupClearRecentSearches() {
    const btn = document.getElementById('clearRecentSearches');
    if (btn) {
      btn.addEventListener('click', function () {
        try {
          localStorage.removeItem(RECENT_SEARCHES_KEY);
        } catch (e) {}
        renderRecentSearches();
      });
    }
  }

  // ===== #2: Trending Products (dynamic from product data) =====
  function getTrendingData() {
    const allProducts = window.HuntDrop.ALL_PRODUCTS || [];
    if (allProducts.length === 0) return [];
    return allProducts
      .slice()
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 8)
      .map(function (p) {
        let badge, badgeText;
        if (p.score >= 90) {
          badge = 'hot';
          badgeText = '\uD83D\uDD25 Hot';
        } else if (p.score >= 85) {
          badge = 'viral';
          badgeText = '\uD83D\uDE80 Viral';
        } else {
          badge = 'new';
          badgeText = '\u2728 New';
        }
        return {
          title: p.title,
          price: '$' + p.price.toFixed(2),
          score: p.score,
          badge: badge,
          badgeText: badgeText,
          image: p.image,
        };
      });
  }

  function renderTrendingCards(grid, items) {
    if (!items || !items.length) {
      grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px">Search for products to see trending items</div>';
      return;
    }

    function deltaFor(title, score, i) {
      if (i === 0) return '+' + (score + 253) + '%';
      return '+' + (((score * 7 + title.length * 13 + i * 11) % 36) + 5) + '%';
    }
    function colorFor(i) {
      const c = ['#00e5ff', '#00ff88', '#ff8a00', '#a855f7', '#ff3366', '#fbbf24'];
      return c[i % c.length];
    }

    const featured = items[0];
    const rest = items.slice(1, 7);

    let html =
      '<div class="tf-featured trending-card" style="animation-delay:0s">' +
      '<div class="tf-featured-media">' +
      '<img src="' +
      escapeHtml(UI.normalizeImageUrl ? UI.normalizeImageUrl(featured.image, '') : featured.image) +
      '" alt="' +
      escapeHtml(featured.title) +
      '" loading="lazy" decoding="async">' +
      '<span class="tf-featured-rank">#1</span>' +
      '<span class="tf-featured-badge">\uD83D\uDD25 ' +
      escapeHtml(featured.badgeText) +
      '</span>' +
      '</div>' +
      '<div class="tf-featured-info">' +
      '<span class="tf-featured-eyebrow">Product of the Day</span>' +
      '<div class="tf-featured-title trending-card-title">' +
      escapeHtml(featured.title) +
      '</div>' +
      '<div class="tf-featured-meta">' +
      '<span class="tf-featured-price">' +
      escapeHtml(featured.price) +
      '</span>' +
      '<span class="tf-score-ring" style="--score:' +
      escapeHtml(featured.score) +
      '">' +
      escapeHtml(featured.score) +
      '</span>' +
      '<span class="tf-featured-delta">' +
      deltaFor(featured.title, featured.score, 0) +
      '</span>' +
      '</div>' +
      '</div>' +
      '</div>';

    html += '<div class="tf-ranked">';
    rest.forEach(function (item, i) {
      const rank = i + 2;
      const delta = deltaFor(item.title, item.score, i + 1);
      const up = (item.score + i) % 3 !== 0;
      html +=
        '<div class="tf-row trending-card" style="animation-delay:' +
        i * 0.05 +
        's">' +
        '<span class="tf-rank" style="color:' +
        colorFor(i) +
        '">' +
        rank +
        '</span>' +
        '<div class="tf-thumb"><img src="' +
        escapeHtml(UI.normalizeImageUrl ? UI.normalizeImageUrl(item.image, '') : item.image) +
        '" alt="' +
        escapeHtml(item.title) +
        '" loading="lazy" decoding="async"></div>' +
        '<div class="tf-row-info">' +
        '<div class="tf-row-title trending-card-title">' +
        escapeHtml(item.title) +
        '</div>' +
        '<div class="tf-row-meta">' +
        '<span class="tf-row-price">' +
        escapeHtml(item.price) +
        '</span>' +
        '<span class="tf-row-score">' +
        escapeHtml(item.score) +
        '</span>' +
        '</div>' +
        '</div>' +
        '<span class="tf-delta ' +
        (up ? 'up' : 'down') +
        '">' +
        (up ? '\u25B2 ' : '\u25BC ') +
        delta +
        '</span>' +
        '</div>';
    });
    html += '</div>';

    grid.innerHTML = html;

    grid.querySelectorAll('.trending-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const title = card.querySelector('.trending-card-title');
        if (title) {
          const input = document.getElementById('searchInput');
          if (input) input.value = title.textContent;
          const btn = document.getElementById('searchBtn');
          if (btn) btn.click();
        }
      });
    });
  }

  function setupTrendingProducts() {
    const grid = document.getElementById('trendingGrid');
    if (!grid) return;

    const trendingData = getTrendingData();
    if (trendingData.length === 0) {
      grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px">Search for products to see trending items</div>';
      return;
    }
    renderTrendingCards(grid, trendingData);

    const refreshBtn = document.getElementById('trendingRefresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        grid.style.opacity = '0.5';
        setTimeout(function () {
          grid.style.opacity = '1';
          trendingData.sort(function () {
            return Math.random() - 0.5;
          });
          renderTrendingCards(grid, trendingData);
        }, 500);
      });
    }
  }

  // ===== #7: Filter Panel Mobile Toggle =====
  // NOTE: filterMobileToggle, filtersPanel, filterOverlay, filterClose are not present in the base HTML.
  // This function gracefully skips if the elements don't exist (they may be added by plugins).
  function setupFilterMobileToggle() {
    const toggleBtn = document.getElementById('filterMobileToggle');
    if (!toggleBtn) return;
    const panel = document.getElementById('filtersPanel');
    const overlay = document.getElementById('filterOverlay');
    const closeBtn = document.getElementById('filterClose');
    if (!panel) return;

    function openFilters() {
      panel.classList.add('mobile-open');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function closeFilters() {
      panel.classList.remove('mobile-open');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', openFilters);
    if (overlay) overlay.addEventListener('click', closeFilters);
    if (closeBtn) closeBtn.addEventListener('click', closeFilters);

    // Close on Escape — only when panel is open
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('mobile-open')) closeFilters();
    });
  }

  // ===== #8: Product Card Quick Actions =====
  function addQuickActionsToCards() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.product-card');
    const savedProducts = getSavedProducts();

    cards.forEach(function (card) {
      if (card.querySelector('.card-quick-actions')) return; // already added
      const productId = card.dataset.productId || '';
      const isSaved = savedProducts.indexOf(productId) !== -1;
      const actions = document.createElement('div');
      actions.className = 'card-quick-actions';
      actions.innerHTML =
        '<button class="quick-action-btn qa-save ' +
        (isSaved ? 'saved' : '') +
        '" data-id="' +
        productId +
        '" title="Save">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="' +
        (isSaved ? 'currentColor' : 'none') +
        '" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
        '</button>' +
        '<button class="quick-action-btn qa-analyze" data-id="' +
        productId +
        '" title="Quick Analyze">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20.66 6A10 10 0 0 0 12 2v10h10a10 10 0 0 0-1.34-6z"/></svg>' +
        '</button>' +
        '<button class="quick-action-btn qa-profit" data-id="' +
        productId +
        '" title="Profit Calculator">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' +
        '</button>' +
        '<button class="quick-action-btn qa-share" data-id="' +
        productId +
        '" title="Share">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
        '</button>';
      card.appendChild(actions);

      // Stop card click when clicking actions
      actions.addEventListener('click', function (e) {
        e.stopPropagation();
        const btn = e.target.closest('.quick-action-btn');
        if (!btn) return;

        if (btn.classList.contains('qa-save')) {
          toggleSaveProduct(productId);
          btn.classList.toggle('saved');
          const svg = btn.querySelector('svg');
          if (svg) svg.setAttribute('fill', btn.classList.contains('saved') ? 'currentColor' : 'none');
        } else if (btn.classList.contains('qa-analyze')) {
          EventBus.emit('product:analyze', { id: productId });
        } else if (btn.classList.contains('qa-profit')) {
          window.HuntDrop.navigateTo('section-profit-lab');
        } else if (btn.classList.contains('qa-share')) {
          if (navigator.share) {
            navigator
              .share({ title: 'HuntDrop Product', text: 'Check out this product on HuntDrop AI!' })
              .catch(function () {});
          } else {
            // Fallback: copy to clipboard
            navigator.clipboard
              .writeText(window.location.href)
              .then(function () {
                if (window.HuntDrop.toast) window.HuntDrop.toast('Link copied to clipboard!', 'success');
              })
              .catch(function () {});
          }
        }
      });
    });
  }

  function getSavedProducts() {
    try {
      return JSON.parse(localStorage.getItem('huntdrop_saved_products') || '[]');
    } catch (e) {
      return [];
    }
  }

  function toggleSaveProduct(id) {
    const saved = getSavedProducts();
    const idx = saved.indexOf(id);
    if (idx !== -1) {
      saved.splice(idx, 1);
    } else {
      saved.push(id);
      EventBus.emit('product:saved');
    }
    try {
      localStorage.setItem('huntdrop_saved_products', JSON.stringify(saved));
    } catch (e) {}
  }

  // Listen for new search results to add quick actions
  EventBus.on('search:results', function () {
    setTimeout(addQuickActionsToCards, 100);
  });

  // ===== #11: Enhanced Empty State =====
  function setupEmptyStateSuggestions() {
    document.querySelectorAll('.sr-empty-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const query = card.dataset.query;
        const input = document.getElementById('searchInput');
        if (input) input.value = query;
        const btn = document.getElementById('searchBtn');
        if (btn) btn.click();
      });
    });
  }

  // ===== #13: Search Enhancements =====
  function setupSearchEnhancements() {
    const searchInput = document.getElementById('searchInput');
    const dropdown = document.getElementById('searchDropdown');
    const recentSection = document.getElementById('recentSearchesDropdown');
    const recentItems = document.getElementById('recentSearchItems');
    const suggestionsSection = document.getElementById('suggestionsDropdown');
    const suggestionItems = document.getElementById('suggestionItems');

    if (!searchInput || !dropdown) return;

    const suggestions = [
      'wireless earbuds',
      'pet gadgets',
      'kitchen organizer',
      'car accessories',
      'beauty tool',
      'phone accessories',
      'home decor',
      'fitness gadget',
      'LED strip lights',
      'portable blender',
      'smart watch band',
      'desk organizer',
      'travel accessories',
      'baby products',
      'garden tools',
      'makeup brush set',
      'yoga mat',
      'water bottle',
      'backpack',
      'phone holder',
    ];

    // Show dropdown on focus
    searchInput.addEventListener('focus', function () {
      renderSearchDropdown();
      dropdown.style.display = 'block';
    });

    // Hide dropdown on blur (with delay for clicks)
    searchInput.addEventListener('blur', function () {
      setTimeout(function () {
        dropdown.style.display = 'none';
      }, 200);
    });

    // Filter suggestions on input
    searchInput.addEventListener('input', function () {
      renderSearchDropdown();
    });

    function renderSearchDropdown() {
      const query = searchInput.value.trim().toLowerCase();
      const recent = getRecentSearches();

      // Recent searches
      if (recentSection && recentItems) {
        if (recent.length > 0 && !query) {
          recentSection.style.display = 'block';
          recentItems.innerHTML = recent
            .slice(0, 5)
            .map(function (r) {
              return (
                '<div class="search-dropdown-item" data-query="' +
                escapeHtml(r.query) +
                '"><span class="sdi-icon">🕒</span><span class="sdi-text">' +
                escapeHtml(r.query) +
                '</span><span class="sdi-remove" data-remove="' +
                escapeHtml(r.query) +
                '">&times;</span></div>'
              );
            })
            .join('');
          // Bind clicks
          recentItems.querySelectorAll('.search-dropdown-item').forEach(function (item) {
            item.addEventListener('mousedown', function (e) {
              if (e.target.classList.contains('sdi-remove')) {
                e.stopPropagation();
                removeRecentSearch(e.target.dataset.remove);
                renderSearchDropdown();
                return;
              }
              searchInput.value = item.dataset.query;
              dropdown.style.display = 'none';
              const btn = document.getElementById('searchBtn');
              if (btn) btn.click();
            });
          });
        } else {
          recentSection.style.display = 'none';
        }
      }

      // Suggestions
      if (suggestionsSection && suggestionItems) {
        const filtered = query
          ? suggestions
              .filter(function (s) {
                return s.toLowerCase().indexOf(query) !== -1;
              })
              .slice(0, 6)
          : suggestions.slice(0, 5);
        if (filtered.length > 0) {
          suggestionsSection.style.display = 'block';
          suggestionItems.innerHTML = filtered
            .map(function (s) {
              return (
                '<div class="search-dropdown-item" data-query="' +
                escapeHtml(s) +
                '"><span class="sdi-icon">💡</span><span class="sdi-text">' +
                escapeHtml(s) +
                '</span></div>'
              );
            })
            .join('');
          suggestionItems.querySelectorAll('.search-dropdown-item').forEach(function (item) {
            item.addEventListener('mousedown', function () {
              searchInput.value = item.dataset.query;
              dropdown.style.display = 'none';
              const btn = document.getElementById('searchBtn');
              if (btn) btn.click();
            });
          });
        } else {
          suggestionsSection.style.display = 'none';
        }
      }

      // Show/hide entire dropdown
      const hasContent =
        (recent.length > 0 && !query) ||
        (query &&
          suggestions.some(function (s) {
            return s.toLowerCase().indexOf(query) !== -1;
          }));
      dropdown.style.display = hasContent || document.activeElement === searchInput ? 'block' : 'none';
    }

    // Store reference for other functions
    window._renderSearchDropdown = renderSearchDropdown;
  }

  function renderSearchDropdown() {
    if (window._renderSearchDropdown) window._renderSearchDropdown();
  }

  function removeRecentSearch(query) {
    const recent = getRecentSearches().filter(function (r) {
      return r.query !== query;
    });
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
    } catch (e) {}
    renderRecentSearches();
  }

  // ===== #13: Voice Search =====
  function setupVoiceSearch() {
    const btn = document.getElementById('voiceSearchBtn');
    const input = document.getElementById('searchInput');
    if (!btn || !input) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }
    // Show the button when speech recognition is available
    btn.style.display = 'flex';

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isListening = false;

    btn.addEventListener('click', function () {
      if (isListening) {
        recognition.stop();
        return;
      }
      recognition.start();
      isListening = true;
      btn.classList.add('listening');
      btn.title = 'Listening...';
    });

    recognition.addEventListener('result', function (e) {
      const transcript = e.results[0][0].transcript;
      input.value = transcript;
      btn.classList.remove('listening');
      isListening = false;
      btn.title = 'Voice search';
      // Auto-search
      const searchBtn = document.getElementById('searchBtn');
      if (searchBtn) searchBtn.click();
    });

    recognition.addEventListener('end', function () {
      btn.classList.remove('listening');
      isListening = false;
      btn.title = 'Voice search';
    });

    recognition.addEventListener('error', function () {
      btn.classList.remove('listening');
      isListening = false;
      btn.title = 'Voice search';
    });
  }

  // ===== #13: I'm Feeling Lucky =====
  function setupFeelingLucky() {
    const btn = document.getElementById('feelingLuckyBtn');
    const input = document.getElementById('searchInput');
    if (!btn || !input) return;

    const trendingQueries = [
      'wireless earbuds',
      'pet gadgets',
      'LED strip lights',
      'portable blender',
      'smart watch band',
      'car phone mount',
      'kitchen organizer',
      'yoga mat',
      'desk lamp',
      'phone accessories',
      'travel pillow',
      'resistance bands',
      'water bottle',
      'mini projector',
      'posture corrector',
      'face roller',
      'ring light',
      'air purifier',
      'robot vacuum',
      'plant grow light',
    ];

    btn.addEventListener('click', function () {
      const random = trendingQueries[Math.floor(Math.random() * trendingQueries.length)];
      input.value = random;
      const searchBtn = document.getElementById('searchBtn');
      if (searchBtn) searchBtn.click();
    });
  }

  // ===== #14: Debounce Filter Inputs =====
  function setupDebouncedFilters() {
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    const priceRange = document.getElementById('priceRange');
    const scoreRange = document.getElementById('scoreRange');

    // These are already bound directly, so we replace with debounced versions
    // We remove old listeners by cloning and rebinding
    if (priceMin) {
      const newMin = priceMin.cloneNode(true);
      priceMin.parentNode.replaceChild(newMin, priceMin);
      newMin.addEventListener(
        'input',
        debounce(function () {
          const priceRangeEl = document.getElementById('priceRange');
          if (priceRangeEl && newMin.value) priceRangeEl.value = newMin.value;
          EventBus.emit('filter:changed', {
            filters: {},
            query: (document.getElementById('searchInput') || {}).value || '',
          });
        }, 300)
      );
    }
    if (priceMax) {
      const newMax = priceMax.cloneNode(true);
      priceMax.parentNode.replaceChild(newMax, priceMax);
      newMax.addEventListener(
        'input',
        debounce(function () {
          const priceRangeEl = document.getElementById('priceRange');
          if (priceRangeEl) priceRangeEl.value = newMax.value || 200;
          EventBus.emit('filter:changed', {
            filters: {},
            query: (document.getElementById('searchInput') || {}).value || '',
          });
        }, 300)
      );
    }
    if (priceRange) {
      const newRange = priceRange.cloneNode(true);
      priceRange.parentNode.replaceChild(newRange, priceRange);
      newRange.addEventListener(
        'input',
        debounce(function () {
          const maxInput = document.getElementById('priceMax');
          if (maxInput) maxInput.value = newRange.value;
          EventBus.emit('filter:changed', {
            filters: {},
            query: (document.getElementById('searchInput') || {}).value || '',
          });
        }, 150)
      );
    }
    if (scoreRange) {
      const newScore = scoreRange.cloneNode(true);
      scoreRange.parentNode.replaceChild(newScore, scoreRange);
      newScore.addEventListener(
        'input',
        debounce(function () {
          const scoreValue = document.getElementById('scoreValue');
          if (scoreValue) scoreValue.textContent = newScore.value;
          EventBus.emit('filter:changed', {
            filters: {},
            query: (document.getElementById('searchInput') || {}).value || '',
          });
        }, 150)
      );
    }
  }

  // ===== Hook: Save recent search on every search =====
  function hookRecentSearchSaving() {
    EventBus.on('filter:changed', function (data) {
      if (data && data.query) {
        saveRecentSearch(data.query);
      }
    });
  }

  // ===== Hook: Welcome step tracking =====
  function hookWelcomeTracking() {
    EventBus.on('product:analyze', function () {
      completeWelcomeStep(3);
    });
    EventBus.on('filter:changed', function (data) {
      if (data && data.query) completeWelcomeStep(2);
    });
  }

  // ===== ACCESSIBILITY ENHANCEMENTS =====
  function enhanceAccessibility() {
    // Add ARIA roles to tab systems
    document.querySelectorAll('.cb-tabs, .sh-tabs, .bi-tabs, .osg-tabs, .spy-tabs').forEach(function (tabContainer) {
      tabContainer.setAttribute('role', 'tablist');
      tabContainer.querySelectorAll('button[class*="tab"]').forEach(function (tab, i) {
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
        if (!tab.id) tab.id = 'a11y-tab-' + Math.random().toString(36).slice(2, 8);
      });
    });

    // Add keyboard navigation for tabs (arrow keys)
    document.addEventListener('keydown', function (e) {
      const target = e.target;
      if (!target || target.getAttribute('role') !== 'tab') return;
      const tablist = target.closest('[role="tablist"]');
      if (!tablist) return;
      const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
      const idx = tabs.indexOf(target);
      if (idx === -1) return;
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = tabs[(idx + 1) % tabs.length];
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = tabs[(idx - 1 + tabs.length) % tabs.length];
        e.preventDefault();
      } else if (e.key === 'Home') {
        next = tabs[0];
        e.preventDefault();
      } else if (e.key === 'End') {
        next = tabs[tabs.length - 1];
        e.preventDefault();
      }
      if (next) {
        next.focus();
        next.click();
      }
    });

    // Add aria-label to icon-only buttons (buttons with only emoji/icon content)
    function setButtonLabel(btn) {
      if (btn.getAttribute('aria-label')) return;
      const text = btn.textContent.trim();
      const hasOnlyIcon = text.length <= 2 || btn.querySelector('svg:not([aria-label])');
      if (hasOnlyIcon) {
        const label = btn.getAttribute('title') || btn.getAttribute('data-label') || 'Button';
        btn.setAttribute('aria-label', label);
      }
    }

    function promoteInteractiveElement(el) {
      if (el.matches('a, button, input, select, textarea')) return;
      if (!el.getAttribute('role')) el.setAttribute('role', 'button');
      if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.getAttribute('aria-label') && el.textContent.trim()) {
        const label = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
        el.setAttribute('aria-label', label);
      }
    }

    function installA11yKeyboardSupport(root) {
      root.querySelectorAll('[role="button"][tabindex]').forEach(function (el) {
        if (el.dataset.a11yKeyboard) return;
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
          }
        });
        el.dataset.a11yKeyboard = 'true';
      });
    }

    document.querySelectorAll('button').forEach(setButtonLabel);
    document
      .querySelectorAll(
        '.qt-card, .trending-card, .recent-item, .sr-empty-card, .related-tool-card, .product-card, .ph-result-item, .nr-list-item, .cc-list-item, .cc-platform-card, .sci-risk-card, .sci-tip-card, .sh-pick-card, .sh-score-card, .supplier-hub-card, .pd-price-card, .pd-keyword, .pd-audience-tag, .sci-detail-product-chip, .sh-detail-product-chip, [onclick], [data-action], [data-section], [data-query]'
      )
      .forEach(promoteInteractiveElement);
    installA11yKeyboardSupport(document);

    const a11yObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          installA11yKeyboardSupport(node);
          node.querySelectorAll('button').forEach(setButtonLabel);
          node
            .querySelectorAll(
              '.qt-card, .trending-card, .recent-item, .sr-empty-card, .related-tool-card, .product-card, .ph-result-item, .nr-list-item, .cc-list-item, .cc-platform-card, .sci-risk-card, .sci-tip-card, .sh-pick-card, .sh-score-card, .supplier-hub-card, .pd-price-card, .pd-keyword, .pd-audience-tag, .sci-detail-product-chip, .sh-detail-product-chip, [onclick], [data-action], [data-section], [data-query]'
            )
            .forEach(promoteInteractiveElement);
        });
      });
    });
    a11yObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  // ===== LAZY PLUGIN LOADER — Code Splitting =====
  const PLUGIN_MANIFEST = {
    'section-product-hunt': ['plugins/product-hunt.js'],
    'section-niche-radar': ['plugins/niche-radar.js'],
    'section-market-gaps': ['plugins/market-gap-finder.js'],
    'section-lifecycle': ['plugins/product-lifecycle.js'],
    'section-ai-analyst': [
      'plugins/ai-key-manager.js',
      'plugins/ai-web-search.js',
      'plugins/ai-context-builder.js',
      'plugins/ai-risk-analyzer.js',
      'plugins/ai-chat-service.js',
      'plugins/ai-analyst.js',
    ],
    'section-spy-center': ['plugins/cb-intelligence-service.js', 'plugins/spy-center.js'],
    'section-battlefield': ['plugins/cb-intelligence-service.js', 'plugins/competitor-battlefield.js'],
    'section-profit-lab': ['plugins/profit-calculator.js'],
    'section-budget': ['plugins/ad-budget-allocator.js'],
    'section-supplier-hub': ['plugins/supplier-hub.js'],
    'section-supplier-intel': ['plugins/supplier-intelligence.js'],
    'section-shipping-calc': ['plugins/shipping-calculator.js'],
    'section-order-tracker': ['plugins/order-tracker.js'],
    'section-refund-shield': ['plugins/refund-shield.js'],
    'section-refund-detail': ['plugins/refund-detail.js'],
    'section-refund-root-cause': ['plugins/refund-root-cause.js'],
    'section-refund-supplier-risk': ['plugins/refund-supplier-risk.js'],
    'section-cash-flow': ['plugins/cash-flow.js'],
    'section-listing-optimizer': ['plugins/listing-optimizer.js'],
    'section-store-connect': ['plugins/store-connect.js'],
    'section-ad-studio': ['plugins/ai-key-manager.js', 'plugins/ad-studio.js'],
    'section-health': ['plugins/store-health.js'],
    'section-coach': [
      'plugins/ai-key-manager.js',
      'plugins/ai-web-search.js',
      'plugins/ai-context-builder.js',
      'plugins/ai-system-health.js',
      'plugins/ai-risk-analyzer.js',
      'plugins/ai-chat-service.js',
      'plugins/ai-business-coach.js',
    ],
    'section-ai-settings': [
      'plugins/ai-key-manager.js',
      'plugins/ai-web-search.js',
      'plugins/platform-connectors.js',
      'plugins/ai-settings.js',
    ],
    'section-settings': ['plugins/settings-page.js'],
  };

  const _loadedPlugins = new Set();
  // FIX #1: Use Map for proper promise caching to prevent race conditions
  const _loadingPlugins = new Map();
  // FIX #1: Add a queue for pending load requests to prevent duplicate loads
  const _pendingLoads = new Map();
  const CRITICAL_PLUGINS = [
    'plugins/platform-connectors.js',
    'plugins/data-adapters.js',
    'plugins/search-engine.js',
    'plugins/backend-bridge.js',
    'plugins/product-grid.js',
    'plugins/product-detail.js',
    'plugins/image-fetcher.js',
    'plugins/ai-chat-widget.js',
  ];

  function _loadScript(src) {
    // Already loaded - return immediately
    if (_loadedPlugins.has(src)) return Promise.resolve();

    // FIX #1: Check if already loading - return existing promise to prevent race condition
    if (_loadingPlugins.has(src)) return _loadingPlugins.get(src);

    // FIX #1: Check if there's a pending load request - queue it
    if (_pendingLoads.has(src)) return _pendingLoads.get(src);

    // Add timeout to prevent hanging promises
    const LOAD_TIMEOUT = 30000; // 30 seconds

    // FIX #1: Create the load promise and store it immediately to prevent race conditions
    const loadPromise = new Promise(function (resolve, reject) {
      const timeoutId = setTimeout(function () {
        _loadingPlugins.delete(src);
        _pendingLoads.delete(src);
        reject(new Error('Load timeout: ' + src));
      }, LOAD_TIMEOUT);

      const script = document.createElement('script');
      script.src = src + (src.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now();
      script.onload = function () {
        clearTimeout(timeoutId);
        _loadedPlugins.add(src);
        _loadingPlugins.delete(src);
        _pendingLoads.delete(src);
        resolve();
      };
      script.onerror = function () {
        clearTimeout(timeoutId);
        _loadingPlugins.delete(src);
        _pendingLoads.delete(src);
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error('Failed to load: ' + src));
      };
      document.head.appendChild(script);
    });

    // FIX #1: Store promise in both maps for proper tracking
    _loadingPlugins.set(src, loadPromise);
    _pendingLoads.set(src, loadPromise);

    return loadPromise;
  }

  async function loadPluginsForSection(sectionId) {
    const files = PLUGIN_MANIFEST[sectionId];
    if (!files || files.length === 0) return;
    const toLoad = files.filter(function (f) {
      return !_loadedPlugins.has(f);
    });
    if (toLoad.length === 0) return;
    const beforePlugins = new Set(
      PluginRegistry.getAll().map(function (p) {
        return p.id;
      })
    );
    await Promise.all(
      toLoad.map(function (f) {
        return _loadScript(f).catch(function (e) {
          console.warn('[HuntDrop] Lazy load failed:', f, e);
        });
      })
    );
    const newPlugins = PluginRegistry.getAll().filter(function (p) {
      return !beforePlugins.has(p.id);
    });
    // Init all in parallel (init doesn't access other plugins)
    await Promise.allSettled(
      newPlugins.map(function (p) {
        return PluginRegistry.init(p.id).catch(function (e) {
          console.warn('[HuntDrop] Init after lazy load:', p.id, e);
        });
      })
    );
    // Mount infra plugins (no dependencies) in parallel, then feature plugins in parallel
    const infra = newPlugins.filter(function (p) {
      return !p.dependencies || p.dependencies.length === 0;
    });
    const features = newPlugins.filter(function (p) {
      return p.dependencies && p.dependencies.length > 0;
    });
    await Promise.allSettled(
      infra.map(function (p) {
        return PluginRegistry.mount(p.id).catch(function (e) {
          console.warn('[HuntDrop] Mount infra:', p.id, e);
        });
      })
    );
    await Promise.allSettled(
      features.map(function (p) {
        return PluginRegistry.mount(p.id).catch(function (e) {
          console.warn('[HuntDrop] Mount feature:', p.id, e);
        });
      })
    );
  }

  // Handle 'navigate' events emitted by plugins (e.g. ai-analyst)
  EventBus.on('navigate', function (data) {
    if (data && data.section) window.HuntDrop.navigateTo(data.section);
  });

  // ===== BOOT SEQUENCE =====
  document.addEventListener('DOMContentLoaded', async () => {
    if (window.HuntDrop._debug)
      console.log(`%c✦ HuntDrop AI v${Config.get('app.version')} — Booting...`, 'color: #00e5ff; font-weight: bold;');

    // 1. Setup core UI
    setupNavigation();
    setupSearch();
    setupKeyboard();
    setupOnboarding();

    // Back button
    const backBtn = document.getElementById('navBackBtn');
    if (backBtn) backBtn.addEventListener('click', () => window.HuntDrop.goBack());

    // Global click handler for all related-tool-card elements across every page
    document.addEventListener('click', function (e) {
      var card = e.target.closest('.related-tool-card[data-section]');
      if (card) {
        e.preventDefault();
        var section = card.getAttribute('data-section');
        if (section) window.HuntDrop.navigateTo(section);
      }
    });

    // 1b. Setup all new dashboard features
    setupThemeToggle(); // #15: Dark/Light Mode Toggle
    setupErrorBoundaries(); // #16: Error Boundaries
    setupKPIBar(); // #1: KPI Stats Bar
    setupQuickToolsCollapse(); // #5: Quick Tools Collapse
    setupAISignalBar(); // AI Signal Bar
    setupWelcomeState(); // #6: Welcome State for New Users
    renderRecentSearches(); // #3: Recent Searches (render on load)
    setupClearRecentSearches(); // #3: Recent Searches clear button
    setupTrendingProducts(); // #2: Trending Products
    setupFilterMobileToggle(); // #7: Filter Panel Mobile Toggle
    setupEmptyStateSuggestions(); // #11: Enhanced Empty State
    setupSearchEnhancements(); // #13: Search autocomplete & dropdown
    setupVoiceSearch(); // #13: Voice Search
    setupFeelingLucky(); // #13: I'm Feeling Lucky
    hookRecentSearchSaving(); // #3: Hook to save recent searches
    hookWelcomeTracking(); // #6: Hook welcome step tracking

    // 2. Load critical plugins first (data-adapters, search-engine, product-grid, product-detail)
    await Promise.all(
      CRITICAL_PLUGINS.map(function (src) {
        return _loadScript(src).catch(function (e) {
          console.error('[HuntDrop] Critical plugin load failed:', src, e);
        });
      })
    );

    const criticalPlugins = PluginRegistry.getAll();
    await Promise.allSettled(
      criticalPlugins.map(function (p) {
        return PluginRegistry.init(p.id).catch(function (e) {
          console.error('[HuntDrop] Critical init failed:', p.id, e);
        });
      })
    );
    await Promise.allSettled(
      criticalPlugins.map(function (p) {
        return PluginRegistry.mount(p.id).catch(function (e) {
          console.error('[HuntDrop] Critical mount failed:', p.id, e);
        });
      })
    );

    // 3. Restore last visited section or default to dashboard (lazy-loads plugins on demand)
    const savedSection = Config.get('app.currentSection', 'section-dashboard');
    const targetExists = document.getElementById(savedSection) || PLUGIN_MANIFEST[savedSection];
    await window.HuntDrop.navigateTo(targetExists ? savedSection : 'section-dashboard', true);

    // 4. Setup debounced filters before initial search to ensure debounce is active
    setupDebouncedFilters(); // #14: Debounce filter inputs

    // 4b. Initial search to populate grid
    EventBus.emit('filter:changed', { filters: {}, query: '' });

    // 5. Accessibility enhancements
    enhanceAccessibility();

    // 6. Register Service Worker for offline support (skip on file:// protocol)
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker
          .register('/sw.js')
          .then(function (reg) {
            if (window.HuntDrop._debug) console.log('[HuntDrop] Service Worker registered:', reg.scope);
          })
          .catch(function (err) {
            console.warn('[HuntDrop] Service Worker registration failed:', err);
          });
      });
    }

    if (window.HuntDrop._debug)
      console.log(
        `%c✦ HuntDrop AI Ready — ${criticalPlugins.length} critical plugins loaded, remaining lazy-loaded on navigation`,
        'color: #00ff88; font-weight: bold;'
      );
  })
  // ===== Mobile-Specific Handling =====
  
  // Touch event support for mobile devices
  function setupMobileTouch() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-device');
    }
  }
  
  // Mobile sidebar swipe-to-close
  function setupMobileSwipe() {
    const sidebar = document.getElementById('appSidebar');
    if (!sidebar) return;
    let touchStartX = 0;
    let isSwiping = false;
    sidebar.addEventListener('touchstart', function(e) {
      touchStartX = e.touches[0].clientX;
      isSwiping = true;
    }, { passive: true });
    sidebar.addEventListener('touchmove', function(e) {
      if (!isSwiping) return;
      const touchX = e.touches[0].clientX;
      const diffX = touchStartX - touchX;
      if (diffX < -50) {
        sidebar.classList.remove('mobile-open');
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (backdrop) backdrop.classList.remove('visible');
        isSwiping = false;
      }
    }, { passive: true });
    sidebar.addEventListener('touchend', function() { isSwiping = false; }, { passive: true });
  }
  
  // Mobile viewport resize handler
  function setupMobileViewport() {
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        const sidebar = document.getElementById('appSidebar');
        if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('mobile-open')) {
          sidebar.classList.remove('mobile-open');
          const backdrop = document.querySelector('.sidebar-backdrop');
          if (backdrop) backdrop.classList.remove('visible');
        }
        if (window.innerWidth <= 768) {
          document.body.classList.add('mobile-view');
        } else {
          document.body.classList.remove('mobile-view');
        }
      }, 150);
    });
    if (window.innerWidth <= 768) document.body.classList.add('mobile-view');
  }
  
  // Mobile-optimized navigation - close sidebar on navigate
  function setupMobileNav() {
    const origNavigate = window.HuntDrop.navigateTo;
    if (origNavigate) {
      window.HuntDrop.navigateTo = async function(sectionId, skipHistory) {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
          sidebar.classList.remove('mobile-open');
          const backdrop = document.querySelector('.sidebar-backdrop');
          if (backdrop) backdrop.classList.remove('visible');
        }
        return origNavigate.call(this, sectionId, skipHistory);
      };
    }
  }
  
  setupMobileTouch();
  setupMobileSwipe();
  setupMobileViewport();
  setupMobileNav();
})();
