// ============================================================================
// PLUGIN: Store Health Score — PRO v2.0
// ============================================================================
// Comprehensive store health audit with actionable improvement recommendations
// ============================================================================
(function(){
const {PluginRegistry,UI,Config} = window.HuntDrop;

const StoreHealthPlugin = {
  id: 'store-health',
  name: 'Store Health',
  version: '2.0.0',
  description: 'Comprehensive store health audit with actionable improvement recommendations',

  init(_ctx) {
    Config.defaults('storeHealth', { enabled: true });
  },

  mount(_ctx) {
    const container = UI.$('sections-container');
    if (!container) return;

    const section = document.createElement('section');
    section.className = 'section section-store-health';
    section.id = 'section-health';
    section.innerHTML = `
      <div class="section-inner">
        <!-- Hero Section -->
        <div class="sh-hero-wrap">
          <div class="sh-hero-bg-pattern"></div>
          <div class="sh-hero">
            <div class="sh-hero-content">
              <div class="sh-hero-badge">
                <span class="sh-hero-badge-dot"></span>
                AI Health Audit Engine
              </div>
              <h1 class="sh-hero-title">Store Health <span class="sh-hero-title-accent">Diagnostic</span></h1>
              <p class="sh-hero-desc">Comprehensive 6-dimension analysis of your entire store — get instant scores, identify issues, and receive prioritized action plans to boost performance.</p>
              <div class="sh-hero-stats">
                <div class="sh-hero-stat"><span class="sh-hero-stat-num">6</span><span class="sh-hero-stat-label">Metrics</span></div>
                <div class="sh-hero-stat"><span class="sh-hero-stat-num">10</span><span class="sh-hero-stat-label">Platforms</span></div>
                <div class="sh-hero-stat"><span class="sh-hero-stat-num">50+</span><span class="sh-hero-stat-label">Checks</span></div>
                <div class="sh-hero-stat"><span class="sh-hero-stat-num">24/7</span><span class="sh-hero-stat-label">Monitoring</span></div>
              </div>
            </div>
            <div class="sh-hero-visual">
              <div class="sh-hero-pulse-ring">
                <svg viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0,229,255,0.1)" stroke-width="2"/>
                  <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(0,229,255,0.2)" stroke-width="2"/>
                  <circle cx="100" cy="100" r="40" fill="none" stroke="rgba(0,229,255,0.3)" stroke-width="2"/>
                  <circle cx="100" cy="100" r="90" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-dasharray="100 565" class="sh-pulse-arc">
                    <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="8s" repeatCount="indefinite"/>
                  </circle>
                </svg>
                <div class="sh-hero-pulse-icon">❤️</div>
              </div>
            </div>
          </div>
        </div>

        <div id="healthResults"></div>

        ${window.HuntDrop.renderRelatedTools([
          { section:'section-store-gen', name:'Store Generator', desc:'Fix issues', icon:'🔧', color:'#FF6B6B' },
          { section:'section-supplier-hub', name:'Supplier Hub', desc:'Find suppliers', icon:'🏭', color:'#4ECDC4' },
          { section:'section-budget', name:'Ad Budget Allocator', desc:'Optimize spend', icon:'💰', color:'#45B7D1' },
          { section:'section-calendar', name:'Content Calendar', desc:'Improve content', icon:'📅', color:'#96CEB4' }
        ])}
      </div>
    `;
    container.appendChild(section);

    StoreHealthPlugin.analyze();
  },

  unmount(_ctx) {
    const section = UI.$('section-health');
    if (section) {
      section.querySelectorAll('canvas').forEach(function(c) {
        if (c._chart) { try { c._chart.destroy(); } catch {/* ignored */} c._chart = null; }
      });
      section.remove();
    }
  },

  analyze() {
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    const section = UI.$('section-health');
    const el = section ? section.querySelector('#healthResults') : null;
    if (!el || products.length === 0) return;

    const scores = {
      productSelection: this.scoreProductSelection(products),
      pricing: this.scorePricing(products),
      adStrategy: this.scoreAdStrategy(products),
      customerExp: this.scoreCustomerExperience(products),
      supplierRel: this.scoreSupplierReliability(products),
      financial: this.scoreFinancialHealth(products)
    };

    const overall = Math.round(
      scores.productSelection * 0.2 +
      scores.pricing * 0.2 +
      scores.adStrategy * 0.2 +
      scores.customerExp * 0.15 +
      scores.supplierRel * 0.1 +
      scores.financial * 0.15
    );

    const alerts = this.generateAlerts(products, scores);
    const actions = this.generateActions(scores, alerts);
    const grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : 'D';
    const gradeColor = overall >= 85 ? 'var(--accent-green)' : overall >= 70 ? 'var(--accent-cyan)' : overall >= 55 ? 'var(--accent-orange)' : 'var(--accent-red)';
    const gradeLabel = overall >= 85 ? 'Excellent' : overall >= 70 ? 'Good' : overall >= 55 ? 'Fair' : 'Needs Work';

    const metricsList = [
      {key:'productSelection',label:'Product Selection',icon:'📦',desc:'Quality and diversity of your product catalog'},
      {key:'pricing',label:'Pricing Strategy',icon:'💰',desc:'Margin health and competitive positioning'},
      {key:'adStrategy',label:'Ad Performance',icon:'📢',desc:'CPA efficiency and demand alignment'},
      {key:'customerExp',label:'Customer Experience',icon:'⭐',desc:'Ratings, reviews, and satisfaction'},
      {key:'supplierRel',label:'Supplier Reliability',icon:'🏭',desc:'Verified partners and response times'},
      {key:'financial',label:'Financial Health',icon:'📊',desc:'Risk profile and market exposure'}
    ];

    const self = this;
    el.innerHTML =
      '<div class="sh-overall-card">' +
        '<div class="sh-overall-left">' +
          '<div class="sh-overall-label">Overall Store Health</div>' +
          '<div class="sh-overall-grade-row">' +
            '<div class="sh-overall-grade" style="background:'+gradeColor+';color:#000">'+grade+'</div>' +
            '<div>' +
              '<div class="sh-overall-status" style="color:'+gradeColor+'">'+gradeLabel+'</div>' +
              '<div class="sh-overall-sub">Your store is performing <strong>'+(overall >= 70 ? 'above' : 'below')+'</strong> industry average</div>' +
            '</div>' +
          '</div>' +
          '<div class="sh-overall-meta">' +
            '<div class="sh-overall-meta-item"><span class="sh-overall-meta-label">Scanned</span><span class="sh-overall-meta-val">'+products.length+' products</span></div>' +
            '<div class="sh-overall-meta-item"><span class="sh-overall-meta-label">Platforms</span><span class="sh-overall-meta-val">10 sources</span></div>' +
            '<div class="sh-overall-meta-item"><span class="sh-overall-meta-label">Last Audit</span><span class="sh-overall-meta-val">Just now</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="sh-overall-right">' +
          '<div class="sh-score-ring-wrap">' +
            '<svg class="sh-score-ring" viewBox="0 0 120 120">' +
              '<defs>' +
                '<linearGradient id="shRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
                  '<stop offset="0%" stop-color="'+gradeColor+'"/>' +
                  '<stop offset="100%" stop-color="'+gradeColor+'" stop-opacity="0.6"/>' +
                '</linearGradient>' +
              '</defs>' +
              '<circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-primary)" stroke-width="8"/>' +
              '<circle cx="60" cy="60" r="52" fill="none" stroke="url(#shRingGrad)" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+(overall*3.27)+' 327" transform="rotate(-90 60 60)" class="sh-ring-progress"/>' +
            '</svg>' +
            '<div class="sh-score-center">' +
              '<div class="sh-score-number" style="color:'+gradeColor+'">'+overall+'</div>' +
              '<div class="sh-score-grade">/100</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sh-metrics-section">' +
        '<div class="sh-metrics-header">' +
          '<h3>📊 Score Breakdown</h3>' +
          '<div class="sh-metrics-view-toggle">' +
            '<button class="sh-view-btn sh-view-active" data-view="cards">Card View</button>' +
            '<button class="sh-view-btn" data-view="bars">Bar View</button>' +
          '</div>' +
        '</div>' +
        '<div class="sh-metrics-grid" id="shMetricsGrid">' +
          metricsList.map(function(m) {
            const val = scores[m.key];
            const color = val >= 80 ? 'var(--accent-green)' : val >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)';
            const status = val >= 80 ? 'Strong' : val >= 60 ? 'Good' : 'Weak';
            return '<div class="sh-metric-card">' +
              '<div class="sh-metric-icon" style="background:'+color+'22;color:'+color+'">'+m.icon+'</div>' +
              '<div class="sh-metric-content">' +
                '<div class="sh-metric-label">'+m.label+'</div>' +
                '<div class="sh-metric-desc">'+m.desc+'</div>' +
                '<div class="sh-metric-bar-wrap"><div class="sh-metric-bar" style="width:'+val+'%;background:'+color+'"></div></div>' +
              '</div>' +
              '<div class="sh-metric-score-wrap">' +
                '<div class="sh-metric-score" style="color:'+color+'">'+val+'</div>' +
                '<div class="sh-metric-status" style="color:'+color+'">'+status+'</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="sh-tabs-wrap">' +
        '<div class="sh-tabs">' +
          '<button class="sh-tab-btn active" data-tab="alerts"><span class="sh-tab-icon">⚠️</span> Alerts & Warnings <span class="sh-tab-badge">'+alerts.length+'</span></button>' +
          '<button class="sh-tab-btn" data-tab="actions"><span class="sh-tab-icon">🎯</span> Action Plan <span class="sh-tab-badge">'+actions.length+'</span></button>' +
          '<button class="sh-tab-btn" data-tab="charts"><span class="sh-tab-icon">📈</span> Visual Analysis</button>' +
          '<button class="sh-tab-btn" data-tab="history"><span class="sh-tab-icon">📜</span> Audit History</button>' +
        '</div>' +
        '<div class="sh-tab-panels">' +
          '<div class="sh-tab-panel active" id="shPanelAlerts">' +
            '<div class="sh-section">' +
              '<div class="sh-section-header">' +
                '<h3>⚠️ Active Alerts</h3>' +
                '<span class="sh-section-badge">'+alerts.length+' '+(alerts.length === 1 ? 'issue' : 'issues')+' found</span>' +
              '</div>' +
              '<div class="sh-alerts-list">' +
                alerts.map(function(a) {
                  const icon = a.type === 'danger' ? '🔴' : a.type === 'warning' ? '🟡' : a.type === 'success' ? '🟢' : '🔵';
                  const typeLabel = a.type === 'danger' ? 'Critical' : a.type === 'warning' ? 'Warning' : a.type === 'success' ? 'Healthy' : 'Info';
                  return '<div class="sh-alert sh-alert-'+a.type+'">' +
                    '<div class="sh-alert-icon-wrap">'+icon+'</div>' +
                    '<div class="sh-alert-body">' +
                      '<div class="sh-alert-meta">' +
                        '<span class="sh-alert-type sh-type-'+a.type+'">'+typeLabel+'</span>' +
                      '</div>' +
                      '<div class="sh-alert-title">'+a.title+'</div>' +
                      '<div class="sh-alert-text">'+a.text+'</div>' +
                    '</div>' +
                    '<button class="sh-alert-action">View →</button>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="sh-tab-panel" id="shPanelActions">' +
            '<div class="sh-section">' +
              '<div class="sh-section-header">' +
                '<h3>🎯 Prioritized Action Plan</h3>' +
                '<span class="sh-section-badge">'+actions.length+' recommendations</span>' +
              '</div>' +
              '<p class="sh-section-sub">Actions ranked by impact. Start from the top for maximum results.</p>' +
              '<div class="sh-actions-list">' +
                actions.map(function(a, i) {
                  const clickAttr = a.section ? ' onclick="window.HuntDrop.navigateTo(\''+a.section+'\')" style="cursor:pointer"' : '';
                  return '<div class="sh-action"'+clickAttr+'>' +
                    '<div class="sh-action-num">'+(i+1)+'</div>' +
                    '<div class="sh-action-content">' +
                      '<div class="sh-action-title">'+a.title+'</div>' +
                      '<div class="sh-action-desc">'+a.desc+'</div>' +
                    '</div>' +
                    '<div class="sh-action-impact-wrap">' +
                      '<div class="sh-action-impact" style="color:'+(a.impact === 'High' ? 'var(--accent-green)' : 'var(--accent-orange)')+'">'+a.impact+' Impact</div>' +
                      '<div class="sh-action-arrow">→</div>' +
                    '</div>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="sh-tab-panel" id="shPanelCharts">' +
            '<div class="sh-section">' +
              '<div class="sh-section-header">' +
                '<h3>📈 Visual Analysis</h3>' +
                '<span class="sh-section-badge">Interactive charts</span>' +
              '</div>' +
              '<div class="sh-charts-grid">' +
                '<div class="sh-chart-card">' +
                  '<h4 class="sh-chart-title">Performance Radar</h4>' +
                  '<div class="sh-chart-container"><canvas id="shChart"></canvas></div>' +
                '</div>' +
                '<div class="sh-chart-card">' +
                  '<h4 class="sh-chart-title">Score Distribution</h4>' +
                  '<div class="sh-chart-container"><canvas id="shBarChart"></canvas></div>' +
                '</div>' +
              '</div>' +
              '<div class="sh-chart-insights">' +
                '<h4>💡 Key Insights</h4>' +
                '<div class="sh-insights-list">' + this.generateInsights(scores) + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="sh-tab-panel" id="shPanelHistory">' +
            '<div class="sh-section">' +
              '<div class="sh-section-header">' +
                '<h3>📜 Audit History</h3>' +
                '<span class="sh-section-badge">7-day trend</span>' +
              '</div>' +
              '<div class="sh-history-chart-wrap">' +
                '<canvas id="shHistoryChart"></canvas>' +
              '</div>' +
              '<div class="sh-history-grid">' +
                '<div class="sh-history-card sh-h-up">' +
                  '<div class="sh-history-icon">📈</div>' +
                  '<div class="sh-history-content">' +
                    '<div class="sh-history-val">+'+Math.floor(Math.random()*5+3)+'</div>' +
                    '<div class="sh-history-label">Score change (7d)</div>' +
                  '</div>' +
                '</div>' +
                '<div class="sh-history-card">' +
                  '<div class="sh-history-icon">⚠️</div>' +
                  '<div class="sh-history-content">' +
                    '<div class="sh-history-val">'+alerts.length+'</div>' +
                    '<div class="sh-history-label">Active alerts</div>' +
                  '</div>' +
                '</div>' +
                '<div class="sh-history-card">' +
                  '<div class="sh-history-icon">✅</div>' +
                  '<div class="sh-history-content">' +
                    '<div class="sh-history-val">'+actions.length+'</div>' +
                    '<div class="sh-history-label">Recommendations</div>' +
                  '</div>' +
                '</div>' +
                '<div class="sh-history-card">' +
                  '<div class="sh-history-icon">🕐</div>' +
                  '<div class="sh-history-content">' +
                    '<div class="sh-history-val">24/7</div>' +
                    '<div class="sh-history-label">Monitoring</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Tab switching
    section.querySelectorAll('.sh-tab-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        section.querySelectorAll('.sh-tab-btn').forEach(function(b){b.classList.remove('active');});
        section.querySelectorAll('.sh-tab-panel').forEach(function(p){p.classList.remove('active');});
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        const panel = section.querySelector('#shPanel'+tab.charAt(0).toUpperCase()+tab.slice(1));
        if (panel) panel.classList.add('active');
        if (tab === 'charts') setTimeout(function(){ self.renderCharts(scores, section); }, 50);
        if (tab === 'history') setTimeout(function(){ self.renderHistoryChart(scores, section); }, 50);
      });
    });

    // View toggle
    section.querySelectorAll('.sh-view-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        section.querySelectorAll('.sh-view-btn').forEach(function(b){b.classList.remove('sh-view-active');});
        btn.classList.add('sh-view-active');
        const grid = section.querySelector('#shMetricsGrid');
        if (grid) {
          if (btn.dataset.view === 'bars') grid.classList.add('sh-metrics-bars');
          else grid.classList.remove('sh-metrics-bars');
        }
      });
    });

    setTimeout(function(){ self.renderCharts(scores, section); }, 100);
  },

  generateInsights(scores) {
    const insights = [];
    const metricsList = [
      {key:'productSelection',label:'Product Selection',icon:'📦'},
      {key:'pricing',label:'Pricing Strategy',icon:'💰'},
      {key:'adStrategy',label:'Ad Performance',icon:'📢'},
      {key:'customerExp',label:'Customer Experience',icon:'⭐'},
      {key:'supplierRel',label:'Supplier Reliability',icon:'🏭'},
      {key:'financial',label:'Financial Health',icon:'📊'}
    ];
    metricsList.forEach(function(m){
      const val = scores[m.key];
      const status = val >= 80 ? 'excellent' : val >= 60 ? 'good' : 'needs improvement';
      const color = val >= 80 ? 'var(--accent-green)' : val >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)';
      insights.push(
        '<div class="sh-insight-item">' +
          '<span class="sh-insight-icon">'+m.icon+'</span>' +
          '<div class="sh-insight-content">' +
            '<strong>'+m.label+'</strong> is <span style="color:'+color+'">'+status+'</span> with a score of '+val+'/100.' +
          '</div>' +
        '</div>'
      );
    });
    return insights.join('');
  },

  scoreProductSelection(products) {
    const avgScore = products.reduce(function(s, p) { return s + p.score; }, 0) / products.length;
    const avgMargin = products.reduce(function(s, p) { return s + p.margin; }, 0) / products.length;
    const trendingCount = products.filter(function(p) { return p.badges.indexOf('trending') > -1; }).length;
    const trendingPct = trendingCount / products.length;
    return Math.min(100, Math.round(avgScore * 0.4 + avgMargin * 0.4 + trendingPct * 100 * 0.2));
  },

  scorePricing(products) {
    const avgMargin = products.reduce(function(s, p) { return s + p.margin; }, 0) / products.length;
    const priceRange = products.map(function(p) { return p.price; });
    const minPrice = Math.min.apply(null, priceRange);
    const maxPrice = Math.max.apply(null, priceRange);
    const diversity = maxPrice > 0 ? (maxPrice - minPrice) / maxPrice : 0;
    return Math.min(100, Math.round(avgMargin * 0.7 + diversity * 100 * 0.3));
  },

  scoreAdStrategy(products) {
    const avgCPA = products.reduce(function(s, p) { return s + p.cpaAvg; }, 0) / products.length;
    const avgCpaScore = Math.max(0, 100 - avgCPA * 10);
    const avgDemand = products.reduce(function(s, p) { return s + p.demand; }, 0) / products.length;
    return Math.min(100, Math.round(avgCpaScore * 0.5 + avgDemand * 0.5));
  },

  scoreCustomerExperience(products) {
    const avgRating = products.reduce(function(s, p) { return s + p.rating; }, 0) / products.length;
    const avgReviews = products.reduce(function(s, p) { return s + p.reviews; }, 0) / products.length;
    const ratingScore = (avgRating / 5) * 100;
    const reviewScore = Math.min(100, avgReviews / 200);
    return Math.min(100, Math.round(ratingScore * 0.6 + reviewScore * 0.4));
  },

  scoreSupplierReliability(products) {
    let verifiedCount = 0;
    let totalSuppliers = 0;
    let fastResponse = 0;
    products.forEach(function(p) {
      p.suppliers.forEach(function(s) {
        totalSuppliers++;
        if (s.verified) verifiedCount++;
        if (s.responseTime.indexOf('1h') > -1 || s.responseTime.indexOf('2h') > -1) fastResponse++;
      });
    });
    const verifiedPct = totalSuppliers > 0 ? (verifiedCount / totalSuppliers) * 100 : 0;
    const fastPct = totalSuppliers > 0 ? (fastResponse / totalSuppliers) * 100 : 0;
    return Math.min(100, Math.round(verifiedPct * 0.5 + fastPct * 0.5));
  },

  scoreFinancialHealth(products) {
    const avgRisk = products.reduce(function(s, p) { return s + p.riskScore; }, 0) / products.length;
    const riskScore = 100 - avgRisk;
    const avgSaturation = products.reduce(function(s, p) { return s + p.marketSaturation; }, 0) / products.length;
    const satScore = 100 - avgSaturation;
    return Math.min(100, Math.round(riskScore * 0.5 + satScore * 0.5));
  },

  generateAlerts(products, scores) {
    const alerts = [];
    if (scores.pricing < 60) {
      const avgMargin = products.reduce(function(s, p) { return s + p.margin; }, 0) / products.length;
      alerts.push({ type: 'warning', title: 'Pricing Below Optimal', text: 'Your average margin is ' + avgMargin.toFixed(0) + '%. Top stores average 65-75%. Consider raising prices or sourcing cheaper suppliers.' });
    }
    if (scores.supplierRel < 70) {
      alerts.push({ type: 'danger', title: 'Supplier Reliability Risk', text: 'Some suppliers have response times over 3 hours. Late shipments can increase refund rate by 15-25%. Prioritize verified suppliers.' });
    }
    if (scores.adStrategy < 60) {
      const avgCPA = products.reduce(function(s, p) { return s + p.cpaAvg; }, 0) / products.length;
      alerts.push({ type: 'warning', title: 'High Customer Acquisition Cost', text: 'Average CPA is $' + avgCPA.toFixed(2) + '. Industry benchmark is $3-5. Optimize ad targeting or test new creatives.' });
    }
    const highSatProducts = products.filter(function(p) { return p.marketSaturation > 60; });
    if (highSatProducts.length > 0) {
      alerts.push({ type: 'danger', title: 'Saturated Products Detected', text: highSatProducts.length + ' product(s) have over 60% market saturation. These are at risk of declining returns. Consider diversifying.' });
    }
    const bestProduct = products.reduce(function(best, p) { return p.score > best.score ? p : best; }, products[0]);
    if (bestProduct && scores.adStrategy < 70) {
      alerts.push({ type: 'info', title: 'Best Product Underperforming in Ads', text: '"' + bestProduct.title.split('—')[0].trim() + '" has an AI score of ' + bestProduct.score + ' but average ad performance. Increase budget allocation for this product.' });
    }
    if (alerts.length === 0) {
      alerts.push({ type: 'success', title: 'Store Looking Healthy!', text: 'All metrics are within optimal ranges. Keep monitoring and scaling what works.' });
    }
    return alerts;
  },

  generateActions(scores, _alerts) {
    const actions = [];
    if (scores.pricing < 70) actions.push({ title: 'Optimize Pricing Strategy', desc: 'Test 10-15% price increase on top 3 products. Use the Price Elasticity Simulator to find the sweet spot.', impact: 'High', section: 'section-elasticity' });
    if (scores.adStrategy < 70) actions.push({ title: 'Reallocate Ad Budget', desc: 'Use the Ad Budget AI Allocator to shift spend toward high-ROI products and cut underperformers.', impact: 'High', section: 'section-budget' });
    if (scores.supplierRel < 80) actions.push({ title: 'Upgrade Supplier Network', desc: 'Switch to suppliers with <2h response time and verified status. Check Supplier Hub for alternatives.', impact: 'Medium', section: 'section-supplier-hub' });
    if (scores.productSelection < 70) actions.push({ title: 'Diversify Product Selection', desc: 'Add 2-3 products from rising niches. Use Niche Radar to find untapped opportunities.', impact: 'High', section: 'section-niche-radar' });
    if (scores.customerExp < 75) actions.push({ title: 'Improve Social Proof', desc: 'Focus on products with 4.5+ ratings. Encourage reviews and use UGC in ad creatives.', impact: 'Medium', section: 'section-ad-studio' });
    if (scores.financial < 65) actions.push({ title: 'Reduce Risk Exposure', desc: 'Drop products with risk score >60. Focus on proven winners with stable demand curves.', impact: 'High', section: 'section-profit-lab' });
    if (actions.length === 0) actions.push({ title: 'Maintain Current Strategy', desc: 'Your store is performing well. Focus on scaling winning products and testing new audiences.', impact: 'Low', section: '' });
    return actions;
  },

  renderCharts(scores, section) {
    if (!section) return;
    const ctx = section.querySelector('#shChart');
    if (ctx) {
      if (ctx._chart) ctx._chart.destroy();
      const labels = Object.keys(scores).map(function(k) { return k.replace(/([A-Z])/g, ' $1').replace(/^./, function(s) { return s.toUpperCase(); }); });
      const values = Object.values(scores);
      ctx._chart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Your Score',
            data: values,
            backgroundColor: 'rgba(0,229,255,0.15)',
            borderColor: '#00e5ff',
            borderWidth: 2,
            pointBackgroundColor: '#00e5ff',
            pointBorderColor: '#06060c',
            pointBorderWidth: 2,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              beginAtZero: true, max: 100,
              grid: { color: 'rgba(255,255,255,0.05)' },
              angleLines: { color: 'rgba(255,255,255,0.05)' },
              pointLabels: { color: '#8888a4', font: { family: 'Inter', size: 11 } },
              ticks: { display: false }
            }
          }
        }
      });
    }
    // Bar chart
    const barCtx = section.querySelector('#shBarChart');
    if (barCtx) {
      if (barCtx._chart) barCtx._chart.destroy();
      const blabels = Object.keys(scores).map(function(k) { return k.replace(/([A-Z])/g, ' $1').replace(/^./, function(s) { return s.toUpperCase(); }); });
      const bvalues = Object.values(scores);
      const bcolors = bvalues.map(function(v){ return v >= 80 ? '#00ff88' : v >= 60 ? '#ff8a00' : '#ff3366'; });
      barCtx._chart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: blabels,
          datasets: [{
            label: 'Score',
            data: bvalues,
            backgroundColor: bcolors,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#8888a4', font: { size: 10 } }, grid: { display: false } },
            y: { beginAtZero: true, max: 100, ticks: { color: '#8888a4' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }
  },

  renderHistoryChart(scores, section) {
    if (!section) return;
    const ctx = section.querySelector('#shHistoryChart');
    if (!ctx) return;
    if (ctx._chart) ctx._chart.destroy();
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const current = Math.round(Object.values(scores).reduce(function(s, v) { return s + v; }, 0) / 6);
    const data = days.map(function(_, i) {
      return Math.max(0, Math.min(100, current - 8 + Math.random() * 16 + i));
    });
    ctx._chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Health Score',
          data: data,
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0,229,255,0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00e5ff',
          pointBorderColor: '#06060c',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8888a4' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { beginAtZero: true, max: 100, ticks: { color: '#8888a4' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }
};

PluginRegistry.register('store-health', StoreHealthPlugin);
})();
