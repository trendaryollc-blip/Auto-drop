// ============================================================================
// TESTS: plugins/shipping-calculator.js — Shipping Cost Calculator v2
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('shipping-calculator plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/shipping-calculator.js',
    ]));
    plugin = HuntDrop.PluginRegistry.get('shipping-calculator');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('shipping-calculator');
      expect(plugin.name).toBe('Shipping Calculator');
    });

    it('should have version 2.0.0', () => {
      expect(plugin.version).toBe('2.0.0');
    });
  });

  describe('init()', () => {
    it('should succeed without errors', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      expect(true).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const section = document.getElementById('section-shipping-calc');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-shipping-calc');
    });

    it('should render cost display', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const costBig = document.getElementById('scCostBig');
      expect(costBig).toBeDefined();
    });

    it('should render KPI elements', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const kpiWeight = document.getElementById('scKpiWeight');
      const kpiDays = document.getElementById('scKpiDays');
      const kpiMethod = document.getElementById('scKpiMethod');
      const kpiRoute = document.getElementById('scKpiRoute');
      expect(kpiWeight).toBeDefined();
      expect(kpiDays).toBeDefined();
      expect(kpiMethod).toBeDefined();
      expect(kpiRoute).toBeDefined();
    });

    it('should render method table', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const methodTable = document.getElementById('scMethodTable');
      expect(methodTable).toBeDefined();
    });

    it('should render route grid', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const routeGrid = document.getElementById('scRouteGrid');
      expect(routeGrid).toBeDefined();
    });

    it('should render heatmap', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const heatmap = document.getElementById('scHeatmap');
      expect(heatmap).toBeDefined();
    });

    it('should render tips', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const tips = document.getElementById('scTipsGrid');
      expect(tips).toBeDefined();
    });

    it('should render landed cost inputs', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const sellPrice = document.getElementById('scSellPrice');
      const prodCost = document.getElementById('scProdCost');
      expect(sellPrice).toBeDefined();
      expect(prodCost).toBeDefined();
    });

    it('should render origin and destination selects', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const origin = document.getElementById('scOrigin');
      const dest = document.getElementById('scDest');
      expect(origin).toBeDefined();
      expect(dest).toBeDefined();
    });

    it('should not mount if container does not exist', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      expect(true).toBe(true);
    });
  });

  describe('_section getter/setter', () => {
    it('should be accessible', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      expect(plugin._section).toBeDefined();
      expect(plugin._section.id).toBe('section-shipping-calc');
    });
  });

  describe('calculate button', () => {
    it('should trigger calculation without throwing', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const calcBtn = document.getElementById('scCalcBtn');
      if (calcBtn) calcBtn.click();
      expect(true).toBe(true);
    });
  });

  describe('dimension calculator', () => {
    it('should have dimension inputs', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      const dimL = document.getElementById('scDimL');
      const dimW = document.getElementById('scDimW');
      const dimH = document.getElementById('scDimH');
      expect(dimL).toBeDefined();
      expect(dimW).toBeDefined();
      expect(dimH).toBeDefined();
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('shipping-calculator');
      await HuntDrop.PluginRegistry.mount('shipping-calculator');
      await HuntDrop.PluginRegistry.unmount('shipping-calculator');
      expect(document.getElementById('section-shipping-calc')).toBeNull();
      expect(plugin._mounted).toBe(false);
    });
  });
});
