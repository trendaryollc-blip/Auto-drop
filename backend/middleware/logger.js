/**
 * Request Logging Middleware
 *
 * Logs incoming requests with timing information.
 * In production, integrate with a structured logger (winston, pino).
 */

import config from '../config/index.js';

const SLOW_REQUEST_THRESHOLD_MS = 2000;

/**
 * Request logger middleware.
 * Logs method, path, status, and response time.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, path } = req;

  // Capture the original end to measure response time
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    // Skip health checks in non-debug mode
    if (path !== '/api/health' || config.debug) {
      const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      const prefix = `[${new Date().toISOString()}]`;
      const user = req.user?.uid ? ` user=${req.user.uid}` : '';
      logFn(`${prefix} ${method} ${path} ${status} ${duration}ms${user}`);

      // Log slow requests
      if (duration > SLOW_REQUEST_THRESHOLD_MS) {
        console.warn(`[SlowRequest] ${method} ${path} took ${duration}ms`);
      }
    }

    originalEnd.apply(res, args);
  };

  next();
}

export default requestLogger;
