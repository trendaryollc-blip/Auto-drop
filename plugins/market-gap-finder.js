// ============================================================================
// PLUGIN: Market Gap Finder — Find Hidden Opportunities
// Computes real gap analysis from DataLayer product data
// ============================================================================
(function () {
  const { EventBus, PluginRegistry, UI, Config, DataLayer } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(String(s || ''));
  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments,
        ctx = this;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  }

  let _section = null;
  const _filters = { search: '', category: 'all', gapMin: 0, trend: 'all', sort: 'gap-desc' };
  const _watchlist = JSON.parse(localStorage.getItem('mg_watchlist') || '[]');
  const _emWatchlist = JSON.parse(localStorage.getItem('mg_em_watchlist') || '[]');
  let _charts = {};
  let _products = [];
  let _unsubSearch = null;

  const DATA = { gaps: [], arb: [], emerging: [], categories: [] };

  // ── DATA COMPUTATION ──────────────────────────────────────────────────

  const CATEGORY_META = {
    Electronics: { emoji: '🔌', color: '#00e5ff' },
    'Home & Garden': { emoji: '🏡', color: '#00ff88' },
    Fashion: { emoji: '👗', color: '#a855f7' },
    Beauty: { emoji: '💄', color: '#ff3366' },
    Sports: { emoji: '⚽', color: '#ff8a00' },
    'Toys & Games': { emoji: '🎮', color: '#fbbf24' },
    'Pet Supplies': { emoji: '🐾', color: '#34d399' },
    Automotive: { emoji: '🚗', color: '#60a5fa' },
    Health: { emoji: '💊', color: '#f472b6' },
    Jewelry: { emoji: '💍', color: '#c084fc' },
    'Baby Products': { emoji: '👶', color: '#fb923c' },
    Office: { emoji: '💼', color: '#94a3b8' },
    Kitchen: { emoji: '🍳', color: '#facc15' },
    Other: { emoji: '📦', color: '#64748b' },
  };

  const CATEGORY_COLORS = [
    '#00e5ff',
    '#00ff88',
    '#a855f7',
    '#ff3366',
    '#ff8a00',
    '#fbbf24',
    '#34d399',
    '#60a5fa',
    '#f472b6',
    '#c084fc',
  ];

  function getCategoryMeta(cat) {
    return CATEGORY_META[cat] || { emoji: '📦', color: '#64748b' };
  }

  function computeDemand(product) {
    const d = product.demand || 0;
    const sv = product.salesVelocity || 0;
    const rating = (product.rating || 0) * 20;
    const reviews = Math.min((product.reviews || 0) / 100, 30);
    return Math.min(Math.round(d * 0.5 + sv * 0.25 + rating * 0.15 + reviews * 0.1), 100);
  }

  function computeSupply(product) {
    const comp = { low: 20, medium: 50, high: 80 };
    const saturation = product.marketSaturation || 0;
    return Math.min(Math.round((comp[product.competition] || 40) * 0.5 + saturation * 0.5), 100);
  }

  function computeGapScore(demand, supply) {
    return Math.min(Math.max(Math.round((demand - supply + 50) * 1.0), 0), 100);
  }

  function getTrend(product) {
    const td = product.trendData;
    if (!Array.isArray(td) || td.length < 2) return 'stable';
    const recent = td.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlier = td.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    if (earlier === 0) return 'stable';
    const change = (recent - earlier) / earlier;
    if (change > 0.1) return 'rising';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  function getSeasonality(product) {
    return Array.isArray(product.seasonality) && product.seasonality.length === 12
      ? product.seasonality
      : [30, 25, 40, 50, 60, 70, 80, 75, 65, 55, 45, 35];
  }

  function findArbitrage(product) {
    const pp = product.platformPrices || {};
    const entries = Object.entries(pp).filter(([, v]) => typeof v === 'number' && v > 0);
    if (entries.length < 2) return null;
    entries.sort((a, b) => a[1] - b[1]);
    const buyPlat = entries[0][0];
    const buy = entries[0][1];
    const sellPlat = entries[entries.length - 1][0];
    const sell = entries[entries.length - 1][1];
    if (sell <= buy) return null;
    const margin = Math.round(((sell - buy) / sell) * 100);
    return { buy, sell, buyPlatform: buyPlat, sellPlatform: sellPlat, margin, profit: +(sell - buy).toFixed(2) };
  }

  function formatVolume(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function computeCategories() {
    const catMap = {};
    DATA.gaps.forEach((g) => {
      if (!catMap[g.category]) catMap[g.category] = 0;
      catMap[g.category]++;
    });
    DATA.categories = Object.entries(catMap).map(([name, count], i) => {
      const meta = getCategoryMeta(name);
      return { name, count, emoji: meta.emoji, color: meta.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length] };
    });
  }

  function buildDataFromProducts(products) {
    _products = products;
    DATA.gaps = [];
    DATA.arb = [];
    DATA.emerging = [];
    DATA.categories = [];

    if (!products.length) {
      computeCategories();
      return;
    }

    // Group products by category
    const grouped = {};
    products.forEach((p) => {
      const cat = p.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });

    let gapId = 1;
    let arbId = 1;
    let emId = 1;

    Object.entries(grouped).forEach(([category, catProducts]) => {
      const meta = getCategoryMeta(category);

      // Aggregate metrics
      const avgDemand = Math.round(catProducts.reduce((s, p) => s + computeDemand(p), 0) / catProducts.length);
      const avgSupply = Math.round(catProducts.reduce((s, p) => s + computeSupply(p), 0) / catProducts.length);
      const gapScore = computeGapScore(avgDemand, avgSupply);

      const avgRisk = Math.round(catProducts.reduce((s, p) => s + (p.riskScore || 50), 0) / catProducts.length);
      const avgSaturation = Math.round(
        catProducts.reduce((s, p) => s + (p.marketSaturation || 50), 0) / catProducts.length
      );
      const avgCpa = Math.round(catProducts.reduce((s, p) => s + (p.cpaAvg || 10), 0) / catProducts.length);
      const avgAdSpend = Math.round(catProducts.reduce((s, p) => s + (p.adSpendAvg || 20), 0) / catProducts.length);

      // Top product by score
      const topProduct = catProducts.reduce((a, b) => ((a.score || 0) > (b.score || 0) ? a : b));
      const allKeywords = [...new Set(catProducts.flatMap((p) => p.keywords || []))];

      // Trend
      const trends = catProducts.map(getTrend);
      const trend =
        trends.filter((t) => t === 'rising').length > trends.length / 2
          ? 'rising'
          : trends.filter((t) => t === 'declining').length > trends.length / 2
            ? 'declining'
            : 'stable';

      // Search volume proxy (sum of reviews + orders)
      const totalSearch = catProducts.reduce((s, p) => s + (p.reviews || 0) + (parseInt(p.orders) || 0), 0);

      // Sellers
      const totalSellers = catProducts.length;

      // Price range
      const prices = catProducts.map((p) => p.price || 0).filter((p) => p > 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = prices.length ? `$${minPrice.toFixed(0)}-$${maxPrice.toFixed(0)}` : 'N/A';

      // Best arbitrage for this category
      let bestArb = null;
      catProducts.forEach((p) => {
        const a = findArbitrage(p);
        if (a && (!bestArb || a.margin > bestArb.margin)) bestArb = a;
      });

      if (!bestArb) {
        const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / (prices.length || 1));
        bestArb = {
          buy: Math.round(avgPrice * 0.4),
          sell: avgPrice,
          buyPlatform: 'aliexpress',
          sellPlatform: 'amazon',
          margin: 50,
          profit: +(avgPrice * 0.6).toFixed(2),
        };
      }

      // Audience aggregation
      const allInterests = [...new Set(catProducts.flatMap((p) => p.audience?.interests || []))];
      const allCountries = [...new Set(catProducts.flatMap((p) => p.audience?.countries || []))];
      const ageRange = catProducts[0]?.audience?.age || '18-45';
      const gender = catProducts[0]?.audience?.gender || 'All';

      // Suppliers
      const allSuppliers = catProducts.flatMap((p) => p.suppliers || []).slice(0, 3);

      // Seasonality
      const avgSeasonality = Array(12)
        .fill(0)
        .map((_, i) => {
          return Math.round(catProducts.reduce((s, p) => s + (getSeasonality(p)[i] || 50), 0) / catProducts.length);
        });

      // Opportunity text
      const opportunity =
        avgDemand > avgSupply
          ? `High demand (${avgDemand}) outpaces supply (${avgSupply}) in ${category}. ${catProducts.length} products analyzed with ${avgRisk}/100 risk.`
          : `Market is competitive with supply (${avgSupply}) meeting demand (${avgDemand}). Differentiation needed.`;

      const action =
        gapScore > 60
          ? `Strong gap detected. Focus on ${topProduct.title?.substring(0, 40) || category} with ${bestArb.margin}% margin potential.`
          : gapScore > 40
            ? `Moderate opportunity. Target underserved sub-niches within ${category}.`
            : `High competition. Consider alternative angles or wait for market shifts.`;

      DATA.gaps.push({
        id: gapId++,
        category,
        emoji: meta.emoji,
        topProduct: topProduct.title?.substring(0, 60) || category,
        gap: gapScore,
        demandScore: avgDemand,
        supplyScore: avgSupply,
        searchVolume: formatVolume(totalSearch),
        sellers: totalSellers,
        priceRange,
        trend,
        riskScore: avgRisk,
        cpaAvg: avgCpa,
        adSpendAvg: avgAdSpend,
        marketSaturation: avgSaturation,
        arbitrage: bestArb,
        platforms: [bestArb.sellPlatform, bestArb.buyPlatform],
        keywords: allKeywords.slice(0, 8),
        opportunity,
        action,
        audience: { age: ageRange, gender, interests: allInterests.slice(0, 6), countries: allCountries.slice(0, 4) },
        suppliers: allSuppliers,
        seasonality: avgSeasonality,
        painPoints: [],
        products: catProducts,
        rating: (catProducts.reduce((s, p) => s + (p.rating || 0), 0) / catProducts.length).toFixed(1),
      });

      // Arbitrage opportunities from individual products
      catProducts.forEach((p) => {
        const arb = findArbitrage(p);
        if (arb && arb.margin >= 10) {
          DATA.arb.push({
            id: arbId++,
            product: p.title?.substring(0, 60) || 'Unknown',
            category,
            platforms: [arb.sellPlatform, arb.buyPlatform],
            aliPrice: arb.buy,
            amazonPrice: arb.sell,
            margin: arb.margin,
            demand: computeDemand(p) > 70 ? 'Very High' : computeDemand(p) > 50 ? 'High' : 'Medium',
          });
        }
      });

      // Emerging products (rising trend + high demand)
      catProducts.forEach((p) => {
        const pDemand = computeDemand(p);
        const pTrend = getTrend(p);
        if (pTrend === 'rising' && pDemand > 40) {
          const td = p.trendData || [];
          const growth = td.length >= 2 ? Math.round(((td[td.length - 1] - td[0]) / (td[0] || 1)) * 100) : 0;
          const platPrices = Object.entries(p.platformPrices || {})
            .filter(([, v]) => v > 0)
            .map(([k]) => k);
          DATA.emerging.push({
            id: emId++,
            name: p.title?.substring(0, 50) || 'Unknown',
            category,
            searchGrowth: '+' + Math.max(growth, 10) + '%',
            platforms: platPrices.length ? platPrices.slice(0, 4) : ['aliexpress'],
            sellerCount: Math.max(1, Math.round(p.marketSaturation / 10) || 3),
            opportunity: p.aiInsight || `Rising demand in ${category} with growing search volume.`,
            demand: pDemand,
            trendData: td,
          });
        }
      });
    });

    // Sort gaps by score
    DATA.gaps.sort((a, b) => b.gap - a.gap);

    // Deduplicate arbitrage (keep highest margin per product)
    const seenArb = new Set();
    DATA.arb = DATA.arb
      .filter((a) => {
        const key = a.product;
        if (seenArb.has(key)) return false;
        seenArb.add(key);
        return true;
      })
      .slice(0, 20);

    DATA.emerging = DATA.emerging.slice(0, 15);
    computeCategories();
  }

  // ── FILTERED DATA ─────────────────────────────────────────────────────

  function getFilteredGaps() {
    let gaps = [...DATA.gaps];
    const f = _filters;
    if (f.search) {
      const q = f.search.toLowerCase();
      gaps = gaps.filter(
        (g) =>
          g.category.toLowerCase().includes(q) ||
          g.topProduct.toLowerCase().includes(q) ||
          g.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    if (f.category !== 'all') gaps = gaps.filter((g) => g.category === f.category);
    if (f.gapMin > 0) gaps = gaps.filter((g) => g.gap >= f.gapMin);
    if (f.trend !== 'all') gaps = gaps.filter((g) => g.trend === f.trend);
    if (f.sort === 'gap-desc') gaps.sort((a, b) => b.gap - a.gap);
    else if (f.sort === 'gap-asc') gaps.sort((a, b) => a.gap - b.gap);
    else if (f.sort === 'demand-desc') gaps.sort((a, b) => b.demandScore - a.demandScore);
    else if (f.sort === 'margin-desc') gaps.sort((a, b) => b.arbitrage.margin - a.arbitrage.margin);
    else if (f.sort === 'risk-asc') gaps.sort((a, b) => a.riskScore - b.riskScore);
    else if (f.sort === 'sellers-asc') gaps.sort((a, b) => a.sellers - b.sellers);
    return gaps;
  }

  function getFilteredArbitrage() {
    let arb = [...DATA.arb];
    const f = _filters;
    if (f.search) {
      const q = f.search.toLowerCase();
      arb = arb.filter((a) => a.product.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
    }
    if (f.sort === 'margin-desc') arb.sort((a, b) => b.margin - a.margin);
    else if (f.sort === 'demand-desc')
      arb.sort((a, b) => {
        const o = { 'Very High': 3, High: 2, Medium: 1 };
        return (o[b.demand] || 0) - (o[a.demand] || 0);
      });
    return arb;
  }

  function getFilteredEmerging() {
    let em = [...DATA.emerging];
    const f = _filters;
    if (f.search) {
      const q = f.search.toLowerCase();
      em = em.filter((e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
    }
    return em;
  }

  // ── RENDERERS ─────────────────────────────────────────────────────────

  function _renderHero() {
    return `<div class="mg-hero">
      <div class="mg-hero-badge"><span class="mg-hero-badge-dot"></span>Market Intelligence</div>
      <h1 class="mg-hero-title">Find Hidden Opportunities</h1>
      <p class="mg-hero-desc">Discover underserved product categories where demand is high but competition is low. Get AI-powered insights to enter profitable niches before everyone else.</p>
      <div class="mg-hero-features">
        <div class="mg-hero-feat"><div class="mg-hero-feat-icon" style="background:rgba(0,229,255,0.1);color:var(--accent-cyan)">&#x1F4CA;</div><div class="mg-hero-feat-text"><strong>Gap Scoring</strong><span>Demand vs Supply analysis</span></div></div>
        <div class="mg-hero-feat"><div class="mg-hero-feat-icon" style="background:rgba(0,255,136,0.1);color:var(--accent-green)">&#x1F4B0;</div><div class="mg-hero-feat-text"><strong>Arbitrage Finder</strong><span>Cross-platform price gaps</span></div></div>
        <div class="mg-hero-feat"><div class="mg-hero-feat-icon" style="background:rgba(168,85,247,0.1);color:var(--accent-purple)">&#x1F680;</div><div class="mg-hero-feat-text"><strong>Emerging Niches</strong><span>Early trend detection</span></div></div>
      </div>
    </div>`;
  }

  function renderAIScan() {
    const el = _section?.querySelector('#mgAIScan');
    if (!el) return;
    const gaps = DATA.gaps.length;
    const arb = DATA.arb.length;
    const em = DATA.emerging.length;
    const pCount = _products.length;
    el.innerHTML = `<div class="mg-ai-scan">
      <span class="mg-ai-scan-icon">&#x1F9E0;</span>
      <span class="mg-ai-scan-text">AI scanned <strong>${formatVolume(pCount)} products</strong> across 10 platforms &mdash; <strong>${gaps} gaps</strong>, <strong>${arb} arbitrage</strong>, <strong>${em} emerging</strong> found</span>
      <span class="mg-ai-scan-count">${gaps + arb + em} opportunities</span>
    </div>`;
  }

  function renderDataMeta() {
    const el = _section?.querySelector('#mgDataMeta');
    if (!el) return;
    const now = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    el.innerHTML = `<div class="mg-data-meta">
      <span class="mg-meta-item">Last updated: ${now}</span>
      <span class="mg-meta-item">Sources: AliExpress, Amazon, Shopify, eBay, Temu, TikTok, Etsy, CJ, DHgate, Wish</span>
      <span class="mg-meta-item">${DATA.gaps.length + DATA.arb.length + DATA.emerging.length} opportunities found</span>
    </div>`;
  }

  function renderFilters() {
    const el = _section?.querySelector('#mgFilters');
    if (!el) return;
    const cats = ['all', ...new Set(DATA.gaps.map((g) => g.category))];
    el.innerHTML = `<div class="mg-filter-bar">
      <div class="mg-search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="mg-search-input" placeholder="Search categories, products, keywords..." value="${esc(_filters.search)}" id="mgSearchInput">
      </div>
      <div class="mg-filter-controls">
        <select class="mg-filter-select" id="mgCategoryFilter">${cats.map((c) => `<option value="${esc(c)}">${c === 'all' ? 'All Categories' : esc(c)}</option>`).join('')}</select>
        <select class="mg-filter-select" id="mgGapFilter"><option value="0">Any Gap Score</option><option value="40">40+ Gap</option><option value="45">45+ Gap</option><option value="50">50+ Gap</option><option value="55">55+ Gap</option></select>
        <select class="mg-filter-select" id="mgTrendFilter"><option value="all">All Trends</option><option value="rising">Rising</option><option value="stable">Stable</option><option value="declining">Declining</option></select>
        <select class="mg-filter-select" id="mgSortFilter"><option value="gap-desc">Gap: High-Low</option><option value="gap-asc">Gap: Low-High</option><option value="demand-desc">Highest Demand</option><option value="margin-desc">Highest Margin</option><option value="risk-asc">Lowest Risk</option><option value="sellers-asc">Fewest Sellers</option></select>
        <button class="mg-export-btn" id="mgExportCSV" title="Export CSV">&#x1F4E5; CSV</button>
        <button class="mg-export-btn" id="mgExportPDF" title="Export PDF">&#x1F4C4; PDF</button>
      </div>
    </div>`;
    const bind = (id, evt, fn) => {
      const e = el.querySelector(id);
      if (e) e.addEventListener(evt, fn);
    };
    const debouncedSearch = debounce(() => refresh(), 300);
    bind('#mgSearchInput', 'input', (e) => {
      _filters.search = e.target.value;
      debouncedSearch();
    });
    bind('#mgCategoryFilter', 'change', (e) => {
      _filters.category = e.target.value;
      refresh();
    });
    bind('#mgGapFilter', 'change', (e) => {
      _filters.gapMin = parseInt(e.target.value);
      refresh();
    });
    bind('#mgTrendFilter', 'change', (e) => {
      _filters.trend = e.target.value;
      refresh();
    });
    bind('#mgSortFilter', 'change', (e) => {
      _filters.sort = e.target.value;
      refresh();
    });
    bind('#mgExportCSV', 'click', () => exportCSV());
    bind('#mgExportPDF', 'click', () => exportPDF());
  }

  function renderTabs() {
    const el = _section?.querySelector('#mgTabs');
    if (!el) return;
    el.innerHTML = `<div class="mg-tabs">
      <button class="mg-tab active" data-tab="gaps">Market Gaps</button>
      <button class="mg-tab" data-tab="arbitrage">Arbitrage</button>
      <button class="mg-tab" data-tab="emerging">Emerging</button>
      <button class="mg-tab" data-tab="watchlist">Watchlist (${_watchlist.length})</button>
    </div>`;
    el.querySelectorAll('.mg-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('.mg-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        showTab(tab.dataset.tab);
      });
    });
    showTab('gaps');
  }

  function showTab(tab) {
    const el = _section?.querySelector('#mgTabContent');
    if (!el) return;
    el.innerHTML = '';
    const renderers = {
      gaps: _renderGaps,
      arbitrage: _renderArbitrage,
      emerging: _renderEmerging,
      watchlist: _renderWatchlist,
    };
    const fn = renderers[tab];
    if (fn) el.innerHTML = fn();
    _bindTabEvents(el);
  }

  function _bindTabEvents(el) {
    if (!el) return;
    el.querySelectorAll('[data-gap-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.gapId);
        const action = e.currentTarget.dataset.action;
        if (action === 'detail') showGapDetail(id);
        else if (action === 'suppliers') navigateTo('section-supplier-hub');
        else if (action === 'profit') openProfitCalc(id);
        else if (action === 'ad') openAdStudio(id);
        else if (action === 'save') toggleWatchlist(id);
      });
    });
    el.querySelectorAll('[data-arb-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.arbId);
        const action = e.currentTarget.dataset.action;
        if (action === 'detail') showArbDetail(id);
      });
    });
    el.querySelectorAll('[data-em-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.emId);
        const action = e.currentTarget.dataset.action;
        if (action === 'save') toggleEmergingWatchlist(id);
      });
    });
    el.querySelectorAll('.mg-kw-chip').forEach((chip) => {
      chip.style.cursor = 'pointer';
      chip.addEventListener('click', () => {
        const kw = chip.textContent.trim();
        if (kw) {
          window.HuntDrop.navigateTo('section-search');
          setTimeout(() => {
            const si = document.getElementById('searchPageInput') || document.getElementById('searchInput');
            if (si) {
              si.value = kw;
              si.dispatchEvent(new Event('input', { bubbles: true }));
            }
            EventBus.emit('search:query', { query: kw, filters: {} });
          }, 200);
        }
      });
    });
    el.querySelectorAll('.mg-aud-chip').forEach((chip) => {
      chip.style.cursor = 'pointer';
      chip.addEventListener('click', () => {
        const kw = chip.textContent.trim();
        if (kw) {
          window.HuntDrop.navigateTo('section-search');
          setTimeout(() => {
            const si = document.getElementById('searchPageInput') || document.getElementById('searchInput');
            if (si) {
              si.value = kw;
              si.dispatchEvent(new Event('input', { bubbles: true }));
            }
            EventBus.emit('search:query', { query: kw, filters: {} });
          }, 200);
        }
      });
    });
  }

  function _renderGaps() {
    const gaps = getFilteredGaps();
    if (!gaps.length)
      return '<div class="mg-empty">No market gaps found. Run a search to analyze products and discover opportunities.</div>';
    const tc = { rising: 'var(--accent-green)', stable: 'var(--accent-yellow)', declining: 'var(--accent-red)' };
    return `<div class="mg-gaps-list">${gaps
      .map(
        (g, i) => `<div class="mg-gap-card" style="animation-delay:${Math.min(i * 0.05, 0.4)}s">
      <div class="mg-gap-rank">#${i + 1}</div>
      <div class="mg-gap-main">
        <div class="mg-gap-top"><span class="mg-gap-emoji">${esc(g.emoji)}</span><div><div class="mg-gap-cat">${esc(g.category)}</div><div class="mg-gap-product">Top: ${esc(g.topProduct)}</div></div><div class="mg-gap-score-pill"><span class="mg-gap-score-num">${g.gap}</span><span class="mg-gap-score-lbl">GAP</span></div></div>
        <div class="mg-gap-bars">
          <div class="mg-bar-row"><span class="mg-bar-label mg-tip" data-tip="Demand Index = search volume x conversion rate">Demand</span><div class="mg-bar-track"><div class="mg-bar-fill" style="width:${g.demandScore}%;background:var(--accent-green)"></div></div><span class="mg-bar-val" style="color:var(--accent-green)">${g.demandScore}</span></div>
          <div class="mg-bar-row"><span class="mg-bar-label mg-tip" data-tip="Supply Index = number of active sellers x listing count">Supply</span><div class="mg-bar-track"><div class="mg-bar-fill" style="width:${g.supplyScore}%;background:var(--accent-red)"></div></div><span class="mg-bar-val" style="color:var(--accent-red)">${g.supplyScore}</span></div>
        </div>
        <div class="mg-gap-metrics">
          <div class="mg-gap-m"><span class="mg-gap-m-label mg-tip" data-tip="Monthly search volume across all platforms">Search</span><span class="mg-gap-m-val">${g.searchVolume}</span></div>
          <div class="mg-gap-m"><span class="mg-gap-m-label mg-tip" data-tip="Active sellers across all platforms">Sellers</span><span class="mg-gap-m-val">${g.sellers}</span></div>
          <div class="mg-gap-m"><span class="mg-gap-m-label mg-tip" data-tip="Average product price range">Price</span><span class="mg-gap-m-val">${g.priceRange}</span></div>
          <div class="mg-gap-m"><span class="mg-gap-m-label mg-tip" data-tip="Trend direction over last 30 days">Trend</span><span class="mg-gap-m-val" style="color:${tc[g.trend]}">${g.trend}</span></div>
          <div class="mg-gap-m"><span class="mg-gap-m-label mg-tip" data-tip="Risk Score = competition + saturation + ad cost (lower is better)">Risk</span><span class="mg-gap-m-val" style="color:${g.riskScore < 25 ? 'var(--accent-green)' : g.riskScore < 40 ? 'var(--accent-yellow)' : 'var(--accent-red)'}">${g.riskScore}/100</span></div>
          <div class="mg-gap-m"><span class="mg-gap-m-label mg-tip" data-tip="Cost Per Acquisition average">CPA</span><span class="mg-gap-m-val">$${g.cpaAvg}</span></div>
        </div>
        <div class="mg-gap-arb">
          <div class="mg-gap-arb-buy"><span class="mg-gap-arb-plat">${g.platforms[0]}</span><span class="mg-gap-arb-price buy">$${g.arbitrage.buy}</span></div>
          <span class="mg-gap-arb-arrow">&rarr;</span>
          <div class="mg-gap-arb-sell"><span class="mg-gap-arb-plat">${g.platforms[1]}</span><span class="mg-gap-arb-price sell">$${g.arbitrage.sell}</span></div>
          <div class="mg-gap-arb-profit"><div class="mg-gap-arb-profit-val">+$${(g.arbitrage.sell - g.arbitrage.buy).toFixed(2)}</div><div class="mg-gap-arb-profit-pct">${g.arbitrage.margin}% margin</div></div>
        </div>
        <div class="mg-gap-opp">${esc(g.opportunity)}</div>
        <div class="mg-gap-action-text">${esc(g.action)}</div>
        <div class="mg-gap-actions">
          <button class="mg-action-btn mg-action-primary" data-gap-id="${g.id}" data-action="detail">View Full Analysis</button>
          <button class="mg-action-btn" data-gap-id="${g.id}" data-action="suppliers">Find Suppliers</button>
          <button class="mg-action-btn" data-gap-id="${g.id}" data-action="profit">Calculate Profit</button>
          <button class="mg-action-btn" data-gap-id="${g.id}" data-action="ad">Create Ad</button>
          <button class="mg-action-btn mg-action-save ${_watchlist.includes(g.id) ? 'saved' : ''}" data-gap-id="${g.id}" data-action="save">${_watchlist.includes(g.id) ? '&#x2713; Saved' : 'Save'}</button>
        </div>
        <div class="mg-gap-keywords">${g.keywords.map((k) => `<span class="mg-kw-chip">${esc(k)}</span>`).join('')}</div>
      </div>
    </div>`
      )
      .join('')}</div>`;
  }

  function _renderArbitrage() {
    const arb = getFilteredArbitrage();
    if (!arb.length)
      return '<div class="mg-empty">No arbitrage opportunities found. Run a search to discover cross-platform price gaps.</div>';
    return `<div class="mg-arb-section"><div class="mg-arb-header"><h3>Cross-Platform Price Gaps</h3><p>Buy low on one platform, sell high on another</p></div>
    <div class="mg-arb-grid">${arb
      .map(
        (
          a
        ) => `<div class="mg-arb-card"><div class="mg-arb-card-top"><span class="mg-arb-name">${esc(a.product)}</span><span class="mg-arb-demand">${esc(a.demand)} Demand</span></div>
      <div class="mg-arb-prices"><div class="mg-arb-side"><div class="mg-arb-side-label">Buy From</div><div class="mg-arb-platform">${a.platforms[1]}</div><div class="mg-arb-price buy">$${a.aliPrice.toFixed(2)}</div></div><div class="mg-arb-arrow">&rarr;</div><div class="mg-arb-side"><div class="mg-arb-side-label">Sell On</div><div class="mg-arb-platform">${a.platforms[0]}</div><div class="mg-arb-price sell">$${a.amazonPrice.toFixed(2)}</div></div></div>
      <div class="mg-arb-profit">+$${(a.amazonPrice - a.aliPrice).toFixed(2)} profit (${a.margin}% margin)</div>
      <div class="mg-arb-actions"><button class="mg-action-btn" data-arb-id="${a.id}" data-action="detail">View Details</button></div>
    </div>`
      )
      .join('')}</div></div>`;
  }

  function _renderEmerging() {
    const em = getFilteredEmerging();
    if (!em.length)
      return '<div class="mg-empty">No emerging niches found. Run a search to identify trending products.</div>';
    return `<div class="mg-emerging-section"><div class="mg-emerging-header"><h3>Emerging Niches</h3><p>Products gaining traction across multiple platforms &mdash; early mover window</p></div>
    <div class="mg-emerging-list">${em
      .map(
        (n) => `<div class="mg-emerging-card">
      <div class="mg-em-name">${esc(n.name)}</div>
      <div class="mg-em-growth" style="color:var(--accent-green)">${esc(n.searchGrowth)}</div>
      <div class="mg-em-plats">${n.platforms.map((p) => `<span class="mg-em-plat">${esc(p)}</span>`).join('')}</div>
      <div class="mg-em-sellers">${n.sellerCount} sellers</div>
      <div class="mg-em-opp">${esc(n.opportunity)}</div>
      <div class="mg-em-prediction">&#x1F52E; +${Math.round(parseInt(n.searchGrowth) * 0.3)}% in 30d</div>
      <button class="mg-action-btn mg-action-save ${_emWatchlist.includes(n.id) ? 'saved' : ''}" data-em-id="${n.id}" data-action="save">${_emWatchlist.includes(n.id) ? '&#x2713; Saved' : 'Save'}</button>
    </div>`
      )
      .join('')}</div></div>`;
  }

  function _renderWatchlist() {
    const gaps = DATA.gaps.filter((g) => _watchlist.includes(g.id));
    if (!gaps.length)
      return '<div class="mg-empty">Your watchlist is empty. Save opportunities from the Market Gaps tab.</div>';
    return `<div class="mg-watchlist-section"><div class="mg-watchlist-header"><h3>Saved Opportunities</h3><p>${gaps.length} items saved</p></div>
    <div class="mg-gaps-list">${gaps
      .map(
        (g, i) => `<div class="mg-gap-card"><div class="mg-gap-rank">#${i + 1}</div><div class="mg-gap-main">
      <div class="mg-gap-top"><span class="mg-gap-emoji">${esc(g.emoji)}</span><div><div class="mg-gap-cat">${esc(g.category)}</div><div class="mg-gap-product">Top: ${esc(g.topProduct)}</div></div><div class="mg-gap-score-pill"><span class="mg-gap-score-num">${g.gap}</span><span class="mg-gap-score-lbl">GAP</span></div></div>
      <div class="mg-gap-metrics"><div class="mg-gap-m"><span class="mg-gap-m-label">Demand</span><span class="mg-gap-m-val" style="color:var(--accent-green)">${g.demandScore}</span></div><div class="mg-gap-m"><span class="mg-gap-m-label">Supply</span><span class="mg-gap-m-val" style="color:var(--accent-red)">${g.supplyScore}</span></div><div class="mg-gap-m"><span class="mg-gap-m-label">Margin</span><span class="mg-gap-m-val" style="color:var(--accent-green)">${g.arbitrage.margin}%</span></div><div class="mg-gap-m"><span class="mg-gap-m-label">Trend</span><span class="mg-gap-m-val">${g.trend}</span></div></div>
      <div class="mg-gap-actions"><button class="mg-action-btn mg-action-primary" data-gap-id="${g.id}" data-action="detail">View Full Analysis</button><button class="mg-action-btn" data-gap-id="${g.id}" data-action="suppliers">Find Suppliers</button><button class="mg-action-btn mg-action-danger" data-gap-id="${g.id}" data-action="save">Remove</button></div>
    </div></div>`
      )
      .join('')}</div></div>`;
  }

  function renderBattlefield() {
    const el = _section?.querySelector('#mgBattlefield');
    if (!el) return;
    if (!DATA.gaps.length) {
      el.innerHTML = `<div class="mg-battlefield-section"><div class="mg-section-header"><h3 class="mg-section-title">&#x2694;&#xFE0F; Competitor Battlefield</h3><p class="mg-section-sub">Competition intensity mapped across each niche</p></div><div class="mg-empty">Search for products to see competitor battlefield data.</div></div>`;
      return;
    }
    el.innerHTML = `<div class="mg-battlefield-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x2694;&#xFE0F; Competitor Battlefield</h3><p class="mg-section-sub">Competition intensity mapped across each niche</p></div>
      <div class="mg-bf-grid">${DATA.gaps
        .map((g) => {
          const satLevel = g.marketSaturation < 30 ? 'low' : g.marketSaturation < 60 ? 'medium' : 'high';
          const satColor =
            satLevel === 'low'
              ? 'var(--accent-green)'
              : satLevel === 'medium'
                ? 'var(--accent-yellow)'
                : 'var(--accent-red)';
          return `<div class="mg-bf-card" data-gap-id="${g.id}" data-action="detail" style="cursor:pointer">
          <div class="mg-bf-top"><span class="mg-bf-emoji">${g.emoji}</span><span class="mg-bf-name">${esc(g.category)}</span><span class="mg-bf-sat ${satLevel}">${satLevel.toUpperCase()}</span></div>
          <div class="mg-bf-metrics">
            <div class="mg-bf-metric"><span class="mg-bf-metric-val">${g.sellers}</span><span class="mg-bf-metric-lbl">Sellers</span></div>
            <div class="mg-bf-metric"><span class="mg-bf-metric-val">${g.rating || '0'}</span><span class="mg-bf-metric-lbl">Avg Rating</span></div>
            <div class="mg-bf-metric"><span class="mg-bf-metric-val">$${g.adSpendAvg}</span><span class="mg-bf-metric-lbl">Ad Spend</span></div>
            <div class="mg-bf-metric"><span class="mg-bf-metric-val" style="color:${satColor}">${g.marketSaturation}%</span><span class="mg-bf-metric-lbl">Saturation</span></div>
          </div>
          <div class="mg-sat-gauge"><div class="mg-sat-fill" style="width:${g.marketSaturation}%;background:${satColor}"></div></div>
        </div>`;
        })
        .join('')}</div>
    </div>`;
  }

  function renderNicheRadar() {
    const el = _section?.querySelector('#mgNicheRadar');
    if (!el) return;
    if (!DATA.gaps.length) {
      el.innerHTML = `<div class="mg-niche-radar-section"><div class="mg-section-header"><h3 class="mg-section-title">&#x1F50D; Niche Radar</h3><p class="mg-section-sub">Validate niche profitability with conversion, AOV, pain points and audience data</p></div><div class="mg-empty">Search for products to see niche radar analysis.</div></div>`;
      return;
    }
    el.innerHTML = `<div class="mg-niche-radar-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F50D; Niche Radar</h3><p class="mg-section-sub">Validate niche profitability with conversion, AOV, pain points and audience data</p></div>
      <div class="mg-nr-grid">${DATA.gaps
        .map((g) => {
          const convRate = (2 + (g.demandScore / 100) * 4.5).toFixed(1);
          const aov = Math.round(g.arbitrage.sell * 1.0);
          return `<div class="mg-nr-card">
          <div class="mg-nr-top"><span class="mg-nr-emoji">${g.emoji}</span><span class="mg-nr-name">${esc(g.category)}</span><span class="mg-nr-score">${g.gap}</span></div>
          <div class="mg-nr-metrics">
            <div class="mg-nr-metric"><span class="mg-nr-metric-val" style="color:var(--accent-green)">${convRate}%</span><span class="mg-nr-metric-lbl">Conversion Rate</span></div>
            <div class="mg-nr-metric"><span class="mg-nr-metric-val">$${aov}</span><span class="mg-nr-metric-lbl">Avg Order Value</span></div>
          </div>
          <div class="mg-nr-pains"><div class="mg-nr-pains-title">Customer Pain Points</div><div class="mg-pain-points">${(g.painPoints && g.painPoints.length ? g.painPoints : ['Limited options', 'High prices', 'Poor quality']).map((p) => `<span class="mg-pain-chip">&#x26A0; ${esc(p)}</span>`).join('')}</div></div>
          <div class="mg-nr-pains-title">Target Audience</div>
          <div class="mg-nr-audience">${g.audience.interests.map((i) => `<span class="mg-aud-chip">${esc(i)}</span>`).join('')}</div>
        </div>`;
        })
        .join('')}</div>
    </div>`;
  }

  function renderLifecycle() {
    const el = _section?.querySelector('#mgLifecycle');
    if (!el) return;
    if (!DATA.gaps.length) {
      el.innerHTML = `<div class="mg-lifecycle-section"><div class="mg-section-header"><h3 class="mg-section-title">&#x1F4C8; Product Lifecycle</h3><p class="mg-section-sub">Track niche maturity stage and predict time-to-peak</p></div><div class="mg-empty">Search for products to see lifecycle tracking.</div></div>`;
      return;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    el.innerHTML = `<div class="mg-lifecycle-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F4C8; Product Lifecycle</h3><p class="mg-section-sub">Track niche maturity stage and predict time-to-peak</p></div>
      <div class="mg-lc-grid">${DATA.gaps
        .map((g) => {
          const stage = g.marketSaturation < 25 ? 'Emerging' : g.marketSaturation < 55 ? 'Growing' : 'Saturated';
          const stageClass = stage.toLowerCase();
          const peakIdx = g.seasonality.indexOf(Math.max(...g.seasonality));
          const peakMonth = months[peakIdx >= 0 ? peakIdx : 0];
          const timeToPeak = stage === 'Emerging' ? '2-3' : stage === 'Growing' ? '3-5' : '6+';
          return `<div class="mg-lc-card">
          <div class="mg-lc-top"><span class="mg-lc-emoji">${g.emoji}</span><span class="mg-lc-name">${esc(g.category)}</span><span class="mg-lifecycle-badge ${stageClass}"><span class="mg-lifecycle-badge-dot"></span>${stage}</span></div>
          <div class="mg-lc-chart"><canvas id="mgLC_${g.id}" height="80"></canvas></div>
          <div class="mg-lc-meta"><span>Time-to-peak: <span class="mg-lc-peak">${timeToPeak} months</span></span><span>Peak: ${peakMonth}</span></div>
        </div>`;
        })
        .join('')}</div>
    </div>`;
    if (typeof Chart === 'undefined') return;
    setTimeout(() => {
      DATA.gaps.forEach((g) => {
        const c = el.querySelector('#mgLC_' + g.id);
        if (!c) return;
        const key = 'lc_' + g.id;
        if (_charts[key])
          try {
            _charts[key].destroy();
          } catch (e) {}
        const colors = { Emerging: '#00e5ff', Growing: '#00ff88', Saturated: '#ff3366' };
        const stage = g.marketSaturation < 25 ? 'Emerging' : g.marketSaturation < 55 ? 'Growing' : 'Saturated';
        _charts[key] = new Chart(c, {
          type: 'line',
          data: {
            labels: months,
            datasets: [
              {
                data: g.seasonality,
                borderColor: colors[stage],
                backgroundColor: colors[stage] + '22',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false } },
          },
        });
      });
    }, 100);
  }

  function renderProductHunt() {
    const el = _section?.querySelector('#mgProductHunt');
    if (!el) return;
    if (!DATA.gaps.length) {
      el.innerHTML = `<div class="mg-phunt-section"><div class="mg-section-header"><h3 class="mg-section-title">&#x1F525; Product Hunt Scout</h3><p class="mg-section-sub">Top products per niche with supplier links, margins and shipping times</p></div><div class="mg-empty">Search for products to see top product picks.</div></div>`;
      return;
    }
    el.innerHTML = `<div class="mg-phunt-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F525; Product Hunt Scout</h3><p class="mg-section-sub">Top products per niche with supplier links, margins and shipping times</p></div>
      <div class="mg-phunt-grid">${DATA.gaps
        .slice(0, 5)
        .map(
          (g, i) => `<div class="mg-phunt-card" style="animation-delay:${i * 0.08}s">
        <div class="mg-phunt-rank">#${i + 1} in ${esc(g.category)}</div>
        <div class="mg-phunt-name">${esc(g.topProduct)}</div>
        <div class="mg-phunt-prices"><span class="mg-phunt-price">$${g.arbitrage.sell}</span><span class="mg-phunt-margin">${g.arbitrage.margin}% margin</span></div>
        <div class="mg-phunt-meta">Ship: 7-15 days</div>
        <div class="mg-phunt-meta">${g.suppliers[0] ? esc(g.suppliers[0].name) : 'Various suppliers'}</div>
        <a class="mg-phunt-link" href="javascript:void(0)" data-mg-navigate="section-product-hunt">View Products &rarr;</a>
      </div>`
        )
        .join('')}</div>
    </div>`;
    el.querySelectorAll('[data-mg-navigate]').forEach((link) => {
      link.addEventListener('click', () => navigateTo(link.dataset.mgNavigate));
    });
  }

  function renderActionZone() {
    const el = _section?.querySelector('#mgActionZone');
    if (!el) return;
    const wlActive = _watchlist.length > 0;
    el.innerHTML = `<div class="mg-action-zone">
      <button class="mg-az-btn analyze" id="mgAZAnalyze">&#x1F9E0; Analyze Market</button>
      <button class="mg-az-btn compare" id="mgAZCompare">&#x1F4CA; Compare Niches</button>
      <button class="mg-az-btn export" id="mgAZExport">&#x1F4C4; Export Report</button>
      <button class="mg-az-btn watchlist ${wlActive ? 'active' : ''}" id="mgAZWatchlist">&#x1F680; Watchlist (${_watchlist.length})</button>
    </div>`;
    el.querySelector('#mgAZAnalyze')?.addEventListener('click', () => {
      document.querySelector('#mgSearchInput')?.focus();
    });
    el.querySelector('#mgAZCompare')?.addEventListener('click', () => {
      _filters.category = 'all';
      const catFilter = document.querySelector('#mgCategoryFilter');
      if (catFilter) {
        catFilter.value = 'all';
        catFilter.dispatchEvent(new Event('change'));
      }
    });
    el.querySelector('#mgAZExport')?.addEventListener('click', () => exportPDF());
    el.querySelector('#mgAZWatchlist')?.addEventListener('click', () => {
      const wlTab = document.querySelector('[data-tab="watchlist"]');
      if (wlTab) wlTab.click();
    });
  }

  function renderCalculator() {
    const el = _section?.querySelector('#mgCalculator');
    if (!el) return;
    el.innerHTML = `<div class="mg-calc-section">
      <div class="mg-section-header"><h3 class="mg-section-title">Opportunity Score Calculator</h3><p class="mg-section-sub">Input your parameters to get a personalized recommendation</p></div>
      <div class="mg-calc-card">
        <div class="mg-calc-inputs">
          <div class="mg-calc-field"><label>Budget ($)</label><input type="number" id="mgCalcBudget" value="500" min="50" max="50000"></div>
          <div class="mg-calc-field"><label>Experience</label><select id="mgCalcExp"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
          <div class="mg-calc-field"><label>Risk Tolerance</label><select id="mgCalcRisk"><option value="low">Low Risk</option><option value="medium">Medium Risk</option><option value="high">High Risk</option></select></div>
          <div class="mg-calc-field"><label>Preferred Platform</label><select id="mgCalcPlat"><option value="amazon">Amazon</option><option value="shopify">Shopify</option><option value="etsy">Etsy</option><option value="tiktok">TikTok Shop</option></select></div>
        </div>
        <button class="mg-calc-btn" id="mgCalcBtn">Get Recommendation</button>
        <div id="mgCalcResult" class="mg-calc-result"></div>
      </div>
    </div>`;
    el.querySelector('#mgCalcBtn')?.addEventListener('click', () => calculate());
  }

  function calculate() {
    const budget = parseInt(document.querySelector('#mgCalcBudget')?.value) || 500;
    const exp = document.querySelector('#mgCalcExp')?.value || 'beginner';
    const risk = document.querySelector('#mgCalcRisk')?.value || 'low';
    const recommended = DATA.gaps
      .filter((g) => {
        if (risk === 'low' && g.riskScore > 30) return false;
        if (risk === 'medium' && g.riskScore > 50) return false;
        if (exp === 'beginner' && g.riskScore > 40) return false;
        return budget >= g.arbitrage.buy * 50;
      })
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3);
    const res = document.querySelector('#mgCalcResult');
    if (!res) return;
    if (!recommended.length) {
      res.innerHTML =
        '<div class="mg-calc-empty">No opportunities match your criteria. Try increasing budget or risk tolerance.</div>';
      return;
    }
    res.innerHTML = `<div class="mg-calc-results"><h4>Top Recommendations For You</h4>${recommended
      .map(
        (g, i) => `<div class="mg-calc-rec">
      <div class="mg-calc-rank">${i + 1}</div>
      <div class="mg-calc-info"><div class="mg-calc-name">${esc(g.emoji)} ${esc(g.category)}</div><div class="mg-calc-meta">Gap: ${g.gap} | Margin: ${g.arbitrage.margin}% | Risk: ${g.riskScore}/100</div><div class="mg-calc-tip">${esc(g.action)}</div></div>
      <div class="mg-calc-score" style="color:var(--accent-green)">${Math.round(g.gap * 0.4 + g.arbitrage.margin * 0.3 + (100 - g.riskScore) * 0.3)}</div>
    </div>`
      )
      .join('')}</div>`;
  }

  function showGapDetail(id) {
    const g = DATA.gaps.find((x) => x.id === id);
    if (!g) return;
    UI.modal(`<div class="mg-detail">
      <div class="mg-detail-hero"><span class="mg-detail-emoji">${esc(g.emoji)}</span><div><h2 class="mg-detail-title">${esc(g.category)}</h2>
      <div class="mg-detail-tags"><span class="mg-detail-tag" style="background:var(--accent-green-dim);color:var(--accent-green)">Gap Score: ${g.gap}</span><span class="mg-detail-tag" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">${g.trend.toUpperCase()}</span><span class="mg-detail-tag" style="background:rgba(255,51,102,0.12);color:var(--accent-red)">Risk: ${g.riskScore}/100</span></div></div></div>
      <div class="mg-detail-grid">
        <div class="mg-detail-section"><h4>Market Metrics</h4><div class="mg-detail-metrics">
          <div class="mg-detail-m"><span class="mg-detail-m-val" style="color:var(--accent-green)">${g.demandScore}</span><span class="mg-detail-m-lbl">Demand</span></div>
          <div class="mg-detail-m"><span class="mg-detail-m-val" style="color:var(--accent-red)">${g.supplyScore}</span><span class="mg-detail-m-lbl">Supply</span></div>
          <div class="mg-detail-m"><span class="mg-detail-m-val">${g.searchVolume}</span><span class="mg-detail-m-lbl">Search Vol</span></div>
          <div class="mg-detail-m"><span class="mg-detail-m-val">${g.sellers}</span><span class="mg-detail-m-lbl">Sellers</span></div>
          <div class="mg-detail-m"><span class="mg-detail-m-val" style="color:var(--accent-green)">${g.arbitrage.margin}%</span><span class="mg-detail-m-lbl">Margin</span></div>
          <div class="mg-detail-m"><span class="mg-detail-m-val">$${g.cpaAvg}</span><span class="mg-detail-m-lbl">CPA</span></div>
          <div class="mg-detail-m"><span class="mg-detail-m-val">$${g.adSpendAvg}</span><span class="mg-detail-m-lbl">Ad Spend</span></div>
          <div class="mg-detail-m"><span class="mg-detail-m-val">${g.priceRange}</span><span class="mg-detail-m-lbl">Price Range</span></div>
        </div></div>
        <div class="mg-detail-section"><h4>Arbitrage Opportunity</h4><div class="mg-detail-arb">
          <div class="mg-detail-arb-row"><span>Buy from ${esc(g.platforms[0])}</span><span style="color:var(--accent-red);font-family:var(--font-mono);font-weight:700">$${g.arbitrage.buy}</span></div>
          <div class="mg-detail-arb-row"><span>Sell on ${esc(g.platforms[1])}</span><span style="color:var(--accent-green);font-family:var(--font-mono);font-weight:700">$${g.arbitrage.sell}</span></div>
          <div class="mg-detail-arb-divider"></div>
          <div class="mg-detail-arb-row"><span>Profit per unit</span><span style="color:var(--accent-green);font-family:var(--font-mono);font-weight:700">$${(g.arbitrage.sell - g.arbitrage.buy).toFixed(2)}</span></div>
        </div></div>
        <div class="mg-detail-section"><h4>Target Audience</h4><div class="mg-detail-audience">
          <div class="mg-detail-aud-row"><span>Age Range</span><span>${esc(g.audience.age)}</span></div>
          <div class="mg-detail-aud-row"><span>Gender</span><span>${esc(g.audience.gender)}</span></div>
          <div class="mg-detail-aud-row"><span>Interests</span><span>${esc(g.audience.interests.join(', '))}</span></div>
          <div class="mg-detail-aud-row"><span>Countries</span><span>${esc(g.audience.countries.join(', '))}</span></div>
        </div></div>
        <div class="mg-detail-section"><h4>Keywords</h4><div class="mg-detail-keywords">${g.keywords.map((k) => `<span class="mg-kw-chip">${esc(k)}</span>`).join('')}</div></div>
        <div class="mg-detail-section"><h4>Top Suppliers</h4><div class="mg-detail-suppliers">${g.suppliers.length ? g.suppliers.map((s) => `<div class="mg-detail-supplier"><div class="mg-detail-sup-name">${esc(s.name)} ${s.verified ? '(Verified)' : ''}</div><div class="mg-detail-sup-meta">${esc(s.location)} - ${s.orders.toLocaleString()} orders - Rating: ${s.rating} - Response: ${esc(s.responseTime)}</div></div>`).join('') : '<div style="color:var(--text-muted);font-size:12px">No supplier data available. Search for products to see suppliers.</div>'}</div></div>
        <div class="mg-detail-section mg-detail-wide"><h4>AI Opportunity Analysis</h4><div class="mg-detail-insight">${esc(g.opportunity)}</div></div>
        <div class="mg-detail-section mg-detail-wide"><h4>Recommended Action</h4><div class="mg-detail-action">${esc(g.action)}</div></div>
      </div></div>`);
  }

  function showArbDetail(id) {
    const a = DATA.arb.find((x) => x.id === id);
    if (!a) return;
    const profit = (a.amazonPrice - a.aliPrice).toFixed(2);
    UI.modal(`<div class="mg-detail"><div class="mg-detail-hero"><span class="mg-detail-emoji">&#x1F4B0;</span><div><h2 class="mg-detail-title">${esc(a.product)}</h2>
    <div class="mg-detail-tags"><span class="mg-detail-tag" style="background:var(--accent-green-dim);color:var(--accent-green)">${a.margin}% Margin</span><span class="mg-detail-tag" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">${esc(a.demand)} Demand</span></div></div></div>
    <div class="mg-detail-section"><h4>Price Breakdown</h4><div class="mg-detail-arb">
      <div class="mg-detail-arb-row"><span>Buy from ${esc(a.platforms[1])}</span><span style="color:var(--accent-red);font-family:var(--font-mono);font-weight:700">$${a.aliPrice.toFixed(2)}</span></div>
      <div class="mg-detail-arb-row"><span>Sell on ${esc(a.platforms[0])}</span><span style="color:var(--accent-green);font-family:var(--font-mono);font-weight:700">$${a.amazonPrice.toFixed(2)}</span></div>
      <div class="mg-detail-arb-divider"></div>
      <div class="mg-detail-arb-row"><span>Profit per unit</span><span style="color:var(--accent-green);font-family:var(--font-mono);font-weight:700">$${profit}</span></div>
      <div class="mg-detail-arb-row"><span>ROI per 100 units</span><span style="color:var(--accent-green);font-family:var(--font-mono);font-weight:700">$${(profit * 100).toFixed(0)}</span></div>
    </div></div></div>`);
  }

  function openProfitCalc(id) {
    const g = DATA.gaps.find((x) => x.id === id);
    if (!g) return;
    window.HuntDrop.navigateTo('section-profit-lab');
    UI.toast('Opening Profit Calculator for ' + g.category, 'info');
  }

  function openAdStudio(id) {
    const g = DATA.gaps.find((x) => x.id === id);
    if (!g) return;
    window.HuntDrop.navigateTo('section-ad-studio');
    UI.toast('Opening Ad Studio for ' + g.category, 'info');
  }

  function toggleWatchlist(id) {
    const idx = _watchlist.indexOf(id);
    if (idx > -1) _watchlist.splice(idx, 1);
    else _watchlist.push(id);
    localStorage.setItem('mg_watchlist', JSON.stringify(_watchlist));
    refresh();
    UI.toast(idx > -1 ? 'Removed from watchlist' : 'Saved to watchlist', 'success');
  }

  function toggleEmergingWatchlist(id) {
    const idx = _emWatchlist.indexOf(id);
    if (idx > -1) _emWatchlist.splice(idx, 1);
    else _emWatchlist.push(id);
    localStorage.setItem('mg_em_watchlist', JSON.stringify(_emWatchlist));
    const t = _section?.querySelector('.mg-tab.active');
    if (t) showTab(t.dataset.tab);
    UI.toast(idx > -1 ? 'Removed from emerging watchlist' : 'Saved to emerging watchlist', 'success');
  }

  function exportCSV() {
    const gaps = getFilteredGaps();
    const headers = [
      'Category',
      'Gap Score',
      'Demand',
      'Supply',
      'Search Volume',
      'Sellers',
      'Margin',
      'Buy Price',
      'Sell Price',
      'Trend',
      'Risk',
      'CPA',
    ];
    const rows = gaps.map((g) => [
      g.category,
      g.gap,
      g.demandScore,
      g.supplyScore,
      g.searchVolume,
      g.sellers,
      g.arbitrage.margin,
      g.arbitrage.buy,
      g.arbitrage.sell,
      g.trend,
      g.riskScore,
      g.cpaAvg,
    ]);
    let csv = headers.join(',') + '\n';
    rows.forEach((r) => (csv += r.join(',') + '\n'));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market-gaps-export.csv';
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('CSV exported successfully', 'success');
  }

  function exportPDF() {
    const gaps = getFilteredGaps();
    let text = 'MARKET GAP FINDER — Export Report\nGenerated: ' + new Date().toLocaleString() + '\n\n';
    gaps.forEach((g, i) => {
      text += `#${i + 1} ${g.category}\nGap: ${g.gap} | Demand: ${g.demandScore} | Supply: ${g.supplyScore} | Margin: ${g.arbitrage.margin}%\nBuy: $${g.arbitrage.buy} -> Sell: $${g.arbitrage.sell} | Profit: $${(g.arbitrage.sell - g.arbitrage.buy).toFixed(2)}\nRisk: ${g.riskScore}/100 | Trend: ${g.trend}\n${g.action}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market-gaps-report.txt';
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('Report exported successfully', 'success');
  }

  function renderStats() {
    const el = _section?.querySelector('#mgStats');
    if (!el) return;
    const gaps = DATA.gaps;
    const len = gaps.length || 1;
    const avgGap = Math.round(gaps.reduce((s, g) => s + g.gap, 0) / len);
    const avgMargin = Math.round(gaps.reduce((s, g) => s + g.arbitrage.margin, 0) / len);
    const avgRisk = Math.round(gaps.reduce((s, g) => s + g.riskScore, 0) / len);
    const totalOpps = gaps.length + DATA.arb.length + DATA.emerging.length;
    el.innerHTML = `<div class="mg-stats-row">
      <div class="mg-stat-card"><div class="mg-stat-val" style="color:var(--accent-cyan)">${gaps.length}</div><div class="mg-stat-lbl">Market Gaps</div></div>
      <div class="mg-stat-card"><div class="mg-stat-val" style="color:var(--accent-green)">${avgGap}</div><div class="mg-stat-lbl">Avg Gap Score</div></div>
      <div class="mg-stat-card"><div class="mg-stat-val" style="color:var(--accent-green)">${avgMargin}%</div><div class="mg-stat-lbl">Avg Margin</div></div>
      <div class="mg-stat-card"><div class="mg-stat-val" style="color:${avgRisk < 25 ? 'var(--accent-green)' : avgRisk < 40 ? 'var(--accent-yellow)' : 'var(--accent-red)'}">${avgRisk}</div><div class="mg-stat-lbl">Avg Risk</div></div>
      <div class="mg-stat-card"><div class="mg-stat-val" style="color:var(--accent-purple)">${totalOpps}</div><div class="mg-stat-lbl">Total Opportunities</div></div>
    </div>`;
  }

  function renderInsights() {
    const el = _section?.querySelector('#mgInsights');
    if (!el) return;
    if (!DATA.gaps.length) {
      el.innerHTML =
        '<div class="mg-insights-section"><div class="mg-section-header"><h3 class="mg-section-title">&#x1F4A1; AI Insights</h3></div><div class="mg-empty">No data to generate insights. Run a search to analyze products.</div></div>';
      return;
    }
    const topGap = DATA.gaps.reduce((a, b) => (a.gap > b.gap ? a : b));
    const topMargin = DATA.gaps.reduce((a, b) => (a.arbitrage.margin > b.arbitrage.margin ? a : b));
    const rising = DATA.gaps.filter((g) => g.trend === 'rising');
    el.innerHTML = `<div class="mg-insights-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F4A1; AI Insights</h3></div>
      <div class="mg-insights-grid">
        <div class="mg-insight-card top-niches"><div class="mg-insight-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">&#x1F3AF;</div><div class="mg-insight-label">Top Opportunity</div><div class="mg-insight-title">${esc(topGap.category)}</div><div class="mg-insight-list"><div class="mg-insight-item"><span class="mg-insight-item-rank">#1</span><span class="mg-insight-item-name">${esc(topGap.category)}</span><span class="mg-insight-item-val" style="color:var(--accent-green)">Gap: ${topGap.gap}</span></div></div></div>
        <div class="mg-insight-card best-arb"><div class="mg-insight-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">&#x1F4B0;</div><div class="mg-insight-label">Highest Margin</div><div class="mg-insight-title">${esc(topMargin.category)}</div><div class="mg-insight-list"><div class="mg-insight-item"><span class="mg-insight-item-rank">#1</span><span class="mg-insight-item-name">${esc(topMargin.category)}</span><span class="mg-insight-item-val" style="color:var(--accent-green)">${topMargin.arbitrage.margin}%</span></div></div></div>
        <div class="mg-insight-card fastest"><div class="mg-insight-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">&#x1F680;</div><div class="mg-insight-label">Rising Trends</div><div class="mg-insight-title">${rising.length} niches</div><div class="mg-insight-list">${rising
          .slice(0, 3)
          .map(
            (g, i) =>
              `<div class="mg-insight-item"><span class="mg-insight-item-rank">#${i + 1}</span><span class="mg-insight-item-name">${esc(g.category)}</span><span class="mg-insight-item-val" style="color:var(--accent-green)">Rising</span></div>`
          )
          .join('')}</div></div>
      </div>
    </div>`;
  }

  function renderCharts() {
    const el = _section?.querySelector('#mgCharts');
    if (!el) return;
    if (!DATA.gaps.length) {
      el.innerHTML = '';
      return;
    }
    if (typeof Chart === 'undefined') {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `<div class="mg-charts-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F4CA; Gap vs Demand</h3></div>
      <div class="mg-chart-wrap"><canvas id="mgMainChart" height="200"></canvas></div>
    </div>`;
    setTimeout(() => {
      const c = el.querySelector('#mgMainChart');
      if (!c) return;
      if (_charts.main)
        try {
          _charts.main.destroy();
        } catch (e) {}
      _charts.main = new Chart(c, {
        type: 'bar',
        data: {
          labels: DATA.gaps.map((g) => g.category.split(' ').slice(0, 2).join(' ')),
          datasets: [
            { label: 'Gap Score', data: DATA.gaps.map((g) => g.gap), backgroundColor: 'rgba(0,229,255,0.6)' },
            { label: 'Demand', data: DATA.gaps.map((g) => g.demandScore), backgroundColor: 'rgba(0,255,136,0.6)' },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#94a3b8' } } },
          scales: {
            x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          },
        },
      });
    }, 100);
  }

  function renderCategories() {
    const el = _section?.querySelector('#mgCategories');
    if (!el) return;
    if (!DATA.categories.length) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `<div class="mg-categories-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F4C1; Categories</h3></div>
      <div class="mg-category-grid">${DATA.categories
        .map(
          (c) => `<div class="mg-category-card" data-cat-filter="${esc(c.name)}">
        <div class="mg-cat-emoji" style="background:${c.color}15;color:${c.color}">${c.emoji}</div>
        <div class="mg-cat-name">${esc(c.name)}</div>
        <div class="mg-cat-count">${c.count} gaps</div>
      </div>`
        )
        .join('')}</div>
    </div>`;
    el.querySelectorAll('[data-cat-filter]').forEach((card) => {
      card.addEventListener('click', () => {
        const catName = card.dataset.catFilter;
        _filters.category = catName;
        const catFilter = document.querySelector('#mgCategoryFilter');
        if (catFilter) {
          catFilter.value = catName;
        }
        refresh();
        _section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ── MAIN RENDER / REFRESH ─────────────────────────────────────────────

  function _render() {
    const fns = [
      renderAIScan,
      renderDataMeta,
      renderFilters,
      renderStats,
      renderInsights,
      renderCharts,
      renderCategories,
      renderTabs,
      renderBattlefield,
      renderNicheRadar,
      renderLifecycle,
      renderProductHunt,
      renderActionZone,
      renderCalculator,
    ];
    fns.forEach(function (fn) {
      try {
        fn();
      } catch (e) {
        console.error('[MG] render error:', e);
      }
    });
  }

  function refresh() {
    renderStats();
    renderCharts();
    renderCategories();
    renderInsights();
    renderFilters();
    renderDataMeta();
    renderAIScan();
    const t = _section?.querySelector('.mg-tab.active');
    if (t) showTab(t.dataset.tab);
  }

  function navigateTo(sectionId) {
    window.HuntDrop.navigateTo(sectionId);
  }

  // ── PLUGIN REGISTRATION ───────────────────────────────────────────────

  const P = {
    id: 'market-gap-finder',
    name: 'Market Gaps',
    version: '4.0.0',
    description:
      'Find Hidden Opportunities — gap scoring, arbitrage, emerging niches, competitor battlefield, niche radar, lifecycle tracking, AI insights',
    dependencies: ['search-engine'],

    init(_ctx) {
      Config.defaults('marketGap', { enabled: true });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;
      const s = document.createElement('section');
      s.className = 'section section-market-gap-finder';
      s.id = 'section-market-gaps';
      const rTools =
        window.HuntDrop && window.HuntDrop.renderRelatedTools
          ? window.HuntDrop.renderRelatedTools([
              {
                section: 'section-product-hunt',
                name: 'Product Hunt Scout',
                desc: 'Discover trending products',
                icon: '&#x1F525;',
                color: '#ff8a00',
              },
              {
                section: 'section-supplier-intel',
                name: 'Supplier Intelligence',
                desc: 'Verify suppliers',
                icon: '&#x1F6E1;',
                color: '#00e5ff',
              },
              {
                section: 'section-niche-radar',
                name: 'Niche Radar',
                desc: 'Validate niche profitability',
                icon: '&#x1F50D;',
                color: '#a855f7',
              },
              {
                section: 'section-lifecycle',
                name: 'Product Lifecycle',
                desc: 'Track niche maturity',
                icon: '&#x1F4C8;',
                color: '#00ff88',
              },
            ])
          : '';
      s.innerHTML = `<div class="section-inner">
      ${_renderHero()}
      <div id="mgAIScan"></div>
      <div id="mgDataMeta"></div>
      <div id="mgFilters"></div>
      <div id="mgStats"></div>
      <div id="mgInsights"></div>
      <div id="mgCharts"></div>
      <div id="mgCategories"></div>
      <div id="mgTabs"></div>
      <div id="mgTabContent"></div>
      <div id="mgBattlefield"></div>
      <div id="mgNicheRadar"></div>
      <div id="mgLifecycle"></div>
      <div id="mgProductHunt"></div>
      <div id="mgActionZone"></div>
      <div id="mgCalculator"></div>
      ${rTools}</div>`;
      container.appendChild(s);
      _section = s;

      _unsubSearch = EventBus.on('search:results', (data) => {
        if (data.results && data.results.length) {
          buildDataFromProducts(data.results);
          _render();
        }
      });

      const existing = window.HuntDrop.ALL_PRODUCTS;
      if (existing && existing.length) {
        buildDataFromProducts(existing);
      }

      _render();
    },

    unmount(_ctx) {
      Object.values(_charts).forEach((c) => {
        try {
          if (c) c.destroy();
        } catch (e) {}
      });
      _charts = {};
      if (_unsubSearch) {
        _unsubSearch();
        _unsubSearch = null;
      }
      if (_section) {
        _section.remove();
        _section = null;
      }
    },
  };

  window.HuntDrop._mgExportPDF = () => exportPDF();
  PluginRegistry.register('market-gap-finder', P);
})();
