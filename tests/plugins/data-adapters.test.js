// ============================================================================
// TESTS: plugins/data-adapters.js — Platform Data Adapters
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugin, loadCore, loadScript, createSampleProduct } from '../setup.js';

describe('data-adapters plugin', () => {
  let HuntDrop;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugin('plugins/data-adapters.js'));
  });

  describe('Adapter Registration', () => {
    it('should register adapters for all 10 platforms', () => {
      const platforms = ['aliexpress','amazon','shopify','ebay','temu','tiktok','etsy','cjdropshipping','dhgate','wish'];
      platforms.forEach((p) => {
        expect(HuntDrop.DataLayer.getAdapter(p)).toBeDefined();
      });
    });

    it('should emit adapters:registered event on load', () => {
      const core = loadCore();
      const cb = vi.fn();
      core.EventBus.on('adapters:registered', cb);
      loadScript('plugins/data-adapters.js');
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({
        platforms: expect.arrayContaining(['aliexpress', 'amazon']),
      }));
    });
  });

  describe('ALL_PRODUCTS global', () => {
    it('should set window.HuntDrop.ALL_PRODUCTS with product database', () => {
      expect(HuntDrop.ALL_PRODUCTS).toBeDefined();
      expect(Array.isArray(HuntDrop.ALL_PRODUCTS)).toBe(true);
      expect(HuntDrop.ALL_PRODUCTS.length).toBeGreaterThan(0);
    });

    it('should have products with all required fields', () => {
      const p = HuntDrop.ALL_PRODUCTS[0];
      expect(p.id).toBeDefined();
      expect(p.title).toBeDefined();
      expect(p.image).toBeDefined();
      expect(p.platform).toBeDefined();
      expect(p.price).toBeDefined();
      expect(p.originalPrice).toBeDefined();
      expect(p.margin).toBeDefined();
      expect(p.score).toBeDefined();
      expect(p.badges).toBeDefined();
      expect(p.salesVelocity).toBeDefined();
      expect(p.competition).toBeDefined();
      expect(p.demand).toBeDefined();
      expect(p.rating).toBeDefined();
      expect(p.reviews).toBeDefined();
      expect(p.orders).toBeDefined();
      expect(p.suppliers).toBeDefined();
      expect(p.platformPrices).toBeDefined();
      expect(p.trendData).toBeDefined();
      expect(p.seasonality).toBeDefined();
      expect(p.audience).toBeDefined();
      expect(p.riskScore).toBeDefined();
      expect(p.marketSaturation).toBeDefined();
      expect(p.aiInsight).toBeDefined();
      expect(p.keywords).toBeDefined();
    });
  });

  describe('createAdapter() — search', () => {
    it('should search by title', async () => {
      // Search across all platforms to find any matching product
      const results = await HuntDrop.DataLayer.searchAll('earbuds');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by keywords', async () => {
      const results = await HuntDrop.DataLayer.searchAll('bluetooth');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by category', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('Electronics');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.category).toBe('Electronics');
      });
    });

    it('should filter by platform', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('aliexpress');
      const results = await adapter.search('', {});
      results.forEach((r) => {
        expect(r.platform).toBe('aliexpress');
      });
    });

    it('should filter by priceMax', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { priceMax: 5 });
      results.forEach((r) => {
        expect(r.price).toBeLessThanOrEqual(5);
      });
    });

    it('should filter by minScore', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { minScore: 90 });
      results.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(90);
      });
    });

    it('should filter by competition', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { competition: 'low' });
      results.forEach((r) => {
        expect(r.competition).toBe('low');
      });
    });

    it('should filter by margin', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { margin: '80' });
      results.forEach((r) => {
        expect(r.margin).toBeGreaterThanOrEqual(80);
      });
    });

    it('should sort by score (descending)', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { sort: 'score' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });

    it('should sort by trending (salesVelocity descending)', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { sort: 'trending' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].salesVelocity).toBeLessThanOrEqual(results[i - 1].salesVelocity);
      }
    });

    it('should sort by profit (margin descending)', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { sort: 'profit' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].margin).toBeLessThanOrEqual(results[i - 1].margin);
      }
    });

    it('should sort by price-low', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { sort: 'price-low' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].price).toBeGreaterThanOrEqual(results[i - 1].price);
      }
    });

    it('should sort by price-high', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { sort: 'price-high' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].price).toBeLessThanOrEqual(results[i - 1].price);
      }
    });

    it('should return empty array for no matches', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('zzznonexistentproduct12345');
      expect(results).toEqual([]);
    });

    it('should return platform products for empty query with no filters', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', {});
      const amazonProducts = HuntDrop.ALL_PRODUCTS.filter(p => p.platform === 'amazon');
      expect(results.length).toBe(amazonProducts.length);
    });
  });

  describe('createAdapter() — getProduct', () => {
    it('should get product by ID', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const product = await adapter.getProduct(1);
      expect(product).toBeDefined();
      expect(product.id).toBe(1);
    });

    it('should return null for non-existent ID', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const product = await adapter.getProduct(99999);
      expect(product).toBeNull();
    });
  });

  describe('createAdapter() — getTrends', () => {
    it('should get trend data for product', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const trends = await adapter.getTrends(1);
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBe(12);
    });

    it('should return empty array for non-existent product', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const trends = await adapter.getTrends(99999);
      expect(trends).toEqual([]);
    });
  });

  describe('createAdapter() — getSuppliers', () => {
    it('should get suppliers for product', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const suppliers = await adapter.getSuppliers(1);
      expect(Array.isArray(suppliers)).toBe(true);
      expect(suppliers.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent product', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const suppliers = await adapter.getSuppliers(99999);
      expect(suppliers).toEqual([]);
    });
  });

  describe('createAdapter() — getPrices', () => {
    it('should get platform prices for product', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const prices = await adapter.getPrices(1);
      expect(prices).toBeDefined();
      expect(typeof prices).toBe('object');
      expect(prices.aliexpress).toBeDefined();
    });

    it('should return empty object for non-existent product', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const prices = await adapter.getPrices(99999);
      expect(prices).toEqual({});
    });
  });

  describe('DataLayer.searchAll integration', () => {
    it('should aggregate results across all platform adapters', async () => {
      const results = await HuntDrop.DataLayer.searchAll('earbuds');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r._sourcePlatform).toBeDefined();
      });
    });

    it('should filter by specific platform in searchAll', async () => {
      const results = await HuntDrop.DataLayer.searchAll('', { platform: 'amazon' });
      results.forEach((r) => {
        expect(r.platform).toBe('amazon');
      });
    });
  });
});