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
  add: vi.fn().mockResolvedValue({ id: 'search-id' }),
  get: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
};

vi.mock('../database/index.js', () => ({
  collection: vi.fn(() => mockCollectionRef),
}));

import SearchHistory from '../models/SearchHistory.js';

describe('SearchHistory Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('should log a search query', async () => {
      const result = await SearchHistory.log('user1', 'wireless earbuds', { platform: 'aliexpress' }, 15);

      expect(mockCollectionRef.add).toHaveBeenCalled();
      expect(result.id).toBe('search-id');
      expect(result.uid).toBe('user1');
      expect(result.query).toBe('wireless earbuds');
      expect(result.filters).toEqual({ platform: 'aliexpress' });
      expect(result.resultCount).toBe(15);
      expect(result.searchedAt).toBeDefined();
    });

    it('should trim whitespace from query', async () => {
      const result = await SearchHistory.log('user1', '  earbuds  ');
      expect(result.query).toBe('earbuds');
    });

    it('should return null for empty query', async () => {
      const result = await SearchHistory.log('user1', '');
      expect(result).toBeNull();
      expect(mockCollectionRef.add).not.toHaveBeenCalled();
    });

    it('should return null for whitespace-only query', async () => {
      const result = await SearchHistory.log('user1', '   ');
      expect(result).toBeNull();
    });

    it('should use default filters and resultCount', async () => {
      const result = await SearchHistory.log('user1', 'test');
      expect(result.filters).toEqual({});
      expect(result.resultCount).toBe(0);
    });
  });

  describe('getRecent', () => {
    it('should return recent searches', async () => {
      const searches = [
        { id: '1', data: () => ({ query: 'earbuds' }) },
        { id: '2', data: () => ({ query: 'yoga mat' }) },
      ];
      mockCollectionRef.get.mockResolvedValue(searches);

      const result = await SearchHistory.getRecent('user1');
      expect(result).toHaveLength(2);
      expect(result[0].query).toBe('earbuds');
      expect(mockCollectionRef.where).toHaveBeenCalledWith('uid', '==', 'user1');
    });

    it('should respect limit parameter', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      await SearchHistory.getRecent('user1', 5);
      expect(mockCollectionRef.limit).toHaveBeenCalledWith(5);
    });

    it('should default to limit 8', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      await SearchHistory.getRecent('user1');
      expect(mockCollectionRef.limit).toHaveBeenCalledWith(8);
    });

    it('should return empty array when no searches', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      const result = await SearchHistory.getRecent('user1');
      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete a search entry', async () => {
      await SearchHistory.delete('search-id');
      expect(mockCollectionRef.doc).toHaveBeenCalledWith('search-id');
      expect(mockDocRef.delete).toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should delete all searches for user', async () => {
      const docs = [
        { id: 's1' },
        { id: 's2' },
        { id: 's3' },
      ];
      mockCollectionRef.get.mockResolvedValue(docs);

      await SearchHistory.clearAll('user1');

      expect(mockCollectionRef.where).toHaveBeenCalledWith('uid', '==', 'user1');
      expect(mockDocRef.delete).toHaveBeenCalledTimes(3);
    });

    it('should handle no searches to clear', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      await SearchHistory.clearAll('user1');
      expect(mockDocRef.delete).not.toHaveBeenCalled();
    });
  });

  describe('_trimOld', () => {
    it('should delete entries over limit', async () => {
      const docs = Array.from({ length: 110 }, (_, i) => ({
        id: `s${i}`,
      }));
      mockCollectionRef.get.mockResolvedValue(docs);

      await SearchHistory._trimOld('user1');

      expect(mockCollectionRef.limit).toHaveBeenCalledWith(110);
      expect(mockDocRef.delete).toHaveBeenCalledTimes(10);
    });

    it('should not delete when under limit', async () => {
      const docs = Array.from({ length: 50 }, (_, i) => ({
        id: `s${i}`,
      }));
      mockCollectionRef.get.mockResolvedValue(docs);

      await SearchHistory._trimOld('user1');
      expect(mockDocRef.delete).not.toHaveBeenCalled();
    });

    it('should not delete when exactly at limit', async () => {
      const docs = Array.from({ length: 100 }, (_, i) => ({
        id: `s${i}`,
      }));
      mockCollectionRef.get.mockResolvedValue(docs);

      await SearchHistory._trimOld('user1');
      expect(mockDocRef.delete).not.toHaveBeenCalled();
    });

    it('should only delete excess entries (not all)', async () => {
      const docs = Array.from({ length: 105 }, (_, i) => ({
        id: `s${i}`,
      }));
      mockCollectionRef.get.mockResolvedValue(docs);

      await SearchHistory._trimOld('user1');
      expect(mockDocRef.delete).toHaveBeenCalledTimes(5);
    });
  });
});
