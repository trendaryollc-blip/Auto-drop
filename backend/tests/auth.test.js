import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { requireAuth, optionalAuth, signToken } from '../middleware/auth.js';

// Mock config
vi.mock('../config/index.js', () => ({
  default: {
    jwt: { secret: 'test-secret-key-for-testing', expiresIn: '7d' },
  },
}));

const TEST_SECRET = 'test-secret-key-for-testing';

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
  });

  describe('signToken', () => {
    it('should generate a valid JWT token', () => {
      const token = signToken({ uid: '123', email: 'test@test.com' });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, TEST_SECRET);
      expect(decoded.uid).toBe('123');
      expect(decoded.email).toBe('test@test.com');
    });

    it('should include expiration', () => {
      const token = signToken({ uid: '123' });
      const decoded = jwt.verify(token, TEST_SECRET);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should reject token signed with wrong secret', () => {
      const token = jwt.sign({ uid: '123' }, 'wrong-secret');
      req.headers.authorization = `Bearer ${token}`;
      requireAuth(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });

    it('should handle extra fields in payload', () => {
      const token = signToken({ uid: '123', extra: 'data', role: 'admin' });
      const decoded = jwt.verify(token, TEST_SECRET);
      expect(decoded.uid).toBe('123');
      expect(decoded.extra).toBe('data');
    });
  });

  describe('requireAuth', () => {
    it('should reject request without Authorization header', () => {
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Missing');
    });

    it('should reject request with malformed header', () => {
      req.headers.authorization = 'Bearer';
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });

    it('should reject request with empty token after Bearer', () => {
      req.headers.authorization = 'Bearer ';
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });

    it('should reject request with Bearer prefix without space', () => {
      req.headers.authorization = 'Bearertoken123';
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });

    it('should reject invalid token', () => {
      req.headers.authorization = 'Bearer invalid-token-here';
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });

    it('should accept valid token', () => {
      const token = signToken({ uid: 'user1', email: 'test@test.com' });
      req.headers.authorization = `Bearer ${token}`;
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith(); // called without error
      expect(req.user).toEqual({ uid: 'user1', email: 'test@test.com' });
    });

    it('should reject expired token', () => {
      const token = jwt.sign({ uid: '123' }, TEST_SECRET, { expiresIn: '-1s' });
      req.headers.authorization = `Bearer ${token}`;
      requireAuth(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('expired');
    });
  });

  describe('optionalAuth', () => {
    it('should pass through without Authorization header', () => {
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    it('should attach user with valid token', () => {
      const token = signToken({ uid: 'user1', email: 'test@test.com' });
      req.headers.authorization = `Bearer ${token}`;
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({ uid: 'user1', email: 'test@test.com' });
    });

    it('should pass through with invalid token (no error)', () => {
      req.headers.authorization = 'Bearer invalid';
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    it('should pass through with expired token (no error)', () => {
      const token = jwt.sign({ uid: '123' }, TEST_SECRET, { expiresIn: '-1s' });
      req.headers.authorization = `Bearer ${token}`;
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });
  });
});
