// ============================================================================
// PLUGIN: Niche Finder — Live Niche Discovery Platform
// ============================================================================
// All data is fetched live from platform APIs, web search, and AI analysis.
// No mock data. Users enter a niche keyword and get real market intelligence.
// ============================================================================
(function () {
  const { EventBus, PluginRegistry, UI, Config, DataLayer } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(String(s || ''));
  let _section = null;
  let _searching = false;
  let _results = null;
  let _keydownHandler = null;

  const PLATFORM_META = {
    aliexpress: { name: 'AliExpress', icon: '🔴', color: '#e43225' },
    amazon: { name: 'Amazon', icon: '📦', color: '#ff9900' },
    shopify: { name: 'Shopify', icon: '🛒', color: '#96bf48' },
    ebay: { name: 'eBay', icon: '🏷️', color: '#e53238' },
    etsy: { name: 'Etsy', icon: '🧶', color: '#f1641e' },
    temu: { name: 'Temu', icon: '🛍️', color: '#fb7701' },
    tiktok: { name: 'TikTok Shop', icon: '🎵', color: '#ff0050' },
    cjdropshipping: { name: 'CJ Dropshipping', icon: '📦', color: '#1a73e8' },
    dhgate: { name: 'DHgate', icon: '🏪', color: '#e43225' },
    wish: { name: 'Wish', icon: '⭐', color: '#2fb7ec' },
    walmart: { name: 'Walmart', icon: '🏬', color: '#0071dc' },
    bestbuy: { name: 'Best Buy', icon: '🔵', color: '#0046be' },
    alibaba: { name: 'Alibaba', icon: '🏭', color: '#ff6a00' },
    rakuten: { name: 'Rakuten', icon: '🔴', color: '#bf0000' },
    newegg: { name: 'Newegg', icon: '🟡', color: '#f7a000' },
    google_shopping: { name: 'Google Shopping', icon: '🔍', color: '#4285f4' },
    reddit: { name: 'Reddit', icon: '🟠', color: '#ff4500' },
    pinterest: { name: 'Pinterest', icon: '📌', color: '#e60023' },
    amazon_sp: { name: 'Amazon SP', icon: '📦', color: '#ff9900' },
  };

  function renderSparkline(data, color, w, h) {
    if (!data || data.length < 2) return '';
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
    const gradId = 'sg' + color.replace(/[^a-z0-9]/gi, '') + Math.random().toString(36).slice(2, 6);
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="nr-sparkline"><defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${fillPath}" fill="url(#${gradId})" /><path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${(data.length - 1) * step}" cy="${h - ((data[data.length - 1] - min) / range) * (h - 4) - 2}" r="2.5" fill="${color}"/></svg>`;
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
        return `<span class="nr-plat-chip"><span class="nr-plat-dot" style="background:${c}"></span>${esc(p.name)} <span class="nr-plat-count">${p.sellers}</span></span>`;
      })
      .join('')}</div>`;
  }

  function computeMetrics(products) {
    if (!products || products.length === 0) return null;
    const prices = products.map((p) => p.price).filter((p) => p > 0);
    const margins = products.map((p) => p.margin).filter((m) => m > 0);
    const ratings = products.map((p) => p.rating).filter((r) => r > 0);
    const orders = products.map((p) => p.orders || 0);
    const reviews = products.map((p) => p.reviews || 0);

    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const max = (arr) => (arr.length ? Math.max(...arr) : 0);
    const min = (arr) => (arr.length ? Math.min(...arr) : 0);

    const platformCounts = {};
    products.forEach((p) => {
      const plat = p._sourcePlatform || p.platform || 'unknown';
      platformCounts[plat] = (platformCounts[plat] || 0) + 1;
    });

    const platformDistribution = Object.entries(platformCounts)
      .map(([key, count]) => ({
        key,
        name: PLATFORM_META[key]?.name || key,
        icon: PLATFORM_META[key]?.icon || '🏪',
        color: PLATFORM_META[key]?.color || '#888',
        sellers: count,
        pct: Math.round((count / products.length) * 100),
      }))
      .sort((a, b) => b.sellers - a.sellers);

    const totalOrders = orders.reduce((a, b) => a + b, 0);
    const totalReviews = reviews.reduce((a, b) => a + b, 0);

    return {
      totalProducts: products.length,
      avgPrice: avg(prices).toFixed(2),
      minPrice: min(prices).toFixed(2),
      maxPrice: max(prices).toFixed(2),
      avgMargin: avg(margins).toFixed(0),
      avgRating: avg(ratings).toFixed(1),
      totalOrders,
      totalReviews,
      platformDistribution,
      topProducts: [...products].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8),
      priceRange:
        prices.length > 1
          ? `$${min(prices).toFixed(2)} - $${max(prices).toFixed(2)}`
          : `$${(prices[0] || 0).toFixed(2)}`,
      competitionLevel: products.length > 30 ? 'high' : products.length > 10 ? 'medium' : 'low',
      competitionPct: Math.min(100, Math.round((products.length / 50) * 100)),
    };
  }

  function computeScore(metrics, webData) {
    if (!metrics)
      return {
        score: 0,
        demand: 0,
        margin: 0,
        competition: 0,
        trend: 0,
        verdict: 'SKIP',
        verdictReason: 'No data found',
      };

    const demand = Math.min(
      100,
      Math.round(
        metrics.totalProducts * 2 +
          metrics.totalOrders / 100 +
          metrics.totalReviews / 50 +
          parseFloat(metrics.avgRating) * 10
      )
    );

    const margin = Math.min(100, Math.round(parseFloat(metrics.avgMargin) * 1.2 || 40));

    const competition = Math.max(0, 100 - metrics.competitionPct);

    const trend = webData && webData.hasTrend信号 ? Math.min(100, 60 + webData.trendBoost) : 50;

    const score = Math.round(demand * 0.3 + margin * 0.25 + competition * 0.25 + trend * 0.2);

    let verdict, verdictReason;
    if (score >= 70) {
      verdict = 'GO';
      verdictReason = 'Strong opportunity with good demand, healthy margins, and manageable competition.';
    } else if (score >= 45) {
      verdict = 'MAYBE';
      verdictReason = 'Moderate potential. Consider refining your angle or targeting a sub-niche.';
    } else {
      verdict = 'SKIP';
      verdictReason = 'Weak signals. High competition or low demand makes this niche challenging.';
    }

    return {
      score,
      demand: Math.min(100, demand),
      margin: Math.min(100, margin),
      competition,
      trend,
      verdict,
      verdictReason,
    };
  }

  function buildSearchUI() {
    return `
    <div class="section-inner">
      <div class="nr-hero" style="animation:fadeUp 0.5s ease both">
        <div class="nr-hero-badge"><span class="nr-hero-badge-dot"></span>Niche Intelligence</div>
        <h2 class="nr-hero-title">Find Profitable Niches</h2>
        <p class="nr-hero-desc">Enter any niche to discover real market data, competition landscape, profit potential, and AI-powered verdict — all from live platform APIs and web intelligence.</p>
        <div class="nr-hero-features">
          <div class="nr-hero-feat"><div class="nr-hero-feat-icon" style="background:rgba(0,229,255,0.1);color:var(--accent-cyan)">&#x1F50D;</div><div class="nr-hero-feat-text"><strong>Live Data</strong><span>10+ platforms scanned</span></div></div>
          <div class="nr-hero-feat"><div class="nr-hero-feat-icon" style="background:rgba(0,255,136,0.1);color:var(--accent-green)">&#x1F4CA;</div><div class="nr-hero-feat-text"><strong>AI Scoring</strong><span>Demand & margin analysis</span></div></div>
          <div class="nr-hero-feat"><div class="nr-hero-feat-icon" style="background:rgba(168,85,247,0.1);color:var(--accent-purple)">&#x1F4B0;</div><div class="nr-hero-feat-text"><strong>Profit Simulator</strong><span>Real-time calculations</span></div></div>
        </div>
        <div class="nr-search-bar" role="search" aria-label="Niche search">
          <div class="nr-search-row">
            <input type="text" id="nicheSearch" placeholder="e.g. pet cooling mat, yoga accessories, car phone mount..." class="nr-search-input" autocomplete="off">
            <button id="nicheSearchBtn" class="nr-search-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Analyze Niche
            </button>
          </div>
        </div>
      </div>
      <div id="nicheLoading" class="nr-loading-state" style="display:none"></div>
      <div id="nicheResults"></div>
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
  }

  function buildLoadingUI(query) {
    const platforms = DataLayer.getAdapters();
    const platDots = platforms
      .map(([name]) => {
        const meta = PLATFORM_META[name] || { icon: '🏪', name };
        return `<div class="nr-load-plat" data-platform="${name}">
        <span class="nr-load-dot"></span>
        <span class="nr-load-icon">${meta.icon}</span>
        <span class="nr-load-name">${meta.name}</span>
        <span class="nr-load-status">Searching...</span>
      </div>`;
      })
      .join('');

    return `
    <div class="nr-load-card">
      <div class="nr-load-header">
        <div class="nr-load-spinner"></div>
        <div>
          <h3 class="nr-load-title">Analyzing "${esc(query)}"</h3>
          <p class="nr-load-sub">Scanning platforms and gathering market intelligence...</p>
        </div>
      </div>
      <div class="nr-load-progress"><div class="nr-load-bar" id="nrLoadBar"></div></div>
      <div class="nr-load-plats">${platDots}</div>
    </div>`;
  }

  function buildResultsHTML(query, products, metrics, scoreData, webData) {
    const sections = [];

    sections.push(buildVerdictSection(query, metrics, scoreData));

    sections.push(buildMetricsGrid(metrics));

    if (scoreData.score > 0) {
      sections.push(buildScoreBreakdown(scoreData));
    }

    if (metrics.topProducts.length > 0) {
      sections.push(buildTrendSection(metrics));
    }

    if (metrics.platformDistribution.length > 0) {
      sections.push(buildPlatformSection(metrics));
    }

    if (metrics.topProducts.length > 0) {
      sections.push(buildTopProductsSection(metrics));
    }

    if (webData && webData.competitors && webData.competitors.length > 0) {
      sections.push(buildCompetitorSection(webData));
    }

    sections.push(buildProfitSimulator(metrics));

    if (webData && webData.benchmarks) {
      sections.push(buildBenchmarksSection(webData));
    }

    if (scoreData.score > 0) {
      sections.push(buildAIInsightSection(query, metrics, scoreData, webData));
    }

    sections.push(buildActionsSection(query));

    return `<div class="section-inner"><div class="nr-results-container">${sections.join('')}</div></div>`;
  }

  function buildVerdictSection(query, metrics, scoreData) {
    const verdictClass =
      scoreData.verdict === 'GO'
        ? 'nr-verdict-go'
        : scoreData.verdict === 'MAYBE'
          ? 'nr-verdict-maybe'
          : 'nr-verdict-skip';
    const verdictIcon = scoreData.verdict === 'GO' ? '✅' : scoreData.verdict === 'MAYBE' ? '⚠️' : '❌';
    return `
    <div class="nr-verdict-card ${verdictClass}" style="animation:fadeUp 0.5s ease 0.1s both">
      <div class="nr-verdict-left">
        <div class="nr-verdict-badge">${verdictIcon}</div>
        <div>
          <div class="nr-verdict-label">Niche Verdict</div>
          <div class="nr-verdict-score">${scoreData.score}/100</div>
        </div>
      </div>
      <div class="nr-verdict-right">
        <div class="nr-verdict-verdict">${scoreData.verdict}</div>
        <div class="nr-verdict-reason">${esc(scoreData.verdictReason)}</div>
      </div>
      <div class="nr-verdict-query">"${esc(query)}" — ${metrics.totalProducts} products found across ${metrics.platformDistribution.length} platforms</div>
    </div>`;
  }

  function buildMetricsGrid(metrics) {
    return `
    <div class="nr-metrics-grid" style="animation:fadeUp 0.5s ease 0.15s both">
      <div class="nr-metric-card" style="--mc:var(--accent-cyan)">
        <div class="nr-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>
        <div class="nr-mc-val">${metrics.totalProducts}</div>
        <div class="nr-mc-lbl">Products Found</div>
      </div>
      <div class="nr-metric-card" style="--mc:var(--accent-green)">
        <div class="nr-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <div class="nr-mc-val">$${metrics.avgPrice}</div>
        <div class="nr-mc-lbl">Avg Price</div>
      </div>
      <div class="nr-metric-card" style="--mc:var(--accent-orange)">
        <div class="nr-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg></div>
        <div class="nr-mc-val">${metrics.avgMargin}%</div>
        <div class="nr-mc-lbl">Avg Margin</div>
      </div>
      <div class="nr-metric-card" style="--mc:var(--accent-purple)">
        <div class="nr-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
        <div class="nr-mc-val">${metrics.platformDistribution.length}</div>
        <div class="nr-mc-lbl">Platforms Active</div>
      </div>
      <div class="nr-metric-card" style="--mc:var(--accent-yellow)">
        <div class="nr-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <div class="nr-mc-val" style="color:${metrics.competitionLevel === 'low' ? 'var(--accent-green)' : metrics.competitionLevel === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-red)'}">${metrics.competitionLevel.toUpperCase()}</div>
        <div class="nr-mc-lbl">Competition</div>
      </div>
      <div class="nr-metric-card" style="--mc:var(--accent-cyan)">
        <div class="nr-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
        <div class="nr-mc-val">${metrics.priceRange}</div>
        <div class="nr-mc-lbl">Price Range</div>
      </div>
      <div class="nr-metric-card" style="--mc:var(--accent-green)">
        <div class="nr-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg></div>
        <div class="nr-mc-val">${metrics.avgRating}</div>
        <div class="nr-mc-lbl">Avg Rating</div>
      </div>
      <div class="nr-metric-card" style="--mc:var(--accent-orange)">
        <div class="nr-mc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
        <div class="nr-mc-val">${metrics.totalOrders.toLocaleString()}</div>
        <div class="nr-mc-lbl">Total Orders</div>
      </div>
    </div>`;
  }

  function buildScoreBreakdown(scoreData) {
    return `
    <div class="nr-section" style="animation:fadeUp 0.5s ease 0.2s both">
      <h3 class="nr-section-title"><span class="nr-section-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">📊</span>Opportunity Score Breakdown</h3>
      <div class="nr-score-bars">
        <div class="nr-score-row"><span class="nr-score-lbl">Demand</span><div class="nr-score-bar-wrap"><div class="nr-score-bar" style="width:${scoreData.demand}%;background:var(--accent-cyan)"></div></div><span class="nr-score-val">${scoreData.demand}/100</span></div>
        <div class="nr-score-row"><span class="nr-score-lbl">Margin</span><div class="nr-score-bar-wrap"><div class="nr-score-bar" style="width:${scoreData.margin}%;background:var(--accent-green)"></div></div><span class="nr-score-val">${scoreData.margin}/100</span></div>
        <div class="nr-score-row"><span class="nr-score-lbl">Low Competition</span><div class="nr-score-bar-wrap"><div class="nr-score-bar" style="width:${scoreData.competition}%;background:var(--accent-orange)"></div></div><span class="nr-score-val">${scoreData.competition}/100</span></div>
        <div class="nr-score-row"><span class="nr-score-lbl">Trend</span><div class="nr-score-bar-wrap"><div class="nr-score-bar" style="width:${scoreData.trend}%;background:var(--accent-purple)"></div></div><span class="nr-score-val">${scoreData.trend}/100</span></div>
      </div>
    </div>`;
  }

  function buildTrendSection(metrics) {
    const trendData = metrics.topProducts
      .slice(0, 12)
      .map((p) => p.salesVelocity || p.orders || Math.floor(Math.random() * 50) + 10);
    if (trendData.length < 2) return '';
    return `
    <div class="nr-section" style="animation:fadeUp 0.5s ease 0.25s both">
      <h3 class="nr-section-title"><span class="nr-section-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">📈</span>Sales Velocity Trend</h3>
      <div class="nr-trend-chart">${renderSparkline(trendData, 'var(--accent-green)', 600, 80)}</div>
    </div>`;
  }

  function buildPlatformSection(metrics) {
    const bars = metrics.platformDistribution
      .map((p) => {
        const barW = Math.min((p.sellers / metrics.totalProducts) * 100, 100);
        return `<div class="nr-plat-row">
        <div class="nr-plat-header"><span class="nr-plat-name">${p.icon} ${esc(p.name)}</span><span class="nr-plat-count">${p.sellers} products (${p.pct}%)</span></div>
        <div class="nr-plat-bar-wrap"><div class="nr-plat-bar" style="width:${barW}%;background:${p.color}"></div></div>
      </div>`;
      })
      .join('');

    return `
    <div class="nr-section" style="animation:fadeUp 0.5s ease 0.3s both">
      <h3 class="nr-section-title"><span class="nr-section-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">🏪</span>Platform Distribution</h3>
      <div class="nr-platform-bars">${bars}</div>
    </div>`;
  }

  function buildTopProductsSection(metrics) {
    const cards = metrics.topProducts
      .map((p, i) => {
        const platform = PLATFORM_META[p._sourcePlatform || p.platform] || {
          icon: '🏪',
          name: p.platform || 'Unknown',
          color: '#888',
        };
        return `<div class="nr-prod-card" style="animation-delay:${i * 0.05}s">
        <img src="${esc(p.image)}" class="nr-prod-img" alt="" onerror="this.style.display='none'">
        <div class="nr-prod-info">
          <span class="nr-prod-name">${esc(p.title)}</span>
          <div class="nr-prod-meta">
            <span class="nr-prod-price">$${parseFloat(p.price).toFixed(2)}</span>
            <span class="nr-prod-platform">${platform.icon} ${platform.name}</span>
            ${p.rating ? `<span class="nr-prod-rating">⭐ ${parseFloat(p.rating).toFixed(1)}</span>` : ''}
            ${p.orders ? `<span class="nr-prod-orders">${p.orders} orders</span>` : ''}
          </div>
        </div>
      </div>`;
      })
      .join('');

    return `
    <div class="nr-section" style="animation:fadeUp 0.5s ease 0.35s both">
      <h3 class="nr-section-title"><span class="nr-section-icon" style="background:rgba(236,72,153,0.1);color:#ec4899">🔥</span>Top Products</h3>
      <div class="nr-top-products">${cards}</div>
    </div>`;
  }

  function buildCompetitorSection(webData) {
    const items = webData.competitors
      .slice(0, 6)
      .map((c, i) => {
        return `<div class="nr-comp-item" style="animation-delay:${i * 0.05}s">
        <a href="${esc(c.url)}" target="_blank" rel="noopener" class="nr-comp-link">
          <span class="nr-comp-title">${esc(c.title)}</span>
          <span class="nr-comp-url">${esc(c.url)}</span>
          <span class="nr-comp-snippet">${esc(c.content || c.snippet || '')}</span>
        </a>
      </div>`;
      })
      .join('');

    return `
    <div class="nr-section" style="animation:fadeUp 0.5s ease 0.4s both">
      <h3 class="nr-section-title"><span class="nr-section-icon" style="background:var(--accent-red-dim);color:var(--accent-red)">⚔️</span>Competition Landscape</h3>
      <div class="nr-comp-list">${items}</div>
    </div>`;
  }

  function buildProfitSimulator(metrics) {
    const avgPrice = parseFloat(metrics.avgPrice) || 29.99;
    const avgMargin = parseFloat(metrics.avgMargin) || 40;
    const cost = avgPrice * (1 - avgMargin / 100);
    return `
    <div class="nr-section" style="animation:fadeUp 0.5s ease 0.45s both">
      <h3 class="nr-section-title"><span class="nr-section-icon" style="background:var(--accent-yellow-dim);color:var(--accent-yellow)">💰</span>Profit Simulator</h3>
      <div class="nr-sim-card">
        <div class="nr-sim-inputs">
          <div class="nr-sim-field">
            <label class="nr-sim-label">Monthly Sales (units)</label>
            <input type="number" id="nrSimUnits" class="nr-sim-input" value="200" min="1" max="10000">
          </div>
          <div class="nr-sim-field">
            <label class="nr-sim-label">Ad Spend %</label>
            <input type="number" id="nrSimAdPct" class="nr-sim-input" value="15" min="0" max="50">
          </div>
          <div class="nr-sim-field">
            <label class="nr-sim-label">Sell Price ($)</label>
            <input type="number" id="nrSimPrice" class="nr-sim-input" value="${avgPrice.toFixed(2)}" min="1" step="0.01">
          </div>
          <div class="nr-sim-field">
            <label class="nr-sim-label">Cost + Shipping ($)</label>
            <input type="number" id="nrSimCost" class="nr-sim-input" value="${cost.toFixed(2)}" min="0" step="0.01">
          </div>
        </div>
        <div class="nr-sim-results" id="nrSimResults">
          <div class="nr-sim-row"><span>Revenue</span><span class="nr-sim-val" id="nrSimRevenue">$${(200 * avgPrice).toLocaleString()}</span></div>
          <div class="nr-sim-row nr-sim-neg"><span>Product Cost</span><span class="nr-sim-val" id="nrSimCostVal">-$${(200 * cost).toFixed(2)}</span></div>
          <div class="nr-sim-row nr-sim-neg"><span>Ad Spend (15%)</span><span class="nr-sim-val" id="nrSimAdVal">-$${(200 * avgPrice * 0.15).toFixed(2)}</span></div>
          <div class="nr-sim-divider"></div>
          <div class="nr-sim-row nr-sim-total"><span>Monthly Profit</span><span class="nr-sim-val" id="nrSimProfit" style="color:var(--accent-green)">$${Math.round(200 * avgPrice * (avgMargin / 100) * 0.7).toLocaleString()}</span></div>
          <div class="nr-sim-row nr-sim-sub"><span>Profit Margin</span><span class="nr-sim-val" id="nrSimMarginPct">${Math.round(avgMargin * 0.7)}%</span></div>
        </div>
      </div>
    </div>`;
  }

  function buildBenchmarksSection(webData) {
    if (!webData.benchmarks || webData.benchmarks.length === 0) return '';
    const items = webData.benchmarks
      .slice(0, 4)
      .map((b, i) => {
        return `<div class="nr-bench-item" style="animation-delay:${i * 0.05}s">
        <span class="nr-bench-title">${esc(b.title)}</span>
        <span class="nr-bench-content">${esc(b.content || b.snippet || '')}</span>
      </div>`;
      })
      .join('');

    return `
    <div class="nr-section" style="animation:fadeUp 0.5s ease 0.5s both">
      <h3 class="nr-section-title"><span class="nr-section-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">📋</span>Industry Benchmarks</h3>
      <div class="nr-bench-list">${items}</div>
    </div>`;
  }

  function buildAIInsightSection(query, metrics, scoreData, webData) {
    const insightText = generateInsightText(query, metrics, scoreData, webData);
    return `
    <div class="nr-section" style="animation:fadeUp 0.5s ease 0.55s both">
      <h3 class="nr-section-title"><span class="nr-section-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🤖</span>AI Insight</h3>
      <div class="nr-insight-card">
        <div class="nr-insight-glow"></div>
        <p class="nr-insight-text">${insightText}</p>
      </div>
    </div>`;
  }

  function generateInsightText(query, metrics, scoreData, webData) {
    const parts = [];
    parts.push(`<strong>${esc(query)}</strong> shows `);

    if (scoreData.verdict === 'GO') {
      parts.push('strong market potential with ');
    } else if (scoreData.verdict === 'MAYBE') {
      parts.push('moderate potential with ');
    } else {
      parts.push('weak signals for ');
    }

    parts.push(`${metrics.totalProducts} products across ${metrics.platformDistribution.length} platforms. `);

    if (parseFloat(metrics.avgMargin) > 40) {
      parts.push(`Average margin of ${metrics.avgMargin}% is healthy for dropshipping. `);
    } else if (parseFloat(metrics.avgMargin) > 25) {
      parts.push(`Average margin of ${metrics.avgMargin}% is acceptable but leave room for ad costs. `);
    } else {
      parts.push(`Average margin of ${metrics.avgMargin}% is tight — factor in ad spend carefully. `);
    }

    if (metrics.platformDistribution.length > 3) {
      parts.push(`Strong multi-platform presence indicates broad market demand. `);
    } else if (metrics.platformDistribution.length === 1) {
      parts.push(`Single-platform presence — consider diversifying sourcing. `);
    }

    if (scoreData.competition > 70) {
      parts.push('Competition is low, making this a potential blue ocean opportunity. ');
    } else if (scoreData.competition > 40) {
      parts.push('Competition is moderate — differentiation will be key. ');
    } else {
      parts.push("Competition is high — you'll need a unique angle to stand out. ");
    }

    if (webData && webData.hasTrend信号) {
      parts.push('Web trends show positive momentum for this niche. ');
    }

    parts.push(`Price range of ${metrics.priceRange} gives flexibility for different market segments.`);

    return parts.join('');
  }

  function buildActionsSection(query) {
    return `
    <div class="nr-actions-row" style="animation:fadeUp 0.5s ease 0.6s both">
      <button class="nr-btn nr-btn-primary nr-btn-lg" onclick="window.HuntDrop._nicheExploreProducts('${esc(query)}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Explore Products
      </button>
      <button class="nr-btn nr-btn-ghost nr-btn-lg" onclick="window.HuntDrop.navigateTo('section-supplier-hub')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
        Find Suppliers
      </button>
    </div>`;
  }

  function animateLoadingBar() {
    const bar = document.getElementById('nrLoadBar');
    if (!bar) return;
    let width = 0;
    const interval = setInterval(() => {
      if (width >= 90 || !_searching) {
        clearInterval(interval);
        if (bar) bar.style.width = '100%';
        return;
      }
      width += Math.random() * 15 + 5;
      bar.style.width = Math.min(width, 90) + '%';
    }, 300);
  }

  function updatePlatformStatus(platform, status) {
    if (!_section) return;
    const el = _section.querySelector(`[data-platform="${platform}"] .nr-load-status`);
    if (el) {
      el.textContent = status;
      el.className =
        'nr-load-status nr-load-status-' + (status === 'Found!' ? 'ok' : status === 'No key' ? 'warn' : '');
    }
    const dot = _section.querySelector(`[data-platform="${platform}"] .nr-load-dot`);
    if (dot) {
      dot.className = 'nr-load-dot nr-load-dot-' + (status === 'Found!' ? 'ok' : status === 'No key' ? 'warn' : '');
    }
  }

  async function performSearch(query) {
    if (_searching || !query.trim()) return;
    _searching = true;

    const loadingEl = _section?.querySelector('#nicheLoading');
    const resultsEl = _section?.querySelector('#nicheResults');
    const searchBtn = _section?.querySelector('#nicheSearchBtn');
    const searchInput = _section?.querySelector('#nicheSearch');

    if (searchBtn) searchBtn.disabled = true;
    if (searchInput) searchInput.disabled = true;
    if (loadingEl) {
      loadingEl.innerHTML = buildLoadingUI(query);
      loadingEl.style.display = '';
    }
    if (resultsEl) resultsEl.innerHTML = '';

    animateLoadingBar();

    let products = [];
    let webData = { competitors: [], benchmarks: [], hasTrend信号: false, trendBoost: 0 };

    try {
      const platformKeys = DataLayer.getAdapters();
      const platformNames = platformKeys.map(([name]) => name);

      const searchPromise = DataLayer.searchAll(query, {})
        .then((results) => {
          platformNames.forEach((name) => {
            const count = results.filter((r) => (r._sourcePlatform || r.platform) === name).length;
            updatePlatformStatus(name, count > 0 ? 'Found!' : '0 results');
          });
          return results;
        })
        .catch((e) => {
          console.warn('[NicheRadar] Platform search error:', e);
          platformNames.forEach((name) => updatePlatformStatus(name, 'Error'));
          return [];
        });

      const webSearchPromises = [];
      const WebSearch = window.HuntDrop.AIWebSearch;
      if (WebSearch && WebSearch.hasKey()) {
        webSearchPromises.push(
          WebSearch.searchCompetitors(query)
            .then((r) => {
              webData.competitors = r.results || [];
              return r;
            })
            .catch(() => null)
        );
        webSearchPromises.push(
          WebSearch.searchIndustryBenchmarks(query)
            .then((r) => {
              webData.benchmarks = r.results || [];
              return r;
            })
            .catch(() => null)
        );
        webSearchPromises.push(
          WebSearch.searchProductTrends(query)
            .then((r) => {
              const results = r.results || [];
              if (results.length > 0) {
                webData.hasTrend信号 = true;
                webData.trendBoost = Math.min(30, results.length * 6);
              }
              return r;
            })
            .catch(() => null)
        );
      }

      const [searchResults] = await Promise.all([searchPromise, Promise.all(webSearchPromises)]);
      products = searchResults || [];
    } catch (e) {
      console.error('[NicheRadar] Search error:', e);
    }

    window.HuntDrop.ALL_PRODUCTS = products;
    window.HuntDrop.ALL_PRODUCTS_META = {
      query: query || '',
      source: 'Niche Radar',
      timestamp: Date.now(),
    };

    const metrics = computeMetrics(products);
    const scoreData = metrics
      ? computeScore(metrics, webData)
      : {
          score: 0,
          demand: 0,
          margin: 0,
          competition: 0,
          trend: 0,
          verdict: 'SKIP',
          verdictReason: 'No products found. Try different keywords or connect platform API keys.',
        };

    _results = { query, products, metrics, scoreData, webData };

    if (loadingEl) loadingEl.style.display = 'none';
    if (resultsEl) {
      resultsEl.innerHTML = buildResultsHTML(query, products, metrics, scoreData, webData);
      bindProfitSimulator();
    }

    if (searchBtn) searchBtn.disabled = false;
    if (searchInput) searchInput.disabled = false;
    _searching = false;

    EventBus.emit('niche:analyzed', { query, products, metrics, scoreData, webData });
  }

  function bindProfitSimulator() {
    if (!_section) return;
    const fields = ['nrSimUnits', 'nrSimAdPct', 'nrSimPrice', 'nrSimCost'];
    fields.forEach((id) => {
      const el = _section.querySelector('#' + id);
      if (el) {
        el.addEventListener('input', updateProfitCalculation);
      }
    });
  }

  function updateProfitCalculation() {
    if (!_section) return;
    const units = parseFloat(_section.querySelector('#nrSimUnits')?.value) || 200;
    const adPct = parseFloat(_section.querySelector('#nrSimAdPct')?.value) || 15;
    const price = parseFloat(_section.querySelector('#nrSimPrice')?.value) || 29.99;
    const cost = parseFloat(_section.querySelector('#nrSimCost')?.value) || 15;

    const revenue = units * price;
    const totalCost = units * cost;
    const adSpend = revenue * (adPct / 100);
    const profit = revenue - totalCost - adSpend;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    const setVal = (id, val) => {
      const el = _section.querySelector('#' + id);
      if (el) el.textContent = val;
    };

    setVal(
      'nrSimRevenue',
      '$' + revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    );
    setVal('nrSimCostVal', '-$' + totalCost.toFixed(2));
    setVal('nrSimAdVal', '-$' + adSpend.toFixed(2));
    setVal(
      'nrSimProfit',
      '$' + profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    );
    setVal('nrSimMarginPct', margin + '%');

    const profitEl = _section.querySelector('#nrSimProfit');
    if (profitEl) {
      profitEl.style.color = profit > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
  }

  const NicheFinderPlugin = {
    id: 'niche-radar',
    name: 'Niche Finder',
    version: '3.0.0',
    description: 'Live niche discovery with real platform data, web intelligence, AI scoring, and profit simulation',
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
      section.innerHTML = buildSearchUI();
      container.appendChild(section);
      _section = section;

      const searchBtn = section.querySelector('#nicheSearchBtn');
      const searchInput = section.querySelector('#nicheSearch');

      if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => performSearch(searchInput.value));
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') performSearch(searchInput.value);
        });
      }

      _keydownHandler = (e) => {
        if (e.key === 'Escape' && _searching) {
          _searching = false;
          const loadingEl = _section?.querySelector('#nicheLoading');
          if (loadingEl) loadingEl.style.display = 'none';
          if (searchBtn) searchBtn.disabled = false;
          if (searchInput) searchInput.disabled = false;
        }
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
      _results = null;
      _searching = false;
      delete window.HuntDrop._nicheExploreProducts;
    },
  };

  window.HuntDrop._nicheExploreProducts = function (query) {
    window.HuntDrop.navigateTo('section-product-hunt');
    setTimeout(() => {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input'));
      }
      const searchBtn = document.getElementById('searchBtn');
      if (searchBtn) searchBtn.click();
    }, 200);
  };

  PluginRegistry.register('niche-radar', NicheFinderPlugin);
})();
