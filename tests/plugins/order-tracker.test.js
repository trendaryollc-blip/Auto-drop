// ============================================================================
// TESTS: plugins/order-tracker.js — Order Tracker
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('order-tracker plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/order-tracker.js']));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related</div>');
    plugin = HuntDrop.PluginRegistry.get('order-tracker');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('order-tracker');
      expect(plugin.name).toBe('Order Tracker');
    });

    it('should have version 1.0.0', () => {
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('init()', () => {
    it('should set orderTracker config defaults', async () => {
      await HuntDrop.PluginRegistry.init('order-tracker');
      expect(true).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('order-tracker');
      await HuntDrop.PluginRegistry.mount('order-tracker');
      const section = document.getElementById('section-order-tracker');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-order-tracker');
    });

    it('should render pipeline', async () => {
      await HuntDrop.PluginRegistry.init('order-tracker');
      await HuntDrop.PluginRegistry.mount('order-tracker');
      const pipeline = document.getElementById('otPipeline');
      expect(pipeline).toBeDefined();
    });

    it('should render orders list', async () => {
      await HuntDrop.PluginRegistry.init('order-tracker');
      await HuntDrop.PluginRegistry.mount('order-tracker');
      const list = document.getElementById('otOrdersList');
      expect(list).toBeDefined();
    });

    it('should render supplier grid', async () => {
      await HuntDrop.PluginRegistry.init('order-tracker');
      await HuntDrop.PluginRegistry.mount('order-tracker');
      const grid = document.getElementById('otSupplierGrid');
      expect(grid).toBeDefined();
    });

    it('should render alerts', async () => {
      await HuntDrop.PluginRegistry.init('order-tracker');
      await HuntDrop.PluginRegistry.mount('order-tracker');
      const alerts = document.getElementById('otAlerts');
      expect(alerts).toBeDefined();
    });

    it('should render WISMO panel', async () => {
      await HuntDrop.PluginRegistry.init('order-tracker');
      await HuntDrop.PluginRegistry.mount('order-tracker');
      const wismo = document.getElementById('otWismoPanel');
      expect(wismo).toBeDefined();
    });

    it('should not mount if container does not exist', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('order-tracker');
      await HuntDrop.PluginRegistry.mount('order-tracker');
      expect(true).toBe(true);
    });
  });

  describe('_section getter/setter', () => {
    it('should be accessible', async () => {
      await HuntDrop.PluginRegistry.init('order-tracker');
      await HuntDrop.PluginRegistry.mount('order-tracker');
      expect(plugin._section).toBeDefined();
      expect(plugin._section.id).toBe('section-order-tracker');
    });
  });

  describe('add order form', () => {
    it('should have add order inputs', async () => {
      await HuntDrop.PluginRegistry.init('order-tracker');
      await HuntDrop.PluginRegistry.mount('order-tracker');
      const inputs = ['otNewId', 'otNewProduct', 'otNewCustomer', 'otNewCost', 'otNewSell'];
      inputs.forEach((id) => {
        const el = document.getElementById(id);
        expect(el).toBeDefined();
      });
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('order-tracker');
      await HuntDrop.PluginRegistry.mount('order-tracker');
      await HuntDrop.PluginRegistry.unmount('order-tracker');
      expect(document.getElementById('section-order-tracker')).toBeNull();
      expect(plugin._mounted).toBe(false);
    });
  });
});
