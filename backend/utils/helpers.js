/**
 * Shared Utility Functions
 */

/**
 * Generate a random string of given length.
 * @param {number} length
 * @returns {string}
 */
export function randomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sanitize a string for safe use (remove HTML tags, trim).
 * @param {string} str
 * @returns {string}
 */
export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Pick specified keys from an object.
 * @param {Object} obj
 * @param {string[]} keys
 * @returns {Object}
 */
export function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

/**
 * Omit specified keys from an object.
 * @param {Object} obj
 * @param {string[]} keys
 * @returns {Object}
 */
export function omit(obj, keys) {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Deep clone a plain object (JSON-safe).
 * @param {*} obj
 * @returns {*}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Validate email format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Paginate an array.
 * @param {Array} arr
 * @param {number} page
 * @param {number} perPage
 * @returns {{ items: Array, total: number, page: number, totalPages: number }}
 */
export function paginate(arr, page = 1, perPage = 20) {
  const total = arr.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const items = arr.slice(start, start + perPage);
  return { items, total, page, totalPages };
}

/**
 * Simple rate limiter (in-memory, per IP).
 * Returns middleware-compatible check function.
 * @param {number} maxRequests
 * @param {number} windowMs
 * @returns {{ check: Function, reset: Function }}
 */
export function createRateLimiter(maxRequests = 100, windowMs = 60000) {
  const hits = new Map();

  // Clean up old entries periodically
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs);
  if (cleanup.unref) cleanup.unref();

  return {
    check(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || now - entry.start > windowMs) {
        hits.set(key, { count: 1, start: now });
        return true;
      }
      entry.count++;
      return entry.count <= maxRequests;
    },
    reset(key) {
      hits.delete(key);
    },
  };
}
