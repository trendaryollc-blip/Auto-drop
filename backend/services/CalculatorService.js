/**
 * Calculator Service
 *
 * Handles profit calculations and history.
 */

import Calculation from '../models/Calculation.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';

export default class CalculatorService {
  /**
   * Calculate profit and save to history.
   * @param {string} uid
   * @param {Object} params
   * @param {string} [params.productName]
   * @param {number} params.sellPrice
   * @param {number} params.cost
   * @param {number} [params.shipping=0]
   * @param {number} [params.platformFeePercent=15]
   * @param {number} [params.adSpend=0]
   * @returns {Promise<Object>} calculation result
   */
  static async calculate(uid, params) {
    const { productName, sellPrice, cost, shipping = 0, platformFeePercent = 15, adSpend = 0 } = params;

    if (!sellPrice || sellPrice <= 0) throw new BadRequestError('Sell price must be greater than 0');
    if (cost === undefined || cost < 0) throw new BadRequestError('Cost must be 0 or greater');

    const platformFee = sellPrice * (platformFeePercent / 100);
    const totalCost = cost + shipping + platformFee + adSpend;
    const profit = sellPrice - totalCost;
    const margin = sellPrice > 0 ? ((profit / sellPrice) * 100) : 0;

    const result = {
      productName: productName || 'Untitled Product',
      sellPrice: Number(sellPrice),
      cost: Number(cost),
      shipping: Number(shipping),
      platformFee: Math.round(platformFee * 100) / 100,
      platformFeePercent: Number(platformFeePercent),
      adSpend: Number(adSpend),
      totalCost: Math.round(totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      roi: totalCost > 0 ? Math.round((profit / totalCost) * 10000) / 100 : 0,
      breakEven: adSpend > 0 ? Math.ceil(adSpend / (profit > 0 ? profit : 1)) : 0,
      currency: 'USD',
    };

    // Save to history if user is authenticated
    if (uid) {
      const saved = await Calculation.create(uid, result);
      result.id = saved.id;
    }

    return result;
  }

  /**
   * Quick calculate without saving (for real-time preview).
   * @param {Object} params
   * @returns {Object} calculation result
   */
  static quickCalculate(params) {
    const { sellPrice = 0, cost = 0, shipping = 0, platformFeePercent = 15, adSpend = 0 } = params;

    const platformFee = sellPrice * (platformFeePercent / 100);
    const totalCost = cost + shipping + platformFee + adSpend;
    const profit = sellPrice - totalCost;
    const margin = sellPrice > 0 ? ((profit / sellPrice) * 100) : 0;

    return {
      sellPrice: Number(sellPrice),
      cost: Number(cost),
      shipping: Number(shipping),
      platformFee: Math.round(platformFee * 100) / 100,
      platformFeePercent: Number(platformFeePercent),
      adSpend: Number(adSpend),
      totalCost: Math.round(totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      roi: totalCost > 0 ? Math.round((profit / totalCost) * 10000) / 100 : 0,
    };
  }

  /**
   * Get calculation history for a user.
   * @param {string} uid
   * @param {number} [limit=50]
   * @returns {Promise<Object[]>}
   */
  static async getHistory(uid, limit = 50) {
    return Calculation.getByUser(uid, limit);
  }

  /**
   * Delete a calculation.
   * @param {string} uid
   * @param {string} calcId
   * @returns {Promise<void>}
   */
  static async delete(uid, calcId) {
    const calc = await Calculation.findById(calcId);
    if (!calc) throw new NotFoundError('Calculation not found');
    if (calc.uid !== uid) throw new ForbiddenError('Not authorized');
    await Calculation.delete(calcId);
  }
}
