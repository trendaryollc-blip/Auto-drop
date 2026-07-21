// ============================================================================
// PLUGIN: Niche Radar — Professional Niche Discovery Platform
// ============================================================================
// Unique features: Blue Ocean Index, Niche Lifecycle Stage, Competitor Density
// Map, Profit Simulator, Seasonal Heatmap, Niche Comparison
// ============================================================================
(function () {
  const { UI, Config } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(s);
  let _section = null;
  let _detailOpen = false;
  let _keydownHandler = null;

  const NICHES = [];

  const SEASONAL_PEAKS = [];

  const TRENDING_NOW = [];

  function renderSparkline(data, color, w, h) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = w / (data.length - 1);
    let path = 'M';
    data.forEach((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      path += (i === 0 ? '' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    });
    const fillPath = path + 'L' + w + ',' + h + 'L0,' + h + 'Z';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="nr-sparkline"><defs><linearGradient id="sg${color.replace(/[^a-z0-9]/gi, '')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${fillPath}" fill="url(#sg${color.replace(/[^a-z0-9]/gi, '')})" /><path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${(data.length - 1) * step}" cy="${h - ((data[data.length - 1] - min) / range) * (h - 4) - 2}" r="2.5" fill="${color}"/></svg>`;
  }

  function renderHeatmap(seasonality) {
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const max = Math.max(...seasonality);
    return `<div class="nr-heatmap">${seasonality
      .map((v, i) => {
        const intensity = v / max;
        const color =
          intensity > 0.9
            ? 'var(--accent-red)'
            : intensity > 0.75
              ? 'var(--accent-orange)'
              : intensity > 0.6
                ? 'var(--accent-yellow)'
                : 'var(--accent-cyan)';
        return `<div class="nr-heat-cell" style="background:${color};opacity:${0.3 + intensity * 0.7}" title="${months[i]}: ${v}"><span class="nr-heat-label">${months[i]}</span></div>`;
      })
      .join('')}</div>`;
  }

  function renderCompetitionBar(saturation) {
    const color =
      saturation < 30 ? 'var(--accent-green)' : saturation < 55 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    return `<div class="nr-comp-bar"><div class="nr-comp-fill" style="width:${saturation}%;background:${color}"></div><span class="nr-comp-pct">${saturation}%</span></div>`;
  }

  function renderPlatformChips(platforms) {
    return `<div class="nr-platforms">${platforms
      .map((p) => {
        const c = p.sellers < 8 ? 'var(--accent-green)' : p.sellers < 20 ? 'var(--accent-yellow)' : 'var(--accent-red)';
        return `<span class="nr-plat-chip"><span class="nr-plat-dot" style="background:${c}"></span>${p.name} <span class="nr-plat-count">${p.sellers}</span></span>`;
      })
      .join('')}</div>`;
  }

  const NicheRadarPlugin = {
    id: 'niche-radar',
    name: 'Niche Finder',
    version: '2.0.0',
    description:
      'Professional niche discovery with Blue Ocean Index, lifecycle tracking, competitor density maps, and profit simulation',
    dependencies: ['search-engine'],

    init(_ctx) {
      Config.defaults('nicheRadar', { enabled: true });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section section-niche';
      section.id = 'section-niche-radar';
      _section = section;

      if (NICHES.length === 0) {
        section.innerHTML = `<div class="section-inner"><div class="nr-hero"><h2 class="section-title">Niche Radar</h2><p class="section-desc">Discover untapped niches, track lifecycle stages, and find blue ocean opportunities before everyone else</p></div><div class="nr-empty-state" style="text-align:center;padding:60px 20px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:16px">🎯</div><h3 style="margin-bottom:8px;color:var(--text-primary)">No Niche Data Available</h3><p style="max-width:400px;margin:0 auto">Connect your platform API keys in Settings to discover real niche opportunities based on live market data.</p><button onclick="window.HuntDrop.navigateTo('section-settings')" style="margin-top:20px;padding:10px 24px;background:var(--accent-cyan);color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:600">Go to Settings</button></div></div>`;
        container.appendChild(section);
        return;
      }

      const avgScore = Math.round(NICHES.reduce((a, n) => a + n.score, 0) / NICHES.length);
      const hottest = NICHES.reduce((a, n) => (n.score > a.score ? n : a));
      const bestBlue = NICHES.reduce((a, n) => (n.blueOcean > a.blueOcean ? n : a));
      const totalRevenue = NICHES.reduce((a, n) => a + parseFloat(n.revenue.replace(/[$M]/g, '')), 0).toFixed(1);

      const now = new Date().getMonth();
      const seasonalHtml = [];
      for (let i = 0; i < 4; i++) {
        const s = SEASONAL_PEAKS[(now + i) % 12];
        seasonalHtml.push(
          `<div class="nr-seasonal-card" style="animation-delay:${i * 0.08}s"><div class="nr-seasonal-month">${esc(s.month)}</div><div class="nr-seasonal-niches">${s.niches.map((n) => '<span class="nr-seasonal-niche">' + esc(n) + '</span>').join('')}</div><div class="nr-seasonal-reason">${esc(s.reason)}</div></div>`
        );
      }

      const nicheCardsHtml = [];
      for (let i = 0; i < NICHES.length; i++) {
        const n = NICHES[i];
        const heatColor =
          n.heat === 'hot' ? 'var(--accent-red)' : n.heat === 'warm' ? 'var(--accent-orange)' : 'var(--accent-cyan)';
        const lifecycleColor =
          n.lifecycle === 'emerging'
            ? 'var(--accent-cyan)'
            : n.lifecycle === 'growing'
              ? 'var(--accent-green)'
              : 'var(--accent-orange)';
        nicheCardsHtml.push(
          `<div class="nr-card" data-id="${n.id}" style="animation-delay:${i * 0.06}s" onclick="event.stopPropagation();window.HuntDrop._nicheDetail(${n.id})"><div class="nr-card-top"><div class="nr-card-title-row"><span class="nr-card-emoji">${esc(n.emoji)}</span><span class="nr-card-name">${esc(n.name)}</span><span class="nr-card-score" style="background:${heatColor}22;color:${heatColor}">${n.score}</span></div><div class="nr-card-tags"><span class="nr-tag nr-tag-lifecycle" style="background:${lifecycleColor}18;color:${lifecycleColor}">${n.lifecycle}</span><span class="nr-tag" style="background:var(--accent-green-dim);color:var(--accent-green)">${n.growth}</span><span class="nr-tag" style="background:var(--accent-orange-dim);color:var(--accent-orange)">Ocean: ${n.blueOcean}</span></div></div><div class="nr-card-spark">${renderSparkline(n.trendData, heatColor, 280, 50)}</div><div class="nr-card-metrics"><div class="nr-metric"><span class="nr-metric-val" style="color:var(--accent-green)">${n.growth}</span><span class="nr-metric-lbl">Growth</span></div><div class="nr-metric"><span class="nr-metric-val">${n.products.toLocaleString()}</span><span class="nr-metric-lbl">Products</span></div><div class="nr-metric"><span class="nr-metric-val" style="color:var(--accent-cyan)">${n.revenue}</span><span class="nr-metric-lbl">Revenue</span></div><div class="nr-metric"><span class="nr-metric-val" style="color:var(--accent-green)">${n.avgMargin}%</span><span class="nr-metric-lbl">Avg Margin</span></div></div><div class="nr-card-comp"><span class="nr-comp-label">Competition</span>${renderCompetitionBar(n.saturation)}</div><div class="nr-card-heat">${renderHeatmap(n.seasonality)}</div><div class="nr-card-platforms">${renderPlatformChips(n.platforms)}</div><div class="nr-card-products">${n.topProducts.map((p) => '<div class="nr-prod-chip"><img src="' + esc(p.img) + '" class="nr-prod-img" alt="" onerror="this.style.display=\'none\'"><span class="nr-prod-name">' + esc(p.name) + '</span><span class="nr-prod-price">$' + p.price + '</span></div>').join('')}</div><div class="nr-card-actions"><button class="nr-btn nr-btn-primary" onclick="event.stopPropagation();window.HuntDrop._nicheExplore(${n.id})">Explore Products</button><button class="nr-btn nr-btn-ghost" onclick="event.stopPropagation();window.HuntDrop._nicheDetail(${n.id})">Full Analysis</button></div></div>`
        );
      }

      section.innerHTML = `
      <div class="section-inner">
        <div class="nr-hero" style="animation:fadeUp 0.5s ease both">
          <h2 class="section-title">Niche Radar</h2>
          <p class="section-desc">Discover untapped niches, track lifecycle stages, and find blue ocean opportunities before everyone else</p>
          <div class="nr-search-bar" role="search" aria-label="Niche search and filters">
            <input type="text" id="nicheSearch" placeholder="Search niches..." class="nr-search-input" autocomplete="off">
            <div class="nr-filter-row" role="group" aria-label="Niche filters">
              <button class="nr-filter active" data-filter="all" onclick="window.HuntDrop._nicheFilter(this,'all')">All</button>
              <button class="nr-filter" data-filter="hot" onclick="window.HuntDrop._nicheFilter(this,'hot')">Hot</button>
              <button class="nr-filter" data-filter="warm" onclick="window.HuntDrop._nicheFilter(this,'warm')">Warm</button>
              <button class="nr-filter" data-filter="cool" onclick="window.HuntDrop._nicheFilter(this,'cool')">Cool</button>
              <span class="nr-filter-sep"></span>
              <button class="nr-filter" data-filter="emerging" onclick="window.HuntDrop._nicheFilter(this,'emerging')">Emerging</button>
              <button class="nr-filter" data-filter="growing" onclick="window.HuntDrop._nicheFilter(this,'growing')">Growing</button>
              <button class="nr-filter" data-filter="mature" onclick="window.HuntDrop._nicheFilter(this,'mature')">Mature</button>
              <span class="nr-filter-sep"></span>
              <select id="nicheSort" class="nr-sort-select" onchange="window.HuntDrop._nicheSort(this.value)">
                <option value="score">Sort: Score</option>
                <option value="growth">Sort: Growth</option>
                <option value="blueOcean">Sort: Blue Ocean</option>
                <option value="revenue">Sort: Revenue</option>
                <option value="competition">Sort: Competition (Low)</option>
              </select>
            </div>
          </div>
        </div>
        <div class="nr-scorecard" style="animation:fadeUp 0.5s ease 0.1s both">
          <div class="nr-sc-item"><div class="nr-sc-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><div class="nr-sc-data"><span class="nr-sc-value">${NICHES.length}</span><span class="nr-sc-label">Niches Tracked</span></div></div>
          <div class="nr-sc-item"><div class="nr-sc-icon" style="background:var(--accent-green-dim);color:var(--accent-green)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div><div class="nr-sc-data"><span class="nr-sc-value">${avgScore}</span><span class="nr-sc-label">Avg Score</span></div></div>
          <div class="nr-sc-item"><div class="nr-sc-icon" style="background:var(--accent-red-dim);color:var(--accent-red)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div><div class="nr-sc-data"><span class="nr-sc-value">${hottest.emoji} ${hottest.name}</span><span class="nr-sc-label">Hottest Niche</span></div></div>
          <div class="nr-sc-item"><div class="nr-sc-icon" style="background:rgba(0,229,255,0.08);color:#00e5ff"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></div><div class="nr-sc-data"><span class="nr-sc-value">${bestBlue.emoji} ${bestBlue.name}</span><span class="nr-sc-label">Best Blue Ocean</span></div></div>
          <div class="nr-sc-item"><div class="nr-sc-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="nr-sc-data"><span class="nr-sc-value">$${totalRevenue}M</span><span class="nr-sc-label">Total Revenue</span></div></div>
        </div>
        <div class="nr-section" style="animation:fadeUp 0.5s ease 0.2s both">
          <h3 class="nr-section-title"><span class="nr-section-icon" style="background:var(--accent-red-dim);color:var(--accent-red)">🔥</span>Trending Now</h3>
          <div class="nr-trending-scroll">${TRENDING_NOW.map((t) => '<div class="nr-trending-card ' + (t.hot ? 'nr-trending-hot' : '') + '" onclick="window.HuntDrop._nicheExplore(\'' + t.name + '\')"><span class="nr-trend-emoji">' + t.emoji + '</span><span class="nr-trend-name">' + t.name + '</span><span class="nr-trend-growth" style="color:var(--accent-green)">' + t.growth + '</span></div>').join('')}</div>
        </div>
        <div class="nr-section" style="animation:fadeUp 0.5s ease 0.3s both">
          <h3 class="nr-section-title"><span class="nr-section-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">📅</span>Seasonal Opportunities</h3>
          <div class="nr-seasonal-grid">${seasonalHtml.join('')}</div>
        </div>
        <div class="nr-section" style="animation:fadeUp 0.5s ease 0.4s both">
          <h3 class="nr-section-title"><span class="nr-section-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🎯</span>All Niches</h3>
          <div class="nr-grid" id="nicheGrid">${nicheCardsHtml.join('')}</div>
        </div>
        ${window.HuntDrop.renderRelatedTools([
          {
            section: 'section-product-hunt',
            name: 'Product Hunt',
            desc: 'Find winning products',
            icon: '🔥',
            color: '#FF6B6B',
          },
          {
            section: 'section-market-gaps',
            name: 'Market Gaps',
            desc: 'Find underserved markets',
            icon: '🔍',
            color: '#4ECDC4',
          },
          {
            section: 'section-battlefield',
            name: 'Competitor Check',
            desc: 'Map competitors',
            icon: '⚔️',
            color: '#45B7D1',
          },
          {
            section: 'section-lifecycle',
            name: 'Product Lifecycle',
            desc: 'Track product stages',
            icon: '📈',
            color: '#96CEB4',
          },
        ])}
      </div>`;
      container.appendChild(section);
      _section = section;

      const searchEl = section.querySelector('#nicheSearch');
      if (searchEl)
        searchEl.addEventListener('input', function () {
          applyFilters();
        });

      _keydownHandler = function (e) {
        if (e.key === 'Escape' && _detailOpen) closeDetail();
      };
      document.addEventListener('keydown', _keydownHandler);
    },

    unmount(_ctx) {
      if (_keydownHandler) {
        document.removeEventListener('keydown', _keydownHandler);
        _keydownHandler = null;
      }
      if (_section) _section.remove();
      _section = null;
      _detailOpen = false;
      delete window.HuntDrop._nicheExplore;
      delete window.HuntDrop._nicheDetail;
      delete window.HuntDrop._nicheFilter;
      delete window.HuntDrop._nicheSort;
      delete window.HuntDrop._nicheCloseDetail;
    },
  };

  function renderGrid(niches) {
    const grid = _section.querySelector('#nicheGrid');
    if (!grid) {
      console.warn('[NicheRadar] #nicheGrid not found');
      return;
    }
    if (niches.length === 0) {
      grid.innerHTML = '<div class="nr-empty">No niches match your filters</div>';
      return;
    }
    const cards = [];
    for (const n of niches) {
      try {
        const heatColor =
          n.heat === 'hot' ? 'var(--accent-red)' : n.heat === 'warm' ? 'var(--accent-orange)' : 'var(--accent-cyan)';
        const lifecycleColor =
          n.lifecycle === 'emerging'
            ? 'var(--accent-cyan)'
            : n.lifecycle === 'growing'
              ? 'var(--accent-green)'
              : 'var(--accent-orange)';
        cards.push(`<div class="nr-card" data-id="${n.id}" onclick="event.stopPropagation();window.HuntDrop._nicheDetail(${n.id})">
      <div class="nr-card-top">
        <div class="nr-card-title-row">
          <span class="nr-card-emoji">${esc(n.emoji)}</span>
          <span class="nr-card-name">${esc(n.name)}</span>
          <span class="nr-card-score" style="background:${heatColor}22;color:${heatColor}">${n.score}</span>
        </div>
        <div class="nr-card-tags">
          <span class="nr-tag nr-tag-lifecycle" style="background:${lifecycleColor}18;color:${lifecycleColor}">${n.lifecycle}</span>
          <span class="nr-tag" style="background:var(--accent-green-dim);color:var(--accent-green)">${n.growth}</span>
          <span class="nr-tag" style="background:var(--accent-orange-dim);color:var(--accent-orange)">Ocean: ${n.blueOcean}</span>
        </div>
      </div>
      <div class="nr-card-spark">${renderSparkline(n.trendData, heatColor, 280, 50)}</div>
      <div class="nr-card-metrics">
        <div class="nr-metric"><span class="nr-metric-val" style="color:var(--accent-green)">${n.growth}</span><span class="nr-metric-lbl">Growth</span></div>
        <div class="nr-metric"><span class="nr-metric-val">${n.products.toLocaleString()}</span><span class="nr-metric-lbl">Products</span></div>
        <div class="nr-metric"><span class="nr-metric-val" style="color:var(--accent-cyan)">${n.revenue}</span><span class="nr-metric-lbl">Revenue</span></div>
        <div class="nr-metric"><span class="nr-metric-val" style="color:var(--accent-green)">${n.avgMargin}%</span><span class="nr-metric-lbl">Avg Margin</span></div>
      </div>
      <div class="nr-card-comp">
        <span class="nr-comp-label">Competition</span>
        ${renderCompetitionBar(n.saturation)}
      </div>
      <div class="nr-card-heat">${renderHeatmap(n.seasonality)}</div>
      <div class="nr-card-platforms">${renderPlatformChips(n.platforms)}</div>
      <div class="nr-card-products">
        ${n.topProducts.map((p) => `<div class="nr-prod-chip"><img src="${esc(p.img)}" class="nr-prod-img" alt="" onerror="this.style.display='none'"><span class="nr-prod-name">${esc(p.name)}</span><span class="nr-prod-price">$${p.price}</span></div>`).join('')}
      </div>
      <div class="nr-card-actions">
        <button class="nr-btn nr-btn-primary" onclick="event.stopPropagation();window.HuntDrop._nicheExplore(${n.id})">Explore Products</button>
        <button class="nr-btn nr-btn-ghost" onclick="event.stopPropagation();window.HuntDrop._nicheDetail(${n.id})">Full Analysis</button>
      </div>
    </div>`);
      } catch (cardErr) {
        console.error('[NicheRadar] Card render error for', n.name, cardErr);
      }
    }
    grid.innerHTML = cards.join('');
  }

  function renderSeasonal() {
    const grid = _section.querySelector('#seasonalGrid');
    if (!grid) return;
    const now = new Date().getMonth();
    const upcoming = [];
    for (let i = 0; i < 4; i++) {
      upcoming.push(SEASONAL_PEAKS[(now + i) % 12]);
    }
    grid.innerHTML = upcoming
      .map(
        (s) => `
    <div class="nr-seasonal-card">
      <div class="nr-seasonal-month">${esc(s.month)}</div>
      <div class="nr-seasonal-niches">${s.niches.map((n) => `<span class="nr-seasonal-niche">${esc(n)}</span>`).join('')}</div>
      <div class="nr-seasonal-reason">${esc(s.reason)}</div>
    </div>`
      )
      .join('');
  }

  function renderDetailPanel(id) {
    const n = NICHES.find((x) => x.id === id);
    if (!n) return;
    const panel = _section.querySelector('#nicheDetailPanel');
    const overlay = _section.querySelector('#nicheDetailOverlay');
    if (!panel || !overlay) return;

    const heatColor =
      n.heat === 'hot' ? 'var(--accent-red)' : n.heat === 'warm' ? 'var(--accent-orange)' : 'var(--accent-cyan)';
    const lifecycleColor =
      n.lifecycle === 'emerging'
        ? 'var(--accent-cyan)'
        : n.lifecycle === 'growing'
          ? 'var(--accent-green)'
          : 'var(--accent-orange)';

    panel.innerHTML = `
    <button class="nr-detail-close" id="nrDetailClose"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div class="nr-detail-hero">
      <span class="nr-detail-emoji">${esc(n.emoji)}</span>
      <div>
        <h2 class="nr-detail-name">${esc(n.name)}</h2>
        <div class="nr-detail-tags">
          <span class="nr-tag" style="background:${heatColor}22;color:${heatColor}">Score ${n.score}/100</span>
          <span class="nr-tag" style="background:${lifecycleColor}18;color:${lifecycleColor}">${n.lifecycle}</span>
          <span class="nr-tag" style="background:var(--accent-green-dim);color:var(--accent-green)">${n.growth} growth</span>
          <span class="nr-tag" style="background:var(--accent-orange-dim);color:var(--accent-orange)">Blue Ocean: ${n.blueOcean}/100</span>
        </div>
      </div>
    </div>

    <div class="nr-detail-section">
      <h4 class="nr-detail-subtitle">12-Month Trend</h4>
      <div class="nr-detail-spark">${renderSparkline(n.trendData, heatColor, 500, 80)}</div>
    </div>

    <div class="nr-detail-metrics">
      <div class="nr-dm-card"><span class="nr-dm-val" style="color:var(--accent-green)">${n.growth}</span><span class="nr-dm-lbl">Growth</span></div>
      <div class="nr-dm-card"><span class="nr-dm-val">${n.products.toLocaleString()}</span><span class="nr-dm-lbl">Products</span></div>
      <div class="nr-dm-card"><span class="nr-dm-val" style="color:var(--accent-cyan)">${n.revenue}</span><span class="nr-dm-lbl">Revenue</span></div>
      <div class="nr-dm-card"><span class="nr-dm-val" style="color:var(--accent-green)">${n.avgMargin}%</span><span class="nr-dm-lbl">Avg Margin</span></div>
      <div class="nr-dm-card"><span class="nr-dm-val">${n.sellers}</span><span class="nr-dm-lbl">Sellers</span></div>
      <div class="nr-dm-card"><span class="nr-dm-val">${n.searchVol}</span><span class="nr-dm-lbl">Search Vol</span></div>
      <div class="nr-dm-card"><span class="nr-dm-val" style="color:${n.riskScore < 30 ? 'var(--accent-green)' : n.riskScore < 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'}">${n.riskScore}/100</span><span class="nr-dm-lbl">Risk Score</span></div>
      <div class="nr-dm-card"><span class="nr-dm-val">${n.confidence}%</span><span class="nr-dm-lbl">AI Confidence</span></div>
    </div>

    <div class="nr-detail-section">
      <h4 class="nr-detail-subtitle">Competition by Platform</h4>
      <div class="nr-detail-platforms">${n.platforms
        .map((p) => {
          const barW = Math.min((p.sellers / 50) * 100, 100);
          const c =
            p.sellers < 8 ? 'var(--accent-green)' : p.sellers < 20 ? 'var(--accent-yellow)' : 'var(--accent-red)';
          return `<div class="nr-dplat-row"><span class="nr-dplat-name">${esc(p.name)}</span><div class="nr-dplat-bar-wrap"><div class="nr-dplat-bar" style="width:${barW}%;background:${c}"></div></div><span class="nr-dplat-count">${p.sellers} sellers</span><span class="nr-dplat-avg">avg $${p.avgPrice}</span></div>`;
        })
        .join('')}</div>
    </div>

    <div class="nr-detail-section">
      <h4 class="nr-detail-subtitle">Seasonal Demand</h4>
      ${renderHeatmap(n.seasonality)}
    </div>

    <div class="nr-detail-section">
      <h4 class="nr-detail-subtitle">Target Audience</h4>
      <div class="nr-audience"><span class="nr-aud-chip">Age: ${n.audience.age}</span><span class="nr-aud-chip">Gender: ${n.audience.gender}</span>${n.audience.interests.map((i) => `<span class="nr-aud-chip">${esc(i)}</span>`).join('')}</div>
    </div>

    <div class="nr-detail-section">
      <h4 class="nr-detail-subtitle">Profit Simulator</h4>
      <div class="nr-simulator">
        <div class="nr-sim-row"><span>Estimated monthly sales</span><span class="nr-sim-val">200 units</span></div>
        <div class="nr-sim-row"><span>Avg sell price (Amazon)</span><span class="nr-sim-val">$${n.platforms[0]?.avgPrice || 29.99}</span></div>
        <div class="nr-sim-row"><span>Cost + shipping</span><span class="nr-sim-val" style="color:var(--accent-red)">-$${(n.platforms[0]?.avgPrice * (1 - n.avgMargin / 100) * 0.6).toFixed(2)}</span></div>
        <div class="nr-sim-row"><span>Ad cost per sale (~15%)</span><span class="nr-sim-val" style="color:var(--accent-red)">-$${(n.platforms[0]?.avgPrice * 0.15).toFixed(2)}</span></div>
        <div class="nr-sim-divider"></div>
        <div class="nr-sim-row nr-sim-total"><span>Est. Monthly Profit</span><span class="nr-sim-val" style="color:var(--accent-green)">$${Math.round(200 * n.platforms[0]?.avgPrice * (n.avgMargin / 100) * 0.65).toLocaleString()}</span></div>
      </div>
    </div>

    <div class="nr-detail-section">
      <h4 class="nr-detail-subtitle">AI Insight</h4>
      <p class="nr-insight-text">${esc(n.insight)}</p>
    </div>

    <div class="nr-detail-actions">
      <button class="nr-btn nr-btn-primary nr-btn-lg" onclick="window.HuntDrop._nicheCloseDetail();window.HuntDrop._nicheExplore(${n.id})">Explore Products in ${esc(n.name)}</button>
      <button class="nr-btn nr-btn-ghost nr-btn-lg" onclick="window.HuntDrop._nicheCloseDetail();window.HuntDrop.navigateTo('section-supplier-hub')">Find Suppliers</button>
    </div>`;

    overlay.classList.add('nr-detail-open');
    _detailOpen = true;
  }

  function closeDetail() {
    const overlay = _section?.querySelector('#nicheDetailOverlay');
    if (overlay) overlay.classList.remove('nr-detail-open');
    _detailOpen = false;
  }

  function applyFilters() {
    if (!_section) return;
    const query = (_section.querySelector('#nicheSearch')?.value || '').toLowerCase();
    const activeFilter = _section.querySelector('.nr-filter.active')?.dataset.filter || 'all';
    const sortBy = _section.querySelector('#nicheSort')?.value || 'score';

    const filtered = NICHES.filter((n) => {
      if (query && !n.name.toLowerCase().includes(query)) return false;
      if (activeFilter === 'hot' && n.heat !== 'hot') return false;
      if (activeFilter === 'warm' && n.heat !== 'warm') return false;
      if (activeFilter === 'cool' && n.heat !== 'cool') return false;
      if (activeFilter === 'emerging' && n.lifecycle !== 'emerging') return false;
      if (activeFilter === 'growing' && n.lifecycle !== 'growing') return false;
      if (activeFilter === 'mature' && n.lifecycle !== 'mature') return false;
      return true;
    });

    const sortFns = {
      score: (a, b) => b.score - a.score,
      growth: (a, b) => parseInt(b.growth) - parseInt(a.growth),
      blueOcean: (a, b) => b.blueOcean - a.blueOcean,
      revenue: (a, b) => parseFloat(b.revenue.replace(/[$M]/g, '')) - parseFloat(a.revenue.replace(/[$M]/g, '')),
      competition: (a, b) => a.saturation - b.saturation,
    };
    filtered.sort(sortFns[sortBy] || sortFns.score);

    renderGrid(filtered);
  }

  window.HuntDrop._nicheExplore = function (idOrName) {
    const niche =
      typeof idOrName === 'number' ? NICHES.find((n) => n.id === idOrName) : NICHES.find((n) => n.name === idOrName);
    if (!niche) return;
    window.HuntDrop.navigateTo('section-product-hunt');
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = niche.name;
      searchInput.dispatchEvent(new Event('input'));
    }
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.click();
  };

  window.HuntDrop._nicheDetail = function (id) {
    const n = NICHES.find((x) => x.id === id);
    if (!n) return;

    const container = document.getElementById('sections-container');
    if (!container) return;

    // Remove any existing detail page
    const existing = document.getElementById('section-niche-detail');
    if (existing) existing.remove();

    const heatColor = n.heat === 'hot' ? '#ff3366' : n.heat === 'warm' ? '#ff8a00' : '#00e5ff';
    const heatVar =
      n.heat === 'hot' ? 'var(--accent-red)' : n.heat === 'warm' ? 'var(--accent-orange)' : 'var(--accent-cyan)';
    const lifecycleColor =
      n.lifecycle === 'emerging'
        ? 'var(--accent-cyan)'
        : n.lifecycle === 'growing'
          ? 'var(--accent-green)'
          : 'var(--accent-orange)';
    const riskColor =
      n.riskScore < 30 ? 'var(--accent-green)' : n.riskScore < 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    const avgPrice = n.platforms[0]?.avgPrice || 29.99;
    const costShip = (avgPrice * (1 - n.avgMargin / 100) * 0.6).toFixed(2);
    const adCost = (avgPrice * 0.15).toFixed(2);
    const monthlyProfit = Math.round(200 * avgPrice * (n.avgMargin / 100) * 0.65);
    const maxSeason = Math.max(...n.seasonality);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Build trend SVG path
    const tW = 800,
      tH = 160,
      tPad = 10;
    const tMin = Math.min(...n.trendData),
      tMax = Math.max(...n.trendData);
    const tRange = tMax - tMin || 1;
    const trendPoints = n.trendData.map((v, i) => {
      const x = tPad + (i / (n.trendData.length - 1)) * (tW - tPad * 2);
      const y = tPad + (1 - (v - tMin) / tRange) * (tH - tPad * 2);
      return { x, y, v };
    });
    const trendPath = trendPoints
      .map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1))
      .join(' ');
    const trendArea =
      trendPath +
      ' L' +
      trendPoints[trendPoints.length - 1].x.toFixed(1) +
      ',' +
      tH +
      ' L' +
      trendPoints[0].x.toFixed(1) +
      ',' +
      tH +
      ' Z';

    const section = document.createElement('section');
    section.className = 'section section-niche-detail';
    section.id = 'section-niche-detail';
    section.innerHTML = `
  <div class="section-inner">
    <div class="nd-page">

      <div class="nd-nav">
        <button class="nd-back" onclick="window.HuntDrop._nicheCloseDetail()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back to All Niches
        </button>
        <div class="nd-nav-actions">
          <button class="nr-btn nr-btn-ghost" onclick="window.HuntDrop._nicheExplore(${n.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Explore Products
          </button>
          <button class="nr-btn nr-btn-ghost" onclick="window.HuntDrop._nicheCloseDetail();window.HuntDrop.navigateTo('section-supplier-hub')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
            Find Suppliers
          </button>
        </div>
      </div>

      <div class="nd-hero" style="--nd-heat:${heatColor}">
        <div class="nd-hero-glow"></div>
        <div class="nd-hero-content">
          <div class="nd-hero-badge">${esc(n.emoji)}</div>
          <div class="nd-hero-info">
            <h1 class="nd-hero-name">${esc(n.name)}</h1>
            <div class="nd-hero-tags">
              <span class="nd-tag nd-tag-score" style="background:${heatVar}18;color:${heatVar}">Score ${n.score}/100</span>
              <span class="nd-tag" style="background:${lifecycleColor}18;color:${lifecycleColor}">${n.lifecycle}</span>
              <span class="nd-tag" style="background:var(--accent-green-dim);color:var(--accent-green)">${n.growth} growth</span>
              <span class="nd-tag" style="background:var(--accent-orange-dim);color:var(--accent-orange)">Blue Ocean: ${n.blueOcean}/100</span>
              <span class="nd-tag" style="background:${riskColor}18;color:${riskColor}">Risk: ${n.riskScore}/100</span>
            </div>
          </div>
        </div>
      </div>

      <div class="nd-metrics-grid">
        <div class="nd-metric-card" style="--mc-accent:var(--accent-green)">
          <div class="nd-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
          <div class="nd-mc-val">${n.growth}</div>
          <div class="nd-mc-lbl">Growth</div>
        </div>
        <div class="nd-metric-card" style="--mc-accent:var(--accent-cyan)">
          <div class="nd-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>
          <div class="nd-mc-val">${n.products.toLocaleString()}</div>
          <div class="nd-mc-lbl">Products</div>
        </div>
        <div class="nd-metric-card" style="--mc-accent:var(--accent-purple)">
          <div class="nd-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          <div class="nd-mc-val">${n.revenue}</div>
          <div class="nd-mc-lbl">Revenue</div>
        </div>
        <div class="nd-metric-card" style="--mc-accent:var(--accent-green)">
          <div class="nd-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg></div>
          <div class="nd-mc-val">${n.avgMargin}%</div>
          <div class="nd-mc-lbl">Avg Margin</div>
        </div>
        <div class="nd-metric-card" style="--mc-accent:var(--accent-yellow)">
          <div class="nd-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
          <div class="nd-mc-val">${n.sellers}</div>
          <div class="nd-mc-lbl">Sellers</div>
        </div>
        <div class="nd-metric-card" style="--mc-accent:var(--accent-cyan)">
          <div class="nd-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <div class="nd-mc-val">${n.searchVol}</div>
          <div class="nd-mc-lbl">Search Volume</div>
        </div>
        <div class="nd-metric-card" style="--mc-accent:${riskColor}">
          <div class="nd-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div class="nd-mc-val">${n.riskScore}/100</div>
          <div class="nd-mc-lbl">Risk Score</div>
        </div>
        <div class="nd-metric-card" style="--mc-accent:var(--accent-green)">
          <div class="nd-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 110 20 10 10 0 010-20z"/><path d="M12 6v6l4 2"/></svg></div>
          <div class="nd-mc-val">${n.confidence}%</div>
          <div class="nd-mc-lbl">AI Confidence</div>
        </div>
      </div>

      <div class="nd-section nd-trend-section">
        <div class="nd-section-header">
          <div class="nd-section-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
          <h3 class="nd-section-title">12-Month Trend</h3>
        </div>
        <div class="nd-trend-chart">
          <svg viewBox="0 0 ${tW} ${tH}" class="nd-trend-svg">
            <defs>
              <linearGradient id="ndTrendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${heatColor};stop-opacity:0.3"/>
                <stop offset="100%" style="stop-color:${heatColor};stop-opacity:0"/>
              </linearGradient>
            </defs>
            <path d="${trendArea}" fill="url(#ndTrendGrad)"/>
            <path d="${trendPath}" fill="none" stroke="${heatColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${trendPoints.map((p, _i) => '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3" fill="' + heatColor + '" opacity="0.8"/>').join('')}
          </svg>
          <div class="nd-trend-labels">
            ${months.map((m, _i) => '<span class="nd-trend-label">' + m + '</span>').join('')}
          </div>
          <div class="nd-trend-range">
            <span style="color:var(--text-muted)">Low: ${tMin}</span>
            <span style="color:${heatVar};font-weight:700">Current: ${n.trendData[11]}</span>
            <span style="color:var(--text-muted)">High: ${tMax}</span>
          </div>
        </div>
      </div>

      <div class="nd-duo-grid">
        <div class="nd-section">
          <div class="nd-section-header">
            <div class="nd-section-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></div>
            <h3 class="nd-section-title">Competition by Platform</h3>
          </div>
          <div class="nd-platform-bars">
            ${n.platforms
              .map((p) => {
                const barW = Math.min((p.sellers / 50) * 100, 100);
                const c =
                  p.sellers < 8 ? 'var(--accent-green)' : p.sellers < 20 ? 'var(--accent-yellow)' : 'var(--accent-red)';
                return (
                  '<div class="nd-plat-row"><div class="nd-plat-header"><span class="nd-plat-name">' +
                  esc(p.name) +
                  '</span><span class="nd-plat-count">' +
                  p.sellers +
                  ' sellers</span></div><div class="nd-plat-bar-wrap"><div class="nd-plat-bar" style="width:' +
                  barW +
                  '%;background:' +
                  c +
                  '"></div></div><span class="nd-plat-avg">avg $' +
                  p.avgPrice +
                  '</span></div>'
                );
              })
              .join('')}
          </div>
        </div>
        <div class="nd-section">
          <div class="nd-section-header">
            <div class="nd-section-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
            <h3 class="nd-section-title">Seasonal Demand</h3>
          </div>
          <div class="nd-seasonal-grid">
            ${n.seasonality
              .map((v, i) => {
                const intensity = v / maxSeason;
                const h = n.heat === 'hot' ? '0,100%,60%' : n.heat === 'warm' ? '30,100%,55%' : '180,100%,55%';
                return (
                  '<div class="nd-seasonal-cell" style="--cell-opacity:' +
                  (0.2 + intensity * 0.8) +
                  ';--cell-hue:' +
                  h +
                  '"><div class="nd-seasonal-val">' +
                  v +
                  '</div><div class="nd-seasonal-month">' +
                  months[i] +
                  '</div></div>'
                );
              })
              .join('')}
          </div>
        </div>
      </div>

      <div class="nd-duo-grid">
        <div class="nd-section">
          <div class="nd-section-header">
            <div class="nd-section-icon" style="background:var(--accent-green-dim);color:var(--accent-green)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
            <h3 class="nd-section-title">Target Audience</h3>
          </div>
          <div class="nd-audience-card">
            <div class="nd-aud-row"><span class="nd-aud-label">Age Range</span><span class="nd-aud-val">${n.audience.age}</span></div>
            <div class="nd-aud-row"><span class="nd-aud-label">Gender</span><span class="nd-aud-val">${n.audience.gender}</span></div>
            <div class="nd-aud-divider"></div>
            <div class="nd-aud-interests">${n.audience.interests.map((i) => '<span class="nd-aud-chip">' + esc(i) + '</span>').join('')}</div>
          </div>
        </div>
        <div class="nd-section">
          <div class="nd-section-header">
            <div class="nd-section-icon" style="background:var(--accent-yellow-dim);color:var(--accent-yellow)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
            <h3 class="nd-section-title">Profit Simulator</h3>
          </div>
          <div class="nd-sim-card">
            <div class="nd-sim-row"><span>Monthly sales estimate</span><span class="nd-sim-val">200 units</span></div>
            <div class="nd-sim-row"><span>Avg sell price (${n.platforms[0]?.name || 'Amazon'})</span><span class="nd-sim-val">$${avgPrice}</span></div>
            <div class="nd-sim-row nd-sim-neg"><span>Cost + shipping</span><span class="nd-sim-val">-$${costShip}</span></div>
            <div class="nd-sim-row nd-sim-neg"><span>Ad cost per sale (~15%)</span><span class="nd-sim-val">-$${adCost}</span></div>
            <div class="nd-sim-divider"></div>
            <div class="nd-sim-row nd-sim-total"><span>Est. Monthly Profit</span><span class="nd-sim-val">$${monthlyProfit.toLocaleString()}</span></div>
            <div class="nd-sim-row nd-sim-sub"><span>Profit margin</span><span class="nd-sim-val">${Math.round((monthlyProfit / (200 * avgPrice)) * 100)}%</span></div>
          </div>
        </div>
      </div>

      <div class="nd-section nd-products-section">
        <div class="nd-section-header">
          <div class="nd-section-icon" style="background:var(--accent-pink-dim,rgba(236,72,153,0.1));color:var(--accent-pink,#ec4899)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></div>
          <h3 class="nd-section-title">Top Products</h3>
        </div>
        <div class="nd-top-products">
          ${n.topProducts.map((p) => '<div class="nd-prod-card"><img src="' + esc(p.img) + '" class="nd-prod-img" alt="" onerror="this.style.display=\'none\'"><div class="nd-prod-info"><span class="nd-prod-name">' + esc(p.name) + '</span><span class="nd-prod-price">$' + p.price + '</span></div></div>').join('')}
        </div>
      </div>

      <div class="nd-section nd-insight-section">
        <div class="nd-section-header">
          <div class="nd-section-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
          <h3 class="nd-section-title">AI Insight</h3>
        </div>
        <div class="nd-insight-card">
          <div class="nd-insight-glow"></div>
          <p class="nd-insight-text">${esc(n.insight)}</p>
        </div>
      </div>

      <div class="nd-cta-row">
        <button class="nr-btn nr-btn-primary nr-btn-lg" onclick="window.HuntDrop._nicheExplore(${n.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Explore Products in ${esc(n.name)}
        </button>
        <button class="nr-btn nr-btn-ghost nr-btn-lg" onclick="window.HuntDrop._nicheCloseDetail();window.HuntDrop.navigateTo('section-supplier-hub')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
          Find Suppliers
        </button>
      </div>

    </div>
  </div>`;

    container.appendChild(section);

    window.HuntDrop.navigateTo('section-niche-detail');
  };

  window.HuntDrop._nicheCloseDetail = function () {
    const detail = document.getElementById('section-niche-detail');
    if (detail) detail.remove();
    window.HuntDrop.navigateTo('section-niche-radar');
  };

  window.HuntDrop._nicheFilter = function (btn, _filter) {
    btn
      .closest('.nr-filter-row')
      .querySelectorAll('.nr-filter')
      .forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  };

  window.HuntDrop._nicheSort = function (_val) {
    applyFilters();
  };

  window.HuntDrop.PluginRegistry.register('niche-radar', NicheRadarPlugin);
})();
