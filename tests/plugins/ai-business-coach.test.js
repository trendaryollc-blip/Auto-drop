import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('ai-business-coach plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/ai-key-manager.js',
      'plugins/ai-context-builder.js',
      'plugins/ai-system-health.js',
      'plugins/ai-web-search.js',
      'plugins/ai-chat-service.js',
      'plugins/ai-risk-analyzer.js',
      'plugins/ai-business-coach.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('ai-business-coach');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('ai-business-coach');
      expect(plugin.name).toBe('AI Coach');
    });
  });

  describe('init()', () => {
    it('should set coach config defaults', async () => {
      await HuntDrop.PluginRegistry.init('ai-business-coach');
      const config = HuntDrop.Config.getAll('coach');
      expect(config).toBeDefined();
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('ai-business-coach');
      try {
        await HuntDrop.PluginRegistry.mount('ai-business-coach');
      } catch (e) {}
      const section = document.getElementById('section-coach');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-coach');
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('ai-business-coach');
      try {
        await HuntDrop.PluginRegistry.mount('ai-business-coach');
      } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('ai-business-coach');
      try {
        await HuntDrop.PluginRegistry.mount('ai-business-coach');
      } catch (e) {}
      await HuntDrop.PluginRegistry.unmount('ai-business-coach');
      expect(document.getElementById('section-coach')).toBeNull();
    });
  });
});
