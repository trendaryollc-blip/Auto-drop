// ============================================================================
// TEST SETUP — Global mocks and helpers for HuntDrop AI test suite
// ============================================================================
// This file runs before every test file. It sets up the jsdom environment
// with all the browser APIs the app expects, and provides helper functions
// for loading the IIFE-style source files in tests.
// ============================================================================

import { vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ===== 1. POLYFILLS & GLOBAL MOCKS =====

// requestAnimationFrame (jsdom doesn't implement it)
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// matchMedia
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// scrollTo / scrollIntoView
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

// getBoundingClientRect
Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
  top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0,
});

// ===== 2. CHART.JS MOCK =====
// The app has a fallback guard, but we provide a fuller mock so chart
// rendering code paths can be exercised without errors.
class MockChart {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.data = config?.data;
    this.options = config?.options;
    this.destroyed = false;
  }
  destroy() { this.destroyed = true; }
  update() {}
  resize() {}
  render() {}
}
window.Chart = MockChart;
global.Chart = MockChart;

// ===== 3. CRYPTO MOCK (for ai-key-manager encryption) =====
// jsdom has crypto.subtle in newer versions, but we ensure it's present.
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.subtle) {
  // Simple mock that does XOR-based "encryption" for testing
  global.crypto.subtle = {
    importKey: vi.fn().mockResolvedValue({}),
    deriveKey: vi.fn().mockResolvedValue({}),
    encrypt: vi.fn().mockImplementation(async (algo, key, data) => {
      const arr = new Uint8Array(data);
      const result = new Uint8Array(arr.length);
      for (let i = 0; i < arr.length; i++) result[i] = arr[i] ^ 73;
      return result.buffer;
    }),
    decrypt: vi.fn().mockImplementation(async (algo, key, data) => {
      const arr = new Uint8Array(data);
      const result = new Uint8Array(arr.length);
      for (let i = 0; i < arr.length; i++) result[i] = arr[i] ^ 73;
      return result.buffer;
    }),
  };
}
if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    return arr;
  };
}

// ===== 4. NAVIGATOR MOCKS =====
if (!navigator.share) {
  Object.defineProperty(navigator, 'share', {
    value: vi.fn().mockResolvedValue(undefined),
    configurable: true,
  });
}
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
    },
    configurable: true,
  });
}

// SpeechRecognition mock
window.SpeechRecognition = vi.fn().mockImplementation(() => ({
  continuous: false,
  interimResults: false,
  lang: '',
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));
window.webkitSpeechRecognition = window.SpeechRecognition;

// ===== 5. URL.createObjectURL / revokeObjectURL =====
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
  URL.revokeObjectURL = vi.fn();
}

// ===== 6. Blob mock (jsdom has it but ensure it exists) =====
if (typeof Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
      this.size = 0;
      this.type = options?.type || '';
    }
  };
}

// ===== 7. localStorage polyfill (jsdom 29+ may not provide it) =====
// Always ensure localStorage has proper methods
const _store = new Map();
const _localStorageImpl = {
  getItem: (key) => _store.has(key) ? _store.get(key) : null,
  setItem: (key, value) => { _store.set(key, String(value)); },
  removeItem: (key) => { _store.delete(key); },
  clear: () => { _store.clear(); },
  key: (index) => { const keys = [..._store.keys()]; return keys[index] || null; },
  get length() { return _store.size; },
};
// Patch localStorage to ensure methods exist
if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
  window.localStorage = _localStorageImpl;
} else {
  // jsdom provides localStorage but ensure clear works
  const origClear = window.localStorage.clear.bind(window.localStorage);
  _localStorageImpl._origClear = origClear;
}
if (!global.localStorage || typeof global.localStorage.getItem !== 'function') {
  global.localStorage = window.localStorage;
}

beforeEach(() => {
  if (window.localStorage && typeof window.localStorage.clear === 'function') {
    window.localStorage.clear();
  }
});

// ===== 8. HELPER: Load source files in test environment =====
// The app uses IIFEs that attach to window.HuntDrop. This helper reads
// a source file and eval()s it in the test context so we can test the
// code as it runs in the browser.

const ROOT = resolve(__dirname, '..');

/**
 * Load and execute a source file in the test environment.
 * @param {string} relativePath - Path relative to project root (e.g. 'core.js')
 * @returns {void}
 */
export function loadScript(relativePath) {
  const filePath = resolve(ROOT, relativePath);
  const code = readFileSync(filePath, 'utf-8');
  // eslint-disable-next-line no-new-func
  const fn = new Function(code);
  fn.call(window);
}

/**
 * Load core.js and return the HuntDrop namespace.
 * @returns {object} window.HuntDrop
 */
export function loadCore() {
  // Reset window.HuntDrop if it exists (for clean state between tests)
  delete window.HuntDrop;
  loadScript('core.js');
  // Provide default renderRelatedTools (set by app.js in production)
  if (!window.HuntDrop.renderRelatedTools) {
    window.HuntDrop.renderRelatedTools = function(tools) {
      if (!tools || !tools.length) return '';
      return '<div class="related-tools">' + tools.map(function(t) {
        return '<div class="related-tool-card">' + (t.name || '') + '</div>';
      }).join('') + '</div>';
    };
  }
  return window.HuntDrop;
}

/**
 * Load core + a plugin and return both.
 * @param {string} pluginPath - Path like 'plugins/search-engine.js'
 * @returns {{ HuntDrop: object }}
 */
export function loadCoreWithPlugin(pluginPath) {
  const HuntDrop = loadCore();
  // Load mock-api.js first (provides window.MockAPI for data-adapters)
  loadScript('mock-api.js');
  loadScript(pluginPath);
  return { HuntDrop };
}

