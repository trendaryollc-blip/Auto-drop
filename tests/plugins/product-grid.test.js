// ============================================================================
// TESTS: plugins/product-grid.js — Product Grid UI
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('product-grid plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/product-grid.js']));
    plugin = HuntDrop.PluginRegistry.get('product-grid');
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('product-grid');
      expect(plugin.name).toBe('Product Grid');
    });
  });

  describe('init()', () => {
    it('should init without errors', async () => {
      await HuntDrop.PluginRegistry.init('product-grid');
      expect(HuntDrop.PluginRegistry.get('product-grid')._initialized).toBe(true);
    });
  });

  describe('mount()', () => {
    it('should mount and register search:results listener', async () => {
      await HuntDrop.PluginRegistry.init('product-grid');
      await HuntDrop.PluginRegistry.mount('product-grid');
      expect(HuntDrop.PluginRegistry.get('product-grid')._mounted).toBe(true);
    });

    it('should not mount if container missing', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('product-grid');
      await HuntDrop.PluginRegistry.mount('product-grid');
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('search:results event handling', () => {
    beforeEach(async () => {
      await HuntDrop.PluginRegistry.init('product-grid');
      await HuntDrop.PluginRegistry.mount('product-grid');
    });

    it('should render products on search:results event', async () => {
      const products = [createSampleProduct({ id: 1 }), createSampleProduct({ id: 2, title: 'Second Product' })];
      // The EventBus listener was registered during mount, so emit should trigger it
      await HuntDrop.EventBus.emit('search:results', { results: products, total: 2 });
      const grid = document.getElementById('productsGrid');
      expect(grid.children.length).toBeGreaterThanOrEqual(1);
    });

    it('should render product card with title', async () => {
      const product = createSampleProduct({ title: 'Amazing Widget' });
      await HuntDrop.EventBus.emit('search:results', { results: [product], total: 1 });
      const grid = document.getElementById('productsGrid');
      expect(grid.innerHTML).toContain('Amazing Widget');
    });

    it('should render product card with price', async () => {
      const product = createSampleProduct({ price: 19.99 });
      await HuntDrop.EventBus.emit('search:results', { results: [product], total: 1 });
      const grid = document.getElementById('productsGrid');
      expect(grid.innerHTML).toContain('$19.99');
    });

    it('should render score with appropriate class', async () => {
      const product = createSampleProduct({ score: 90 });
      await HuntDrop.EventBus.emit('search:results', { results: [product], total: 1 });
      const grid = document.getElementById('productsGrid');
      expect(grid.innerHTML).toContain('score-excellent');
    });

    it('should render badges', async () => {
      const product = createSampleProduct({ badges: ['trending', 'hot'] });
      await HuntDrop.EventBus.emit('search:results', { results: [product], total: 1 });
      const grid = document.getElementById('productsGrid');
      expect(grid.innerHTML).toContain('badge-trending');
      expect(grid.innerHTML).toContain('badge-hot');
    });

    it('should render platform name', async () => {
      const product = createSampleProduct({ platform: 'amazon' });
      await HuntDrop.EventBus.emit('search:results', { results: [product], total: 1 });
      const grid = document.getElementById('productsGrid');
      expect(grid.innerHTML).toContain('Amazon');
    });

    it('should render competition with color', async () => {
      const product = createSampleProduct({ competition: 'low' });
      await HuntDrop.EventBus.emit('search:results', { results: [product], total: 1 });
      const grid = document.getElementById('productsGrid');
      expect(grid.innerHTML).toContain('Low');
    });

    it('should render supplier name', async () => {
      const product = createSampleProduct();
      await HuntDrop.EventBus.emit('search:results', { results: [product], total: 1 });
      const grid = document.getElementById('productsGrid');
      expect(grid.innerHTML).toContain(product.suppliers[0].name);
    });

    it('should render Full Analysis button', async () => {
      const product = createSampleProduct();
      await HuntDrop.EventBus.emit('search:results', { results: [product], total: 1 });
      const grid = document.getElementById('productsGrid');
      expect(grid.innerHTML).toContain('Full Analysis');
    });

    it('should update results count', async () => {
      const products = [createSampleProduct()];
      await HuntDrop.EventBus.emit('search:results', { results: products, total: 1 });
      const count = document.getElementById('resultsCount');
      expect(count.textContent).toContain('1');
    });

    it('should clear grid on new search results', async () => {
      const grid = document.getElementById('productsGrid');
      grid.innerHTML = '<div>old content</div>';
      await HuntDrop.EventBus.emit('search:results', { results: [], total: 0 });
      expect(grid.children.length).toBe(0);
    });

    it('should handle missing grid gracefully', async () => {
      document.getElementById('productsGrid').remove();
      // Should not throw
      await HuntDrop.EventBus.emit('search:results', { results: [], total: 0 });
      expect(true).toBe(true);
    });

    it('should emit product:analyze on card click', async () => {
      const product = createSampleProduct({ id: 42 });
      await HuntDrop.EventBus.emit('search:results', { results: [product], total: 1 });

      const analyzeCb = vi.fn();
      HuntDrop.EventBus.on('product:analyze', analyzeCb);

      const card = document.querySelector('.product-card');
      card.click();
      expect(analyzeCb).toHaveBeenCalledWith({ id: '42' });
    });
  });
});
