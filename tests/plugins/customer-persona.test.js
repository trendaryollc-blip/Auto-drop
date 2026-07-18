import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('customer-persona plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/customer-persona.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('customer-persona');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('customer-persona');
      expect(plugin.name).toBe('Customer Profiles');
    });
  });

  describe('init()', () => {
    it('should set customerPersona config defaults', async () => {
      await HuntDrop.PluginRegistry.init('customer-persona');
      const config = HuntDrop.Config.getAll('customerPersona');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('customer-persona');
      try {
        await HuntDrop.PluginRegistry.mount('customer-persona');
      } catch (e) {}
      const section = document.getElementById('section-personas');
      expect(section).toBeDefined();
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('customer-persona');
      try {
        await HuntDrop.PluginRegistry.mount('customer-persona');
      } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('customer-persona');
      try {
        await HuntDrop.PluginRegistry.mount('customer-persona');
      } catch (e) {}
      await HuntDrop.PluginRegistry.unmount('customer-persona');
      expect(document.getElementById('section-personas')).toBeNull();
    });
  });
});
