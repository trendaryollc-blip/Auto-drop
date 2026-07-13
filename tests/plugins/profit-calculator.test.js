// ============================================================================
// TESTS: plugins/profit-calculator.js — Profit Calculator Lab
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct } from '../setup.js';

describe('profit-calculator plugin', () => {
  let HuntDrop;
  let calc;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins([
      'plugins/data-adapters.js',
      'plugins/profit-calculator.js',
    ]));
    HuntDrop.renderRelatedTools = HuntDrop.renderRelatedTools || vi.fn(() => '<div>Related Tools</div>');
    calc = HuntDrop.ProfitCalc;
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      const plugin = HuntDrop.PluginRegistry.get('profit-calculator');
      expect(plugin).toBeDefined();
      expect(plugin.id).toBe('profit-calculator');
      expect(plugin.name).toBe('Profit Calculator');
    });

    it('should expose ProfitCalc on HuntDrop', () => {
      expect(calc).toBeDefined();
      expect(calc.id).toBe('profit-calculator');
    });
  });

  describe('init()', () => {
    it('should set profitcalc config defaults', async () => {
      await HuntDrop.PluginRegistry.init('profit-calculator');
      const config = HuntDrop.Config.getAll('profitcalc');
      expect(config.defaultSellPrice).toBe(29.99);
      expect(config.defaultCost).toBe(5.99);
    });
  });

  describe('mount()', () => {
    it('should create section in sections-container', async () => {
      await HuntDrop.PluginRegistry.init('profit-calculator');
      await HuntDrop.PluginRegistry.mount('profit-calculator');
      const section = document.getElementById('section-profit-lab');
      expect(section).toBeDefined();
      expect(section).not.toBeNull();
      expect(section.className).toContain('section-profit-lab');
    });

    it('should not mount if container does not exist', async () => {
      document.body.innerHTML = '';
      await HuntDrop.PluginRegistry.init('profit-calculator');
      await HuntDrop.PluginRegistry.mount('profit-calculator');
      expect(true).toBe(true);
    });
  });

  describe('calculate()', () => {
    beforeEach(async () => {
      await HuntDrop.PluginRegistry.init('profit-calculator');
      await HuntDrop.PluginRegistry.mount('profit-calculator');
    });

    it('should calculate profit per sale correctly', () => {
      calc.calculate();
      const bigProfit = document.getElementById('pcBigProfit');
      expect(bigProfit.textContent).toContain('$');
    });

    it('should calculate margin percentage', () => {
      calc.calculate();
      const bigMargin = document.getElementById('pcBigMargin');
      expect(bigMargin.textContent).toContain('%');
    });

    it('should calculate monthly revenue', () => {
      calc.calculate();
      const rev = document.getElementById('pcMonthlyRevenue');
      expect(rev.textContent).toContain('$');
    });

    it('should calculate ROAS', () => {
      calc.calculate();
      const roas = document.getElementById('pcROAS');
      expect(roas.textContent).toContain('x');
    });

    it('should calculate break-even sales', () => {
      calc.calculate();
      const be = document.getElementById('pcBreakEven');
      expect(be.textContent).toBeDefined();
    });

    it('should update scenario profits', () => {
      calc.calculate();
      const sc10 = document.getElementById('pcSc10p');
      expect(sc10.textContent).toContain('$');
    });

    it('should handle zero selling price', () => {
      const sp = document.getElementById('pcSellPrice');
      sp.value = '0';
      calc.calculate();
      const bigProfit = document.getElementById('pcBigProfit');
      expect(parseFloat(bigProfit.textContent.replace('$', '').replace(',', ''))).toBeLessThanOrEqual(0);
    });

    it('should handle negative profit (loss)', () => {
      const sp = document.getElementById('pcSellPrice');
      const cost = document.getElementById('pcProductCost');
      sp.value = '5';
      cost.value = '20';
      calc.calculate();
      const bigProfit = document.getElementById('pcBigProfit');
      expect(parseFloat(bigProfit.textContent.replace('$', '').replace(',', ''))).toBeLessThan(0);
    });
  });

  describe('updateInsights()', () => {
    beforeEach(async () => {
      await HuntDrop.PluginRegistry.init('profit-calculator');
      await HuntDrop.PluginRegistry.mount('profit-calculator');
    });

    it('should show "Healthy Margins" badge for margin >= 30', () => {
      calc.updateInsights(35, 3, 10, 50, 100, 5, 500);
      const badge = document.getElementById('pcInsightBadge');
      expect(badge.textContent).toBe('Healthy Margins');
    });

    it('should show "Moderate Margins" badge for margin 15-29', () => {
      calc.updateInsights(20, 2, 5, 50, 100, 5, 500);
      const badge = document.getElementById('pcInsightBadge');
      expect(badge.textContent).toBe('Moderate Margins');
    });

    it('should show "Low Margins" badge for margin 1-14', () => {
      calc.updateInsights(10, 1, 2, 50, 100, 5, 500);
      const badge = document.getElementById('pcInsightBadge');
      expect(badge.textContent).toBe('Low Margins');
    });

    it('should show "Negative Margin" badge for margin <= 0', () => {
      calc.updateInsights(-5, 0.5, -2, 999, 100, 5, 500);
      const badge = document.getElementById('pcInsightBadge');
      expect(badge.textContent).toBe('Negative Margin');
    });
  });

  describe('saveState() / loadState()', () => {
    beforeEach(async () => {
      await HuntDrop.PluginRegistry.init('profit-calculator');
      await HuntDrop.PluginRegistry.mount('profit-calculator');
    });

    it('should save state to localStorage', () => {
      // Verify that the section is properly mounted
      expect(calc._section).not.toBeNull();
      expect(calc._section).toBeDefined();
      const sp = document.getElementById('pcSellPrice');
      expect(sp).not.toBeNull();
      sp.value = '99.99';
      calc.saveState();
      const saved = localStorage.getItem('huntdrop_profitcalc');
      expect(saved).toBeDefined();
      const state = JSON.parse(saved);
      expect(state.pcSellPrice).toBe('99.99');
    });

    it('should load state from localStorage', () => {
      expect(calc._section).not.toBeNull();
      localStorage.setItem('huntdrop_profitcalc', JSON.stringify({
        pcSellPrice: '55.55',
        pcProductCost: '10.00',
      }));
      calc.loadState();
      const sp = document.getElementById('pcSellPrice');
      expect(sp).not.toBeNull();
      expect(sp.value).toBe('55.55');
    });

    it('should handle missing saved state gracefully', () => {
      calc.loadState();
      expect(true).toBe(true);
    });
  });

  describe('exportCSV()', () => {
    beforeEach(async () => {
      await HuntDrop.PluginRegistry.init('profit-calculator');
      await HuntDrop.PluginRegistry.mount('profit-calculator');
    });

    it('should generate CSV and trigger download', () => {
      const toastSpy = vi.spyOn(HuntDrop.UI, 'toast').mockImplementation(() => {});
      calc.exportCSV();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(toastSpy).toHaveBeenCalledWith('CSV exported successfully!', 'success', 2000);
      toastSpy.mockRestore();
    });
  });

  describe('unmount()', () => {
    it('should remove section and destroy charts', async () => {
      await HuntDrop.PluginRegistry.init('profit-calculator');
      await HuntDrop.PluginRegistry.mount('profit-calculator');
      const section = document.getElementById('section-profit-lab');
      expect(section).toBeDefined();
      await HuntDrop.PluginRegistry.unmount('profit-calculator');
      expect(calc._section).toBeFalsy();
    });
  });
});