// ============================================================================
// TESTS: plugins/ai-context-builder.js — Gathers full app state for AI
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, createSampleProduct } from '../setup.js';

describe('ai-context-builder plugin', () => {
  let HuntDrop;
  let ctx;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/ai-context-builder.js']));
    ctx = HuntDrop.AIContextBuilder;
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(HuntDrop.PluginRegistry.get('ai-context-builder')).toBeDefined();
    });

    it('should expose AIContextBuilder on HuntDrop', () => {
      expect(ctx).toBeDefined();
      expect(ctx.id).toBe('ai-context-builder');
    });
  });

  describe('buildFullContext()', () => {
    it('should return context object with all sections', () => {
      const context = ctx.buildFullContext();
      expect(context.products).toBeDefined();
      expect(context.userState).toBeDefined();
      expect(context.toolStates).toBeDefined();
      expect(context.systemHealth).toBeDefined();
      expect(context.conversation).toBeDefined();
      expect(context.searchContext).toBeDefined();
    });
  });

  describe('getProducts()', () => {
    it('should return mapped product data', () => {
      const products = ctx.getProducts();
      expect(Array.isArray(products)).toBe(true);
      if (products.length > 0) {
        const p = products[0];
        expect(p.id).toBeDefined();
        expect(p.title).toBeDefined();
        expect(p.platform).toBeDefined();
        expect(p.price).toBeDefined();
        expect(p.suppliers).toBeDefined();
        // Should not include image (not in mapping)
        expect(p.image).toBeUndefined();
      }
    });

    it('should map supplier data correctly', () => {
      const products = ctx.getProducts();
      if (products.length > 0 && products[0].suppliers.length > 0) {
        const s = products[0].suppliers[0];
        expect(s.name).toBeDefined();
        expect(s.location).toBeDefined();
        expect(s.rating).toBeDefined();
        expect(s.verified).toBeDefined();
      }
    });

    it('should handle empty ALL_PRODUCTS', () => {
      HuntDrop.ALL_PRODUCTS = [];
      const products = ctx.getProducts();
      expect(products).toEqual([]);
    });
  });

  describe('getUserState()', () => {
    it('should return user state with defaults', () => {
      const state = ctx.getUserState();
      expect(state.currentPage).toBe('dashboard');
      expect(state.viewedProducts).toEqual([]);
      expect(state.budget).toBeNull();
      expect(state.experienceLevel).toBe('beginner');
      expect(state.goals).toEqual([]);
      expect(state.lastActivity).toBeNull();
    });

    it('should reflect config changes', () => {
      HuntDrop.Config.defaults('app', { currentSection: 'section-profit-lab' });
      HuntDrop.Config.defaults('user', { budget: 5000, experience: 'expert' });
      const state = ctx.getUserState();
      expect(state.currentPage).toBe('section-profit-lab');
      expect(state.budget).toBe(5000);
      expect(state.experienceLevel).toBe('expert');
    });
  });

  describe('getToolStates()', () => {
    it('should return tool states object', () => {
      const states = ctx.getToolStates();
      expect(states.profitCalculator).toBeDefined();
      expect(states.adBudget).toBeDefined();
      expect(states.storeHealth).toBeDefined();
      expect(states.searchEngine).toBeDefined();
    });

    it('should have default values', () => {
      const states = ctx.getToolStates();
      expect(states.profitCalculator.lastCalculation).toBeNull();
      expect(states.adBudget.lastAllocation).toBeNull();
      expect(states.adBudget.totalBudget).toBe(0);
      expect(states.storeHealth.lastScore).toBeNull();
      expect(states.storeHealth.alerts).toEqual([]);
      expect(states.searchEngine.lastQuery).toBeNull();
      expect(states.searchEngine.lastResults).toEqual([]);
    });
  });

  describe('getSystemHealth()', () => {
    it('should return health object with score', () => {
      const health = ctx.getSystemHealth();
      expect(health.score).toBeDefined();
      expect(typeof health.score).toBe('number');
      expect(health.issues).toBeDefined();
      expect(health.warnings).toBeDefined();
      expect(health.healthy).toBeDefined();
      expect(Array.isArray(health.issues)).toBe(true);
      expect(Array.isArray(health.warnings)).toBe(true);
    });

    it('should detect issues in product data', () => {
      HuntDrop.ALL_PRODUCTS = [{ ...createSampleProduct(), price: 0, suppliers: [], margin: -10 }];
      const health = ctx.getSystemHealth();
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.healthy).toBe(false);
    });

    it('should detect warnings for suspicious margins', () => {
      HuntDrop.ALL_PRODUCTS = [{ ...createSampleProduct(), margin: 90 }];
      const health = ctx.getSystemHealth();
      expect(health.warnings.length).toBeGreaterThan(0);
    });

    it('should detect warnings for high risk scores', () => {
      HuntDrop.ALL_PRODUCTS = [{ ...createSampleProduct(), riskScore: 80 }];
      const health = ctx.getSystemHealth();
      expect(health.warnings.length).toBeGreaterThan(0);
    });

    it('should calculate score based on issues and warnings', () => {
      HuntDrop.ALL_PRODUCTS = [{ ...createSampleProduct(), price: 0, suppliers: [], margin: -5, riskScore: 80 }];
      const health = ctx.getSystemHealth();
      expect(health.score).toBeLessThan(100);
    });

    it('should report adapter count', () => {
      const health = ctx.getSystemHealth();
      expect(health.pluginsLoaded).toBeDefined();
    });
  });

  describe('getConversation()', () => {
    it('should return conversation with defaults', () => {
      const conv = ctx.getConversation();
      expect(conv.history).toEqual([]);
      expect(conv.topicsDiscussed).toEqual([]);
      expect(conv.messageCount).toBe(0);
    });

    it('should reflect config changes', () => {
      HuntDrop.Config.defaults('coach', {
        history: [{ role: 'user', content: 'test' }],
        topics: ['pricing', 'sourcing'],
      });
      const conv = ctx.getConversation();
      expect(conv.history.length).toBe(1);
      expect(conv.topicsDiscussed.length).toBe(2);
      expect(conv.messageCount).toBe(1);
    });
  });

  describe('getSearchContext()', () => {
    it('should return search context with defaults', () => {
      const searchCtx = ctx.getSearchContext();
      expect(searchCtx.lastQuery).toBeNull();
      expect(searchCtx.activeFilters.platform).toBe('all');
      expect(searchCtx.activeFilters.sort).toBe('score');
    });
  });

  describe('getProductsSummary()', () => {
    it('should return text summary of products', () => {
      const summary = ctx.getProductsSummary();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should include product titles', () => {
      const summary = ctx.getProductsSummary();
      if (HuntDrop.ALL_PRODUCTS.length > 0) {
        expect(summary).toContain(HuntDrop.ALL_PRODUCTS[0].title);
      }
    });

    it('should handle empty products', () => {
      HuntDrop.ALL_PRODUCTS = [];
      const summary = ctx.getProductsSummary();
      expect(summary).toBe('No products loaded.');
    });
  });

  describe('getTopProducts()', () => {
    it('should return top N products by score', () => {
      const top3 = ctx.getTopProducts(3);
      expect(top3.length).toBeLessThanOrEqual(3);
      for (let i = 1; i < top3.length; i++) {
        expect(top3[i].score).toBeLessThanOrEqual(top3[i - 1].score);
      }
    });

    it('should default to 3 when no count given', () => {
      const top = ctx.getTopProducts();
      expect(top.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getProductsByCategory()', () => {
    it('should filter products by category', () => {
      const electronics = ctx.getProductsByCategory('Electronics');
      electronics.forEach((p) => {
        expect(p.category.toLowerCase()).toContain('electronics');
      });
    });

    it('should be case-insensitive', () => {
      const results = ctx.getProductsByCategory('ELECTRONICS');
      results.forEach((p) => {
        expect(p.category.toLowerCase()).toContain('electronics');
      });
    });

    it('should return empty array for non-matching category', () => {
      const results = ctx.getProductsByCategory('NonExistentCategory');
      expect(results).toEqual([]);
    });
  });

  describe('getProductByTitle()', () => {
    it('should find product by title', () => {
      if (HuntDrop.ALL_PRODUCTS.length > 0) {
        const title = HuntDrop.ALL_PRODUCTS[0].title.split(' ')[0];
        const product = ctx.getProductByTitle(title);
        expect(product).toBeDefined();
      }
    });

    it('should find product by keyword', () => {
      if (HuntDrop.ALL_PRODUCTS.length > 0) {
        const keyword = HuntDrop.ALL_PRODUCTS[0].keywords[0];
        const product = ctx.getProductByTitle(keyword);
        expect(product).toBeDefined();
      }
    });

    it('should be case-insensitive', () => {
      if (HuntDrop.ALL_PRODUCTS.length > 0) {
        const title = HuntDrop.ALL_PRODUCTS[0].title.toUpperCase();
        const product = ctx.getProductByTitle(title);
        expect(product).toBeDefined();
      }
    });

    it('should return undefined for non-matching title', () => {
      const product = ctx.getProductByTitle('zzznonexistentproduct12345');
      expect(product).toBeUndefined();
    });
  });
});
