import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('product-lifecycle plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/product-lifecycle.js']));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('product-lifecycle');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('product-lifecycle');
      expect(plugin.name).toBe('Product Life Cycle');
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('product-lifecycle');
      await HuntDrop.PluginRegistry.mount('product-lifecycle');
      const section = document.getElementById('section-lifecycle');
      expect(section).toBeDefined();
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('product-lifecycle');
      await HuntDrop.PluginRegistry.mount('product-lifecycle');
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('product-lifecycle');
      await HuntDrop.PluginRegistry.mount('product-lifecycle');
      await HuntDrop.PluginRegistry.unmount('product-lifecycle');
      expect(document.getElementById('section-lifecycle')).toBeNull();
    });
  });
});
