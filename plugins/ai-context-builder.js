// ============================================================================
// PLUGIN: AI Context Builder — Gathers full app state for AI
// ============================================================================
(function(){
const {PluginRegistry,Config} = window.HuntDrop;

const AIContextBuilder = {
  id: 'ai-context-builder',
  name: 'AI Context Builder',
  version: '1.0.0',

  init(_ctx) {},

  mount(_ctx) {},

  unmount(_ctx) {},

  buildFullContext() {
    return {
      products: this.getProducts(),
      userState: this.getUserState(),
      toolStates: this.getToolStates(),
      systemHealth: this.getSystemHealth(),
      conversation: this.getConversation(),
      searchContext: this.getSearchContext()
    };
  },

  getProducts() {
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    return products.map(function(p) {
      return {
        id: p.id,
        title: p.title,
        platform: p.platform,
        price: p.price,
        originalPrice: p.originalPrice,
        margin: p.margin,
        score: p.score,
        competition: p.competition,
        demand: p.demand,
        riskScore: p.riskScore,
        salesVelocity: p.salesVelocity,
        marketSaturation: p.marketSaturation,
        adSpendAvg: p.adSpendAvg,
        cpaAvg: p.cpaAvg,
        rating: p.rating,
        reviews: p.reviews,
        orders: p.orders,
        shipFrom: p.shipFrom,
        category: p.category,
        keywords: p.keywords,
        suppliers: (p.suppliers || []).map(function(s) {
          return { name: s.name, location: s.location, rating: s.rating, orders: s.orders, responseTime: s.responseTime, verified: s.verified };
        }),
        platformPrices: p.platformPrices || {},
        trendData: p.trendData,
        seasonality: p.seasonality,
        audience: p.audience,
        aiInsight: p.aiInsight
      };
    });
  },

  getUserState() {
    return {
      currentPage: Config.get('app.currentSection') || 'dashboard',
      viewedProducts: Config.get('coach.viewedProducts') || [],
      budget: Config.get('user.budget') || null,
      experienceLevel: Config.get('user.experience') || 'beginner',
      goals: Config.get('user.goals') || [],
      lastActivity: Config.get('user.lastActivity') || null
    };
  },

  getToolStates() {
    return {
      profitCalculator: {
        lastCalculation: Config.get('profitCalc.lastResult') || null
      },
      adBudget: {
        lastAllocation: Config.get('adBudget.lastAllocation') || null,
        totalBudget: Config.get('adBudget.total') || 0
      },
      storeHealth: {
        lastScore: Config.get('storeHealth.lastScore') || null,
        alerts: Config.get('storeHealth.alerts') || []
      },
      searchEngine: {
        lastQuery: Config.get('search.lastQuery') || null,
        lastResults: Config.get('search.lastResults') || [],
        resultCount: Config.get('search.resultCount') || 0
      }
    };
  },

  getSystemHealth() {
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    const issues = [];
    const warnings = [];

    products.forEach(function(p) {
      if (!p.price || p.price <= 0) issues.push(p.title + ': invalid price');
      if (!p.suppliers || p.suppliers.length === 0) issues.push(p.title + ': no suppliers');
      if (p.margin < 0) issues.push(p.title + ': negative margin');
      if (p.margin > 85) warnings.push(p.title + ': margin suspiciously high (' + p.margin + '%)');
      if (p.riskScore > 70) warnings.push(p.title + ': high risk score');
      if (p.platformPrices) {
        Object.keys(p.platformPrices).forEach(function(plat) {
          if (p.platformPrices[plat] < p.price) {
            warnings.push(p.title + ': selling below cost on ' + plat);
          }
        });
      }
    });

    const adapterCount = window.HuntDrop.DataLayer ? window.HuntDrop.DataLayer.getAdapters().length : 0;
    if (adapterCount < 10) issues.push('Only ' + adapterCount + '/10 platform adapters loaded');

    const sections = document.querySelectorAll('.section[id]').length;
    const navLinks = document.querySelectorAll('[data-section]').length;
    if (navLinks > sections + 5) warnings.push('Some navigation links may be broken');

    let score = 100;
    score -= issues.length * 10;
    score -= warnings.length * 3;
    score = Math.max(0, Math.min(100, score));

    return {
      score: score,
      issues: issues,
      warnings: warnings,
      healthy: issues.length === 0,
      pluginsLoaded: document.querySelectorAll('script[src*="plugins/"]').length,
      sectionsFound: sections
    };
  },

  getConversation() {
    return {
      history: Config.get('coach.history') || [],
      topicsDiscussed: Config.get('coach.topics') || [],
      messageCount: (Config.get('coach.history') || []).length
    };
  },

  getSearchContext() {
    return {
      lastQuery: Config.get('search.lastQuery') || null,
      activeFilters: {
        platform: Config.get('search.platform') || 'all',
        sort: Config.get('search.sort') || 'score'
      }
    };
  },

  getProductsSummary() {
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    if (products.length === 0) return 'No products loaded.';
    return products.map(function(p) {
      return p.title + ' (' + p.platform + ') - Score:' + p.score + ' Margin:' + p.margin + '% Price:$' + p.price + ' Competition:' + p.competition;
    }).join('\n');
  },

  getTopProducts(count) {
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    return products.sort(function(a, b) { return b.score - a.score; }).slice(0, count || 3);
  },

  getProductsByCategory(category) {
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    return products.filter(function(p) {
      return p.category && p.category.toLowerCase().indexOf(category.toLowerCase()) > -1;
    });
  },

  getProductByTitle(title) {
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    const lowerTitle = title.toLowerCase();
    return products.find(function(p) {
      return p.title.toLowerCase().indexOf(lowerTitle) > -1 ||
             p.keywords.some(function(k) { return k.toLowerCase().indexOf(lowerTitle) > -1; });
    });
  }
};

window.HuntDrop.AIContextBuilder = AIContextBuilder;
PluginRegistry.register('ai-context-builder', AIContextBuilder);
})();
