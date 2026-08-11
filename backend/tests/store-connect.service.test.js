import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/User.js', () => ({
  default: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

vi.mock('../utils/platform-connectors.js', () => ({
  PlatformConnectors: {
    trendaryo: {
      normalize: vi.fn((config) => ({ storeId: config.storeId || '', apiKey: config.apiKey || '' })),
      test: vi.fn(),
      push: vi.fn(),
    },
  },
}));

import User from '../models/User.js';
import { PlatformConnectors } from '../utils/platform-connectors.js';
import StoreConnectService from '../services/StoreConnectService.js';

describe('StoreConnectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConnections()', () => {
    it('should return stored storeConnect settings', async () => {
      User.getSettings.mockResolvedValueOnce({ storeConnect: { trendaryo: { platform: 'trendaryo' } } });

      const result = await StoreConnectService.getConnections('user1');

      expect(result).toEqual({ trendaryo: { platform: 'trendaryo' } });
      expect(User.getSettings).toHaveBeenCalledWith('user1');
    });
  });

  describe('saveConnection()', () => {
    it('should normalize config and persist store connection', async () => {
      const normalized = { storeId: 'store-123', apiKey: 'trnd_abc' };
      PlatformConnectors.trendaryo.normalize.mockReturnValueOnce(normalized);
      User.getSettings.mockResolvedValueOnce({ storeConnect: { existing: { platform: 'existing', config: {} } } });
      User.updateSettings.mockResolvedValueOnce({});

      const result = await StoreConnectService.saveConnection('user1', 'trendaryo', {
        storeId: 'store-123',
        apiKey: 'trnd_abc',
      });

      expect(PlatformConnectors.trendaryo.normalize).toHaveBeenCalledWith({ storeId: 'store-123', apiKey: 'trnd_abc' });
      expect(User.updateSettings).toHaveBeenCalledWith('user1', {
        storeConnect: {
          existing: { platform: 'existing', config: {} },
          trendaryo: expect.objectContaining({ platform: 'trendaryo', config: normalized }),
        },
      });
      expect(result).toEqual(expect.objectContaining({ platform: 'trendaryo', config: normalized }));
    });
  });

  describe('testConnection()', () => {
    it('should validate supported platform config', async () => {
      PlatformConnectors.trendaryo.test.mockResolvedValueOnce({ status: 'ok', message: 'valid' });

      const result = await StoreConnectService.testConnection('trendaryo', { storeId: 's', apiKey: 'k' });

      expect(PlatformConnectors.trendaryo.test).toHaveBeenCalledWith({ storeId: 's', apiKey: 'k' });
      expect(result).toEqual({ status: 'ok', message: 'valid' });
    });

    it('should throw for unsupported platform', async () => {
      await expect(StoreConnectService.testConnection('unsupported', {})).rejects.toThrow('Unsupported platform: unsupported');
    });
  });

  describe('pushProducts()', () => {
    it('should push products and record history', async () => {
      const products = [{ id: '1', title: 'Test' }];
      const config = { storeId: 'store-123' };
      PlatformConnectors.trendaryo.push.mockResolvedValueOnce({ status: 'ok', pushed: 1 });
      User.getSettings.mockResolvedValueOnce({ storeConnectHistory: [] });
      User.updateSettings.mockResolvedValueOnce({});

      const result = await StoreConnectService.pushProducts('user1', 'trendaryo', config, products, 'active');

      expect(PlatformConnectors.trendaryo.push).toHaveBeenCalledWith(config, { products, status: 'active' });
      expect(User.updateSettings).toHaveBeenCalledWith('user1', {
        storeConnectHistory: expect.any(Array),
      });
      expect(result).toEqual({ status: 'ok', pushed: 1 });
    });

    it('should throw for unsupported platform', async () => {
      await expect(StoreConnectService.pushProducts('user1', 'unsupported', {}, [], 'draft')).rejects.toThrow('Unsupported platform: unsupported');
    });
  });

  describe('history helpers', () => {
    it('should return history from settings', async () => {
      const history = [{ id: 'h1', platform: 'trendaryo' }];
      User.getSettings.mockResolvedValueOnce({ storeConnectHistory: history });

      const result = await StoreConnectService.getHistory('user1');
      expect(result).toEqual(history);
    });

    it('should clear history', async () => {
      User.updateSettings.mockResolvedValueOnce({});

      await StoreConnectService.clearHistory('user1');
      expect(User.updateSettings).toHaveBeenCalledWith('user1', { storeConnectHistory: [] });
    });
  });
});
