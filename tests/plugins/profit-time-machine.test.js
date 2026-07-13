import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('profit-time-machine plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/profit-time-machine.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('profit-time-machine');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('profit-time-machine');
      expect(plugin.name).toBe('Sales Forecast');
    });
  });

  describe('init()', () => {
    it('should set profitTimeMachine config defaults', async () => {
      await HuntDrop.PluginRegistry.init('profit-time-machine');
      const config = HuntDrop.Config.getAll('profitTimeMachine');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });
});
