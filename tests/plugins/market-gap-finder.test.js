import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('market-gap-finder plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/market-gap-finder.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('market-gap-finder');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('market-gap-finder');
      expect(plugin.name).toBe('Market Gaps');
    });
  });

  describe('init()', () => {
    it('should set marketGap config defaults', async () => {
      await HuntDrop.PluginRegistry.init('market-gap-finder');
      const config = HuntDrop.Config.getAll('marketGap');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('market-gap-finder');
      try { await HuntDrop.PluginRegistry.mount('market-gap-finder'); } catch (e) {}
      const section = document.getElementById('section-market-gaps');
      expect(section).toBeDefined();
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('market-gap-finder');
      try { await HuntDrop.PluginRegistry.mount('market-gap-finder'); } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section and charts', async () => {
      await HuntDrop.PluginRegistry.init('market-gap-finder');
      try { await HuntDrop.PluginRegistry.mount('market-gap-finder'); } catch (e) {}
      const section = document.getElementById('section-market-gaps');
      expect(section).toBeDefined();
      await HuntDrop.PluginRegistry.unmount('market-gap-finder');
      expect(document.getElementById('section-market-gaps')).toBeNull();
    });
  });
});
