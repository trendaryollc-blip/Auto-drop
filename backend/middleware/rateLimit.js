/**
 * Rate Limiting Middleware
 *
 * In-memory rate limiter using sliding window counter.
 * For production, use Redis-backed rate limiting.
 */

import { TooManyRequestsError } from '../utils/errors.js';
import { createRateLimiter } from '../utils/helpers.js';

// Default rate limits per route category
const LIMITS = {
  auth: { max: 10, windowMs: 15 * 60 * 1000 },      // 10 requests per 15 min
  search: { max: 60, windowMs: 60 * 1000 },           // 60 requests per minute
  products: { max: 100, windowMs: 60 * 1000 },        // 100 requests per minute
  calculator: { max: 30, windowMs: 60 * 1000 },       // 30 requests per minute
  analytics: { max: 50, windowMs: 60 * 1000 },        // 50 requests per minute
  export: { max: 5, windowMs: 60 * 1000 },            // 5 requests per minute
  default: { max: 120, windowMs: 60 * 1000 },         // 120 requests per minute
};

// Create rate limiters for each category
const limiters = {};
for (const [category, limits] of Object.entries(LIMITS)) {
  limiters[category] = createRateLimiter(limits.max, limits.windowMs);
}

/**
 * Rate limit middleware.
 * @param {string} [category='default'] - rate limit category
 * @returns {Function} Express middleware
 */
export function rateLimit(category = 'default') {
  return (req, res, next) => {
    const key = (req.user?.uid || req.ip || 'unknown') + ':' + category;
    const limiter = limiters[category] || limiters.default;

    if (!limiter.check(key)) {
      const limits = LIMITS[category] || LIMITS.default;
      const retryAfter = Math.ceil(limits.windowMs / 1000);

      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(limits.max));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + retryAfter));

      return next(new TooManyRequestsError(`Rate limit exceeded. Try again in ${retryAfter} seconds.`));
    }

    // Add rate limit headers
    const limits = LIMITS[category] || LIMITS.default;
    res.setHeader('X-RateLimit-Limit', String(limits.max));
    res.setHeader('X-RateLimit-Remaining', String(limits.max - 1));

    next();
  };
}

export default rateLimit;
