import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit } from '../middleware/rateLimit.js';

describe('Rate Limit Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.useFakeTimers();
    req = { ip: '127.0.0.1', user: null, headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within limit', () => {
    const middleware = rateLimit('auth');
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should set rate limit headers', () => {
    const middleware = rateLimit('auth');
    middleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
  });

  it('should block requests over limit', () => {
    const middleware = rateLimit('auth'); // 10 requests per 15 min
    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      middleware(req, res, next);
    }
    // 11th should be blocked
    next.mockClear();
    res.status.mockClear();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(429);
  });

  it('should track different IPs separately', () => {
    const middleware = rateLimit('auth');
    const req1 = { ip: '1.1.1.1', user: null, headers: {} };
    const req2 = { ip: '2.2.2.2', user: null, headers: {} };

    // Exhaust limit for req1
    for (let i = 0; i < 10; i++) {
      middleware(req1, res, next);
    }
    next.mockClear();
    // req2 should still work
    middleware(req2, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should use user uid as key when available', () => {
    req.user = { uid: 'user123' };
    const middleware = rateLimit('auth');

    // Exhaust for user123
    for (let i = 0; i < 10; i++) {
      middleware(req, res, next);
    }
    next.mockClear();

    // Same user should be blocked
    middleware(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(429);
  });

  it('should set Retry-After header when blocked', () => {
    const middleware = rateLimit('auth');
    for (let i = 0; i < 10; i++) {
      middleware(req, res, next);
    }
    next.mockClear();
    res.setHeader.mockClear();

    middleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  it('should set X-RateLimit-Remaining to 0 when blocked', () => {
    const middleware = rateLimit('auth');
    for (let i = 0; i < 10; i++) {
      middleware(req, res, next);
    }
    next.mockClear();
    res.setHeader.mockClear();

    middleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
  });

  it('should set X-RateLimit-Reset header when blocked', () => {
    const middleware = rateLimit('auth');
    for (let i = 0; i < 10; i++) {
      middleware(req, res, next);
    }
    next.mockClear();
    res.setHeader.mockClear();

    middleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
  });

  it('should use different limits for different categories', () => {
    const searchMiddleware = rateLimit('search');
    // search allows 60 per minute
    for (let i = 0; i < 60; i++) {
      searchMiddleware(req, res, next);
    }
    next.mockClear();
    // 61st should be blocked
    searchMiddleware(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(429);
  });

  it('should fall back to default for unknown category', () => {
    const middleware = rateLimit('unknown_category');
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
