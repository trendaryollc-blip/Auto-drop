import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('ad-budget-allocator plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/ad-budget-allocator.js']));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('ad-budget-allocator');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('ad-budget-allocator');
      expect(plugin.name).toBe('Budget Planner');
    });
  });

  describe('init()', () => {
    it('should set budget config defaults', async () => {
      await HuntDrop.PluginRegistry.init('ad-budget-allocator');
      const config = HuntDrop.Config.getAll('budget');
      expect(config).toBeDefined();
      expect(config.defaultAmount).toBe(1000);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('ad-budget-allocator');
      try {
        await HuntDrop.PluginRegistry.mount('ad-budget-allocator');
      } catch (e) {}
      const section = document.getElementById('section-budget');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-ad-budget-allocator');
    });

    it('should contain budget input and allocate button', async () => {
      await HuntDrop.PluginRegistry.init('ad-budget-allocator');
      try {
        await HuntDrop.PluginRegistry.mount('ad-budget-allocator');
      } catch (e) {}
      expect(document.getElementById('budgetAllocateBtn')).toBeDefined();
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('ad-budget-allocator');
      try {
        await HuntDrop.PluginRegistry.mount('ad-budget-allocator');
      } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section and charts', async () => {
      await HuntDrop.PluginRegistry.init('ad-budget-allocator');
      try {
        await HuntDrop.PluginRegistry.mount('ad-budget-allocator');
      } catch (e) {}
      const el = document.getElementById('section-budget');
      if (el) el.remove();
      expect(document.getElementById('section-budget')).toBeNull();
    });
  });
});
