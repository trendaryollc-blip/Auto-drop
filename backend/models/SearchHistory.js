/**
 * SearchHistory Model
 *
 * Firestore collection: "search_history"
 *
 * Tracks user search queries for analytics and recent search suggestions.
 */

import { collection } from '../database/index.js';

const COLLECTION = 'search_history';
const MAX_PER_USER = 100;

export default class SearchHistory {
  /**
   * Log a search query.
   * @param {string} uid
   * @param {string} query
   * @param {Object} [filters]
   * @param {number} [resultCount]
   * @returns {Promise<Object>}
   */
  static async log(uid, query, filters = {}, resultCount = 0) {
    if (!query || !query.trim()) return null;

    const doc = {
      uid,
      query: query.trim(),
      filters,
      resultCount,
      searchedAt: new Date().toISOString(),
    };

    const { id } = await collection(COLLECTION).add(doc);

    // Trim old entries if over limit
    await this._trimOld(uid);

    return { id, ...doc };
  }

  /**
   * Get recent searches for a user.
   * @param {string} uid
   * @param {number} [limit=8]
   * @returns {Promise<Object[]>}
   */
  static async getRecent(uid, limit = 8) {
    const docs = await collection(COLLECTION)
      .where('uid', '==', uid)
      .limit(limit)
      .get();
    return docs.map(d => d.data());
  }

  /**
   * Delete a specific search entry.
   * @param {string} id
   * @returns {Promise<void>}
   */
  static async delete(id) {
    await collection(COLLECTION).doc(id).delete();
  }

  /**
   * Clear all search history for a user.
   * @param {string} uid
   * @returns {Promise<void>}
   */
  static async clearAll(uid) {
    const docs = await collection(COLLECTION)
      .where('uid', '==', uid)
      .get();
    for (const doc of docs) {
      await collection(COLLECTION).doc(doc.id).delete();
    }
  }

  /**
   * Keep only the most recent entries per user.
   * @private
   */
  static async _trimOld(uid) {
    const docs = await collection(COLLECTION)
      .where('uid', '==', uid)
      .limit(MAX_PER_USER + 10)
      .get();
    if (docs.length > MAX_PER_USER) {
      const toDelete = docs.slice(MAX_PER_USER);
      for (const doc of toDelete) {
        await collection(COLLECTION).doc(doc.id).delete();
      }
    }
  }
}
