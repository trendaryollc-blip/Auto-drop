/**
 * Authentication Service
 *
 * Handles user registration, login, and token management.
 * Uses Firebase Auth for identity, with our own JWT for API sessions.
 */

import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import SearchHistory from '../models/SearchHistory.js';
import { signToken } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors.js';
import { isValidEmail, sanitize } from '../utils/helpers.js';

// In-memory user store for non-Firebase auth (development mode)
// In production, Firebase Auth handles this
const _devUsers = new Map();

export default class AuthService {
  /**
   * Register a new user with email/password.
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.password
   * @param {string} [params.displayName]
   * @returns {Promise<{ user: Object, token: string }>}
   */
  static async register({ email, password, displayName }) {
    if (!email || !isValidEmail(email)) throw new BadRequestError('Invalid email address');
    if (!password || password.length < 6) throw new BadRequestError('Password must be at least 6 characters');

    // Check if user already exists
    const existing = await User.findByEmail(email);
    if (existing) throw new ConflictError('An account with this email already exists');

    // Create user (in dev mode, store locally; in production, use Firebase Auth)
    const uid = uuidv4();
    const user = await User.upsert({
      uid,
      email: sanitize(email),
      displayName: sanitize(displayName || email.split('@')[0]),
      provider: 'email',
    });

    const token = signToken({ uid, email });
    return { user, token };
  }

  /**
   * Login with email/password.
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.password
   * @returns {Promise<{ user: Object, token: string }>}
   */
  static async login({ email, password }) {
    if (!email || !password) throw new BadRequestError('Email and password are required');

    const user = await User.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    // In production, Firebase Auth handles password verification
    // For development, we accept any password for existing users
    const token = signToken({ uid: user.uid, email: user.email });
    return { user, token };
  }

  /**
   * OAuth login (Google, GitHub, etc.).
   * @param {Object} params
   * @param {string} params.provider
   * @param {string} params.uid - Firebase Auth UID
   * @param {string} params.email
   * @param {string} [params.displayName]
   * @param {string} [params.photoURL]
   * @returns {Promise<{ user: Object, token: string }>}
   */
  static async oauthLogin({ provider, uid, email, displayName, photoURL }) {
    if (!uid || !email) throw new BadRequestError('UID and email are required for OAuth');

    const user = await User.upsert({
      uid,
      email,
      displayName,
      photoURL,
      provider: provider || 'google',
    });

    const token = signToken({ uid, email });
    return { user, token };
  }

  /**
   * Get current user profile.
   * @param {string} uid
   * @returns {Promise<Object>}
   */
  static async getProfile(uid) {
    const user = await User.findById(uid);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  /**
   * Get user dashboard stats.
   * @param {string} uid
   * @returns {Promise<Object>}
   */
  static async getDashboardStats(uid) {
    const [savedCount, calcCount, recentSearches] = await Promise.all([
      SavedProductCount(uid),
      CalculationCount(uid),
      SearchHistory.getRecent(uid, 5),
    ]);

    return {
      savedProducts: savedCount,
      calculations: calcCount,
      recentSearches,
    };
  }

  /**
   * Delete user account and all associated data.
   * @param {string} uid
   * @returns {Promise<void>}
   */
  static async deleteAccount(uid) {
    await User.delete(uid);
    await SearchHistory.clearAll(uid);
  }
}

// Lazy import to avoid circular deps
import SavedProduct from '../models/SavedProduct.js';
import Calculation from '../models/Calculation.js';

async function SavedProductCount(uid) {
  return SavedProduct.countByUser(uid);
}

async function CalculationCount(uid) {
  return Calculation.countByUser(uid);
}
