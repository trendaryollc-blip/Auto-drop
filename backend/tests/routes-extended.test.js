import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';

// ===== Shared Mocks =====
const mockDocRef = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
};

function createChain() {
  return {
    doc: vi.fn(() => mockDocRef),
    where: vi.fn(function () { return this; }),
    limit: vi.fn(function () { return this; }),
    orderBy: vi.fn(function () { return this; }),
    add: vi.fn().mockResolvedValue({ id: 'new-id' }),
    get: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  };
}

const mockCol = createChain();

vi.mock('../database/index.js', () => ({
  collection: vi.fn(() => mockCol),
  connectDB: vi.fn(),
  disconnectDB: vi.fn(),
}));

vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: vi.fn(),
    credential: { cert: vi.fn(), applicationDefault: vi.fn() },
    firestore: vi.fn(() => ({ collection: vi.fn(), settings: vi.fn() })),
    firestore: { FieldValue: { serverTimestamp: vi.fn(() => new Date().toISOString()) } },
  },
}));

import request from 'supertest';
import analyticsRoutes from '../routes/analytics.js';
import batchRoutes from '../routes/batch.js';
import exportRoutes from '../routes/export.js';
import productsRoutes from '../routes/products.js';
import settingsRoutes from '../routes/settings.js';
import calculatorRoutes from '../routes/calculator.js';
import { signToken } from '../middleware/auth.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/products/batch', batchRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/calculator', calculatorRoutes);
  return app;
}

describe('Analytics Routes', () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
    token = signToken({ uid: 'user1', email: 'test@test.com' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCol.get.mockResolvedValue([]);
    mockCol.add.mockResolvedValue({ id: 'evt-1' });
  });

  it('POST /api/analytics/track — should track event', async () => {
    const res = await request(app)
      .post('/api/analytics/track')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventType: 'search', data: { query: 'earbuds' } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.eventType).toBe('search');
  });

  it('POST /api/analytics/track — should reject without auth', async () => {
    const res = await request(app)
      .post('/api/analytics/track')
      .send({ eventType: 'search' });

    expect(res.status).toBe(401);
  });

  it('POST /api/analytics/track — should reject missing eventType', async () => {
    const res = await request(app)
      .post('/api/analytics/track')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: {} });

    expect(res.status).toBe(422);
  });

  it('POST /api/analytics/track/batch — should batch track', async () => {
    const res = await request(app)
      .post('/api/analytics/track/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ events: [{ eventType: 'search' }, { eventType: 'click' }] });

    expect(res.status).toBe(200);
    expect(res.body.data.tracked).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/analytics/events — should return events', async () => {
    const res = await request(app)
      .get('/api/analytics/events')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/analytics/stats — should return stats', async () => {
    const res = await request(app)
      .get('/api/analytics/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalEvents');
    expect(res.body.data).toHaveProperty('searches');
  });
});

