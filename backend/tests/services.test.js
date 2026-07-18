import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all model dependencies
vi.mock('../models/Product.js', () => ({
  default: {
    search: vi.fn(),
    findById: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock('../models/SavedProduct.js', () => ({
  default: {
    save: vi.fn(),
    remove: vi.fn(),
    isSaved: vi.fn(),
    getByUser: vi.fn(),
    countByUser: vi.fn(),
  },
}));

vi.mock('../models/SearchHistory.js', () => ({
  default: {
    log: vi.fn(),
  },
}));

import ProductService from '../services/ProductService.js';
import Product from '../models/Product.js';
import SavedProduct from '../models/SavedProduct.js';
import SearchHistory from '../models/SearchHistory.js';

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return search results', async () => {
      const mockProducts = [
        { id: '1', title: 'Test Product', platform: 'aliexpress' },
      ];
      Product.search.mockResolvedValue(mockProducts);

      const result = await ProductService.search({ query: 'test' });
      expect(result.results).toEqual(mockProducts);
      expect(result.total).toBe(1);
    });

    it('should log search for authenticated users', async () => {
      Product.search.mockResolvedValue([]);
      SearchHistory.log.mockResolvedValue({});

      await ProductService.search({ query: 'test', uid: 'user1' });
      expect(SearchHistory.log).toHaveBeenCalledWith('user1', 'test', expect.any(Object), 0);
    });

    it('should not log search for anonymous users', async () => {
      Product.search.mockResolvedValue([]);

      await ProductService.search({ query: 'test' });
      expect(SearchHistory.log).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return product when found', async () => {
      const product = { id: '1', title: 'Test Product' };
      Product.findById.mockResolvedValue(product);

      const result = await ProductService.getById('1');
      expect(result).toEqual(product);
    });

    it('should throw NotFoundError when not found', async () => {
      Product.findById.mockResolvedValue(null);
      await expect(ProductService.getById('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('save', () => {
    it('should save product for user', async () => {
      const product = { id: '1', title: 'Test Product' };
      Product.findById.mockResolvedValue(product);
      SavedProduct.save.mockResolvedValue({ id: 'user1_1' });

      const result = await ProductService.save('user1', '1');
      expect(SavedProduct.save).toHaveBeenCalledWith('user1', product);
      expect(result.id).toBe('user1_1');
    });

    it('should throw if product not found', async () => {
      Product.findById.mockResolvedValue(null);
      await expect(ProductService.save('user1', '999')).rejects.toThrow('not found');
    });
  });

  describe('unsave', () => {
    it('should remove saved product', async () => {
      SavedProduct.remove.mockResolvedValue({});
      await ProductService.unsave('user1', '1');
      expect(SavedProduct.remove).toHaveBeenCalledWith('user1', '1');
    });
  });

  describe('isSaved', () => {
    it('should return true if saved', async () => {
      SavedProduct.isSaved.mockResolvedValue(true);
      const result = await ProductService.isSaved('user1', '1');
      expect(result).toBe(true);
    });

    it('should return false if not saved', async () => {
      SavedProduct.isSaved.mockResolvedValue(false);
      const result = await ProductService.isSaved('user1', '1');
      expect(result).toBe(false);
    });
  });

  describe('getSaved', () => {
    it('should return saved products', async () => {
      const saved = [{ id: '1', title: 'Saved Product' }];
      SavedProduct.getByUser.mockResolvedValue(saved);

      const result = await ProductService.getSaved('user1');
      expect(result).toEqual(saved);
    });
  });

  describe('getAll', () => {
    it('should return all products', async () => {
      const products = [{ id: '1', title: 'Product 1' }, { id: '2', title: 'Product 2' }];
      Product.getAll.mockResolvedValue(products);

      const result = await ProductService.getAll();
      expect(result).toEqual(products);
      expect(Product.getAll).toHaveBeenCalledWith(200);
    });

    it('should respect custom limit', async () => {
      Product.getAll.mockResolvedValue([]);

      await ProductService.getAll(50);
      expect(Product.getAll).toHaveBeenCalledWith(50);
    });
  });

  describe('getTrends', () => {
    it('should return trend data for product', async () => {
      Product.findById.mockResolvedValue({ id: '1', trendData: [10, 20, 30, 40] });

      const result = await ProductService.getTrends('1');
      expect(result).toEqual([10, 20, 30, 40]);
    });

    it('should return empty array when no trend data', async () => {
      Product.findById.mockResolvedValue({ id: '1' });

      const result = await ProductService.getTrends('1');
      expect(result).toEqual([]);
    });

    it('should throw NotFoundError when product not found', async () => {
      Product.findById.mockResolvedValue(null);
      await expect(ProductService.getTrends('999')).rejects.toThrow('not found');
    });
  });

  describe('getSuppliers', () => {
    it('should return suppliers for product', async () => {
      const suppliers = [{ name: 'Supplier A', rating: 4.5 }];
      Product.findById.mockResolvedValue({ id: '1', suppliers });

      const result = await ProductService.getSuppliers('1');
      expect(result).toEqual(suppliers);
    });

    it('should return empty array when no suppliers', async () => {
      Product.findById.mockResolvedValue({ id: '1' });

      const result = await ProductService.getSuppliers('1');
      expect(result).toEqual([]);
    });

    it('should throw NotFoundError when product not found', async () => {
      Product.findById.mockResolvedValue(null);
      await expect(ProductService.getSuppliers('999')).rejects.toThrow('not found');
    });
  });

  describe('getPrices', () => {
    it('should return platform prices for product', async () => {
      const platformPrices = { aliexpress: 15, amazon: 35, shopify: 25 };
      Product.findById.mockResolvedValue({ id: '1', platformPrices });

      const result = await ProductService.getPrices('1');
      expect(result).toEqual(platformPrices);
    });

    it('should return empty object when no prices', async () => {
      Product.findById.mockResolvedValue({ id: '1' });

      const result = await ProductService.getPrices('1');
      expect(result).toEqual({});
    });

    it('should throw NotFoundError when product not found', async () => {
      Product.findById.mockResolvedValue(null);
      await expect(ProductService.getPrices('999')).rejects.toThrow('not found');
    });
  });
});
