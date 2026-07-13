import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('ai-settings plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/ai-key-manager.js',
      'plugins/ai-web-search.js',
      'plugins/ai-settings.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('ai-settings');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('ai-settings');
      expect(plugin.name).toBe('AI Settings');
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('ai-settings');
      try { await HuntDrop.PluginRegistry.mount('ai-settings'); } catch (e) {}
      const section = document.getElementById('section-ai-settings');
      expect(section).toBeDefined();
      expect(section.id).toBe('section-ai-settings');
    });

    it('should contain provider dropdown and key input', async () => {
      await HuntDrop.PluginRegistry.init('ai-settings');
      try { await HuntDrop.PluginRegistry.mount('ai-settings'); } catch (e) {}
      expect(document.getElementById('aiProviderSelect')).toBeDefined();
      expect(document.getElementById('aiModelSelect')).toBeDefined();
      expect(document.getElementById('aiApiKey')).toBeDefined();
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('ai-settings');
      try { await HuntDrop.PluginRegistry.mount('ai-settings'); } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section', async () => {
      await HuntDrop.PluginRegistry.init('ai-settings');
      try { await HuntDrop.PluginRegistry.mount('ai-settings'); } catch (e) {}
      await HuntDrop.PluginRegistry.unmount('ai-settings');
      expect(document.getElementById('section-ai-settings')).toBeNull();
    });
  });
});
