// ============================================================================
// PLUGIN: Profit Calculator Lab — Redesigned
// ============================================================================
(function () {
  const { PluginRegistry, UI, Config } = window.HuntDrop;

  const plugin = {
    id: 'profit-calculator',
    name: 'Profit Calculator',
    version: '3.0.0',
    description: 'Real-time profit margin calculator with powerful visuals',
    _section: null,
    _chart: null,
    _barChart: null,
    _gaugeInterval: null,

    init(_ctx) {
      Config.defaults('profitcalc', { defaultSellPrice: 29.99, defaultCost: 5.99 });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section section-profit-lab';
      section.id = 'section-profit-lab';
      section.innerHTML = `
      <div class="section-inner">
        <div class="pcl-hero">
          <div class="pcl-hero-badge">
            <span class="pcl-hero-badge-dot"></span>
            Financial Intelligence
          </div>
          <h1 class="pcl-hero-title">Profit Calculator Lab</h1>
          <p class="pcl-hero-desc">Plug in your numbers, see your profit instantly. Know exactly what you'll make before you spend a single dollar on ads.</p>
        </div>

        <div class="pcl-presets">
          <span class="pcl-preset-label">Quick presets:</span>
          <button class="pcl-preset-btn" data-sp="19.99" data-cost="3.50" data-ship="2.00" data-fee="15" data-ad="2.50">Budget Item</button>
          <button class="pcl-preset-btn" data-sp="39.99" data-cost="7.00" data-ship="3.00" data-fee="15" data-ad="4.00">Mid-Range</button>
          <button class="pcl-preset-btn active" data-sp="69.99" data-cost="12.00" data-ship="4.50" data-fee="15" data-ad="6.00">Premium</button>
          <button class="pcl-preset-btn" data-sp="99.99" data-cost="18.00" data-ship="5.00" data-fee="15" data-ad="8.00">High-Ticket</button>
        </div>

        <div class="pcl-kpi-strip">
          <div class="pcl-kpi-card pcl-kpi-profit">
            <div class="pcl-kpi-glow"></div>
            <div class="pcl-kpi-header">
              <span class="pcl-kpi-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </span>
              Profit Per Sale
            </div>
            <div class="pcl-kpi-value" id="pcBigProfit">$0.00</div>
            <div class="pcl-kpi-sub" id="pcBigMargin">0% margin</div>
            <div class="pcl-kpi-bar"><div class="pcl-kpi-bar-fill" id="pcMarginBar" style="width:0%"></div></div>
          </div>
          <div class="pcl-kpi-card pcl-kpi-revenue">
            <div class="pcl-kpi-glow"></div>
            <div class="pcl-kpi-header">
              <span class="pcl-kpi-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </span>
              Monthly Revenue
            </div>
            <div class="pcl-kpi-value" id="pcMonthlyRevenue">$0</div>
            <div class="pcl-kpi-sub" id="pcRevenueSub">0 sales projected</div>
          </div>
          <div class="pcl-kpi-card pcl-kpi-monthly">
            <div class="pcl-kpi-glow"></div>
            <div class="pcl-kpi-header">
              <span class="pcl-kpi-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </span>
              Monthly Profit
            </div>
            <div class="pcl-kpi-value" id="pcMonthlyProfit">$0</div>
            <div class="pcl-kpi-sub" id="pcProfitSub">after all costs</div>
          </div>
          <div class="pcl-kpi-card pcl-kpi-roas">
            <div class="pcl-kpi-glow"></div>
            <div class="pcl-kpi-header">
              <span class="pcl-kpi-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
              </span>
              ROAS
            </div>
            <div class="pcl-kpi-value" id="pcROAS">0x</div>
            <div class="pcl-kpi-sub" id="pcRoasSub">return on ad spend</div>
          </div>
          <div class="pcl-kpi-card pcl-kpi-breakeven">
            <div class="pcl-kpi-glow"></div>
            <div class="pcl-kpi-header">
              <span class="pcl-kpi-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </span>
              Break-Even Sales
            </div>
            <div class="pcl-kpi-value" id="pcBreakEven">0</div>
            <div class="pcl-kpi-sub" id="pcBeSub">to cover ad budget</div>
          </div>
        </div>

        <div class="pcl-layout">
          <div class="pcl-inputs">
            <div class="pcl-input-card">
              <div class="pcl-input-card-header">
                <h3 class="pcl-card-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                  Cost Breakdown
                </h3>
              </div>

              <div class="pcl-field">
                <div class="pcl-field-icon">$</div>
                <div class="pcl-field-wrap">
                  <label>Selling Price</label>
                  <input type="number" id="pcSellPrice" class="pcl-input" value="69.99" step="0.01">
                </div>
              </div>

              <div class="pcl-field">
                <div class="pcl-field-icon pcl-field-red">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                </div>
                <div class="pcl-field-wrap">
                  <label>Product Cost</label>
                  <input type="number" id="pcProductCost" class="pcl-input" value="12.00" step="0.01">
                </div>
              </div>

              <div class="pcl-field">
                <div class="pcl-field-icon pcl-field-orange">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
                <div class="pcl-field-wrap">
                  <label>Shipping Cost</label>
                  <input type="number" id="pcShipping" class="pcl-input" value="4.50" step="0.01">
                </div>
              </div>

              <div class="pcl-field">
                <div class="pcl-field-icon pcl-field-purple">%</div>
                <div class="pcl-field-wrap">
                  <label>Platform Fee</label>
                  <input type="number" id="pcPlatformFee" class="pcl-input" value="15" step="0.1">
                </div>
              </div>

              <div class="pcl-field">
                <div class="pcl-field-icon pcl-field-cyan">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </div>
                <div class="pcl-field-wrap">
                  <label>Ad Cost per Sale</label>
                  <input type="number" id="pcAdCost" class="pcl-input" value="6.00" step="0.01">
                </div>
              </div>

              <div class="pcl-divider"></div>
              <h3 class="pcl-card-title" style="margin-top:4px">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                Monthly Projections
              </h3>

              <div class="pcl-field">
                <div class="pcl-field-icon pcl-field-yellow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <div class="pcl-field-wrap">
                  <label>Monthly Ad Budget</label>
                  <input type="number" id="pcAdBudget" class="pcl-input" value="500" step="1">
                </div>
              </div>

              <div class="pcl-field">
                <div class="pcl-field-icon pcl-field-green">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <div class="pcl-field-wrap">
                  <label>Est. Monthly Sales</label>
                  <input type="number" id="pcMonthlySales" class="pcl-input" value="100" step="1">
                </div>
              </div>
            </div>
          </div>

          <div class="pcl-results">
            <div class="pcl-charts-row">
              <div class="pcl-chart-card">
                <div class="pcl-chart-header">
                  <h4 class="pcl-chart-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                    Cost Breakdown
                  </h4>
                </div>
                <div class="pcl-chart-wrap"><canvas id="pcDonutChart"></canvas></div>
              </div>
              <div class="pcl-chart-card">
                <div class="pcl-chart-header">
                  <h4 class="pcl-chart-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    Cost per Dollar
                  </h4>
                </div>
                <div class="pcl-chart-wrap pcl-chart-bar"><canvas id="pcBarChart"></canvas></div>
              </div>
            </div>

            <div class="pcl-scenarios">
              <div class="pcl-scenarios-header">
                <h4 class="pcl-chart-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  Profit at Different Sales Volumes
                </h4>
              </div>
              <div class="pcl-scenario-grid">
                <div class="pcl-scenario" id="pcSc10"><div class="pcl-sc-num">10</div><div class="pcl-sc-label">sales/mo</div><div class="pcl-sc-profit" id="pcSc10p">$0</div><div class="pcl-sc-bar"><div class="pcl-sc-bar-fill" id="pcSc10b"></div></div></div>
                <div class="pcl-scenario" id="pcSc50"><div class="pcl-sc-num">50</div><div class="pcl-sc-label">sales/mo</div><div class="pcl-sc-profit" id="pcSc50p">$0</div><div class="pcl-sc-bar"><div class="pcl-sc-bar-fill" id="pcSc50b"></div></div></div>
                <div class="pcl-scenario" id="pcSc100"><div class="pcl-sc-num">100</div><div class="pcl-sc-label">sales/mo</div><div class="pcl-sc-profit" id="pcSc100p">$0</div><div class="pcl-sc-bar"><div class="pcl-sc-bar-fill" id="pcSc100b"></div></div></div>
                <div class="pcl-scenario" id="pcSc250"><div class="pcl-sc-num">250</div><div class="pcl-sc-label">sales/mo</div><div class="pcl-sc-profit" id="pcSc250p">$0</div><div class="pcl-sc-bar"><div class="pcl-sc-bar-fill" id="pcSc250b"></div></div></div>
                <div class="pcl-scenario" id="pcSc500"><div class="pcl-sc-num">500</div><div class="pcl-sc-label">sales/mo</div><div class="pcl-sc-profit" id="pcSc500p">$0</div><div class="pcl-sc-bar"><div class="pcl-sc-bar-fill" id="pcSc500b"></div></div></div>
                <div class="pcl-scenario" id="pcSc1000"><div class="pcl-sc-num">1000</div><div class="pcl-sc-label">sales/mo</div><div class="pcl-sc-profit" id="pcSc1000p">$0</div><div class="pcl-sc-bar"><div class="pcl-sc-bar-fill" id="pcSc1000b"></div></div></div>
              </div>
            </div>

            <div class="pcl-insights">
              <div class="pcl-insights-header">
                <h4 class="pcl-chart-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Smart Insights
                </h4>
                <span class="pcl-insights-badge" id="pcInsightBadge">Calculating...</span>
              </div>
              <div class="pcl-insight-cards">
                <div class="pcl-insight-card" id="pcInsightCard1">
                  <div class="pcl-insight-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <div class="pcl-insight-text" id="pcInsight1">Enter your numbers to see insights</div>
                </div>
                <div class="pcl-insight-card" id="pcInsightCard2">
                  <div class="pcl-insight-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div class="pcl-insight-text" id="pcInsight2">Tips will appear here</div>
                </div>
                <div class="pcl-insight-card" id="pcInsightCard3">
                  <div class="pcl-insight-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                  </div>
                  <div class="pcl-insight-text" id="pcInsight3">Optimization suggestions loading</div>
                </div>
              </div>
            </div>

            <div class="pcl-export-row">
              <button class="pcl-export-btn" id="pcExportCSV">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export to CSV
              </button>
              <button class="pcl-export-btn pcl-reset-btn" id="pcResetBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Reset Values
              </button>
            </div>
          </div>
        </div>

        <div class="pcl-linked-tools">
          <div class="pcl-linked-header">
            <h3 class="pcl-linked-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Related Tools
            </h3>
            <span class="pcl-linked-sub">Deepen your analysis with these connected tools</span>
          </div>
          <div class="pcl-linked-grid">
            <a href="#" class="pcl-linked-card" data-section="elasticity">
              <div class="pcl-linked-icon pcl-li-cyan">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div class="pcl-linked-info">
                <div class="pcl-linked-name">Price Elasticity</div>
                <div class="pcl-linked-desc">Find the optimal price point for maximum profit</div>
              </div>
              <div class="pcl-linked-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </a>
            <a href="#" class="pcl-linked-card" data-section="time-machine">
              <div class="pcl-linked-icon pcl-li-orange">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div class="pcl-linked-info">
                <div class="pcl-linked-name">Profit Time Machine</div>
                <div class="pcl-linked-desc">Forecast revenue and profit over the next 12 months</div>
              </div>
              <div class="pcl-linked-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </a>
            <a href="#" class="pcl-linked-card" data-section="bundles">
              <div class="pcl-linked-icon pcl-li-purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div class="pcl-linked-info">
                <div class="pcl-linked-name">Bundle Intelligence</div>
                <div class="pcl-linked-desc">Create product bundles to increase average order value</div>
              </div>
              <div class="pcl-linked-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </a>
            <a href="#" class="pcl-linked-card" data-section="budget">
              <div class="pcl-linked-icon pcl-li-pink">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <div class="pcl-linked-info">
                <div class="pcl-linked-name">Ad Budget Allocator</div>
                <div class="pcl-linked-desc">AI-powered ad spend allocation with ROI projections</div>
              </div>
              <div class="pcl-linked-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </a>
            <a href="#" class="pcl-linked-card" data-section="simulator">
              <div class="pcl-linked-icon pcl-li-green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg>
              </div>
              <div class="pcl-linked-info">
                <div class="pcl-linked-name">Business Simulator</div>
                <div class="pcl-linked-desc">Simulate different business scenarios and outcomes</div>
              </div>
              <div class="pcl-linked-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </a>
            <a href="#" class="pcl-linked-card" data-section="supplier-hub">
              <div class="pcl-linked-icon pcl-li-red">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div class="pcl-linked-info">
                <div class="pcl-linked-name">Find Suppliers</div>
                <div class="pcl-linked-desc">Search verified suppliers across all platforms</div>
              </div>
              <div class="pcl-linked-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </a>
          </div>
        </div>

        ${window.HuntDrop.renderRelatedTools([
          {
            section: 'section-budget',
            name: 'Ad Budget Allocator',
            desc: 'Allocate ad spend',
            icon: '📊',
            color: '#a855f7',
          },
        ])}
      </div>`;
      container.appendChild(section);
      plugin._section = section;

      const ids = [
        'pcSellPrice',
        'pcProductCost',
        'pcShipping',
        'pcPlatformFee',
        'pcAdCost',
        'pcAdBudget',
        'pcMonthlySales',
      ];
      ids.forEach((id) => {
        const el = section.querySelector('#' + id);
        if (el)
          el.addEventListener('input', () => {
            plugin.calculate();
            plugin.saveState();
          });
      });

      plugin.loadState();

      section.querySelectorAll('.pcl-preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          section.querySelectorAll('.pcl-preset-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const q = (id) => section.querySelector('#' + id);
          if (q('pcSellPrice')) q('pcSellPrice').value = btn.dataset.sp;
          if (q('pcProductCost')) q('pcProductCost').value = btn.dataset.cost;
          if (q('pcShipping')) q('pcShipping').value = btn.dataset.ship;
          if (q('pcPlatformFee')) q('pcPlatformFee').value = btn.dataset.fee;
          if (q('pcAdCost')) q('pcAdCost').value = btn.dataset.ad;
          plugin.calculate();
        });
      });

      plugin.calculate();

      const exportBtn = section.querySelector('#pcExportCSV');
      if (exportBtn)
        exportBtn.addEventListener('click', function () {
          plugin.exportCSV();
        });
      const resetBtn = section.querySelector('#pcResetBtn');
      if (resetBtn)
        resetBtn.addEventListener('click', function () {
          const q = function (id) {
            return plugin._section.querySelector('#' + id);
          };
          if (q('pcSellPrice')) q('pcSellPrice').value = '29.99';
          if (q('pcProductCost')) q('pcProductCost').value = '5.99';
          if (q('pcShipping')) q('pcShipping').value = '2.50';
          if (q('pcPlatformFee')) q('pcPlatformFee').value = '15';
          if (q('pcAdCost')) q('pcAdCost').value = '3.00';
          if (q('pcAdBudget')) q('pcAdBudget').value = '500';
          if (q('pcMonthlySales')) q('pcMonthlySales').value = '100';
          section.querySelectorAll('.pcl-preset-btn').forEach(function (b) {
            b.classList.remove('active');
          });
          plugin.calculate();
          plugin.saveState();
        });

      section.querySelectorAll('.pcl-linked-card').forEach(function (card) {
        card.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          const sec = card.getAttribute('data-section');
          if (sec && window.HuntDrop.navigateTo) {
            window.HuntDrop.navigateTo('section-' + sec);
          }
        });
      });
    },

    unmount(_ctx) {
      if (plugin._chart) {
        plugin._chart.destroy();
        plugin._chart = null;
      }
      if (plugin._barChart) {
        plugin._barChart.destroy();
        plugin._barChart = null;
      }
      if (plugin._section) {
        plugin._section.remove();
        plugin._section = null;
      }
    },

    saveState() {
      try {
        const state = {};
        [
          'pcSellPrice',
          'pcProductCost',
          'pcShipping',
          'pcPlatformFee',
          'pcAdCost',
          'pcAdBudget',
          'pcMonthlySales',
        ].forEach(function (id) {
          const el = document.getElementById(id);
          if (el) state[id] = el.value;
        });
        localStorage.setItem('huntdrop_profitcalc', JSON.stringify(state));
      } catch {
        /* ignored */
      }
    },

    loadState() {
      try {
        const saved = localStorage.getItem('huntdrop_profitcalc');
        if (!saved || !plugin._section) return;
        const state = JSON.parse(saved);
        Object.keys(state).forEach(function (id) {
          const el = document.getElementById(id);
          if (el) el.value = state[id];
        });
        plugin.calculate();
      } catch {
        /* ignored */
      }
    },

    animateValue(el, start, end, duration, prefix, suffix) {
      prefix = prefix || '';
      suffix = suffix || '';
      let startTs = null;
      function step(ts) {
        if (!startTs) startTs = ts;
        const p = Math.min((ts - startTs) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const current = start + (end - start) * ease;
        el.textContent =
          prefix + current.toLocaleString(undefined, { maximumFractionDigits: prefix === '$' ? 2 : 1 }) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    },

    calculate() {
      if (!plugin._section) return;
      const q = function (id) {
        return plugin._section.querySelector('#' + id);
      };

      const sp = parseFloat(q('pcSellPrice')?.value) || 0;
      const cost = parseFloat(q('pcProductCost')?.value) || 0;
      const ship = parseFloat(q('pcShipping')?.value) || 0;
      const fee = parseFloat(q('pcPlatformFee')?.value) || 0;
      const adCost = parseFloat(q('pcAdCost')?.value) || 0;
      const budget = parseFloat(q('pcAdBudget')?.value) || 0;
      const sales = parseInt(q('pcMonthlySales')?.value) || 0;

      const platformFee = sp * (fee / 100);
      const totalCost = cost + ship + platformFee + adCost;
      const profitPerSale = sp - totalCost;
      const margin = sp > 0 ? (profitPerSale / sp) * 100 : 0;
      const monthlyRev = sp * sales;
      const monthlyProfit = profitPerSale * sales;
      const roas = adCost > 0 ? sp / adCost : 0;
      const breakEven = profitPerSale > 0 ? Math.ceil(budget / profitPerSale) : Infinity;

      const bigProfit = q('pcBigProfit');
      const bigMargin = q('pcBigMargin');
      const marginBar = q('pcMarginBar');
      if (bigProfit) {
        bigProfit.textContent = '$' + profitPerSale.toFixed(2);
        bigProfit.className = 'pcl-kpi-value ' + (profitPerSale >= 0 ? 'pcl-val-green' : 'pcl-val-red');
      }
      if (bigMargin) {
        bigMargin.textContent = margin.toFixed(1) + '% margin';
        bigMargin.className =
          'pcl-kpi-sub ' + (margin >= 30 ? 'pcl-sub-green' : margin >= 15 ? 'pcl-sub-yellow' : 'pcl-sub-red');
      }
      if (marginBar) {
        const barW = Math.max(0, Math.min(100, margin));
        marginBar.style.width = barW + '%';
        marginBar.className =
          'pcl-kpi-bar-fill ' + (margin >= 30 ? 'pcl-bar-green' : margin >= 15 ? 'pcl-bar-yellow' : 'pcl-bar-red');
      }

      const setVal = function (id, val, cls) {
        const el = q(id);
        if (el) {
          el.textContent = val;
          if (cls) el.className = 'pcl-kpi-value ' + cls;
        }
      };
      setVal(
        'pcMonthlyRevenue',
        '$' + monthlyRev.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        'pcl-val-cyan'
      );
      setVal(
        'pcMonthlyProfit',
        '$' + monthlyProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        monthlyProfit >= 0 ? 'pcl-val-green' : 'pcl-val-red'
      );
      setVal(
        'pcROAS',
        roas.toFixed(1) + 'x',
        roas >= 3 ? 'pcl-val-green' : roas >= 2 ? 'pcl-val-yellow' : 'pcl-val-red'
      );
      setVal(
        'pcBreakEven',
        breakEven === Infinity ? '\u221E' : breakEven.toLocaleString(),
        breakEven <= sales ? 'pcl-val-green' : 'pcl-val-orange'
      );

      const revSub = q('pcRevenueSub');
      if (revSub) revSub.textContent = sales + ' sales projected';
      const profitSub = q('pcProfitSub');
      if (profitSub) profitSub.textContent = monthlyProfit >= 0 ? 'after all costs' : 'net loss projected';
      const roasSub = q('pcRoasSub');
      if (roasSub) {
        if (roas >= 3) roasSub.textContent = 'excellent return';
        else if (roas >= 2) roasSub.textContent = 'good return';
        else roasSub.textContent = 'needs improvement';
      }
      const beSub = q('pcBeSub');
      if (beSub) beSub.textContent = breakEven <= sales ? 'within your target' : 'above your target';

      const scenarios = [10, 50, 100, 250, 500, 1000];
      let maxScProfit = 0;
      const profits = scenarios.map(function (s) {
        return profitPerSale * s;
      });
      profits.forEach(function (p) {
        if (p > maxScProfit) maxScProfit = p;
      });
      if (maxScProfit === 0) maxScProfit = 1;

      scenarios.forEach(function (s, i) {
        const p = profits[i];
        const el = q('pcSc' + s + 'p');
        const card = q('pcSc' + s);
        const barFill = q('pcSc' + s + 'b');
        if (el) el.textContent = '$' + p.toLocaleString(undefined, { maximumFractionDigits: 0 });
        if (card) {
          card.className = 'pcl-scenario ' + (p >= 0 ? 'pcl-sc-positive' : 'pcl-sc-negative');
        }
        if (barFill) {
          const bw = Math.max(0, (Math.abs(p) / maxScProfit) * 100);
          barFill.style.width = bw + '%';
          barFill.className = 'pcl-sc-bar-fill ' + (p >= 0 ? 'pcl-sc-fill-green' : 'pcl-sc-fill-red');
        }
      });

      plugin.updateInsights(margin, roas, profitPerSale, breakEven, sales, adCost, budget);

      plugin.renderDonut(cost, ship, platformFee, adCost, profitPerSale);
      plugin.renderBar(cost, ship, platformFee, adCost, profitPerSale, sp);
    },

    updateInsights(margin, roas, profit, breakEven, sales, _adCost, _budget) {
      const badge = plugin._section.querySelector('#pcInsightBadge');
      const insight1 = plugin._section.querySelector('#pcInsight1');
      const insight2 = plugin._section.querySelector('#pcInsight2');
      const insight3 = plugin._section.querySelector('#pcInsight3');
      const card1 = plugin._section.querySelector('#pcInsightCard1');
      const card2 = plugin._section.querySelector('#pcInsightCard2');
      const card3 = plugin._section.querySelector('#pcInsightCard3');

      if (badge) {
        if (margin >= 30) badge.textContent = 'Healthy Margins';
        else if (margin >= 15) badge.textContent = 'Moderate Margins';
        else if (margin > 0) badge.textContent = 'Low Margins';
        else badge.textContent = 'Negative Margin';
        badge.className =
          'pcl-insights-badge ' +
          (margin >= 30 ? 'pcl-badge-green' : margin >= 15 ? 'pcl-badge-yellow' : 'pcl-badge-red');
      }

      if (insight1 && card1) {
        if (margin >= 50) {
          insight1.textContent =
            'Excellent margin! You keep $' +
            profit.toFixed(2) +
            ' of every $' +
            (profit / (margin / 100)).toFixed(0) +
            ' earned. This is above the 30% e-commerce benchmark.';
          card1.className = 'pcl-insight-card pcl-ic-green';
        } else if (margin >= 30) {
          insight1.textContent =
            'Solid margin at ' +
            margin.toFixed(1) +
            '%. Industry average is 20-30%. Consider raising price or cutting costs to reach 50%+ for scaling.';
          card1.className = 'pcl-insight-card pcl-ic-cyan';
        } else if (margin > 0) {
          insight1.textContent =
            'Margin is thin at ' +
            margin.toFixed(1) +
            "%. You're only keeping $" +
            profit.toFixed(2) +
            ' per sale. Increase price or reduce ad cost per sale.';
          card1.className = 'pcl-insight-card pcl-ic-orange';
        } else {
          insight1.textContent =
            "WARNING: You're losing $" +
            Math.abs(profit).toFixed(2) +
            ' per sale! Fix pricing or costs before running ads.';
          card1.className = 'pcl-insight-card pcl-ic-red';
        }
      }

      if (insight2 && card2) {
        if (roas >= 4) {
          insight2.textContent =
            'ROAS of ' +
            roas.toFixed(1) +
            'x is exceptional. Each ad dollar returns $' +
            roas.toFixed(2) +
            '. Scale budget aggressively while maintaining efficiency.';
          card2.className = 'pcl-insight-card pcl-ic-green';
        } else if (roas >= 2.5) {
          insight2.textContent =
            'ROAS of ' +
            roas.toFixed(1) +
            'x is profitable. Test new audiences and creatives to push toward 4x+ for aggressive scaling.';
          card2.className = 'pcl-insight-card pcl-ic-cyan';
        } else if (roas >= 1.5) {
          insight2.textContent =
            'ROAS of ' +
            roas.toFixed(1) +
            'x is break-even territory. Optimize targeting, test new creatives, or reduce product cost to improve.';
          card2.className = 'pcl-insight-card pcl-ic-orange';
        } else {
          insight2.textContent =
            'ROAS of ' +
            roas.toFixed(1) +
            'x is unprofitable. You spend $' +
            (1 / roas).toFixed(2) +
            ' in ads to earn $1 in revenue. Fix before scaling.';
          card2.className = 'pcl-insight-card pcl-ic-red';
        }
      }

      if (insight3 && card3) {
        if (breakEven <= sales) {
          insight3.textContent =
            'Break-even at ' +
            breakEven +
            ' sales is well within your ' +
            sales +
            ' target. You have ' +
            (sales - breakEven) +
            ' sales of pure profit headroom.';
          card3.className = 'pcl-insight-card pcl-ic-green';
        } else if (breakEven <= sales * 1.5) {
          insight3.textContent =
            'Break-even at ' +
            breakEven +
            ' sales is close to your ' +
            sales +
            ' target. Push for more volume or cut costs to widen the safety margin.';
          card3.className = 'pcl-insight-card pcl-ic-yellow';
        } else {
          insight3.textContent =
            'Break-even at ' +
            breakEven +
            ' sales exceeds your ' +
            sales +
            ' target. You need ' +
            (breakEven - sales) +
            ' more sales to become profitable.';
          card3.className = 'pcl-insight-card pcl-ic-red';
        }
      }
    },

    renderDonut(cost, ship, platformFee, adCost, profit) {
      const ctx = plugin._section ? plugin._section.querySelector('#pcDonutChart') : null;
      if (!ctx) return;
      if (plugin._chart) plugin._chart.destroy();
      plugin._chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Product Cost', 'Shipping', 'Platform Fee', 'Ad Cost', 'Net Profit'],
          datasets: [
            {
              data: [cost, ship, platformFee, adCost, Math.max(profit, 0)],
              backgroundColor: [
                'rgba(255,51,102,0.8)',
                'rgba(255,138,0,0.8)',
                'rgba(168,85,247,0.8)',
                'rgba(0,229,255,0.8)',
                'rgba(0,255,136,0.8)',
              ],
              borderColor: ['#ff3366', '#ff8a00', '#a855f7', '#00e5ff', '#00ff88'],
              borderWidth: 2,
              hoverOffset: 8,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#8888a4',
                font: { family: 'Inter', size: 11 },
                padding: 14,
                usePointStyle: true,
                pointStyleWidth: 8,
              },
            },
            tooltip: {
              backgroundColor: '#111119',
              titleColor: '#f0f0f8',
              bodyColor: '#8888a4',
              borderColor: '#2a2a3d',
              borderWidth: 1,
              cornerRadius: 8,
              padding: 12,
              callbacks: {
                label: function (c) {
                  return c.label + ': $' + c.raw.toFixed(2);
                },
              },
            },
          },
          animation: { animateRotate: true, duration: 800 },
        },
      });
    },

    renderBar(cost, ship, platformFee, adCost, profit, sp) {
      const ctx = plugin._section ? plugin._section.querySelector('#pcBarChart') : null;
      if (!ctx) return;
      if (plugin._barChart) plugin._barChart.destroy();
      const total = sp || 1;
      plugin._barChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Product', 'Shipping', 'Platform', 'Ads', 'Profit'],
          datasets: [
            {
              data: [
                (cost / total) * 100,
                (ship / total) * 100,
                (platformFee / total) * 100,
                (adCost / total) * 100,
                (Math.max(profit, 0) / total) * 100,
              ],
              backgroundColor: [
                'rgba(255,51,102,0.75)',
                'rgba(255,138,0,0.75)',
                'rgba(168,85,247,0.75)',
                'rgba(0,229,255,0.75)',
                'rgba(0,255,136,0.75)',
              ],
              borderColor: ['#ff3366', '#ff8a00', '#a855f7', '#00e5ff', '#00ff88'],
              borderWidth: 1,
              borderRadius: 6,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: {
              max: 100,
              grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
              ticks: {
                color: '#555570',
                callback: function (v) {
                  return v + '%';
                },
              },
            },
            y: { grid: { display: false }, ticks: { color: '#8888a4', font: { family: 'Inter', size: 11 } } },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111119',
              titleColor: '#f0f0f8',
              bodyColor: '#8888a4',
              borderColor: '#2a2a3d',
              borderWidth: 1,
              cornerRadius: 8,
              padding: 12,
              callbacks: {
                label: function (c) {
                  return c.raw.toFixed(1) + '% of selling price';
                },
              },
            },
          },
          animation: { duration: 600 },
        },
      });
    },

    exportCSV() {
      if (!plugin._section) return;
      const q = function (id) {
        return document.getElementById(id);
      };
      const sp = parseFloat(q('pcSellPrice')?.value) || 0;
      const cost = parseFloat(q('pcProductCost')?.value) || 0;
      const ship = parseFloat(q('pcShipping')?.value) || 0;
      const fee = parseFloat(q('pcPlatformFee')?.value) || 0;
      const adCost = parseFloat(q('pcAdCost')?.value) || 0;
      const budget = parseFloat(q('pcAdBudget')?.value) || 0;
      const sales = parseInt(q('pcMonthlySales')?.value) || 0;
      const platformFee = sp * (fee / 100);
      const totalCost = cost + ship + platformFee + adCost;
      const profitPerSale = sp - totalCost;
      const margin = sp > 0 ? (profitPerSale / sp) * 100 : 0;

      let csv = 'Metric,Value\n';
      csv += 'Selling Price,$' + sp.toFixed(2) + '\n';
      csv += 'Product Cost,$' + cost.toFixed(2) + '\n';
      csv += 'Shipping Cost,$' + ship.toFixed(2) + '\n';
      csv += 'Platform Fee,' + fee + '%\n';
      csv += 'Ad Cost per Sale,$' + adCost.toFixed(2) + '\n';
      csv += 'Monthly Ad Budget,$' + budget + '\n';
      csv += 'Est. Monthly Sales,' + sales + '\n';
      csv += '---,---\n';
      csv += 'Profit Per Sale,$' + profitPerSale.toFixed(2) + '\n';
      csv += 'Margin,' + margin.toFixed(1) + '%\n';
      csv += 'Monthly Revenue,$' + (sp * sales).toFixed(0) + '\n';
      csv += 'Monthly Profit,$' + (profitPerSale * sales).toFixed(0) + '\n';
      csv += 'ROAS,' + (adCost > 0 ? (sp / adCost).toFixed(1) + 'x' : 'N/A') + '\n';
      csv += '---,---\n';
      csv += 'Sales/Month,Monthly Profit\n';
      [10, 50, 100, 250, 500, 1000].forEach(function (s) {
        csv += s + ',$' + (profitPerSale * s).toFixed(0) + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'profit-analysis.csv';
      a.click();
      URL.revokeObjectURL(url);
      if (window.HuntDrop.UI) window.HuntDrop.UI.toast('CSV exported successfully!', 'success', 2000);
    },
  };

  // Expose for testing
  window.HuntDrop.ProfitCalc = plugin;
  PluginRegistry.register('profit-calculator', plugin);
})();
