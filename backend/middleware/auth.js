/**
 * Authentication Middleware
 *
 * Verifies JWT tokens from Authorization header.
 * Attaches req.user = { uid, email } on success.
 */

import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Require valid JWT token.
 * Use as: router.get('/path', requireAuth, handler)
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired'));
    }
    return next(new UnauthorizedError('Invalid token'));
  }
}

/**
 * Optional auth — attaches req.user if valid token present, but doesn't block.
 * Use for routes that behave differently for authenticated vs anonymous users.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = { uid: decoded.uid, email: decoded.email };
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
}

/**
 * Generate a JWT token.
 * @param {Object} payload - { uid, email }
 * @returns {string} JWT token
 */
export function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}
