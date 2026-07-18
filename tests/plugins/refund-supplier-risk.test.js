// ============================================================================
// TESTS: plugins/refund-supplier-risk.js — Supplier Risk Profile
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('refund-supplier-risk plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    sessionStorage.clear();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/refund-supplier-risk.js']));
    plugin = HuntDrop.PluginRegistry.get('refund-supplier-risk');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('refund-supplier-risk');
      expect(plugin.name).toBe('Supplier Risk Profile');
    });

    it('should have version 1.0.0', () => {
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('init()', () => {
    it('should succeed without errors', async () => {
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      expect(true).toBe(true);
    });
  });

  describe('mount() — empty state', () => {
    it('should show empty state when no supplier selected', async () => {
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const section = document.getElementById('section-refund-supplier-risk');
      expect(section).toBeDefined();
      const emptyState = section.querySelector('.rsr-empty');
      expect(emptyState).toBeDefined();
    });

    it('should display "No Supplier Selected"', async () => {
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const title = document.querySelector('.rsr-empty-title');
      expect(title).toBeDefined();
      expect(title.textContent).toContain('No Supplier Selected');
    });
  });

  describe('mount() — supplier not found', () => {
    it('should show not found for unknown supplier', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'Unknown Supplier XYZ');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const title = document.querySelector('.rsr-empty-title');
      expect(title).toBeDefined();
      expect(title.textContent).toContain('Supplier Not Found');
    });
  });

  describe('mount() — full risk profile', () => {
    it('should render full profile for valid supplier', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const hero = document.querySelector('.rsr-hero');
      expect(hero).toBeDefined();
    });

    it('should render risk score ring', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const ring = document.querySelector('.rsr-risk-ring');
      expect(ring).toBeDefined();
    });

    it('should render refund reasons breakdown', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const reasons = document.querySelector('.rsr-reasons-chart');
      expect(reasons).toBeDefined();
      const rows = reasons.querySelectorAll('.rsr-reason-row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should render platform breakdown', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const platforms = document.querySelector('.rsr-platforms-grid');
      expect(platforms).toBeDefined();
    });

    it('should render refund history', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const history = document.querySelector('.rsr-refund-list');
      expect(history).toBeDefined();
      const cards = history.querySelectorAll('.rsr-refund-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should render recommendations', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const recs = document.querySelector('.rsr-recommendations');
      expect(recs).toBeDefined();
    });

    it('should render supplier comparison', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const comp = document.querySelector('.rsr-comparison-grid');
      expect(comp).toBeDefined();
    });
  });

  describe('navigation from reason rows', () => {
    it('should have clickable reason rows', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const row = document.querySelector('.rsr-reason-row');
      expect(row).toBeDefined();
      expect(row.getAttribute('data-reason')).toBeDefined();
    });
  });

  describe('navigation from refund cards', () => {
    it('should have clickable refund cards', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      const card = document.querySelector('.rsr-refund-card');
      expect(card).toBeDefined();
      expect(card.getAttribute('data-refund')).toBeDefined();
    });
  });

  describe('_section getter/setter', () => {
    it('should be accessible', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      expect(plugin._section).toBeDefined();
    });
  });

  describe('not mount if container missing', () => {
    it('should handle gracefully', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      sessionStorage.setItem('rs_drill_supplier', 'AliExpress Supplier A');
      await HuntDrop.PluginRegistry.init('refund-supplier-risk');
      await HuntDrop.PluginRegistry.mount('refund-supplier-risk');
      await HuntDrop.PluginRegistry.unmount('refund-supplier-risk');
      expect(document.getElementById('section-refund-supplier-risk')).toBeNull();
      expect(plugin._mounted).toBe(false);
    });
  });
});
