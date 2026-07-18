import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validate, validateBody, validateQuery } from '../middleware/validate.js';

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
  });

  describe('validate', () => {
    it('should pass with valid data', () => {
      req.body = { name: 'John', age: 25 };
      const middleware = validate({
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail on missing required field', () => {
      req.body = {};
      const middleware = validate({
        name: { type: 'string', required: true },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(422);
      expect(err.errors[0].message).toContain('required');
    });

    it('should fail on wrong type', () => {
      req.body = { age: 'not a number' };
      const middleware = validate({
        age: { type: 'number', required: true },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors[0].message).toContain('must be a number');
    });

    it('should validate string min length', () => {
      req.body = { name: 'ab' };
      const middleware = validate({
        name: { type: 'string', min: 3 },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors[0].message).toContain('at least 3');
    });

    it('should validate string max length', () => {
      req.body = { name: 'a'.repeat(101) };
      const middleware = validate({
        name: { type: 'string', max: 100 },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors[0].message).toContain('at most 100');
    });

    it('should validate number min', () => {
      req.body = { score: -1 };
      const middleware = validate({
        score: { type: 'number', min: 0 },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors[0].message).toContain('at least 0');
    });

    it('should validate number max', () => {
      req.body = { score: 101 };
      const middleware = validate({
        score: { type: 'number', max: 100 },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors[0].message).toContain('at most 100');
    });

    it('should validate enum values', () => {
      req.body = { status: 'invalid' };
      const middleware = validate({
        status: { type: 'string', enum: ['active', 'inactive'] },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors[0].message).toContain('one of');
    });

    it('should validate with custom validator', () => {
      req.body = { email: 'not-an-email' };
      const middleware = validate({
        email: { validate: (v) => v.includes('@') ? null : 'Invalid email' },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors[0].message).toBe('Invalid email');
    });

    it('should pass optional fields when absent', () => {
      req.body = {};
      const middleware = validate({
        nickname: { type: 'string' },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should validate array type', () => {
      req.body = { tags: 'not-an-array' };
      const middleware = validate({
        tags: { type: 'array' },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors[0].message).toContain('must be an array');
    });

    it('should validate object type', () => {
      req.body = { meta: [1, 2, 3] };
      const middleware = validate({
        meta: { type: 'object' },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors[0].message).toContain('must be an object');
    });
  });

  describe('validateBody', () => {
    it('should validate req.body', () => {
      req.body = { email: 'test@test.com' };
      const middleware = validateBody({
        email: { type: 'string', required: true },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('validateQuery', () => {
    it('should convert and validate query params', () => {
      req.query = { limit: '10' };
      const middleware = validateQuery({
        limit: { type: 'number' },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.query.limit).toBe(10);
    });
  });

  describe('additional edge cases', () => {
    it('should validate boolean type', () => {
      req.body = { active: 'yes' };
      const middleware = validate({
        active: { type: 'boolean', required: true },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(422);
      expect(err.errors[0].message).toContain('must be a boolean');
    });

    it('should validate pattern (regex)', () => {
      req.body = { phone: 'abc' };
      const middleware = validate({
        phone: { type: 'string', pattern: /^\d{3}-\d{4}$/ },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors[0].message).toContain('format is invalid');
    });

    it('should pass pattern validation when valid', () => {
      req.body = { phone: '123-4567' };
      const middleware = validate({
        phone: { type: 'string', pattern: /^\d{3}-\d{4}$/ },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should collect multiple validation errors', () => {
      req.body = {};
      const middleware = validate({
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
        email: { type: 'string', required: true },
      });
      middleware(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.errors.length).toBe(3);
    });

    it('should validate empty schema (no-op)', () => {
      req.body = { anything: 'goes' };
      const middleware = validate({});
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
