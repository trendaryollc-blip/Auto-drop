// ============================================================================
// PLUGIN: Ad Budget AI Allocator
// ============================================================================
(function () {
  const { PluginRegistry, UI, Config } = window.HuntDrop;

  let _chart = null;
  let _platformChart = null;
  let _section = null;

  function getPlatformAllocation(product, amount) {
    let platforms;
    if (product.competition === 'low') {
      platforms = [
        { name: 'TikTok', pct: 40, color: '#00f2ea' },
        { name: 'Facebook', pct: 35, color: '#1877f2' },
        { name: 'Instagram', pct: 25, color: '#e4405f' },
      ];
    } else if (product.competition === 'medium') {
      platforms = [
        { name: 'Facebook', pct: 45, color: '#1877f2' },
        { name: 'TikTok', pct: 30, color: '#00f2ea' },
        { name: 'Google', pct: 25, color: '#4285f4' },
      ];
    } else {
      platforms = [
        { name: 'Google', pct: 40, color: '#4285f4' },
        { name: 'Facebook', pct: 35, color: '#1877f2' },
        { name: 'Retargeting', pct: 25, color: '#a855f7' },
      ];
    }
    return platforms.map((p) => ({
      name: p.name,
      pct: p.pct,
      color: p.color,
      amount: Math.round((amount * p.pct) / 100),
    }));
  }

  function getSignal(item) {
    const p = item.product;
    if (p.score >= 90 && p.competition === 'low' && p.marketSaturation < 40) return 'SCALE NOW';
    if (p.score < 80 || p.competition === 'high' || p.marketSaturation > 65) return 'PAUSE';
    return 'TEST NEW AUDIENCE';
  }

  function exportCSV(allocations, budget) {
    let csv =
      'Product,Allocation,%,Daily Budget,Weekly Budget,AI Score,Signal,Est. ROI,CPA,Monthly Sales,Monthly Revenue,Monthly Profit\n';
    allocations.forEach(function (a) {
      csv +=
        '"' +
        a.product.title.split('—')[0].trim() +
        '",$' +
        a.amount.toLocaleString() +
        ',' +
        a.pct +
        '%,$' +
        a.dailyBudget +
        ',$' +
        a.weeklyBudget +
        ',' +
        a.aiScore +
        ',' +
        a.signal +
        ',' +
        a.expectedROI +
        '%,$' +
        a.cpa.toFixed(2) +
        ',' +
        a.expectedSales +
        ',$' +
        Math.round(a.expectedRevenue).toLocaleString() +
        ',$' +
        Math.round(a.expectedProfit).toLocaleString() +
        '\n';
    });
    const totalProfit = allocations.reduce(function (s, a) {
      return s + a.expectedProfit;
    }, 0);
    csv += '---,---,---,---,---,---,---,---,---,---,---,---\n';
    csv +=
      'TOTAL,$' +
      budget.toLocaleString() +
      ',100%,$' +
      Math.round(budget / 30) +
      ',$' +
      Math.round(budget / 4) +
      ',---,---,---,---,---,---,$' +
      Math.round(totalProfit).toLocaleString() +
      '\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget-allocation.csv';
    a.click();
    URL.revokeObjectURL(url);
    if (window.HuntDrop.UI) window.HuntDrop.UI.toast('Budget allocation exported!', 'success', 2000);
  }

  function renderCharts(allocations, platformTotals) {
    const canvas = _section ? _section.querySelector('#baChart') : null;
    if (!canvas) return;
    if (_chart) _chart.destroy();
    const colors = [
      'rgba(0,229,255,0.7)',
      'rgba(0,255,136,0.7)',
      'rgba(255,138,0,0.7)',
      'rgba(168,85,247,0.7)',
      'rgba(236,72,153,0.7)',
      'rgba(255,51,102,0.7)',
      'rgba(251,191,36,0.7)',
      'rgba(99,102,241,0.7)',
      'rgba(14,165,233,0.7)',
      'rgba(132,204,22,0.7)',
    ];
    _chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: allocations.map((a) => a.product.title.split('—')[0].trim()),
        datasets: [
          {
            data: allocations.map((a) => a.amount),
            backgroundColor: colors.slice(0, allocations.length),
            borderColor: '#06060c',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#8888a4', font: { family: 'Inter', size: 11 }, padding: 10, usePointStyle: true },
          },
        },
      },
    });

    const platCanvas = _section ? _section.querySelector('#baPlatformChart') : null;
    if (!platCanvas) return;
    if (_platformChart) _platformChart.destroy();
    const platNames = Object.keys(platformTotals);
    const platColors = platNames.map((n) => {
      if (n === 'Facebook') return '#1877f2';
      if (n === 'TikTok') return '#00f2ea';
      if (n === 'Google') return '#4285f4';
      if (n === 'Instagram') return '#e4405f';
      if (n === 'Retargeting') return '#a855f7';
      return '#888';
    });
    _platformChart = new Chart(platCanvas, {
      type: 'bar',
      data: {
        labels: platNames,
        datasets: [
          {
            data: platNames.map((n) => platformTotals[n]),
            backgroundColor: platColors.map((c) => c + 'cc'),
            borderColor: platColors,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => '$' + c.parsed.x.toLocaleString() } },
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8888a4', callback: (v) => '$' + v } },
          y: { grid: { display: false }, ticks: { color: '#8888a4', font: { size: 12 } } },
        },
      },
    });
  }

  const AdBudgetAllocatorPlugin = {
    id: 'ad-budget-allocator',
    name: 'Budget Planner',
    version: '2.0.0',
    description: 'AI-powered budget allocation with ROI projections and scaling signals',

    init(_ctx) {
      Config.defaults('budget', { defaultAmount: 1000 });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;
      const section = document.createElement('section');
      section.className = 'section section-ad-budget-allocator';
      section.id = 'section-budget';
      section.innerHTML = `
      <div class="section-inner">
        <div class="aba-hero">
          <div class="aba-hero-badge"><span class="aba-hero-badge-dot"></span>Budget Intelligence</div>
          <h1 class="aba-hero-title">Ad Budget AI Allocator</h1>
          <p class="aba-hero-desc">Drop your monthly budget, and AI splits it across your best products for maximum ROI. Know exactly where every dollar goes.</p>
        </div>

        <div class="aba-features">
          <div class="aba-feat"><div class="aba-feat-icon aba-feat-cyan">🎯</div><div class="aba-feat-text">Smart Allocation</div></div>
          <div class="aba-feat"><div class="aba-feat-icon aba-feat-green">📈</div><div class="aba-feat-text">ROI Projections</div></div>
          <div class="aba-feat"><div class="aba-feat-icon aba-feat-orange">⚡</div><div class="aba-feat-text">Scaling Signals</div></div>
          <div class="aba-feat"><div class="aba-feat-icon aba-feat-purple">🗓️</div><div class="aba-feat-text">Weekly Spend Plan</div></div>
        </div>

        <div class="aba-input-card">
          <div class="aba-input-row">
            <div class="aba-presets">
              <span class="aba-preset-label">Quick budgets:</span>
              <button class="aba-preset-btn" data-budget="300">$300</button>
              <button class="aba-preset-btn" data-budget="500">$500</button>
              <button class="aba-preset-btn" data-budget="1000">$1,000</button>
              <button class="aba-preset-btn" data-budget="2000">$2,000</button>
              <button class="aba-preset-btn" data-budget="5000">$5,000</button>
            </div>
            <div class="aba-budget-input-wrap">
              <div class="aba-budget-icon">$</div>
              <input type="number" id="budgetInput" class="aba-budget-input" value="1000" min="50">
              <span class="aba-budget-suffix">/month</span>
            </div>
            <button id="budgetAllocBtn" class="aba-allocate-btn">Allocate Budget</button>
          </div>
        </div>

        <div id="budgetResults" class="ba-results"></div>

        ${window.HuntDrop.renderRelatedTools([
          {
            section: 'section-ad-studio',
            name: 'Ad Studio',
            desc: 'Create ad creatives',
            icon: '🎯',
            color: '#f59e0b',
          },
          { section: 'section-profit-lab', name: 'Profit Calculator', desc: 'Track ROI', icon: '💰', color: '#00ff88' },
        ])}
      </div>`;
      container.appendChild(section);
      _section = section;
      const btn = section.querySelector('#budgetAllocBtn');
      const input = section.querySelector('#budgetInput');
      if (btn) btn.addEventListener('click', () => allocate());
      if (input)
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') allocate();
        });
      section.querySelectorAll('.aba-preset-btn').forEach((b) => {
        b.addEventListener('click', () => {
          input.value = b.dataset.budget;
          allocate();
        });
      });
      allocate();
    },

    unmount(_ctx) {
      if (_chart) {
        _chart.destroy();
        _chart = null;
      }
      if (_platformChart) {
        _platformChart.destroy();
        _platformChart = null;
      }
      if (_section) {
        _section.remove();
        _section = null;
      }
    },

    allocate() {
      allocate();
    },
  };

  function allocate() {
    const input = _section ? _section.querySelector('#budgetInput') : null;
    let budget = parseFloat(input ? input.value : 1000) || 1000;
    if (budget < 50) budget = 50;
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    if (products.length === 0) return;
    const el = _section ? _section.querySelector('#budgetResults') : null;
    if (!el) return;

    const scored = products
      .map((p) => {
        const score =
          p.score * 0.3 + (p.margin / 100) * 100 * 0.25 + (100 - p.marketSaturation) * 0.25 + p.demand * 0.2;
        const cpa = p.cpaAvg || 4;
        return { product: p, aiScore: Math.round(score), cpa };
      })
      .sort((a, b) => b.aiScore - a.aiScore);

    const totalScore = scored.reduce((s, item) => s + item.aiScore, 0);
    const allocations = scored.map((item) => {
      const pct = item.aiScore / totalScore;
      const amount = Math.round(budget * pct);
      const expectedSales = amount > 0 ? Math.round(amount / item.cpa) : 0;
      const expectedRevenue = expectedSales * item.product.price;
      const expectedProfit = expectedRevenue * (item.product.margin / 100);
      const platforms = getPlatformAllocation(item.product, amount);
      const signal = getSignal(item);
      const weeklyBudget = Math.round(amount / 4);
      const dailyBudget = Math.round(amount / 30);
      return {
        product: item.product,
        amount,
        pct: (pct * 100).toFixed(1),
        platforms,
        signal,
        expectedROI: expectedRevenue > 0 ? ((expectedProfit / amount) * 100).toFixed(0) : 0,
        aiScore: item.aiScore,
        dailyBudget,
        weeklyBudget,
        expectedSales,
        expectedRevenue,
        expectedProfit,
        cpa: item.cpa,
      };
    });

    const avgROI = allocations.reduce((s, a) => s + parseInt(a.expectedROI), 0) / allocations.length;
    const totalExpectedProfit = allocations.reduce((s, a) => s + a.expectedProfit, 0);
    const totalExpectedSales = allocations.reduce((s, a) => s + a.expectedSales, 0);
    const totalExpectedRevenue = allocations.reduce((s, a) => s + a.expectedRevenue, 0);

    const platformTotals = {};
    allocations.forEach((a) => {
      a.platforms.forEach((p) => {
        platformTotals[p.name] = (platformTotals[p.name] || 0) + p.amount;
      });
    });

    el.innerHTML = `
      <div class="aba-output">
        <div class="aba-hero-grid">
          <div class="aba-hero-card aba-hero-budget">
            <div class="aba-hc-icon">💵</div>
            <div class="aba-hc-label">Monthly Budget</div>
            <div class="aba-hc-value" style="color:var(--accent-cyan)">$${budget.toLocaleString()}</div>
            <div class="aba-hc-sub">$${Math.round(budget / 30)}/day · $${Math.round(budget / 4)}/week</div>
          </div>
          <div class="aba-hero-card">
            <div class="aba-hc-icon">📦</div>
            <div class="aba-hc-label">Products to Run</div>
            <div class="aba-hc-value">${allocations.length}</div>
            <div class="aba-hc-sub">AI-selected from ${products.length} products</div>
          </div>
          <div class="aba-hero-card">
            <div class="aba-hc-icon">🎯</div>
            <div class="aba-hc-label">Projected ROI</div>
            <div class="aba-hc-value" style="color:${avgROI >= 100 ? 'var(--accent-green)' : avgROI >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'}">${avgROI.toFixed(0)}%</div>
            <div class="aba-hc-sub">avg across all products</div>
          </div>
          <div class="aba-hero-card">
            <div class="aba-hc-icon">💰</div>
            <div class="aba-hc-label">Expected Monthly Profit</div>
            <div class="aba-hc-value" style="color:var(--accent-green)">$${Math.round(totalExpectedProfit).toLocaleString()}</div>
            <div class="aba-hc-sub">from ${totalExpectedSales.toLocaleString()} sales</div>
          </div>
        </div>

        <div class="aba-charts-row">
          <div class="aba-chart-card">
            <h4 class="aba-card-title">Budget Split by Product</h4>
            <div class="aba-chart-wrap"><canvas id="baChart"></canvas></div>
          </div>
          <div class="aba-chart-card">
            <h4 class="aba-card-title">Platform Allocation</h4>
            <div class="aba-chart-wrap"><canvas id="baPlatformChart"></canvas></div>
          </div>
        </div>

        <div class="aba-weekly-card">
          <h4 class="aba-card-title">🗓️ 4-Week Spend Plan</h4>
          <div class="aba-weekly-grid">
            ${[1, 2, 3, 4]
              .map(
                (w) => `
              <div class="aba-week">
                <div class="aba-week-label">Week ${w}</div>
                <div class="aba-week-budget">$${allocations.reduce((s, a) => s + a.weeklyBudget, 0).toLocaleString()}</div>
                <div class="aba-week-split">
                  ${allocations
                    .slice(0, 3)
                    .map(
                      (a) =>
                        `<div class="aba-week-item"><span class="aba-week-dot" style="background:${a.signal === 'SCALE NOW' ? 'var(--accent-green)' : a.signal === 'PAUSE' ? 'var(--accent-red)' : 'var(--accent-orange)'}"></span>${a.product.title.split('—')[0].trim().substring(0, 15)}: $${a.weeklyBudget}</div>`
                    )
                    .join('')}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="aba-allocation-grid">
          ${allocations
            .map((a, i) => {
              const signalClass =
                a.signal === 'SCALE NOW'
                  ? 'aba-signal-scale'
                  : a.signal === 'PAUSE'
                    ? 'aba-signal-pause'
                    : 'aba-signal-test';
              return `<div class="aba-alloc-card">
              <div class="aba-alloc-header">
                <div class="aba-alloc-rank">#${i + 1}</div>
                <img src="${a.product.image}" alt="" class="aba-alloc-img">
                <div class="aba-alloc-info">
                  <div class="aba-alloc-title">${a.product.title.split('—')[0].trim()}</div>
                  <div class="aba-alloc-meta">${a.product.platform} · ${a.product.category}</div>
                </div>
                <div class="aba-alloc-amount">
                  <div class="aba-alloc-price">$${a.amount.toLocaleString()}</div>
                  <div class="aba-alloc-pct">${a.pct}%</div>
                </div>
              </div>
              <div class="aba-alloc-body">
                <div class="aba-signal-badge ${signalClass}">${a.signal}</div>
                <div class="aba-alloc-stats">
                  <div class="aba-alloc-stat"><div class="aba-stat-val">$${a.dailyBudget}/day</div><div class="aba-stat-lbl">Daily</div></div>
                  <div class="aba-alloc-stat"><div class="aba-stat-val" style="color:var(--accent-green)">${a.expectedROI}%</div><div class="aba-stat-lbl">Est. ROI</div></div>
                  <div class="aba-alloc-stat"><div class="aba-stat-val" style="color:var(--accent-cyan)">${a.aiScore}</div><div class="aba-stat-lbl">AI Score</div></div>
                  <div class="aba-alloc-stat"><div class="aba-stat-val">$${a.cpa.toFixed(2)}</div><div class="aba-stat-lbl">CPA</div></div>
                  <div class="aba-alloc-stat"><div class="aba-stat-val">${a.expectedSales}</div><div class="aba-stat-lbl">Sales/mo</div></div>
                  <div class="aba-alloc-stat"><div class="aba-stat-val" style="color:var(--accent-green)">$${Math.round(a.expectedRevenue).toLocaleString()}</div><div class="aba-stat-lbl">Revenue</div></div>
                </div>
                <div class="aba-platform-split">
                  ${a.platforms.map((p) => `<div class="aba-plat-row"><span class="aba-plat-name">${p.name}</span><div class="aba-plat-bar-wrap"><div class="aba-plat-bar" style="width:${p.pct}%;background:${p.color}"></div></div><span class="aba-plat-pct">${p.pct}%</span><span class="aba-plat-amt">$${p.amount}</span></div>`).join('')}
                </div>
              </div>
            </div>`;
            })
            .join('')}
        </div>

        <div class="aba-recommend-card">
          <h4 class="aba-card-title">AI Recommendations</h4>
          <div class="aba-rec-grid">
            ${
              allocations.filter((a) => a.signal === 'SCALE NOW').length > 0
                ? `
            <div class="aba-rec-item aba-rec-green">
              <div class="aba-rec-icon">&#128640;</div>
              <div><div class="aba-rec-title">Scale These Products</div><div class="abc-rec-desc">${allocations
                .filter((a) => a.signal === 'SCALE NOW')
                .map((a) => a.product.title.split('—')[0].trim())
                .join(', ')} — high score, low competition. Increase budget 20-30% weekly.</div></div>
            </div>`
                : ''
            }
            ${
              allocations.filter((a) => a.signal === 'PAUSE').length > 0
                ? `
            <div class="aba-rec-item aba-rec-red">
              <div class="aba-rec-icon">&#9208;&#65039;</div>
              <div><div class="aba-rec-title">Pause or Re-evaluate</div><div class="abc-rec-desc">${allocations
                .filter((a) => a.signal === 'PAUSE')
                .map((a) => a.product.title.split('—')[0].trim())
                .join(', ')} — high competition or low score. Cut spend and test new creatives.</div></div>
            </div>`
                : ''
            }
            <div class="aba-rec-item aba-rec-cyan">
              <div class="aba-rec-icon">&#128202;</div>
              <div><div class="aba-rec-title">Overall Strategy</div><div class="abc-rec-desc">Budget of $${budget.toLocaleString()}/mo split across ${allocations.length} products. Expected $${Math.round(totalExpectedRevenue).toLocaleString()} revenue at ${avgROI.toFixed(0)}% ROI. Re-allocate weekly based on performance.</div></div>
            </div>
            <div class="aba-rec-item aba-rec-orange">
              <div class="aba-rec-icon">&#9888;&#65039;</div>
              <div><div class="aba-rec-title">Risk Note</div><div class="abc-rec-desc">Never allocate more than 30% of budget to a single product. Diversify across ${allocations.length} products to reduce risk. Keep $${Math.round(budget * 0.1).toLocaleString()} reserve for scaling winners.</div></div>
            </div>
          </div>
        </div>

        <button id="budgetExportCSV" style="margin-top:16px;padding:10px 20px;background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-md);color:var(--text-secondary);font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.2s">&#128190; Export Allocation to CSV</button>
      </div>`;

    setTimeout(() => {
      renderCharts(allocations, platformTotals);
    }, 100);

    // CSV Export
    const exportBtn = el.querySelector('#budgetExportCSV');
    if (exportBtn)
      exportBtn.addEventListener('click', function () {
        exportCSV(allocations, budget);
      });
  }

  PluginRegistry.register('ad-budget-allocator', AdBudgetAllocatorPlugin);
})();
