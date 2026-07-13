import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('store-generator plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/store-generator.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('store-generator');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('store-generator');
      expect(plugin.name).toBe('Store Builder');
    });
  });

  describe('init()', () => {
    it('should set storeGenerator config defaults', async () => {
      await HuntDrop.PluginRegistry.init('store-generator');
      const config = HuntDrop.Config.getAll('storeGenerator');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });
});
