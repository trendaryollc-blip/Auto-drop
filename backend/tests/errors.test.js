import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  ServiceUnavailableError,
} from '../utils/errors.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with default values', () => {
      const err = new AppError();
      expect(err.message).toBe('Internal server error');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
      expect(err.isOperational).toBe(true);
      expect(err.name).toBe('AppError');
    });

    it('should create an error with custom values', () => {
      const err = new AppError('Custom error', 418, 'TEAPOT');
      expect(err.message).toBe('Custom error');
      expect(err.statusCode).toBe(418);
      expect(err.code).toBe('TEAPOT');
    });

    it('should be instanceof Error', () => {
      const err = new AppError();
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
    });

    it('should have a stack trace', () => {
      const err = new AppError();
      expect(err.stack).toBeDefined();
      expect(err.stack).toContain('AppError');
    });
  });

  describe('BadRequestError', () => {
    it('should have status 400', () => {
      const err = new BadRequestError();
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.message).toBe('Bad request');
    });

    it('should accept custom message', () => {
      const err = new BadRequestError('Invalid input');
      expect(err.message).toBe('Invalid input');
    });

    it('should be instanceof AppError', () => {
      expect(new BadRequestError()).toBeInstanceOf(AppError);
    });
  });

  describe('UnauthorizedError', () => {
    it('should have status 401', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    it('should have status 403', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    it('should have status 404', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    });
  });

  describe('ConflictError', () => {
    it('should have status 409', () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    });
  });

  describe('ValidationError', () => {
    it('should have status 422 and errors array', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const err = new ValidationError('Validation failed', errors);
      expect(err.statusCode).toBe(422);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.errors).toEqual(errors);
    });
  });

  describe('TooManyRequestsError', () => {
    it('should have status 429', () => {
      const err = new TooManyRequestsError();
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should have status 503', () => {
      const err = new ServiceUnavailableError();
      expect(err.statusCode).toBe(503);
      expect(err.code).toBe('SERVICE_UNAVAILABLE');
    });
  });
});
