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
    platform: 'aliexpress',
    title: 'Wireless Earbuds Pro',
    price: 9.99,
    score: 92,
    competition: 'low',
    margin: 75,
    salesVelocity: 1500,
  }),
  createSampleProduct({
    id: 2,
    platform: 'aliexpress',
    title: 'Bluetooth Speaker Mini',
    price: 14.99,
    score: 85,
    competition: 'medium',
    margin: 60,
    salesVelocity: 800,
  }),
  createSampleProduct({
    id: 3,
    platform: 'amazon',
    title: 'USB-C Hub Adapter',
    price: 29.99,
    score: 88,
    competition: 'low',
    margin: 70,
    salesVelocity: 1200,
  }),
  createSampleProduct({
    id: 4,
    platform: 'amazon',
    title: 'Pet Grooming Brush',
    price: 19.99,
    score: 82,
    competition: 'low',
    margin: 80,
    salesVelocity: 600,
  }),
];

describe('Feature: Search → Results Rendering', () => {
  let HuntDrop;

  beforeAll(() => {
    setupDashboardDOM();
    HuntDrop = loadCore();
    loadScript('plugins/data-adapters.js');
    loadScript('plugins/search-engine.js');
    loadScript('plugins/product-grid.js');
    mockPlatformConnectors(SAMPLE_PRODUCTS);
  });

  it('should have ALL_PRODUCTS as empty array in API-only mode', () => {
    expect(HuntDrop.ALL_PRODUCTS).toBeDefined();
    expect(HuntDrop.ALL_PRODUCTS.length).toBe(0);
  });

  it('should render product cards after search:results event', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.init('product-grid');
    await HuntDrop.PluginRegistry.mount('product-grid');

    const products = SAMPLE_PRODUCTS.slice(0, 4);
    await HuntDrop.EventBus.emit('search:results', {
      query: '',
      results: products,
      total: products.length,
    });
    await flushPromises(50);

    const grid = document.getElementById('productsGrid');
    expect(grid.children.length).toBeGreaterThan(0);
  });
});

describe('Feature: Card Click → product:analyze', () => {
  let HuntDrop;
  let analyzeSpy;

  beforeAll(async () => {
    setupDashboardDOM();
    HuntDrop = loadCore();
    loadScript('plugins/data-adapters.js');
    loadScript('plugins/search-engine.js');
    loadScript('plugins/product-grid.js');
    mockPlatformConnectors(SAMPLE_PRODUCTS);

    await HuntDrop.PluginRegistry.init('product-grid');
    await HuntDrop.PluginRegistry.mount('product-grid');

    analyzeSpy = vi.fn();
    HuntDrop.EventBus.on('product:analyze', analyzeSpy);

    const products = SAMPLE_PRODUCTS.slice(0, 2);
    await HuntDrop.EventBus.emit('search:results', {
      query: '',
      results: products,
      total: products.length,
    });
  });

  it('should emit product:analyze when card is clicked', async () => {
    const cards = document.querySelectorAll('.product-card');
    expect(cards.length).toBeGreaterThan(0);

    cards[0].click();
    await flushPromises(50);

    expect(analyzeSpy).toHaveBeenCalled();
    expect(analyzeSpy.mock.calls[0][0]).toBeDefined();
  });
});

describe('Feature: Filter → Search Integration', () => {
  let HuntDrop;

  beforeAll(() => {
    setupDashboardDOM();
    HuntDrop = loadCore();
    loadScript('plugins/data-adapters.js');
    loadScript('plugins/search-engine.js');
    mockPlatformConnectors(SAMPLE_PRODUCTS);
  });

  it('should emit filter:changed and search:results', async () => {
    await HuntDrop.PluginRegistry.init('search-engine');
    await HuntDrop.PluginRegistry.mount('search-engine');

    const resultsSpy = vi.fn();
    HuntDrop.EventBus.on('search:results', resultsSpy);

    await HuntDrop.EventBus.emit('filter:changed', {
      filters: { sort: 'score', platform: 'aliexpress' },
      query: '',
    });

    expect(resultsSpy).toHaveBeenCalled();
  });

  it('should filter products by platform via search engine', async () => {
    const results = await HuntDrop.DataLayer.searchAll('', { platform: 'aliexpress' });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((p) => {
      expect(p.platform).toBe('aliexpress');
    });
  });

  it('should sort products by score within a platform', async () => {
    const results = await HuntDrop.DataLayer.searchAll('', { sort: 'score', platform: 'aliexpress' });
    expect(results.length).toBeGreaterThan(1);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });

  it('should sort products by price ascending', async () => {
    const results = await HuntDrop.DataLayer.searchAll('', { sort: 'price-low', platform: 'amazon' });
    expect(results.length).toBeGreaterThan(1);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeGreaterThanOrEqual(results[i - 1].price);
    }
  });
});
