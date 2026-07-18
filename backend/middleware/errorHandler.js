/**
 * Global Error Handler Middleware
 *
 * Catches all unhandled errors and returns consistent JSON responses.
 * In development, includes stack traces. In production, logs only.
 */

import config from '../config/index.js';
import { AppError } from '../utils/errors.js';

/**
 * Express error handler middleware.
 * Must be registered last: app.use(errorHandler)
 */
export function errorHandler(err, req, res, _next) {
  // If it's a known operational error, use its status code
  if (err instanceof AppError) {
    const response = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.errors) response.error.errors = err.errors;
    return res.status(err.statusCode).json(response);
  }

  // Unexpected errors
  const statusCode = err.statusCode || 500;
  const message = config.isDev ? (err.message || 'Internal server error') : 'Internal server error';

  // Log the full error in all environments
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  if (config.isDev) {
    console.error(err.stack);
  }

  const response = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  };

  // Include stack trace in development only
  if (config.isDev) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 handler for undefined routes.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
}
