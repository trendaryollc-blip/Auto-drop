// ============================================================================
// SETTINGS PAGE — Comprehensive app settings with sidebar navigation
// ============================================================================
(function () {
  'use strict';

  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;
  const esc = UI.escapeHtml;

  // ===== Settings Storage =====
  const SETTINGS_KEY = 'huntdrop_settings';
  const DEFAULTS = {
    general: {
      appName: 'HuntDrop AI',
      defaultSection: 'dashboard',
      language: 'en',
    },
    appearance: {
      theme: 'dark',
      accentColor: '#00e5ff',
      fontSize: 14,
      compactMode: false,
      animations: true,
    },
    ai: {
      defaultProvider: 'groq',
      defaultModel: 'llama3-70b-8192',
      webSearchProvider: 'none',
    },
    search: {
      defaultPlatform: 'all',
      resultsPerPage: 20,
      fuzzyTolerance: 0.6,
      defaultSort: 'score',
      autoSearch: true,
      saveRecentSearches: true,
      maxRecentSearches: 8,
    },
    research: {
      autoAnalyze: false,
      showTrending: true,
      nicheMinScore: 70,
      marketGapThreshold: 30,
    },
    intelligence: {
      defaultDepth: 'standard',
      autoRefresh: false,
      competitorLimit: 10,
    },
    financial: {
      defaultShippingCost: 5.0,
      defaultTaxRate: 0,
      platformFeePercent: 15,
      currency: 'USD',
      forecastModel: 'linear',
    },
    sourcing: {
      minSupplierRating: 4.0,
      preferredShipping: 'epacket',
      maxShippingDays: 30,
    },
    marketing: {
      adPlatform: 'facebook',
      contentFrequency: 'weekly',
      toneOfVoice: 'professional',
    },
    store: {
      autoOptimize: false,
      healthThreshold: 80,
      bundleSize: 3,
    },
    data: {
      persistHistory: true,
      analyticsEnabled: false,
    },
  };

  function loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return JSON.parse(JSON.stringify(DEFAULTS)) && mergeDeep(JSON.parse(JSON.stringify(DEFAULTS)), parsed);
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  function mergeDeep(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  function getSetting(path) {
    const settings = loadSettings();
    const parts = path.split('.');
    let val = settings;
    for (const p of parts) {
      if (val && typeof val === 'object') val = val[p];
      else return undefined;
    }
    return val;
  }

  function setSetting(path, value) {
    const settings = loadSettings();
    const parts = path.split('.');
    let obj = settings;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    saveSettings(settings);
    showSaveToast();
  }

  let _toastTimeout;
  function showSaveToast() {
    let toast = document.getElementById('sp-save-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sp-save-toast';
      toast.className = 'sp-save-toast';
      toast.innerHTML =
        '<span class="sp-save-toast-icon">&#10003;</span><span class="sp-save-toast-text">Settings saved</span>';
      document.body.appendChild(toast);
    }
    toast.style.display = 'flex';
    clearTimeout(_toastTimeout);
    _toastTimeout = setTimeout(function () {
      toast.style.display = 'none';
    }, 2000);
  }

  // ===== SVG Icons =====
  const ICONS = {
    general:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    appearance:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    ai: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20.66 6A10 10 0 0 0 12 2v10h10a10 10 0 0 0-1.34-6z"/></svg>',
    platforms:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    search:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    research:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    intelligence:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    financial:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    sourcing:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    marketing:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    store:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    data: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    about:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    chevron:
      '<svg class="sp-nav-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  };

  // ===== Build HTML =====
  function render() {
    const s = loadSettings();
    const platforms = [
      { id: 'aliexpress', name: 'AliExpress', icon: '🟢' },
      { id: 'amazon', name: 'Amazon', icon: '📦' },
      { id: 'shopify', name: 'Shopify', icon: '🛒' },
      { id: 'ebay', name: 'eBay', icon: '🏷' },
      { id: 'temu', name: 'Temu', icon: '🔥' },
      { id: 'tiktok', name: 'TikTok', icon: '🎵' },
      { id: 'etsy', name: 'Etsy', icon: '🎨' },
      { id: 'cjdropshipping', name: 'CJ Drop', icon: '✈' },
      { id: 'dhgate', name: 'DHgate', icon: '🏪' },
      { id: 'wish', name: 'Wish', icon: '⭐' },
    ];

    const providers = [
      'groq',
      'openai',
      'anthropic',
      'google',
      'deepseek',
      'mistral',
      'cohere',
      'together',
      'huggingface',
      'perplexity',
      'fireworks',
      'openrouter',
      'replicate',
      'octoai',
      'lepton',
    ];
    const providerOpts = providers
      .map(
        (p) =>
          '<option value="' +
          esc(p) +
          '"' +
          (s.ai.defaultProvider === p ? ' selected' : '') +
          '>' +
          esc(p.charAt(0).toUpperCase() + p.slice(1)) +
          '</option>'
      )
      .join('');

    const sections = [
      {
        id: 'general',
        label: 'General',
        icon: ICONS.general,
        items: [
          {
            id: 'defaultSection',
            label: 'Default Section',
            hint: 'Which page loads on startup',
            type: 'select',
            options: [
              { value: 'dashboard', label: 'Dashboard' },
              { value: 'product-hunt', label: 'AI Hunt' },
              { value: 'niche-radar', label: 'Niche Finder' },
              { value: 'profit-lab', label: 'Profit Calculator' },
              { value: 'ai-settings', label: 'AI Settings' },
            ],
            value: s.general.defaultSection,
          },
          {
            id: 'language',
            label: 'Language',
            hint: 'Interface language',
            type: 'select',
            options: [
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Espa\u00f1ol' },
              { value: 'fr', label: 'Fran\u00e7ais' },
              { value: 'de', label: 'Deutsch' },
              { value: 'zh', label: '中文' },
              { value: 'ja', label: '日本語' },
            ],
            value: s.general.language,
          },
        ],
      },
      {
        id: 'appearance',
        label: 'Appearance',
        icon: ICONS.appearance,
        items: [
          {
            id: 'theme',
            label: 'Theme',
            hint: 'Switch between dark and light mode',
            type: 'select',
            options: [
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ],
            value: s.appearance.theme,
          },
          {
            id: 'accentColor',
            label: 'Accent Color',
            hint: 'Primary accent color used throughout the app',
            type: 'color',
            value: s.appearance.accentColor,
          },
          {
            id: 'fontSize',
            label: 'Font Size',
            hint: 'Base font size for the interface',
            type: 'range',
            min: 12,
            max: 18,
            step: 1,
            value: s.appearance.fontSize,
            unit: 'px',
          },
          {
            id: 'compactMode',
            label: 'Compact Mode',
            hint: 'Reduce spacing and padding for more content on screen',
            type: 'toggle',
            value: s.appearance.compactMode,
          },
          {
            id: 'animations',
            label: 'Animations',
            hint: 'Enable smooth transitions and micro-interactions',
            type: 'toggle',
            value: s.appearance.animations,
          },
        ],
      },
      {
        id: 'ai',
        label: 'AI & Providers',
        icon: ICONS.ai,
        items: [
          {
            id: 'defaultProvider',
            label: 'Default AI Provider',
            hint: 'Provider used for AI features when no feature-specific override is set',
            type: 'select',
            options: providers.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })),
            value: s.ai.defaultProvider,
          },
          {
            id: 'defaultModel',
            label: 'Default Model',
            hint: 'Model name sent in API requests',
            type: 'text',
            placeholder: 'e.g. llama3-70b-8192',
            value: s.ai.defaultModel,
          },
          {
            id: 'webSearchProvider',
            label: 'Web Search Provider',
            hint: 'Provider for real-time web search results',
            type: 'select',
            options: [
              { value: 'none', label: 'None (Disabled)' },
              { value: 'tavily', label: 'Tavily' },
              { value: 'serper', label: 'Serper' },
              { value: 'brave', label: 'Brave Search' },
            ],
            value: s.ai.webSearchProvider,
          },
        ],
      },
      {
        id: 'platforms',
        label: 'Platform Connectors',
        icon: ICONS.platforms,
        items: platforms.map((p) => ({
          id: p.id,
          label: p.name,
          icon: p.icon,
          type: 'platform',
        })),
      },
      {
        id: 'search',
        label: 'Search',
        icon: ICONS.search,
        items: [
          {
            id: 'defaultPlatform',
            label: 'Default Platform',
            hint: 'Pre-selected platform in search dropdown',
            type: 'select',
            options: [
              { value: 'all', label: 'All Platforms' },
              ...platforms.map((p) => ({ value: p.id, label: p.name })),
            ],
            value: s.search.defaultPlatform,
          },
          {
            id: 'resultsPerPage',
            label: 'Results Per Page',
            hint: 'Number of products shown per page',
            type: 'range',
            min: 10,
            max: 50,
            step: 5,
            value: s.search.resultsPerPage,
          },
          {
            id: 'fuzzyTolerance',
            label: 'Fuzzy Search Tolerance',
            hint: 'How closely results must match your query (0 = strict, 1 = very fuzzy)',
            type: 'range',
            min: 0,
            max: 1,
            step: 0.1,
            value: s.search.fuzzyTolerance,
          },
          {
            id: 'defaultSort',
            label: 'Default Sort',
            hint: 'How results are ordered by default',
            type: 'select',
            options: [
              { value: 'score', label: 'AI Score' },
              { value: 'trending', label: 'Trending' },
              { value: 'profit', label: 'Profit' },
              { value: 'velocity', label: 'Sales Velocity' },
              { value: 'price-low', label: 'Price: Low to High' },
              { value: 'price-high', label: 'Price: High to Low' },
            ],
            value: s.search.defaultSort,
          },
          {
            id: 'autoSearch',
            label: 'Auto Search',
            hint: 'Automatically search when filters change',
            type: 'toggle',
            value: s.search.autoSearch,
          },
          {
            id: 'saveRecentSearches',
            label: 'Save Recent Searches',
            hint: 'Remember your search history',
            type: 'toggle',
            value: s.search.saveRecentSearches,
          },
          {
            id: 'maxRecentSearches',
            label: 'Max Recent Searches',
            hint: 'Maximum number of recent searches to keep',
            type: 'range',
            min: 4,
            max: 20,
            step: 1,
            value: s.search.maxRecentSearches,
          },
        ],
      },
      {
        id: 'research',
        label: 'Research Tools',
        icon: ICONS.research,
        items: [
          {
            id: 'showTrending',
            label: 'Show Trending Products',
            hint: 'Display trending products on the dashboard',
            type: 'toggle',
            value: s.research.showTrending,
          },
          {
            id: 'autoAnalyze',
            label: 'Auto-Analyze Products',
            hint: 'Automatically run AI analysis when viewing a product',
            type: 'toggle',
            value: s.research.autoAnalyze,
          },
          {
            id: 'nicheMinScore',
            label: 'Niche Minimum Score',
            hint: 'Minimum AI score for niche recommendations',
            type: 'range',
            min: 50,
            max: 90,
            step: 5,
            value: s.research.nicheMinScore,
          },
          {
            id: 'marketGapThreshold',
            label: 'Market Gap Threshold',
            hint: 'Maximum competition % to flag as a market gap',
            type: 'range',
            min: 10,
            max: 60,
            step: 5,
            value: s.research.marketGapThreshold,
          },
        ],
      },
      {
        id: 'intelligence',
        label: 'Intelligence',
        icon: ICONS.intelligence,
        items: [
          {
            id: 'defaultDepth',
            label: 'Analysis Depth',
            hint: 'Default depth for AI-powered analyses',
            type: 'select',
            options: [
              { value: 'quick', label: 'Quick' },
              { value: 'standard', label: 'Standard' },
              { value: 'deep', label: 'Deep Dive' },
            ],
            value: s.intelligence.defaultDepth,
          },
          {
            id: 'autoRefresh',
            label: 'Auto-Refresh Data',
            hint: 'Automatically refresh competitor data',
            type: 'toggle',
            value: s.intelligence.autoRefresh,
          },
          {
            id: 'competitorLimit',
            label: 'Competitor Limit',
            hint: 'Max competitors to track per product',
            type: 'range',
            min: 5,
            max: 25,
            step: 1,
            value: s.intelligence.competitorLimit,
          },
        ],
      },
      {
        id: 'financial',
        label: 'Financial',
        icon: ICONS.financial,
        items: [
          {
            id: 'defaultShippingCost',
            label: 'Default Shipping Cost',
            hint: 'Assumed shipping cost for profit calculations ($)',
            type: 'number',
            placeholder: '5.00',
            value: s.financial.defaultShippingCost,
          },
          {
            id: 'defaultTaxRate',
            label: 'Default Tax Rate',
            hint: 'Sales tax rate for profit calculations (%)',
            type: 'number',
            placeholder: '0',
            value: s.financial.defaultTaxRate,
          },
          {
            id: 'platformFeePercent',
            label: 'Platform Fee',
            hint: 'Marketplace fee percentage (%)',
            type: 'range',
            min: 0,
            max: 30,
            step: 1,
            value: s.financial.platformFeePercent,
            unit: '%',
          },
          {
            id: 'currency',
            label: 'Currency',
            hint: 'Currency for financial displays',
            type: 'select',
            options: [
              { value: 'USD', label: 'USD ($)' },
              { value: 'EUR', label: 'EUR (\u20ac)' },
              { value: 'GBP', label: 'GBP (\u00a3)' },
              { value: 'CAD', label: 'CAD (C$)' },
              { value: 'AUD', label: 'AUD (A$)' },
            ],
            value: s.financial.currency,
          },
          {
            id: 'forecastModel',
            label: 'Forecast Model',
            hint: 'AI model for sales predictions',
            type: 'select',
            options: [
              { value: 'linear', label: 'Linear Regression' },
              { value: 'polynomial', label: 'Polynomial' },
              { value: 'exponential', label: 'Exponential' },
              { value: 'ai', label: 'AI-Powered' },
            ],
            value: s.financial.forecastModel,
          },
        ],
      },
      {
        id: 'sourcing',
        label: 'Sourcing',
        icon: ICONS.sourcing,
        items: [
          {
            id: 'minSupplierRating',
            label: 'Minimum Supplier Rating',
            hint: 'Filter suppliers below this rating',
            type: 'range',
            min: 3,
            max: 5,
            step: 0.1,
            value: s.sourcing.minSupplierRating,
          },
          {
            id: 'preferredShipping',
            label: 'Preferred Shipping Method',
            hint: 'Default shipping method for estimates',
            type: 'select',
            options: [
              { value: 'epacket', label: 'ePacket' },
              { value: 'aliexpress', label: 'AliExpress Standard' },
              { value: 'china-post', label: 'China Post' },
              { value: 'dhl', label: 'DHL Express' },
              { value: 'fedex', label: 'FedEx' },
            ],
            value: s.sourcing.preferredShipping,
          },
          {
            id: 'maxShippingDays',
            label: 'Max Shipping Days',
            hint: 'Maximum acceptable delivery time',
            type: 'range',
            min: 7,
            max: 60,
            step: 1,
            value: s.sourcing.maxShippingDays,
            unit: ' days',
          },
        ],
      },
      {
        id: 'marketing',
        label: 'Marketing',
        icon: ICONS.marketing,
        items: [
          {
            id: 'adPlatform',
            label: 'Default Ad Platform',
            hint: 'Platform for ad creative generation',
            type: 'select',
            options: [
              { value: 'facebook', label: 'Facebook/Meta' },
              { value: 'tiktok', label: 'TikTok' },
              { value: 'instagram', label: 'Instagram' },
              { value: 'google', label: 'Google Ads' },
            ],
            value: s.marketing.adPlatform,
          },
          {
            id: 'contentFrequency',
            label: 'Content Frequency',
            hint: 'How often to post content',
            type: 'select',
            options: [
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'biweekly', label: 'Bi-Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ],
            value: s.marketing.contentFrequency,
          },
          {
            id: 'toneOfVoice',
            label: 'Tone of Voice',
            hint: 'Default tone for generated content',
            type: 'select',
            options: [
              { value: 'professional', label: 'Professional' },
              { value: 'casual', label: 'Casual' },
              { value: 'playful', label: 'Playful' },
              { value: 'urgent', label: 'Urgent' },
            ],
            value: s.marketing.toneOfVoice,
          },
        ],
      },
      {
        id: 'store',
        label: 'Store',
        icon: ICONS.store,
        items: [
          {
            id: 'autoOptimize',
            label: 'Auto-Optimize Listings',
            hint: 'Automatically optimize product titles and descriptions',
            type: 'toggle',
            value: s.store.autoOptimize,
          },
          {
            id: 'healthThreshold',
            label: 'Health Score Threshold',
            hint: 'Minimum store health score to pass audit',
            type: 'range',
            min: 50,
            max: 100,
            step: 5,
            value: s.store.healthThreshold,
          },
          {
            id: 'bundleSize',
            label: 'Default Bundle Size',
            hint: 'Number of products per bundle recommendation',
            type: 'range',
            min: 2,
            max: 6,
            step: 1,
            value: s.store.bundleSize,
          },
        ],
      },
      {
        id: 'data',
        label: 'Data & Privacy',
        icon: ICONS.data,
        items: [
          {
            id: 'persistHistory',
            label: 'Persist Search History',
            hint: 'Save search history across sessions',
            type: 'toggle',
            value: s.data.persistHistory,
          },
          {
            id: 'analyticsEnabled',
            label: 'Usage Analytics',
            hint: 'Help improve HuntDrop by sharing anonymous usage data',
            type: 'toggle',
            value: s.data.analyticsEnabled,
          },
        ],
      },
      {
        id: 'about',
        label: 'About',
        icon: ICONS.about,
        items: [
          { id: 'version', label: 'App Version', type: 'display', value: '3.0.0' },
          {
            id: 'plugins',
            label: 'Loaded Plugins',
            type: 'display',
            value: PluginRegistry.getAll().length + ' active',
          },
          { id: 'shortcuts', label: 'Keyboard Shortcuts', type: 'shortcuts' },
        ],
      },
    ];

    // Build sidebar nav
    let sidebarHtml =
      '<div class="sp-sidebar-header"><div class="sp-sidebar-title">Settings</div><div class="sp-sidebar-sub">Configure your HuntDrop experience</div></div>';
    sections.forEach(function (sec, i) {
      sidebarHtml +=
        '<div class="sp-nav-item' +
        (i === 0 ? ' active' : '') +
        '" data-section="' +
        esc(sec.id) +
        '">' +
        '<span class="sp-nav-group-icon" style="color:var(--accent-cyan)">' +
        sec.icon +
        '</span>' +
        '<span>' +
        esc(sec.label) +
        '</span></div>';
    });

    // Build main content
    let mainHtml =
      '<div class="sp-search"><span class="sp-search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span><input type="text" class="sp-search-input" id="spSearchInput" placeholder="Search settings..."></div>';

    sections.forEach(function (sec) {
      mainHtml +=
        '<div class="sp-section' + (sec.id === 'general' ? ' active' : '') + '" id="sp-section-' + esc(sec.id) + '">';
      mainHtml += '<div class="sp-section-header"><h2 class="sp-section-title">' + esc(sec.label) + '</h2>';
      if (sec.id === 'general')
        mainHtml += '<p class="sp-section-desc">Basic application settings and preferences.</p>';
      else if (sec.id === 'appearance')
        mainHtml += '<p class="sp-section-desc">Customize the look and feel of HuntDrop AI.</p>';
      else if (sec.id === 'ai')
        mainHtml += '<p class="sp-section-desc">Configure AI providers, models, and feature assignments.</p>';
      else if (sec.id === 'platforms')
        mainHtml += '<p class="sp-section-desc">Manage API keys and connections for data platforms.</p>';
      else if (sec.id === 'search')
        mainHtml += '<p class="sp-section-desc">Control how product search and filtering works.</p>';
      else if (sec.id === 'research')
        mainHtml += '<p class="sp-section-desc">Preferences for product discovery and niche analysis tools.</p>';
      else if (sec.id === 'intelligence')
        mainHtml +=
          '<p class="sp-section-desc">Settings for AI analysis, competitor tracking, and intelligence tools.</p>';
      else if (sec.id === 'financial')
        mainHtml +=
          '<p class="sp-section-desc">Default values for profit calculations, forecasting, and budgeting.</p>';
      else if (sec.id === 'sourcing')
        mainHtml += '<p class="sp-section-desc">Supplier preferences and shipping defaults.</p>';
      else if (sec.id === 'marketing')
        mainHtml += '<p class="sp-section-desc">Ad creative and content generation preferences.</p>';
      else if (sec.id === 'store')
        mainHtml += '<p class="sp-section-desc">Store builder, health audit, and bundle settings.</p>';
      else if (sec.id === 'data')
        mainHtml += '<p class="sp-section-desc">Manage your data, history, and privacy preferences.</p>';
      else if (sec.id === 'about')
        mainHtml += '<p class="sp-section-desc">Application information and keyboard shortcuts.</p>';
      mainHtml += '</div>';

      if (sec.id === 'platforms') {
        mainHtml +=
          '<div class="sp-group"><div class="sp-group-title">Platform Connections</div><div class="sp-group-desc">Connect to platforms for real-time product data. API keys are stored locally in your browser.</div><div class="sp-platform-grid">';
        platforms.forEach(function (p) {
          const key = localStorage.getItem('huntdrop_platform_key_' + p.id);
          const connected = !!key;
          mainHtml +=
            '<div class="sp-platform-card" data-platform="' +
            esc(p.id) +
            '">' +
            '<div class="sp-platform-icon">' +
            p.icon +
            '</div>' +
            '<div class="sp-platform-info"><div class="sp-platform-name">' +
            esc(p.name) +
            '</div>' +
            '<div class="sp-platform-status">' +
            (connected
              ? '<span class="sp-badge sp-badge-green"><span class="sp-badge-dot"></span>Connected</span>'
              : '<span class="sp-badge sp-badge-orange"><span class="sp-badge-dot"></span>Not Connected</span>') +
            '</div></div></div>';
        });
        mainHtml += '</div></div>';
      } else if (sec.id === 'about') {
        mainHtml +=
          '<div class="sp-group"><div class="sp-group-title">Application Info</div><div class="sp-group-desc">Details about your HuntDrop AI installation.</div>' +
          '<div class="sp-row"><div class="sp-row-info"><div class="sp-row-label">Version</div></div><div class="sp-row-control"><span class="sp-badge sp-badge-cyan">v3.0.0</span></div></div>' +
          '<div class="sp-row"><div class="sp-row-info"><div class="sp-row-label">Active Plugins</div><div class="sp-row-hint">' +
          PluginRegistry.getAll().length +
          ' plugins loaded</div></div><div class="sp-row-control"><span class="sp-badge sp-badge-green"><span class="sp-badge-dot"></span>Running</span></div></div>' +
          '<div class="sp-row"><div class="sp-row-info"><div class="sp-row-label">Platforms Supported</div></div><div class="sp-row-control"><span class="sp-badge sp-badge-purple">10 platforms</span></div></div>' +
          '</div>';

        // Keyboard shortcuts
        mainHtml +=
          '<div class="sp-group"><div class="sp-group-title">Keyboard Shortcuts</div><div class="sp-group-desc">Quick keyboard shortcuts for navigating HuntDrop.</div>' +
          '<table class="sp-shortcuts-table"><thead><tr><th>Action</th><th>Shortcut</th></tr></thead><tbody>' +
          '<tr><td>Focus Search</td><td><span class="sp-kbd"><kbd>/</kbd></span></td></tr>' +
          '<tr><td>Go Back</td><td><span class="sp-kbd"><kbd>Alt</kbd>+<kbd>←</kbd></span></td></tr>' +
          '<tr><td>Close Modal / Dropdown</td><td><span class="sp-kbd"><kbd>Esc</kbd></span></td></tr>' +
          '<tr><td>Navigate Tabs</td><td><span class="sp-kbd"><kbd>←</kbd> <kbd>→</kbd></span></td></tr>' +
          '</tbody></table></div>';

        // Danger zone
        mainHtml +=
          '<div class="sp-group sp-danger-zone"><div class="sp-group-title">Danger Zone</div><div class="sp-group-desc">Irreversible actions. Proceed with caution.</div>' +
          '<div class="sp-row"><div class="sp-row-info"><div class="sp-row-label">Reset All Settings</div><div class="sp-row-hint">Restore all settings to their default values</div></div><div class="sp-row-control"><button class="sp-btn sp-btn-danger sp-btn-sm" id="spResetSettings">Reset Settings</button></div></div>' +
          '<div class="sp-row"><div class="sp-row-info"><div class="sp-row-label">Clear All Data</div><div class="sp-row-hint">Remove all saved products, recent searches, and preferences</div></div><div class="sp-row-control"><button class="sp-btn sp-btn-danger sp-btn-sm" id="spClearAllData">Clear All Data</button></div></div>' +
          '</div>';
      } else {
        mainHtml += '<div class="sp-group">';
        sec.items.forEach(function (item) {
          if (item.type === 'platform') return;
          mainHtml += '<div class="sp-row" data-setting="' + esc(sec.id) + '.' + esc(item.id) + '">';
          mainHtml += '<div class="sp-row-info"><div class="sp-row-label">' + esc(item.label) + '</div>';
          if (item.hint) mainHtml += '<div class="sp-row-hint">' + esc(item.hint) + '</div>';
          mainHtml += '</div><div class="sp-row-control">';

          if (item.type === 'toggle') {
            mainHtml +=
              '<label class="sp-toggle"><input type="checkbox" data-path="' +
              esc(sec.id) +
              '.' +
              esc(item.id) +
              '"' +
              (item.value ? ' checked' : '') +
              '><span class="sp-toggle-track"></span><span class="sp-toggle-thumb"></span></label>';
          } else if (item.type === 'select') {
            mainHtml += '<select class="sp-select" data-path="' + esc(sec.id) + '.' + esc(item.id) + '">';
            item.options.forEach(function (o) {
              mainHtml +=
                '<option value="' +
                esc(o.value) +
                '"' +
                (item.value === o.value ? ' selected' : '') +
                '>' +
                esc(o.label) +
                '</option>';
            });
            mainHtml += '</select>';
          } else if (item.type === 'text') {
            mainHtml +=
              '<input type="text" class="sp-input" data-path="' +
              esc(sec.id) +
              '.' +
              esc(item.id) +
              '" value="' +
              esc(item.value || '') +
              '" placeholder="' +
              esc(item.placeholder || '') +
              '">';
          } else if (item.type === 'number') {
            mainHtml +=
              '<input type="number" class="sp-input" data-path="' +
              esc(sec.id) +
              '.' +
              esc(item.id) +
              '" value="' +
              esc(item.value || '') +
              '" placeholder="' +
              esc(item.placeholder || '') +
              '" step="0.01">';
          } else if (item.type === 'range') {
            mainHtml +=
              '<div class="sp-range-wrap"><input type="range" class="sp-range" data-path="' +
              esc(sec.id) +
              '.' +
              esc(item.id) +
              '" min="' +
              item.min +
              '" max="' +
              item.max +
              '" step="' +
              item.step +
              '" value="' +
              item.value +
              '"><span class="sp-range-val" id="sp-val-' +
              esc(sec.id) +
              '-' +
              esc(item.id) +
              '">' +
              item.value +
              (item.unit || '') +
              '</span></div>';
          } else if (item.type === 'color') {
            mainHtml +=
              '<div class="sp-color-row"><div class="sp-color-swatch"><input type="color" data-path="' +
              esc(sec.id) +
              '.' +
              esc(item.id) +
              '" value="' +
              esc(item.value) +
              '"></div><span class="sp-color-label">' +
              esc(item.value) +
              '</span></div>';
          }

          mainHtml += '</div></div>';
        });
        mainHtml += '</div>';
      }
      mainHtml += '</div>';
    });

    return (
      '<div class="sp-page"><div class="sp-sidebar" id="spSidebar">' +
      sidebarHtml +
      '</div><div class="sp-main" id="spMain">' +
      mainHtml +
      '</div></div>'
    );
  }

  // ===== Plugin Registration =====
  PluginRegistry.register('settings-page', {
    id: 'settings-page',
    name: 'Settings Page',
    version: '1.0.0',
    dependencies: [],

    mount: function () {
      const container = UI.$('sections-container');
      if (!container) return;
      const section = document.createElement('section');
      section.className = 'section section-settings';
      section.id = 'section-settings';
      section.innerHTML = render();
      container.appendChild(section);
      bindEvents();
    },

    unmount: function () {
      const section = document.getElementById('section-settings');
      if (section) section.remove();
    },
  });

  function bindEvents() {
    // Sidebar item clicks
    const sidebar = document.getElementById('spSidebar');
    if (sidebar) {
      sidebar.querySelectorAll('.sp-nav-item').forEach(function (item) {
        item.addEventListener('click', function (e) {
          e.preventDefault();
          const sectionId = this.dataset.section;
          if (!sectionId) return;
          const sectionEl = document.getElementById('section-settings');
          if (sectionEl) {
            sectionEl.querySelectorAll('.sp-section').forEach(function (s) {
              s.classList.remove('active');
            });
          }
          sidebar.querySelectorAll('.sp-nav-item').forEach(function (n) {
            n.classList.remove('active');
          });
          this.classList.add('active');
          const target = document.getElementById('sp-section-' + sectionId);
          if (target) target.classList.add('active');
        });
      });
    }

    // Toggle switches
    document.querySelectorAll('.sp-toggle input[type="checkbox"]').forEach(function (input) {
      input.addEventListener('change', function () {
        setSetting(this.dataset.path, this.checked);
      });
    });

    // Select dropdowns
    document.querySelectorAll('.sp-select').forEach(function (select) {
      select.addEventListener('change', function () {
        setSetting(this.dataset.path, this.value);
        // Apply theme change immediately
        if (this.dataset.path === 'appearance.theme') {
          if (this.value === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
          try {
            localStorage.setItem('huntdrop_theme', this.value);
          } catch (e) {}
        }
      });
    });

    // Text inputs
    document.querySelectorAll('.sp-input[type="text"], .sp-input[type="number"]').forEach(function (input) {
      input.addEventListener('change', function () {
        const val = this.type === 'number' ? parseFloat(this.value) || 0 : this.value;
        setSetting(this.dataset.path, val);
      });
    });

    // Range sliders
    document.querySelectorAll('.sp-range').forEach(function (range) {
      const valEl = document.getElementById('sp-val-' + range.dataset.path.replace('.', '-'));
      range.addEventListener('input', function () {
        if (valEl) {
          let unit = '';
          if (this.dataset.path === 'financial.platformFeePercent') unit = '%';
          else if (this.dataset.path === 'appearance.fontSize') unit = 'px';
          else if (this.dataset.path === 'sourcing.maxShippingDays') unit = ' days';
          valEl.textContent = this.value + unit;
        }
      });
      range.addEventListener('change', function () {
        setSetting(this.dataset.path, parseFloat(this.value));
      });
    });

    // Color picker
    document.querySelectorAll('.sp-color-swatch input[type="color"]').forEach(function (picker) {
      picker.addEventListener('input', function () {
        const label = this.closest('.sp-color-row').querySelector('.sp-color-label');
        if (label) label.textContent = this.value;
      });
      picker.addEventListener('change', function () {
        setSetting(this.dataset.path, this.value);
      });
    });

    // Settings search
    const searchInput = document.getElementById('spSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase().trim();
        document.querySelectorAll('.sp-row').forEach(function (row) {
          const label = (row.querySelector('.sp-row-label') || {}).textContent || '';
          const hint = (row.querySelector('.sp-row-hint') || {}).textContent || '';
          const match = !query || label.toLowerCase().indexOf(query) !== -1 || hint.toLowerCase().indexOf(query) !== -1;
          row.style.display = match ? '' : 'none';
        });
      });
    }

    // Reset settings
    const resetBtn = document.getElementById('spResetSettings');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (confirm('Reset all settings to defaults? This cannot be undone.')) {
          localStorage.removeItem(SETTINGS_KEY);
          location.reload();
        }
      });
    }

    // Clear all data
    const clearBtn = document.getElementById('spClearAllData');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (confirm('This will remove all saved products, searches, and preferences. Continue?')) {
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.indexOf('huntdrop_') === 0) keys.push(k);
          }
          keys.forEach(function (k) {
            localStorage.removeItem(k);
          });
          location.reload();
        }
      });
    }

  }
})();
