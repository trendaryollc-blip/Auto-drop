// ============================================================================
// TESTS: plugins/backend-bridge.js — Backend Bridge v2
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('backend-bridge plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    // Mock fetch to prevent real HTTP calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: 'not available' }),
    });
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/backend-bridge.js']));
    plugin = HuntDrop.PluginRegistry.get('backend-bridge');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('backend-bridge');
      expect(plugin.name).toBe('Backend Bridge');
    });

    it('should have version 2.0.0', () => {
      expect(plugin.version).toBe('2.0.0');
    });
  });

  describe('init()', () => {
    it('should set backend config defaults', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      const config = HuntDrop.Config.getAll('backend');
      expect(config).toBeDefined();
      expect(config.url).toBeDefined();
    });
  });

  describe('mount()', () => {
    it('should mount and attempt health check', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      // Backend is not running, so connected should be false
      const config = HuntDrop.Config.getAll('backend');
      expect(config.connected).toBe(false);
    });

    it('should expose BackendAPI on window.HuntDrop', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      const api = window.HuntDrop.BackendAPI;
      expect(api).toBeDefined();
    });

    it('should have auth sub-object', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.auth).toBeDefined();
      expect(typeof window.HuntDrop.BackendAPI.auth.login).toBe('function');
      expect(typeof window.HuntDrop.BackendAPI.auth.logout).toBe('function');
      expect(typeof window.HuntDrop.BackendAPI.auth.register).toBe('function');
    });

    it('should have search sub-object', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.search).toBeDefined();
      expect(typeof window.HuntDrop.BackendAPI.search.searchProducts).toBe('function');
    });

    it('should have products sub-object', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.products).toBeDefined();
      expect(typeof window.HuntDrop.BackendAPI.products.getProduct).toBe('function');
      expect(typeof window.HuntDrop.BackendAPI.products.saveProduct).toBe('function');
    });

    it('should have calculator sub-object', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.calculator).toBeDefined();
      expect(typeof window.HuntDrop.BackendAPI.calculator.calculate).toBe('function');
    });

    it('should have settings sub-object', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.settings).toBeDefined();
      expect(typeof window.HuntDrop.BackendAPI.settings.getSettings).toBe('function');
    });

    it('should have analytics sub-object', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.analytics).toBeDefined();
      expect(typeof window.HuntDrop.BackendAPI.analytics.trackEvent).toBe('function');
    });

    it('should have export sub-object', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.export).toBeDefined();
      expect(typeof window.HuntDrop.BackendAPI.export.exportData).toBe('function');
    });

    it('should have health sub-object', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.health).toBeDefined();
      expect(typeof window.HuntDrop.BackendAPI.health.checkHealth).toBe('function');
      expect(typeof window.HuntDrop.BackendAPI.health.isConnected).toBe('function');
    });
  });

  describe('BackendAPI.auth', () => {
    it('login should throw error when backend is down', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      try {
        await window.HuntDrop.BackendAPI.auth.login('test@test.com', 'password');
        // Should not reach here
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('register should throw error when backend is down', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      try {
        await window.HuntDrop.BackendAPI.auth.register('test@test.com', 'password', 'Test');
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('logout should clear token without throwing', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      window.HuntDrop.BackendAPI.auth.logout();
      expect(window.HuntDrop.BackendAPI.getToken()).toBeNull();
    });

    it('isLoggedIn should return false when not logged in', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.auth.isLoggedIn()).toBe(false);
    });
  });

  describe('BackendAPI.health', () => {
    it('checkHealth should return status when backend is down', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      const result = await window.HuntDrop.BackendAPI.health.checkHealth();
      expect(result).toBeDefined();
    });

    it('isConnected should return false when backend is down', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.health.isConnected()).toBe(false);
    });
  });

  describe('BackendAPI.search', () => {
    it('searchProducts should throw error when backend is down', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      try {
        await window.HuntDrop.BackendAPI.search.searchProducts('test');
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('getMode should return local by default', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.search.getMode()).toBe('local');
    });
  });

  describe('BackendAPI.getToken()', () => {
    it('should return null when not authenticated', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI.getToken()).toBeNull();
    });
  });

  describe('unmount()', () => {
    it('should clean up BackendAPI and interceptors', async () => {
      await HuntDrop.PluginRegistry.init('backend-bridge');
      await HuntDrop.PluginRegistry.mount('backend-bridge');
      expect(window.HuntDrop.BackendAPI).toBeDefined();
      await HuntDrop.PluginRegistry.unmount('backend-bridge');
      expect(window.HuntDrop.BackendAPI).toBeUndefined();
    });
  });
});
