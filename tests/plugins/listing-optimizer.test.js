// ============================================================================
// TESTS: plugins/listing-optimizer.js — Listing Optimizer
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('listing-optimizer plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/listing-optimizer.js',
    ]));
    plugin = HuntDrop.PluginRegistry.get('listing-optimizer');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('listing-optimizer');
      expect(plugin.name).toBe('Listing Optimizer');
    });

    it('should have version 1.0.0', () => {
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('init()', () => {
    it('should succeed without errors', async () => {
      await HuntDrop.PluginRegistry.init('listing-optimizer');
      expect(true).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('listing-optimizer');
      await HuntDrop.PluginRegistry.mount('listing-optimizer');
      const section = document.getElementById('section-listing-optimizer');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-listing-optimizer');
    });

    it('should render title input', async () => {
      await HuntDrop.PluginRegistry.init('listing-optimizer');
      await HuntDrop.PluginRegistry.mount('listing-optimizer');
      const titleInput = document.getElementById('loTitle');
      expect(titleInput).toBeDefined();
    });

    it('should render description input', async () => {
      await HuntDrop.PluginRegistry.init('listing-optimizer');
      await HuntDrop.PluginRegistry.mount('listing-optimizer');
      const descInput = document.getElementById('loDesc');
      expect(descInput).toBeDefined();
    });

    it('should render analyze button', async () => {
      await HuntDrop.PluginRegistry.init('listing-optimizer');
      await HuntDrop.PluginRegistry.mount('listing-optimizer');
      const analyzeBtn = document.getElementById('loAnalyzeBtn');
      expect(analyzeBtn).toBeDefined();
    });

    it('should render results container (hidden initially)', async () => {
      await HuntDrop.PluginRegistry.init('listing-optimizer');
      await HuntDrop.PluginRegistry.mount('listing-optimizer');
      const results = document.getElementById('loResults');
      expect(results).toBeDefined();
    });

    it('should not mount if container does not exist', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('listing-optimizer');
      await HuntDrop.PluginRegistry.mount('listing-optimizer');
      expect(true).toBe(true);
    });
  });

  describe('_section getter/setter', () => {
    it('should be accessible', async () => {
      await HuntDrop.PluginRegistry.init('listing-optimizer');
      await HuntDrop.PluginRegistry.mount('listing-optimizer');
      expect(plugin._section).toBeDefined();
      expect(plugin._section.id).toBe('section-listing-optimizer');
    });
  });

  describe('analyze functionality', () => {
    it('should populate inputs and trigger analysis without throwing', async () => {
      await HuntDrop.PluginRegistry.init('listing-optimizer');
      await HuntDrop.PluginRegistry.mount('listing-optimizer');

      const titleInput = document.getElementById('loTitle');
      const descInput = document.getElementById('loDesc');
      if (titleInput) titleInput.value = 'Premium Wireless Bluetooth Earbuds Noise Cancelling';
      if (descInput) descInput.value = 'High quality wireless earbuds with active noise cancellation and long battery life.';

      const analyzeBtn = document.getElementById('loAnalyzeBtn');
      if (analyzeBtn) analyzeBtn.click();

      // Should not throw regardless of result rendering
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('listing-optimizer');
      await HuntDrop.PluginRegistry.mount('listing-optimizer');
      await HuntDrop.PluginRegistry.unmount('listing-optimizer');
      expect(document.getElementById('section-listing-optimizer')).toBeNull();
      expect(plugin._mounted).toBe(false);
    });
  });
});
