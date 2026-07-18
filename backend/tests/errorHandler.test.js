import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import { AppError, BadRequestError, NotFoundError, ValidationError, UnauthorizedError } from '../utils/errors.js';

// Mock config
vi.mock('../config/index.js', () => ({
  default: { isDev: true, debug: false },
}));

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { method: 'GET', path: '/api/test' };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it('should handle AppError with correct status', () => {
    const err = new BadRequestError('Invalid input');
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: 'Invalid input',
        }),
      })
    );
  });

  it('should handle AppError with errors array', () => {
    const err = new BadRequestError('Validation failed');
    err.errors = [{ field: 'email', message: 'required' }];
    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ errors: err.errors }),
      })
    );
  });

  it('should handle unknown errors with 500', () => {
    const err = new Error('Something broke');
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
        }),
      })
    );
  });

  it('should include stack trace in development', () => {
    const err = new Error('Dev error');
    errorHandler(err, req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.error.stack).toBeDefined();
  });

  it('should handle NotFoundError with 404', () => {
    const err = new NotFoundError('Resource not found');
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Resource not found',
        }),
      })
    );
  });

  it('should handle ValidationError with 422 and errors array', () => {
    const err = new ValidationError('Validation failed', [
      { field: 'email', message: 'Invalid format' },
    ]);
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          errors: [{ field: 'email', message: 'Invalid format' }],
        }),
      })
    );
  });

  it('should handle UnauthorizedError with 401', () => {
    const err = new UnauthorizedError('Not authenticated');
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should handle error with custom statusCode property', () => {
    const err = new Error('Request timeout');
    err.statusCode = 408;
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(408);
  });
});

describe('Not Found Handler', () => {
  it('should return 404 with route info', () => {
    const req = { method: 'POST', path: '/api/unknown' };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: expect.stringContaining('/api/unknown'),
        }),
      })
    );
  });

  it('should work for PUT method', () => {
    const req = { method: 'PUT', path: '/api/items/1' };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    notFoundHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.error.message).toContain('PUT');
  });

  it('should work for DELETE method', () => {
    const req = { method: 'DELETE', path: '/api/items/1' };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    notFoundHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.error.message).toContain('DELETE');
  });
});
