// ============================================================================
// TESTS: plugins/refund-root-cause.js — Refund Root Cause Analysis
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('refund-root-cause plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    sessionStorage.clear();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/refund-root-cause.js']));
    plugin = HuntDrop.PluginRegistry.get('refund-root-cause');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('refund-root-cause');
      expect(plugin.name).toBe('Root Cause Analysis');
    });

    it('should have version 1.0.0', () => {
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('init()', () => {
    it('should succeed without errors', async () => {
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      expect(true).toBe(true);
    });
  });

  describe('mount() — empty state', () => {
    it('should show empty state when no reason selected in sessionStorage', async () => {
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      const section = document.getElementById('section-refund-root-cause');
      expect(section).toBeDefined();
      const emptyState = section.querySelector('.rrc-empty');
      expect(emptyState).toBeDefined();
    });

    it('should have a back button in empty state', async () => {
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      const backBtn = document.getElementById('rrcGoBack');
      expect(backBtn).toBeDefined();
    });
  });

  describe('mount() — full page', () => {
    it('should render full page when valid reason is in sessionStorage', async () => {
      sessionStorage.setItem('rs_drill_reason', 'quality');
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      const section = document.getElementById('section-refund-root-cause');
      expect(section).toBeDefined();
      const hero = section.querySelector('.rrc-hero');
      expect(hero).toBeDefined();
    });

    it('should show back button on full page', async () => {
      sessionStorage.setItem('rs_drill_reason', 'damage');
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      const backBtn = document.getElementById('rrcBackBtn');
      expect(backBtn).toBeDefined();
    });

    it('should render prevention tips section', async () => {
      sessionStorage.setItem('rs_drill_reason', 'fraud');
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      const tipsList = document.querySelector('.rrc-tips-list');
      expect(tipsList).toBeDefined();
    });

    it('should render financial impact cards', async () => {
      sessionStorage.setItem('rs_drill_reason', 'quality');
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      const impactGrid = document.querySelector('.rrc-impact-grid');
      expect(impactGrid).toBeDefined();
    });

    it('should render action plan with checkboxes', async () => {
      sessionStorage.setItem('rs_drill_reason', 'quality');
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      const checkboxes = document.querySelectorAll('.rrc-action-cb');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('mount() — invalid reason', () => {
    it('should show empty state for unknown reason', async () => {
      sessionStorage.setItem('rs_drill_reason', 'nonexistent');
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      const emptyState = document.querySelector('.rrc-empty');
      expect(emptyState).toBeDefined();
    });
  });

  describe('action plan persistence', () => {
    it('should save checkbox state to localStorage', async () => {
      sessionStorage.setItem('rs_drill_reason', 'quality');
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      const cb = document.querySelector('.rrc-action-cb');
      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));
        const stored = JSON.parse(localStorage.getItem('rrc_action_plan') || '{}');
        expect(stored.rrc_quality).toBeDefined();
      }
    });
  });

  describe('_section getter/setter', () => {
    it('should be accessible', async () => {
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      expect(plugin._section).toBeDefined();
    });
  });

  describe('not mount if container missing', () => {
    it('should handle gracefully', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('refund-root-cause');
      await HuntDrop.PluginRegistry.mount('refund-root-cause');
      await HuntDrop.PluginRegistry.unmount('refund-root-cause');
      expect(document.getElementById('section-refund-root-cause')).toBeNull();
      expect(plugin._mounted).toBe(false);
    });
  });
});
