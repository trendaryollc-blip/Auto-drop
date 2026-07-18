/**
 * User Model
 *
 * Firestore collection: "users"
 *
 * Fields:
 *   uid          — Firebase Auth UID
 *   email        — user email
 *   displayName  — display name
 *   photoURL     — avatar URL
 *   provider     — "email" | "google" | "github"
 *   settings     — { theme, defaultPlatform, currency, ... }
 *   createdAt    — ISO timestamp
 *   lastLoginAt  — ISO timestamp
 */

import { collection } from '../database/index.js';

const COLLECTION = 'users';

const DEFAULT_SETTINGS = {
  theme: 'dark',
  defaultPlatform: 'all',
  currency: 'USD',
  notifications: true,
  aiProvider: 'openai',
};

export default class User {
  /**
   * Create or update a user after authentication.
   * @param {Object} userData
   * @param {string} userData.uid
   * @param {string} userData.email
   * @param {string} [userData.displayName]
   * @param {string} [userData.photoURL]
   * @param {string} [userData.provider]
   * @returns {Promise<Object>}
   */
  static async upsert(userData) {
    const col = collection(COLLECTION);
    const docRef = col.doc(userData.uid);
    const existing = await docRef.get();

    if (existing) {
      await docRef.update({
        displayName: userData.displayName || existing.displayName,
        photoURL: userData.photoURL || existing.photoURL,
        provider: userData.provider || existing.provider,
        lastLoginAt: new Date().toISOString(),
      });
      return this.findById(userData.uid);
    }

    const newUser = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName || '',
      photoURL: userData.photoURL || '',
      provider: userData.provider || 'email',
      settings: { ...DEFAULT_SETTINGS },
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await docRef.set(newUser);
    return newUser;
  }

  /**
   * Find a user by UID.
   * @param {string} uid
   * @returns {Promise<Object|null>}
   */
  static async findById(uid) {
    const doc = await collection(COLLECTION).doc(uid).get();
    return doc || null;
  }

  /**
   * Find a user by email.
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  static async findByEmail(email) {
    const results = await collection(COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get();
    return results.length > 0 ? results[0].data() : null;
  }

  /**
   * Update user settings.
   * @param {string} uid
   * @param {Object} settings - partial settings to merge
   * @returns {Promise<Object>}
   */
  static async updateSettings(uid, settings) {
    const docRef = collection(COLLECTION).doc(uid);
    const existing = await docRef.get();
    if (!existing) throw new Error('User not found');

    const merged = { ...DEFAULT_SETTINGS, ...(existing.settings || {}), ...settings };
    await docRef.update({ settings: merged });
    return this.findById(uid);
  }

  /**
   * Get user settings.
   * @param {string} uid
   * @returns {Promise<Object>}
   */
  static async getSettings(uid) {
    const user = await this.findById(uid);
    return user ? { ...DEFAULT_SETTINGS, ...(user.settings || {}) } : DEFAULT_SETTINGS;
  }

  /**
   * Delete a user.
   * @param {string} uid
   * @returns {Promise<void>}
   */
  static async delete(uid) {
    await collection(COLLECTION).doc(uid).delete();
  }
}
