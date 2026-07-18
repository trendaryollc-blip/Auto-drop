/**
 * Settings Service
 *
 * Handles user preferences and app settings.
 */

import User from '../models/User.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

const VALID_THEMES = ['dark', 'light'];
const VALID_PLATFORMS = ['all', 'aliexpress', 'amazon', 'shopify', 'ebay', 'temu', 'tiktok', 'etsy', 'cjdropshipping', 'dhgate', 'wish'];
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

export default class SettingsService {
  /**
   * Get user settings.
   * @param {string} uid
   * @returns {Promise<Object>}
   */
  static async get(uid) {
    return User.getSettings(uid);
  }

  /**
   * Update user settings (partial merge).
   * @param {string} uid
   * @param {Object} updates
   * @returns {Promise<Object>} updated settings
   */
  static async update(uid, updates) {
    // Validate allowed fields
    const allowedUpdates = {};

    if (updates.theme !== undefined) {
      if (!VALID_THEMES.includes(updates.theme)) {
        throw new BadRequestError(`Theme must be one of: ${VALID_THEMES.join(', ')}`);
      }
      allowedUpdates.theme = updates.theme;
    }

    if (updates.defaultPlatform !== undefined) {
      if (!VALID_PLATFORMS.includes(updates.defaultPlatform)) {
        throw new BadRequestError(`Platform must be one of: ${VALID_PLATFORMS.join(', ')}`);
      }
      allowedUpdates.defaultPlatform = updates.defaultPlatform;
    }

    if (updates.currency !== undefined) {
      if (!VALID_CURRENCIES.includes(updates.currency)) {
        throw new BadRequestError(`Currency must be one of: ${VALID_CURRENCIES.join(', ')}`);
      }
      allowedUpdates.currency = updates.currency;
    }

    if (updates.notifications !== undefined) {
      allowedUpdates.notifications = Boolean(updates.notifications);
    }

    if (updates.aiProvider !== undefined) {
      allowedUpdates.aiProvider = String(updates.aiProvider);
    }

    if (Object.keys(allowedUpdates).length === 0) {
      throw new BadRequestError('No valid settings to update');
    }

    const user = await User.updateSettings(uid, allowedUpdates);
    return user.settings;
  }

  /**
   * Reset settings to defaults.
   * @param {string} uid
   * @returns {Promise<Object>}
   */
  static async reset(uid) {
    const user = await User.updateSettings(uid, {
      theme: 'dark',
      defaultPlatform: 'all',
      currency: 'USD',
      notifications: true,
      aiProvider: 'openai',
    });
    return user.settings;
  }
}
