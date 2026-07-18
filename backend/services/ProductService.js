/**
 * Product Service
 *
 * Handles product search, retrieval, and saved products.
 * Bridges the backend database with the frontend's DataLayer interface.
 */

import Product from '../models/Product.js';
import SavedProduct from '../models/SavedProduct.js';
import SearchHistory from '../models/SearchHistory.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export default class ProductService {
  /**
   * Search products with filters.
   * @param {Object} params
   * @param {string} [params.query]
   * @param {string} [params.platform]
   * @param {number} [params.priceMax]
   * @param {number} [params.minScore]
   * @param {string} [params.competition]
   * @param {number} [params.margin]
   * @param {string} [params.sort]
   * @param {number} [params.limit]
   * @param {string} [uid] - optional user ID for search history
   * @returns {Promise<{ results: Object[], total: number }>}
   */
  static async search({ query, platform, priceMax, minScore, competition, margin, sort, limit, uid }) {
    const results = await Product.search({
      query, platform, priceMax, minScore, competition, margin, sort, limit,
    });

    // Log search for authenticated users
    if (uid && query) {
      await SearchHistory.log(uid, query, { platform, sort }, results.length).catch(() => {});
    }

    return { results, total: results.length };
  }

  /**
   * Get a single product by ID.
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  static async getById(id) {
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  /**
   * Get all products.
   * @param {number} [limit=200]
   * @returns {Promise<Object[]>}
   */
  static async getAll(limit = 200) {
    return Product.getAll(limit);
  }

  /**
   * Save a product for a user.
   * @param {string} uid
   * @param {string|number} productId
   * @returns {Promise<Object>}
   */
  static async save(uid, productId) {
    const product = await Product.findById(productId);
    if (!product) throw new NotFoundError('Product not found');

    const saved = await SavedProduct.save(uid, product);
    return saved;
  }

  /**
   * Unsave a product.
   * @param {string} uid
   * @param {string|number} productId
   * @returns {Promise<void>}
   */
  static async unsave(uid, productId) {
    await SavedProduct.remove(uid, productId);
  }

  /**
   * Check if a product is saved.
   * @param {string} uid
   * @param {string|number} productId
   * @returns {Promise<boolean>}
   */
  static async isSaved(uid, productId) {
    return SavedProduct.isSaved(uid, productId);
  }

  /**
   * Get all saved products for a user.
   * @param {string} uid
   * @returns {Promise<Object[]>}
   */
  static async getSaved(uid) {
    return SavedProduct.getByUser(uid);
  }

  /**
   * Get product trends.
   * @param {string|number} id
   * @returns {Promise<number[]>}
   */
  static async getTrends(id) {
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product.trendData || [];
  }

  /**
   * Get product suppliers.
   * @param {string|number} id
   * @returns {Promise<Object[]>}
   */
  static async getSuppliers(id) {
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product.suppliers || [];
  }

  /**
   * Get platform prices for a product.
   * @param {string|number} id
   * @returns {Promise<Object>}
   */
  static async getPrices(id) {
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product.platformPrices || {};
  }
}
