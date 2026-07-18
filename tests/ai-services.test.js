// ============================================================================
// TESTS: AI Services — Key Manager, Context Builder, Risk Analyzer
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from './setup.js';

describe('AI Key Manager — Encryption Roundtrip', () => {
  let HuntDrop;
  let km;

  beforeEach(async () => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/ai-key-manager.js']));
    km = HuntDrop.APIKeyManager;
    await HuntDrop.PluginRegistry.init('ai-key-manager');
    await km.waitReady();
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt back to original plaintext', async () => {
      const key = 'sk-test-key-12345678901234567890';
      await km.saveKey('openai', key);
      const retrieved = await km.getKey('openai');
      expect(retrieved).toBe(key);
    });

    it('should encrypt different keys to different ciphertexts', async () => {
      await km.saveKey('provider1', 'key-aaa');
      await km.saveKey('provider2', 'key-bbb');
      const keys = HuntDrop.Config.get('aiKeys.keys');
      // Encrypted values should be different
      expect(keys.provider1).not.toBe(keys.provider2);
    });

    it('should handle empty string key', async () => {
      await km.saveKey('emptytest', '');
      const retrieved = await km.getKey('emptytest');
      // getKey returns null for empty/falsy decrypted values
      expect(retrieved).toBeNull();
    });

    it('should handle very long key', async () => {
      const longKey = 'sk-' + 'a'.repeat(500);
      await km.saveKey('longtest', longKey);
      const retrieved = await km.getKey('longtest');
      expect(retrieved).toBe(longKey);
    });

    it('should handle special characters in key', async () => {
      const specialKey = 'sk-test!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      await km.saveKey('specialtest', specialKey);
      const retrieved = await km.getKey('specialtest');
      expect(retrieved).toBe(specialKey);
    });

    it('should handle unicode in key', async () => {
      const unicodeKey = 'sk-日本語テスト🔑';
      await km.saveKey('unicodetest', unicodeKey);
      const retrieved = await km.getKey('unicodetest');
      expect(retrieved).toBe(unicodeKey);
    });
  });

  describe('removeKey()', () => {
    it('should remove key and getKey returns null', async () => {
      await km.saveKey('removetest', 'key123');
      expect(await km.getKey('removetest')).toBe('key123');
      km.removeKey('removetest');
      expect(await km.getKey('removetest')).toBeNull();
    });
  });

  describe('hasKey()', () => {
    it('should return true after saveKey, false after removeKey', async () => {
      await km.saveKey('haskeytest', 'key');
      expect(km.hasKey('haskeytest')).toBe(true);
      km.removeKey('haskeytest');
      expect(km.hasKey('haskeytest')).toBe(false);
    });
  });

  describe('setProvider() / getProvider()', () => {
    it('should switch provider and auto-update model', async () => {
      km.setProvider('openai');
      expect(km.getProvider()).toBe('openai');
      expect(km.getModel()).toBe(km.providers.openai.models[0]);
    });

    it('should set model independently', async () => {
      km.setProvider('groq');
      km.setModel('llama3-8b-8192');
      expect(km.getModel()).toBe('llama3-8b-8192');
    });
  });

  describe('getHeaders()', () => {
    it('should return correct headers for each provider', () => {
      const openaiHeaders = km.getHeaders('openai', 'sk-test');
      expect(openaiHeaders['Authorization']).toBe('Bearer sk-test');

      const anthropicHeaders = km.getHeaders('anthropic', 'sk-ant-test');
      expect(anthropicHeaders['x-api-key']).toBe('sk-ant-test');
      expect(anthropicHeaders['anthropic-version']).toBe('2023-06-01');

      const googleHeaders = km.getHeaders('google', 'AI-test');
      expect(googleHeaders['Content-Type']).toBe('application/json');
    });
  });

  describe('getSecurityNotice()', () => {
    it('should return security notice object', () => {
      const notice = km.getSecurityNotice();
      expect(notice.level).toBe('warning');
      expect(notice.title).toBeDefined();
      expect(notice.message).toBeDefined();
      expect(notice.recommendation).toBeDefined();
    });
  });

  describe('getStatus()', () => {
    it('should report correct connection status', async () => {
      km.setProvider('groq');
      expect(km.getStatus().connected).toBe(false);
      await km.saveKey('groq', 'gsk-test');
      expect(km.getStatus().connected).toBe(true);
      expect(km.getStatus().provider).toBe('groq');
      expect(km.getStatus().providerName).toContain('Groq');
    });
  });
});

