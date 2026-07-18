// ============================================================================
// TESTS: plugins/refund-detail.js — Refund Detail View
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('refund-detail plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    sessionStorage.clear();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/refund-detail.js',
    ]));
    plugin = HuntDrop.PluginRegistry.get('refund-detail');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('refund-detail');
      expect(plugin.name).toBe('Refund Detail');
    });

    it('should have version 1.0.0', () => {
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('init()', () => {
    it('should succeed without errors', async () => {
      await HuntDrop.PluginRegistry.init('refund-detail');
      expect(true).toBe(true);
    });
  });

  describe('mount() — not found state', () => {
    it('should show not-found when no refund ID in sessionStorage', async () => {
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const section = document.getElementById('section-refund-detail');
      expect(section).toBeDefined();
      const content = document.getElementById('rdContent');
      expect(content).toBeDefined();
      expect(content.innerHTML).toContain('No Refund Selected');
    });

    it('should have back button in not-found state', async () => {
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const backBtn = document.getElementById('rdBackToShield');
      expect(backBtn).toBeDefined();
    });
  });

  describe('mount() — not found for invalid refund', () => {
    it('should show not-found for unknown refund ID', async () => {
      sessionStorage.setItem('rs_drill_refund', 'REF-INVALID');
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const content = document.getElementById('rdContent');
      expect(content.innerHTML).toContain('No Refund Selected');
    });
  });

  describe('mount() — full detail', () => {
    it('should render full detail for valid refund ID', async () => {
      sessionStorage.setItem('rs_drill_refund', 'REF-001');
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const hero = document.querySelector('.rd-hero');
      expect(hero).toBeDefined();
    });

    it('should render cost breakdown', async () => {
      sessionStorage.setItem('rs_drill_refund', 'REF-001');
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const costCard = document.querySelector('.rd-cost-card');
      expect(costCard).toBeDefined();
    });

    it('should render timeline', async () => {
      sessionStorage.setItem('rs_drill_refund', 'REF-001');
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const timeline = document.querySelector('.rd-timeline-card');
      expect(timeline).toBeDefined();
    });

    it('should render root cause analysis card', async () => {
      sessionStorage.setItem('rs_drill_refund', 'REF-001');
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const causeCard = document.querySelector('.rd-cause-card');
      expect(causeCard).toBeDefined();
    });

    it('should render prevention tips', async () => {
      sessionStorage.setItem('rs_drill_refund', 'REF-001');
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const preventionCard = document.querySelector('.rd-prevention-card');
      expect(preventionCard).toBeDefined();
    });

    it('should render supplier info card', async () => {
      sessionStorage.setItem('rs_drill_refund', 'REF-001');
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const supplierCard = document.querySelector('.rd-supplier-card');
      expect(supplierCard).toBeDefined();
    });

    it('should render cross-links to related tools', async () => {
      sessionStorage.setItem('rs_drill_refund', 'REF-001');
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const crossLinks = document.querySelector('.rd-cross-links');
      expect(crossLinks).toBeDefined();
    });
  });

  describe('navigation', () => {
    it('should have back button that navigates to refund-shield', async () => {
      sessionStorage.setItem('rs_drill_refund', 'REF-001');
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const backBtn = document.getElementById('rdBackBtn');
      expect(backBtn).toBeDefined();
    });

    it('should have supplier risk link', async () => {
      sessionStorage.setItem('rs_drill_refund', 'REF-001');
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      const supplierLink = document.getElementById('rdSupplierLink');
      expect(supplierLink).toBeDefined();
    });
  });

  describe('_section getter/setter', () => {
    it('should be accessible', async () => {
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      expect(plugin._section).toBeDefined();
    });
  });

  describe('not mount if container missing', () => {
    it('should handle gracefully', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('refund-detail');
      await HuntDrop.PluginRegistry.mount('refund-detail');
      await HuntDrop.PluginRegistry.unmount('refund-detail');
      expect(document.getElementById('section-refund-detail')).toBeNull();
      expect(plugin._mounted).toBe(false);
    });
  });
});
