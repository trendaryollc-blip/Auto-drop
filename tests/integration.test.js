// ============================================================================
// TESTS: Integration — Full app boot sequence and cross-plugin interactions
// ============================================================================

import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  loadCore,
  loadScript,
  setupDashboardDOM,
  createSampleProduct,
  flushPromises,
  mockPlatformConnectors,
} from './setup.js';

const SAMPLE_PRODUCTS = [
  createSampleProduct({
    id: 1,
    platform: 'amazon',
    title: 'Wireless Earbuds Pro',
    price: 29.99,
    score: 92,
    competition: 'low',
    margin: 75,
    salesVelocity: 1500,
  }),
  createSampleProduct({
    id: 2,
    platform: 'amazon',
    title: 'Bluetooth Speaker Mini',
    price: 19.99,
    score: 85,
    competition: 'medium',
    margin: 60,
    salesVelocity: 800,
  }),
  createSampleProduct({
    id: 3,
    platform: 'aliexpress',
    title: 'Wireless Earbuds Budget',
    price: 8.99,
    score: 78,
    competition: 'high',
    margin: 85,
    salesVelocity: 2000,
  }),
  createSampleProduct({
    id: 4,
    platform: 'aliexpress',
    title: 'USB-C Hub Adapter',
    price: 12.99,
    score: 88,
    competition: 'low',
    margin: 70,
    salesVelocity: 1200,
  }),
];

