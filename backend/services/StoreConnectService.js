/**
 * Store Connect service
 * Handles secure connection storage, validation, and push history.
 */

import User from '../models/User.js';
import { PlatformConnectors } from '../utils/platform-connectors.js';

export default class StoreConnectService {
  static async getConnections(uid) {
    const settings = await User.getSettings(uid);
    return settings.storeConnect || {};
  }

  static async saveConnection(uid, platform, config) {
    const normalized = this.normalizeConfig(platform, config);
    const connection = { platform, updatedAt: new Date().toISOString(), config: normalized };
    const existing = await this.getConnections(uid);
    const merged = { ...existing, [platform]: connection };
    await User.updateSettings(uid, { storeConnect: merged });
    return connection;
  }

  static async testConnection(platform, config) {
    const connector = PlatformConnectors[platform];
    if (!connector) {
      const err = new Error(`Unsupported platform: ${platform}`);
      err.status = 400;
      throw err;
    }
    return connector.test(config);
  }

  static async pushProducts(uid, platform, config, products, status = 'listed') {
    const connector = PlatformConnectors[platform];
    if (!connector) {
      const err = new Error(`Unsupported platform: ${platform}`);
      err.status = 400;
      throw err;
    }
    const payload = { products, status };
    const result = await connector.push(config, payload);
    await this.recordHistory(uid, platform, products, status, result);
    return result;
  }

  static async recordHistory(uid, platform, products, status, result) {
    const historyEntry = {
      id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      platform,
      products: products.map((p) => ({ id: p.id, title: p.title })),
      status,
      result,
      createdAt: new Date().toISOString(),
    };
    const settings = await User.getSettings(uid);
    const history = (settings.storeConnectHistory || []).slice(-49);
    await User.updateSettings(uid, { storeConnectHistory: [historyEntry, ...history] });
    return historyEntry;
  }

  static async getHistory(uid) {
    const settings = await User.getSettings(uid);
    return settings.storeConnectHistory || [];
  }

  static async clearHistory(uid) {
    await User.updateSettings(uid, { storeConnectHistory: [] });
  }

  static normalizeConfig(platform, config) {
    const connector = PlatformConnectors[platform];
    if (!connector) return config;
    return connector.normalize(config);
  }
}
