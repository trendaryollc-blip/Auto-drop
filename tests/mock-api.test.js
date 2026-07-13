// ============================================================================
// TESTS: mock-api.js — Mock API / Supplier Pool
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCore, loadScript } from './setup.js';

describe('mock-api.js — Mock API / Supplier Pool', () => {
  let HuntDrop;

  beforeEach(() => {
    HuntDrop = loadCore();
    loadScript('mock-api.js');
  });

  describe('MockAPI object', () => {
    it('should expose window.MockAPI', () => {
      expect(window.MockAPI).toBeDefined();
    });

    it('should have getProducts method', () => {
      expect(typeof window.MockAPI.getProducts).toBe('function');
    });

    it('should have getProduct method', () => {
      expect(typeof window.MockAPI.getProduct).toBe('function');
    });

    it('should have getCompetitors method', () => {
      expect(typeof window.MockAPI.getCompetitors).toBe('function');
    });

    it('should have getSuppliers method', () => {
      expect(typeof window.MockAPI.getSuppliers).toBe('function');
    });

    it('should have getTrends method', () => {
      expect(typeof window.MockAPI.getTrends).toBe('function');
    });

    it('should have fetch method', () => {
      expect(typeof window.MockAPI.fetch).toBe('function');
    });
  });

  describe('getProducts()', () => {
    it('should return array of products', () => {
      const products = window.MockAPI.getProducts();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
    });

    it('should filter by platform', () => {
      const products = window.MockAPI.getProducts({ platform: 'aliexpress' });
      products.forEach((p) => {
        expect(p.platform).toBe('aliexpress');
      });
    });

    it('should filter by category', () => {
      const products = window.MockAPI.getProducts({ category: 'Electronics' });
      products.forEach((p) => {
        expect(p.category).toBe('Electronics');
      });
    });

    it('should filter by priceMax', () => {
      const products = window.MockAPI.getProducts({ priceMax: 10 });
      products.forEach((p) => {
        expect(p.price).toBeLessThanOrEqual(10);
      });
    });

    it('should filter by minScore', () => {
      const products = window.MockAPI.getProducts({ minScore: 90 });
      products.forEach((p) => {
        expect(p.score).toBeGreaterThanOrEqual(90);
      });
    });

    it('should filter by competition', () => {
      const products = window.MockAPI.getProducts({ competition: 'low' });
      products.forEach((p) => {
        expect(p.competition).toBe('low');
      });
    });

    it('should filter by query', () => {
      const products = window.MockAPI.getProducts({ query: 'earbuds' });
      products.forEach((p) => {
        const match = p.title.toLowerCase().includes('earbuds') ||
          p.category.toLowerCase().includes('earbuds') ||
          p.keywords.some((k) => k.toLowerCase().includes('earbuds'));
        expect(match).toBe(true);
      });
    });
  });

  describe('getProduct()', () => {
    it('should return product by ID', () => {
      const product = window.MockAPI.getProduct(1);
      expect(product).toBeDefined();
      expect(product.id).toBe(1);
    });

    it('should return null for non-existent ID', () => {
      const product = window.MockAPI.getProduct(99999);
      expect(product).toBeNull();
    });
  });

  describe('getCompetitors()', () => {
    it('should return array of competitors', () => {
      const competitors = window.MockAPI.getCompetitors();
      expect(Array.isArray(competitors)).toBe(true);
      expect(competitors.length).toBeGreaterThan(0);
    });
  });

  describe('getSuppliers()', () => {
    it('should return array of suppliers', () => {
      const suppliers = window.MockAPI.getSuppliers();
      expect(Array.isArray(suppliers)).toBe(true);
      expect(suppliers.length).toBeGreaterThan(0);
    });

    it('should filter by specialty', () => {
      const suppliers = window.MockAPI.getSuppliers({ specialty: 'Electronics' });
      suppliers.forEach((s) => {
        expect(s.specialty.toLowerCase()).toContain('electronics');
      });
    });

    it('should filter by verified', () => {
      const suppliers = window.MockAPI.getSuppliers({ verified: true });
      suppliers.forEach((s) => {
        expect(s.verified).toBe(true);
      });
    });
  });

  describe('getTrends()', () => {
    it('should return trend data for product', () => {
      const trends = window.MockAPI.getTrends(1);
      expect(trends).toBeDefined();
      expect(trends.trendData).toBeDefined();
      expect(Array.isArray(trends.trendData)).toBe(true);
    });

    it('should return empty arrays for non-existent product', () => {
      const trends = window.MockAPI.getTrends(99999);
      expect(trends.trendData).toEqual([]);
      expect(trends.seasonality).toEqual([]);
    });
  });

  describe('fetch()', () => {
    it('should fetch products from /api/products', async () => {
      const data = await window.MockAPI.fetch('/api/products');
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should fetch competitors from /api/competitors', async () => {
      const data = await window.MockAPI.fetch('/api/competitors');
      expect(Array.isArray(data)).toBe(true);
    });

    it('should reject unknown endpoints', async () => {
      await expect(window.MockAPI.fetch('/api/unknown')).rejects.toThrow();
    });
  });

  describe('window.fetch override', () => {
    it('should intercept /api/ routes', async () => {
      const data = await fetch('/api/products');
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('getCategories()', () => {
    it('should return array of category names', () => {
      const categories = window.MockAPI.getCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('getPlatforms()', () => {
    it('should return array of platform names', () => {
      const platforms = window.MockAPI.getPlatforms();
      expect(Array.isArray(platforms)).toBe(true);
      expect(platforms).toContain('aliexpress');
      expect(platforms).toContain('amazon');
    });
  });

  describe('getProductCount()', () => {
    it('should return product count', () => {
      const count = window.MockAPI.getProductCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });
});