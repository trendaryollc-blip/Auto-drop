import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('supplier-hub plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/supplier-hub.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('supplier-hub');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('supplier-hub');
      expect(plugin.name).toBe('Find Suppliers');
    });
  });

  describe('init()', () => {
    it('should init without errors', async () => {
      await HuntDrop.PluginRegistry.init('supplier-hub');
      expect(HuntDrop.PluginRegistry.get('supplier-hub')._initialized).toBe(true);
    });
  });
});
