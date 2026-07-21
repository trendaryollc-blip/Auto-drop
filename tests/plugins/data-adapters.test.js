// ============================================================================
// TESTS: plugins/data-adapters.js — Platform Data Adapters
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugin, loadCore, loadScript, createSampleProduct, mockPlatformConnectors } from '../setup.js';

const SAMPLE_PRODUCTS = [
  createSampleProduct({
    id: 1,
    platform: 'amazon',
    title: 'Wireless Earbuds Pro',
    category: 'Electronics',
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
    category: 'Electronics',
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
    category: 'Electronics',
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
    category: 'Electronics',
    price: 12.99,
    score: 88,
    competition: 'low',
    margin: 70,
    salesVelocity: 1200,
  }),
  createSampleProduct({
    id: 5,
    platform: 'shopify',
    title: 'Pet Grooming Brush',
    category: 'Pet Supplies',
    price: 15.99,
    score: 82,
    competition: 'low',
    margin: 80,
    salesVelocity: 600,
  }),
  createSampleProduct({
    id: 6,
    platform: 'ebay',
    title: 'Vintage Watch Band',
    category: 'Accessories',
    price: 24.99,
    score: 76,
    competition: 'medium',
    margin: 55,
    salesVelocity: 300,
  }),
  createSampleProduct({
    id: 7,
    platform: 'temu',
    title: 'LED Strip Lights',
    category: 'Home',
    price: 6.99,
    score: 90,
    competition: 'high',
    margin: 90,
    salesVelocity: 3000,
  }),
  createSampleProduct({
    id: 8,
    platform: 'tiktok',
    title: 'Phone Camera Lens Kit',
    category: 'Electronics',
    price: 14.99,
    score: 87,
    competition: 'medium',
    margin: 65,
    salesVelocity: 900,
  }),
];

describe('data-adapters plugin', () => {
  let HuntDrop;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugin('plugins/data-adapters.js'));
    mockPlatformConnectors(SAMPLE_PRODUCTS);
  });

  describe('Adapter Registration', () => {
    it('should register adapters for all 10 platforms', () => {
      const platforms = [
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
      ];
      platforms.forEach((p) => {
        expect(HuntDrop.DataLayer.getAdapter(p)).toBeDefined();
      });
    });

    it('should emit adapters:registered event on load', () => {
      const core = loadCore();
      const cb = vi.fn();
      core.EventBus.on('adapters:registered', cb);
      loadScript('plugins/data-adapters.js');
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          platforms: expect.arrayContaining(['aliexpress', 'amazon']),
        })
      );
    });
  });

  describe('ALL_PRODUCTS global', () => {
    it('should be an empty array in API-only mode (no connected platforms)', () => {
      expect(HuntDrop.ALL_PRODUCTS).toBeDefined();
      expect(Array.isArray(HuntDrop.ALL_PRODUCTS)).toBe(true);
      expect(HuntDrop.ALL_PRODUCTS.length).toBe(0);
    });
  });

  describe('createAdapter() — search', () => {
    it('should search by title', async () => {
      const results = await HuntDrop.DataLayer.searchAll('earbuds');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.title.toLowerCase()).toContain('earbuds');
      });
    });

    it('should search by keywords', async () => {
      const results = await HuntDrop.DataLayer.searchAll('bluetooth');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.title.toLowerCase()).toContain('bluetooth');
      });
    });

    it('should search by category', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const results = await adapter.search('Electronics');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.platform).toBe('amazon');
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
      const results = await adapter.search('', { priceMax: 25 });
      results.forEach((r) => {
        expect(r.price).toBeLessThanOrEqual(25);
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
      const results = await adapter.search('', { margin: '70' });
      results.forEach((r) => {
        expect(r.margin).toBeGreaterThanOrEqual(70);
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
      const amazonProducts = SAMPLE_PRODUCTS.filter((p) => p.platform === 'amazon');
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
    it('should return empty array (no trend data in API-only mode)', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const trends = await adapter.getTrends(1);
      expect(Array.isArray(trends)).toBe(true);
      expect(trends).toEqual([]);
    });
  });

  describe('createAdapter() — getSuppliers', () => {
    it('should return empty array (no supplier data in API-only mode)', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const suppliers = await adapter.getSuppliers(1);
      expect(Array.isArray(suppliers)).toBe(true);
      expect(suppliers).toEqual([]);
    });
  });

  describe('createAdapter() — getPrices', () => {
    it('should return empty object (no price data in API-only mode)', async () => {
      const adapter = HuntDrop.DataLayer.getAdapter('amazon');
      const prices = await adapter.getPrices(1);
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
