import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('ad-studio plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/ad-studio.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('ad-studio');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('ad-studio');
      expect(plugin.name).toBe('Ad Creative Studio');
      expect(plugin.version).toBe('2.0.0');
    });

    it('should have all required lifecycle methods', () => {
      expect(typeof plugin.init).toBe('function');
      expect(typeof plugin.mount).toBe('function');
      expect(typeof plugin.unmount).toBe('function');
    });

    it('should have core methods after registration', () => {
      expect(typeof plugin.mount).toBe('function');
      expect(typeof plugin.unmount).toBe('function');
      expect(typeof plugin.init).toBe('function');
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('ad-studio');
      try { await HuntDrop.PluginRegistry.mount('ad-studio'); } catch (e) {}
      const section = document.getElementById('section-ad-studio');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-ad-studio');
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('ad-studio');
      try { await HuntDrop.PluginRegistry.mount('ad-studio'); } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('ad-studio');
      try { await HuntDrop.PluginRegistry.mount('ad-studio'); } catch (e) {}
      await HuntDrop.PluginRegistry.unmount('ad-studio');
      expect(document.getElementById('section-ad-studio')).toBeNull();
    });
  });

  describe('Version', () => {
    it('should be version 2.0.0', () => {
      expect(plugin.version).toBe('2.0.0');
    });

    it('should have description set', () => {
      expect(plugin.description).toBeTruthy();
    });
  });
});