import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('spy-center plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/spy-center.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('spy-center');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('spy-center');
      expect(plugin.name).toBe('Store Spy Center');
    });
  });

  describe('init()', () => {
    it('should set spyCenter config defaults', async () => {
      await HuntDrop.PluginRegistry.init('spy-center');
      const config = HuntDrop.Config.getAll('spyCenter');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });
});
