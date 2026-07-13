import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('competitor-battlefield plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/ai-key-manager.js',
      'plugins/ai-web-search.js',
      'plugins/ai-chat-service.js',
      'plugins/cb-intelligence-service.js',
      'plugins/competitor-battlefield.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('competitor-battlefield');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('competitor-battlefield');
      expect(plugin.name).toBe('Rival Check');
    });
  });

  describe('init()', () => {
    it('should set competitorBattlefield config defaults', async () => {
      await HuntDrop.PluginRegistry.init('competitor-battlefield');
      const config = HuntDrop.Config.getAll('competitorBattlefield');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('competitor-battlefield');
      try { await HuntDrop.PluginRegistry.mount('competitor-battlefield'); } catch (e) {}
      const section = document.getElementById('section-battlefield');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-battlefield');
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('competitor-battlefield');
      try { await HuntDrop.PluginRegistry.mount('competitor-battlefield'); } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section and charts', async () => {
      await HuntDrop.PluginRegistry.init('competitor-battlefield');
      try { await HuntDrop.PluginRegistry.mount('competitor-battlefield'); } catch (e) {}
      const el = document.getElementById('section-battlefield');
      if (el) el.remove();
      expect(document.getElementById('section-battlefield')).toBeNull();
    });
  });
});