describe('Batch Routes', () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
    token = signToken({ uid: 'user1', email: 'test@test.com' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCol.get.mockResolvedValue([]);
    mockDocRef.get.mockResolvedValue({ id: '1', title: 'Test' });
    mockDocRef.set.mockResolvedValue({});
  });

  it('POST /api/products/batch/save — should save multiple', async () => {
    const res = await request(app)
      .post('/api/products/batch/save')
      .set('Authorization', `Bearer ${token}`)
      .send({ productIds: ['1', '2'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('failed');
  });

  it('POST /api/products/batch/save — should reject without auth', async () => {
    const res = await request(app)
      .post('/api/products/batch/save')
      .send({ productIds: ['1'] });

    expect(res.status).toBe(401);
  });

  it('POST /api/products/batch/unsave — should unsave multiple', async () => {
    const res = await request(app)
      .post('/api/products/batch/unsave')
      .set('Authorization', `Bearer ${token}`)
      .send({ productIds: ['1', '2'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/products/batch/check — should check status', async () => {
    mockCol.get.mockResolvedValue([]);
    const res = await request(app)
      .post('/api/products/batch/check')
      .set('Authorization', `Bearer ${token}`)
      .send({ productIds: ['1', '2'] });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('1');
    expect(res.body.data).toHaveProperty('2');
  });
});

describe('Export Routes', () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
    token = signToken({ uid: 'user1', email: 'test@test.com' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCol.get.mockResolvedValue([]);
  });

  it('GET /api/export/products — should export products', async () => {
    const res = await request(app).get('/api/export/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/export/saved — should export saved (auth required)', async () => {
    const res = await request(app)
      .get('/api/export/saved')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/export/saved — should reject without auth', async () => {
    const res = await request(app).get('/api/export/saved');
    expect(res.status).toBe(401);
  });

  it('GET /api/export/calculations — should export calcs', async () => {
    const res = await request(app)
      .get('/api/export/calculations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/export/all — should export all user data', async () => {
    const res = await request(app)
      .get('/api/export/all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exportedAt');
    expect(res.body).toHaveProperty('savedProducts');
    expect(res.body).toHaveProperty('calculations');
  });
});

describe('Products Routes', () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
    token = signToken({ uid: 'user1', email: 'test@test.com' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCol.get.mockResolvedValue([]);
    mockDocRef.get.mockResolvedValue(null);
  });

  it('GET /api/products — should list products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/products/:id — should return 404 for missing', async () => {
    mockDocRef.get.mockResolvedValue(null);
    const res = await request(app).get('/api/products/999');
    expect(res.status).toBe(404);
  });

  it('GET /api/products/saved — should require auth', async () => {
    const res = await request(app).get('/api/products/saved');
    expect(res.status).toBe(401);
  });

  it('GET /api/products/saved — should return saved list', async () => {
    const res = await request(app)
      .get('/api/products/saved')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/products/:id/save — should save product', async () => {
    mockDocRef.get.mockResolvedValue({ id: '1', title: 'Test' });
    mockDocRef.set.mockResolvedValue({});

    const res = await request(app)
      .post('/api/products/1/save')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/products/:id/save — should unsave product', async () => {
    mockDocRef.delete.mockResolvedValue({});
    const res = await request(app)
      .delete('/api/products/1/save')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Settings Routes', () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
    token = signToken({ uid: 'user1', email: 'test@test.com' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocRef.get.mockResolvedValue({ uid: 'user1', settings: { theme: 'dark' } });
    mockDocRef.update.mockResolvedValue({});
  });

  it('GET /api/settings — should require auth', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
  });

  it('GET /api/settings — should return settings', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('theme');
  });

  it('PATCH /api/settings — should update settings', async () => {
    mockDocRef.get
      .mockResolvedValueOnce({ uid: 'user1', settings: { theme: 'dark' } })
      .mockResolvedValueOnce({ uid: 'user1', settings: { theme: 'light' } });

    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'light' });

    expect(res.status).toBe(200);
    expect(res.body.data.theme).toBe('light');
  });

  it('PATCH /api/settings — should reject invalid theme', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'rainbow' });

    expect(res.status).toBe(400);
  });

  it('POST /api/settings/reset — should reset to defaults', async () => {
    mockDocRef.get
      .mockResolvedValueOnce({ uid: 'user1', settings: { theme: 'light' } })
      .mockResolvedValueOnce({ uid: 'user1', settings: { theme: 'dark', currency: 'USD', defaultPlatform: 'all', notifications: true } });

    const res = await request(app)
      .post('/api/settings/reset')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.theme).toBe('dark');
  });
});

describe('Calculator Routes (full coverage)', () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
    token = signToken({ uid: 'user1', email: 'test@test.com' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCol.add.mockResolvedValue({ id: 'calc-1' });
    mockCol.get.mockResolvedValue([]);
  });

  it('POST /api/calculator/calculate — should calc and save (authed)', async () => {
    const res = await request(app)
      .post('/api/calculator/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send({ sellPrice: 29.99, cost: 5.99, shipping: 2, platformFeePercent: 15, adSpend: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('profit');
    expect(res.body.data).toHaveProperty('margin');
    expect(res.body.data).toHaveProperty('roi');
  });

  it('POST /api/calculator/calculate — should calc without auth (anonymous)', async () => {
    const res = await request(app)
      .post('/api/calculator/calculate')
      .send({ sellPrice: 49.99, cost: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.profit).toBeDefined();
  });

  it('POST /api/calculator/calculate — should reject sellPrice 0', async () => {
    const res = await request(app)
      .post('/api/calculator/calculate')
      .send({ sellPrice: 0, cost: 5 });

    expect(res.status).toBe(422);
  });

  it('POST /api/calculator/calculate — should reject negative cost', async () => {
    const res = await request(app)
      .post('/api/calculator/calculate')
      .send({ sellPrice: 20, cost: -5 });

    expect(res.status).toBe(422);
  });

  it('GET /api/calculator/history — should return history', async () => {
    const res = await request(app)
      .get('/api/calculator/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/calculator/history — should require auth', async () => {
    const res = await request(app).get('/api/calculator/history');
    expect(res.status).toBe(401);
  });

  it('DELETE /api/calculator/:id — should delete calc', async () => {
    mockDocRef.get.mockResolvedValue({ id: 'calc-1', uid: 'user1' });
    mockDocRef.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/calculator/calc-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('DELETE /api/calculator/:id — should reject if not owner', async () => {
    mockDocRef.get.mockResolvedValue({ id: 'calc-1', uid: 'other-user' });

    const res = await request(app)
      .delete('/api/calculator/calc-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
