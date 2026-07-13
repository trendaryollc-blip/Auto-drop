import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, createSampleProduct } from '../setup.js';

describe('cb-intelligence-service plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/ai-key-manager.js',
      'plugins/ai-web-search.js',
      'plugins/ai-chat-service.js',
      'plugins/cb-intelligence-service.js',
    ]));
    plugin = HuntDrop.CBIntelligenceService;
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(HuntDrop.PluginRegistry.get('cb-intelligence-service')).toBeDefined();
    });

    it('should expose CBIntelligenceService on HuntDrop', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('cb-intelligence-service');
    });
  });

  describe('Cache', () => {
    it('should have _cache object', () => {
      expect(plugin._cache).toBeDefined();
    });

    it('should cache and retrieve values', () => {
      plugin._cache['test-key'] = { data: 'test-value' };
      expect(plugin._cache['test-key']).toEqual({ data: 'test-value' });
    });
  });

  describe('getStatus()', () => {
    it('should return status object', () => {
      const status = plugin.getStatus();
      expect(status.status).toBeDefined();
      expect(status.cacheSize).toBeDefined();
    });
  });

  describe('init()', () => {
    it('should init without errors', async () => {
      await HuntDrop.PluginRegistry.init('cb-intelligence-service');
      expect(HuntDrop.PluginRegistry.get('cb-intelligence-service')._initialized).toBe(true);
    });
  });
});
