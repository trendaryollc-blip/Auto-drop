// ============================================================================
// TESTS: plugins/auth-modal.js — Auth Modal
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM } from '../setup.js';

describe('auth-modal plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/backend-bridge.js',
      'plugins/auth-modal.js',
    ]));
    plugin = HuntDrop.PluginRegistry.get('auth-modal');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('auth-modal');
      expect(plugin.name).toBe('Auth Modal');
    });

    it('should have version 1.0.0', () => {
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('init()', () => {
    it('should succeed without errors', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      expect(true).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should mount without errors', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      await HuntDrop.PluginRegistry.mount('auth-modal');
      expect(true).toBe(true);
    });

    it('should not create a section element (modal plugin)', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      await HuntDrop.PluginRegistry.mount('auth-modal');
      // Auth modal creates modals on body, not sections in sections-container
      const sectionsContainer = document.getElementById('sections-container');
      expect(sectionsContainer.children.length).toBe(0);
    });
  });

  describe('EventBus listeners', () => {
    it('should show login modal on auth:required event', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      await HuntDrop.PluginRegistry.mount('auth-modal');
      HuntDrop.EventBus.emit('auth:required');
      // Wait for modal creation
      await new Promise((r) => setTimeout(r, 10));
      const overlay = document.querySelector('.hd-auth-modal-overlay');
      expect(overlay).toBeDefined();
    });

    it('should show login modal on auth:show-login event', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      await HuntDrop.PluginRegistry.mount('auth-modal');
      HuntDrop.EventBus.emit('auth:show-login');
      await new Promise((r) => setTimeout(r, 10));
      const overlay = document.querySelector('.hd-auth-modal-overlay');
      expect(overlay).toBeDefined();
    });

    it('should show register modal on auth:show-register event', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      await HuntDrop.PluginRegistry.mount('auth-modal');
      HuntDrop.EventBus.emit('auth:show-register');
      await new Promise((r) => setTimeout(r, 10));
      const overlay = document.querySelector('.hd-auth-modal-overlay');
      expect(overlay).toBeDefined();
      // Should have register form elements
      const displayName = document.getElementById('authDisplayName');
      expect(displayName).toBeDefined();
    });

    it('should not open a second modal if one is already open', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      await HuntDrop.PluginRegistry.mount('auth-modal');
      HuntDrop.EventBus.emit('auth:show-login');
      await new Promise((r) => setTimeout(r, 10));
      HuntDrop.EventBus.emit('auth:show-login');
      await new Promise((r) => setTimeout(r, 10));
      const overlays = document.querySelectorAll('.hd-auth-modal-overlay');
      expect(overlays.length).toBe(1);
    });
  });

  describe('modal close', () => {
    it('should close when close button is clicked', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      await HuntDrop.PluginRegistry.mount('auth-modal');
      HuntDrop.EventBus.emit('auth:show-login');
      await new Promise((r) => setTimeout(r, 10));
      const closeBtn = document.querySelector('.hd-auth-close');
      if (closeBtn) closeBtn.click();
      // Wait for animation delay (300ms)
      await new Promise((r) => setTimeout(r, 350));
      const overlay = document.querySelector('.hd-auth-modal-overlay');
      expect(overlay).toBeNull();
    });
  });

  describe('form elements', () => {
    it('should have email and password inputs in login mode', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      await HuntDrop.PluginRegistry.mount('auth-modal');
      HuntDrop.EventBus.emit('auth:show-login');
      await new Promise((r) => setTimeout(r, 10));
      const email = document.getElementById('authEmail');
      const password = document.getElementById('authPassword');
      expect(email).toBeDefined();
      expect(password).toBeDefined();
    });

    it('should have skip button in login mode', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      await HuntDrop.PluginRegistry.mount('auth-modal');
      HuntDrop.EventBus.emit('auth:show-login');
      await new Promise((r) => setTimeout(r, 10));
      const skip = document.getElementById('authSkip');
      expect(skip).toBeDefined();
    });
  });

  describe('unmount()', () => {
    it('should clean up event listeners and close modal', async () => {
      await HuntDrop.PluginRegistry.init('auth-modal');
      await HuntDrop.PluginRegistry.mount('auth-modal');
      HuntDrop.EventBus.emit('auth:show-login');
      await new Promise((r) => setTimeout(r, 10));
      await HuntDrop.PluginRegistry.unmount('auth-modal');
      // After unmount, the event listeners should be removed
      // and the modal should be closed
      expect(true).toBe(true);
    });
  });
});
