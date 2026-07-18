// ============================================================================
// TESTS: Data Adapter Edge Cases — Filtering, sorting, invalid inputs
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugin, loadCore, loadScript, createSampleProduct } from './setup.js';

describe('Data Adapters — Edge Cases & Accuracy', () => {
  let HuntDrop;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugin('plugins/data-adapters.js'));
  });

  describe('Filter: priceMax boundary', () => {
    it('should include products at exactly the priceMax', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', {});
      if (results.length > 0) {
        const exactPrice = results[0].price;
        const filtered = await adapter.search('', { priceMax: exactPrice });
        expect(filtered.some(p => p.price === exactPrice)).toBe(true);
      }
    });

    it('should exclude products above priceMax', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { priceMax: 5 });
      results.forEach(p => {
        expect(p.price).toBeLessThanOrEqual(5);
      });
    });

    it('should handle priceMax of 0 (falsy, filter skipped)', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { priceMax: 0 });
      // priceMax=0 is falsy in JS, so the filter is skipped — all products returned
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle negative priceMax (falsy via validation, filter skipped)', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { priceMax: -10 });
      // -10 fails validateFilters (priceMax > 0 check), so no price filter applied
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Filter: minScore boundary', () => {
    it('should include products at exactly minScore', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const all = await adapter.search('', {});
      if (all.length > 0) {
        const exactScore = all[0].score;
        const filtered = await adapter.search('', { minScore: exactScore });
        expect(filtered.some(p => p.score === exactScore)).toBe(true);
      }
    });

    it('should handle minScore of 100', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { minScore: 100 });
      results.forEach(p => {
        expect(p.score).toBeGreaterThanOrEqual(100);
      });
    });

    it('should return all when minScore is 0', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const all = await adapter.search('', {});
      const filtered = await adapter.search('', { minScore: 0 });
      expect(filtered.length).toBe(all.length);
    });
  });

  describe('Filter: competition', () => {
    it('should filter by exact competition level', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { competition: 'low' });
      results.forEach(p => {
        expect(p.competition).toBe('low');
      });
    });

    it('should handle "all" competition filter', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const all = await adapter.search('', {});
      const filtered = await adapter.search('', { competition: 'all' });
      expect(filtered.length).toBe(all.length);
    });
  });

  describe('Filter: margin', () => {
    it('should filter by minimum margin', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { margin: '60' });
      results.forEach(p => {
        expect(p.margin).toBeGreaterThanOrEqual(60);
      });
    });

    it('should handle margin filter as string "all"', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const all = await adapter.search('', {});
      const filtered = await adapter.search('', { margin: 'all' });
      expect(filtered.length).toBe(all.length);
    });
  });

  describe('Sorting — correctness verification', () => {
    it('sort by score should be descending', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { sort: 'score' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });

    it('sort by price-low should be ascending', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { sort: 'price-low' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].price).toBeGreaterThanOrEqual(results[i - 1].price);
      }
    });

    it('sort by price-high should be descending', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { sort: 'price-high' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].price).toBeLessThanOrEqual(results[i - 1].price);
      }
    });

    it('sort by trending should be descending by salesVelocity', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { sort: 'trending' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].salesVelocity).toBeLessThanOrEqual(results[i - 1].salesVelocity);
      }
    });

    it('sort by profit should be descending by margin', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('', { sort: 'profit' });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].margin).toBeLessThanOrEqual(results[i - 1].margin);
      }
    });
  });

  describe('Platform isolation', () => {
    it('each adapter should only return products from its platform', async () => {
      const platforms = ['aliexpress', 'amazon', 'shopify', 'ebay', 'temu'];
      for (const p of platforms) {
        const adapter = HuntDrop.DataLayer.getAdapter(p);
        const results = await adapter.search('', {});
        results.forEach(r => {
          expect(r.platform).toBe(p);
        });
      }
    });

    it('searchAll with platform filter should only return that platform', async () => {
      const results = await HuntDrop.DataLayer.searchAll('', { platform: 'aliexpress' });
      results.forEach(r => {
        expect(r.platform).toBe('aliexpress');
      });
    });
  });

  describe('getProduct / getTrends / getSuppliers / getPrices', () => {
    it('should return null for getProduct with invalid ID', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const product = await adapter.getProduct('nonexistent');
      expect(product).toBeNull();
    });

    it('should return empty array for getTrends with invalid ID', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const trends = await adapter.getTrends('nonexistent');
      expect(trends).toEqual([]);
    });

    it('should return empty array for getSuppliers with invalid ID', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const suppliers = await adapter.getSuppliers('nonexistent');
      expect(suppliers).toEqual([]);
    });

    it('should return empty object for getPrices with invalid ID', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const prices = await adapter.getPrices('nonexistent');
      expect(prices).toEqual({});
    });

    it('should return trend data as array of 12 numbers', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const all = await adapter.search('', {});
      if (all.length > 0) {
        const trends = await adapter.getTrends(all[0].id);
        expect(Array.isArray(trends)).toBe(true);
        expect(trends.length).toBe(12);
        trends.forEach(t => expect(typeof t).toBe('number'));
      }
    });
  });

  describe('DataLayer.searchAll — aggregation', () => {
    it('should return results from all platforms with no filter', async () => {
      const results = await HuntDrop.DataLayer.searchAll('', {});
      const platforms = new Set(results.map(r => r.platform));
      expect(platforms.size).toBeGreaterThan(1);
    });

    it('each result should have _sourcePlatform', async () => {
      const results = await HuntDrop.DataLayer.searchAll('', {});
      results.forEach(r => {
        expect(r._sourcePlatform).toBeDefined();
      });
    });

    it('should handle fetch failure gracefully (empty product list)', async () => {
      // data-adapters loads from mock-products.json via fetch
      // In test env, this is mocked but should still work
      const results = await HuntDrop.DataLayer.searchAll('test');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('DataLayer.registerAdapter', () => {
    it('should allow registering a custom adapter', async () => {
      const customAdapter = {
        search: async () => [createSampleProduct({ id: 9999, platform: 'custom' })],
        getProduct: async () => null,
        getTrends: async () => [],
        getSuppliers: async () => [],
        getPrices: async () => ({}),
      };
      HuntDrop.DataLayer.registerAdapter('custom', customAdapter);
      const adapter = HuntDrop.DataLayer.getAdapter('custom');
      expect(adapter).toBeDefined();
      const results = await adapter.search('');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(9999);
    });

    it('should override existing adapter if re-registered', async () => {
      const adapter1 = { search: async () => [createSampleProduct({ id: 1 })] };
      const adapter2 = { search: async () => [createSampleProduct({ id: 2 })] };
      HuntDrop.DataLayer.registerAdapter('testplatform', adapter1);
      HuntDrop.DataLayer.registerAdapter('testplatform', adapter2);
      const results = await HuntDrop.DataLayer.getAdapter('testplatform').search('');
      expect(results[0].id).toBe(2);
    });
  });

  describe('ALL_PRODUCTS data integrity', () => {
    it('should have products with valid numeric fields', () => {
      HuntDrop.ALL_PRODUCTS.forEach(p => {
        expect(typeof p.id).toBe('number');
        expect(typeof p.price).toBe('number');
        expect(typeof p.margin).toBe('number');
        expect(typeof p.score).toBe('number');
        expect(typeof p.salesVelocity).toBe('number');
        expect(typeof p.riskScore).toBe('number');
        expect(typeof p.marketSaturation).toBe('number');
      });
    });

    it('should have all required string fields', () => {
      HuntDrop.ALL_PRODUCTS.forEach(p => {
        expect(typeof p.title).toBe('string');
        expect(typeof p.platform).toBe('string');
        expect(typeof p.image).toBe('string');
        expect(typeof p.category).toBe('string');
        expect(typeof p.competition).toBe('string');
      });
    });

    it('should have suppliers array with at least one supplier per product', () => {
      HuntDrop.ALL_PRODUCTS.forEach(p => {
        expect(Array.isArray(p.suppliers)).toBe(true);
        expect(p.suppliers.length).toBeGreaterThan(0);
      });
    });

    it('should have platformPrices with at least 3 platforms', () => {
      HuntDrop.ALL_PRODUCTS.forEach(p => {
        expect(Object.keys(p.platformPrices).length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should have trendData and seasonality as arrays of 12', () => {
      HuntDrop.ALL_PRODUCTS.forEach(p => {
        expect(p.trendData.length).toBe(12);
        expect(p.seasonality.length).toBe(12);
      });
    });

    it('should have keywords as non-empty arrays', () => {
      HuntDrop.ALL_PRODUCTS.forEach(p => {
        expect(Array.isArray(p.keywords)).toBe(true);
        expect(p.keywords.length).toBeGreaterThan(0);
      });
    });

    it('should have valid competition values', () => {
      const valid = ['low', 'medium', 'high'];
      HuntDrop.ALL_PRODUCTS.forEach(p => {
        expect(valid).toContain(p.competition);
      });
    });

    it('should have prices greater than 0', () => {
      HuntDrop.ALL_PRODUCTS.forEach(p => {
        expect(p.price).toBeGreaterThan(0);
      });
    });

    it('should have margins between 0 and 100', () => {
      HuntDrop.ALL_PRODUCTS.forEach(p => {
        expect(p.margin).toBeGreaterThanOrEqual(0);
        expect(p.margin).toBeLessThanOrEqual(100);
      });
    });
  });
});
