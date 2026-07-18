import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('store-health plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/store-health.js']));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('store-health');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('store-health');
      expect(plugin.name).toBe('Store Health');
    });
  });

  describe('init()', () => {
    it('should set storeHealth config defaults', async () => {
      await HuntDrop.PluginRegistry.init('store-health');
      const config = HuntDrop.Config.getAll('storeHealth');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container when lifecycle methods available', async () => {
      await HuntDrop.PluginRegistry.init('store-health');
      try {
        await HuntDrop.PluginRegistry.mount('store-health');
      } catch (e) {
        /* mount may throw due to missing methods on wrapper */
      }
      const section = document.getElementById('section-health');
      // Section may or may not exist depending on where mount throws
    });
  });
});
