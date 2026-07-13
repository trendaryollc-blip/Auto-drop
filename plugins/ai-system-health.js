// ============================================================================
// PLUGIN: AI System Health — Detects issues that could cause problems
// ============================================================================
(function(){
const {PluginRegistry,Config,UI} = window.HuntDrop;

const AISystemHealth = {
  id: 'ai-system-health',
  name: 'AI System Health',
  version: '1.0.0',

  init(ctx) {},

  mount(ctx) {},

  unmount(ctx) {},

  runAllChecks() {
    var results = [];
    results.push(this.checkProductData());
    results.push(this.checkAdapters());
    results.push(this.checkPlugins());
    results.push(this.checkProfitData());
    results.push(this.checkSupplierData());
    results.push(this.checkNavigation());
    results.push(this.checkRelatedTools());
    results.push(this.checkDataIntegrity());
    return results;
  },

  checkProductData() {
    var products = window.HuntDrop.ALL_PRODUCTS || [];
    var issues = [];
    products.forEach(function(p) {
      if (!p.title) issues.push('Product missing title');
      if (!p.price || p.price <= 0) issues.push(p.title + ': invalid price ($' + p.price + ')');
      if (!p.platform) issues.push(p.title + ': missing platform');
      if (!p.suppliers || p.suppliers.length === 0) issues.push(p.title + ': no suppliers');
      if (!p.trendData || p.trendData.length === 0) issues.push(p.title + ': no trend data');
      if (p.margin < 0) issues.push(p.title + ': negative margin (' + p.margin + '%)');
      if (!p.audience) issues.push(p.title + ': no audience data');
    });
    return { id: 'product-data', name: 'Product Data Integrity', pass: issues.length === 0, issues: issues, severity: issues.length > 0 ? 'high' : 'none' };
  },

  checkAdapters() {
    var adapterCount = window.HuntDrop.DataLayer ? window.HuntDrop.DataLayer.getAdapters().length : 0;
    var issues = [];
    if (adapterCount < 10) issues.push('Only ' + adapterCount + '/10 platform adapters loaded');
    return { id: 'adapters', name: 'Platform Adapters', pass: adapterCount >= 10, issues: issues, severity: adapterCount < 10 ? 'medium' : 'none' };
  },

  checkPlugins() {
    var plugins = window.HuntDrop.PluginRegistry ? window.HuntDrop.PluginRegistry.getAll() : [];
    var issues = [];
    plugins.forEach(function(p) {
      if (p.error) issues.push('Plugin ' + p.id + ': ' + p.error);
    });
    return { id: 'plugins', name: 'Plugin System', pass: issues.length === 0, issues: issues, severity: issues.length > 0 ? 'high' : 'none' };
  },

  checkProfitData() {
    var products = window.HuntDrop.ALL_PRODUCTS || [];
    var issues = [];
    var warnings = [];
    products.forEach(function(p) {
      if (p.margin > 90) warnings.push(p.title + ': margin suspiciously high (' + p.margin + '%)');
      if (p.margin < 5) issues.push(p.title + ': margin too low (' + p.margin + '%)');
      if (p.platformPrices) {
        if (p.platformPrices.amazon && p.platformPrices.amazon < p.price) {
          issues.push(p.title + ': Amazon price below cost');
        }
        if (p.platformPrices.shopify && p.platformPrices.shopify < p.price) {
          issues.push(p.title + ': Shopify price below cost');
        }
      }
    });
    return { id: 'profit-data', name: 'Profit Data Integrity', pass: issues.length === 0, issues: issues.concat(warnings), severity: issues.length > 0 ? 'high' : warnings.length > 0 ? 'low' : 'none' };
  },

  checkSupplierData() {
    var products = window.HuntDrop.ALL_PRODUCTS || [];
    var issues = [];
    products.forEach(function(p) {
      (p.suppliers || []).forEach(function(s) {
        if (s.rating < 4.0) issues.push(s.name + ': low rating (' + s.rating + ')');
        if (parseInt(String(s.orders).replace(/[^0-9]/g, '')) < 1000) issues.push(s.name + ': very low order count');
      });
    });
    return { id: 'supplier-data', name: 'Supplier Data', pass: issues.length === 0, issues: issues, severity: issues.length > 0 ? 'medium' : 'none' };
  },

  checkNavigation() {
    var sections = document.querySelectorAll('.section[id]');
    var navItems = document.querySelectorAll('[data-section]');
    var sectionIds = [];
    sections.forEach(function(s) { sectionIds.push(s.id); });
    var issues = [];
    navItems.forEach(function(n) {
      var targetId = 'section-' + n.getAttribute('data-section');
      if (sectionIds.indexOf(targetId) === -1) {
        issues.push('Nav link points to missing section: ' + targetId);
      }
    });
    return { id: 'navigation', name: 'Section Navigation', pass: issues.length === 0, issues: issues, severity: issues.length > 0 ? 'high' : 'none' };
  },

  checkRelatedTools() {
    var links = document.querySelectorAll('.related-tool-card[onclick]');
    var sections = document.querySelectorAll('.section[id]');
    var sectionIds = [];
    sections.forEach(function(s) { sectionIds.push(s.id); });
    var issues = [];
    links.forEach(function(link) {
      var onclick = link.getAttribute('onclick') || '';
      var match = onclick.match(/navigateTo\('([^']+)'\)/);
      if (match && sectionIds.indexOf(match[1]) === -1) {
        issues.push('Broken related tool link to: ' + match[1]);
      }
    });
    return { id: 'related-tools', name: 'Related Tools Links', pass: issues.length === 0, issues: issues, severity: issues.length > 0 ? 'medium' : 'none' };
  },

  checkDataIntegrity() {
    var products = window.HuntDrop.ALL_PRODUCTS || [];
    var issues = [];
    var requiredFields = ['title', 'price', 'platform', 'score', 'margin', 'competition'];
    products.forEach(function(p) {
      requiredFields.forEach(function(f) {
        if (p[f] === undefined || p[f] === null || p[f] === '') {
          issues.push(p.title + ': missing ' + f);
        }
      });
    });
    return { id: 'data-integrity', name: 'Data Integrity', pass: issues.length === 0, issues: issues, severity: issues.length > 0 ? 'high' : 'none' };
  },

  getHealthSummary() {
    var results = this.runAllChecks();
    var passed = results.filter(function(r) { return r.pass; }).length;
    var failed = results.filter(function(r) { return !r.pass; });
    var allIssues = [];
    failed.forEach(function(r) { allIssues = allIssues.concat(r.issues); });
    var highSeverity = failed.filter(function(r) { return r.severity === 'high'; });
    return {
      score: Math.round((passed / results.length) * 100),
      passed: passed,
      total: results.length,
      failed: failed.length,
      issues: allIssues,
      highSeverity: highSeverity.length,
      healthy: highSeverity.length === 0,
      results: results
    };
  },

  getProactiveWarnings() {
    var health = this.getHealthSummary();
    var warnings = [];
    if (health.highSeverity > 0) {
      warnings.push({
        type: 'critical',
        icon: '🚨',
        title: 'Critical Issues Detected',
        message: health.highSeverity + ' critical issue(s) found that could cause problems',
        issues: health.results.filter(function(r) { return r.severity === 'high' && !r.pass; }).map(function(r) {
          return r.name + ': ' + r.issues[0];
        })
      });
    }
    if (health.score < 80) {
      warnings.push({
        type: 'warning',
        icon: '⚠️',
        title: 'System Health Below Optimal',
        message: 'Health score is ' + health.score + '/100. Some features may not work correctly.'
      });
    }
    var products = window.HuntDrop.ALL_PRODUCTS || [];
    var lowMargin = products.filter(function(p) { return p.margin < 15; });
    if (lowMargin.length > 0) {
      warnings.push({
        type: 'info',
        icon: '💡',
        title: 'Low Margin Products',
        message: lowMargin.length + ' product(s) have margin below 15%. Consider repricing or dropping.',
        products: lowMargin.map(function(p) { return p.title + ' (' + p.margin + '%)'; })
      });
    }
    return warnings;
  }
};

window.HuntDrop.AISystemHealth = AISystemHealth;
PluginRegistry.register('ai-system-health', AISystemHealth);
})();
