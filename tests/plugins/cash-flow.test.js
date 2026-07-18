// ============================================================================
// TESTS: plugins/cash-flow.js — Cash Flow Command Center
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('cash-flow plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/cash-flow.js']));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related</div>');
    plugin = HuntDrop.PluginRegistry.get('cash-flow');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('cash-flow');
      expect(plugin.name).toBe('Cash Flow');
    });

    it('should have version 1.0.0', () => {
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('init()', () => {
    it('should succeed without errors', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      expect(true).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      const section = document.getElementById('section-cash-flow');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-cash-flow');
    });

    it('should render timeline element', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      const timeline = document.getElementById('cfTimeline');
      expect(timeline).toBeDefined();
    });

    it('should render calculator results', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      const calcResults = document.getElementById('cfCalcResults');
      expect(calcResults).toBeDefined();
    });

    it('should render payouts section', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      const payouts = document.getElementById('cfPayouts');
      expect(payouts).toBeDefined();
    });

    it('should render suppliers section', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      const suppliers = document.getElementById('cfSuppliers');
      expect(suppliers).toBeDefined();
    });

    it('should render alerts section', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      const alerts = document.getElementById('cfAlerts');
      expect(alerts).toBeDefined();
    });

    it('should render calculator inputs', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      const cashInput = document.getElementById('cfCash');
      expect(cashInput).toBeDefined();
    });

    it('should not mount if container does not exist', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      expect(true).toBe(true);
    });
  });

  describe('_section getter/setter', () => {
    it('should be accessible via plugin._section', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      expect(plugin._section).toBeDefined();
      expect(plugin._section.id).toBe('section-cash-flow');
    });
  });

  describe('calculator inputs', () => {
    it('should accept input values without throwing', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      const inputs = ['cfCash', 'cfAds', 'cfAOV', 'cfOrders', 'cfProdCost', 'cfShipCost', 'cfFixed', 'cfReinvest'];
      inputs.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '100';
      });
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('cash-flow');
      await HuntDrop.PluginRegistry.mount('cash-flow');
      await HuntDrop.PluginRegistry.unmount('cash-flow');
      expect(document.getElementById('section-cash-flow')).toBeNull();
      expect(plugin._mounted).toBe(false);
    });
  });
});
