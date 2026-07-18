import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  randomString,
  sanitize,
  pick,
  omit,
  deepClone,
  isValidEmail,
  paginate,
  createRateLimiter,
} from '../utils/helpers.js';

describe('Utility Functions', () => {
  describe('randomString', () => {
    it('should generate a string of the specified length', () => {
      expect(randomString(10)).toHaveLength(10);
      expect(randomString(32)).toHaveLength(32);
      expect(randomString(1)).toHaveLength(1);
    });

    it('should contain only alphanumeric characters', () => {
      const str = randomString(100);
      expect(str).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate different strings on each call', () => {
      const a = randomString(16);
      const b = randomString(16);
      expect(a).not.toBe(b);
    });

    it('should default to length 32', () => {
      expect(randomString()).toHaveLength(32);
    });

    it('should handle length 0', () => {
      expect(randomString(0)).toBe('');
    });
  });

  describe('sanitize', () => {
    it('should remove HTML tags', () => {
      expect(sanitize('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitize('<b>bold</b>')).toBe('bold');
      expect(sanitize('<img src="x" onerror="alert(1)">')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitize('  hello  ')).toBe('hello');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitize(null)).toBe('');
      expect(sanitize(undefined)).toBe('');
      expect(sanitize(123)).toBe('');
    });

    it('should handle nested tags', () => {
      expect(sanitize('<div><span>text</span></div>')).toBe('text');
    });

    it('should handle nested malicious scripts', () => {
      expect(sanitize('<script><script>alert(1)</script></script>')).toBe('alert(1)');
    });

    it('should handle empty string', () => {
      expect(sanitize('')).toBe('');
    });
  });

  describe('pick', () => {
    it('should pick specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('should ignore missing keys', () => {
      const obj = { a: 1 };
      expect(pick(obj, ['a', 'z'])).toEqual({ a: 1 });
    });

    it('should return empty object for empty keys', () => {
      expect(pick({ a: 1 }, [])).toEqual({});
    });
  });

  describe('omit', () => {
    it('should omit specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
    });

    it('should handle missing keys gracefully', () => {
      const obj = { a: 1 };
      expect(omit(obj, ['z'])).toEqual({ a: 1 });
    });

    it('should not mutate the original object', () => {
      const obj = { a: 1, b: 2 };
      omit(obj, ['a']);
      expect(obj).toEqual({ a: 1, b: 2 });
    });
  });

  describe('deepClone', () => {
    it('should deep clone an object', () => {
      const original = { a: { b: { c: 1 } }, d: [1, 2, 3] };
      const cloned = deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.a).not.toBe(original.a);
      expect(cloned.d).not.toBe(original.d);
    });

    it('should handle dates as strings (JSON-safe)', () => {
      const obj = { date: new Date('2024-01-01') };
      const cloned = deepClone(obj);
      expect(cloned.date).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle null', () => {
      expect(deepClone(null)).toBeNull();
    });

    it('should handle primitives', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(true)).toBe(true);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
      expect(isValidEmail('a+b@c.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
    });

    it('should handle long email addresses', () => {
      const longLocal = 'a'.repeat(64);
      expect(isValidEmail(`${longLocal}@example.com`)).toBe(true);
    });

    it('should reject emails with spaces', () => {
      expect(isValidEmail('user @example.com')).toBe(false);
    });

    it('should reject emails without @ symbol', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });
  });

  describe('paginate', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should return first page', () => {
      const result = paginate(arr, 1, 3);
      expect(result.items).toEqual([1, 2, 3]);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(4);
    });

    it('should return middle page', () => {
      const result = paginate(arr, 3, 3);
      expect(result.items).toEqual([7, 8, 9]);
    });

    it('should return partial last page', () => {
      const result = paginate(arr, 4, 3);
      expect(result.items).toEqual([10]);
    });

    it('should handle empty array', () => {
      const result = paginate([], 1, 10);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle page exceeding totalPages', () => {
      const result = paginate(arr, 100, 3);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(10);
      expect(result.page).toBe(100);
    });

    it('should handle page 0 or negative', () => {
      const result = paginate(arr, 0, 3);
      expect(result.items).toEqual([]);
      expect(result.page).toBe(0);
    });
  });

  describe('createRateLimiter', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should allow requests within limit', () => {
      const limiter = createRateLimiter(3, 60000);
      expect(limiter.check('user1')).toBe(true);
      expect(limiter.check('user1')).toBe(true);
      expect(limiter.check('user1')).toBe(true);
    });

    it('should block requests over limit', () => {
      const limiter = createRateLimiter(2, 60000);
      expect(limiter.check('user1')).toBe(true);
      expect(limiter.check('user1')).toBe(true);
      expect(limiter.check('user1')).toBe(false);
    });

    it('should reset after window expires', () => {
      const limiter = createRateLimiter(2, 1000);
      expect(limiter.check('user1')).toBe(true);
      expect(limiter.check('user1')).toBe(true);
      expect(limiter.check('user1')).toBe(false);

      vi.advanceTimersByTime(1100);
      expect(limiter.check('user1')).toBe(true);
    });

    it('should track different keys separately', () => {
      const limiter = createRateLimiter(1, 60000);
      expect(limiter.check('user1')).toBe(true);
      expect(limiter.check('user2')).toBe(true);
      expect(limiter.check('user1')).toBe(false);
      expect(limiter.check('user2')).toBe(false);
    });

    it('should reset a specific key', () => {
      const limiter = createRateLimiter(1, 60000);
      expect(limiter.check('user1')).toBe(true);
      expect(limiter.check('user1')).toBe(false);
      limiter.reset('user1');
      expect(limiter.check('user1')).toBe(true);
    });
  });
});
