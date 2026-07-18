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
  add: vi.fn().mockResolvedValue({ id: 'new-id' }),
  get: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
};

vi.mock('../database/index.js', () => ({
  collection: vi.fn(() => mockCollectionRef),
}));

import SavedProduct from '../models/SavedProduct.js';

describe('SavedProduct Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('should save a new product for user', async () => {
      mockDocRef.get.mockResolvedValue(null);

      const result = await SavedProduct.save('user1', {
        id: 'prod1',
        title: 'Test Product',
        image: 'http://img.jpg',
        platform: 'aliexpress',
        price: 29.99,
        score: 90,
      });

      expect(mockDocRef.set).toHaveBeenCalled();
      expect(result.uid).toBe('user1');
      expect(result.productId).toBe('prod1');
      expect(result.title).toBe('Test Product');
      expect(result.savedAt).toBeDefined();
      expect(result.notes).toBe('');
    });

    it('should update savedAt if already saved', async () => {
      mockDocRef.get.mockResolvedValue({ id: 'user1_prod1' });

      const result = await SavedProduct.save('user1', {
        id: 'prod1',
        title: 'Test',
      });

      expect(mockDocRef.update).toHaveBeenCalled();
      expect(result.savedAt).toBeDefined();
    });

    it('should use composite id of uid_productId', async () => {
      mockDocRef.get.mockResolvedValue(null);

      await SavedProduct.save('user1', { id: 'prod1' });

      expect(mockCollectionRef.doc).toHaveBeenCalledWith('user1_prod1');
    });
  });

  describe('remove', () => {
    it('should remove saved product', async () => {
      await SavedProduct.remove('user1', 'prod1');

      expect(mockCollectionRef.doc).toHaveBeenCalledWith('user1_prod1');
      expect(mockDocRef.delete).toHaveBeenCalled();
    });
  });

  describe('isSaved', () => {
    it('should return true if saved', async () => {
      mockDocRef.get.mockResolvedValue({ id: 'user1_prod1' });

      const result = await SavedProduct.isSaved('user1', 'prod1');
      expect(result).toBe(true);
    });

    it('should return false if not saved', async () => {
      mockDocRef.get.mockResolvedValue(null);

      const result = await SavedProduct.isSaved('user1', 'prod1');
      expect(result).toBe(false);
    });
  });

  describe('getByUser', () => {
    it('should return saved products for user', async () => {
      const saved = [
        { id: '1', data: () => ({ id: 'user1_prod1', title: 'Product 1' }) },
        { id: '2', data: () => ({ id: 'user1_prod2', title: 'Product 2' }) },
      ];
      mockCollectionRef.get.mockResolvedValue(saved);

      const result = await SavedProduct.getByUser('user1');
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Product 1');
      expect(mockCollectionRef.where).toHaveBeenCalledWith('uid', '==', 'user1');
    });

    it('should return empty array when none saved', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      const result = await SavedProduct.getByUser('user1');
      expect(result).toEqual([]);
    });
  });

  describe('updateNotes', () => {
    it('should update notes on saved product', async () => {
      await SavedProduct.updateNotes('user1', 'prod1', 'Great product!');

      expect(mockCollectionRef.doc).toHaveBeenCalledWith('user1_prod1');
      expect(mockDocRef.update).toHaveBeenCalledWith({ notes: 'Great product!' });
    });
  });

  describe('countByUser', () => {
    it('should return count of saved products', async () => {
      mockCollectionRef.count.mockResolvedValue(7);

      const result = await SavedProduct.countByUser('user1');
      expect(result).toBe(7);
      expect(mockCollectionRef.where).toHaveBeenCalledWith('uid', '==', 'user1');
    });
  });
});
