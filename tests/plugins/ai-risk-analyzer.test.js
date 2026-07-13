import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, createSampleProduct } from '../setup.js';

describe('ai-risk-analyzer plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/ai-key-manager.js',
      'plugins/ai-risk-analyzer.js',
    ]));
    plugin = HuntDrop.AIRiskAnalyzer;
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(HuntDrop.PluginRegistry.get('ai-risk-analyzer')).toBeDefined();
    });

    it('should expose AIRiskAnalyzer on HuntDrop', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('ai-risk-analyzer');
    });
  });

  describe('analyzeProduct()', () => {
    it('should return analysis object with required fields', () => {
      const product = createSampleProduct();
      const result = plugin.analyzeProduct(product);
      expect(result.product).toBeDefined();
      expect(result.winProbability).toBeDefined();
      expect(typeof result.winProbability).toBe('number');
      expect(result.recommendation).toBeDefined();
      expect(result.recColor).toBeDefined();
      expect(result.factors).toBeDefined();
      expect(result.factors.positive).toBeDefined();
      expect(result.factors.negative).toBeDefined();
      expect(result.factors.neutral).toBeDefined();
    });

    it('should calculate profit per unit', () => {
      const product = createSampleProduct({ price: 10, platformPrices: { amazon: 39.99 } });
      const result = plugin.analyzeProduct(product);
      expect(result.profitPerUnit).toBeDefined();
      expect(typeof result.profitPerUnit).toBe('number');
    });

    it('should calculate break-even units', () => {
      const product = createSampleProduct();
      const result = plugin.analyzeProduct(product);
      expect(result.breakEvenUnits).toBeDefined();
      expect(typeof result.breakEvenUnits).toBe('number');
    });

    it('should give higher win probability for high-score products', () => {
      const good = plugin.analyzeProduct(createSampleProduct({ score: 95, competition: 'low', demand: 95 }));
      const bad = plugin.analyzeProduct(createSampleProduct({ score: 30, competition: 'high', demand: 20 }));
      expect(good.winProbability).toBeGreaterThan(bad.winProbability);
    });

    it('should give PROCEED for high-score low-risk products', () => {
      const product = createSampleProduct({ score: 90, competition: 'low', riskScore: 10 });
      const result = plugin.analyzeProduct(product);
      expect(result.recommendation).toBe('PROCEED');
    });

    it('should give PROCEED WITH CAUTION for low-score high-risk products', () => {
      const product = createSampleProduct({ score: 30, competition: 'high', riskScore: 80 });
      const result = plugin.analyzeProduct(product);
      expect(result.recommendation).toBe('PROCEED WITH CAUTION');
    });

    it('should include positive factors for strong attributes', () => {
      const product = createSampleProduct({ score: 85, margin: 70, demand: 90 });
      const result = plugin.analyzeProduct(product);
      expect(result.factors.positive.length).toBeGreaterThan(0);
    });

    it('should include negative factors for weak attributes', () => {
      const product = createSampleProduct({ score: 30, margin: 5, competition: 'high' });
      const result = plugin.analyzeProduct(product);
      expect(result.factors.negative.length).toBeGreaterThan(0);
    });
  });

  describe('calculateTrend()', () => {
    it('should return percentage slope for 6+ data points', () => {
      const slope = plugin.calculateTrend([100, 200, 300, 400, 500, 600]);
      expect(typeof slope).toBe('number');
    });

    it('should return positive for upward trend', () => {
      const slope = plugin.calculateTrend([100, 200, 300, 400, 500, 600]);
      expect(slope).toBeGreaterThan(0);
    });

    it('should return negative for downward trend', () => {
      const slope = plugin.calculateTrend([600, 500, 400, 300, 200, 100]);
      expect(slope).toBeLessThan(0);
    });

    it('should return 0 for flat data', () => {
      const slope = plugin.calculateTrend([100, 100, 100, 100, 100, 100]);
      expect(slope).toBe(0);
    });

    it('should return 0 for fewer than 6 data points', () => {
      const slope = plugin.calculateTrend([100, 200, 300]);
      expect(slope).toBe(0);
    });
  });

  describe('calculateProfit()', () => {
    it('should calculate profit from prices', () => {
      const product = createSampleProduct({ price: 10, adSpendAvg: 3 });
      const profit = plugin.calculateProfit(product);
      expect(typeof profit).toBe('number');
    });
  });

  describe('calculateBreakEven()', () => {
    it('should calculate break-even units from product', () => {
      const product = createSampleProduct({ price: 10, platformPrices: { amazon: 39.99 }, adSpendAvg: 3 });
      const units = plugin.calculateBreakEven(product);
      expect(typeof units).toBe('number');
      expect(units).toBeGreaterThan(0);
    });
  });
});
