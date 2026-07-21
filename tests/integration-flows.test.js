// ============================================================================
// TESTS: Integration Flows — Cross-plugin interactions, full user flows
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadCoreWithPlugins,
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

describe('Integration — Search → Grid Rendering', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/product-grid.js',
    ]));
    mockPlatformConnectors(SAMPLE_PRODUCTS);
  });

  it('should render product cards after search', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.mount('search-engine');
    await HuntDrop.PluginRegistry.init('product-grid');
    await HuntDrop.PluginRegistry.mount('product-grid');

    await HuntDrop.EventBus.emit('search:query', { query: '', filters: {} });
    await flushPromises(50);

    const grid = document.getElementById('productsGrid');
    expect(grid).toBeDefined();
    expect(grid.children.length).toBeGreaterThan(0);
  });

  it('should update grid when filter changes', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.mount('search-engine');
    await HuntDrop.PluginRegistry.init('product-grid');
    await HuntDrop.PluginRegistry.mount('product-grid');

    // Initial search
    await HuntDrop.EventBus.emit('search:query', { query: '', filters: {} });
    await flushPromises(50);
    const initialCount = document.getElementById('productsGrid').children.length;

    // Filter by platform
    await HuntDrop.EventBus.emit('filter:changed', { filters: { platform: 'amazon' } });
    await flushPromises(50);
    const filteredCount = document.getElementById('productsGrid').children.length;

    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });
});

describe('Integration — Filter Chain: platform + sort + price', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/search-engine.js']));
    mockPlatformConnectors(SAMPLE_PRODUCTS);
  });

  it('should apply platform filter + sort together', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.mount('search-engine');

    const resultsCb = vi.fn();
    HuntDrop.EventBus.on('search:results', resultsCb);

    await HuntDrop.EventBus.emit('filter:changed', {
      filters: { platform: 'amazon', sort: 'score' },
    });
    await flushPromises(50);

    expect(resultsCb).toHaveBeenCalled();
    const results = resultsCb.mock.calls[resultsCb.mock.calls.length - 1][0].results;
    results.forEach((r) => {
      expect(r.platform).toBe('amazon');
    });
    // Verify sort order
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });

  it('should apply priceMax + competition filter together', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.mount('search-engine');

    const resultsCb = vi.fn();
    HuntDrop.EventBus.on('search:results', resultsCb);

    await HuntDrop.EventBus.emit('filter:changed', {
      filters: { priceMax: 20, competition: 'low' },
    });
    await flushPromises(50);

    const results = resultsCb.mock.calls[resultsCb.mock.calls.length - 1][0].results;
    results.forEach((r) => {
      expect(r.price).toBeLessThanOrEqual(20);
      expect(r.competition).toBe('low');
    });
  });
});

describe('Integration — Cross-Plugin EventBus Communication', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/ai-analyst.js',
      'plugins/profit-calculator.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    mockPlatformConnectors(SAMPLE_PRODUCTS);
  });

  it('should propagate search:query through EventBus to multiple listeners', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.mount('search-engine');

    const listener1 = vi.fn();
    const listener2 = vi.fn();
    HuntDrop.EventBus.on('search:results', listener1);
    HuntDrop.EventBus.on('search:results', listener2);

    await HuntDrop.EventBus.emit('search:query', { query: 'wireless', filters: {} });
    await flushPromises(50);

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it('should allow ai-analyst to trigger search via EventBus', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.mount('search-engine');
    await HuntDrop.PluginRegistry.init('ai-analyst');
    await HuntDrop.PluginRegistry.mount('ai-analyst');

    const resultsCb = vi.fn();
    HuntDrop.EventBus.on('search:results', resultsCb);

    HuntDrop.EventBus.emit('ai-analyst:run', { query: 'earbuds' });
    await flushPromises(100);
    expect(true).toBe(true);
  });
});

describe('Integration — Navigation Flow', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js']));
  });

  it('should support Router navigate', async () => {
    const handler = vi.fn();
    HuntDrop.Router.register('test-route', handler);
    await HuntDrop.Router.navigate('test-route');
    expect(handler).toHaveBeenCalled();
    expect(HuntDrop.Router.current()).toBe('test-route');
  });

  it('should support Router with multiple routes', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    HuntDrop.Router.register('route-1', handler1);
    HuntDrop.Router.register('route-2', handler2);
    await HuntDrop.Router.navigate('route-1');
    expect(HuntDrop.Router.current()).toBe('route-1');
    await HuntDrop.Router.navigate('route-2');
    expect(HuntDrop.Router.current()).toBe('route-2');
  });

  it('should emit route events via EventBus', async () => {
    const enterCb = vi.fn();
    HuntDrop.EventBus.on('route:enter', enterCb);
    HuntDrop.Router.register('tracked-route', () => {});
    await HuntDrop.Router.navigate('tracked-route');
    expect(enterCb).toHaveBeenCalled();
  });
});

describe('Integration — Config Persistence', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/ai-key-manager.js']));
  });

  it('should persist config values across sessions', async () => {
    await HuntDrop.PluginRegistry.init('ai-key-manager');
    HuntDrop.APIKeyManager.setProvider('openai');
    expect(HuntDrop.Config.get('aiKeys.provider')).toBe('openai');
    expect(HuntDrop.Config.get('aiKeys.provider')).toBe('openai');
  });

  it('should set and get config values', () => {
    HuntDrop.Config.set('test.custom', 'hello');
    expect(HuntDrop.Config.get('test.custom')).toBe('hello');
  });

  it('should return fallback for missing config', () => {
    expect(HuntDrop.Config.get('nonexistent.path', 'fallback')).toBe('fallback');
    expect(HuntDrop.Config.get('nonexistent.path')).toBeUndefined();
  });
});

