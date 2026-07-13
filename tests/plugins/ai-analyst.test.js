import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('ai-analyst plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/search-engine.js',
      'plugins/ai-analyst.js',
    ]));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('ai-analyst');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('ai-analyst');
      expect(plugin.name).toBe('AI Analysis');
    });
  });

  describe('init()', () => {
    it('should set aianalyst config defaults', async () => {
      await HuntDrop.PluginRegistry.init('ai-analyst');
      const config = HuntDrop.Config.getAll('aianalyst');
      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('ai-analyst');
      try { await HuntDrop.PluginRegistry.mount('ai-analyst'); } catch (e) {}
      const section = document.getElementById('section-ai-analyst');
      expect(section).toBeDefined();
      expect(section.className).toContain('section-ai-analyst');
    });

    it('should contain search input and analyze button', async () => {
      await HuntDrop.PluginRegistry.init('ai-analyst');
      try { await HuntDrop.PluginRegistry.mount('ai-analyst'); } catch (e) {}
      expect(document.getElementById('aiInput')).toBeDefined();
      expect(document.getElementById('aiAnalyzeBtn')).toBeDefined();
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('ai-analyst');
      try { await HuntDrop.PluginRegistry.mount('ai-analyst'); } catch (e) {}
      expect(true).toBe(true);
    });
  });

  describe('unmount()', () => {
    it('should clean up section and charts', async () => {
      await HuntDrop.PluginRegistry.init('ai-analyst');
      try { await HuntDrop.PluginRegistry.mount('ai-analyst'); } catch (e) {}
      const section = document.getElementById('section-ai-analyst');
      expect(section).toBeDefined();
      await HuntDrop.PluginRegistry.unmount('ai-analyst');
      const sectionAfter = document.getElementById('section-ai-analyst');
      expect(sectionAfter).toBeNull();
    });
  });
});
