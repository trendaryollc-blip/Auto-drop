// ============================================================================
// PLUGIN: Platform Data Adapters
// ============================================================================
// Each platform has its own adapter. To add a new platform:
// 1. Create a new adapter object below
// 2. Register it with DataLayer.registerAdapter()
// That's it. The rest of the app works automatically.
// ============================================================================
(function(){
const {DataLayer,EventBus} = window.HuntDrop;
const Mock = window.MockAPI;

// ===== Generic Search Adapter =====
function createAdapter(platformName) {
  return {
    search: async (query, filters = {}) => {
      var fuzzy = window.HuntDrop.fuzzyMatch;
      var allProducts = Mock.getProducts();
      var results = allProducts.filter(p => {
        if (platformName !== 'all' && p.platform !== platformName) return false;
        if (query) {
          var q = query.toLowerCase();
          var match = p.title.toLowerCase().indexOf(q) !== -1
            || p.keywords.some(function(k){return k.toLowerCase().indexOf(q) !== -1;})
            || p.category.toLowerCase().indexOf(q) !== -1;
          if (!match && fuzzy) {
            match = fuzzy(p.title, query)
              || p.keywords.some(function(k){return fuzzy(k, query);})
              || fuzzy(p.category, query);
          }
          if (!match) return false;
        }
        if (filters) {
          if (filters.platform && filters.platform !== 'all' && p.platform !== filters.platform) return false;
          if (filters.priceMax && p.price > filters.priceMax) return false;
          if (filters.minScore && p.score < filters.minScore) return false;
          if (filters.competition && filters.competition !== 'all' && p.competition !== filters.competition) return false;
          if (filters.margin && filters.margin !== 'all' && p.margin < parseInt(filters.margin)) return false;
        }
        return true;
      });
      if (filters && filters.sort) {
        switch(filters.sort) {
          case 'score': results.sort(function(a,b){return b.score-a.score;}); break;
          case 'trending': results.sort(function(a,b){return b.salesVelocity-a.salesVelocity;}); break;
          case 'profit': results.sort(function(a,b){return b.margin-a.margin;}); break;
          case 'velocity': results.sort(function(a,b){return b.salesVelocity-a.salesVelocity;}); break;
          case 'competition': results.sort(function(a,b){return a.competition==='low'?-1:b.competition==='low'?1:0;}); break;
          case 'price-low': results.sort(function(a,b){return a.price-b.price;}); break;
          case 'price-high': results.sort(function(a,b){return b.price-a.price;}); break;
        }
      }
      return results;
    },
    getProduct: async (id) => Mock.getProduct(id),
    getTrends: async (id) => { var t = Mock.getTrends(id); return t.trendData || []; },
    getSuppliers: async (id) => { var p = Mock.getProduct(id); return p ? p.suppliers : []; },
    getPrices: async (id) => { var p = Mock.getProduct(id); return p ? p.platformPrices : {}; }
  };
}

// ===== Register Adapters for Each Platform (skip 'all' — searchAll aggregates automatically) =====
const platforms = ['aliexpress','amazon','shopify','ebay','temu','tiktok','etsy','cjdropshipping','dhgate','wish'];
platforms.forEach(p => DataLayer.registerAdapter(p, createAdapter(p)));

// ===== Store All Products Globally =====
window.HuntDrop.ALL_PRODUCTS = Mock.getProducts();

EventBus.emit('adapters:registered', { platforms });
console.log('[DataAdapters] Registered ' + platforms.length + ' adapters. Products: ' + window.HuntDrop.ALL_PRODUCTS.length);
})();
