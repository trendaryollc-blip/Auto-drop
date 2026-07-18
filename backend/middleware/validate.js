/**
 * Request Validation Middleware
 *
 * Validates request body, query params, and params against schemas.
 * Use as middleware: validateBody(schema), validateQuery(schema)
 */

import { ValidationError } from '../utils/errors.js';

/**
 * Define a validation schema.
 * Each field can be: { type, required, min, max, pattern, enum, custom }
 * @param {Object} fields
 * @returns {Function} middleware
 */
export function validate(fields) {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const [field, rules] of Object.entries(fields)) {
      const value = body[field];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      // Skip further checks if value is absent and not required
      if (value === undefined || value === null) continue;

      // Type check
      if (rules.type) {
        switch (rules.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push({ field, message: `${field} must be a string` });
              continue;
            }
            break;
          case 'number':
            if (typeof value !== 'number' || Number.isNaN(value)) {
              errors.push({ field, message: `${field} must be a number` });
              continue;
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push({ field, message: `${field} must be a boolean` });
              continue;
            }
            break;
          case 'array':
            if (!Array.isArray(value)) {
              errors.push({ field, message: `${field} must be an array` });
              continue;
            }
            break;
          case 'object':
            if (typeof value !== 'object' || Array.isArray(value)) {
              errors.push({ field, message: `${field} must be an object` });
              continue;
            }
            break;
        }
      }

      // Min/max for strings and arrays
      if (rules.min !== undefined && typeof value === 'string' && value.length < rules.min) {
        errors.push({ field, message: `${field} must be at least ${rules.min} characters` });
      }
      if (rules.max !== undefined && typeof value === 'string' && value.length > rules.max) {
        errors.push({ field, message: `${field} must be at most ${rules.max} characters` });
      }

      // Min/max for numbers
      if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        errors.push({ field, message: `${field} must be at least ${rules.min}` });
      }
      if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
        errors.push({ field, message: `${field} must be at most ${rules.max}` });
      }

      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
      }

      // Pattern check
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push({ field, message: `${field} format is invalid` });
      }

      // Custom validator
      if (rules.validate && typeof rules.validate === 'function') {
        const customError = rules.validate(value);
        if (customError) {
          errors.push({ field, message: customError });
        }
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
}

/**
 * Validate request body against a schema.
 * @param {Object} fields - schema definition
 */
export function validateBody(fields) {
  return (req, res, next) => {
    req.body = req.body || {};
    validate(fields)(req, res, next);
  };
}

/**
 * Validate request query params against a schema.
 * Converts string query params to appropriate types.
 * @param {Object} fields - schema definition
 */
export function validateQuery(fields) {
  return (req, res, next) => {
    // Convert query strings to appropriate types
    for (const [field, rules] of Object.entries(fields)) {
      if (req.query[field] !== undefined && rules.type === 'number') {
        req.query[field] = Number(req.query[field]);
      }
    }
    req.body = req.query; // Reuse validation logic
    validate(fields)(req, res, next);
  };
}
