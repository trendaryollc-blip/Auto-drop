import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('price-elasticity plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/price-elasticity.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('price-elasticity');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('price-elasticity');
      expect(plugin.name).toBe('Price Calculator');
    });
  });

  describe('init()', () => {
    it('should set elasticity config defaults', async () => {
      await HuntDrop.PluginRegistry.init('price-elasticity');
      const config = HuntDrop.Config.getAll('elasticity');
      expect(config).toBeDefined();
    });
  });
});
