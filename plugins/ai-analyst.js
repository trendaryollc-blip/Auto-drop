// ============================================================================
// PLUGIN: AI Product Analyst — Deep Product Intelligence
// ============================================================================
(function () {
  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;

  let _cleanups = [];
  let _section = null;
  let _trendChart = null;
  let _seasonChart = null;

  function switchTab(panelId) {
    if (!_section) return;
    _section.querySelectorAll('.aa-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === panelId));
    _section.querySelectorAll('.aa-tab-panel').forEach((p) => p.classList.toggle('active', p.id === panelId));
  }

  const AIAnalystPlugin = {
    id: 'ai-analyst',
    name: 'AI Analysis',
    version: '2.0.0',
    description: 'Deep AI-powered product analysis with tabs for profit, market, competition, ads, and keywords',
    dependencies: ['search-engine'],

    init(_ctx) {
      Config.defaults('aianalyst', { enabled: true });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section section-ai-analyst';
      section.id = 'section-ai-analyst';
      section.innerHTML = `
      <div class="section-inner">
        <div class="aa-hero">
          <div class="aa-hero-badge">AI-Powered</div>
          <h1 class="aa-hero-title">Product Intelligence Engine</h1>
          <p class="aa-hero-desc">Get instant deep analysis on any product — market demand, competition, profit potential, trending data, and supplier recommendations.</p>
        </div>

        <div class="aa-features">
          <div class="aa-feature-card">
            <div class="aa-feature-icon" style="background:rgba(0,229,255,0.1);color:var(--accent-cyan)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20.66 6A10 10 0 0 0 12 2v10h10a10 10 0 0 0-1.34-6z"/></svg>
            </div>
            <div class="aa-feature-title">Market Analysis</div>
            <div class="aa-feature-desc">Demand, saturation & risk scores</div>
          </div>
          <div class="aa-feature-card">
            <div class="aa-feature-icon" style="background:rgba(0,255,136,0.1);color:var(--accent-green)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="aa-feature-title">Profit Breakdown</div>
            <div class="aa-feature-desc">Cost, margins & revenue per sale</div>
          </div>
          <div class="aa-feature-card">
            <div class="aa-feature-icon" style="background:rgba(168,85,247,0.1);color:var(--accent-purple)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div class="aa-feature-title">Trend Data</div>
            <div class="aa-feature-desc">12-month sales & seasonality</div>
          </div>
          <div class="aa-feature-card">
            <div class="aa-feature-icon" style="background:rgba(251,191,36,0.1);color:var(--accent-orange)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div class="aa-feature-title">Audience Targeting</div>
            <div class="aa-feature-desc">Who buys & where to advertise</div>
          </div>
        </div>

        <div class="aa-search-box">
          <div class="aa-search-inner">
            <svg class="aa-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="aiInput" placeholder="Try: galaxy projector, pet fountain, posture corrector..." class="aa-search-input" autocomplete="off">
            <button id="aiAnalyzeBtn" class="aa-search-btn">
              <span class="aa-btn-text">Analyze</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </div>

        <div class="aa-suggestions">
          <span class="aa-suggestion-label">Quick analysis:</span>
          <button class="aa-chip" data-query="galaxy projector">Galaxy Projector</button>
          <button class="aa-chip" data-query="pet fountain">Pet Fountain</button>
          <button class="aa-chip" data-query="posture corrector">Posture Corrector</button>
          <button class="aa-chip" data-query="wireless earbuds">Wireless Earbuds</button>
          <button class="aa-chip" data-query="drone camera">Drone Camera</button>
          <button class="aa-chip" data-query="eyelash curler">Eyelash Curler</button>
        </div>

        <div id="aiResults" class="aa-results"></div>

        ${window.HuntDrop.renderRelatedTools([
          {
            section: 'section-market-gaps',
            name: 'Market Gap Finder',
            desc: 'Find unmet demand',
            icon: '🔍',
            color: '#10b981',
          },
          {
            section: 'section-lifecycle',
            name: 'Product Lifecycle Radar',
            desc: 'Track product maturity',
            icon: '📡',
            color: '#6366f1',
          },
          {
            section: 'section-battlefield',
            name: 'Competitor Battlefield',
            desc: 'Map competitor landscape',
            icon: '⚔️',
            color: '#f43f5e',
          },
          {
            section: 'section-ad-studio',
            name: 'Ad Studio',
            desc: 'Generate ad creatives',
            icon: '🎯',
            color: '#f59e0b',
          },
        ])}
      </div>
    `;
      container.appendChild(section);
      _section = section;

      const btn = section.querySelector('#aiAnalyzeBtn');
      const input = section.querySelector('#aiInput');
      if (btn) btn.addEventListener('click', () => runAnalysis(input?.value || ''));
      if (input)
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') runAnalysis(input.value);
        });

      section.querySelectorAll('.aa-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const q = chip.dataset.query;
          if (input) input.value = q;
          runAnalysis(q);
        });
      });

      const c = [];
      c.push(
        EventBus.on('ai-analyst:run', (data) => {
          if (data && data.query) runAnalysis(data.query);
        })
      );
      _cleanups = c;
    },

    unmount(_ctx) {
      if (_trendChart) {
        _trendChart.destroy();
        _trendChart = null;
      }
      if (_seasonChart) {
        _seasonChart.destroy();
        _seasonChart = null;
      }
      if (_section) {
        _section.remove();
        _section = null;
      }
      (_cleanups || []).forEach(function (fn) {
        try {
          fn();
        } catch {
          /* ignored */
        }
      });
      _cleanups = [];
    },

    async runAnalysis(query) {
      if (!query.trim()) return;
      const esc = (s) => UI.escapeHtml(String(s));
      const resultsEl = _section ? _section.querySelector('#aiResults') : null;
      if (resultsEl) {
        resultsEl.innerHTML =
          '<div class="aa-loading"><div class="aa-loading-spinner"></div><div class="aa-loading-text">Analyzing product...</div><div class="aa-loading-sub">Scanning platforms, suppliers, and market data</div></div>';
      }
      await new Promise((r) => setTimeout(r, 600));
      const products = window.HuntDrop.ALL_PRODUCTS || [];
      const match =
        products.find(
          (p) =>
            p.title.toLowerCase().includes(query.toLowerCase()) ||
            p.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase()))
        ) || products[Math.floor(Math.random() * products.length)];

      const el = _section ? _section.querySelector('#aiResults') : null;
      if (!el) return;

      el.innerHTML =
        '<div class="aa-loading"><div class="aa-loading-spinner"></div><div class="aa-loading-text">Analyzing ' +
        esc(match.title.split('—')[0].trim()) +
        '...</div><div class="aa-loading-sub">Deep-scanning market data, trends, suppliers, and competition</div></div>';
      await new Promise((r) => setTimeout(r, 1200));

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fmtN = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n));
      const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

      const sellPrice = match.platformPrices.amazon;
      const productCost = match.price;
      const shippingCost = 2.5;
      const adCost = match.adSpendAvg;
      const platformFee = +(sellPrice * 0.15).toFixed(2);
      const refundBuffer = +(sellPrice * 0.03).toFixed(2);
      const netProfit = +(sellPrice - productCost - shippingCost - adCost - platformFee - refundBuffer).toFixed(2);
      const roi = productCost > 0 ? +((netProfit / productCost) * 100).toFixed(0) : 0;
      const breakEven =
        adCost > 0
          ? Math.ceil(
              (productCost + shippingCost + platformFee + refundBuffer) /
                (sellPrice - productCost - shippingCost - platformFee - refundBuffer - adCost)
            )
          : 1;
      const verdict = match.score >= 75 && match.competition !== 'high' && netProfit > 5;
      const _riskLevel = match.riskScore < 25 ? 'low' : match.riskScore < 50 ? 'med' : 'high';

      const relatedProducts = products.filter((p) => p.id !== match.id && p.category === match.category).slice(0, 3);

      const competitionNames = ['TechGear Store', 'DropShip Pro', 'TrendHunter', 'QuickShip Hub', 'PrimeSelection'];
      const compData = competitionNames
        .map((name) => ({
          name,
          price: +(sellPrice * (0.85 + Math.random() * 0.35)).toFixed(2),
          rating: +(3.5 + Math.random() * 1.5).toFixed(1),
          sales: Math.floor(100 + Math.random() * 900),
          saturation: Math.floor(20 + Math.random() * 60),
        }))
        .sort((a, b) => b.sales - a.sales);

      const keywordData = match.keywords
        .map((kw) => ({
          word: kw,
          volume: Math.floor(500 + Math.random() * 9500),
          competition: Math.floor(15 + Math.random() * 70),
        }))
        .sort((a, b) => b.volume - a.volume);

      const hooks = [
        {
          type: 'Problem-Solution',
          text: 'Stop struggling with ' + esc(match.category) + ' — this game-changer does it all',
        },
        {
          type: 'Social Proof',
          text: 'Join 10,000+ happy customers who switched to ' + esc(match.title.split('—')[0].trim()),
        },
        {
          type: 'Urgency',
          text: 'Limited stock: The ' + esc(match.title.split('—')[0].trim()) + ' everyone is talking about',
        },
        { type: 'Curiosity', text: 'The secret ' + esc(match.category) + " hack pros don't want you to know" },
        {
          type: 'Before/After',
          text:
            'Before: frustrated. After: obsessed. See why ' + esc(match.title.split('—')[0].trim()) + ' is different',
        },
      ];

      el.innerHTML = `
      <div class="aa-output">
        <div class="aa-product-header">
          <img class="aa-product-img" src="${esc(match.image)}" alt="${esc(match.title)}" onerror="this.style.display='none'">
          <div class="aa-product-info">
            <div class="aa-product-title">${esc(match.title.split('—')[0].trim())}</div>
            <div class="aa-product-meta">
              <span class="aa-product-platform">${esc(match.platform)}</span>
              <span class="aa-product-price-tag">$${sellPrice.toFixed(2)}</span>
              <span class="aa-product-sold">${fmtN(match.orders)} orders · ${match.rating}★ · ${fmtN(match.reviews)} reviews</span>
            </div>
          </div>
          <div class="aa-verdict ${verdict ? 'aa-verdict-go' : 'aa-verdict-no'}">${verdict ? 'RECOMMENDED' : 'HIGH RISK'}</div>
        </div>

        <div class="aa-grid-4">
          <div class="aa-stat-card"><div class="aa-stat-value" style="color:var(--accent-green)">${match.score}/100</div><div class="aa-stat-label">AI Score</div></div>
          <div class="aa-stat-card"><div class="aa-stat-value" style="color:var(--accent-cyan)">${match.demand}/100</div><div class="aa-stat-label">Demand</div></div>
          <div class="aa-stat-card"><div class="aa-stat-value" style="color:${match.riskScore < 30 ? 'var(--accent-green)' : match.riskScore < 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'}">${match.riskScore}/100</div><div class="aa-stat-label">Risk</div></div>
          <div class="aa-stat-card"><div class="aa-stat-value" style="color:var(--accent-orange)">${match.marketSaturation}%</div><div class="aa-stat-label">Saturation</div></div>
        </div>

        <div class="aa-risk-card">
          <div class="aa-risk-header"><span class="aa-card-icon">🛡</span>Risk Assessment</div>
          <div class="aa-risk-grid">
            <div class="aa-risk-item risk-${match.marketSaturation < 40 ? 'low' : match.marketSaturation < 65 ? 'med' : 'high'}">
              <div class="aa-risk-dot dot-${match.marketSaturation < 40 ? 'green' : match.marketSaturation < 65 ? 'yellow' : 'red'}"></div>
              <div><div class="aa-risk-label">Market Saturation</div><div class="aa-risk-text">${match.marketSaturation < 40 ? 'Low competition — room to enter' : match.marketSaturation < 65 ? 'Moderate — differentiate your offer' : 'High — crowded market, tough to break in'}</div></div>
            </div>
            <div class="aa-risk-item risk-${match.riskScore < 25 ? 'low' : match.riskScore < 50 ? 'med' : 'high'}">
              <div class="aa-risk-dot dot-${match.riskScore < 25 ? 'green' : match.riskScore < 50 ? 'yellow' : 'red'}"></div>
              <div><div class="aa-risk-label">Product Risk</div><div class="aa-risk-text">${match.riskScore < 25 ? 'Stable product with proven demand' : match.riskScore < 50 ? 'Some volatility — monitor trends' : 'Trendy — may fade quickly'}</div></div>
            </div>
            <div class="aa-risk-item risk-${adCost < 5 ? 'low' : adCost < 10 ? 'med' : 'high'}">
              <div class="aa-risk-dot dot-${adCost < 5 ? 'green' : adCost < 10 ? 'yellow' : 'red'}"></div>
              <div><div class="aa-risk-label">Ad Cost Risk</div><div class="aa-risk-text">${adCost < 5 ? 'Low CPA — affordable to advertise' : adCost < 10 ? 'Moderate CPA — requires optimization' : 'High CPA — need strong conversion'}</div></div>
            </div>
            <div class="aa-risk-item risk-${match.suppliers.length >= 3 ? 'low' : match.suppliers.length >= 2 ? 'med' : 'high'}">
              <div class="aa-risk-dot dot-${match.suppliers.length >= 3 ? 'green' : match.suppliers.length >= 2 ? 'yellow' : 'red'}"></div>
              <div><div class="aa-risk-label">Supplier Risk</div><div class="aa-risk-text">${match.suppliers.length >= 3 ? 'Multiple verified suppliers available' : match.suppliers.length >= 2 ? 'Limited suppliers — backup recommended' : 'Few options — negotiate terms carefully'}</div></div>
            </div>
            <div class="aa-risk-item risk-${match.orders > 500 ? 'low' : match.orders > 100 ? 'med' : 'high'}">
              <div class="aa-risk-dot dot-${match.orders > 500 ? 'green' : match.orders > 100 ? 'yellow' : 'red'}"></div>
              <div><div class="aa-risk-label">Demand Stability</div><div class="aa-risk-text">${match.orders > 500 ? 'High volume — proven consistent demand' : match.orders > 100 ? 'Moderate sales — growing potential' : 'Lower volume — test before scaling'}</div></div>
            </div>
            <div class="aa-risk-item risk-${netProfit > 15 ? 'low' : netProfit > 8 ? 'med' : 'high'}">
              <div class="aa-risk-dot dot-${netProfit > 15 ? 'green' : netProfit > 8 ? 'yellow' : 'red'}"></div>
              <div><div class="aa-risk-label">Margin Risk</div><div class="aa-risk-text">${netProfit > 15 ? 'Healthy margins — strong profit buffer' : netProfit > 8 ? 'Acceptable margins — optimize costs' : 'Thin margins — volume-dependent'}</div></div>
            </div>
          </div>
        </div>

        <div class="aa-tabs">
          <button class="aa-tab active" data-tab="aa-panel-overview">Overview</button>
          <button class="aa-tab" data-tab="aa-panel-profit">Profit Deep Dive</button>
          <button class="aa-tab" data-tab="aa-panel-market">Market Demand</button>
          <button class="aa-tab" data-tab="aa-panel-audience">Audience</button>
          <button class="aa-tab" data-tab="aa-panel-competition">Competition</button>
          <button class="aa-tab" data-tab="aa-panel-suppliers">Suppliers</button>
          <button class="aa-tab" data-tab="aa-panel-ads">Ad Strategy</button>
          <button class="aa-tab" data-tab="aa-panel-keywords">Keywords & SEO</button>
        </div>

        <div id="aa-panel-overview" class="aa-tab-panel active">
          <div class="aa-card">
            <div class="aa-card-header"><span class="aa-card-icon">🧠</span>AI Verdict</div>
            <p class="aa-card-text">${esc(match.aiInsight)}</p>
          </div>
          <div class="aa-grid-4" style="margin-top:14px">
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-green)">$${netProfit.toFixed(2)}</div><div class="aa-stat-label">Net Profit / Sale</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-cyan)">${roi}%</div><div class="aa-stat-label">ROI</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-orange)">${fmtN(match.salesVelocity)}/mo</div><div class="aa-stat-label">Sales Velocity</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-purple)">${esc(match.audience.age)}</div><div class="aa-stat-label">Target Age</div></div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">📊</span>Quick Summary</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <div style="font-size:12px;font-weight:600;color:var(--accent-green);margin-bottom:6px">Strengths</div>
                <ul style="list-style:none;padding:0;margin:0">
                  <li style="font-size:12px;color:var(--text-secondary);padding:3px 0">→ ${match.score >= 70 ? 'High AI score indicates strong potential' : 'Moderate score — room for improvement'}</li>
                  <li style="font-size:12px;color:var(--text-secondary);padding:3px 0">→ ${match.demand >= 70 ? 'Strong market demand detected' : 'Growing demand — early mover advantage'}</li>
                  <li style="font-size:12px;color:var(--text-secondary);padding:3px 0">→ ${netProfit > 10 ? 'Healthy profit margins per sale' : 'Volume-driven profit model'}</li>
                  <li style="font-size:12px;color:var(--text-secondary);padding:3px 0">→ ${match.suppliers.length} verified suppliers available</li>
                </ul>
              </div>
              <div>
                <div style="font-size:12px;font-weight:600;color:var(--accent-red);margin-bottom:6px">Watch Out For</div>
                <ul style="list-style:none;padding:0;margin:0">
                  <li style="font-size:12px;color:var(--text-secondary);padding:3px 0">→ ${match.marketSaturation > 60 ? 'High market saturation — differentiation needed' : 'Market has room for new entrants'}</li>
                  <li style="font-size:12px;color:var(--text-secondary);padding:3px 0">→ ${match.competition === 'high' ? 'Intense competition from established sellers' : 'Moderate competition level'}</li>
                  <li style="font-size:12px;color:var(--text-secondary);padding:3px 0">→ ${adCost > 8 ? 'High ad costs require strong conversion rate' : 'Ad spend is manageable'}</li>
                  <li style="font-size:12px;color:var(--text-secondary);padding:3px 0">→ ${match.seasonality ? 'Seasonal demand fluctuations detected' : 'Consistent year-round demand'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div id="aa-panel-profit" class="aa-tab-panel">
          <div class="aa-card">
            <div class="aa-card-header"><span class="aa-card-icon">💰</span>Full Profit Breakdown</div>
            <div class="aa-profit-row">
              <div class="aa-profit-item"><span class="aa-profit-label">Sell Price (Amazon)</span><span class="aa-profit-value aa-profit-pos">$${sellPrice.toFixed(2)}</span></div>
              <div class="aa-profit-item"><span class="aa-profit-label">Product Cost</span><span class="aa-profit-value aa-profit-neg">-$${productCost.toFixed(2)}</span></div>
              <div class="aa-profit-item"><span class="aa-profit-label">Shipping</span><span class="aa-profit-value aa-profit-neg">-$${shippingCost.toFixed(2)}</span></div>
              <div class="aa-profit-item"><span class="aa-profit-label">Platform Fee (15%)</span><span class="aa-profit-value aa-profit-neg">-$${platformFee.toFixed(2)}</span></div>
              <div class="aa-profit-item"><span class="aa-profit-label">Ad Cost (avg)</span><span class="aa-profit-value aa-profit-neg">-$${adCost.toFixed(2)}</span></div>
              <div class="aa-profit-item"><span class="aa-profit-label">Refund Buffer (3%)</span><span class="aa-profit-value aa-profit-neg">-$${refundBuffer.toFixed(2)}</span></div>
              <div class="aa-profit-item aa-profit-total"><span class="aa-profit-label">Net Profit Per Sale</span><span class="aa-profit-value" style="color:var(--accent-green)">$${netProfit.toFixed(2)}</span></div>
            </div>
          </div>
          <div class="aa-grid-4" style="margin-top:14px">
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-green)">${roi}%</div><div class="aa-stat-label">ROI</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-cyan)">${((netProfit / sellPrice) * 100).toFixed(0)}%</div><div class="aa-stat-label">Profit Margin</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-orange)">${breakEven > 0 && breakEven < 100 ? breakEven : '—'}</div><div class="aa-stat-label">Break-Even Units</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-purple)">$${(netProfit * 100).toFixed(0)}</div><div class="aa-stat-label">Profit / 100 Sales</div></div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">🔄</span>Cross-Platform Prices</div>
            <div class="aa-profit-row">
              ${Object.entries(match.platformPrices)
                .map(
                  ([platform, price]) => `
                <div class="aa-profit-item">
                  <span class="aa-profit-label">${esc(cap(platform))}</span>
                  <span class="aa-profit-value" style="color:${price === sellPrice ? 'var(--accent-cyan)' : 'var(--text-primary)'}">$${price.toFixed(2)}${price === sellPrice ? ' ← you' : ''}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>

        <div id="aa-panel-market" class="aa-tab-panel">
          <div class="aa-card">
            <div class="aa-card-header"><span class="aa-card-icon">📈</span>12-Month Demand Trend</div>
            <div class="chart-container"><canvas id="aiTrendChart"></canvas></div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">🗓</span>Seasonality Heatmap</div>
            <div style="margin-bottom:8px;font-size:11px;color:var(--text-muted)">Demand intensity by month (darker = higher demand)</div>
            <div class="aa-heatmap">
              ${match.seasonality
                .map((val) => {
                  const max = Math.max(...match.seasonality);
                  const intensity = max > 0 ? val / max : 0;
                  const bg =
                    intensity > 0.7
                      ? 'rgba(0,255,136,0.35)'
                      : intensity > 0.4
                        ? 'rgba(0,229,255,0.2)'
                        : 'rgba(85,85,112,0.15)';
                  return '<div class="aa-heatmap-cell" style="background:' + bg + '">' + val + '</div>';
                })
                .join('')}
            </div>
            <div class="aa-heatmap-labels">
              ${months.map((m) => '<div class="aa-heatmap-label">' + m + '</div>').join('')}
            </div>
          </div>
          <div class="aa-grid-4" style="margin-top:14px">
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-cyan)">${fmtN(match.salesVelocity)}</div><div class="aa-stat-label">Monthly Sales</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-green)">${match.demand}/100</div><div class="aa-stat-label">Demand Score</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-orange)">${match.marketSaturation}%</div><div class="aa-stat-label">Saturation</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-purple)">${fmtN(match.orders)}</div><div class="aa-stat-label">Total Orders</div></div>
          </div>
        </div>

        <div id="aa-panel-audience" class="aa-tab-panel">
          <div class="aa-grid-4">
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:15px">${esc(match.audience.age)}</div><div class="aa-stat-label">Age Range</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:15px">${esc(match.audience.gender)}</div><div class="aa-stat-label">Gender</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:12px">${esc(match.audience.countries.slice(0, 3).join(', '))}</div><div class="aa-stat-label">Top Countries</div></div>
            <div class="aa-stat-card"><div class="aa-stat-value" style="font-size:15px">$${match.cpaAvg.toFixed(2)}</div><div class="aa-stat-label">Est. CPA</div></div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">💡</span>Interests & Behaviors</div>
            <div class="aa-tags">${match.audience.interests.map((i) => '<span class="aa-tag">' + esc(i) + '</span>').join('')}</div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">📱</span>Best Platforms to Reach Them</div>
            <div class="aa-ad-platforms">
              <div class="aa-ad-platform-card"><div class="aa-ad-platform-name">Facebook</div><div class="aa-ad-platform-budget">40% budget</div><div class="aa-ad-platform-type">Carousel + Video Ads</div></div>
              <div class="aa-ad-platform-card"><div class="aa-ad-platform-name">TikTok</div><div class="aa-ad-platform-budget">35% budget</div><div class="aa-ad-platform-type">In-Feed + Spark Ads</div></div>
              <div class="aa-ad-platform-card"><div class="aa-ad-platform-name">Instagram</div><div class="aa-ad-platform-budget">25% budget</div><div class="aa-ad-platform-type">Reels + Stories</div></div>
            </div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">⏰</span>Optimal Posting Times</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
              <div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);text-align:center">
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Best Day</div>
                <div style="font-size:14px;font-weight:700">Tue – Thu</div>
              </div>
              <div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);text-align:center">
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Best Time</div>
                <div style="font-size:14px;font-weight:700">7PM – 10PM</div>
              </div>
              <div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);text-align:center">
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Peak Hours</div>
                <div style="font-size:14px;font-weight:700">Lunch + Evening</div>
              </div>
            </div>
          </div>
        </div>

        <div id="aa-panel-competition" class="aa-tab-panel">
          <div class="aa-card">
            <div class="aa-card-header"><span class="aa-card-icon">⚔️</span>Competitor Landscape</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${compData
                .map(
                  (c, i) => `
                <div class="aa-comp-row">
                  <div class="aa-comp-rank">#${i + 1}</div>
                  <div class="aa-comp-thumb">🏪</div>
                  <div class="aa-comp-info">
                    <div class="aa-comp-name">${esc(c.name)}</div>
                    <div class="aa-comp-detail">${c.rating}★ · ${fmtN(c.sales)} sales</div>
                  </div>
                  <div class="aa-comp-price">$${c.price.toFixed(2)}</div>
                  <div class="aa-comp-bar-wrap">
                    <div class="aa-comp-bar-bg"><div class="aa-comp-bar-fill" style="width:${c.saturation}%;background:${c.saturation > 60 ? 'var(--accent-red)' : c.saturation > 35 ? 'var(--accent-yellow)' : 'var(--accent-green)'}"></div></div>
                    <div class="aa-comp-bar-label">${c.saturation}%</div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">📋</span>SWOT Analysis</div>
            <div class="aa-swot-grid">
              <div class="aa-swot-card swot-s">
                <div class="aa-swot-title" style="color:var(--accent-green)">Strengths</div>
                <ul class="aa-swot-list">
                  <li>${match.score >= 70 ? 'High AI score validates product quality' : 'Moderate market fit'}</li>
                  <li>${netProfit > 10 ? 'Strong profit margins' : 'Competitive pricing possible'}</li>
                  <li>${match.demand >= 70 ? 'Proven consumer demand' : 'Growing niche interest'}</li>
                </ul>
              </div>
              <div class="aa-swot-card swot-w">
                <div class="aa-swot-title" style="color:var(--accent-red)">Weaknesses</div>
                <ul class="aa-swot-list">
                  <li>${match.competition === 'high' ? 'Saturated competitive space' : 'Need to build brand differentiation'}</li>
                  <li>${adCost > 8 ? 'High customer acquisition cost' : 'Ad creative testing required'}</li>
                  <li>${match.riskScore > 50 ? 'Trend-dependent demand' : 'Standard product lifecycle'}</li>
                </ul>
              </div>
              <div class="aa-swot-card swot-o">
                <div class="aa-swot-title" style="color:var(--accent-cyan)">Opportunities</div>
                <ul class="aa-swot-list">
                  <li>${match.marketSaturation < 40 ? 'Low saturation = early mover advantage' : 'Bundle/upsell potential'}</li>
                  <li>${match.audience.countries.length > 2 ? 'Multi-market expansion possible' : 'Untapped geographic markets'}</li>
                  <li>Seasonal marketing campaigns</li>
                </ul>
              </div>
              <div class="aa-swot-card swot-t">
                <div class="aa-swot-title" style="color:var(--accent-orange)">Threats</div>
                <ul class="aa-swot-list">
                  <li>${match.competition === 'high' ? 'Established competitors with reviews' : 'New entrants may increase competition'}</li>
                  <li>${match.riskScore > 40 ? 'Demand could shift with trends' : 'Price war risk from low-cost sellers'}</li>
                  <li>Supplier reliability concerns</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div id="aa-panel-suppliers" class="aa-tab-panel">
          <div class="aa-card">
            <div class="aa-card-header"><span class="aa-card-icon">🏢</span>Best Suppliers</div>
            <div class="aa-suppliers">
              ${match.suppliers
                .map(
                  (s) => `
                <div class="aa-supplier">
                  <div class="aa-supplier-avatar">${esc(s.name.charAt(0))}</div>
                  <div class="aa-supplier-info">
                    <div class="aa-supplier-name">${esc(s.name)}</div>
                    <div class="aa-supplier-loc">${esc(s.location)}</div>
                  </div>
                  <div class="aa-supplier-stats">
                    <span class="aa-supplier-stat"><span style="color:var(--accent-yellow)">${s.rating}★</span></span>
                    <span class="aa-supplier-stat">${fmtN(s.orders)} orders</span>
                    <span class="aa-supplier-stat">${esc(s.responseTime)}</span>
                    ${s.verified ? '<span class="aa-supplier-badge">✓ Verified</span>' : ''}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">📝</span>Supplier Tips</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary);line-height:1.6;border-left:3px solid var(--accent-green)">→ Always order samples first to verify quality before committing to bulk orders.</div>
              <div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary);line-height:1.6;border-left:3px solid var(--accent-cyan)">→ Negotiate shipping terms — ePacket or tracked packets for US/EU buyers.</div>
              <div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary);line-height:1.6;border-left:3px solid var(--accent-orange)">→ Check supplier response time consistently — slow replies = slow fulfillment.</div>
            </div>
          </div>
        </div>

        <div id="aa-panel-ads" class="aa-tab-panel">
          <div class="aa-card">
            <div class="aa-card-header"><span class="aa-card-icon">🎣</span>Winning Ad Hooks</div>
            <div class="aa-ad-hooks">
              ${hooks
                .map(
                  (h) => `
                <div class="aa-ad-hook">
                  <div class="aa-ad-hook-type">${esc(h.type)}</div>
                  <div>"${esc(h.text)}"</div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">📊</span>Budget Allocation</div>
            <div class="aa-ad-budget-bar">
              <div class="aa-ad-budget-seg" style="width:40%;background:var(--accent-cyan)"></div>
              <div class="aa-ad-budget-seg" style="width:35%;background:var(--accent-purple)"></div>
              <div class="aa-ad-budget-seg" style="width:25%;background:var(--accent-orange)"></div>
            </div>
            <div class="aa-ad-platforms">
              <div class="aa-ad-platform-card"><div class="aa-ad-platform-name" style="color:var(--accent-cyan)">Facebook</div><div class="aa-ad-platform-budget">40% · $${(adCost * 0.4 * 30).toFixed(0)}/mo</div><div class="aa-ad-platform-type">Carousel + Video</div></div>
              <div class="aa-ad-platform-card"><div class="aa-ad-platform-name" style="color:var(--accent-purple)">TikTok</div><div class="aa-ad-platform-budget">35% · $${(adCost * 0.35 * 30).toFixed(0)}/mo</div><div class="aa-ad-platform-type">In-Feed + Spark</div></div>
              <div class="aa-ad-platform-card"><div class="aa-ad-platform-name" style="color:var(--accent-orange)">Instagram</div><div class="aa-ad-platform-budget">25% · $${(adCost * 0.25 * 30).toFixed(0)}/mo</div><div class="aa-ad-platform-type">Reels + Stories</div></div>
            </div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">✍️</span>Sample Ad Copy</div>
            <div class="aa-ad-copy-block">
              <div class="aa-ad-copy-label">Facebook Carousel</div>
              <div class="aa-ad-copy-text">Tired of ${esc(match.category)} that don't deliver? 🔥 Our ${esc(match.title.split('—')[0].trim())} is rated ${match.rating}★ by ${fmtN(match.reviews)} happy customers. Shop now and see the difference.</div>
            </div>
            <div class="aa-ad-copy-block">
              <div class="aa-ad-copy-label">TikTok In-Feed (15s)</div>
              <div class="aa-ad-copy-text">POV: You finally found the perfect ${esc(match.category)} ✨ ${fmtN(match.orders)} people already ordered theirs. Link in bio before it sells out 👀</div>
            </div>
            <div class="aa-ad-copy-block">
              <div class="aa-ad-copy-label">Instagram Reel (30s)</div>
              <div class="aa-ad-copy-text">This ${esc(match.category)} changed everything for me. ${match.rating}★ rating, ${fmtN(match.orders)} orders, and it's still flying under the radar. Grab yours before everyone else catches on 🚀</div>
            </div>
          </div>
        </div>

        <div id="aa-panel-keywords" class="aa-tab-panel">
          <div class="aa-card">
            <div class="aa-card-header"><span class="aa-card-icon">🔑</span>Keyword Research</div>
            <div class="aa-kw-primary">
              <div class="aa-kw-section-title">Primary Keywords</div>
              ${keywordData
                .slice(0, 5)
                .map(
                  (kw) => `
                <div class="aa-kw-row">
                  <span class="aa-kw-word">${esc(kw.word)}</span>
                  <span class="aa-kw-vol">${fmtN(kw.volume)}/mo</span>
                  <div class="aa-kw-comp">
                    <div class="aa-kw-comp-bar"><div class="aa-kw-comp-fill" style="width:${kw.competition}%;background:${kw.competition > 60 ? 'var(--accent-red)' : kw.competition > 35 ? 'var(--accent-yellow)' : 'var(--accent-green)'}"></div></div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
            <div class="aa-kw-primary">
              <div class="aa-kw-section-title">Long-Tail Keywords</div>
              ${keywordData
                .slice(5)
                .map(
                  (kw) => `
                <div class="aa-kw-row">
                  <span class="aa-kw-word">${esc(kw.word)}</span>
                  <span class="aa-kw-vol">${fmtN(kw.volume)}/mo</span>
                  <div class="aa-kw-comp">
                    <div class="aa-kw-comp-bar"><div class="aa-kw-comp-fill" style="width:${kw.competition}%;background:${kw.competition > 60 ? 'var(--accent-red)' : kw.competition > 35 ? 'var(--accent-yellow)' : 'var(--accent-green)'}"></div></div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">🏷</span>All Tags</div>
            <div class="aa-tags">${match.keywords.map((k) => '<span class="aa-tag">' + esc(k) + '</span>').join('')}</div>
          </div>
          <div class="aa-card" style="margin-top:14px">
            <div class="aa-card-header"><span class="aa-card-icon">📝</span>Suggested Listing Title</div>
            <div class="aa-kw-listing">
              <div class="aa-kw-listing-label">Optimized Title</div>
              <div class="aa-kw-listing-text">${esc(match.title.split('—')[0].trim())} - ${keywordData
                .slice(0, 3)
                .map((k) => esc(k.word))
                .join(', ')} | ${match.rating}★ Rated | Free Shipping</div>
            </div>
          </div>
        </div>

        <div class="aa-actions">
          <a class="aa-action-btn" href="#section-supplier-hub" onclick="window.HuntDrop.EventBus.emit('navigate',{section:'section-supplier-hub'})"><span class="aa-action-icon">🏭</span>Find Suppliers</a>
          <a class="aa-action-btn" href="#section-profit-calc" onclick="window.HuntDrop.EventBus.emit('navigate',{section:'section-profit-calc'})"><span class="aa-action-icon">🧮</span>Calculate Profit</a>
          <a class="aa-action-btn" href="#section-ad-studio" onclick="window.HuntDrop.EventBus.emit('navigate',{section:'section-ad-studio'})"><span class="aa-action-icon">🎯</span>Generate Ad Copy</a>
          <a class="aa-action-btn" href="#section-battlefield" onclick="window.HuntDrop.EventBus.emit('navigate',{section:'section-battlefield'})"><span class="aa-action-icon">⚔️</span>Spy Competitors</a>
        </div>

        ${
          relatedProducts.length > 0
            ? `
        <div class="aa-card" style="margin-top:14px">
          <div class="aa-card-header"><span class="aa-card-icon">🔍</span>Related Products Worth Analyzing</div>
          <div class="aa-related-grid">
            ${relatedProducts
              .map(
                (rp) => `
              <div class="aa-related-card" data-related-query="${esc(rp.title.split('—')[0].trim())}">
                <img class="aa-related-img" src="${esc(rp.image)}" alt="${esc(rp.title)}" onerror="this.style.display='none'">
                <div class="aa-related-title">${esc(rp.title.split('—')[0].trim())}</div>
                <div class="aa-related-meta">
                  <span class="aa-related-score">${rp.score}/100</span>
                  <span class="aa-related-price">$${rp.price.toFixed(2)}</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
        `
            : ''
        }
      </div>`;

      if (_section) {
        _section.querySelectorAll('.aa-tab').forEach((tab) => {
          tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });
        // Event delegation for related product cards (safe: no inline onclick)
        const relatedGrid = _section.querySelector('.aa-related-grid');
        if (relatedGrid) {
          relatedGrid.addEventListener('click', function (e) {
            const card = e.target.closest('.aa-related-card[data-related-query]');
            if (!card) return;
            const query = card.getAttribute('data-related-query');
            const aiInput = document.getElementById('aiInput');
            if (aiInput) aiInput.value = query;
            EventBus.emit('ai-analyst:run', { query: query });
          });
        }
      }

      setTimeout(() => {
        const chartCtx = _section?.querySelector('#aiTrendChart');
        if (chartCtx) {
          if (_trendChart) _trendChart.destroy();
          _trendChart = new Chart(chartCtx, {
            type: 'line',
            data: {
              labels: months,
              datasets: [
                {
                  label: 'Demand',
                  data: match.trendData,
                  borderColor: '#00ff88',
                  backgroundColor: 'rgba(0,255,136,0.06)',
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4,
                  pointBackgroundColor: '#00ff88',
                  pointBorderColor: '#06060c',
                  pointBorderWidth: 2,
                  pointRadius: 3,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  grid: { color: 'rgba(255,255,255,0.025)' },
                  ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 9 } },
                },
                y: {
                  grid: { color: 'rgba(255,255,255,0.025)' },
                  ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 9 } },
                },
              },
            },
          });
        }
      }, 100);
    },
  };

  PluginRegistry.register('ai-analyst', AIAnalystPlugin);
})();
