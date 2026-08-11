import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockDocRef = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
};

function createChainableMock() {
  const chain = {
    doc: vi.fn(() => mockDocRef),
    where: vi.fn(function () { return this; }),
    limit: vi.fn(function () { return this; }),
    orderBy: vi.fn(function () { return this; }),
    add: vi.fn().mockResolvedValue({ id: 'new-id' }),
    get: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  };
  return chain;
}

const mockCollectionRef = createChainableMock();

vi.mock('../database/index.js', () => ({
  collection: vi.fn(() => mockCollectionRef),
  connectDB: vi.fn(),
  disconnectDB: vi.fn(),
}));

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
      test: vi.fn().mockResolvedValue({ status: 'ok', message: 'valid' }),
      push: vi.fn().mockResolvedValue({ status: 'ok', pushed: 1 }),
    },
  },
}));

import storeConnectRoutes from '../routes/store-connect.js';
import { signToken } from '../middleware/auth.js';
import User from '../models/User.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/store-connect', storeConnectRoutes);
  return app;
}

describe('Store Connect API routes', () => {
  let app;
  let token;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    token = signToken({ uid: 'user1', email: 'test@test.com' });
    mockCollectionRef.get.mockResolvedValue([]);
    User.getSettings.mockResolvedValue({ storeConnect: {}, storeConnectHistory: [] });
    User.updateSettings.mockResolvedValue({});
  });

  describe('GET /api/store-connect/status', () => {
    it('should return current store connections', async () => {
      User.getSettings.mockResolvedValueOnce({ storeConnect: { trendaryo: { platform: 'trendaryo' } } });

      const res = await request(app)
        .get('/api/store-connect/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ trendaryo: { platform: 'trendaryo' } });
    });
  });

  describe('POST /api/store-connect/connect', () => {
    it('should save new connection config', async () => {
      const res = await request(app)
        .post('/api/store-connect/connect')
        .set('Authorization', `Bearer ${token}`)
        .send({ platform: 'trendaryo', config: { storeId: 'store-123', apiKey: 'trnd_abc' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({ platform: 'trendaryo' });
      expect(User.updateSettings).toHaveBeenCalled();
    });

    it('should reject missing platform', async () => {
      const res = await request(app)
        .post('/api/store-connect/connect')
        .set('Authorization', `Bearer ${token}`)
        .send({ config: { storeId: 'store-123' } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/store-connect/test', () => {
    it('should validate connection config', async () => {
      const res = await request(app)
        .post('/api/store-connect/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ platform: 'trendaryo', config: { storeId: 'store-123', apiKey: 'trnd_abc' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ status: 'ok', message: 'valid' });
    });

    it('should reject missing config', async () => {
      const res = await request(app)
        .post('/api/store-connect/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ platform: 'trendaryo' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/store-connect/push', () => {
    it('should push products and save history', async () => {
      const products = [{ id: '1', title: 'Test Product' }];
      const res = await request(app)
        .post('/api/store-connect/push')
        .set('Authorization', `Bearer ${token}`)
        .send({ platform: 'trendaryo', config: { storeId: 'store-123', apiKey: 'trnd_abc' }, products, status: 'active' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ status: 'ok', pushed: 1 });
      expect(User.updateSettings).toHaveBeenCalled();
    });

    it('should reject missing products', async () => {
      const res = await request(app)
        .post('/api/store-connect/push')
        .set('Authorization', `Bearer ${token}`)
        .send({ platform: 'trendaryo', config: { storeId: 'store-123' } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/store-connect/history', () => {
    it('should return push history', async () => {
      User.getSettings.mockResolvedValueOnce({ storeConnectHistory: [{ id: 'h1' }] });

      const res = await request(app)
        .get('/api/store-connect/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([{ id: 'h1' }]);
    });
  });

  describe('DELETE /api/store-connect/history', () => {
    it('should clear push history', async () => {
      const res = await request(app)
        .delete('/api/store-connect/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(User.updateSettings).toHaveBeenCalledWith('user1', { storeConnectHistory: [] });
    });
  });
});
