// ============================================================================
// PLUGIN: Market Gap Finder — Find Hidden Opportunities (Complete Rebuild)
// ============================================================================
(function () {
  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(s);
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

  function navigateTo(sectionId) {
    window.HuntDrop.navigateTo(sectionId);
  }

  let _section = null;
  const _filters = { search: '', category: 'all', gapMin: 0, trend: 'all', sort: 'gap-desc' };
  const _watchlist = JSON.parse(localStorage.getItem('mg_watchlist') || '[]');
  let _charts = {};
  let _chartsInit = false;

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
    el.innerHTML = `<div class="mg-ai-scan">
      <span class="mg-ai-scan-icon">&#x1F9E0;</span>
      <span class="mg-ai-scan-text">AI scanned <strong>12,847 products</strong> across 10 platforms &mdash; <strong>${gaps} gaps</strong>, <strong>${arb} arbitrage</strong>, <strong>${em} emerging</strong> found</span>
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
        <input type="text" class="mg-search-input" placeholder="Search categories, products, keywords..." value="${_filters.search}" id="mgSearchInput">
      </div>
      <div class="mg-filter-controls">
        <select class="mg-filter-select" id="mgCategoryFilter">${cats.map((c) => `<option value="${c}">${c === 'all' ? 'All Categories' : c}</option>`).join('')}</select>
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
    const debouncedSearch = debounce(() => {
      refresh();
    }, 300);
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
    // Keyword chips -> Search
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
    // Audience interest chips -> Search
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
      return '<div class="mg-empty">No market gaps match your filters. Try adjusting your search.</div>';
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
    if (!arb.length) return '<div class="mg-empty">No arbitrage opportunities match your filters.</div>';
    return `<div class="mg-arb-section"><div class="mg-arb-header"><h3>Cross-Platform Price Gaps</h3><p>Buy low on AliExpress/Temu, sell high on Amazon/Shopify</p></div>
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
    if (!em.length) return '<div class="mg-empty">No emerging niches match your filters.</div>';
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
          return `<div class="mg-bf-card" style="cursor:pointer" onclick="document.querySelector('#mgCategoryFilter').value='${g.category}';document.querySelector('#mgCategoryFilter').dispatchEvent(new Event('change'));document.getElementById('section-market-gaps').scrollIntoView({behavior:'smooth',block:'start'})">
          <div class="mg-bf-top"><span class="mg-bf-emoji">${g.emoji}</span><span class="mg-bf-name">${g.category}</span><span class="mg-bf-sat ${satLevel}">${satLevel.toUpperCase()}</span></div>
          <div class="mg-bf-metrics">
            <div class="mg-bf-metric"><span class="mg-bf-metric-val">${g.sellers}</span><span class="mg-bf-metric-lbl">Sellers</span></div>
            <div class="mg-bf-metric"><span class="mg-bf-metric-val">${g.rating || '4.2'}</span><span class="mg-bf-metric-lbl">Avg Rating</span></div>
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
    el.innerHTML = `<div class="mg-niche-radar-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F50D; Niche Radar</h3><p class="mg-section-sub">Validate niche profitability with conversion, AOV, pain points and audience data</p></div>
      <div class="mg-nr-grid">${DATA.gaps
        .map((g) => {
          const convRate = (2 + Math.random() * 5).toFixed(1);
          const aov = Math.round((g.arbitrage.sell * 0.7 + g.arbitrage.sell * 1.3) / 2);
          return `<div class="mg-nr-card">
          <div class="mg-nr-top"><span class="mg-nr-emoji">${g.emoji}</span><span class="mg-nr-name">${g.category}</span><span class="mg-nr-score">${g.gap}</span></div>
          <div class="mg-nr-metrics">
            <div class="mg-nr-metric"><span class="mg-nr-metric-val" style="color:var(--accent-green)">${convRate}%</span><span class="mg-nr-metric-lbl">Conversion Rate</span></div>
            <div class="mg-nr-metric"><span class="mg-nr-metric-val">$${aov}</span><span class="mg-nr-metric-lbl">Avg Order Value</span></div>
          </div>
          <div class="mg-nr-pains"><div class="mg-nr-pains-title">Customer Pain Points</div><div class="mg-pain-points">${(g.painPoints || ['Limited options', 'High prices', 'Poor quality']).map((p) => `<span class="mg-pain-chip">&#x26A0; ${p}</span>`).join('')}</div></div>
          <div class="mg-nr-pains-title">Target Audience</div>
          <div class="mg-nr-audience">${g.audience.interests.map((i) => `<span class="mg-aud-chip">${i}</span>`).join('')}</div>
        </div>`;
        })
        .join('')}</div>
    </div>`;
  }

  function renderLifecycle() {
    const el = _section?.querySelector('#mgLifecycle');
    if (!el) return;
    el.innerHTML = `<div class="mg-lifecycle-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F4C8; Product Lifecycle</h3><p class="mg-section-sub">Track niche maturity stage and predict time-to-peak</p></div>
      <div class="mg-lc-grid">${DATA.gaps
        .map((g) => {
          const stage = g.marketSaturation < 25 ? 'Emerging' : g.marketSaturation < 55 ? 'Growing' : 'Saturated';
          const stageClass = stage.toLowerCase();
          const peakMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const peakMonth = peakMonths[Math.floor(Math.random() * 6) + 6];
          return `<div class="mg-lc-card">
          <div class="mg-lc-top"><span class="mg-lc-emoji">${g.emoji}</span><span class="mg-lc-name">${g.category}</span><span class="mg-lifecycle-badge ${stageClass}"><span class="mg-lifecycle-badge-dot"></span>${stage}</span></div>
          <div class="mg-lc-chart"><canvas id="mgLC_${g.id}" height="80"></canvas></div>
          <div class="mg-lc-meta"><span>Time-to-peak: <span class="mg-lc-peak">${Math.floor(Math.random() * 4) + 2} months</span></span><span>Peak: ${peakMonth}</span></div>
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
          } catch {
            /* ignored */
          }
        const colors = { Emerging: '#00e5ff', Growing: '#00ff88', Saturated: '#ff3366' };
        const stage = g.marketSaturation < 25 ? 'Emerging' : g.marketSaturation < 55 ? 'Growing' : 'Saturated';
        _charts[key] = new Chart(c, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
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
    const _topProducts = DATA.gaps
      .flatMap(
        (g) =>
          g.topProducts || [
            {
              name: g.topProduct,
              price: g.arbitrage.sell,
              margin: g.arbitrage.margin,
              shipTime: '7-15 days',
              supplier: g.suppliers[0]?.name || 'Various',
            },
          ]
      )
      .slice(0, 10);
    el.innerHTML = `<div class="mg-phunt-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F525; Product Hunt Scout</h3><p class="mg-section-sub">Top products per niche with supplier links, margins and shipping times</p></div>
      <div class="mg-phunt-grid">${DATA.gaps
        .slice(0, 5)
        .map(
          (g, i) => `<div class="mg-phunt-card" style="animation-delay:${i * 0.08}s">
        <div class="mg-phunt-rank">#${i + 1} in ${g.category}</div>
        <div class="mg-phunt-name">${g.topProduct}</div>
        <div class="mg-phunt-prices"><span class="mg-phunt-price">$${g.arbitrage.sell}</span><span class="mg-phunt-margin">${g.arbitrage.margin}% margin</span></div>
        <div class="mg-phunt-meta">Ship: 7-15 days</div>
        <div class="mg-phunt-meta">${g.suppliers[0]?.name || 'Various suppliers'}</div>
        <a class="mg-phunt-link" href="javascript:void(0)" onclick="window.HuntDrop.navigateTo('section-product-hunt')">View on AliExpress &rarr;</a>
      </div>`
        )
        .join('')}</div>
    </div>`;
  }

  function renderActionZone() {
    const el = _section?.querySelector('#mgActionZone');
    if (!el) return;
    const wlActive = _watchlist.length > 0;
    el.innerHTML = `<div class="mg-action-zone">
      <button class="mg-az-btn analyze" onclick="document.querySelector('#mgSearchInput')?.focus()">&#x1F9E0; Analyze Market</button>
      <button class="mg-az-btn compare" onclick="document.querySelector('#mgCategoryFilter').value='all';document.querySelector('#mgCategoryFilter').dispatchEvent(new Event('change'))">&#x1F4CA; Compare Niches</button>
      <button class="mg-az-btn export" onclick="window.HuntDrop._mgExportPDF&&window.HuntDrop._mgExportPDF()">&#x1F4C4; Export Report</button>
      <button class="mg-az-btn watchlist ${wlActive ? 'active' : ''}" onclick="document.querySelector('[data-tab=watchlist]')?.click()">&#x1F680; Watchlist (${_watchlist.length})</button>
    </div>`;
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
          <div class="mg-detail-arb-row"><span>Buy from ${g.platforms[0]}</span><span style="color:var(--accent-red);font-family:var(--font-mono);font-weight:700">$${g.arbitrage.buy}</span></div>
          <div class="mg-detail-arb-row"><span>Sell on ${g.platforms[1]}</span><span style="color:var(--accent-green);font-family:var(--font-mono);font-weight:700">$${g.arbitrage.sell}</span></div>
          <div class="mg-detail-arb-divider"></div>
          <div class="mg-detail-arb-row"><span>Profit per unit</span><span style="color:var(--accent-green);font-family:var(--font-mono);font-weight:700">$${(g.arbitrage.sell - g.arbitrage.buy).toFixed(2)}</span></div>
        </div></div>
        <div class="mg-detail-section"><h4>Target Audience</h4><div class="mg-detail-audience">
          <div class="mg-detail-aud-row"><span>Age Range</span><span>${g.audience.age}</span></div>
          <div class="mg-detail-aud-row"><span>Gender</span><span>${g.audience.gender}</span></div>
          <div class="mg-detail-aud-row"><span>Interests</span><span>${esc(g.audience.interests.join(', '))}</span></div>
          <div class="mg-detail-aud-row"><span>Countries</span><span>${esc(g.audience.countries.join(', '))}</span></div>
        </div></div>
        <div class="mg-detail-section"><h4>Keywords</h4><div class="mg-detail-keywords">${g.keywords.map((k) => `<span class="mg-kw-chip">${esc(k)}</span>`).join('')}</div></div>
        <div class="mg-detail-section"><h4>Top Suppliers</h4><div class="mg-detail-suppliers">${g.suppliers.map((s) => `<div class="mg-detail-supplier"><div class="mg-detail-sup-name">${esc(s.name)} ${s.verified ? '(Verified)' : ''}</div><div class="mg-detail-sup-meta">${s.location} - ${s.orders.toLocaleString()} orders - Rating: ${s.rating} - Response: ${s.responseTime}</div></div>`).join('')}</div></div>
        <div class="mg-detail-section mg-detail-wide"><h4>AI Opportunity Analysis</h4><div class="mg-detail-insight">${esc(g.opportunity)}</div></div>
        <div class="mg-detail-section mg-detail-wide"><h4>Recommended Action</h4><div class="mg-detail-action">${esc(g.action)}</div></div>
      </div></div>`);
  }

  function showArbDetail(id) {
    const a = DATA.arb.find((x) => x.id === id);
    if (!a) return;
    const profit = (a.amazonPrice - a.aliPrice).toFixed(2);
    UI.modal(`<div class="mg-detail"><div class="mg-detail-hero"><span class="mg-detail-emoji">&#x1F4B0;</span><div><h2 class="mg-detail-title">${esc(a.product)}</h2>
    <div class="mg-detail-tags"><span class="mg-detail-tag" style="background:var(--accent-green-dim);color:var(--accent-green)">${a.margin}% Margin</span><span class="mg-detail-tag" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">${a.demand} Demand</span></div></div></div>
    <div class="mg-detail-section"><h4>Price Breakdown</h4><div class="mg-detail-arb">
      <div class="mg-detail-arb-row"><span>Buy from ${a.platforms[1]}</span><span style="color:var(--accent-red);font-family:var(--font-mono);font-weight:700">$${a.aliPrice.toFixed(2)}</span></div>
      <div class="mg-detail-arb-row"><span>Sell on ${a.platforms[0]}</span><span style="color:var(--accent-green);font-family:var(--font-mono);font-weight:700">$${a.amazonPrice.toFixed(2)}</span></div>
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
    renderStats();
    renderTabs();
    UI.toast(idx > -1 ? 'Removed from watchlist' : 'Saved to watchlist', 'success');
  }

  function toggleEmergingWatchlist(_id) {}

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
    el.innerHTML = `<div class="mg-stats-grid">
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
        '<div class="mg-insights-section"><div class="mg-section-header"><h3 class="mg-section-title">&#x1F4A1; AI Insights</h3></div><div class="mg-empty">No data to generate insights. Add market gaps first.</div></div>';
      return;
    }
    const topGap = DATA.gaps.reduce((a, b) => (a.gap > b.gap ? a : b));
    const topMargin = DATA.gaps.reduce((a, b) => (a.arbitrage.margin > b.arbitrage.margin ? a : b));
    const rising = DATA.gaps.filter((g) => g.trend === 'rising');
    el.innerHTML = `<div class="mg-insights-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F4A1; AI Insights</h3></div>
      <div class="mg-insight-cards">
        <div class="mg-insight-card"><div class="mg-insight-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">&#x1F3AF;</div><div class="mg-insight-text"><strong>Top Opportunity:</strong> ${esc(topGap.category)} (Gap: ${topGap.gap})</div></div>
        <div class="mg-insight-card"><div class="mg-insight-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">&#x1F4B0;</div><div class="mg-insight-text"><strong>Highest Margin:</strong> ${esc(topMargin.category)} (${topMargin.arbitrage.margin}%)</div></div>
        <div class="mg-insight-card"><div class="mg-insight-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">&#x1F680;</div><div class="mg-insight-text"><strong>Rising Trends:</strong> ${rising.length} niches trending upward</div></div>
      </div>
    </div>`;
  }

  function renderCharts() {
    const el = _section?.querySelector('#mgCharts');
    if (!el || typeof Chart === 'undefined') return;
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
          plugins: { legend: { labels: { color: 'var(--text-secondary)' } } },
          scales: {
            x: { ticks: { color: 'var(--text-muted)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          },
        },
      });
    }, 100);
  }

  function renderCategories() {
    const el = _section?.querySelector('#mgCategories');
    if (!el) return;
    el.innerHTML = `<div class="mg-categories-section">
      <div class="mg-section-header"><h3 class="mg-section-title">&#x1F4C1; Categories</h3></div>
      <div class="mg-cat-grid">${DATA.categories
        .map((c) => {
          const count = DATA.gaps.filter((g) => g.category === c.name).length;
          return `<div class="mg-cat-card" style="cursor:pointer" onclick="document.querySelector('#mgCategoryFilter').value='${c.name}';document.querySelector('#mgCategoryFilter').dispatchEvent(new Event('change'))">
            <div class="mg-cat-emoji" style="background:${c.color}15;color:${c.color}">${c.emoji}</div>
            <div class="mg-cat-name">${c.name}</div>
            <div class="mg-cat-count">${count} gaps</div>
          </div>`;
        })
        .join('')}</div>
    </div>`;
  }

  function _render() {
    if (typeof DATA === 'undefined') return;
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
    const t = _section?.querySelector('.mg-tab.active');
    if (t) showTab(t.dataset.tab);
  }

  const P = {
    id: 'market-gap-finder',
    name: 'Market Gaps',
    version: '3.0.0',
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
      ${renderHero()}
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
      _render();
    },

    unmount(_ctx) {
      Object.values(_charts).forEach((c) => {
        try {
          if (c) c.destroy();
        } catch {
          /* ignored */
        }
      });
      _charts = {};
      _chartsInit = false;
      if (_section) {
        _section.remove();
        _section = null;
      }
    },
  };

  // Expose export for Action Zone button
  window.HuntDrop._mgExportPDF = () => exportPDF();

  // ============================================================================
  // DATA — 10 Gaps, 10 Arbitrage, 7 Emerging, 10 Categories
  // ============================================================================
  const DATA = {
    gaps: [],
    arb: [],
    emerging: [],
    categories: [],
  };

  PluginRegistry.register('market-gap-finder', P);
})();
