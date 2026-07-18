/**
 * Analytics Model
 *
 * Firestore collection: "analytics_events"
 *
 * Tracks user behavior for insights (search patterns, product views, etc.)
 */

import { collection } from '../database/index.js';

const COLLECTION = 'analytics_events';
const MAX_EVENTS_PER_BATCH = 50;

export default class AnalyticsEvent {
  /**
   * Log a single event.
   * @param {string} uid
   * @param {string} eventType
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  static async track(uid, eventType, data = {}) {
    const doc = {
      uid: uid || 'anonymous',
      eventType,
      data,
      timestamp: new Date().toISOString(),
      userAgent: data.userAgent || '',
      path: data.path || '',
    };

    const { id } = await collection(COLLECTION).add(doc);
    return { id, ...doc };
  }

  /**
   * Log multiple events in batch.
   * @param {Array} events - [{ uid, eventType, data }]
   * @returns {Promise<number>} number of events logged
   */
  static async trackBatch(events) {
    let count = 0;
    const batches = [];
    for (let i = 0; i < events.length; i += MAX_EVENTS_PER_BATCH) {
      batches.push(events.slice(i, i + MAX_EVENTS_PER_BATCH));
    }

    for (const batch of batches) {
      const promises = batch.map(event =>
        this.track(event.uid, event.eventType, event.data).catch(() => null)
      );
      const results = await Promise.all(promises);
      count += results.filter(Boolean).length;
    }
    return count;
  }

  /**
   * Get events for a user.
   * @param {string} uid
   * @param {Object} options
   * @param {string} [options.eventType]
   * @param {number} [options.limit=50]
   * @param {string} [options.since] - ISO timestamp
   * @returns {Promise<Object[]>}
   */
  static async getByUser(uid, { eventType, limit = 50, since } = {}) {
    let ref = collection(COLLECTION).where('uid', '==', uid);
    if (limit) ref = ref.limit(limit);
    const docs = await ref.get();
    let results = docs.map(d => d.data());

    if (eventType) results = results.filter(e => e.eventType === eventType);
    if (since) results = results.filter(e => e.timestamp >= since);

    return results;
  }

  /**
   * Get aggregate stats for a user.
   * @param {string} uid
   * @returns {Promise<Object>}
   */
  static async getStats(uid) {
    const events = await this.getByUser(uid, { limit: 200 });
    const stats = {
      totalEvents: events.length,
      searches: events.filter(e => e.eventType === 'search').length,
      productViews: events.filter(e => e.eventType === 'product:view').length,
      saves: events.filter(e => e.eventType === 'product:save').length,
      calculations: events.filter(e => e.eventType === 'calculator:calculate').length,
      navigations: events.filter(e => e.eventType === 'navigation').length,
      lastActive: events.length > 0 ? events[0].timestamp : null,
    };
    return stats;
  }

  /**
   * Delete old events (cleanup).
   * @param {number} olderThanDays
   * @returns {Promise<void>}
   */
  static async cleanup(olderThanDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const cutoffStr = cutoff.toISOString();

    // This is a simplified cleanup — in production, use a scheduled function
    const docs = await collection(COLLECTION)
      .where('timestamp', '<', cutoffStr)
      .limit(100)
      .get();

    for (const doc of docs) {
      await collection(COLLECTION).doc(doc.id).delete();
    }
  }
}
