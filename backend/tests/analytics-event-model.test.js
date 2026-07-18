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
  add: vi.fn().mockResolvedValue({ id: 'event-id' }),
  get: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
};

vi.mock('../database/index.js', () => ({
  collection: vi.fn(() => mockCollectionRef),
}));

import AnalyticsEvent from '../models/AnalyticsEvent.js';

describe('AnalyticsEvent Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('track', () => {
    it('should log a single event', async () => {
      const result = await AnalyticsEvent.track('user1', 'search', {
        query: 'earbuds',
        userAgent: 'Mozilla/5.0',
        path: '/api/search',
      });

      expect(mockCollectionRef.add).toHaveBeenCalled();
      expect(result.id).toBe('event-id');
      expect(result.uid).toBe('user1');
      expect(result.eventType).toBe('search');
      expect(result.data.query).toBe('earbuds');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.path).toBe('/api/search');
      expect(result.timestamp).toBeDefined();
    });

    it('should default uid to anonymous', async () => {
      const result = await AnalyticsEvent.track(null, 'page:view');

      expect(result.uid).toBe('anonymous');
    });

    it('should handle empty data', async () => {
      const result = await AnalyticsEvent.track('user1', 'click');

      expect(result.data).toEqual({});
      expect(result.userAgent).toBe('');
      expect(result.path).toBe('');
    });
  });

  describe('trackBatch', () => {
    it('should log multiple events', async () => {
      const events = [
        { uid: 'user1', eventType: 'search', data: { query: 'a' } },
        { uid: 'user1', eventType: 'search', data: { query: 'b' } },
        { uid: 'user1', eventType: 'click', data: {} },
      ];

      const count = await AnalyticsEvent.trackBatch(events);
      expect(count).toBe(3);
    });

    it('should return count of successfully logged events', async () => {
      const events = Array.from({ length: 5 }, (_, i) => ({
        uid: 'user1',
        eventType: 'search',
        data: { query: `q${i}` },
      }));

      const count = await AnalyticsEvent.trackBatch(events);
      expect(count).toBe(5);
    });

    it('should handle empty array', async () => {
      const count = await AnalyticsEvent.trackBatch([]);
      expect(count).toBe(0);
    });

    it('should handle batch larger than MAX_EVENTS_PER_BATCH', async () => {
      const events = Array.from({ length: 55 }, (_, i) => ({
        uid: 'user1',
        eventType: 'search',
        data: { query: `q${i}` },
      }));

      const count = await AnalyticsEvent.trackBatch(events);
      expect(count).toBe(55);
    });

    it('should silently handle individual failures', async () => {
      let callCount = 0;
      mockCollectionRef.add.mockImplementation(() => {
        callCount++;
        if (callCount === 2) return Promise.reject(new Error('DB error'));
        return Promise.resolve({ id: `event-${callCount}` });
      });

      const events = [
        { uid: 'user1', eventType: 'search', data: {} },
        { uid: 'user1', eventType: 'search', data: {} },
        { uid: 'user1', eventType: 'search', data: {} },
      ];

      const count = await AnalyticsEvent.trackBatch(events);
      expect(count).toBe(2);
    });
  });

  describe('getByUser', () => {
    it('should return events for user', async () => {
      const events = [
        { id: '1', data: () => ({ uid: 'user1', eventType: 'search' }) },
        { id: '2', data: () => ({ uid: 'user1', eventType: 'click' }) },
      ];
      mockCollectionRef.get.mockResolvedValue(events);

      const result = await AnalyticsEvent.getByUser('user1');
      expect(result).toHaveLength(2);
      expect(mockCollectionRef.where).toHaveBeenCalledWith('uid', '==', 'user1');
    });

    it('should filter by eventType', async () => {
      const events = [
        { id: '1', data: () => ({ uid: 'user1', eventType: 'search', timestamp: '2024-01-01' }) },
        { id: '2', data: () => ({ uid: 'user1', eventType: 'click', timestamp: '2024-01-02' }) },
        { id: '3', data: () => ({ uid: 'user1', eventType: 'search', timestamp: '2024-01-03' }) },
      ];
      mockCollectionRef.get.mockResolvedValue(events);

      const result = await AnalyticsEvent.getByUser('user1', { eventType: 'search' });
      expect(result).toHaveLength(2);
      result.forEach(e => expect(e.eventType).toBe('search'));
    });

    it('should filter by since timestamp', async () => {
      const events = [
        { id: '1', data: () => ({ uid: 'user1', eventType: 'search', timestamp: '2024-01-01' }) },
        { id: '2', data: () => ({ uid: 'user1', eventType: 'search', timestamp: '2024-06-01' }) },
        { id: '3', data: () => ({ uid: 'user1', eventType: 'search', timestamp: '2024-12-01' }) },
      ];
      mockCollectionRef.get.mockResolvedValue(events);

      const result = await AnalyticsEvent.getByUser('user1', { since: '2024-06-01' });
      expect(result).toHaveLength(2);
    });

    it('should respect limit', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      await AnalyticsEvent.getByUser('user1', { limit: 25 });
      expect(mockCollectionRef.limit).toHaveBeenCalledWith(25);
    });

    it('should default to limit 50', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      await AnalyticsEvent.getByUser('user1');
      expect(mockCollectionRef.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('getStats', () => {
    it('should return aggregate stats', async () => {
      const events = [
        { id: '1', data: () => ({ uid: 'user1', eventType: 'search', timestamp: '2024-01-01' }) },
        { id: '2', data: () => ({ uid: 'user1', eventType: 'search', timestamp: '2024-01-02' }) },
        { id: '3', data: () => ({ uid: 'user1', eventType: 'product:view', timestamp: '2024-01-03' }) },
        { id: '4', data: () => ({ uid: 'user1', eventType: 'product:save', timestamp: '2024-01-04' }) },
        { id: '5', data: () => ({ uid: 'user1', eventType: 'calculator:calculate', timestamp: '2024-01-05' }) },
        { id: '6', data: () => ({ uid: 'user1', eventType: 'navigation', timestamp: '2024-01-06' }) },
      ];
      mockCollectionRef.get.mockResolvedValue(events);

      const stats = await AnalyticsEvent.getStats('user1');
      expect(stats.totalEvents).toBe(6);
      expect(stats.searches).toBe(2);
      expect(stats.productViews).toBe(1);
      expect(stats.saves).toBe(1);
      expect(stats.calculations).toBe(1);
      expect(stats.navigations).toBe(1);
      expect(stats.lastActive).toBe('2024-01-01');
    });

    it('should handle empty events', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      const stats = await AnalyticsEvent.getStats('user1');
      expect(stats.totalEvents).toBe(0);
      expect(stats.searches).toBe(0);
      expect(stats.lastActive).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should delete old events', async () => {
      const oldDocs = [
        { id: 'old1' },
        { id: 'old2' },
      ];
      mockCollectionRef.get.mockResolvedValue(oldDocs);

      await AnalyticsEvent.cleanup(90);

      expect(mockCollectionRef.where).toHaveBeenCalledWith('timestamp', '<', expect.any(String));
      expect(mockDocRef.delete).toHaveBeenCalledTimes(2);
    });

    it('should use default 90 days', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      await AnalyticsEvent.cleanup();

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      expect(mockCollectionRef.where).toHaveBeenCalledWith(
        'timestamp', '<', expect.stringContaining('2026')
      );
    });

    it('should handle no old events', async () => {
      mockCollectionRef.get.mockResolvedValue([]);

      await AnalyticsEvent.cleanup(30);
      expect(mockDocRef.delete).not.toHaveBeenCalled();
    });
  });
});
