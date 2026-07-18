import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, createSampleProduct } from '../setup.js';

describe('ai-chat-service plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/ai-key-manager.js',
      'plugins/ai-context-builder.js',
      'plugins/ai-system-health.js',
      'plugins/ai-web-search.js',
      'plugins/ai-chat-service.js',
    ]));
    plugin = HuntDrop.AIChatService;
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(HuntDrop.PluginRegistry.get('ai-chat-service')).toBeDefined();
    });

    it('should expose AIChatService on HuntDrop', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('ai-chat-service');
    });
  });

  describe('fallbackResponse()', () => {
    it('should return product recommendation for sell queries', () => {
      const response = plugin.fallbackResponse('what should I sell?');
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should return budget advice for budget queries', () => {
      const response = plugin.fallbackResponse('how to budget my money');
      expect(response).toContain('Budget');
    });

    it('should return ad advice for ad queries', () => {
      const response = plugin.fallbackResponse('my ad is not converting');
      expect(response).toContain('Ad');
    });

    it('should return action plan for today queries', () => {
      const response = plugin.fallbackResponse('plan for my day');
      expect(response).toContain('Action');
    });

    it('should return health info for system queries', () => {
      const response = plugin.fallbackResponse('system health check');
      expect(response).toContain('System Health');
    });

    it('should return general help for unknown queries', () => {
      const response = plugin.fallbackResponse('hello');
      expect(response).toContain('help');
    });
  });

  describe('needsWebSearch()', () => {
    it('should return true for price-related queries', () => {
      expect(plugin.needsWebSearch('what is the price')).toBe(true);
    });

    it('should return true for competitor queries', () => {
      expect(plugin.needsWebSearch('find competitor stores')).toBe(true);
    });

    it('should return true for trending queries', () => {
      expect(plugin.needsWebSearch('what is trending now')).toBe(true);
    });

    it('should return false for unrelated queries', () => {
      expect(plugin.needsWebSearch('hello how are you')).toBe(false);
    });
  });

  describe('estimateProfit()', () => {
    it('should estimate profit from product data', () => {
      const product = createSampleProduct({ price: 10, platformPrices: { amazon: 39.99 } });
      const profit = plugin.estimateProfit(product);
      expect(typeof profit).toBe('number');
      expect(profit).toBeGreaterThan(0);
    });

    it('should return 0 for product without platformPrices', () => {
      const profit = plugin.estimateProfit({ price: 10 });
      expect(profit).toBe(0);
    });
  });

  describe('buildSystemPrompt()', () => {
    it('should build system prompt from context', () => {
      const context = {
        userState: { currentPage: 'dashboard', experienceLevel: 'beginner' },
        products: [],
        toolStates: { profitCalculator: {}, adBudget: {}, storeHealth: {}, searchEngine: {} },
        systemHealth: { score: 85, issues: [], warnings: [] },
      };
      const prompt = plugin.buildSystemPrompt(context);
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('HuntDrop AI Coach');
    });
  });

  describe('buildMessages()', () => {
    it('should build message array with system prompt', () => {
      const messages = plugin.buildMessages('system prompt', 'user message', []);
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe('system prompt');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('user message');
    });

    it('should include history messages', () => {
      const history = [{ role: 'user', content: 'previous message' }];
      const messages = plugin.buildMessages('system', 'current', history);
      expect(messages.length).toBe(3);
      expect(messages[1].role).toBe('user');
    });

    it('should limit history to last 10 messages', () => {
      const history = Array(15)
        .fill(null)
        .map((_, i) => ({ role: 'user', content: `msg ${i}` }));
      const messages = plugin.buildMessages('system', 'current', history);
      expect(messages.length).toBeLessThanOrEqual(12);
    });
  });

  describe('sendMessage()', () => {
    it('should return fallback when no API key', async () => {
      HuntDrop.APIKeyManager.setProvider('groq');
      const result = await plugin.sendMessage('test message', []);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('searchAndRespond()', () => {
    it('should return fallback when no API key', async () => {
      HuntDrop.APIKeyManager.setProvider('groq');
      const result = await plugin.searchAndRespond('test message', []);
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
    });
  });
});
