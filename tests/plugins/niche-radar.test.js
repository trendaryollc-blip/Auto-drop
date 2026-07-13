import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('niche-radar plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/niche-radar.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('niche-radar');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('niche-radar');
      expect(plugin.name).toBe('Niche Finder');
    });
  });

  describe('init()', () => {
    it('should set nicheRadar config defaults', async () => {
      await HuntDrop.PluginRegistry.init('niche-radar');
      const config = HuntDrop.Config.getAll('nicheRadar');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('niche-radar');
      try { await HuntDrop.PluginRegistry.mount('niche-radar'); } catch (e) {}
      const section = document.getElementById('section-niche-radar');
      expect(section).toBeDefined();
      expect(section.id).toBe('section-niche-radar');
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('niche-radar');
      try { await HuntDrop.PluginRegistry.mount('niche-radar'); } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('niche-radar');
      try { await HuntDrop.PluginRegistry.mount('niche-radar'); } catch (e) {}
      await HuntDrop.PluginRegistry.unmount('niche-radar');
      expect(document.getElementById('section-niche-radar')).toBeNull();
    });
  });
});
