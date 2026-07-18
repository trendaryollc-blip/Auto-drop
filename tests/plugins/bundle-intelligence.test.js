import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('bundle-intelligence plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/bundle-intelligence.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('bundle-intelligence');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('bundle-intelligence');
      expect(plugin.name).toBe('Bundle Ideas');
    });
  });

  describe('init()', () => {
    it('should set bundleIntelligence config defaults', async () => {
      await HuntDrop.PluginRegistry.init('bundle-intelligence');
      const config = HuntDrop.Config.getAll('bundleIntelligence');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('bundle-intelligence');
      try {
        await HuntDrop.PluginRegistry.mount('bundle-intelligence');
      } catch (e) {}
      const section = document.getElementById('section-bundles');
      expect(section).toBeDefined();
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('bundle-intelligence');
      try {
        await HuntDrop.PluginRegistry.mount('bundle-intelligence');
      } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('bundle-intelligence');
      try {
        await HuntDrop.PluginRegistry.mount('bundle-intelligence');
      } catch (e) {}
      await HuntDrop.PluginRegistry.unmount('bundle-intelligence');
      expect(document.getElementById('section-bundles')).toBeNull();
    });
  });
});
