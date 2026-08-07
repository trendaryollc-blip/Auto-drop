/**
 * Product Model
 *
 * Firestore collection: "products"
 *
 * Matches the frontend product object shape.
 * Products are seeded once and queried by the search engine.
 */

import { collection } from '../database/index.js';

const COLLECTION = 'products';

export default class Product {
  /**
   * Seed a product (upsert by id).
   * @param {Object} product
   * @returns {Promise<Object>}
   */
  static async upsert(product) {
    const id = String(product.id);
    const docRef = collection(COLLECTION).doc(id);
    const existing = await docRef.get();

    const doc = {
      id,
      title: product.title || '',
      image: product.image || '',
      images: product.images || [],
      platform: product.platform || '',
      price: product.price || 0,
      originalPrice: product.originalPrice || 0,
      margin: product.margin || 0,
      score: product.score || 0,
      badges: product.badges || [],
      salesVelocity: product.salesVelocity || 0,
      competition: product.competition || 'medium',
      demand: product.demand || 0,
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      orders: product.orders || '0',
      shipFrom: product.shipFrom || '',
      category: product.category || '',
      keywords: product.keywords || [],
      suppliers: product.suppliers || [],
      platformPrices: product.platformPrices || {},
      trendData: product.trendData || [],
      seasonality: product.seasonality || [],
      audience: product.audience || { age: '', gender: '', interests: [], countries: [] },
      riskScore: product.riskScore || 0,
      marketSaturation: product.marketSaturation || 0,
      adSpendAvg: product.adSpendAvg || 0,
      cpaAvg: product.cpaAvg || 0,
      aiInsight: product.aiInsight || '',
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      await docRef.update(doc);
    } else {
      doc.createdAt = new Date().toISOString();
      await docRef.set(doc);
    }
    return doc;
  }

  /**
   * Find a product by ID.
   * @param {string|number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return collection(COLLECTION).doc(String(id)).get();
  }

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
   * @returns {Promise<Object[]>}
   */
  static async search({ query = '', platform, priceMax, minScore, competition, margin, sort, limit = 100 } = {}) {
    let ref = collection(COLLECTION);
    let results;

    // Apply simple filters at DB level where possible
    if (platform && platform !== 'all') {
      ref = ref.where('platform', '==', platform);
    }
    if (minScore) {
      ref = ref.where('score', '>=', minScore);
    }
    if (limit) {
      ref = ref.limit(limit);
    }

    const docs = await ref.get();
    results = docs.map(d => d.data());

    // Apply client-side filters that can't be indexed easily
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.keywords && p.keywords.some(k => k.toLowerCase().includes(q))) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }
    if (priceMax) results = results.filter(p => p.price <= priceMax);
    if (competition && competition !== 'all') results = results.filter(p => p.competition === competition);
    if (margin && margin !== 'all') results = results.filter(p => p.margin >= Number(margin));

    // Sort
    if (sort) {
      switch (sort) {
        case 'score': results.sort((a, b) => b.score - a.score); break;
        case 'trending': results.sort((a, b) => b.salesVelocity - a.salesVelocity); break;
        case 'profit': results.sort((a, b) => b.margin - a.margin); break;
        case 'velocity': results.sort((a, b) => b.salesVelocity - a.salesVelocity); break;
        case 'competition':
          results.sort((a, b) => {
            const order = { low: 0, medium: 1, high: 2 };
            return (order[a.competition] || 1) - (order[b.competition] || 1);
          });
          break;
        case 'price-low': results.sort((a, b) => a.price - b.price); break;
        case 'price-high': results.sort((a, b) => b.price - a.price); break;
      }
    }

    return results;
  }

  /**
   * Get all products.
   * @param {number} [limit]
   * @returns {Promise<Object[]>}
   */
  static async getAll(limit = 200) {
    const docs = await collection(COLLECTION).limit(limit).get();
    return docs.map(d => d.data());
  }

  /**
   * Delete a product.
   * @param {string|number} id
   * @returns {Promise<void>}
   */
  static async delete(id) {
    await collection(COLLECTION).doc(String(id)).delete();
  }

  /**
   * Count total products.
   * @returns {Promise<number>}
   */
  static async count() {
    return collection(COLLECTION).count();
  }
}
