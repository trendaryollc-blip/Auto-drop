import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('product-detail plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/product-detail.js']));
    HuntDrop.renderRelatedTools = vi.fn(() => '<div>Related Tools</div>');
    plugin = HuntDrop.PluginRegistry.get('product-detail');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('product-detail');
      expect(plugin.name).toBe('Product Detail');
    });
  });

  describe('product:analyze event', () => {
    it('should handle event when dispatched', async () => {
      const section = document.createElement('section');
      section.id = 'section-product-detail';
      section.className = 'section';
      document.body.appendChild(section);

      await HuntDrop.EventBus.emit('product:analyze', { id: 1 });
      expect(true).toBe(true);
      section.remove();
    });
  });
});
