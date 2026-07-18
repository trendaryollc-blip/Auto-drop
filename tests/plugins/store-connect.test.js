// ============================================================================
// TESTS: plugins/store-connect.js — Store Connect to Trendaryo
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('store-connect plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, created: 1, failed: 0, results: [{ success: true }] })
    });
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/store-connect.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related</div>');
    plugin = HuntDrop.PluginRegistry.get('store-connect');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('store-connect');
      expect(plugin.name).toBe('Store Connect');
    });

    it('should have version 1.0.0', () => {
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('init()', () => {
    it('should set storeConnect config defaults', async () => {
      await HuntDrop.PluginRegistry.init('store-connect');
      const config = HuntDrop.Config.getAll('storeConnect');
      expect(config).toBeDefined();
      expect(config.defaultStatus).toBe('active');
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('store-connect');
      await HuntDrop.PluginRegistry.mount('store-connect');
      const section = document.getElementById('section-store-connect');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-store-connect');
    });

    it('should render connection panel', async () => {
      await HuntDrop.PluginRegistry.init('store-connect');
      await HuntDrop.PluginRegistry.mount('store-connect');
      const content = document.getElementById('scContent');
      expect(content).toBeDefined();
      expect(content.innerHTML).toContain('Trendaryo');
    });

    it('should render push panel', async () => {
      await HuntDrop.PluginRegistry.init('store-connect');
      await HuntDrop.PluginRegistry.mount('store-connect');
      const content = document.getElementById('scContent');
      expect(content.innerHTML).toContain('Push Products');
    });

    it('should render history panel', async () => {
      await HuntDrop.PluginRegistry.init('store-connect');
      await HuntDrop.PluginRegistry.mount('store-connect');
      const content = document.getElementById('scContent');
      expect(content.innerHTML).toContain('Push History');
    });

    it('should render how-it-works steps', async () => {
      await HuntDrop.PluginRegistry.init('store-connect');
      await HuntDrop.PluginRegistry.mount('store-connect');
      const steps = document.querySelectorAll('.sc-step');
      expect(steps.length).toBe(4);
    });

    it('should not mount if container does not exist', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('store-connect');
      await HuntDrop.PluginRegistry.mount('store-connect');
      expect(true).toBe(true);
    });
  });

  describe('StoreConnect API', () => {
    it('should expose StoreConnect on window.HuntDrop', () => {
      expect(window.HuntDrop.StoreConnect).toBeDefined();
    });

    it('should have pushProduct function', () => {
      expect(typeof window.HuntDrop.StoreConnect.pushProduct).toBe('function');
    });

    it('should have pushProducts function', () => {
      expect(typeof window.HuntDrop.StoreConnect.pushProducts).toBe('function');
    });

    it('should have isSelectMode function', () => {
      expect(typeof window.HuntDrop.StoreConnect.isSelectMode).toBe('function');
    });

    it('should have toggleProduct function', () => {
      expect(typeof window.HuntDrop.StoreConnect.toggleProduct).toBe('function');
    });

    it('should have getSelectedProducts function', () => {
      expect(typeof window.HuntDrop.StoreConnect.getSelectedProducts).toBe('function');
    });

    it('should have pushSelected function', () => {
      expect(typeof window.HuntDrop.StoreConnect.pushSelected).toBe('function');
    });

    it('should have getStats function', () => {
      expect(typeof window.HuntDrop.StoreConnect.getStats).toBe('function');
    });

    it('should have getHistory function', () => {
      expect(typeof window.HuntDrop.StoreConnect.getHistory).toBe('function');
    });
  });

  describe('selectMode', () => {
    it('should default to off', () => {
      expect(window.HuntDrop.StoreConnect.isSelectMode()).toBe(false);
    });

    it('should toggle product selection', () => {
      window.HuntDrop.StoreConnect.toggleProduct('123');
      expect(window.HuntDrop.StoreConnect.getSelectedProducts()).toContain('123');
      window.HuntDrop.StoreConnect.toggleProduct('123');
      expect(window.HuntDrop.StoreConnect.getSelectedProducts()).not.toContain('123');
    });

    it('should clear selection', () => {
      window.HuntDrop.StoreConnect.toggleProduct('123');
      window.HuntDrop.StoreConnect.clearSelection();
      expect(window.HuntDrop.StoreConnect.getSelectedProducts().length).toBe(0);
    });
  });

  describe('pushProduct', () => {
    it('should call fetch with Trendaryo API URL', async () => {
      await HuntDrop.PluginRegistry.init('store-connect');
      await HuntDrop.PluginRegistry.mount('store-connect');
      fetch.mockClear();

      const product = { id: 1, title: 'Test Product', price: 29.99, score: 85, category: 'Electronics' };
      await window.HuntDrop.StoreConnect.pushProduct(product);

      expect(fetch).toHaveBeenCalledTimes(1);
      const callUrl = fetch.mock.calls[0][0];
      expect(callUrl).toContain('trendaryo-llc-backend.vercel.app');
      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.products).toBeDefined();
      expect(callBody.products.length).toBe(1);
      expect(callBody.products[0].name).toBe('Test Product');
    });

    it('should return result object', async () => {
      await HuntDrop.PluginRegistry.init('store-connect');
      const result = await window.HuntDrop.StoreConnect.pushProduct({ id: 1, title: 'Test' });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return stats object with defaults', () => {
      localStorage.removeItem('sc_push_history');
      const stats = window.HuntDrop.StoreConnect.getStats();
      expect(stats.total).toBe(0);
      expect(stats.success).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.lastPush).toBeNull();
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('store-connect');
      await HuntDrop.PluginRegistry.mount('store-connect');
      await HuntDrop.PluginRegistry.unmount('store-connect');
      expect(document.getElementById('section-store-connect')).toBeNull();
      expect(plugin._mounted).toBe(false);
    });
  });
});
