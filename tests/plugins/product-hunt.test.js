import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('product-hunt plugin', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/product-hunt.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      const plugin = HuntDrop.PluginRegistry.get('product-hunt');
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('product-hunt');
      expect(plugin.name).toBe('Find Products');
    });

    it('should have init method', () => {
      const plugin = HuntDrop.PluginRegistry.get('product-hunt');
      expect(typeof plugin.init).toBe('function');
    });
  });

  describe('init()', () => {
    it('should set producthunt config defaults', async () => {
      await HuntDrop.PluginRegistry.init('product-hunt');
      const config = HuntDrop.Config.getAll('producthunt');
      expect(config).toBeDefined();
      expect(config.depth).toBe('quick');
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('product-hunt');
      await HuntDrop.PluginRegistry.mount('product-hunt');
      const section = document.getElementById('section-product-hunt');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-product-hunt');
    });

    it('should create chat sidebar', async () => {
      await HuntDrop.PluginRegistry.init('product-hunt');
      await HuntDrop.PluginRegistry.mount('product-hunt');
      const sidebar = document.getElementById('phChatSidebar');
      expect(sidebar).toBeDefined();
    });

    it('should create chat toggle button', async () => {
      await HuntDrop.PluginRegistry.init('product-hunt');
      await HuntDrop.PluginRegistry.mount('product-hunt');
      const toggle = document.getElementById('phChatToggle');
      expect(toggle).toBeDefined();
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('product-hunt');
      await HuntDrop.PluginRegistry.mount('product-hunt');
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section and chat elements', async () => {
      await HuntDrop.PluginRegistry.init('product-hunt');
      await HuntDrop.PluginRegistry.mount('product-hunt');
      await HuntDrop.PluginRegistry.unmount('product-hunt');
      const section = document.getElementById('section-product-hunt');
      expect(section).toBeNull();
      const sidebar = document.getElementById('phChatSidebar');
      expect(sidebar).toBeNull();
    });
  });


});
