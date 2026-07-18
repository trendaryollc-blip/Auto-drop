import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins } from '../setup.js';

describe('ai-web-search plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/ai-key-manager.js',
      'plugins/ai-web-search.js',
    ]));
    plugin = HuntDrop.AIWebSearch;
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(HuntDrop.PluginRegistry.get('ai-web-search')).toBeDefined();
    });

    it('should expose AIWebSearch on HuntDrop', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('ai-web-search');
    });
  });

  describe('init()', () => {
    it('should set webSearch config defaults', async () => {
      await HuntDrop.PluginRegistry.init('ai-web-search');
      const config = HuntDrop.Config.getAll('webSearch');
      expect(config.provider).toBe('tavily');
      expect(config.key).toBe('');
    });
  });

  describe('providers', () => {
    it('should define search providers', () => {
      expect(plugin.providers).toBeDefined();
      expect(plugin.providers.tavily).toBeDefined();
      expect(plugin.providers.serper).toBeDefined();
      expect(plugin.providers.brave).toBeDefined();
    });

    it('should have correct provider configs', () => {
      expect(plugin.providers.tavily.name).toBe('Tavily');
      expect(plugin.providers.tavily.endpoint).toContain('tavily');
      expect(plugin.providers.serper.name).toBe('Serper (Google)');
      expect(plugin.providers.brave.name).toBe('Brave Search');
    });
  });

  describe('getProvider() / setProvider()', () => {
    it('should default to tavily', () => {
      expect(plugin.getProvider()).toBe('tavily');
    });

    it('should set provider', () => {
      plugin.setProvider('serper');
      expect(plugin.getProvider()).toBe('serper');
    });
  });

  describe('getKey() / setKey() / hasKey()', () => {
    it('should default to empty key', () => {
      expect(plugin.getKey()).toBe('');
    });

    it('should set key', () => {
      plugin.setKey('test-key-12345');
      expect(plugin.getKey()).toBe('test-key-12345');
    });

    it('hasKey() should return false when key is too short', () => {
      plugin.setKey('short');
      expect(plugin.hasKey()).toBe(false);
    });

    it('hasKey() should return true when key is long enough', () => {
      plugin.setKey('valid-key-123456');
      expect(plugin.hasKey()).toBe(true);
    });
  });

  describe('search()', () => {
    it('should return fallback results when no key is set', async () => {
      const results = await plugin.search('test query');
      expect(results).toBeDefined();
      expect(results.results).toBeDefined();
      expect(Array.isArray(results.results)).toBe(true);
    });

    it('should attempt API call when key is set', async () => {
      plugin.setKey('test-key-123456');
      global.fetch = vi.fn().mockRejectedValue(new Error('API error'));
      const results = await plugin.search('test query');
      expect(results).toBeDefined();
      expect(results.fallback).toBe(true);
    });
  });

  describe('fallbackSearch()', () => {
    it('should return fallback response', () => {
      const results = plugin.fallbackSearch('wireless earbuds');
      expect(results.fallback).toBe(true);
      expect(results.message).toBeDefined();
    });
  });

  describe('formatResultsForAI()', () => {
    it('should format results as text string', () => {
      const results = {
        answer: 'Test answer',
        results: [{ title: 'Result 1', url: 'https://example.com', content: 'Content 1' }],
      };
      const formatted = plugin.formatResultsForAI(results);
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('Test answer');
      expect(formatted).toContain('Result 1');
    });

    it('should handle empty results', () => {
      const formatted = plugin.formatResultsForAI({ results: [] });
      expect(typeof formatted).toBe('string');
    });
  });
});
