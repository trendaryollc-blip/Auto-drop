// ============================================================================
// PLUGIN: Cash Flow Command Center — Multi-platform cash flow intelligence
// ============================================================================
(function () {
  try {
    const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;
    const esc = (s) => UI.escapeHtml(String(s || ''));

    let _section = null;
    let _cleanups = [];
    let _data = null;

    const PLATFORMS = [
      {
        id: 'shopify',
        name: 'Shopify',
        icon: '🛍️',
        payoutDelay: 2,
        payoutFreq: 'Daily',
        fees: 2.9,
        fixedFee: 0.3,
        color: '#96bf48',
      },
      {
        id: 'amazon',
        name: 'Amazon',
        icon: '📦',
        payoutDelay: 14,
        payoutFreq: 'Bi-weekly',
        fees: 15,
        fixedFee: 0,
        color: '#ff9900',
      },
      {
        id: 'ebay',
        name: 'eBay',
        icon: '🏷️',
        payoutDelay: 3,
        payoutFreq: 'Daily',
        fees: 13.25,
        fixedFee: 0.3,
        color: '#e53238',
      },
      {
        id: 'tiktok',
        name: 'TikTok Shop',
        icon: '🎵',
        payoutDelay: 7,
        payoutFreq: 'Weekly',
        fees: 5,
        fixedFee: 0,
        color: '#000000',
      },
      {
        id: 'etsy',
        name: 'Etsy',
        icon: '🎨',
        payoutDelay: 3,
        payoutFreq: 'Daily',
        fees: 6.5,
        fixedFee: 0.2,
        color: '#f1641e',
      },
      {
        id: 'temu',
        name: 'Temu',
        icon: '🔥',
        payoutDelay: 14,
        payoutFreq: 'Bi-weekly',
        fees: 0,
        fixedFee: 0,
        color: '#fb7701',
      },
    ];

    const EXPENSE_CATEGORIES = [
      { id: 'ads', name: 'Ad Spend', icon: '📢', color: 'var(--accent-orange)' },
      { id: 'suppliers', name: 'Supplier Payments', icon: '🏭', color: 'var(--accent-cyan)' },
      { id: 'shipping', name: 'Shipping Costs', icon: '🚚', color: 'var(--accent-purple)' },
      { id: 'platform_fees', name: 'Platform Fees', icon: '💳', color: 'var(--accent-yellow)' },
      { id: 'tools', name: 'Tools & Software', icon: '🔧', color: 'var(--accent-green)' },
      { id: 'other', name: 'Other Expenses', icon: '📋', color: 'var(--text-muted)' },
    ];

    function getDefaultData() {
      return {
        cash: 0,
        dailyAdSpend: 0,
        avgOrderValue: 0,
        avgProductCost: 0,
        avgShippingCost: 0,
        ordersPerDay: 0,
        platform: 'shopify',
        supplierPaymentTerms: 'prepaid',
        monthlyFixedCosts: 0,
        platformHoldAmount: 0,
        reinvestPct: 0,
        dailyRevenue: 0,
        dailyCosts: { ads: 0, suppliers: 0, shipping: 0, platform_fees: 0, tools: 0, other: 0 },
        payouts: [],
        supplierPayments: [],
      };
    }

    function getFutureDate(days) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    }

    function getStoredCashFlow() {
      try {
        const s = JSON.parse(localStorage.getItem('hd_cashflow'));
        return s && s.cash ? s : getDefaultData();
      } catch (e) {
        return getDefaultData();
      }
    }
    function saveCashFlow(d) {
      try {
        localStorage.setItem('hd_cashflow', JSON.stringify(d));
      } catch (e) {}
    }

    function generateTimeline(data, days) {
      const timeline = [];
      const now = new Date();
      let runningCash = data.cash;
      for (let i = 0; i < days; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel =
          i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        let income = 0;
        let expenses = 0;
        data.payouts.forEach((p) => {
          if (p.date === dateStr) income += p.amount;
        });
        data.supplierPayments.forEach((s) => {
          if (s.date === dateStr) expenses += s.amount;
        });
        expenses += data.dailyAdSpend;
        expenses += data.ordersPerDay * data.avgShippingCost * 0.3;
        expenses += data.monthlyFixedCosts / 30;
        runningCash = runningCash + income - expenses;
        timeline.push({
          date: dateStr,
          dayLabel,
          dayNum: i,
          income: Math.round(income * 100) / 100,
          expenses: Math.round(expenses * 100) / 100,
          net: Math.round((income - expenses) * 100) / 100,
          cash: Math.round(runningCash * 100) / 100,
          isLow: runningCash < 500,
          isNegative: runningCash < 0,
        });
      }
      return timeline;
    }

    function getStats(timeline) {
      const d = _data;
      const totalInflow = timeline.reduce((s, t) => s + t.income, 0);
      const totalOutflow = timeline.reduce((s, t) => s + t.expenses, 0);
      const dailyExpenses =
        d.dailyAdSpend +
        d.ordersPerDay * d.avgProductCost +
        d.ordersPerDay * d.avgShippingCost +
        d.monthlyFixedCosts / 30;
      const daysOfRunway = dailyExpenses > 0 ? Math.floor(d.cash / dailyExpenses) : 999;
      const pendingPayouts = d.payouts.reduce((s, p) => s + p.amount, 0);
      const healthScore = Math.min(
        100,
        Math.max(
          0,
          (daysOfRunway >= 30 ? 40 : daysOfRunway >= 14 ? 30 : daysOfRunway >= 7 ? 15 : 0) +
            (totalInflow > totalOutflow ? 30 : totalInflow > totalOutflow * 0.8 ? 20 : 5) +
            (d.cash > dailyExpenses * 14 ? 30 : d.cash > dailyExpenses * 7 ? 20 : 5)
        )
      );
      return {
        totalInflow,
        totalOutflow,
        daysOfRunway,
        pendingPayouts,
        payoutCount: d.payouts.length,
        healthScore,
        dailyExpenses,
      };
    }

    function renderTimeline(timeline) {
      const el = UI.$('cfTimeline');
      if (!el) return;
      const maxCash = Math.max(...timeline.map((t) => Math.abs(t.cash)), 1);
      el.innerHTML = `<div class="cf-tl-chart">
    <div class="cf-tl-header">
      <div class="cf-tl-legend"><span class="cf-tl-leg"><span class="cf-tl-dot" style="background:var(--accent-green)"></span>Cash Balance</span>
      <span class="cf-tl-leg"><span class="cf-tl-dot" style="background:var(--accent-cyan)"></span>Income</span>
      <span class="cf-tl-leg"><span class="cf-tl-dot" style="background:var(--accent-red)"></span>Expenses</span></div>
    </div>
    <div class="cf-tl-grid">
      ${timeline
        .slice(0, 14)
        .map((t) => {
          const cashPct = Math.max(2, (Math.abs(t.cash) / maxCash) * 100);
          const barColor = t.isNegative
            ? 'var(--accent-red)'
            : t.isLow
              ? 'var(--accent-yellow)'
              : 'var(--accent-green)';
          return `<div class="cf-tl-day ${t.dayNum === 0 ? 'cf-tl-today' : ''}">
          <div class="cf-tl-day-label">${t.dayLabel}</div>
          <div class="cf-tl-bars">
            ${t.income > 0 ? `<div class="cf-tl-bar cf-tl-income" style="height:${Math.max(4, (t.income / maxCash) * 80)}px" title="Income: $${t.income}"></div>` : ''}
            ${t.expenses > 0 ? `<div class="cf-tl-bar cf-tl-expense" style="height:${Math.max(4, (t.expenses / maxCash) * 80)}px" title="Expenses: $${t.expenses}"></div>` : ''}
          </div>
          <div class="cf-tl-cash" style="color:${barColor}">$${Math.round(t.cash).toLocaleString()}</div>
          ${t.isLow ? '<div class="cf-tl-warning">⚠️</div>' : ''}
        </div>`;
        })
        .join('')}
    </div>
  </div>`;
      el.style.cursor = 'default';
    }

    function renderCalcResults() {
      const el = UI.$('cfCalcResults');
      if (!el) return;
      const d = _data;
      const dailyRevenue = d.ordersPerDay * d.avgOrderValue;
      const dailyProductCost = d.ordersPerDay * d.avgProductCost;
      const dailyShipCost = d.ordersPerDay * d.avgShippingCost;
      const dailyPlatformFees = dailyRevenue * 0.029;
      const dailyTotalCosts =
        d.dailyAdSpend + dailyProductCost + dailyShipCost + dailyPlatformFees + d.monthlyFixedCosts / 30;
      const dailyProfit = dailyRevenue - dailyTotalCosts;
      const monthlyProfit = dailyProfit * 30;
      const breakEvenDays = dailyProfit > 0 ? Math.ceil(d.cash / dailyProfit) : -1;
      const safeAdIncrease = dailyProfit > 0 ? Math.floor(dailyProfit * (d.reinvestPct / 100)) : 0;
      el.innerHTML = `
    <div class="cf-calc-grid-results">
      <div class="cf-calc-item"><span class="cf-calc-label">Daily Revenue</span><span class="cf-calc-val" style="color:var(--accent-green)">$${dailyRevenue.toFixed(2)}</span></div>
      <div class="cf-calc-item"><span class="cf-calc-label">Daily Total Costs</span><span class="cf-calc-val" style="color:var(--accent-red)">$${dailyTotalCosts.toFixed(2)}</span></div>
      <div class="cf-calc-item"><span class="cf-calc-label">Daily Net Profit</span><span class="cf-calc-val" style="color:${dailyProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">$${dailyProfit.toFixed(2)}</span></div>
      <div class="cf-calc-item"><span class="cf-calc-label">Monthly Projected Profit</span><span class="cf-calc-val" style="color:${monthlyProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">$${monthlyProfit.toFixed(0)}</span></div>
      <div class="cf-calc-item"><span class="cf-calc-label">Break-Even Point</span><span class="cf-calc-val">${breakEvenDays > 0 ? breakEvenDays + ' days' : 'Never (negative profit)'}</span></div>
      <div class="cf-calc-item"><span class="cf-calc-label">Safe Ad Budget Increase</span><span class="cf-calc-val" style="color:var(--accent-cyan)">+$${safeAdIncrease}/day</span></div>
    </div>`;
    }

    function renderPayouts() {
      const el = UI.$('cfPayouts');
      if (!el) return;
      const d = _data;
      const sorted = [...d.payouts].sort((a, b) => new Date(a.date) - new Date(b.date));
      el.innerHTML = sorted
        .map((p) => {
          const plat = PLATFORMS.find((x) => x.id === p.platform) || PLATFORMS[0];
          const daysUntil = Math.ceil((new Date(p.date) - new Date()) / (1000 * 60 * 60 * 24));
          return `<div class="cf-payout-card" data-section="section-profit-lab" role="button" tabindex="0" style="cursor:pointer">
      <div class="cf-payout-icon" style="background:${plat.color}20;color:${plat.color}">${plat.icon}</div>
      <div class="cf-payout-info">
        <div class="cf-payout-name">${plat.name}</div>
        <div class="cf-payout-date">${p.date} (${daysUntil <= 0 ? 'Today' : daysUntil + ' days'})</div>
      </div>
      <div class="cf-payout-amount" style="color:var(--accent-green)">+$${p.amount.toLocaleString()}</div>
      <div class="cf-payout-status cf-payout-${p.status}">${p.status}</div>
    </div>`;
        })
        .join('');
    }

    function renderSuppliers() {
      const el = UI.$('cfSuppliers');
      if (!el) return;
      const sorted = [..._data.supplierPayments].sort((a, b) => new Date(a.date) - new Date(b.date));
      el.innerHTML = sorted
        .map((s) => {
          const daysUntil = Math.ceil((new Date(s.date) - new Date()) / (1000 * 60 * 60 * 24));
          const urgent = daysUntil <= 1;
          return `<div class="cf-sup-card ${urgent ? 'cf-sup-urgent' : ''}" data-section="section-supplier-hub" role="button" tabindex="0" style="cursor:pointer">
      <div class="cf-sup-icon">🏭</div>
      <div class="cf-sup-info">
        <div class="cf-sup-name">${esc(s.supplier)}</div>
        <div class="cf-sup-date">${s.date} (${daysUntil <= 0 ? 'Today' : daysUntil + ' days'})</div>
      </div>
      <div class="cf-sup-amount" style="color:var(--accent-red)">-$${s.amount.toLocaleString()}</div>
      <div class="cf-sup-status">${s.status}</div>
    </div>`;
        })
        .join('');
    }

    function renderDelays() {
      const el = UI.$('cfDelays');
      if (!el) return;
      el.innerHTML = `<div class="cf-delay-grid">
    ${PLATFORMS.map(
      (
        p
      ) => `<div class="cf-delay-card" data-section="section-supplier-hub" role="button" tabindex="0" style="cursor:pointer">
      <div class="cf-delay-icon" style="background:${p.color}20;color:${p.color}">${p.icon}</div>
      <div class="cf-delay-name">${p.name}</div>
      <div class="cf-delay-days">${p.payoutDelay} days</div>
      <div class="cf-delay-freq">${p.payoutFreq}</div>
      <div class="cf-delay-fees">${p.fees > 0 ? p.fees + '% fee' : 'No fees'}</div>
      <div class="cf-delay-bar"><div class="cf-delay-fill" style="width:${(p.payoutDelay / 14) * 100}%;background:${p.payoutDelay <= 3 ? 'var(--accent-green)' : p.payoutDelay <= 7 ? 'var(--accent-yellow)' : 'var(--accent-orange)'}"></div></div>
    </div>`
    ).join('')}
  </div>`;
    }

    function renderReinvest() {
      const el = UI.$('cfReinvestPanel');
      if (!el) return;
      const d = _data;
      const dailyRevenue = d.ordersPerDay * d.avgOrderValue;
      const dailyCosts =
        d.dailyAdSpend +
        d.ordersPerDay * d.avgProductCost +
        d.ordersPerDay * d.avgShippingCost +
        d.monthlyFixedCosts / 30;
      const dailyProfit = dailyRevenue - dailyCosts;
      const safeAdBudget = dailyProfit > 0 ? d.dailyAdSpend + (dailyProfit * d.reinvestPct) / 100 : d.dailyAdSpend;
      const maxAdBudget = dailyProfit > 0 ? d.dailyAdSpend + dailyProfit * 0.8 : d.dailyAdSpend;
      el.innerHTML = `
    <div class="cf-reinvest-grid">
      <div class="cf-reinvest-card" data-section="section-budget" role="button" tabindex="0" style="cursor:pointer">
        <div class="cf-reinvest-icon">📊</div>
        <div class="cf-reinvest-label">Current Daily Ad Spend</div>
        <div class="cf-reinvest-val">$${d.dailyAdSpend}</div>
      </div>
      <div class="cf-reinvest-card" data-section="section-profit-lab" role="button" tabindex="0" style="cursor:pointer">
        <div class="cf-reinvest-icon">💰</div>
        <div class="cf-reinvest-label">Daily Net Profit</div>
        <div class="cf-reinvest-val" style="color:${dailyProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">$${dailyProfit.toFixed(2)}</div>
      </div>
      <div class="cf-reinvest-card" data-section="section-budget" role="button" tabindex="0" style="cursor:pointer">
        <div class="cf-reinvest-icon">🎯</div>
        <div class="cf-reinvest-label">Safe Ad Budget (${d.reinvestPct}% reinvest)</div>
        <div class="cf-reinvest-val" style="color:var(--accent-cyan)">$${safeAdBudget.toFixed(0)}/day</div>
      </div>
      <div class="cf-reinvest-card" data-section="section-budget" role="button" tabindex="0" style="cursor:pointer">
        <div class="cf-reinvest-icon">🚀</div>
        <div class="cf-reinvest-label">Max Safe Budget (80% profit)</div>
        <div class="cf-reinvest-val" style="color:var(--accent-orange)">$${maxAdBudget.toFixed(0)}/day</div>
      </div>
    </div>
    <div class="cf-reinvest-verdict">
      ${
        dailyProfit > 0
          ? `✅ You can safely increase ad spend by <strong>$${(safeAdBudget - d.dailyAdSpend).toFixed(0)}/day</strong> without touching operating capital. For aggressive growth, up to <strong>$${(maxAdBudget - d.dailyAdSpend).toFixed(0)}/day</strong> increase is possible.`
          : `⚠️ You're currently losing <strong>$${Math.abs(dailyProfit).toFixed(2)}/day</strong>. Do NOT increase ad spend. Focus on improving conversion rate or reducing costs first.`
      }
    </div>`;
    }

    function renderAlerts(timeline) {
      const el = UI.$('cfAlerts');
      if (!el) return;
      const alerts = [];
      const d = _data;
      const lowDays = timeline.filter((t) => t.isLow || t.isNegative);
      if (lowDays.length > 0) {
        alerts.push({
          icon: '🚨',
          title: 'Cash Crunch Predicted',
          desc: `${lowDays.length} day(s) in the next 2 weeks will have less than $500. Nearest: ${lowDays[0].dayLabel} ($${Math.round(lowDays[0].cash)})`,
          severity: 'high',
          section: 'section-budget',
        });
      }
      const nextPayout = [...d.payouts].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      const nextSupplier = [...d.supplierPayments].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      if (nextPayout && nextSupplier && new Date(nextPayout.date) > new Date(nextSupplier.date)) {
        alerts.push({
          icon: '⚡',
          title: 'Payment Timing Risk',
          desc: `Supplier payment of $${nextSupplier.amount} due ${nextSupplier.date} but next payout ($${nextPayout.amount}) arrives ${nextPayout.date}. Ensure enough cash reserve.`,
          severity: 'medium',
          section: 'section-supplier-hub',
        });
      }
      const dailyExpenses =
        d.dailyAdSpend +
        d.ordersPerDay * d.avgProductCost +
        d.ordersPerDay * d.avgShippingCost +
        d.monthlyFixedCosts / 30;
      if (d.cash < dailyExpenses * 3) {
        alerts.push({
          icon: '⚠️',
          title: 'Low Cash Reserve',
          desc: `Current cash ($${Math.round(d.cash)}) covers only ${Math.floor(d.cash / dailyExpenses)} days of expenses. Aim for 14+ days.`,
          severity: 'medium',
          section: 'section-profit-lab',
        });
      }
      if (dailyExpenses > d.ordersPerDay * d.avgOrderValue) {
        alerts.push({
          icon: '📉',
          title: 'Expenses Exceed Revenue',
          desc: `Daily costs ($${dailyExpenses.toFixed(0)}) exceed daily revenue ($${(d.ordersPerDay * d.avgOrderValue).toFixed(0)}). You're operating at a loss.`,
          severity: 'high',
          section: 'section-profit-lab',
        });
      }
      if (alerts.length === 0) {
        alerts.push({
          icon: '✅',
          title: 'All Clear',
          desc: 'No cash flow concerns detected. Your financial position is healthy.',
          severity: 'low',
          section: 'section-dashboard',
        });
      }
      el.innerHTML = alerts
        .map(
          (a) => `
    <div class="cf-alert-card cf-alert-${a.severity}" data-section="${a.section}" role="button" tabindex="0" style="cursor:pointer">
      <div class="cf-alert-icon">${a.icon}</div>
      <div class="cf-alert-info">
        <div class="cf-alert-title">${a.title}</div>
        <div class="cf-alert-desc">${a.desc}</div>
      </div>
    </div>
  `
        )
        .join('');
    }

    function refreshAll() {
      const timeline = generateTimeline(_data, 30);
      renderTimeline(timeline);
      renderCalcResults();
      renderPayouts();
      renderSuppliers();
      renderDelays();
      renderReinvest();
      renderAlerts(timeline);
    }

    function bindEvents() {
      if (!_section) return;
      ['cfCash', 'cfAds', 'cfAOV', 'cfOrders', 'cfProdCost', 'cfShipCost', 'cfFixed', 'cfReinvest'].forEach((id) => {
        UI.$(id)?.addEventListener('input', () => {
          _data.cash = parseFloat(UI.$('cfCash')?.value) || 0;
          _data.dailyAdSpend = parseFloat(UI.$('cfAds')?.value) || 0;
          _data.avgOrderValue = parseFloat(UI.$('cfAOV')?.value) || 0;
          _data.ordersPerDay = parseFloat(UI.$('cfOrders')?.value) || 0;
          _data.avgProductCost = parseFloat(UI.$('cfProdCost')?.value) || 0;
          _data.avgShippingCost = parseFloat(UI.$('cfShipCost')?.value) || 0;
          _data.monthlyFixedCosts = parseFloat(UI.$('cfFixed')?.value) || 0;
          _data.reinvestPct = parseFloat(UI.$('cfReinvest')?.value) || 0;
          saveCashFlow(_data);
          renderCalcResults();
          renderReinvest();
        });
      });
    }

    PluginRegistry.register('cash-flow', {
      id: 'cash-flow',
      name: 'Cash Flow',
      version: '1.0.0',
      description:
        'Cash flow command center — track platform payouts, supplier payments, working capital, and when you can scale',

      init(_ctx) {
        Config.defaults('cashFlow', {});
        _data = getStoredCashFlow();
      },

      mount(_ctx) {
        const container = UI.$('sections-container');
        if (!container) return;

        const section = document.createElement('section');
        section.className = 'section section-cash-flow';
        section.id = 'section-cash-flow';

        const timeline = generateTimeline(_data, 30);
        const stats = getStats(timeline);
        const d = _data;

        section.innerHTML = `
      <div class="section-inner">
        <div class="cf-hero">
          <div class="cf-hero-bg"></div>
          <div class="cf-hero-content">
            <div class="cf-hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Financial Intelligence
            </div>
            <h1 class="cf-hero-title">Cash Flow Command Center</h1>
            <p class="cf-hero-desc">Know exactly when you'll be cash-positive or negative. Track platform payouts, supplier payments, and working capital across all your stores.</p>
            <div class="cf-hero-kpis">
              <div class="cf-hkpi" data-section="section-cash-flow" role="button" tabindex="0" style="cursor:pointer"><div class="cf-hkpi-val" style="color:${d.cash < 500 ? 'var(--accent-red)' : d.cash < 1500 ? 'var(--accent-yellow)' : 'var(--accent-green)'}">$${Math.round(d.cash).toLocaleString()}</div><div class="cf-hkpi-label">Current Cash</div></div>
              <div class="cf-hkpi" data-section="section-profit-lab" role="button" tabindex="0" style="cursor:pointer"><div class="cf-hkpi-val" style="color:var(--accent-green)">$${Math.round(stats.totalInflow).toLocaleString()}</div><div class="cf-hkpi-label">30-Day Inflow</div></div>
              <div class="cf-hkpi" data-section="section-profit-lab" role="button" tabindex="0" style="cursor:pointer"><div class="cf-hkpi-val" style="color:var(--accent-red)">$${Math.round(stats.totalOutflow).toLocaleString()}</div><div class="cf-hkpi-label">30-Day Outflow</div></div>
              <div class="cf-hkpi" data-section="section-cash-flow" role="button" tabindex="0" style="cursor:pointer"><div class="cf-hkpi-val" style="color:${stats.daysOfRunway < 7 ? 'var(--accent-red)' : stats.daysOfRunway < 21 ? 'var(--accent-yellow)' : 'var(--accent-green)'}">${stats.daysOfRunway}</div><div class="cf-hkpi-label">Days Runway</div></div>
            </div>
          </div>
        </div>

        <div class="cf-section">
          <div class="cf-section-header">
            <h2 class="cf-section-title">📊 Cash Position Overview</h2>
            <p class="cf-section-desc">Your financial health at a glance — current cash, runway, and health score</p>
          </div>
          <div class="cf-overview">
            <div class="cf-ov-card" data-section="section-cash-flow" role="button" tabindex="0" style="cursor:pointer">
              <div class="cf-ov-icon">💵</div>
              <div class="cf-ov-label">Available Cash</div>
              <div class="cf-ov-val" style="color:${d.cash < 500 ? 'var(--accent-red)' : 'var(--accent-green)'}">$${Math.round(d.cash).toLocaleString()}</div>
              <div class="cf-ov-sub">${d.cash < 500 ? '⚠️ Critical — less than 2 days of expenses' : '✅ Adequate operating capital'}</div>
            </div>
            <div class="cf-ov-card" data-section="section-cash-flow" role="button" tabindex="0" style="cursor:pointer">
              <div class="cf-ov-icon">📅</div>
              <div class="cf-ov-label">Days of Runway</div>
              <div class="cf-ov-val" style="color:${stats.daysOfRunway < 7 ? 'var(--accent-red)' : stats.daysOfRunway < 21 ? 'var(--accent-yellow)' : 'var(--accent-green)'}">${stats.daysOfRunway} days</div>
              <div class="cf-ov-sub">${stats.daysOfRunway < 7 ? '🚨 Urgent — scale back ad spend' : stats.daysOfRunway < 21 ? '⚡ Moderate — plan incoming payouts' : '✅ Healthy — room to grow'}</div>
            </div>
            <div class="cf-ov-card" data-section="section-profit-lab" role="button" tabindex="0" style="cursor:pointer">
              <div class="cf-ov-icon">🏦</div>
              <div class="cf-ov-label">Pending Payouts</div>
              <div class="cf-ov-val" style="color:var(--accent-cyan)">$${Math.round(stats.pendingPayouts).toLocaleString()}</div>
              <div class="cf-ov-sub">Expected from ${stats.payoutCount} platform payouts</div>
            </div>
            <div class="cf-ov-card" data-section="section-store-health" role="button" tabindex="0" style="cursor:pointer">
              <div class="cf-ov-icon">📈</div>
              <div class="cf-ov-label">Cash Flow Health</div>
              <div class="cf-ov-val" style="color:${stats.healthScore >= 70 ? 'var(--accent-green)' : stats.healthScore >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)'}">${stats.healthScore}/100</div>
              <div class="cf-ov-sub">${stats.healthScore >= 70 ? '✅ Healthy cash flow management' : stats.healthScore >= 40 ? '⚡ Needs optimization' : '🚨 Cash flow critical'}</div>
            </div>
          </div>
        </div>

        <div class="cf-section">
          <div class="cf-section-header">
            <h2 class="cf-section-title">📅 30-Day Cash Flow Timeline</h2>
            <p class="cf-section-desc">Day-by-day forecast of money in vs money out — see exactly when you'll be cash-positive or negative</p>
          </div>
          <div class="cf-timeline" id="cfTimeline"></div>
        </div>

        <div class="cf-section">
          <div class="cf-section-header">
            <h2 class="cf-section-title">💰 Working Capital Calculator</h2>
            <p class="cf-section-desc">Input your numbers to calculate exactly when you can afford to scale ad spend</p>
          </div>
          <div class="cf-panel">
            <div class="cf-calc-grid">
              <div class="cf-field"><label class="cf-label">Current Cash ($)</label><input id="cfCash" class="cf-input" type="number" min="0" step="100" value="${d.cash}"></div>
              <div class="cf-field"><label class="cf-label">Daily Ad Spend ($)</label><input id="cfAds" class="cf-input" type="number" min="0" step="5" value="${d.dailyAdSpend}"></div>
              <div class="cf-field"><label class="cf-label">Avg Order Value ($)</label><input id="cfAOV" class="cf-input" type="number" min="0" step="0.01" value="${d.avgOrderValue}"></div>
              <div class="cf-field"><label class="cf-label">Orders per Day</label><input id="cfOrders" class="cf-input" type="number" min="0" step="1" value="${d.ordersPerDay}"></div>
              <div class="cf-field"><label class="cf-label">Avg Product Cost ($)</label><input id="cfProdCost" class="cf-input" type="number" min="0" step="0.01" value="${d.avgProductCost}"></div>
              <div class="cf-field"><label class="cf-label">Avg Shipping Cost ($)</label><input id="cfShipCost" class="cf-input" type="number" min="0" step="0.01" value="${d.avgShippingCost}"></div>
              <div class="cf-field"><label class="cf-label">Monthly Fixed Costs ($)</label><input id="cfFixed" class="cf-input" type="number" min="0" step="10" value="${d.monthlyFixedCosts}"></div>
              <div class="cf-field"><label class="cf-label">Reinvest % of Profit</label><input id="cfReinvest" class="cf-input" type="number" min="0" max="100" step="5" value="${d.reinvestPct}"></div>
            </div>
            <div class="cf-calc-results" id="cfCalcResults"></div>
          </div>
        </div>

        <div class="cf-section">
          <div class="cf-section-header">
            <h2 class="cf-section-title">📥 Upcoming Platform Payouts</h2>
            <p class="cf-section-desc">When your money arrives from each platform — track holds and expected dates</p>
          </div>
          <div class="cf-payouts" id="cfPayouts"></div>
        </div>

        <div class="cf-section">
          <div class="cf-section-header">
            <h2 class="cf-section-title">📤 Upcoming Supplier Payments</h2>
            <p class="cf-section-desc">When you need to pay suppliers — plan cash reserves accordingly</p>
          </div>
          <div class="cf-suppliers" id="cfSuppliers"></div>
        </div>

        <div class="cf-section">
          <div class="cf-section-header">
            <h2 class="cf-section-title">🏦 Platform Payment Delays</h2>
            <p class="cf-section-desc">How long each platform holds your money — optimize your payout mix</p>
          </div>
          <div class="cf-delays" id="cfDelays"></div>
        </div>

        <div class="cf-section">
          <div class="cf-section-header">
            <h2 class="cf-section-title">🎯 Reinvestment Optimizer</h2>
            <p class="cf-section-desc">How much can you safely reinvest in ads right now without going broke?</p>
          </div>
          <div class="cf-reinvest" id="cfReinvestPanel"></div>
        </div>

        <div class="cf-section">
          <div class="cf-section-header">
            <h2 class="cf-section-title">⚠️ Cash Flow Alerts</h2>
            <p class="cf-section-desc">Proactive warnings about upcoming cash crunches and opportunities</p>
          </div>
          <div class="cf-alerts" id="cfAlerts"></div>
        </div>

        ${
          window.HuntDrop.renderRelatedTools
            ? window.HuntDrop.renderRelatedTools([
                {
                  section: 'section-profit-lab',
                  name: 'Profit Calculator',
                  desc: 'Per-unit profit margins with all costs',
                  icon: '💰',
                  color: 'var(--accent-green)',
                },
                {
                  section: 'section-budget',
                  name: 'Budget Planner',
                  desc: 'Allocate ad spend with cash constraints',
                  icon: '💳',
                  color: 'var(--accent-purple)',
                },
                {
                  section: 'section-order-tracker',
                  name: 'Order Tracker',
                  desc: 'Track orders generating revenue',
                  icon: '📦',
                  color: 'var(--accent-cyan)',
                },
                {
                  section: 'section-shipping-calc',
                  name: 'Shipping Calculator',
                  desc: 'Optimize shipping costs per order',
                  icon: '🚚',
                  color: 'var(--accent-yellow)',
                },
                {
                  section: 'section-refund-shield',
                  name: 'Refund Shield',
                  desc: 'Refund losses affect cash position',
                  icon: '🛡',
                  color: 'var(--accent-red)',
                },
              ])
            : ''
        }
      </div>`;
        container.appendChild(section);
        _section = section;
        bindEvents();
        renderTimeline(timeline);
        renderCalcResults();
        renderPayouts();
        renderSuppliers();
        renderDelays();
        renderReinvest();
        renderAlerts(timeline);

        section.addEventListener('click', (e) => {
          const card = e.target.closest('[data-section]');
          if (!card) return;
          e.preventDefault();
          const target = card.getAttribute('data-section');
          if (target && window.HuntDrop && window.HuntDrop.navigateTo) {
            window.HuntDrop.navigateTo(target);
          }
        });

        section.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            const card = e.target.closest('[data-section]');
            if (card) {
              e.preventDefault();
              card.click();
            }
          }
        });
      },

      unmount(_ctx) {
        (_cleanups || []).forEach((fn) => {
          try {
            fn();
          } catch (e) {}
        });
        _cleanups = [];
        const el = UI.$('section-cash-flow');
        if (el) el.remove();
        _section = null;
      },
    });
    Object.defineProperty(window.HuntDrop.PluginRegistry.get('cash-flow'), '_section', {
      get() {
        return _section;
      },
      set(v) {
        _section = v;
      },
      configurable: true,
    });
  } catch (e) {
    console.error('[CashFlow] error:', e);
  }
})();
