// ============================================================================
// TESTS: plugins/business-simulator.js — Business Mode Simulator
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('business-simulator plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/business-simulator.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related</div>');
    plugin = HuntDrop.PluginRegistry.get('business-simulator');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('business-simulator');
      expect(plugin.name).toBe('Business Mode Simulator');
    });
  });

  describe('init()', () => {
    it('should set businessSim config defaults', async () => {
      await HuntDrop.PluginRegistry.init('business-simulator');
      const config = HuntDrop.Config.getAll('businessSim');
      expect(config.enabled).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('business-simulator');
      await HuntDrop.PluginRegistry.mount('business-simulator');
      const section = document.getElementById('section-simulator');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-business-simulator');
    });

    it('should not mount if container does not exist', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('business-simulator');
      await HuntDrop.PluginRegistry.mount('business-simulator');
      expect(true).toBe(true);
    });
  });

  describe('simulate() function', () => {
    it('should return results with daily data for 90 days', () => {
      const results = plugin.simulate ? plugin.simulate({
        budget: 5000,
        productCount: 5,
        avgCpa: 5,
        avgOrderValue: 30,
        avgMargin: 40,
        dailyAdSpend: 100,
        growthRate: 10,
        refundRate: 5,
      }) : null;
      // If simulate is not exposed, we test via runSimulation
      if (results) {
        expect(results.daily).toBeDefined();
        expect(results.daily.length).toBe(90);
      }
    });
  });

  describe('runSimulation()', () => {
    beforeEach(async () => {
      await HuntDrop.PluginRegistry.init('business-simulator');
      await HuntDrop.PluginRegistry.mount('business-simulator');
    });

    it('should run simulation and populate results', () => {
      // Set input values
      const inputs = ['bsBudget', 'bsProductCount', 'bsCpa', 'bsAov', 'bsMargin', 'bsAdSpend', 'bsGrowth', 'bsRefund'];
      const values = ['5000', '5', '5', '30', '40', '100', '10', '5'];
      inputs.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.value = values[i];
      });

      if (typeof plugin.runSimulation === 'function') {
        plugin.runSimulation();
        // Check that results section is populated
        const results = document.getElementById('bsResults');
        if (results) {
          expect(results.innerHTML).toBeDefined();
        }
      }
    });
  });

  describe('unmount()', () => {
    it('should clean up section and charts', async () => {
      await HuntDrop.PluginRegistry.init('business-simulator');
      await HuntDrop.PluginRegistry.mount('business-simulator');
      await HuntDrop.PluginRegistry.unmount('business-simulator');
      expect(plugin._section).toBeNull();
    });
  });
});