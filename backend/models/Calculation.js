/**
 * Calculation Model
 *
 * Firestore collection: "calculations"
 *
 * Stores profit calculator results for history and analytics.
 */

import { collection } from '../database/index.js';

const COLLECTION = 'calculations';

export default class Calculation {
  /**
   * Save a calculation.
   * @param {string} uid - user ID
   * @param {Object} calc
   * @param {string} [calc.productName]
   * @param {number} calc.sellPrice
   * @param {number} calc.cost
   * @param {number} calc.shipping
   * @param {number} calc.platformFee
   * @param {number} calc.adSpend
   * @param {number} calc.profit
   * @param {number} calc.margin
   * @returns {Promise<Object>}
   */
  static async create(uid, calc) {
    const doc = {
      uid,
      productName: calc.productName || 'Untitled Product',
      sellPrice: calc.sellPrice || 0,
      cost: calc.cost || 0,
      shipping: calc.shipping || 0,
      platformFee: calc.platformFee || 0,
      adSpend: calc.adSpend || 0,
      profit: calc.profit || 0,
      margin: calc.margin || 0,
      currency: calc.currency || 'USD',
      createdAt: new Date().toISOString(),
    };

    const { id } = await collection(COLLECTION).add(doc);
    return { id, ...doc };
  }

  /**
   * Get all calculations for a user.
   * @param {string} uid
   * @param {number} [limit=50]
   * @returns {Promise<Object[]>}
   */
  static async getByUser(uid, limit = 50) {
    const docs = await collection(COLLECTION)
      .where('uid', '==', uid)
      .limit(limit)
      .get();
    return docs.map(d => d.data());
  }

  /**
   * Get a single calculation by ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return collection(COLLECTION).doc(id).get();
  }

  /**
   * Delete a calculation.
   * @param {string} id
   * @returns {Promise<void>}
   */
  static async delete(id) {
    await collection(COLLECTION).doc(id).delete();
  }

  /**
   * Count calculations for a user.
   * @param {string} uid
   * @returns {Promise<number>}
   */
  static async countByUser(uid) {
    return collection(COLLECTION)
      .where('uid', '==', uid)
      .count();
  }
}
