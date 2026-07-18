import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDocRef = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
};

const mockCollectionRef = {
  doc: vi.fn(() => mockDocRef),
  where: vi.fn(function () { return this; }),
  limit: vi.fn(function () { return this; }),
  add: vi.fn().mockResolvedValue({ id: 'new-calc-id' }),
  get: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
};

vi.mock('../database/index.js', () => ({
  collection: vi.fn(() => mockCollectionRef),
}));

import Calculation from '../models/Calculation.js';

describe('Calculation Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should save a calculation', async () => {
      const result = await Calculation.create('user1', {
        productName: 'Wireless Earbuds',
        sellPrice: 29.99,
        cost: 5.99,
        shipping: 2,
        platformFee: 4.5,
        adSpend: 3,
        profit: 14.5,
        margin: 48.3,
        currency: 'USD',
      });

      expect(mockCollectionRef.add).toHaveBeenCalled();
      expect(result.id).toBe('new-calc-id');
      expect(result.uid).toBe('user1');
      expect(result.productName).toBe('Wireless Earbuds');
      expect(result.sellPrice).toBe(29.99);
      expect(result.profit).toBe(14.5);
      expect(result.createdAt).toBeDefined();
    });

    it('should use defaults for missing fields', async () => {
      const result = await Calculation.create('user1', {});

      expect(result.productName).toBe('Untitled Product');
      expect(result.sellPrice).toBe(0);
      expect(result.cost).toBe(0);
      expect(result.shipping).toBe(0);
      expect(result.platformFee).toBe(0);
      expect(result.adSpend).toBe(0);
      expect(result.profit).toBe(0);
      expect(result.margin).toBe(0);
      expect(result.currency).toBe('USD');
    });
  });

  describe('getByUser', () => {
    it('should return calculations for user', async () => {
      const calcs = [
        { id: '1', data: () => ({ id: 'calc1', productName: 'Product 1' }) },
        { id: '2', data: () => ({ id: 'calc2', productName: 'Product 2' }) },
      ];
      mockCollectionRef.get.mockResolvedValue(calcs);

      const result = await Calculation.getByUser('user1');
      expect(result).toHaveLength(2);
      expect(result[0].productName).toBe('Product 1');
      expect(mockCollectionRef.where).toHaveBeenCalledWith('uid', '==', 'user1');
    });

    it('should respect limit parameter', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      await Calculation.getByUser('user1', 10);
      expect(mockCollectionRef.limit).toHaveBeenCalledWith(10);
    });

    it('should default to limit 50', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      await Calculation.getByUser('user1');
      expect(mockCollectionRef.limit).toHaveBeenCalledWith(50);
    });

    it('should return empty array when no calculations', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      const result = await Calculation.getByUser('user1');
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return calculation when found', async () => {
      const calc = { id: 'calc1', productName: 'Test' };
      mockDocRef.get.mockResolvedValue(calc);

      const result = await Calculation.findById('calc1');
      expect(result).toEqual(calc);
    });

    it('should return null when not found', async () => {
      mockDocRef.get.mockResolvedValue(null);

      const result = await Calculation.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete calculation by id', async () => {
      await Calculation.delete('calc1');
      expect(mockDocRef.delete).toHaveBeenCalled();
    });
  });

  describe('countByUser', () => {
    it('should return count of calculations', async () => {
      mockCollectionRef.count.mockResolvedValue(15);

      const result = await Calculation.countByUser('user1');
      expect(result).toBe(15);
      expect(mockCollectionRef.where).toHaveBeenCalledWith('uid', '==', 'user1');
    });
  });
});