/**
 * Load core + multiple plugins (in order).
 * @param {string[]} pluginPaths
 * @returns {{ HuntDrop: object }}
 */
export function loadCoreWithPlugins(pluginPaths) {
  const HuntDrop = loadCore();
  // Load mock-api.js first (provides window.MockAPI for data-adapters)
  loadScript('mock-api.js');
  pluginPaths.forEach((p) => loadScript(p));
  return { HuntDrop };
}

/**
 * Create a mock DOM element with common methods.
 * @param {object} props
 * @returns {HTMLElement}
 */
export function createMockElement(props = {}) {
  const el = document.createElement('div');
  if (props.id) el.id = props.id;
  if (props.className) el.className = props.className;
  if (props.innerHTML) el.innerHTML = props.innerHTML;
  if (props.dataset) Object.assign(el.dataset, props.dataset);
  return el;
}

/**
 * Set up a minimal dashboard DOM that app.js expects.
 * This includes the key elements referenced by getElementById.
 */
export function setupDashboardDOM() {
  document.body.innerHTML = `
    <div id="sections-container"></div>
    <input id="searchInput" type="text" />
    <button id="searchBtn">Search</button>
    <select id="platformSelect"><option value="all">All</option></select>
    <select id="sortSelect"><option value="score">Score</option></select>
    <input id="priceRange" type="range" min="0" max="200" value="200" />
    <input id="priceMin" type="number" />
    <input id="priceMax" type="number" />
    <input id="scoreRange" type="range" min="0" max="100" value="0" />
    <span id="scoreValue">0</span>
    <button id="resetFilters">Reset</button>
    <div id="productsGrid"></div>
    <div id="productsEmpty"></div>
    <div id="productsSkeleton"></div>
    <span id="resultsCount">0</span>
    <button id="navBackBtn" style="display:none">Back</button>
    <button id="themeToggle">Theme</button>
    <div id="pulseItems"></div>
    <div id="platformLogos">
      <div class="plogo" data-platform="aliexpress">AliExpress</div>
      <div class="plogo" data-platform="amazon">Amazon</div>
    </div>
    <div id="trendingGrid"></div>
    <button id="trendingRefresh">Refresh</button>
    <button id="filterMobileToggle">Filters</button>
    <div id="filtersPanel"></div>
    <div id="filterOverlay"></div>
    <div id="welcomeCard" style="display:none"></div>
    <button id="welcomeClose">×</button>
    <button id="welcomeSearchBtn">Search</button>
    <div id="welcomeProgress"></div>
    <span id="welcomeProgressText">0/3</span>
    <div id="welcomeStep1"></div>
    <div id="welcomeStep2"></div>
    <div id="welcomeStep3"></div>
    <div id="recentChips"></div>
    <div id="recentSearchesSection" style="display:none"></div>
    <div id="recentItems"></div>
    <button id="clearRecentSearches">Clear</button>
    <div id="searchDropdown" style="display:none"></div>
    <div id="recentSearchesDropdown"></div>
    <div id="recentSearchItems"></div>
    <div id="suggestionsDropdown"></div>
    <div id="suggestionItems"></div>
    <button id="voiceSearchBtn">Voice</button>
    <button id="feelingLuckyBtn">Lucky</button>
    <button id="qtCollapseToggle">Collapse</button>
    <span id="kpiProducts">0</span>
    <span id="kpiTrending">0</span>
    <span id="kpiSaved">0</span>
    <span id="kpiAnalyses">0</span>
    <nav class="nav-links">
      <a class="nav-link" data-section="dashboard">Dashboard</a>
    </nav>
    <section class="section section-dashboard active" id="section-dashboard"></section>
  `;
}

/**
 * Wait for all pending microtasks/timers to flush.
 * @param {number} ms - Additional delay
 */
export async function flushPromises(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a sample product matching the data-adapters schema.
 * @param {object} overrides
 * @returns {object}
 */
export function createSampleProduct(overrides = {}) {
  return {
    id: 999,
    title: 'Test Product',
    image: 'https://example.com/test.jpg',
    platform: 'aliexpress',
    price: 9.99,
    originalPrice: 49.99,
    margin: 80,
    score: 90,
    badges: ['trending'],
    salesVelocity: 1000,
    competition: 'low',
    demand: 85,
    rating: 4.5,
    reviews: 1000,
    orders: '10K',
    shipFrom: 'China',
    category: 'Electronics',
    keywords: ['test', 'product', 'sample'],
    suppliers: [
      { name: 'Test Supplier', location: 'Shenzhen, CN', rating: 4.8, orders: '50K', responseTime: '< 2h', verified: true },
    ],
    platformPrices: { aliexpress: 9.99, amazon: 29.99, shopify: 34.99 },
    trendData: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
    seasonality: [80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135],
    audience: { age: '18-34', gender: 'All', interests: ['Tech'], countries: ['US'] },
    riskScore: 20,
    marketSaturation: 30,
    adSpendAvg: 3.0,
    cpaAvg: 4.5,
    aiInsight: 'Great test product with excellent margins.',
    ...overrides,
  };
}

// Make helpers available globally for tests
global.loadScript = loadScript;
global.loadCore = loadCore;
global.loadCoreWithPlugin = loadCoreWithPlugin;
global.loadCoreWithPlugins = loadCoreWithPlugins;
global.createMockElement = createMockElement;
global.setupDashboardDOM = setupDashboardDOM;
global.flushPromises = flushPromises;
global.createSampleProduct = createSampleProduct;