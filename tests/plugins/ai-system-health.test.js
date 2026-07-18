import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, createSampleProduct } from '../setup.js';

describe('ai-system-health plugin', () => {
  let HuntDrop;
  let plugin;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/ai-system-health.js']));
    plugin = HuntDrop.AISystemHealth;
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(HuntDrop.PluginRegistry.get('ai-system-health')).toBeDefined();
    });

    it('should expose AISystemHealth on HuntDrop', () => {
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('ai-system-health');
    });
  });

  describe('runAllChecks()', () => {
    it('should return array of check results', () => {
      const checks = plugin.runAllChecks();
      expect(Array.isArray(checks)).toBe(true);
      expect(checks.length).toBeGreaterThan(0);
    });

    it('each check should have id, name, pass, issues, severity', () => {
      const checks = plugin.runAllChecks();
      checks.forEach((c) => {
        expect(c.id).toBeDefined();
        expect(c.name).toBeDefined();
        expect(typeof c.pass).toBe('boolean');
        expect(Array.isArray(c.issues)).toBe(true);
        expect(c.severity).toBeDefined();
      });
    });
  });

  describe('checkProductData()', () => {
    it('should validate product fields', () => {
      const check = plugin.checkProductData();
      expect(check.id).toBe('product-data');
    });

    it('should detect missing titles', () => {
      HuntDrop.ALL_PRODUCTS = [{ ...createSampleProduct(), title: '' }];
      const check = plugin.checkProductData();
      expect(check.issues.length).toBeGreaterThan(0);
    });
  });

  describe('checkProfitData()', () => {
    it('should validate margin sanity', () => {
      const check = plugin.checkProfitData();
      expect(check.id).toBe('profit-data');
    });
  });

  describe('checkSupplierData()', () => {
    it('should validate supplier fields', () => {
      const check = plugin.checkSupplierData();
      expect(check.id).toBe('supplier-data');
    });
  });

  describe('getHealthSummary()', () => {
    it('should return health summary object', () => {
      const summary = plugin.getHealthSummary();
      expect(summary.score).toBeDefined();
      expect(typeof summary.score).toBe('number');
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.passed).toBeDefined();
      expect(summary.issues).toBeDefined();
      expect(Array.isArray(summary.issues)).toBe(true);
    });

    it('should count passed checks', () => {
      const summary = plugin.getHealthSummary();
      expect(summary.passed).toBeGreaterThanOrEqual(0);
      expect(summary.passed + summary.failed).toBe(summary.total);
    });
  });

  describe('Individual checks', () => {
    it('checkAdapters() should validate adapter count', () => {
      const check = plugin.checkAdapters();
      expect(check.id).toBe('adapters');
    });

    it('checkPlugins() should check for registered plugins', () => {
      const check = plugin.checkPlugins();
      expect(check.id).toBe('plugins');
    });

    it('checkNavigation() should validate sections exist', () => {
      const check = plugin.checkNavigation();
      expect(check.id).toBe('navigation');
    });

    it('checkRelatedTools() should validate tool links', () => {
      const check = plugin.checkRelatedTools();
      expect(check.id).toBe('related-tools');
    });

    it('checkDataIntegrity() should validate data types', () => {
      const check = plugin.checkDataIntegrity();
      expect(check.id).toBe('data-integrity');
    });
  });
});
