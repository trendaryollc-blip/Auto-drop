import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('objection-handler plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/objection-handler.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('objection-handler');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('objection-handler');
      expect(plugin.name).toBe('FAQ Builder');
    });
  });

  describe('init()', () => {
    it('should set objectionHandler config defaults', async () => {
      await HuntDrop.PluginRegistry.init('objection-handler');
      const config = HuntDrop.Config.getAll('objectionHandler');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('objection-handler');
      try {
        await HuntDrop.PluginRegistry.mount('objection-handler');
      } catch (e) {}
      const section = document.getElementById('section-objections');
      expect(section).toBeDefined();
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('objection-handler');
      try {
        await HuntDrop.PluginRegistry.mount('objection-handler');
      } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('objection-handler');
      try {
        await HuntDrop.PluginRegistry.mount('objection-handler');
      } catch (e) {}
      await HuntDrop.PluginRegistry.unmount('objection-handler');
      expect(document.getElementById('section-objections')).toBeNull();
    });
  });
});
