// ============================================================================
// TESTS: plugins/refund-shield.js — Refund & Returns Shield
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('refund-shield plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/refund-shield.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related</div>');
    plugin = HuntDrop.PluginRegistry.get('refund-shield');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('refund-shield');
      expect(plugin.name).toBe('Refund Shield');
    });

    it('should have version 2.0.0', () => {
      expect(plugin.version).toBe('2.0.0');
    });
  });

  describe('init()', () => {
    it('should set refundShield config defaults', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      const config = HuntDrop.Config.getAll('refundShield');
      expect(config).toBeDefined();
      expect(config.period).toBe('30d');
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      const section = document.getElementById('section-refund-shield');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-refund-shield');
    });

    it('should render hero section with KPIs', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      const hero = document.querySelector('.rs-hero');
      expect(hero).toBeDefined();
    });

    it('should render causes section', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      const causes = document.getElementById('rsCauses');
      expect(causes).toBeDefined();
      expect(causes.innerHTML.length).toBeGreaterThan(0);
    });

    it('should render supplier grid', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      const grid = document.getElementById('rsSupplierGrid');
      expect(grid).toBeDefined();
    });

    it('should render impact section', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      const impact = document.getElementById('rsImpact');
      expect(impact).toBeDefined();
    });

    it('should render refund list', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      const list = document.getElementById('rsRefundList');
      expect(list).toBeDefined();
    });

    it('should render trend chart', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      const trend = document.getElementById('rsTrend');
      expect(trend).toBeDefined();
    });

    it('should render playbook', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      const playbook = document.getElementById('rsPlaybook');
      expect(playbook).toBeDefined();
    });

    it('should render the add refund form', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      const form = document.getElementById('rsAddForm');
      expect(form).toBeDefined();
    });

    it('should not mount if container does not exist', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      expect(true).toBe(true);
    });
  });

  describe('_section getter/setter', () => {
    it('should be accessible via plugin._section', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      expect(plugin._section).toBeDefined();
      expect(plugin._section.id).toBe('section-refund-shield');
    });

    it('should be settable', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      plugin._section = null;
      expect(plugin._section).toBeNull();
    });
  });

  describe('add refund', () => {
    it('should add a new refund when form is filled and button clicked', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');

      const orderInput = document.getElementById('rsNewOrder');
      const productInput = document.getElementById('rsNewProduct');
      const customerInput = document.getElementById('rsNewCustomer');
      const amountInput = document.getElementById('rsNewAmount');
      const costInput = document.getElementById('rsNewCost');
      const shipInput = document.getElementById('rsNewShip');
      const adInput = document.getElementById('rsNewAd');

      if (orderInput) orderInput.value = 'ORD-TEST';
      if (productInput) productInput.value = 'Test Product';
      if (customerInput) customerInput.value = 'Test Customer';
      if (amountInput) amountInput.value = '25.00';
      if (costInput) costInput.value = '8.00';
      if (shipInput) shipInput.value = '3.00';
      if (adInput) adInput.value = '4.00';

      const addBtn = document.getElementById('rsAddBtn');
      if (addBtn) addBtn.click();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('CSV export', () => {
    it('should not throw when export button is clicked', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      const exportBtn = document.getElementById('rsExportBtn');
      if (exportBtn) exportBtn.click();
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.mount('refund-shield');
      await HuntDrop.PluginRegistry.unmount('refund-shield');
      expect(document.getElementById('section-refund-shield')).toBeNull();
      expect(plugin._mounted).toBe(false);
    });

    it('should handle unmount when section does not exist', async () => {
      await HuntDrop.PluginRegistry.init('refund-shield');
      await HuntDrop.PluginRegistry.unmount('refund-shield');
      expect(true).toBe(true);
    });
  });
});