describe('AI Risk Analyzer — Numerical Accuracy', () => {
  let HuntDrop;
  let analyzer;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/ai-risk-analyzer.js']));
    analyzer = HuntDrop.AIRiskAnalyzer;
  });

  describe('calculateProfit() — exact values', () => {
    it('should match hand-calculated profit', () => {
      const p = createSampleProduct({
        price: 15.0,
        platformPrices: { amazon: 45.0 },
        adSpendAvg: 6.0,
      });
      // profit = 45 - 15 - 2.50 - 6 = 21.50
      expect(analyzer.calculateProfit(p)).toBe(21.5);
    });

    it('should default adSpendAvg to 3 when 0', () => {
      const p = createSampleProduct({
        price: 10,
        platformPrices: { amazon: 30 },
        adSpendAvg: 0,
      });
      // profit = 30 - 10 - 2.50 - 3 = 14.50
      expect(analyzer.calculateProfit(p)).toBeCloseTo(14.5, 1);
    });
  });

  describe('calculateBreakEven() — formula verification', () => {
    it('should match hand-calculated break-even', () => {
      const p = createSampleProduct({
        price: 10,
        platformPrices: { amazon: 30 },
        adSpendAvg: 3,
      });
      // profit = 30 - 10 - 2.50 - 3 = 14.50
      // breakEven = ceil(50 / 14.50) = 4
      expect(analyzer.calculateBreakEven(p)).toBe(4);
    });

    it('should return Infinity for zero profit', () => {
      const p = createSampleProduct({
        price: 20,
        platformPrices: { amazon: 22.5 },
        adSpendAvg: 0,
      });
      // profit = 22.50 - 20 - 2.50 - 3 = -3
      expect(analyzer.calculateBreakEven(p)).toBe(Infinity);
    });
  });

  describe('calculateTrend() — edge cases', () => {
    it('should handle all-zero trend data', () => {
      expect(analyzer.calculateTrend([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(0);
    });

    it('should handle exactly 6 data points (minimum)', () => {
      expect(analyzer.calculateTrend([1, 2, 3, 4, 5, 6])).not.toBeNaN();
    });

    it('should handle negative trend data', () => {
      const trend = [-10, -20, -30, -40, -50, -60, -70, -80, -90, -100, -110, -120];
      // recent avg (-110) vs early avg (-20) => negative trend
      const result = analyzer.calculateTrend(trend);
      expect(typeof result).toBe('number');
    });
  });

  describe('analyzeDecision() — multi-option comparison', () => {
    it('should sort options by score descending', () => {
      const options = [
        { name: 'Bad', score: 30, margin: 10, competition: 'high', riskScore: 80, demand: 20 },
        { name: 'Good', score: 90, margin: 70, competition: 'low', riskScore: 10, demand: 90 },
        { name: 'Medium', score: 60, margin: 40, competition: 'medium', riskScore: 40, demand: 60 },
      ];
      const results = analyzer.analyzeDecision(options);
      expect(results[0].option).toBe('Good');
      expect(results[1].option).toBe('Medium');
      expect(results[2].option).toBe('Bad');
    });

    it('should return empty array for empty input', () => {
      expect(analyzer.analyzeDecision([])).toEqual([]);
      expect(analyzer.analyzeDecision(null)).toEqual([]);
    });

    it('should assign Best Choice / Viable / Risky correctly', () => {
      const options = [
        { name: 'A', score: 90, margin: 70, competition: 'low', riskScore: 10, demand: 90 },
        { name: 'B', score: 50, margin: 30, competition: 'medium', riskScore: 40, demand: 50 },
        { name: 'C', score: 20, margin: 10, competition: 'high', riskScore: 80, demand: 20 },
      ];
      const results = analyzer.analyzeDecision(options);
      expect(results[0].recommendation).toBe('Best Choice');
      expect(results[2].recommendation).toBe('Risky');
    });
  });

  describe('formatAnalysisForAI() — output format', () => {
    it('should format analysis as readable text', () => {
      const analysis = analyzer.analyzeProduct(
        createSampleProduct({
          score: 85,
          margin: 60,
          competition: 'low',
          riskScore: 20,
          demand: 80,
          marketSaturation: 30,
          trendData: [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320],
          suppliers: [{ name: 'S1', verified: true }],
        })
      );
      const formatted = analyzer.formatAnalysisForAI(analysis);
      expect(formatted).toContain('WIN PROBABILITY');
      expect(formatted).toContain('RECOMMENDATION');
      expect(formatted).toContain('PROFIT PER UNIT');
      expect(formatted).toContain('MONTHLY PROJECTIONS');
      expect(formatted).toContain('POSITIVE FACTORS');
    });

    it('should return fallback for null analysis', () => {
      expect(analyzer.formatAnalysisForAI(null)).toBe('No analysis available.');
    });
  });
});

describe('AI Context Builder — Data Accuracy', () => {
  let HuntDrop;
  let ctx;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/ai-context-builder.js']));
    ctx = HuntDrop.AIContextBuilder;
  });

  describe('getProducts()', () => {
    it('should return products with all required fields', () => {
      const products = ctx.getProducts();
      expect(products.length).toBeGreaterThan(0);
      products.forEach((p) => {
        expect(p.id).toBeDefined();
        expect(p.title).toBeDefined();
        expect(p.platform).toBeDefined();
        expect(typeof p.price).toBe('number');
        expect(typeof p.margin).toBe('number');
        expect(typeof p.score).toBe('number');
        expect(typeof p.competition).toBe('string');
        expect(typeof p.demand).toBe('number');
        expect(Array.isArray(p.keywords)).toBe(true);
        expect(Array.isArray(p.suppliers)).toBe(true);
        expect(typeof p.platformPrices).toBe('object');
        expect(Array.isArray(p.trendData)).toBe(true);
        expect(Array.isArray(p.seasonality)).toBe(true);
      });
    });
  });

  describe('getUserState()', () => {
    it('should return user state with required fields', () => {
      const state = ctx.getUserState();
      expect(state.currentPage).toBeDefined();
      expect(Array.isArray(state.viewedProducts)).toBe(true);
      expect(state.experienceLevel).toBeDefined();
    });
  });

  describe('getToolStates()', () => {
    it('should return tool states for all tools', () => {
      const states = ctx.getToolStates();
      expect(states.profitCalculator).toBeDefined();
      expect(states.adBudget).toBeDefined();
      expect(states.storeHealth).toBeDefined();
      expect(states.searchEngine).toBeDefined();
    });
  });

  describe('getProductsSummary()', () => {
    it('should return a string containing product info', () => {
      const summary = ctx.getProductsSummary();
      expect(typeof summary).toBe('string');
      expect(summary).toContain('Score');
      expect(summary).toContain('Margin');
    });
  });

  describe('getTopProducts(count)', () => {
    it('should return exactly count products', () => {
      expect(ctx.getTopProducts(1).length).toBe(1);
      expect(ctx.getTopProducts(3).length).toBe(3);
    });

    it('should be sorted by score descending', () => {
      const top = ctx.getTopProducts(5);
      for (let i = 1; i < top.length; i++) {
        expect(top[i].score).toBeLessThanOrEqual(top[i - 1].score);
      }
    });
  });

  describe('getProductsByCategory(category)', () => {
    it('should filter by partial category match', () => {
      const electronics = ctx.getProductsByCategory('electron');
      expect(electronics.length).toBeGreaterThan(0);
      electronics.forEach((p) => {
        expect(p.category.toLowerCase()).toContain('electron');
      });
    });
  });

  describe('getProductByTitle(title)', () => {
    it('should find product by partial title', () => {
      const product = ctx.getProductByTitle('earbuds');
      expect(product).toBeDefined();
    });

    it('should find product by keyword', () => {
      const product = ctx.getProductByTitle('bluetooth');
      expect(product).toBeDefined();
    });
  });
});

