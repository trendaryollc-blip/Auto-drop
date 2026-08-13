// ============================================================================
// PLUGIN: Competitor Battlefield (Live Spy Dashboard)
// ============================================================================
// 10-section competitive intelligence hub: overview, leaderboard, live ads,
// price wars, new products, revenue intel, ad spend, SWOT, head-to-head, playbook.
// ============================================================================
(function () {
  const { PluginRegistry, UI, Config } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(s);

  let _section = null;
  let _liveInterval = null;

  const Competitors = [];

  const LiveAds = [];

  const PriceChanges = [];

  const NewProducts = [];

  const AdSpendIntel = [];

  const SWOTData = [];

  const WeeklyRevenue = [];

  // ========================================================================
  // DATA ACCESSOR LAYER
  // ========================================================================
  const IntelService = () => window.HuntDrop?.CBIntelligenceService || null;

  const Data = {
    getCompetitors() {
      const svc = IntelService();
      if (svc && svc.isLive()) {
        const cached = svc.getCachedData('competitors');
        if (cached) return cached;
      }
      return Competitors;
    },
    getLiveAds() {
      const svc = IntelService();
      if (svc && svc.isLive() && svc.getCachedData('liveAds')) return svc.getCachedData('liveAds');
      return LiveAds;
    },
    getPriceChanges() {
      const svc = IntelService();
      if (svc && svc.isLive() && svc.getCachedData('priceChanges')) return svc.getCachedData('priceChanges');
      return PriceChanges;
    },
    getNewProducts() {
      const svc = IntelService();
      if (svc && svc.isLive() && svc.getCachedData('newProducts')) return svc.getCachedData('newProducts');
      return NewProducts;
    },
    getAdSpend() {
      const svc = IntelService();
      if (svc && svc.isLive() && svc.getCachedData('adSpend')) return svc.getCachedData('adSpend');
      return AdSpendIntel;
    },
    getSWOT() {
      const svc = IntelService();
      if (svc && svc.isLive() && svc.getCachedData('swot')) return svc.getCachedData('swot');
      return SWOTData;
    },
    isLiveData() {
      const svc = IntelService();
      return svc && svc.isLive();
    },
    getStatus() {
      const svc = IntelService();
      return svc ? svc.getStatus() : { status: 'demo', hasAI: false, hasSearch: false };
    },
  };

  function fmtMoney(n) {
    if (n == null || isNaN(n)) return '$0';
    return (
      '$' +
      Number(n)
        .toFixed(0)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    );
  }
  function fmtNum(n) {
    if (n == null || isNaN(n)) return '0';
    return Number(n) >= 1000 ? (Number(n) / 1000).toFixed(1) + 'K' : Number(n).toString();
  }

  function renderCompetitorRow(c, i) {
    return `<div class="cb-comp-row" data-id="${c.id}">
    <div class="cb-comp-rank">#${i + 1}</div>
    <div class="cb-comp-avatar" style="background:${c.color}22;color:${c.color}">${esc(c.avatar)}</div>
    <div class="cb-comp-info">
      <div class="cb-comp-name">${esc(c.name)}</div>
      <div class="cb-comp-url">${esc(c.url)}</div>
    </div>
    <div class="cb-comp-stats">
      <div class="cb-comp-stat"><span class="cb-comp-stat-val" style="color:var(--accent-green)">${fmtMoney(c.revenue)}</span><span class="cb-comp-stat-lbl">Rev/mo</span></div>
      <div class="cb-comp-stat"><span class="cb-comp-stat-val">${fmtNum(c.traffic)}</span><span class="cb-comp-stat-lbl">Traffic</span></div>
      <div class="cb-comp-stat"><span class="cb-comp-stat-val">${c.convRate}%</span><span class="cb-comp-stat-lbl">Conv.</span></div>
      <div class="cb-comp-stat"><span class="cb-comp-stat-val">${c.ads}</span><span class="cb-comp-stat-lbl">Ads</span></div>
    </div>
    <div class="cb-comp-active"><span class="cb-comp-active-dot"></span>${esc(c.lastActive)}</div>
  </div>`;
  }

  function renderAdCard(a) {
    const statusClass =
      a.status === 'scaling'
        ? 'cb-ad-status-scaling'
        : a.status === 'testing'
          ? 'cb-ad-status-testing'
          : 'cb-ad-status-running';
    return `<div class="cb-ad-card" data-competitor="${esc(a.competitor)}" style="cursor:pointer">
    <div class="cb-ad-header">
      <span class="cb-ad-platform">${esc(a.platform)}</span>
      <span class="cb-ad-status ${statusClass}">${esc(a.status)}</span>
    </div>
    <div class="cb-ad-product">${esc(a.product)}</div>
    <div class="cb-ad-hook">"${esc(a.hook)}"</div>
    <div class="cb-ad-meta">
      <span>CTR: <strong>${a.ctr}%</strong></span>
      <span>$${a.spend}/day</span>
      <span>${esc(a.age)} old</span>
    </div>
    <div class="cb-ad-details">
      <span>Creative: ${esc(a.adCreative)}</span>
      <span>Reach: ${fmtNum(a.estReach)}</span>
    </div>
    <div class="cb-ad-engagement">Engagement: ${a.engagement}%</div>
    <div class="cb-ad-targeting">${esc(a.targeting)}</div>
  </div>`;
  }

  function renderPriceRow(p) {
    const isDown = p.change < 0;
    return `<div class="cb-price-row" data-competitor="${esc(p.competitor)}" style="cursor:pointer">
    <div class="cb-price-comp">${esc(p.competitor)}</div>
    <div class="cb-price-product">${esc(p.product)}</div>
    <div class="cb-price-change">
      <span class="cb-price-old">$${p.oldPrice.toFixed(2)}</span>
      <span class="cb-price-arrow">${isDown ? '↓' : '↑'}</span>
      <span class="cb-price-new" style="color:${isDown ? 'var(--accent-green)' : 'var(--accent-red)'}">$${p.newPrice.toFixed(2)}</span>
      <span class="cb-price-pct" style="color:${isDown ? 'var(--accent-green)' : 'var(--accent-red)'}">${p.change === 0 ? '' : isDown ? '' : '+'}${p.change}%</span>
    </div>
    <div class="cb-price-impact cb-impact-${(p.impact || '').toLowerCase()}">${p.impact || ''}</div>
    <div class="cb-price-time">${p.time}</div>
  </div>`;
  }

  function renderNewProductRow(np) {
    return `<div class="cb-newprod-row" data-competitor="${esc(np.competitor)}" style="cursor:pointer">
    <div class="cb-newprod-comp">${esc(np.competitor)}</div>
    <div class="cb-newprod-info">
      <div class="cb-newprod-name">${esc(np.name)}</div>
      <div class="cb-newprod-cat">${esc(np.category)}</div>
    </div>
    <div class="cb-newprod-price">$${np.price.toFixed(2)}</div>
    <div class="cb-newprod-score"><span class="cb-newprod-score-val">${np.score}</span>/100</div>
    <div class="cb-newprod-trend cb-trend-${np.trend}">${np.trend === 'rising' ? '↑ Rising' : '→ Stable'}</div>
    <div class="cb-newprod-demand">Demand: ${np.demandScore}/100</div>
    <div class="cb-newprod-time">${np.time}</div>
  </div>`;
  }

  function updateStatusIndicator(status) {
    if (!_section) return;
    const indicator = _section.querySelector('#cbStatusIndicator');
    if (!indicator) return;
    const labels = {
      live: '<span class="cb-status-live"><span class="cb-status-dot cb-status-dot-live"></span>LIVE DATA</span>',
      fetching:
        '<span class="cb-status-fetching"><span class="cb-status-dot cb-status-dot-fetching"></span>FETCHING...</span>',
      demo: '<span class="cb-status-demo"><span class="cb-status-dot cb-status-dot-demo"></span>DEMO DATA</span>',
      error: '<span class="cb-status-error"><span class="cb-status-dot cb-status-dot-error"></span>ERROR</span>',
    };
    indicator.innerHTML = labels[status] || labels.demo;
  }

  async function attemptLiveFetch() {
    const svc = IntelService();
    if (!svc || !svc.getStatus().hasAI) {
      updateStatusIndicator('demo');
      return;
    }
    updateStatusIndicator('fetching');
    try {
      const result = await svc.fetchAllIntelligence('dropshipping');
      if (result.success) {
        updateStatusIndicator('live');
        CompetitorBattlefieldPlugin.render();
      } else {
        updateStatusIndicator('demo');
      }
    } catch (e) {
      console.warn('CB live fetch failed:', e);
      updateStatusIndicator('demo');
    }
  }

  function generateRevenueChart(sectionEl) {
    const el = sectionEl ? sectionEl.querySelector('#cbRevenueChart') : document.getElementById('cbRevenueChart');
    if (!el || typeof Chart === 'undefined') return;
    const existing = Chart.getChart(el);
    if (existing) existing.destroy();
    const comps = Data.getCompetitors();
    const labels = comps.map((c) => c.name.split(' ')[0]);
    const revenues = comps.map((c) => c.revenue);
    new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data: revenues,
            backgroundColor: comps.map((c) => c.color + '88'),
            borderColor: comps.map((c) => c.color),
            borderWidth: 1,
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111119',
            borderColor: '#2a2a3d',
            borderWidth: 1,
            titleFont: { family: 'Outfit', size: 11 },
            bodyFont: { family: 'JetBrains Mono', size: 12 },
            padding: 10,
            displayColors: false,
            callbacks: { label: (ctx) => '$' + ctx.parsed.y.toLocaleString() + '/mo' },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.025)' },
            ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 9 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.025)' },
            ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 9 }, callback: (v) => '$' + fmtNum(v) },
          },
        },
      },
    });
  }

  function generateMarketShareChart(sectionEl) {
    const el = sectionEl
      ? sectionEl.querySelector('#cbMarketShareChart')
      : document.getElementById('cbMarketShareChart');
    if (!el || typeof Chart === 'undefined') return;
    const existing = Chart.getChart(el);
    if (existing) existing.destroy();
    const comps = Data.getCompetitors();
    const total = comps.reduce((a, c) => a + c.revenue, 0);
    new Chart(el, {
      type: 'doughnut',
      data: {
        labels: comps.map((c) => c.name),
        datasets: [
          {
            data: comps.map((c) => c.revenue),
            backgroundColor: comps.map((c) => c.color + '88'),
            borderColor: comps.map((c) => c.color),
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#aaa',
              font: { family: 'JetBrains Mono', size: 10 },
              padding: 8,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
          tooltip: {
            backgroundColor: '#111119',
            borderColor: '#2a2a3d',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                return ctx.label + ': $' + ctx.parsed.toLocaleString() + ' (' + pct + '%)';
              },
            },
          },
        },
      },
    });
  }

  function generateAdSpendChart(sectionEl) {
    const el = sectionEl ? sectionEl.querySelector('#cbAdSpendChart') : document.getElementById('cbAdSpendChart');
    if (!el || typeof Chart === 'undefined') return;
    const existing = Chart.getChart(el);
    if (existing) existing.destroy();
    const spend = Data.getAdSpend();
    const sorted = [...spend].sort(
      (a, b) =>
        (parseInt(b.totalSpend, 10) || parseInt(b.daily, 10) || 0) -
        (parseInt(a.totalSpend, 10) || parseInt(a.daily, 10) || 0)
    );
    new Chart(el, {
      type: 'bar',
      data: {
        labels: sorted.map((a) => a.competitor.split(' ')[0]),
        datasets: [
          {
            label: 'Facebook',
            data: sorted.map((a) => (a.platforms || {}).facebook || 0),
            backgroundColor: '#1877f288',
            borderColor: '#1877f2',
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            label: 'TikTok',
            data: sorted.map((a) => (a.platforms || {}).tiktok || 0),
            backgroundColor: '#00000088',
            borderColor: '#fff',
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            label: 'Instagram',
            data: sorted.map((a) => (a.platforms || {}).instagram || 0),
            backgroundColor: '#e6683c88',
            borderColor: '#e6683c',
            borderWidth: 1,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#aaa', font: { family: 'JetBrains Mono', size: 10 }, usePointStyle: true } },
          tooltip: {
            backgroundColor: '#111119',
            borderColor: '#2a2a3d',
            borderWidth: 1,
            callbacks: { label: (ctx) => ctx.dataset.label + ': $' + ctx.parsed.y + '/day' },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.025)' },
            ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 9 } },
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.025)' },
            ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 9 }, callback: (v) => '$' + v },
          },
        },
      },
    });
  }

  function _generateWeeklyTrendChart(sectionEl) {
    const el = sectionEl ? sectionEl.querySelector('#cbWeeklyChart') : document.getElementById('cbWeeklyChart');
    if (!el || typeof Chart === 'undefined') return;
    const existing = Chart.getChart(el);
    if (existing) existing.destroy();
    const comps = Data.getCompetitors();
    const top5 = comps.length >= 10 ? [comps[0], comps[1], comps[2], comps[6], comps[9]] : comps.slice(0, 5);
    const keys = ['c1', 'c2', 'c3', 'c7', 'c10'];
    new Chart(el, {
      type: 'line',
      data: {
        labels: WeeklyRevenue.map((w) => w.week),
        datasets: top5.map((c, i) => ({
          label: c.name,
          data: WeeklyRevenue.map((w) => w[keys[i]]),
          borderColor: c.color,
          backgroundColor: c.color + '22',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          fill: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#aaa', font: { family: 'JetBrains Mono', size: 10 }, usePointStyle: true } },
          tooltip: {
            backgroundColor: '#111119',
            borderColor: '#2a2a3d',
            borderWidth: 1,
            callbacks: { label: (ctx) => ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString() },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.025)' },
            ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 10 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.025)' },
            ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 9 }, callback: (v) => '$' + fmtNum(v) },
          },
        },
      },
    });
  }

  function showCompetitorProfile(comp) {
    const existing = document.querySelector('.cb-profile-overlay');
    if (existing) existing.remove();
    const ads = Data.getLiveAds().filter((a) => a.competitor === comp.name);
    const prices = Data.getPriceChanges().filter((p) => p.competitor === comp.name);
    const products = Data.getNewProducts().filter((n) => n.competitor === comp.name);
    const spend = Data.getAdSpend().find((s) => s.competitor === comp.name);
    const swot = Data.getSWOT().find((s) => s.competitor === comp.name);

    const overlay = document.createElement('div');
    overlay.className = 'cb-profile-overlay';
    overlay.innerHTML = `<div class="cb-profile-panel">
    <div class="cb-profile-header">
      <button class="cb-profile-close">&times;</button>
      <div class="cb-profile-title-row">
        <div class="cb-profile-avatar" style="background:${comp.color}22;color:${comp.color}">${esc(comp.avatar)}</div>
        <div><div class="cb-profile-name">${esc(comp.name)}</div><div class="cb-profile-url">${esc(comp.url)}</div></div>
      </div>
      <div class="cb-profile-badges">
        <span class="cb-badge cb-badge-cat">${esc(comp.cat)}</span>
        <span class="cb-badge cb-badge-age">${esc(comp.age)}</span>
        <span class="cb-badge cb-badge-platform">${esc(comp.platform)}</span>
        <span class="cb-badge cb-badge-theme">${esc(comp.theme)}</span>
      </div>
    </div>
    <div class="cb-profile-stats">
      <div class="cb-profile-stat"><div class="cb-profile-stat-val" style="color:var(--accent-green)">${fmtMoney(comp.revenue)}</div><div class="cb-profile-stat-lbl">Revenue/mo</div></div>
      <div class="cb-profile-stat"><div class="cb-profile-stat-val">${fmtNum(comp.traffic)}</div><div class="cb-profile-stat-lbl">Traffic/mo</div></div>
      <div class="cb-profile-stat"><div class="cb-profile-stat-val">${comp.convRate}%</div><div class="cb-profile-stat-lbl">Conversion</div></div>
      <div class="cb-profile-stat"><div class="cb-profile-stat-val">${comp.products}</div><div class="cb-profile-stat-lbl">Products</div></div>
      <div class="cb-profile-stat"><div class="cb-profile-stat-val">${comp.ads}</div><div class="cb-profile-stat-lbl">Active Ads</div></div>
      <div class="cb-profile-stat"><div class="cb-profile-stat-val">${comp.pageSpeed}/100</div><div class="cb-profile-stat-lbl">Page Speed</div></div>
    </div>
    <div class="cb-profile-sections">
      <div class="cb-profile-section">
        <h4>Tech Stack</h4>
        <div class="cb-profile-apps">${comp.apps.map((a) => '<span class="cb-tech-app">' + esc(a) + '</span>').join('')}</div>
      </div>
      <div class="cb-profile-section">
        <h4>Performance Metrics</h4>
        <div class="cb-profile-perf">
          <div class="cb-profile-perf-row"><span>Page Speed</span><span class="cb-metric-bar-wrap"><span class="cb-metric-bar"><span class="cb-metric-bar-fill" style="width:${comp.pageSpeed}%;background:${comp.pageSpeed > 80 ? 'var(--accent-green)' : comp.pageSpeed > 60 ? 'var(--accent-orange)' : 'var(--accent-red)'}"></span></span></span><span>${comp.pageSpeed}/100</span></div>
          <div class="cb-profile-perf-row"><span>SEO Score</span><span class="cb-metric-bar-wrap"><span class="cb-metric-bar"><span class="cb-metric-bar-fill" style="width:${comp.seoScore}%;background:${comp.seoScore > 80 ? 'var(--accent-green)' : comp.seoScore > 60 ? 'var(--accent-orange)' : 'var(--accent-red)'}"></span></span></span><span>${comp.seoScore}/100</span></div>
          <div class="cb-profile-perf-row"><span>Bounce Rate</span><span class="cb-metric-bar-wrap"><span class="cb-metric-bar"><span class="cb-metric-bar-fill" style="width:${comp.bounceRate}%;background:${comp.bounceRate < 35 ? 'var(--accent-green)' : comp.bounceRate < 50 ? 'var(--accent-orange)' : 'var(--accent-red)'}"></span></span></span><span>${comp.bounceRate}%</span></div>
          <div class="cb-profile-perf-row"><span>Session Duration</span><span class="cb-metric-bar-wrap"><span class="cb-metric-bar"><span class="cb-metric-bar-fill" style="width:${Math.min(comp.sessionMin * 20, 100)}%;background:var(--accent-cyan)"></span></span></span><span>${comp.sessionMin} min</span></div>
        </div>
      </div>
      ${ads.length ? `<div class="cb-profile-section"><h4>Live Ads (${ads.length})</h4><div class="cb-profile-ads">${ads.map((a) => `<div class="cb-profile-ad"><span class="cb-profile-ad-platform">${esc(a.platform)}</span><span class="cb-profile-ad-hook">"${esc(a.hook)}"</span><span class="cb-profile-ad-ctr">${a.ctr}% CTR</span></div>`).join('')}</div></div>` : ''}
      ${products.length ? `<div class="cb-profile-section"><h4>Recent Products</h4><div class="cb-profile-newprods">${products.map((p) => `<div class="cb-profile-newprod"><span>${p.name}</span><span>$${p.price}</span><span>${p.score}/100</span></div>`).join('')}</div></div>` : ''}
      ${prices.length ? `<div class="cb-profile-section"><h4>Price Changes</h4><div class="cb-profile-prices">${prices.map((p) => `<div class="cb-profile-price"><span>${p.product}</span><span style="color:${p.change < 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${p.change > 0 ? '+' : ''}${p.change}%</span></div>`).join('')}</div></div>` : ''}
      ${
        spend
          ? `<div class="cb-profile-section"><h4>Ad Spend</h4><div class="cb-profile-perf">
        <div class="cb-profile-perf-row"><span>Daily</span><span>$${spend.daily}/day</span></div>
        <div class="cb-profile-perf-row"><span>Weekly</span><span>$${spend.weekly.toLocaleString()}</span></div>
        <div class="cb-profile-perf-row"><span>Monthly</span><span>$${spend.monthly.toLocaleString()}</span></div>
        <div class="cb-profile-perf-row"><span>Est. ROI</span><span style="color:var(--accent-green)">${spend.estROI}x</span></div>
      </div></div>`
          : ''
      }
      <div class="cb-profile-section">
        <h4>Social Following</h4>
        <div class="cb-profile-social">
          ${comp.social.fb ? `<div class="cb-social-item"><span class="cb-social-icon fb">F</span><span class="cb-social-val">${fmtNum(comp.social.fb)}</span></div>` : ''}
          ${comp.social.ig ? `<div class="cb-social-item"><span class="cb-social-icon ig">I</span><span class="cb-social-val">${fmtNum(comp.social.ig)}</span></div>` : ''}
          ${comp.social.tk ? `<div class="cb-social-item"><span class="cb-social-icon tk">T</span><span class="cb-social-val">${fmtNum(comp.social.tk)}</span></div>` : ''}
        </div>
      </div>
      ${
        swot
          ? `<div class="cb-profile-section"><h4>SWOT Snapshot</h4><div class="cb-profile-swot-grid">
        <div class="cb-swot-card cb-swot-s"><div class="cb-swot-label">Strengths</div><ul>${swot.strengths.map((s) => '<li>' + esc(s) + '</li>').join('')}</ul></div>
        <div class="cb-swot-card cb-swot-w"><div class="cb-swot-label">Weaknesses</div><ul>${swot.weaknesses.map((s) => '<li>' + esc(s) + '</li>').join('')}</ul></div>
        <div class="cb-swot-card cb-swot-o"><div class="cb-swot-label">Opportunities</div><ul>${swot.opportunities.map((s) => '<li>' + esc(s) + '</li>').join('')}</ul></div>
        <div class="cb-swot-card cb-swot-t"><div class="cb-swot-label">Threats</div><ul>${swot.threats.map((s) => '<li>' + esc(s) + '</li>').join('')}</ul></div>
      </div></div>`
          : ''
      }
    </div>
  </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('.cb-profile-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  const CompetitorBattlefieldPlugin = {
    id: 'competitor-battlefield',
    name: 'Rival Check',
    version: '2.0.0',
    description: '10-section competitive intelligence hub — spy on ads, prices, products, revenue, SWOT & more',
    dependencies: ['search-engine'],

    init(_ctx) {
      Config.defaults('competitorBattlefield', { enabled: true });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section section-battlefield';
      section.id = 'section-battlefield';
      section.innerHTML = `
      <div class="section-inner">
        <div class="cb-hero">
          <div class="cb-hero-badge"><span class="cb-hero-badge-dot"></span>Competitive Intelligence</div>
          <h2 class="cb-hero-title">Competitor Battlefield</h2>
          <p class="cb-hero-desc">10-section competitive intelligence hub — spy on everything your rivals do</p>
        </div>
        <div id="cbResults"></div>
      </div>`;
      const relatedHtml = window.HuntDrop.renderRelatedTools
        ? window.HuntDrop.renderRelatedTools([
            {
              section: 'section-market-gaps',
              name: 'Market Gap Finder',
              desc: 'Find gaps',
              icon: '🎯',
              color: '#a855f7',
            },
            {
              section: 'section-lifecycle',
              name: 'Product Lifecycle Radar',
              desc: 'Track maturity',
              icon: '📈',
              color: '#00ff88',
            },
            {
              section: 'section-ad-studio',
              name: 'Ad Studio',
              desc: 'Create competitive ads',
              icon: '🎨',
              color: '#ff8a00',
            },
            {
              section: 'section-spy-center',
              name: 'Spy Center',
              desc: 'Monitor competitors',
              icon: '👁️',
              color: '#ff3366',
            },
          ])
        : '';
      section.insertAdjacentHTML('beforeend', relatedHtml);
      container.appendChild(section);

      const self = CompetitorBattlefieldPlugin;
      _section = section;
      self.render();
      _liveInterval = setInterval(() => self.updateLiveIndicator(), 3000);

      attemptLiveFetch();
    },

    unmount(_ctx) {
      if (_liveInterval) {
        clearInterval(_liveInterval);
        _liveInterval = null;
      }
      const el = UI.$('section-battlefield');
      if (el) {
        el.querySelectorAll('canvas').forEach(function (c) {
          try {
            const inst = Chart.getChart(c);
            if (inst) inst.destroy();
          } catch {
            /* ignored */
          }
        });
        el.remove();
      }
      _section = null;
    },

    render() {
      const el = _section?.querySelector('#cbResults');
      if (!el) return;
      try {
        el.innerHTML = this.buildHTML();
      } catch (e) {
        console.error('CB render error:', e);
        el.innerHTML = '<p style="color:red;padding:20px">Render error — check console</p>';
        return;
      }

      const self = this;
      el.querySelectorAll('.cb-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          el.querySelectorAll('.cb-tab').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          const content = _section.querySelector('#cbTabContent');
          if (!content) return;
          try {
            switch (tab.dataset.tab) {
              case 'overview':
                content.innerHTML = self.renderOverview();
                break;
              case 'leaderboard':
                content.innerHTML = self.renderLeaderboard();
                self.bindLeaderboard();
                break;
              case 'ads':
                content.innerHTML = self.renderAds();
                break;
              case 'prices':
                content.innerHTML = self.renderPrices();
                break;
              case 'products':
                content.innerHTML = self.renderNewProducts();
                break;
              case 'revenue':
                content.innerHTML = self.renderRevenue();
                setTimeout(() => {
                  if (_section) {
                    generateRevenueChart(_section);
                    generateMarketShareChart(_section);
                  }
                }, 100);
                break;
              case 'adspend':
                content.innerHTML = self.renderAdSpend();
                setTimeout(() => {
                  if (_section) generateAdSpendChart(_section);
                }, 100);
                break;
              case 'swot':
                content.innerHTML = self.renderSWOT();
                break;
              case 'headtohead':
                content.innerHTML = self.renderHeadToHead();
                setTimeout(() => {
                  if (_section) self.bindH2H();
                }, 100);
                break;
              case 'playbook':
                content.innerHTML = self.renderPlaybook();
                break;
            }
            self.attachRowClicks();
          } catch (e) {
            console.error('CB tab error:', e);
          }
        });
      });

      const stealBtn = el.querySelector('#cbStealBtn');
      if (stealBtn) stealBtn.addEventListener('click', () => this.renderPlaybookModal());

      const refreshBtn = el.querySelector('#cbRefreshBtn');
      if (refreshBtn)
        refreshBtn.addEventListener('click', async () => {
          refreshBtn.textContent = '⏳ Fetching...';
          refreshBtn.disabled = true;
          await attemptLiveFetch();
          refreshBtn.textContent = '🔄 Refresh';
          refreshBtn.disabled = false;
        });

      this.attachRowClicks();
      updateStatusIndicator(Data.isLiveData() ? 'live' : 'demo');
    },

    switchTab(tabName) {
      if (!_section) return;
      const tab = _section.querySelector(`.cb-tab[data-tab="${tabName}"]`);
      if (tab) tab.click();
    },

    buildHTML() {
      const comps = Data.getCompetitors();
      const ads = Data.getLiveAds();
      const prices = Data.getPriceChanges();
      const prods = Data.getNewProducts();
      const isLive = Data.isLiveData();
      const statusLabel = isLive ? 'LIVE INTELLIGENCE' : 'DEMO DATA';
      const banner = `<div class="cb-live-banner"><span class="cb-live-dot"></span><span class="cb-live-text">${statusLabel} — Tracking ${comps.length} competitors • ${ads.length} active ads</span><div class="cb-banner-actions"><span id="cbStatusIndicator"></span><button class="cb-refresh-btn" id="cbRefreshBtn" title="Fetch live data">🔄 Refresh</button><button class="cb-steal-btn" id="cbStealBtn">⚡ Winning Playbook</button></div></div>`;
      const tabs = `<div class="cb-tabs" role="tablist" aria-label="Competitor intelligence sections"><button class="cb-tab active" data-tab="overview" role="tab" aria-selected="true" aria-controls="cbTabContent">Overview</button><button class="cb-tab" data-tab="leaderboard" role="tab" aria-selected="false" aria-controls="cbTabContent">Leaderboard</button><button class="cb-tab" data-tab="ads" role="tab" aria-selected="false" aria-controls="cbTabContent">Live Ads (${ads.length})</button><button class="cb-tab" data-tab="prices" role="tab" aria-selected="false" aria-controls="cbTabContent">Price Wars (${prices.length})</button><button class="cb-tab" data-tab="products" role="tab" aria-selected="false" aria-controls="cbTabContent">New Products (${prods.length})</button><button class="cb-tab" data-tab="revenue" role="tab" aria-selected="false" aria-controls="cbTabContent">Revenue Intel</button><button class="cb-tab" data-tab="adspend" role="tab" aria-selected="false" aria-controls="cbTabContent">Ad Spend</button><button class="cb-tab" data-tab="swot" role="tab" aria-selected="false" aria-controls="cbTabContent">SWOT Analysis</button><button class="cb-tab" data-tab="headtohead" role="tab" aria-selected="false" aria-controls="cbTabContent">Head-to-Head</button><button class="cb-tab" data-tab="playbook" role="tab" aria-selected="false" aria-controls="cbTabContent">Winning Playbook</button></div>`;
      const content = `<div class="cb-tab-content" id="cbTabContent" role="tabpanel">${this.renderOverview()}</div>`;
      return banner + tabs + content;
    },

    attachRowClicks() {
      if (!_section) return;
      _section.querySelectorAll('.cb-comp-row').forEach((row) => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
          const comp = Data.getCompetitors().find((c) => c.id === row.dataset.id);
          if (comp) showCompetitorProfile(comp);
        });
      });
      _section.querySelectorAll('.cb-price-row').forEach((row) => {
        row.addEventListener('click', () => {
          const comp = Data.getCompetitors().find((c) => c.name === row.dataset.competitor);
          if (comp) showCompetitorProfile(comp);
        });
      });
      _section.querySelectorAll('.cb-newprod-row').forEach((row) => {
        row.addEventListener('click', () => {
          const comp = Data.getCompetitors().find((c) => c.name === row.dataset.competitor);
          if (comp) showCompetitorProfile(comp);
        });
      });
      _section.querySelectorAll('.cb-ad-card').forEach((row) => {
        row.addEventListener('click', () => {
          const comp = Data.getCompetitors().find((c) => c.name === row.dataset.competitor);
          if (comp) showCompetitorProfile(comp);
        });
      });
      _section.querySelectorAll('.cb-adspend-row').forEach((row) => {
        row.addEventListener('click', () => {
          const comp = Data.getCompetitors().find((c) => c.name === row.dataset.competitor);
          if (comp) showCompetitorProfile(comp);
        });
      });
      _section.querySelectorAll('.cb-swot-competitor').forEach((row) => {
        row.addEventListener('click', () => {
          const comp = Data.getCompetitors().find((c) => c.name === row.dataset.competitor);
          if (comp) showCompetitorProfile(comp);
        });
      });
      _section.querySelectorAll('.cb-ov-card').forEach((card) => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          const label = card.querySelector('.cb-ov-label')?.textContent || '';
          if (label.includes('Price Drops')) this.switchTab('prices');
          else if (label.includes('New Products')) this.switchTab('products');
          else if (label.includes('Revenue')) this.switchTab('revenue');
          else if (label.includes('Ads Running') || label.includes('Ad CTR')) this.switchTab('ads');
          else if (label.includes('Competitors')) this.switchTab('leaderboard');
        });
      });
    },

    renderOverview() {
      const comps = Data.getCompetitors();
      const ads = Data.getLiveAds();
      const prices = Data.getPriceChanges();
      const prods = Data.getNewProducts();
      const totalRev = comps.reduce((a, c) => a + c.revenue, 0);
      const totalAds = ads.length;
      const priceDrops = prices.filter((p) => p.change < 0).length;
      const avgConv = (comps.reduce((a, c) => a + c.convRate, 0) / comps.length).toFixed(1);
      return `
      <div class="cb-overview-grid">
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🏢</div><div class="cb-ov-label">Competitors Tracked</div><div class="cb-ov-value" style="color:var(--accent-cyan)">${comps.length}</div><div class="cb-ov-sub">Active monitoring</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">💰</div><div class="cb-ov-label">Combined Revenue</div><div class="cb-ov-value" style="color:var(--accent-green)">${fmtMoney(totalRev)}</div><div class="cb-ov-sub">Monthly estimate</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">📢</div><div class="cb-ov-label">Live Ads Running</div><div class="cb-ov-value" style="color:var(--accent-orange)">${totalAds}</div><div class="cb-ov-sub">Across all platforms</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-red-dim);color:var(--accent-red)">📉</div><div class="cb-ov-label">Price Drops Today</div><div class="cb-ov-value" style="color:var(--accent-red)">${priceDrops}</div><div class="cb-ov-sub">Competitive pressure</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:rgba(168,85,247,0.12);color:var(--accent-purple)">📊</div><div class="cb-ov-label">Avg Conversion</div><div class="cb-ov-value" style="color:var(--accent-purple)">${avgConv}%</div><div class="cb-ov-sub">Across competitors</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-pink-dim);color:var(--accent-pink)">🆕</div><div class="cb-ov-label">New Products Today</div><div class="cb-ov-value" style="color:var(--accent-pink)">${prods.length}</div><div class="cb-ov-sub">Just launched</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-yellow-dim);color:var(--accent-yellow)">🎯</div><div class="cb-ov-label">Top Ad CTR</div><div class="cb-ov-value" style="color:var(--accent-yellow)">${ads.length ? Math.max(...ads.map((a) => parseFloat(a.ctr) || 0)) : 0}%</div><div class="cb-ov-sub">${ads.length ? [...ads].sort((a, b) => parseFloat(b.ctr) - parseFloat(a.ctr))[0].competitor : 'N/A'}</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">⚡</div><div class="cb-ov-label">Highest Revenue</div><div class="cb-ov-value" style="color:var(--accent-cyan)">${comps.length ? fmtMoney(Math.max(...comps.map((c) => c.revenue))) : '$0'}</div><div class="cb-ov-sub">${comps.length ? [...comps].sort((a, b) => b.revenue - a.revenue)[0].name : 'N/A'}</div></div>
      </div>

      <div class="cb-section">
        <h3 class="cb-section-title">Top Competitors by Revenue</h3>
        <div class="cb-comp-list">${[...comps]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map((c, i) => renderCompetitorRow(c, i))
          .join('')}</div>
      </div>

      <div class="cb-overview-bottom-grid">
        <div class="cb-section">
          <h3 class="cb-section-title">Latest Price Changes</h3>
          <div class="cb-price-list">${prices
            .slice(0, 3)
            .map((p) => renderPriceRow(p))
            .join('')}</div>
        </div>
        <div class="cb-section">
          <h3 class="cb-section-title">New Products Just Launched</h3>
          <div class="cb-newprod-list">${prods
            .slice(0, 3)
            .map((np) => renderNewProductRow(np))
            .join('')}</div>
        </div>
      </div>
    `;
    },

    renderLeaderboard() {
      const comps = Data.getCompetitors();
      const sorted = [...comps].sort((a, b) => b.revenue - a.revenue);
      return `
      <div class="cb-lb-controls">
        <input type="text" class="cb-lb-search" placeholder="Search competitors..." id="cbLbSearch">
        <select class="cb-lb-sort" id="cbLbSort">
          <option value="revenue">Sort: Revenue</option>
          <option value="traffic">Sort: Traffic</option>
          <option value="convRate">Sort: Conversion</option>
          <option value="ads">Sort: Active Ads</option>
          <option value="products">Sort: Products</option>
          <option value="pageSpeed">Sort: Page Speed</option>
        </select>
      </div>
      <div class="cb-lb-list" id="cbLbList">
        ${sorted
          .map(
            (c, i) => `<div class="cb-lb-row" data-id="${c.id}">
          <div class="cb-lb-rank">#${i + 1}</div>
          <div class="cb-lb-avatar" style="background:${c.color}22;color:${c.color}">${esc(c.avatar)}</div>
          <div class="cb-lb-info">
            <div class="cb-lb-name">${esc(c.name)}</div>
            <div class="cb-lb-url">${esc(c.url)} • ${esc(c.platform)} • ${esc(c.cat)}</div>
          </div>
          <div class="cb-lb-metrics">
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.revenue / (sorted[0].revenue || 1)) * 100}%;background:var(--accent-green)"></div></div><span class="cb-lb-metric-val" style="color:var(--accent-green)">${fmtMoney(c.revenue)}</span><span class="cb-lb-metric-lbl">Revenue</span></div>
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.traffic / (sorted[0].traffic || 1)) * 100}%;background:var(--accent-cyan)"></div></div><span class="cb-lb-metric-val">${fmtNum(c.traffic)}</span><span class="cb-lb-metric-lbl">Traffic</span></div>
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.convRate / 3.5) * 100}%;background:var(--accent-purple)"></div></div><span class="cb-lb-metric-val">${c.convRate}%</span><span class="cb-lb-metric-lbl">Conv.</span></div>
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.pageSpeed / 100) * 100}%;background:var(--accent-orange)"></div></div><span class="cb-lb-metric-val">${c.pageSpeed}</span><span class="cb-lb-metric-lbl">Speed</span></div>
          </div>
          <div class="cb-lb-social">
            ${c.social.fb ? `<span class="cb-social-icon-sm fb">F</span>${fmtNum(c.social.fb)}` : ''}
            ${c.social.ig ? `<span class="cb-social-icon-sm ig">I</span>${fmtNum(c.social.ig)}` : ''}
            ${c.social.tk ? `<span class="cb-social-icon-sm tk">T</span>${fmtNum(c.social.tk)}` : ''}
          </div>
          <div class="cb-lb-active"><span class="cb-comp-active-dot"></span>${esc(c.lastActive)}</div>
        </div>`
          )
          .join('')}
      </div>
    `;
    },

    renderAds() {
      const ads = Data.getLiveAds();
      const groups = {};
      ads.forEach((a) => {
        if (!groups[a.platform]) groups[a.platform] = [];
        groups[a.platform].push(a);
      });
      return `
      <div class="cb-ads-summary">
        <div class="cb-ads-summary-card"><span class="cb-ads-summary-val" style="color:var(--accent-green)">${ads.length}</span><span class="cb-ads-summary-lbl">Total Ads</span></div>
        <div class="cb-ads-summary-card"><span class="cb-ads-summary-val" style="color:var(--accent-orange)">${ads.filter((a) => a.status === 'scaling').length}</span><span class="cb-ads-summary-lbl">Scaling</span></div>
        <div class="cb-ads-summary-card"><span class="cb-ads-summary-val" style="color:var(--accent-cyan)">${ads.reduce((a, b) => a + (parseInt(b.spend, 10) || 0), 0)}</span><span class="cb-ads-summary-lbl">Total $/day</span></div>
        <div class="cb-ads-summary-card"><span class="cb-ads-summary-val" style="color:var(--accent-purple)">${ads.length ? (ads.reduce((a, b) => a + (parseFloat(b.ctr) || 0), 0) / ads.length).toFixed(1) : 0}%</span><span class="cb-ads-summary-lbl">Avg CTR</span></div>
      </div>
      <div class="cb-ads-groups">
        ${Object.entries(groups)
          .map(
            ([platform, adList]) => `
          <div class="cb-ads-group">
            <h3 class="cb-ads-group-header">${platform} <span class="cb-ads-group-count">${adList.length} ads</span></h3>
            <div class="cb-ads-grid">${adList.map((a) => renderAdCard(a)).join('')}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
    },

    renderPrices() {
      const prices = Data.getPriceChanges();
      return `
      <div class="cb-prices-summary">
        <div class="cb-prices-summary-card"><span class="cb-prices-summary-val" style="color:var(--accent-red)">${prices.filter((p) => p.change < 0).length}</span><span class="cb-prices-summary-lbl">Price Drops</span></div>
        <div class="cb-prices-summary-card"><span class="cb-prices-summary-val" style="color:var(--accent-green)">${prices.filter((p) => p.change > 0).length}</span><span class="cb-prices-summary-lbl">Price Increases</span></div>
        <div class="cb-prices-summary-card"><span class="cb-prices-summary-val" style="color:var(--accent-orange)">${prices.filter((p) => p.impact === 'HIGH').length}</span><span class="cb-prices-summary-lbl">High Impact</span></div>
        <div class="cb-prices-summary-card"><span class="cb-prices-summary-val">${prices.length ? Math.round(prices.reduce((a, p) => a + (parseInt(p.change, 10) || 0), 0) / prices.length) : 0}%</span><span class="cb-prices-summary-lbl">Avg Change</span></div>
      </div>
      <div class="cb-section">
        <h3 class="cb-section-title">All Price Changes</h3>
        <div class="cb-price-list-full">${prices.map((p) => renderPriceRow(p)).join('')}</div>
      </div>
    `;
    },

    renderNewProducts() {
      const prods = Data.getNewProducts();
      return `
      <div class="cb-newprod-summary">
        <div class="cb-newprod-summary-card"><span class="cb-newprod-summary-val">${prods.length}</span><span class="cb-newprod-summary-lbl">Products Launched</span></div>
        <div class="cb-newprod-summary-card"><span class="cb-newprod-summary-val" style="color:var(--accent-green)">${prods.filter((n) => n.trend === 'rising').length}</span><span class="cb-newprod-summary-lbl">Trending Up</span></div>
        <div class="cb-newprod-summary-card"><span class="cb-newprod-summary-val" style="color:var(--accent-cyan)">${prods.length ? Math.round(prods.reduce((a, n) => a + (parseInt(n.score, 10) || 0), 0) / prods.length) : 0}</span><span class="cb-newprod-summary-lbl">Avg Score</span></div>
        <div class="cb-newprod-summary-card"><span class="cb-newprod-summary-val">$${prods.length ? (prods.reduce((a, n) => a + (parseFloat(n.price) || 0), 0) / prods.length).toFixed(0) : '0'}</span><span class="cb-newprod-summary-lbl">Avg Price</span></div>
      </div>
      <div class="cb-section">
        <h3 class="cb-section-title">All New Product Launches</h3>
        <div class="cb-newprod-list-full">${prods.map((np) => renderNewProductRow(np)).join('')}</div>
      </div>
    `;
    },

    renderRevenue() {
      const comps = Data.getCompetitors();
      return `
      <div class="cb-revenue-section">
        <h3 class="cb-section-title">Revenue Intelligence</h3>
        <p class="cb-revenue-desc">Estimated based on traffic volume, conversion rates, and average order values</p>
        <div class="cb-revenue-charts-grid">
          <div class="cb-chart-box"><h4>Revenue Comparison</h4><div class="cb-chart-container"><canvas id="cbRevenueChart"></canvas></div></div>
          <div class="cb-chart-box"><h4>Market Share</h4><div class="cb-chart-container"><canvas id="cbMarketShareChart"></canvas></div></div>
        </div>
        <div class="cb-revenue-table">
          <div class="cb-rev-header"><span>Store</span><span>Platform</span><span>Traffic</span><span>Conv.</span><span>AOV</span><span>Est. Revenue</span><span>Daily Rev</span></div>
          ${[...comps]
            .sort((a, b) => b.revenue - a.revenue)
            .map((c) => {
              const aov = c.traffic && c.convRate ? (c.revenue / ((c.traffic * c.convRate) / 100)).toFixed(2) : '0';
              const daily = Math.round(c.revenue / 30);
              return `<div class="cb-rev-row"><span class="cb-rev-name">${esc(c.name)}</span><span>${esc(c.platform)}</span><span>${fmtNum(c.traffic || 0)}</span><span>${c.convRate || 0}%</span><span>$${aov}</span><span style="color:var(--accent-green)">${fmtMoney(c.revenue || 0)}</span><span>${fmtMoney(daily)}</span></div>`;
            })
            .join('')}
        </div>
      </div>
    `;
    },

    renderAdSpend() {
      const spend = Data.getAdSpend();
      const totalDaily = spend.reduce((a, s) => a + (parseInt(s.totalSpend, 10) || parseInt(s.daily, 10) || 0), 0);
      const totalMonthly = spend.reduce((a, s) => a + (parseInt(s.monthly, 10) || 0), 0);
      const avgROI = spend.length
        ? (spend.reduce((a, s) => a + (parseFloat(s.estROI) || 0), 0) / spend.length).toFixed(1)
        : '0';
      const topSpender = [...spend].sort(
        (a, b) =>
          (parseInt(b.totalSpend, 10) || parseInt(b.daily, 10) || 0) -
          (parseInt(a.totalSpend, 10) || parseInt(a.daily, 10) || 0)
      )[0];
      return `
      <div class="cb-adspend-summary">
        <div class="cb-adspend-card"><div class="cb-adspend-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">💵</div><div class="cb-adspend-val">$${totalDaily}/day</div><div class="cb-adspend-lbl">Total Daily Spend</div></div>
        <div class="cb-adspend-card"><div class="cb-adspend-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">📈</div><div class="cb-adspend-val">$${totalMonthly.toLocaleString()}/mo</div><div class="cb-adspend-lbl">Total Monthly Spend</div></div>
        <div class="cb-adspend-card"><div class="cb-adspend-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🎯</div><div class="cb-adspend-val">${avgROI}x</div><div class="cb-adspend-lbl">Average ROI</div></div>
        <div class="cb-adspend-card"><div class="cb-adspend-icon" style="background:var(--accent-red-dim);color:var(--accent-red)">🏆</div><div class="cb-adspend-val">${topSpender ? (topSpender.competitor || 'N/A').split(' ')[0] : 'N/A'}</div><div class="cb-adspend-lbl">Biggest Spender</div></div>
      </div>
      <div class="cb-chart-box"><h4>Daily Ad Spend by Platform</h4><div class="cb-chart-container"><canvas id="cbAdSpendChart"></canvas></div></div>
      <div class="cb-section" style="margin-top:24px">
        <h3 class="cb-section-title">Ad Spend Breakdown</h3>
        <div class="cb-adspend-table">
          <div class="cb-adspend-header"><span>Store</span><span>Facebook</span><span>TikTok</span><span>Instagram</span><span>Daily</span><span>Monthly</span><span>ROI</span></div>
          ${[...spend]
            .sort(
              (a, b) =>
                (parseInt(b.totalSpend, 10) || parseInt(b.daily, 10) || 0) -
                (parseInt(a.totalSpend, 10) || parseInt(a.daily, 10) || 0)
            )
            .map(
              (s) => `
            <div class="cb-adspend-row" data-competitor="${esc(s.competitor)}" style="cursor:pointer">
              <span class="cb-adspend-name">${esc(s.competitor)}</span>
              <span>${s.platforms?.facebook ? '$' + s.platforms.facebook : '—'}</span>
              <span>${s.platforms?.tiktok ? '$' + s.platforms.tiktok : '—'}</span>
              <span>${s.platforms?.instagram ? '$' + s.platforms.instagram : '—'}</span>
              <span style="color:var(--accent-orange)">$${s.daily || s.totalSpend || 0}</span>
              <span>$${(s.monthly || 0).toLocaleString()}</span>
              <span style="color:var(--accent-green)">${s.estROI || 0}x</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
    },

    renderSWOT() {
      const swot = Data.getSWOT();
      return `
      <div class="cb-swot-intro">
        <h3 class="cb-section-title">SWOT Analysis — Top Competitors</h3>
        <p class="cb-swot-desc">Strengths, Weaknesses, Opportunities and Threats for each competitor</p>
      </div>
      <div class="cb-swot-grid">
        ${swot
          .map(
            (s) => `
          <div class="cb-swot-competitor" data-competitor="${esc(s.competitor)}" style="cursor:pointer">
            <h4 class="cb-swot-comp-name">${esc(s.competitor)}</h4>
            <div class="cb-swot-cards">
              <div class="cb-swot-card cb-swot-s"><div class="cb-swot-label">💪 Strengths</div><ul>${(s.strengths || []).map((x) => '<li>' + esc(x) + '</li>').join('')}</ul></div>
              <div class="cb-swot-card cb-swot-w"><div class="cb-swot-label">⚠️ Weaknesses</div><ul>${(s.weaknesses || []).map((x) => '<li>' + esc(x) + '</li>').join('')}</ul></div>
              <div class="cb-swot-card cb-swot-o"><div class="cb-swot-label">🚀 Opportunities</div><ul>${(s.opportunities || []).map((x) => '<li>' + esc(x) + '</li>').join('')}</ul></div>
              <div class="cb-swot-card cb-swot-t"><div class="cb-swot-label">🔥 Threats</div><ul>${(s.threats || []).map((x) => '<li>' + esc(x) + '</li>').join('')}</ul></div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
    },

    renderHeadToHead() {
      const comps = Data.getCompetitors();
      if (comps.length < 2) {
        return (
          '<div class="cb-h2h-intro"><h3 class="cb-section-title">Head-to-Head Comparison</h3><p class="cb-h2h-desc">Need at least 2 competitors for comparison. Current: ' +
          comps.length +
          '</p></div>'
        );
      }
      const sorted = [...comps].sort((a, b) => b.revenue - a.revenue);
      return `
      <div class="cb-h2h-intro">
        <h3 class="cb-section-title">Head-to-Head Comparison</h3>
        <p class="cb-h2h-desc">Select two competitors to compare side-by-side</p>
        <div class="cb-h2h-selectors">
          <select class="cb-h2h-select" id="cbH2H1">
            ${sorted.map((c, i) => `<option value="${c.id}" ${i === 0 ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
          <span class="cb-h2h-vs">VS</span>
          <select class="cb-h2h-select" id="cbH2H2">
            ${sorted.map((c, i) => `<option value="${c.id}" ${i === 1 ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="cb-h2h-result" id="cbH2HResult">${this.renderH2HResult(sorted[0], sorted[1])}</div>
    `;
    },

    renderH2HResult(a, b) {
      const maxRev = Math.max(a.revenue, b.revenue) || 1;
      const maxTraffic = Math.max(a.traffic, b.traffic) || 1;
      const maxConv = Math.max(a.convRate, b.convRate) || 1;
      const maxAds = Math.max(a.ads, b.ads) || 1;
      const maxProducts = Math.max(a.products, b.products) || 1;
      const metrics = [
        {
          label: 'Revenue/mo',
          aVal: fmtMoney(a.revenue),
          bVal: fmtMoney(b.revenue),
          aPct: (a.revenue / maxRev) * 100,
          bPct: (b.revenue / maxRev) * 100,
          color: 'var(--accent-green)',
        },
        {
          label: 'Traffic/mo',
          aVal: fmtNum(a.traffic),
          bVal: fmtNum(b.traffic),
          aPct: (a.traffic / maxTraffic) * 100,
          bPct: (b.traffic / maxTraffic) * 100,
          color: 'var(--accent-cyan)',
        },
        {
          label: 'Conversion',
          aVal: a.convRate + '%',
          bVal: b.convRate + '%',
          aPct: (a.convRate / maxConv) * 100,
          bPct: (b.convRate / maxConv) * 100,
          color: 'var(--accent-purple)',
        },
        {
          label: 'Active Ads',
          aVal: a.ads + '',
          bVal: b.ads + '',
          aPct: (a.ads / maxAds) * 100,
          bPct: (b.ads / maxAds) * 100,
          color: 'var(--accent-orange)',
        },
        {
          label: 'Products',
          aVal: a.products + '',
          bVal: b.products + '',
          aPct: (a.products / maxProducts) * 100,
          bPct: (b.products / maxProducts) * 100,
          color: 'var(--accent-pink)',
        },
        {
          label: 'Page Speed',
          aVal: a.pageSpeed + '/100',
          bVal: b.pageSpeed + '/100',
          aPct: a.pageSpeed,
          bPct: b.pageSpeed,
          color: 'var(--accent-yellow)',
        },
        {
          label: 'Bounce Rate',
          aVal: a.bounceRate + '%',
          bVal: b.bounceRate + '%',
          aPct: (1 - a.bounceRate / 100) * 100,
          bPct: (1 - b.bounceRate / 100) * 100,
          color: 'var(--accent-red)',
        },
      ];
      const aWins = metrics.filter((m) => m.aPct > m.bPct).length;
      const bWins = metrics.filter((m) => m.bPct > m.aPct).length;
      return `
      <div class="cb-h2h-panels">
        <div class="cb-h2h-panel">
          <div class="cb-h2h-panel-avatar" style="background:${a.color}22;color:${a.color}">${esc(a.avatar)}</div>
          <div class="cb-h2h-panel-name">${esc(a.name)}</div>
          <div class="cb-h2h-panel-url">${esc(a.url)}</div>
        </div>
        <div class="cb-h2h-panel">
          <div class="cb-h2h-panel-avatar" style="background:${b.color}22;color:${b.color}">${esc(b.avatar)}</div>
          <div class="cb-h2h-panel-name">${esc(b.name)}</div>
          <div class="cb-h2h-panel-url">${esc(b.url)}</div>
        </div>
      </div>
      <div class="cb-h2h-metrics">
        ${metrics
          .map(
            (m) => `
          <div class="cb-h2h-metric-row">
            <div class="cb-h2h-metric-left"><div class="cb-h2h-metric-bar-bg"><div class="cb-h2h-metric-bar-fill" style="width:${m.aPct}%;background:${m.color}"></div></div><span class="cb-h2h-metric-val">${m.aVal}</span></div>
            <div class="cb-h2h-metric-label">${m.label}</div>
            <div class="cb-h2h-metric-right"><div class="cb-h2h-metric-bar-bg"><div class="cb-h2h-metric-bar-fill" style="width:${m.bPct}%;background:${m.color}"></div></div><span class="cb-h2h-metric-val">${m.bVal}</span></div>
          </div>
        `
          )
          .join('')}
      </div>
      <div class="cb-h2h-verdict">
        <div class="cb-h2h-winner">${esc(a.name)} wins ${aWins} categories</div>
        <div class="cb-h2h-loser">${esc(b.name)} wins ${bWins} categories</div>
      </div>
    `;
    },

    bindH2H() {
      const sel1 = _section?.querySelector('#cbH2H1');
      const sel2 = _section?.querySelector('#cbH2H2');
      const result = _section?.querySelector('#cbH2HResult');
      if (!sel1 || !sel2 || !result) return;
      const self = this;
      function update() {
        const a = Data.getCompetitors().find((c) => c.id === sel1.value);
        const b = Data.getCompetitors().find((c) => c.id === sel2.value);
        if (a && b) result.innerHTML = self.renderH2HResult(a, b);
      }
      sel1.addEventListener('change', update);
      sel2.addEventListener('change', update);
    },

    bindLeaderboard() {
      if (!_section) return;
      const searchInput = _section.querySelector('#cbLbSearch');
      const sortSelect = _section.querySelector('#cbLbSort');
      const listEl = _section.querySelector('#cbLbList');
      if (!searchInput || !sortSelect || !listEl) return;

      const self = this;
      function filterAndRender() {
        const q = (searchInput.value || '').trim().toLowerCase();
        const sortBy = sortSelect.value || 'revenue';
        let comps = Data.getCompetitors();
        if (q) {
          comps = comps.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.url.toLowerCase().includes(q) ||
              (c.cat || '').toLowerCase().includes(q)
          );
        }
        comps.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
        listEl.innerHTML = comps
          .map((c, i) => {
            const sorted0 = comps[0] || c;
            return `<div class="cb-lb-row" data-id="${c.id}">
          <div class="cb-lb-rank">#${i + 1}</div>
          <div class="cb-lb-avatar" style="background:${c.color}22;color:${c.color}">${esc(c.avatar)}</div>
          <div class="cb-lb-info">
            <div class="cb-lb-name">${esc(c.name)}</div>
            <div class="cb-lb-url">${esc(c.url)} • ${esc(c.platform)} • ${esc(c.cat)}</div>
          </div>
          <div class="cb-lb-metrics">
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.revenue / (sorted0.revenue || 1)) * 100}%;background:var(--accent-green)"></div></div><span class="cb-lb-metric-val" style="color:var(--accent-green)">${fmtMoney(c.revenue)}</span><span class="cb-lb-metric-lbl">Revenue</span></div>
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.traffic / (sorted0.traffic || 1)) * 100}%;background:var(--accent-cyan)"></div></div><span class="cb-lb-metric-val">${fmtNum(c.traffic)}</span><span class="cb-lb-metric-lbl">Traffic</span></div>
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.convRate / 3.5) * 100}%;background:var(--accent-purple)"></div></div><span class="cb-lb-metric-val">${c.convRate}%</span><span class="cb-lb-metric-lbl">Conv.</span></div>
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.pageSpeed / 100) * 100}%;background:var(--accent-orange)"></div></div><span class="cb-lb-metric-val">${c.pageSpeed}</span><span class="cb-lb-metric-lbl">Speed</span></div>
          </div>
          <div class="cb-lb-social">
            ${c.social.fb ? `<span class="cb-social-icon-sm fb">F</span>${fmtNum(c.social.fb)}` : ''}
            ${c.social.ig ? `<span class="cb-social-icon-sm ig">I</span>${fmtNum(c.social.ig)}` : ''}
            ${c.social.tk ? `<span class="cb-social-icon-sm tk">T</span>${fmtNum(c.social.tk)}` : ''}
          </div>
          <div class="cb-lb-active"><span class="cb-comp-active-dot"></span>${esc(c.lastActive)}</div>
        </div>`;
          })
          .join('');
        self.attachRowClicks();
      }
      searchInput.addEventListener('input', filterAndRender);
      sortSelect.addEventListener('change', filterAndRender);
    },

    renderPlaybook() {
      const ads = Data.getLiveAds();
      const prods = Data.getNewProducts();
      const comps = Data.getCompetitors();
      const prices = Data.getPriceChanges();
      const spend = Data.getAdSpend();
      const topAd = ads.length ? [...ads].sort((a, b) => parseFloat(b.ctr || 0) - parseFloat(a.ctr || 0))[0] : null;
      const topProduct = prods.length
        ? [...prods].sort((a, b) => (parseInt(b.score, 10) || 0) - (parseInt(a.score, 10) || 0))[0]
        : null;
      const _topCompetitor = comps.length ? [...comps].sort((a, b) => b.revenue - a.revenue)[0] : null;
      const priceWar = prices.filter((p) => p.change < 0).length;
      const topSpender = spend.length
        ? [...spend].sort(
            (a, b) =>
              (parseInt(b.totalSpend, 10) || parseInt(b.daily, 10) || 0) -
              (parseInt(a.totalSpend, 10) || parseInt(a.daily, 10) || 0)
          )[0]
        : null;

      return `
      <div class="cb-playbook-header">
        <h3 class="cb-section-title">⚡ Winning Playbook</h3>
        <p class="cb-playbook-desc">AI-generated actionable strategies based on live competitor intelligence</p>
      </div>

      <div class="cb-playbook-cards">
        <div class="cb-playbook-card cb-playbook-urgent">
          <div class="cb-playbook-card-header"><span class="cb-playbook-icon">🚨</span><h4>Immediate Actions (Next 24h)</h4></div>
          <div class="cb-playbook-list">
            <div class="cb-playbook-item"><span class="cb-playbook-num">1</span><div><strong>Match ${topAd ? esc(topAd.product) : 'top product'} ad creative</strong><br><span class="cb-playbook-detail">${topAd ? `${esc(topAd.competitor)}'s "${esc(topAd.hook)}" is getting ${topAd.ctr}% CTR on ${esc(topAd.platform)}. Create a similar UGC video with your own angle. Budget: $${Math.round((parseInt(topAd.spend, 10) || 50) * 0.7)}/day to start.` : 'Analyze top-performing competitor ads and create similar creatives. Focus on UGC-style video content.'}</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">2</span><div><strong>Source ${topProduct ? esc(topProduct.name) : 'trending product'} immediately</strong><br><span class="cb-playbook-detail">${topProduct ? `${esc(topProduct.competitor)} just launched this at $${topProduct.price}. Score: ${topProduct.score}/100. Price at $${(parseFloat(topProduct.price) * 1.4).toFixed(2)} for 40% margin. First-mover advantage is NOW.` : 'Identify trending products from competitors and source them quickly for first-mover advantage.'}</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">3</span><div><strong>Drop prices on key products</strong><br><span class="cb-playbook-detail">${priceWar} competitors dropped prices today. Match or beat the lowest prices to stay competitive.</span></div></div>
          </div>
        </div>

        <div class="cb-playbook-card cb-playbook-week">
          <div class="cb-playbook-card-header"><span class="cb-playbook-icon">📅</span><h4>This Week's Strategy</h4></div>
          <div class="cb-playbook-list">
            <div class="cb-playbook-item"><span class="cb-playbook-num">4</span><div><strong>Scale TikTok ad budget to $${topSpender ? Math.round((parseInt(topSpender.totalSpend, 10) || parseInt(topSpender.daily, 10) || 50) * 1.2) : 60}/day</strong><br><span class="cb-playbook-detail">TikTok ads are outperforming Facebook 2:1 across all competitors. Shift 70% of budget to TikTok, 20% Instagram, 10% Facebook retargeting.</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">5</span><div><strong>Launch a product bundle deal</strong><br><span class="cb-playbook-detail">Combine your top 3 products into a "Starter Kit" at 20% discount. Competitors aren't doing this yet. Target AOV increase from $35 to $55.</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">6</span><div><strong>Optimize page speed to 90+</strong><br><span class="cb-playbook-detail">Top stores are crushing you on speed. Compress images, enable lazy loading, minimize CSS/JS. Every 1s delay = 7% conversion loss.</span></div></div>
          </div>
        </div>

        <div class="cb-playbook-card cb-playbook-long">
          <div class="cb-playbook-card-header"><span class="cb-playbook-icon">🎯</span><h4>30-Day Growth Plan</h4></div>
          <div class="cb-playbook-list">
            <div class="cb-playbook-item"><span class="cb-playbook-num">7</span><div><strong>Build email list to 5,000 subscribers</strong><br><span class="cb-playbook-detail">Email marketing drives 35% of revenue for top stores. Add pop-up with 10% discount, launch welcome series, set up abandoned cart flows. Target: $5K/mo email revenue.</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">8</span><div><strong>Launch on Amazon FBA</strong><br><span class="cb-playbook-detail">Your top 3 products are selling on Amazon for 30-50% more. List there with FBA for Prime badge. Target: $8K/mo Amazon revenue within 30 days.</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">9</span><div><strong>Start influencer seeding program</strong><br><span class="cb-playbook-detail">Send free products to 20 micro-influencers (10K-50K followers) in your niche. Cost: ~$500 in products. Expected return: 3-5x ROAS from UGC content.</span></div></div>
          </div>
        </div>
      </div>
    `;
    },

    renderPlaybookModal() {
      const ads = Data.getLiveAds();
      const prods = Data.getNewProducts();
      const comps = Data.getCompetitors();
      const topAd = ads.length ? [...ads].sort((a, b) => parseFloat(b.ctr || 0) - parseFloat(a.ctr || 0))[0] : null;
      const topProduct = prods.length
        ? [...prods].sort((a, b) => (parseInt(b.score, 10) || 0) - (parseInt(a.score, 10) || 0))[0]
        : null;
      const topCompetitor = comps.length ? [...comps].sort((a, b) => b.revenue - a.revenue)[0] : null;

      if (!topAd && !topProduct && !topCompetitor) {
        UI.modal(
          '<div class="cb-steal-modal"><h2>No Data Available</h2><p>Need competitor data to generate playbook. Configure AI API keys in Settings to fetch live data.</p></div>'
        );
        return;
      }

      UI.modal(`
      <div class="cb-steal-modal">
        <h2>⚡ Winning Playbook</h2>
        <p class="cb-steal-sub">AI-generated blueprint based on live competitor intelligence</p>

        <div class="cb-steal-card">
          <h3>🎯 Best-Performing Ad to Replicate</h3>
          <div class="cb-steal-ad">
            <div class="cb-steal-ad-header"><span class="cb-steal-platform">${topAd ? esc(topAd.platform) : 'N/A'}</span><span class="cb-steal-ctr">CTR: ${topAd ? topAd.ctr : 0}%</span></div>
            <div class="cb-steal-ad-hook">"${topAd ? esc(topAd.hook) : 'Ad hook not available'}"</div>
            <div class="cb-steal-ad-product">${topAd ? esc(topAd.product) : 'Product'} by ${topAd ? esc(topAd.competitor) : 'Competitor'}</div>
            <div class="cb-steal-ad-spend">Spending: $${topAd ? topAd.spend : 0}/day | Age: ${topAd ? esc(topAd.age) : 'N/A'} | Reach: ${fmtNum(topAd ? topAd.estReach : 0)}</div>
          </div>
          <div class="cb-steal-ad-blueprint">
            <h4>Your Version:</h4>
            <div class="cb-steal-ad-copy"><strong>Hook:</strong> "Everyone's been asking about this ${topAd ? topAd.product.toLowerCase() : 'product'} — here's why it's going viral..."</div>
            <div class="cb-steal-ad-copy"><strong>Body:</strong> Show product in use → highlight unique feature → social proof (2500+ reviews) → urgency ("50% OFF ends tonight")</div>
            <div class="cb-steal-ad-copy"><strong>CTA:</strong> "Link in bio — Limited stock!"</div>
          </div>
        </div>

        <div class="cb-steal-card">
          <h3>📦 Product to Launch</h3>
          <div class="cb-steal-product">
            <strong>${topProduct ? esc(topProduct.name) : 'Product'}</strong> — Score ${topProduct ? topProduct.score : 0}/100 — $${topProduct ? topProduct.price.toFixed(2) : '0.00'}
            <div class="cb-steal-product-comp">Launched by ${topProduct ? esc(topProduct.competitor) : 'Competitor'} ${topProduct ? esc(topProduct.time) : ''}</div>
          </div>
          <div class="cb-steal-recommendation">
            <strong>Recommendation:</strong> Source this product NOW before competitors scale. Target ${topProduct ? topProduct.category.toLowerCase() : 'niche'} enthusiasts. Price at $${topProduct ? (topProduct.price * 1.4).toFixed(2) : '0.00'} for 40% margin. Launch with UGC-style TikTok ads.
          </div>
        </div>

        <div class="cb-steal-card">
          <h3>🏆 Market Position Summary</h3>
          <div class="cb-steal-position">
            <div><strong>Top Competitor:</strong> ${topCompetitor ? esc(topCompetitor.name) : 'N/A'}</div>
            <div><strong>Their Revenue:</strong> ${fmtMoney(topCompetitor ? topCompetitor.revenue : 0)}/mo</div>
            <div><strong>Their Traffic:</strong> ${fmtNum(topCompetitor ? topCompetitor.traffic : 0)} visitors</div>
            <div><strong>Their Conversion:</strong> ${topCompetitor ? topCompetitor.convRate : 0}%</div>
            <div><strong>Active Ads:</strong> ${topCompetitor ? topCompetitor.ads : 0} running</div>
          </div>
          <div class="cb-steal-action">
            <strong>Action Plan:</strong><br>
            1. Copy their best ad creative style (but make it unique)<br>
            2. Price 10-15% lower to undercut<br>
            3. Target the SAME audience but with better creative<br>
            4. Launch within 48 hours before they scale further<br>
            5. Monitor their price drops — adjust accordingly
          </div>
        </div>
      </div>
    `);
    },

    updateLiveIndicator() {
      const dot = _section?.querySelector('.cb-live-dot');
      if (dot) dot.style.opacity = dot.style.opacity === '0.3' ? '1' : '0.3';
    },
  };

  PluginRegistry.register('competitor-battlefield', CompetitorBattlefieldPlugin);
})();