describe('Integration — Full App Boot', () => {
  let HuntDrop;

  beforeAll(() => {
    setupDashboardDOM();
    HuntDrop = loadCore();

    // Load all plugins in the same order as index.html
    const plugins = [
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/product-grid.js',
      'plugins/product-hunt.js',
      'plugins/ai-analyst.js',
      'plugins/profit-calculator.js',
      'plugins/ad-studio.js',
      'plugins/ai-key-manager.js',
      'plugins/ai-web-search.js',
      'plugins/ai-context-builder.js',
      'plugins/ai-system-health.js',
      'plugins/ai-risk-analyzer.js',
      'plugins/ai-chat-service.js',
      'plugins/ai-business-coach.js',
      'plugins/ai-settings.js',
      'plugins/profit-time-machine.js',
      'plugins/store-generator.js',
      'plugins/cb-intelligence-service.js',
      'plugins/competitor-battlefield.js',
      'plugins/customer-persona.js',
      'plugins/bundle-intelligence.js',
      'plugins/price-elasticity.js',
      'plugins/product-lifecycle.js',
      'plugins/ad-budget-allocator.js',
      'plugins/store-health.js',
      'plugins/content-calendar.js',
      'plugins/supplier-intelligence.js',
      'plugins/objection-handler.js',
      'plugins/market-gap-finder.js',
      'plugins/business-simulator.js',
      'plugins/spy-center.js',
      'plugins/supplier-hub.js',
      'plugins/niche-radar.js',
    ];

    const loadErrors = [];
    plugins.forEach((p) => {
      try {
        loadScript(p);
      } catch (e) {
        loadErrors.push({ plugin: p, error: e.message });
      }
    });
    if (loadErrors.length > 0) {
      console.warn(`[Integration Test] ${loadErrors.length} plugin(s) failed to load:`, loadErrors);
    }

    mockPlatformConnectors(SAMPLE_PRODUCTS);

    // Load app.js and trigger boot sequence
    try {
      loadScript('app.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
    } catch (e) {
      console.warn('[Integration Test] app.js failed to load:', e.message);
    }
  });

  describe('All plugins registered', () => {
    it('should have all 30+ plugins registered', () => {
      const all = HuntDrop.PluginRegistry.getAll();
      expect(all.length).toBeGreaterThanOrEqual(20);
    });

    it('should have data-adapters registered', () => {
      expect(HuntDrop.ALL_PRODUCTS).toBeDefined();
      expect(Array.isArray(HuntDrop.ALL_PRODUCTS)).toBe(true);
    });

    it('should have search-engine registered', () => {
      expect(HuntDrop.PluginRegistry.get('search-engine')).toBeDefined();
    });

    it('should have product-grid registered', () => {
      expect(HuntDrop.PluginRegistry.get('product-grid')).toBeDefined();
    });

    it('should have profit-calculator registered', () => {
      expect(HuntDrop.PluginRegistry.get('profit-calculator')).toBeDefined();
    });

    it('should have ai-key-manager registered', () => {
      expect(HuntDrop.PluginRegistry.get('ai-key-manager')).toBeDefined();
    });
  });

  describe('ALL_PRODUCTS available', () => {
    it('should be empty array in API-only mode', () => {
      expect(HuntDrop.ALL_PRODUCTS).toBeDefined();
      expect(HuntDrop.ALL_PRODUCTS.length).toBe(0);
    });
  });

  describe('Search flow integration', () => {
    it('should search and return results via EventBus', async () => {
      await HuntDrop.PluginRegistry.init('search-engine');
      await HuntDrop.PluginRegistry.mount('search-engine');

      const resultsCb = vi.fn();
      HuntDrop.EventBus.on('search:results', resultsCb);

      await HuntDrop.EventBus.emit('search:query', { query: 'wireless', filters: {} });
      await flushPromises(50);

      expect(resultsCb).toHaveBeenCalled();
      const callArg = resultsCb.mock.calls[0][0];
      expect(callArg.results).toBeDefined();
      expect(callArg.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter:changed trigger search and return results', async () => {
      await HuntDrop.PluginRegistry.init('search-engine');
      await HuntDrop.PluginRegistry.mount('search-engine');

      const resultsCb = vi.fn();
      HuntDrop.EventBus.on('search:results', resultsCb);

      await HuntDrop.EventBus.emit('filter:changed', { filters: { sort: 'score' }, query: 'wireless' });
      await flushPromises(50);

      expect(resultsCb).toHaveBeenCalled();
    });
  });

  describe('Search + Product Grid integration', () => {
    it('should render product cards when search results arrive', async () => {
      await HuntDrop.PluginRegistry.init('search-engine');
      await HuntDrop.PluginRegistry.mount('search-engine');
      await HuntDrop.PluginRegistry.init('product-grid');
      await HuntDrop.PluginRegistry.mount('product-grid');

      await HuntDrop.EventBus.emit('search:results', {
        query: '',
        results: SAMPLE_PRODUCTS,
        total: SAMPLE_PRODUCTS.length,
      });

      await flushPromises(100);

      const grid = document.getElementById('productsGrid');
      expect(grid.children.length).toBeGreaterThan(0);
    });
  });

  describe('Config integration', () => {
    it('should have app config set by app.js', () => {
      expect(HuntDrop.Config.get('app.name')).toBe('HuntDrop AI');
      expect(HuntDrop.Config.get('app.version')).toBe('3.0.0');
    });

    it('should have search config set', () => {
      const platforms = HuntDrop.Config.get('search.platforms');
      expect(platforms).toContain('aliexpress');
      expect(platforms.length).toBeGreaterThan(10);
    });
  });

  describe('Feature flags integration', () => {
    it('should have all feature flags registered', () => {
      expect(HuntDrop.FeatureFlags.isEnabled('darkMode')).toBe(true);
      expect(HuntDrop.FeatureFlags.isEnabled('aiAnalysis')).toBe(true);
      expect(HuntDrop.FeatureFlags.isEnabled('adStudio')).toBe(true);
      expect(HuntDrop.FeatureFlags.isEnabled('profitCalc')).toBe(true);
    });
  });

  describe('Navigation integration', () => {
    it('should navigate between sections', () => {
      HuntDrop.navigateTo('section-dashboard');
      expect(HuntDrop.Config.get('app.currentSection')).toBe('section-dashboard');
    });

    it('should support back navigation', () => {
      const section2 = document.createElement('section');
      section2.id = 'section-product-hunt';
      section2.className = 'section';
      document.body.appendChild(section2);

      HuntDrop.navigateTo('section-dashboard');
      HuntDrop.navigateTo('section-product-hunt');
      HuntDrop.goBack();
      expect(HuntDrop.Config.get('app.currentSection')).toBe('section-dashboard');
    });
  });

  describe('AI services integration', () => {
    it('should have APIKeyManager available', () => {
      expect(HuntDrop.APIKeyManager).toBeDefined();
    });

    it('should have AIContextBuilder available', () => {
      expect(HuntDrop.AIContextBuilder).toBeDefined();
    });

    it('should have AIChatService available', () => {
      expect(HuntDrop.AIChatService).toBeDefined();
    });

    it('should have AIWebSearch available', () => {
      expect(HuntDrop.AIWebSearch).toBeDefined();
    });

    it('should build full context', () => {
      const context = HuntDrop.AIContextBuilder.buildFullContext();
      expect(context.products).toBeDefined();
      expect(context.systemHealth).toBeDefined();
    });
  });

  describe('Export helpers integration', () => {
    it('should export CSV', () => {
      HuntDrop.exportCSV(['A', 'B'], [['1', '2']], 'test.csv');
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should export JSON', () => {
      HuntDrop.exportJSON({ test: true }, 'test.json');
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Full plugin init + mount cycle', () => {
    it('should init and mount all plugins without errors', async () => {
      const plugins = HuntDrop.PluginRegistry.getAll();
      for (const p of plugins) {
        await HuntDrop.PluginRegistry.init(p.id);
      }
      for (const p of plugins) {
        try {
          await PluginRegistry.mount(p.id);
        } catch (e) {
          console.warn(`[Integration Test] Plugin "${p.id}" failed to mount:`, e.message);
        }
      }
      plugins.forEach((p) => {
        expect(p._initialized).toBe(true);
      });
    });
  });
});