describe('AI Chat Service — Message Building & Fallbacks', () => {
  let HuntDrop;
  let chat;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/ai-key-manager.js',
      'plugins/ai-context-builder.js',
      'plugins/ai-system-health.js',
      'plugins/ai-web-search.js',
      'plugins/ai-chat-service.js',
    ]));
    chat = HuntDrop.AIChatService;
  });

  describe('buildSystemPrompt()', () => {
    it('should include product catalog', () => {
      const context = HuntDrop.AIContextBuilder.buildFullContext();
      const prompt = chat.buildSystemPrompt(context);
      expect(prompt).toContain('PRODUCT CATALOG');
      expect(prompt).toContain('HuntDrop AI Coach');
    });

    it('should include system health', () => {
      const context = HuntDrop.AIContextBuilder.buildFullContext();
      const prompt = chat.buildSystemPrompt(context);
      expect(prompt).toContain('SYSTEM HEALTH');
    });
  });

  describe('buildMessages()', () => {
    it('should limit history to 10 messages', () => {
      const history = Array.from({ length: 25 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `msg ${i}`,
      }));
      const msgs = chat.buildMessages('system', 'user msg', history);
      // system + 10 history + user = 12
      expect(msgs.length).toBe(12);
    });
  });

  describe('needsWebSearch()', () => {
    const triggers = ['price', 'cost', 'buy', 'amazon', 'trending', 'viral', 'competitor', '2026', 'latest', 'compare'];
    triggers.forEach((trigger) => {
      it(`should detect "${trigger}" as search trigger`, () => {
        expect(chat.needsWebSearch(`what is the ${trigger}`)).toBe(true);
      });
    });
  });

  describe('fallbackResponse() — all keyword branches', () => {
    it('should handle "should i sell"', () => {
      const resp = chat.fallbackResponse('should i sell this product');
      expect(resp).toContain('Score');
    });

    it('should handle "budget" keyword', () => {
      const resp = chat.fallbackResponse('my budget is $500');
      expect(resp).toContain('Budget');
    });

    it('should handle "ad" keyword', () => {
      const resp = chat.fallbackResponse('my ad performance');
      expect(resp).toContain('Ad');
    });

    it('should handle "today" keyword', () => {
      const resp = chat.fallbackResponse('what to do today');
      expect(resp).toContain('Action');
    });

    it('should handle "health" keyword', () => {
      const resp = chat.fallbackResponse('system health check');
      expect(resp).toContain('System Health');
    });

    it('should return default help for unrecognized', () => {
      const resp = chat.fallbackResponse('random gibberish');
      expect(resp).toContain('help you with');
    });
  });

  describe('estimateProfit()', () => {
    it('should calculate profit correctly', () => {
      const p = createSampleProduct({
        price: 10,
        platformPrices: { amazon: 30 },
        adSpendAvg: 5,
      });
      expect(chat.estimateProfit(p)).toBe(12.5);
    });

    it('should fallback to shopify when no amazon', () => {
      const p = createSampleProduct({
        price: 10,
        platformPrices: { shopify: 25 },
        adSpendAvg: 3,
      });
      expect(chat.estimateProfit(p)).toBe(9.5);
    });

    it('should use price*2 when no platform prices', () => {
      const p = createSampleProduct({
        price: 15,
        platformPrices: {},
        adSpendAvg: 3,
      });
      // price*2 = 30, profit = 30 - 15 - 2.50 - 3 = 9.50
      expect(chat.estimateProfit(p)).toBeCloseTo(9.5, 1);
    });
  });
});
