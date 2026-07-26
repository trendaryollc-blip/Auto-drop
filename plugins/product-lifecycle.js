// ============================================================================
// PLUGIN: Product Lifecycle Radar v2 — Complete Dropshipper Intelligence
// ============================================================================
(function () {
  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(String(s || ''));

  const STAGES = {
    Rising: { color: 'var(--accent-green)', hex: '#00ff88', emoji: '🟢', action: 'Enter now — early stage advantage' },
    Peak: {
      color: 'var(--accent-yellow)',
      hex: '#fbbf24',
      emoji: '🟡',
      action: 'Maximize profit — prepare to transition',
    },
    Declining: {
      color: 'var(--accent-red)',
      hex: '#ff3366',
      emoji: '🔴',
      action: 'Exit or pivot — find rising replacement',
    },
  };

  const ACTIONS = {
    Rising: [
      'Start testing ads immediately — low competition window',
      'Secure supplier relationship before demand spikes',
      'Build branded store while entry barrier is low',
      'Create content calendar for organic traffic',
    ],
    Peak: [
      'Scale winning ads aggressively — max profit window',
      'Increase prices 10-15% while demand is high',
      'Bundle with complementary products for higher AOV',
      'Start researching next rising product in niche',
    ],
    Declining: [
      'Reduce ad spend gradually — preserve margins',
      'Liquidate remaining inventory at discount',
      'Pivot to adjacent rising niche',
      'Archive product data for seasonal re-entry',
    ],
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let _section = null;
  let _analyzed = [];
  let _activeFilter = 'all';
  let _activeSort = 'confidence';
  let _listeners = [];

  function _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function getPlatColor(p) {
    const m = {
      aliexpress: '#e62e04',
      amazon: '#ff9900',
      shopify: '#96bf48',
      ebay: '#e53238',
      temu: '#fb7701',
      tiktok: '#00f2ea',
      etsy: '#f1641e',
      cjdropshipping: '#40c351',
      dhgate: '#e62e04',
      wish: '#2fb7ec',
    };
    return m[p] || '#888';
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function navigateTo(sectionId) {
    window.HuntDrop.navigateTo(sectionId);
  }

  // ===== ANALYSIS ENGINE =====
  function analyzeProduct(p) {
    const t = p.trendData || [];
    if (t.length < 12) return null;
    const recent3 = (t[9] + t[10] + t[11]) / 3;
    const prev3 = (t[6] + t[7] + t[8]) / 3;
    const growthRecent = prev3 > 0 ? (recent3 - prev3) / prev3 : 0;
    const peakVal = Math.max(...t);
    const peakRatio = peakVal > 0 ? t[11] / peakVal : 0;
    const avgGrowth = ((t[11] - t[0]) / Math.max(t[0], 1)) * 100;

    let stage, confidence, daysToNext, reason;

    if (growthRecent > 0.15 && peakRatio > 0.7) {
      stage = 'Rising';
      confidence = Math.min(95, Math.round(60 + growthRecent * 100 + (1 - p.marketSaturation / 100) * 20));
      daysToNext = Math.round(30 + (100 - p.marketSaturation) * 1.5 + Math.random() * 20);
      reason = `Strong upward trend with ${(growthRecent * 100).toFixed(0)}% recent growth. Low saturation (${p.marketSaturation}%) means early-mover advantage. Act fast before competition catches up.`;
    } else if (growthRecent > -0.05 && peakRatio > 0.85) {
      stage = 'Peak';
      confidence = Math.min(92, Math.round(55 + peakRatio * 30 + (p.marketSaturation / 100) * 15));
      daysToNext = Math.round(15 + Math.random() * 30);
      reason = `Sales near all-time high but growth flattening. Competition at ${p.competition} level. Maximize profit now — prepare to transition before decline.`;
    } else {
      stage = 'Declining';
      confidence = Math.min(90, Math.round(50 + Math.abs(growthRecent) * 80 + (p.marketSaturation / 100) * 20));
      daysToNext = Math.round(5 + Math.random() * 15);
      reason = `Downward trend detected (${(growthRecent * 100).toFixed(0)}% recent decline). High saturation (${p.marketSaturation}%). Consider switching to a rising product in the same niche.`;
    }

    const prices = p.platformPrices || {};
    const platforms = Object.entries(prices).map(([k, v]) => ({ name: k, price: v, color: getPlatColor(k) }));
    const bestBuy = platforms.reduce(
      (a, b) => (b.price < a.price ? b : a),
      platforms[0] || { price: p.price, name: p.platform }
    );
    const bestSell = platforms.reduce(
      (a, b) => (b.price > a.price ? b : a),
      platforms[0] || { price: p.price * 3, name: 'amazon' }
    );
    const profit = (bestSell.price - bestBuy.price - 2.5).toFixed(2);
    const roi = bestBuy.price > 0 ? ((profit / bestBuy.price) * 100).toFixed(0) : 0;

    return {
      product: p,
      stage,
      confidence,
      daysToNext,
      reason,
      trend: t,
      avgGrowth: avgGrowth.toFixed(1),
      platforms,
      bestBuy,
      bestSell,
      profit,
      roi,
    };
  }

  // ===== RENDER ENGINE =====
  function buildHTML() {
    return `
    <div class="section-inner">
      <div class="lc-hero">
        <div class="lc-hero-badge"><span class="lc-hero-badge-dot"></span> Lifecycle Intelligence</div>
        <h1 class="lc-hero-title">Where Is Each Product?</h1>
        <p class="lc-hero-desc">See exactly where every product stands: Rising, Peak, or Declining. Know when to enter, maximize profit, or exit before it's too late.</p>
      </div>
      <div id="lcSourceBanner" class="lc-source-banner"></div>
      <div id="lcInsights" class="lc-insights"></div>
      <div id="lcSummary" class="lc-summary-row"></div>
      <div id="lcActions" class="lc-actions-row"></div>
      <div class="lc-legend">
        <div class="lc-legend-item"><span class="lc-dot lc-dot-green"></span> Rising — Growing demand, low competition, enter now</div>
        <div class="lc-legend-item"><span class="lc-dot lc-dot-yellow"></span> Peak — Maximum sales, prepare to transition</div>
        <div class="lc-legend-item"><span class="lc-dot lc-dot-red"></span> Declining — Falling demand, exit or pivot</div>
      </div>
      <div id="lcExport" class="lc-export-bar"></div>
      <div id="lcFilter" class="lc-filter-bar"></div>
      <div id="lcGrid" class="lc-grid"></div>
    </div>
    ${window.HuntDrop.renderRelatedTools([
      {
        section: 'section-product-hunt',
        name: 'Product Hunt Scout',
        desc: 'Find new products',
        icon: '🔥',
        color: '#ff8a00',
      },
      {
        section: 'section-market-gaps',
        name: 'Market Gap Finder',
        desc: 'Spot opportunities',
        icon: '🎯',
        color: '#a855f7',
      },
      {
        section: 'section-time-machine',
        name: 'Profit Time Machine',
        desc: 'Forecast by stage',
        icon: '🔮',
        color: '#00e5ff',
      },
      {
        section: 'section-bundles',
        name: 'Bundle Intelligence',
        desc: 'Bundle by lifecycle',
        icon: '📦',
        color: '#00ff88',
      },
    ])}`;
  }

  function renderInsights() {
    const el = UI.$('lcInsights');
    if (!el || !_analyzed.length) return;
    const rising = _analyzed.filter((a) => a.stage === 'Rising');
    const _peak = _analyzed.filter((a) => a.stage === 'Peak');
    const declining = _analyzed.filter((a) => a.stage === 'Declining');
    const _avgConf = Math.round(_analyzed.reduce((s, a) => s + a.confidence, 0) / _analyzed.length);
    const topRiser = rising.sort((a, b) => b.confidence - a.confidence)[0];
    const bestProfit = [..._analyzed].sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit))[0];

    el.innerHTML = `
    <div class="lc-insights-header">
      <span class="lc-insights-badge">✨ AI Insights</span>
      <span class="lc-insights-title">Strategic Recommendations</span>
    </div>
    <div class="lc-insights-grid">
      <div class="lc-insight-card">
        <div class="lc-insight-icon">🎯</div>
        <div class="lc-insight-title">Best Entry Opportunity</div>
        <div class="lc-insight-text">${topRiser ? `<strong>${topRiser.product.title.split('—')[0]}</strong> — ${topRiser.confidence}% confidence, ${topRiser.daysToNext} days before next stage. ${topRiser.product.salesVelocity.toLocaleString()} sales/mo with only ${topRiser.product.marketSaturation}% saturation.` : 'No strong rising products found. Consider broadening your search criteria.'}</div>
      </div>
      <div class="lc-insight-card">
        <div class="lc-insight-icon">💰</div>
        <div class="lc-insight-title">Highest Profit Potential</div>
        <div class="lc-insight-text">${bestProfit ? `<strong>${bestProfit.product.title.split('—')[0]}</strong> — $${bestProfit.profit} profit per sale (${bestProfit.roi}% ROI). Buy from ${cap(bestProfit.bestBuy.name)} at $${bestProfit.bestBuy.price.toFixed(2)}, sell on ${cap(bestProfit.bestSell.name)} at $${bestProfit.bestSell.price.toFixed(2)}.` : 'Calculate profit margins across platforms to find the best arbitrage.'}</div>
      </div>
      <div class="lc-insight-card">
        <div class="lc-insight-icon">⚠️</div>
        <div class="lc-insight-title">Action Required</div>
        <div class="lc-insight-text">${declining.length > 0 ? `<strong>${declining.length} product${declining.length > 1 ? 's' : ''}</strong> in decline stage. ${declining.length > 1 ? 'These products' : 'This product'} should be deprioritized. Consider pivoting to: ${rising.length > 0 ? rising[0].product.title.split('—')[0] : 'a new rising niche'}.` : 'All products are in healthy stages. No immediate action needed.'}</div>
      </div>
    </div>`;
  }

  function renderSourceBanner() {
    const el = UI.$('lcSourceBanner');
    if (!el) return;
    const meta = window.HuntDrop.ALL_PRODUCTS_META || {};
    const count = (_analyzed || []).length;
    if (!meta.query && count === 0) {
      el.innerHTML = `
      <div class="lc-source-empty">
        <span class="lc-source-empty-icon">📊</span>
        <span>No products loaded. Use the <strong>Dashboard search</strong>, <strong>Product Hunt Scout</strong>, or <strong>Niche Radar</strong> first to load products, then return here.</span>
      </div>`;
      return;
    }
    const timeAgo = meta.timestamp ? _getTimeAgo(meta.timestamp) : '';
    el.innerHTML = `
    <div class="lc-source-info">
      <span class="lc-source-icon">🔍</span>
      <span class="lc-source-text">Showing <strong>${count}</strong> product${count !== 1 ? 's' : ''}</span>
      ${meta.query ? `<span class="lc-source-sep">·</span><span class="lc-source-query">"${esc(meta.query)}"</span>` : ''}
      ${meta.source ? `<span class="lc-source-sep">·</span><span class="lc-source-label">from ${esc(meta.source)}</span>` : ''}
      ${timeAgo ? `<span class="lc-source-sep">·</span><span class="lc-source-time">${timeAgo}</span>` : ''}
    </div>`;
  }

  function _getTimeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function renderSummary() {
    const el = UI.$('lcSummary');
    if (!el) return;
    const counts = { Rising: 0, Peak: 0, Declining: 0 };
    _analyzed.forEach((a) => counts[a.stage]++);
    el.innerHTML = Object.entries(counts)
      .map(
        ([stage, count]) => `
    <div class="lc-sum-card lc-sum-${stage.toLowerCase()}" data-stage="${stage}">
      <div class="lc-sum-count">${count}</div>
      <div class="lc-sum-icon">${STAGES[stage].emoji}</div>
      <div class="lc-sum-label">${stage}</div>
      <div class="lc-sum-sub">${STAGES[stage].action}</div>
    </div>`
      )
      .join('');

    el.querySelectorAll('.lc-sum-card').forEach((card) => {
      card.addEventListener('click', () => {
        _activeFilter = _activeFilter === card.dataset.stage ? 'all' : card.dataset.stage;
        renderFilters();
        renderGrid();
      });
    });
  }

  function renderActions() {
    const el = UI.$('lcActions');
    if (!el) return;
    el.innerHTML = Object.entries(ACTIONS)
      .map(
        ([stage, items]) => `
    <div class="lc-action-card">
      <div class="lc-action-header">
        <span class="lc-action-emoji">${STAGES[stage].emoji}</span>
        <span class="lc-action-title" style="color:${STAGES[stage].color}">${stage} Stage</span>
      </div>
      <div class="lc-action-items">
        ${items.map((i) => `<div class="lc-action-item">${i}</div>`).join('')}
      </div>
    </div>`
      )
      .join('');
  }

  function renderExport() {
    const el = UI.$('lcExport');
    if (!el) return;
    el.innerHTML = `
    <div class="lc-export-info">Showing <strong>${getFiltered().length}</strong> of <strong>${_analyzed.length}</strong> products</div>
    <div class="lc-export-btns">
      <button class="lc-export-btn" id="lcExportCsv">📋 Export CSV</button>
      <button class="lc-export-btn" id="lcExportAll">📊 Show All</button>
    </div>`;
    const csvBtn = UI.$('lcExportCsv');
    const allBtn = UI.$('lcExportAll');
    if (csvBtn) csvBtn.addEventListener('click', exportCSV);
    if (allBtn)
      allBtn.addEventListener('click', () => {
        _activeFilter = 'all';
        renderFilters();
        renderGrid();
        renderExport();
      });
  }

  function renderFilters() {
    const el = UI.$('lcFilter');
    if (!el) return;
    const filters = ['all', 'Rising', 'Peak', 'Declining'];
    el.innerHTML = `
    <div class="lc-filters">
      ${filters.map((f) => `<button class="lc-filter ${_activeFilter === f ? 'active' : ''}" data-filter="${f}">${f === 'all' ? 'All Stages' : f}</button>`).join('')}
    </div>
    <div class="lc-sort-group">
      <span class="lc-sort-label">Sort by:</span>
      <select class="lc-sort-select" id="lcSortSelect">
        <option value="confidence" ${_activeSort === 'confidence' ? 'selected' : ''}>Confidence</option>
        <option value="score" ${_activeSort === 'score' ? 'selected' : ''}>Product Score</option>
        <option value="margin" ${_activeSort === 'margin' ? 'selected' : ''}>Margin</option>
        <option value="sales" ${_activeSort === 'sales' ? 'selected' : ''}>Sales Velocity</option>
        <option value="days" ${_activeSort === 'days' ? 'selected' : ''}>Days to Next Stage</option>
        <option value="profit" ${_activeSort === 'profit' ? 'selected' : ''}>Profit Potential</option>
      </select>
    </div>`;

    el.querySelectorAll('.lc-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        _activeFilter = btn.dataset.filter;
        renderFilters();
        renderGrid();
        renderExport();
      });
    });

    const sortSelect = UI.$('lcSortSelect');
    if (sortSelect)
      sortSelect.addEventListener('change', () => {
        _activeSort = sortSelect.value;
        renderGrid();
      });
  }

  function getFiltered() {
    const items = _activeFilter === 'all' ? [..._analyzed] : _analyzed.filter((a) => a.stage === _activeFilter);
    const sorters = {
      confidence: (a, b) => b.confidence - a.confidence,
      score: (a, b) => b.product.score - a.product.score,
      margin: (a, b) => b.product.margin - a.product.margin,
      sales: (a, b) => b.product.salesVelocity - a.product.salesVelocity,
      days: (a, b) => a.daysToNext - b.daysToNext,
      profit: (a, b) => parseFloat(b.profit) - parseFloat(a.profit),
    };
    items.sort(sorters[_activeSort] || sorters.confidence);
    return items;
  }

  function renderGrid() {
    const el = UI.$('lcGrid');
    if (!el) return;
    const items = getFiltered();
    if (!items.length) {
      el.innerHTML = `<div class="lc-empty"><div class="lc-empty-icon">📊</div><div class="lc-empty-text">No products in this stage</div><div class="lc-empty-sub">Try a different filter or search for products first</div></div>`;
      return;
    }

    el.innerHTML = items
      .map((item) => {
        const p = item.product;
        const s = STAGES[item.stage];
        const sparkId = 'lcSpark_' + p.id;
        const seasonData = p.seasonality || [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
        const maxS = Math.max(...seasonData);

        return `
      <div class="lc-card lc-card-${item.stage.toLowerCase()}" data-id="${p.id}">
        <div class="lc-card-top">
          <img src="${esc(p.image)}" alt="" class="lc-card-img">
          <div class="lc-card-info">
            <div class="lc-card-title">${esc(p.title.split('—')[0].trim())}</div>
            <div class="lc-card-meta"><span class="lc-card-meta-dot" style="background:${esc(getPlatColor(p.platform))}"></span>${esc(cap(p.platform))} · ${esc(p.category || 'General')}</div>
          </div>
          <div class="lc-badge" style="background:${esc(s.color)}15;color:${esc(s.color)};border:1px solid ${esc(s.color)}33"><span class="lc-badge-dot"></span>${esc(item.stage)}</div>
        </div>
        <div class="lc-card-conf">
          <div class="lc-conf-row">
            <span class="lc-conf-label">Confidence</span>
            <div class="lc-conf-bar"><div class="lc-conf-fill" style="width:${item.confidence}%;background:${esc(s.color)}"></div></div>
            <span class="lc-conf-val" style="color:${esc(s.color)}">${item.confidence}%</span>
          </div>
          <div class="lc-days-row">
            <span class="lc-days-label">Days to next stage</span>
            <span class="lc-days-val" style="color:${esc(s.color)}">${item.daysToNext} days</span>
          </div>
        </div>
        <div class="lc-card-chart"><canvas id="${sparkId}"></canvas></div>
        <div class="lc-card-metrics">
          <div class="lc-metric"><span class="lc-metric-val" style="color:var(--accent-green)">${item.avgGrowth}%</span><span class="lc-metric-lbl">Growth</span></div>
          <div class="lc-metric"><span class="lc-metric-val">${esc(p.salesVelocity.toLocaleString())}</span><span class="lc-metric-lbl">Sales/mo</span></div>
          <div class="lc-metric"><span class="lc-metric-val" style="color:var(--accent-cyan)">${esc(p.marketSaturation)}%</span><span class="lc-metric-lbl">Saturation</span></div>
          <div class="lc-metric"><span class="lc-metric-val">${esc(p.competition)}</span><span class="lc-metric-lbl">Competition</span></div>
        </div>
        <div class="lc-card-platforms">
          ${item.platforms
            .slice(0, 5)
            .map(
              (pl) =>
                `<span class="lc-plat-chip"><span class="lc-plat-dot" style="background:${pl.color}"></span>${cap(pl.name)} <span class="lc-plat-price">$${pl.price.toFixed(2)}</span></span>`
            )
            .join('')}
        </div>
        <div class="lc-card-season">
          <div class="lc-season-label">Seasonality</div>
          <div class="lc-season-bars">
            ${seasonData.map((v, i) => `<div class="lc-season-bar" style="height:${Math.max(8, (v / maxS) * 100)}%;background:${v === maxS ? 'var(--accent-cyan)' : 'var(--border-primary)'}" title="${MONTHS[i]}: ${v}"></div>`).join('')}
          </div>
        </div>
        <div class="lc-card-audience">
          ${p.audience ? `<span class="lc-aud-chip">👤 ${p.audience.age || 'All'}</span><span class="lc-aud-chip">⚧ ${p.audience.gender || 'All'}</span>` : ''}
          ${(p.audience?.interests || [])
            .slice(0, 3)
            .map((i) => `<span class="lc-aud-chip">🏷 ${i}</span>`)
            .join('')}
        </div>
        <div class="lc-card-reason">${item.reason}</div>
        <div class="lc-card-actions">
          <button class="lc-card-action" data-action="analyze" data-id="${p.id}">🔍 Analyze</button>
          <button class="lc-card-action" data-action="suppliers" data-id="${p.id}">🏭 Suppliers</button>
          <button class="lc-card-action" data-action="adcopy" data-id="${p.id}">🎬 Ad Copy</button>
          <button class="lc-card-action save" data-action="save" data-id="${p.id}">❤️ Save</button>
        </div>
        <div class="lc-card-footer">
          <span class="lc-card-score">Score: ${p.score}/100</span>
          <span class="lc-card-margin">${p.margin}% margin</span>
          <span class="lc-card-sales">$${item.profit} profit · ${item.roi}% ROI</span>
        </div>
      </div>`;
      })
      .join('');

    el.querySelectorAll('.lc-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.lc-card-action')) return;
        EventBus.emit('product:analyze', { id: card.dataset.id });
      });
    });

    el.querySelectorAll('.lc-card-action').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = Number(btn.dataset.id);
        if (action === 'analyze') EventBus.emit('product:analyze', { id });
        else if (action === 'suppliers') navigateTo('section-supplier-hub');
        else if (action === 'adcopy') navigateTo('section-ad-studio');
        else if (action === 'save') {
          btn.textContent = '✓ Saved';
          btn.style.borderColor = 'var(--accent-green)';
          btn.style.color = 'var(--accent-green)';
        }
      });
    });

    setTimeout(() => renderSparklines(items), 50);
  }

  function renderSparklines(items) {
    if (typeof Chart === 'undefined') return;
    if (!items || !_section) return;
    items.forEach((item) => {
      if (!item || !item.product || !item.product.id) return;
      const canvasId = 'lcSpark_' + item.product.id;
      const canvas = _section.querySelector('#' + CSS.escape(canvasId));
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (canvas._chart) {
        try {
          canvas._chart.destroy();
        } catch {
          /* ignored */
        }
      }
      const c = STAGES[item.stage].hex;
      const grad = ctx.createLinearGradient(0, 0, 0, 70);
      grad.addColorStop(0, c + '30');
      grad.addColorStop(1, c + '05');
      canvas._chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: MONTHS,
          datasets: [
            {
              data: item.trend,
              borderColor: c,
              backgroundColor: grad,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
        },
      });
    });
  }

  // ===== HELPER FUNCTIONS =====
  function exportCSV() {
    const items = getFiltered();
    const headers = [
      'Product',
      'Platform',
      'Stage',
      'Confidence',
      'Days to Next',
      'Score',
      'Margin',
      'Sales/mo',
      'Saturation',
      'Competition',
      'Best Buy Price',
      'Best Sell Price',
      'Profit',
      'ROI',
    ];
    const rows = items.map((item) => [
      item.product.title.split('—')[0],
      item.product.platform,
      item.stage,
      item.confidence + '%',
      item.daysToNext,
      item.product.score,
      item.product.margin + '%',
      item.product.salesVelocity,
      item.product.marketSaturation + '%',
      item.product.competition,
      '$' + item.bestBuy.price.toFixed(2),
      '$' + item.bestSell.price.toFixed(2),
      '$' + item.profit,
      item.roi + '%',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lifecycle-analysis.csv';
    a.click();
  }

  // ===== MAIN ANALYSIS =====
  function analyzeAll() {
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    _analyzed = products.map((p) => analyzeProduct(p)).filter(Boolean);
    _analyzed.sort((a, b) => b.confidence - a.confidence);

    renderSourceBanner();
    renderInsights();
    renderSummary();
    renderActions();
    renderExport();
    renderFilters();
    renderGrid();
  }

  // ===== PLUGIN REGISTRATION =====
  const P = {
    id: 'product-lifecycle',
    name: 'Product Life Cycle',
    version: '2.0.0',
    description: 'Complete lifecycle intelligence — stage detection, timing, actions, and export',
    init(_ctx) {
      Config.defaults('lifecycle', { enabled: true });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;
      const section = document.createElement('section');
      section.className = 'section section-product-lifecycle';
      section.id = 'section-lifecycle';
      section.innerHTML = buildHTML();
      container.appendChild(section);
      _section = section;
      analyzeAll();

      _listeners.push(
        EventBus.on('search:results', function () {
          if (_section) analyzeAll();
        })
      );
    },

    unmount(_ctx) {
      _listeners.forEach(function (off) {
        try { off(); } catch { /* ignored */ }
      });
      _listeners = [];
      if (_section) {
        _section.querySelectorAll('canvas').forEach(function (c) {
          if (c._chart) {
            try {
              c._chart.destroy();
            } catch {
              /* ignored */
            }
            c._chart = null;
          }
        });
        _section.remove();
        _section = null;
      }
      _section = null;
    },
  };

  Object.keys(P).forEach((k) => {
    if (typeof P[k] === 'function') P[k] = P[k].bind(P);
  });
  PluginRegistry.register('product-lifecycle', P);
})();
