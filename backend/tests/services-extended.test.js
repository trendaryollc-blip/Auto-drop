import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
const mockDocRef = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
};

const mockCol = {
  doc: vi.fn(() => mockDocRef),
  where: vi.fn(function () { return this; }),
  limit: vi.fn(function () { return this; }),
  add: vi.fn().mockResolvedValue({ id: 'new-id' }),
  get: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
};

vi.mock('../database/index.js', () => ({
  collection: vi.fn(() => mockCol),
}));

import CalculatorService from '../services/CalculatorService.js';
import SettingsService from '../services/SettingsService.js';
import Calculation from '../models/Calculation.js';
import User from '../models/User.js';

describe('CalculatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculate', () => {
    it('should calculate profit correctly', async () => {
      mockCol.add.mockResolvedValue({ id: 'calc-1' });

      const result = await CalculatorService.calculate('user1', {
        sellPrice: 29.99,
        cost: 5.99,
        shipping: 2.00,
        platformFeePercent: 15,
        adSpend: 3.00,
      });

      expect(result.sellPrice).toBe(29.99);
      expect(result.cost).toBe(5.99);
      expect(result.shipping).toBe(2);
      expect(result.platformFee).toBeCloseTo(4.50, 1);
      expect(result.adSpend).toBe(3);
      expect(result.profit).toBeDefined();
      expect(result.margin).toBeDefined();
      expect(result.roi).toBeDefined();
      expect(result.id).toBe('calc-1');
    });

    it('should throw on sellPrice 0', async () => {
      await expect(
        CalculatorService.calculate('user1', { sellPrice: 0, cost: 5 })
      ).rejects.toThrow('greater than 0');
    });

    it('should throw on negative cost', async () => {
      await expect(
        CalculatorService.calculate('user1', { sellPrice: 20, cost: -1 })
      ).rejects.toThrow();
    });

    it('should work without uid (anonymous)', async () => {
      const result = await CalculatorService.calculate(null, {
        sellPrice: 50,
        cost: 10,
      });
      expect(result.profit).toBeGreaterThan(0);
      expect(mockCol.add).not.toHaveBeenCalled();
    });
  });

  describe('quickCalculate', () => {
    it('should calculate without saving', () => {
      const result = CalculatorService.quickCalculate({
        sellPrice: 29.99,
        cost: 5.99,
        shipping: 2,
        platformFeePercent: 15,
        adSpend: 3,
      });

      expect(result.sellPrice).toBe(29.99);
      expect(result.profit).toBeDefined();
      expect(result.margin).toBeDefined();
      expect(result.roi).toBeDefined();
    });

    it('should handle zero sellPrice', () => {
      const result = CalculatorService.quickCalculate({ sellPrice: 0, cost: 0 });
      expect(result.margin).toBe(0);
    });
  });

  describe('getHistory', () => {
    it('should return history for user', async () => {
      mockCol.get.mockResolvedValue([{ id: '1', data: () => ({ id: '1' }) }]);
      const result = await CalculatorService.getHistory('user1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete own calculation', async () => {
      mockDocRef.get.mockResolvedValue({ id: 'calc-1', uid: 'user1' });
      mockDocRef.delete.mockResolvedValue({});
      await expect(CalculatorService.delete('user1', 'calc-1')).resolves.not.toThrow();
    });

    it('should throw if not owner', async () => {
      mockDocRef.get.mockResolvedValue({ id: 'calc-1', uid: 'other' });
      await expect(CalculatorService.delete('user1', 'calc-1')).rejects.toThrow('Not authorized');
    });

    it('should throw if not found', async () => {
      mockDocRef.get.mockResolvedValue(null);
      await expect(CalculatorService.delete('user1', 'missing')).rejects.toThrow('not found');
    });
  });
});

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return user settings', async () => {
      mockDocRef.get.mockResolvedValue({ uid: 'user1', settings: { theme: 'dark' } });
      const result = await SettingsService.get('user1');
      expect(result).toHaveProperty('theme');
    });
  });

  describe('update', () => {
    it('should update theme', async () => {
      mockDocRef.get
        .mockResolvedValueOnce({ uid: 'user1', settings: { theme: 'dark' } }) // findById for existence check
        .mockResolvedValueOnce({ uid: 'user1', settings: { theme: 'light' } }); // findById after update
      mockDocRef.update.mockResolvedValue({});

      const result = await SettingsService.update('user1', { theme: 'light' });
      expect(result.theme).toBe('light');
    });

    it('should update platform', async () => {
      mockDocRef.get
        .mockResolvedValueOnce({ uid: 'user1', settings: {} })
        .mockResolvedValueOnce({ uid: 'user1', settings: { defaultPlatform: 'amazon' } });
      mockDocRef.update.mockResolvedValue({});

      const result = await SettingsService.update('user1', { defaultPlatform: 'amazon' });
      expect(result.defaultPlatform).toBe('amazon');
    });

    it('should update currency', async () => {
      mockDocRef.get
        .mockResolvedValueOnce({ uid: 'user1', settings: {} })
        .mockResolvedValueOnce({ uid: 'user1', settings: { currency: 'EUR' } });
      mockDocRef.update.mockResolvedValue({});

      const result = await SettingsService.update('user1', { currency: 'EUR' });
      expect(result.currency).toBe('EUR');
    });

    it('should update notifications', async () => {
      mockDocRef.get
        .mockResolvedValueOnce({ uid: 'user1', settings: {} })
        .mockResolvedValueOnce({ uid: 'user1', settings: { notifications: false } });
      mockDocRef.update.mockResolvedValue({});

      const result = await SettingsService.update('user1', { notifications: false });
      expect(result.notifications).toBe(false);
    });

    it('should throw on invalid theme', async () => {
      await expect(SettingsService.update('user1', { theme: 'neon' })).rejects.toThrow('Theme');
    });

    it('should throw on invalid platform', async () => {
      await expect(SettingsService.update('user1', { defaultPlatform: 'walmart' })).rejects.toThrow('Platform');
    });

    it('should throw on invalid currency', async () => {
      await expect(SettingsService.update('user1', { currency: 'XYZ' })).rejects.toThrow('Currency');
    });

    it('should throw on no valid updates', async () => {
      await expect(SettingsService.update('user1', {})).rejects.toThrow('No valid');
    });
  });

  describe('reset', () => {
    it('should reset to defaults', async () => {
      mockDocRef.get
        .mockResolvedValueOnce({ uid: 'user1', settings: { theme: 'light' } })
        .mockResolvedValueOnce({ uid: 'user1', settings: { theme: 'dark', defaultPlatform: 'all', currency: 'USD', notifications: true } });
      mockDocRef.update.mockResolvedValue({});

      const result = await SettingsService.reset('user1');
      expect(result.theme).toBe('dark');
      expect(result.currency).toBe('USD');
    });
  });
});
