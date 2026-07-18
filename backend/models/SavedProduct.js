/**
 * SavedProduct Model
 *
 * Firestore collection: "saved_products"
 *
 * Tracks which products a user has saved/bookmarked.
 */

import { collection } from '../database/index.js';

const COLLECTION = 'saved_products';

export default class SavedProduct {
  /**
   * Save a product for a user.
   * @param {string} uid - user ID
   * @param {Object} product - full product object (stored snapshot)
   * @returns {Promise<Object>}
   */
  static async save(uid, product) {
    const id = `${uid}_${product.id}`;
    const docRef = collection(COLLECTION).doc(id);
    const existing = await docRef.get();

    const doc = {
      id,
      uid,
      productId: String(product.id),
      title: product.title,
      image: product.image,
      platform: product.platform,
      price: product.price,
      score: product.score,
      savedAt: new Date().toISOString(),
      notes: '',
    };

    if (existing) {
      await docRef.update({ savedAt: doc.savedAt });
    } else {
      await docRef.set(doc);
    }
    return doc;
  }

  /**
   * Remove a saved product.
   * @param {string} uid
   * @param {string|number} productId
   * @returns {Promise<void>}
   */
  static async remove(uid, productId) {
    const id = `${uid}_${productId}`;
    await collection(COLLECTION).doc(id).delete();
  }

  /**
   * Check if a product is saved by a user.
   * @param {string} uid
   * @param {string|number} productId
   * @returns {Promise<boolean>}
   */
  static async isSaved(uid, productId) {
    const id = `${uid}_${productId}`;
    const doc = await collection(COLLECTION).doc(id).get();
    return doc !== null;
  }

  /**
   * Get all saved products for a user.
   * @param {string} uid
   * @returns {Promise<Object[]>}
   */
  static async getByUser(uid) {
    const docs = await collection(COLLECTION)
      .where('uid', '==', uid)
      .get();
    return docs.map(d => d.data());
  }

  /**
   * Add a note to a saved product.
   * @param {string} uid
   * @param {string|number} productId
   * @param {string} notes
   * @returns {Promise<void>}
   */
  static async updateNotes(uid, productId, notes) {
    const id = `${uid}_${productId}`;
    await collection(COLLECTION).doc(id).update({ notes });
  }

  /**
   * Count saved products for a user.
   * @param {string} uid
   * @returns {Promise<number>}
   */
  static async countByUser(uid) {
    return collection(COLLECTION)
      .where('uid', '==', uid)
      .count();
  }
}