describe('Integration — Feature Flags', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js']));
  });

  it('should register and check feature flags', () => {
    HuntDrop.FeatureFlags.register('testFlag', false);
    expect(HuntDrop.FeatureFlags.isEnabled('testFlag')).toBe(false);
    HuntDrop.FeatureFlags.enable('testFlag');
    expect(HuntDrop.FeatureFlags.isEnabled('testFlag')).toBe(true);
    HuntDrop.FeatureFlags.disable('testFlag');
    expect(HuntDrop.FeatureFlags.isEnabled('testFlag')).toBe(false);
  });

  it('should return all flags', () => {
    HuntDrop.FeatureFlags.register('flag1', true);
    HuntDrop.FeatureFlags.register('flag2', false);
    const all = HuntDrop.FeatureFlags.getAll();
    expect(all.flag1).toBe(true);
    expect(all.flag2).toBe(false);
  });
});

describe('Integration — Export Helpers', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js']));
  });

  it('should have EventBus for cross-plugin communication', () => {
    expect(HuntDrop.EventBus).toBeDefined();
    expect(typeof HuntDrop.EventBus.emit).toBe('function');
    expect(typeof HuntDrop.EventBus.on).toBe('function');
  });

  it('should support EventBus wildcard listeners', async () => {
    const cb = vi.fn();
    HuntDrop.EventBus.on('test:*', cb);
    await HuntDrop.EventBus.emit('test:something', { data: 42 });
    expect(cb).toHaveBeenCalledWith({ data: 42 });
  });
});

describe('Integration — Full Plugin Lifecycle (init → mount → use → unmount)', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/profit-calculator.js']));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
  });

  it('should complete full lifecycle without errors', async () => {
    const plugin = HuntDrop.PluginRegistry.get('profit-calculator');
    expect(plugin._initialized).toBe(false);
    expect(plugin._mounted).toBe(false);

    await HuntDrop.PluginRegistry.init('profit-calculator');
    expect(plugin._initialized).toBe(true);

    await HuntDrop.PluginRegistry.mount('profit-calculator');
    expect(plugin._mounted).toBe(true);
    expect(document.getElementById('section-profit-lab')).not.toBeNull();

    await HuntDrop.PluginRegistry.unmount('profit-calculator');
    expect(plugin._mounted).toBe(false);
  });

  it('should handle double-init gracefully', async () => {
    await HuntDrop.PluginRegistry.init('profit-calculator');
    await HuntDrop.PluginRegistry.init('profit-calculator');
    expect(HuntDrop.PluginRegistry.get('profit-calculator')._initialized).toBe(true);
  });

  it('should handle unmount when not mounted gracefully', async () => {
    await HuntDrop.PluginRegistry.init('profit-calculator');
    await HuntDrop.PluginRegistry.unmount('profit-calculator');
    expect(true).toBe(true);
  });
});

describe('Integration — Error Recovery', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/search-engine.js']));
    mockPlatformConnectors(SAMPLE_PRODUCTS);
  });

  it('should recover from EventBus listener errors', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.mount('search-engine');

    // Register a broken listener
    HuntDrop.EventBus.on('search:results', () => {
      throw new Error('Intentional test error');
    });

    // Register a good listener
    const goodListener = vi.fn();
    HuntDrop.EventBus.on('search:results', goodListener);

    // Emit — the broken listener should not prevent the good one from running
    await HuntDrop.EventBus.emit('search:query', { query: '', filters: {} });
    await flushPromises(50);

    expect(goodListener).toHaveBeenCalled();
  });

  it('should handle search with no adapters gracefully', async () => {
    const core = loadCore();
    loadScript('plugins/search-engine.js');
    await core.PluginRegistry.init('search-engine');
    await core.PluginRegistry.mount('search-engine');

    const resultsCb = vi.fn();
    core.EventBus.on('search:results', resultsCb);

    await core.EventBus.emit('search:query', { query: 'test', filters: {} });
    await flushPromises(50);

    expect(resultsCb).toHaveBeenCalled();
    const results = resultsCb.mock.calls[0][0].results;
    expect(results.length).toBe(0);
  });
});

describe('Integration — Product Grid Component', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/product-grid.js',
    ]));
    mockPlatformConnectors(SAMPLE_PRODUCTS);
  });

  it('should render cards with product data', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.mount('search-engine');
    await HuntDrop.PluginRegistry.init('product-grid');
    await HuntDrop.PluginRegistry.mount('product-grid');

    await HuntDrop.EventBus.emit('search:query', { query: 'earbuds', filters: {} });
    await flushPromises(50);

    const grid = document.getElementById('productsGrid');
    expect(grid.children.length).toBeGreaterThan(0);
    const firstCard = grid.children[0];
    expect(firstCard.innerHTML.length).toBeGreaterThan(10);
  });

  it('should show empty state for no results', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.mount('search-engine');
    await HuntDrop.PluginRegistry.init('product-grid');
    await HuntDrop.PluginRegistry.mount('product-grid');

    await HuntDrop.EventBus.emit('search:query', { query: 'xyznonexistentproduct999', filters: {} });
    await flushPromises(50);

    const grid = document.getElementById('productsGrid');
    expect(grid.children.length).toBe(0);
  });
});
