import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestLogger } from '../middleware/logger.js';

// Mock config
vi.mock('../config/index.js', () => ({
  default: { isDev: true, debug: false },
}));

describe('Request Logger Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.useFakeTimers();
    req = { method: 'GET', path: '/api/test', headers: { 'user-agent': 'test-agent' }, user: { uid: 'user1' } };
    res = {
      statusCode: 200,
      end: vi.fn(function (...args) { this._ended = true; }),
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call next', () => {
    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should call original end', () => {
    requestLogger(req, res, next);
    res.end();
    expect(res._ended).toBe(true);
  });

  it('should log slow requests', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    requestLogger(req, res, next);

    // Simulate slow request (>2000ms)
    vi.advanceTimersByTime(2500);
    res.end();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should skip health check logging in non-debug mode', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    req.path = '/api/health';
    requestLogger(req, res, next);
    res.end();

    // Health checks are skipped in non-debug mode
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('should log 500-level responses as errors', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    res.statusCode = 500;
    requestLogger(req, res, next);
    res.end();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should log 400-level responses as warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    res.statusCode = 404;
    requestLogger(req, res, next);
    res.end();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should handle request without user (anonymous)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    req.user = undefined;
    requestLogger(req, res, next);
    res.end();

    expect(logSpy).toHaveBeenCalled();
    const logMessage = logSpy.mock.calls[0][0];
    expect(logMessage).not.toContain('user=');
    logSpy.mockRestore();
  });
});
