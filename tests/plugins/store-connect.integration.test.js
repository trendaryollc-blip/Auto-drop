import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupDashboardDOM, loadCoreWithPlugins } from '../setup.js';

describe('Store Connect frontend integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDashboardDOM();

    // backend URL will be set after loading core/plugins to avoid being overwritten

    // Mock fetch responses based on endpoint
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url.endsWith('/status')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: {} }) });
      }
      if (url.endsWith('/connect')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { platform: 'trendaryo', config: opts && JSON.parse(opts.body).config },
            }),
        });
      }
      if (url.endsWith('/test')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: { status: 'ok' } }) });
      }
      if (url.endsWith('/push')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { status: 'ok', pushed: JSON.parse(opts.body).products.length, results: [{ success: true }] },
            }),
        });
      }
      if (url.endsWith('/history')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ success: false }) });
    });
  });

  it('should save, test, and push via backend endpoints', async () => {
    const { HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/store-connect.js']);

    // Provide a backend base that includes /api so plugin builds correct URL
    HuntDrop.BACKEND_URL = 'http://localhost:3001/api';

    // Mount plugin section
    await HuntDrop.PluginRegistry.init('store-connect');
    await HuntDrop.PluginRegistry.mount('store-connect');

    // Ensure backend appears available
    expect(HuntDrop.StoreConnect.isBackendAvailable()).toBe(true);
    const backendUrl = HuntDrop.StoreConnect.getBackendUrl();
    expect(backendUrl).toContain('/store-connect');

    // Save connection
    const saveRes = await HuntDrop.StoreConnect.saveConnection('trendaryo', { storeId: 's1', apiKey: 'k1' });
    expect(saveRes).toBeDefined();
    expect(saveRes.success).toBe(true);

    // Test connection
    const testRes = await HuntDrop.StoreConnect.testConnection('trendaryo');
    expect(testRes).toBeDefined();
    expect(testRes.success).toBe(true);

    // Push a product
    const product = { id: 'p1', title: 'Product 1' };
    const pushRes = await HuntDrop.StoreConnect.pushProduct(product, 'active');
    expect(pushRes).toBeDefined();
    expect(pushRes.success).toBe(true);
    expect(pushRes.data.pushed).toBe(1);

    // Verify fetch was called for connect, test, and push
    const calls = fetch.mock.calls.map((c) => c[0]);
    expect(calls.some((u) => u.endsWith('/connect'))).toBe(true);
    expect(calls.some((u) => u.endsWith('/test'))).toBe(true);
    expect(calls.some((u) => u.endsWith('/push'))).toBe(true);
  });
});
