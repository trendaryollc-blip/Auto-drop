import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';

// Mock database before any imports
const mockDocRef = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
};

// Build a chainable mock: .where().limit().get()
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

// Mock Firebase admin
vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: vi.fn(),
    credential: { cert: vi.fn(), applicationDefault: vi.fn() },
    firestore: vi.fn(() => ({
      collection: vi.fn(),
      settings: vi.fn(),
    })),
    firestore: { FieldValue: { serverTimestamp: vi.fn(() => new Date().toISOString()) } },
  },
}));

import request from 'supertest';
import authRoutes from '../routes/auth.js';
import searchRoutes from '../routes/search.js';
import calculatorRoutes from '../routes/calculator.js';
import { signToken } from '../middleware/auth.js';

// Create test app
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/calculator', calculatorRoutes);
  return app;
}

describe('API Routes', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionRef.get.mockResolvedValue([]);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      // Mock findByEmail to return null (no existing user)
      mockCollectionRef.get.mockResolvedValueOnce([]);
      // Mock upsert to return user
      mockDocRef.get.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@test.com',
          password: 'password123',
          displayName: 'Test User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid', password: 'password123' });

      expect(res.status).toBe(422);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: '123' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login existing user', async () => {
      const userData = { uid: '123', email: 'test@test.com', settings: {} };
      // findByEmail chains .where().limit().get() — mock the final .get()
      mockCollectionRef.get.mockResolvedValueOnce([{ id: '123', data: () => userData }]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject non-existent user', async () => {
      mockCollectionRef.get.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(422);
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/oauth', () => {
    it('should login with OAuth provider', async () => {
      mockDocRef.get.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/oauth')
        .send({
          provider: 'google',
          uid: 'oauth-uid-123',
          email: 'oauth@test.com',
          displayName: 'OAuth User',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
    });

    it('should reject without provider', async () => {
      const res = await request(app)
        .post('/api/auth/oauth')
        .send({ uid: 'uid', email: 'test@test.com' });

      expect(res.status).toBe(422);
    });

    it('should reject without uid', async () => {
      const res = await request(app)
        .post('/api/auth/oauth')
        .send({ provider: 'google', email: 'test@test.com' });

      expect(res.status).toBe(422);
    });

    it('should reject without email', async () => {
      const res = await request(app)
        .post('/api/auth/oauth')
        .send({ provider: 'google', uid: 'uid' });

      expect(res.status).toBe(422);
    });

    it('should reject invalid provider', async () => {
      const res = await request(app)
        .post('/api/auth/oauth')
        .send({ provider: 'twitter', uid: 'uid', email: 'test@test.com' });

      expect(res.status).toBe(422);
    });
  });

  describe('DELETE /api/auth/account', () => {
    it('should delete account with valid token', async () => {
      const token = signToken({ uid: 'user1', email: 'test@test.com' });
      mockDocRef.delete.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject without token', async () => {
      const res = await request(app).delete('/api/auth/account');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const token = signToken({ uid: '123', email: 'test@test.com' });
      const userData = { uid: '123', email: 'test@test.com', settings: {} };
      mockDocRef.get.mockResolvedValue(userData);

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('test@test.com');
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/search', () => {
    it('should search products', async () => {
      mockCollectionRef.get.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/search?q=earbuds');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should search with platform filter', async () => {
      mockCollectionRef.get.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/search?q=test&platform=amazon');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should search with priceMax filter', async () => {
      mockCollectionRef.get.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/search?priceMax=50');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should search with minScore filter', async () => {
      mockCollectionRef.get.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/search?minScore=80');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should search with sort parameter', async () => {
      mockCollectionRef.get.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/search?sort=score');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should search with all filters combined', async () => {
      mockCollectionRef.get.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/search?q=earbuds&platform=aliexpress&priceMax=30&minScore=70&sort=trending&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should work without query', async () => {
      mockCollectionRef.get.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/search');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/calculator/preview', () => {
    it('should calculate profit', async () => {
      const res = await request(app)
        .post('/api/calculator/preview')
        .send({
          sellPrice: 29.99,
          cost: 5.99,
          shipping: 2.00,
          platformFeePercent: 15,
          adSpend: 3.00,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profit).toBeDefined();
      expect(res.body.data.margin).toBeDefined();
    });

    it('should reject missing sellPrice', async () => {
      const res = await request(app)
        .post('/api/calculator/preview')
        .send({ cost: 5.99 });

      expect(res.status).toBe(422);
    });
  });
});
