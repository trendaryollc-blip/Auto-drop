// ============================================================================
// PLUGIN: Supplier Check — Reliability scoring, risk alerts, backup matching
// ============================================================================
(function () {
  const { PluginRegistry, UI, Config } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(String(s || ''));

  const SUPPLIER_DATABASE = [
    {
      name: 'TechGear Direct', platform: 'AliExpress', location: 'Shenzhen, China',
      specialty: 'Electronics', rating: 4.8, orders: '152000', verified: true,
      responseRate: 98, responseTime: '1h', fulfillmentRate: 99.2, disputeRate: 0.8,
      quality: 92, communication: 95, value: 88, shipTime: '7-12', shipCost: 'Free',
      minOrder: '1', paymentTerms: 'PayPal, T/T', color: '#06b6d4',
      sampleAvailable: true, customPackaging: true, dropshipSupport: true,
      yearsActive: 6, topProducts: ['Wireless Earbuds Pro', 'Smart Watch X200', 'USB-C Hub 7-in-1', 'Bluetooth Speaker Boom'],
      velocityData: { salesGrowth30d: 18, ratingTrend: 'up', newProducts30d: 4, responseTimeTrend: 'faster' },
    },
    {
      name: 'SmartHome US', platform: 'Amazon', location: 'Austin, TX',
      specialty: 'Smart Home', rating: 4.9, orders: '89000', verified: true,
      responseRate: 100, responseTime: '30min', fulfillmentRate: 99.8, disputeRate: 0.3,
      quality: 96, communication: 98, value: 85, shipTime: '3-5', shipCost: '$3.50',
      minOrder: '10', paymentTerms: 'Net 30', color: '#8b5cf6',
      sampleAvailable: true, customPackaging: true, dropshipSupport: true,
      yearsActive: 4, topProducts: ['Smart Thermostat Elite', 'Motion Sensor Light', 'Smart Plug Hub', 'WiFi Camera 4K'],
      velocityData: { salesGrowth30d: 25, ratingTrend: 'up', newProducts30d: 6, responseTimeTrend: 'faster' },
    },
    {
      name: 'PetEase Supplies', platform: 'CJ Dropshipping', location: 'Yiwu, China',
      specialty: 'Pet Products', rating: 4.6, orders: '234000', verified: true,
      responseRate: 92, responseTime: '2h', fulfillmentRate: 96.5, disputeRate: 1.2,
      quality: 84, communication: 80, value: 90, shipTime: '10-18', shipCost: 'Free',
      minOrder: '1', paymentTerms: 'PayPal, Credit Card', color: '#10b981',
      sampleAvailable: true, customPackaging: false, dropshipSupport: true,
      yearsActive: 8, topProducts: ['Automatic Pet Feeder', 'Cat Tree Tower Deluxe', 'Pet Grooming Kit', 'Dog Harness Adjustable'],
      velocityData: { salesGrowth30d: 8, ratingTrend: 'stable', newProducts30d: 2, responseTimeTrend: 'stable' },
    },
    {
      name: 'BeautyGlow Co', platform: 'Alibaba', location: 'Guangzhou, China',
      specialty: 'Beauty & Cosmetics', rating: 4.5, orders: '410000', verified: true,
      responseRate: 90, responseTime: '3h', fulfillmentRate: 94.0, disputeRate: 2.1,
      quality: 78, communication: 82, value: 86, shipTime: '10-15', shipCost: '$2.00',
      minOrder: '50', paymentTerms: 'T/T, L/C', color: '#ec4899',
      sampleAvailable: true, customPackaging: true, dropshipSupport: false,
      yearsActive: 10, topProducts: ['Organic Face Serum', 'Vitamin C Brightening Cream', 'Hyaluronic Acid Moisturizer', 'Retinol Night Oil'],
      velocityData: { salesGrowth30d: -2, ratingTrend: 'down', newProducts30d: 1, responseTimeTrend: 'slower' },
    },
    {
      name: 'FitGear Pro', platform: 'Amazon', location: 'Los Angeles, CA',
      specialty: 'Fitness Equipment', rating: 4.9, orders: '67000', verified: true,
      responseRate: 99, responseTime: '45min', fulfillmentRate: 99.5, disputeRate: 0.5,
      quality: 94, communication: 96, value: 82, shipTime: '2-4', shipCost: '$5.99',
      minOrder: '5', paymentTerms: 'Net 15, Credit Card', color: '#f97316',
      sampleAvailable: false, customPackaging: true, dropshipSupport: true,
      yearsActive: 3, topProducts: ['Resistance Bands Set', 'Adjustable Dumbbells', 'Yoga Mat Premium', 'Foam Roller Pro'],
      velocityData: { salesGrowth30d: 32, ratingTrend: 'up', newProducts30d: 7, responseTimeTrend: 'faster' },
    },
    {
      name: 'Global Textile Co', platform: '1688', location: 'Hangzhou, China',
      specialty: 'Textiles & Apparel', rating: 4.3, orders: '520000', verified: false,
      responseRate: 85, responseTime: '6h', fulfillmentRate: 91.0, disputeRate: 3.5,
      quality: 72, communication: 68, value: 80, shipTime: '15-25', shipCost: '$1.50',
      minOrder: '100', paymentTerms: 'T/T', color: '#6366f1',
      sampleAvailable: false, customPackaging: true, dropshipSupport: false,
      yearsActive: 12, topProducts: ['Cotton T-Shirt Bulk', 'Hoodie Fleece Lined', 'Denim Jacket Classic', 'Active Leggings'],
      velocityData: { salesGrowth30d: 5, ratingTrend: 'stable', newProducts30d: 3, responseTimeTrend: 'stable' },
    },
  ];

  function computeScore(s) {
    let r = 0;
    if (s.verified) r += 20;
    r += (s.rating / 5) * 30;
    const o = parseInt(String(s.orders).replace(/[^0-9]/g, '')) || 0;
    if (o > 200000) r += 15;
    else if (o > 100000) r += 10;
    else r += 5;
    r += s.responseRate * 0.15;
    r += (100 - s.disputeRate * 10) * 0.1;
    r += s.fulfillmentRate * 0.1;
    return Math.min(100, Math.round(r));
  }

  function getRiskLevel(s) {
    let risk = 0;
    if (!s.verified) risk += 30;
    if (s.rating < 4.5) risk += 15;
    if (s.disputeRate > 1.5) risk += 20;
    if (s.responseRate < 90) risk += 15;
    const o = parseInt(String(s.orders).replace(/[^0-9]/g, '')) || 0;
    if (o < 50000) risk += 10;
    if (risk > 40) return { level: 'HIGH', color: 'var(--accent-red)', pct: risk };
    if (risk > 20) return { level: 'MEDIUM', color: 'var(--accent-orange)', pct: risk };
    return { level: 'LOW', color: 'var(--accent-green)', pct: risk };
  }

  function getGrade(score) {
    if (score >= 90) return { grade: 'A+', color: 'var(--accent-green)' };
    if (score >= 80) return { grade: 'A', color: 'var(--accent-green)' };
    if (score >= 70) return { grade: 'B+', color: 'var(--accent-cyan)' };
    if (score >= 60) return { grade: 'B', color: 'var(--accent-cyan)' };
    if (score >= 50) return { grade: 'C', color: 'var(--accent-orange)' };
    return { grade: 'D', color: 'var(--accent-red)' };
  }

  const SupplierIntelligencePlugin = {
    id: 'supplier-intelligence',
    name: 'Supplier Check',
    version: '2.0.0',
    description: 'Deep supplier verification, reliability scoring, risk alerts & backup matching',
    _section: null,
    _analyzed: null,

    init(_ctx) {
      Config.defaults('supplierIntel', { enabled: true });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;

      const self = SupplierIntelligencePlugin;
      self._analyzed = SUPPLIER_DATABASE.map(function (s) {
        const score = computeScore(s);
        const risk = getRiskLevel(s);
        const grade = getGrade(score);
        return { supplier: s, score: score, risk: risk, grade: grade };
      }).sort(function (a, b) {
        return b.score - a.score;
      });

      const analyzed = self._analyzed;
      const avgScore = Math.round(
        analyzed.reduce(function (a, x) {
          return a + x.score;
        }, 0) / analyzed.length
      );
      const verifiedCount = analyzed.filter(function (x) {
        return x.supplier.verified;
      }).length;
      const highRisk = analyzed.filter(function (x) {
        return x.risk.level === 'HIGH';
      });
      const avgResponse = (
        analyzed.reduce(function (a, x) {
          return a + x.supplier.responseRate;
        }, 0) / analyzed.length
      ).toFixed(1);

      const section = document.createElement('section');
      section.className = 'section section-supplier-intel';
      section.id = 'section-supplier-intel';
      section.innerHTML = `
      <div class="section-inner">
        <div class="sci-hero">
          <div class="sci-hero-badge"><span class="sci-hero-badge-dot"></span>Supplier Verification</div>
          <h2 class="sci-hero-title">Supplier Intelligence</h2>
          <p class="sci-hero-desc">Deep verification, reliability scoring, risk alerts & backup matching for every supplier</p>
        </div>

        <!-- OVERVIEW STATS -->
        <div class="sci-overview">
          <div class="sci-stat-card"><div class="sci-stat-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🔍</div><div class="sci-stat-info"><div class="sci-stat-value">${analyzed.length}</div><div class="sci-stat-label">Suppliers Checked</div></div></div>
          <div class="sci-stat-card"><div class="sci-stat-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">✅</div><div class="sci-stat-info"><div class="sci-stat-value">${verifiedCount}</div><div class="sci-stat-label">Verified</div></div></div>
          <div class="sci-stat-card"><div class="sci-stat-icon" style="background:rgba(255,215,0,0.12);color:var(--accent-yellow)">📊</div><div class="sci-stat-info"><div class="sci-stat-value">${avgScore}%</div><div class="sci-stat-label">Avg Score</div></div></div>
          <div class="sci-stat-card"><div class="sci-stat-icon" style="background:rgba(255,138,0,0.12);color:var(--accent-orange)">⏱️</div><div class="sci-stat-info"><div class="sci-stat-value">${avgResponse}%</div><div class="sci-stat-label">Avg Response Rate</div></div></div>
          <div class="sci-stat-card"><div class="sci-stat-icon" style="background:${highRisk.length > 0 ? 'rgba(255,51,102,0.12)' : 'var(--accent-green-dim)'};color:${highRisk.length > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">⚠️</div><div class="sci-stat-info"><div class="sci-stat-value">${highRisk.length}</div><div class="sci-stat-label">At-Risk</div></div></div>
        </div>

        <!-- RISK ALERTS -->
        <div class="sci-section">
          <h3 class="sci-section-title">🚨 Risk Alerts</h3>
          <p class="sci-section-sub">Suppliers that need immediate attention</p>
          <div class="sci-risk-list" id="sciRiskList"></div>
        </div>

        <!-- SUPPLIER SCOREBOARD -->
        <div class="sci-section">
          <h3 class="sci-section-title">📊 Supplier Scoreboard</h3>
          <p class="sci-section-sub">Reliability scores ranked from best to worst</p>
          <div class="sci-table-wrap">
            <table class="sci-table">
              <thead><tr><th>#</th><th>Supplier</th><th>Platform</th><th>Grade</th><th>Score</th><th>Risk</th><th>Response</th><th>Fulfillment</th><th>Disputes</th><th>Years</th></tr></thead>
              <tbody id="sciScoreBody"></tbody>
            </table>
          </div>
        </div>

        <!-- SCORE BREAKDOWN CARDS -->
        <div class="sci-section">
          <h3 class="sci-section-title">🎯 Score Breakdown</h3>
          <p class="sci-section-sub">Detailed metrics for each supplier</p>
          <div class="sci-breakdown-grid" id="sciBreakdownGrid"></div>
        </div>

        <!-- VERIFICATION CHECKLIST -->
        <div class="sci-section">
          <h3 class="sci-section-title">✅ Verification Checklist</h3>
          <p class="sci-section-sub">What we check for every supplier</p>
          <div class="sci-checklist" id="sciChecklist"></div>
        </div>

        <!-- BACKUP SUPPLIER MATCHER -->
        <div class="sci-section">
          <h3 class="sci-section-title">🔄 Backup Supplier Matcher</h3>
          <p class="sci-section-sub">Best alternatives if your primary supplier fails</p>
          <div class="sci-backup-grid" id="sciBackupGrid"></div>
        </div>

        <!-- SUPPLIER HEALTH TIPS -->
        <div class="sci-section">
          <h3 class="sci-section-title">💡 Supplier Health Tips</h3>
          <p class="sci-section-sub">Best practices to maintain strong supplier relationships</p>
          <div class="sci-tips-grid" id="sciTipsGrid"></div>
        </div>

        ${window.HuntDrop.renderRelatedTools([
          {
            section: 'section-supplier-hub',
            name: 'Find Suppliers',
            desc: 'Browse supplier directory',
            icon: '🏭',
            color: '#06b6d4',
          },
          {
            section: 'section-profit-lab',
            name: 'Profit Calculator',
            desc: 'Calculate margins',
            icon: '🧮',
            color: '#4ECDC4',
          },
          { section: 'section-health', name: 'Store Health', desc: 'Check readiness', icon: '❤️', color: '#45B7D1' },
        ])}
      </div>`;
      container.appendChild(section);
      self._section = section;

      // Create detail panel at body level to escape section stacking context
      var sciPanel = document.createElement('div');
      sciPanel.id = 'sciDetailPanel';
      sciPanel.className = 'sci-detail-panel';
      document.body.appendChild(sciPanel);

      self.renderRiskAlerts(analyzed);
      self.renderScoreboard(analyzed);
      self.renderBreakdown(analyzed);
      self.renderChecklist();
      self.renderBackups();
      self.renderTips();
    },

    showDetail(supplier) {
      const self = this;
      const panel = document.getElementById('sciDetailPanel');
      if (!panel) return;
      const score = computeScore(supplier);
      const risk = getRiskLevel(supplier);
      const grade = getGrade(score);

      panel.innerHTML = `
      <div class="sci-detail-overlay" id="sciDetailClose"></div>
      <div class="sci-detail-content">
        <button class="sci-detail-close" id="sciDetailCloseBtn" aria-label="Close detail panel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div class="sci-detail-hero">
          <div class="sci-detail-avatar" style="background:${esc(supplier.color)}22;color:${esc(supplier.color)};border:2px solid ${esc(supplier.color)}">${esc(supplier.name.charAt(0))}</div>
          <div class="sci-detail-hero-info">
            <h2 class="sci-detail-name">${esc(supplier.name)}</h2>
            <div class="sci-detail-meta">${esc(supplier.platform)} • ${esc(supplier.location)} • ${esc(supplier.specialty)}</div>
            <div class="sci-detail-badges">
              <span class="sci-detail-badge" style="background:${esc(grade.color)}18;color:${esc(grade.color)}">Grade ${esc(grade.grade)}</span>
              <span class="sci-detail-badge" style="background:var(--accent-yellow-dim);color:var(--accent-yellow)">${esc(supplier.rating)}★</span>
              <span class="sci-detail-badge" style="background:${esc(risk.color)}18;color:${esc(risk.color)}">${esc(risk.level)} RISK</span>
              ${supplier.verified ? '<span class="sci-detail-badge" style="background:var(--accent-green-dim);color:var(--accent-green)">✓ Verified</span>' : ''}
            </div>
          </div>
          <div class="sci-detail-score-ring">
            <svg viewBox="0 0 100 100" class="sci-detail-ring-svg">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-primary)" stroke-width="6"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke="${score >= 90 ? 'var(--accent-green)' : score >= 80 ? 'var(--accent-cyan)' : 'var(--accent-orange)'}" stroke-width="6" stroke-dasharray="264" stroke-dashoffset="${264 - (264 * score) / 100}" stroke-linecap="round" transform="rotate(-90 50 50)" style="transition:stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)"/>
            </svg>
            <div class="sci-detail-score-val">${score}</div>
            <div class="sci-detail-score-label">Score</div>
          </div>
        </div>

        <div class="sci-detail-grid">
          <div class="sci-detail-card">
            <h4>📊 Key Metrics</h4>
            <div class="sci-detail-metrics">
              <div class="sci-detail-m"><span class="sci-detail-m-label">Total Orders</span><span class="sci-detail-m-val">${esc(supplier.orders)}</span></div>
              <div class="sci-detail-m"><span class="sci-detail-m-label">Products</span><span class="sci-detail-m-val">${esc(supplier.topProducts ? supplier.topProducts.length : 0)}</span></div>
              <div class="sci-detail-m"><span class="sci-detail-m-label">Response Time</span><span class="sci-detail-m-val">${esc(supplier.responseTime)}</span></div>
              <div class="sci-detail-m"><span class="sci-detail-m-label">Response Rate</span><span class="sci-detail-m-val">${esc(supplier.responseRate)}%</span></div>
              <div class="sci-detail-m"><span class="sci-detail-m-label">Fulfillment Rate</span><span class="sci-detail-m-val">${esc(supplier.fulfillmentRate)}%</span></div>
              <div class="sci-detail-m"><span class="sci-detail-m-label">Dispute Rate</span><span class="sci-detail-m-val" style="color:${supplier.disputeRate < 1 ? 'var(--accent-green)' : 'var(--accent-orange)'}">${esc(supplier.disputeRate)}%</span></div>
              <div class="sci-detail-m"><span class="sci-detail-m-label">Years Active</span><span class="sci-detail-m-val">${esc(supplier.yearsActive)} years</span></div>
            </div>
          </div>

          <div class="sci-detail-card">
            <h4>🚚 Shipping Info</h4>
            <div class="sci-detail-metrics">
              <div class="sci-detail-m"><span class="sci-detail-m-label">Ship Time</span><span class="sci-detail-m-val">${esc(supplier.shipTime)}</span></div>
              <div class="sci-detail-m"><span class="sci-detail-m-label">Ship Cost</span><span class="sci-detail-m-val">${esc(supplier.shipCost)}</span></div>
              <div class="sci-detail-m"><span class="sci-detail-m-label">Min Order</span><span class="sci-detail-m-val">${esc(supplier.minOrder)}</span></div>
            </div>
          </div>

          <div class="sci-detail-card">
            <h4>🏆 Top Products</h4>
            <div class="sci-detail-products">
              ${(supplier.topProducts || [])
                .map(function (p) {
                  return (
                    '<span class="sci-detail-product-chip" tabindex="0" role="button" aria-label="Search for ' +
                    p +
                    '" data-product="' +
                    p +
                    '">' +
                    p +
                    '</span>'
                  );
                })
                .join('')}
            </div>
          </div>
        </div>

        <div class="sci-detail-score-bars">
          <h4>🎯 Score Breakdown</h4>
          <div class="sci-detail-bars">
            <div class="sci-detail-bar-row"><span class="sci-detail-bar-label">Quality</span><div class="sci-detail-bar-track"><div class="sci-detail-bar-fill" style="width:${supplier.quality}%;background:var(--accent-green)"></div></div><span class="sci-detail-bar-val">${supplier.quality}</span></div>
            <div class="sci-detail-bar-row"><span class="sci-detail-bar-label">Communication</span><div class="sci-detail-bar-track"><div class="sci-detail-bar-fill" style="width:${supplier.communication}%;background:var(--accent-cyan)"></div></div><span class="sci-detail-bar-val">${supplier.communication}</span></div>
            <div class="sci-detail-bar-row"><span class="sci-detail-bar-label">Value</span><div class="sci-detail-bar-track"><div class="sci-detail-bar-fill" style="width:${supplier.value}%;background:var(--accent-purple)"></div></div><span class="sci-detail-bar-val">${supplier.value}</span></div>
            <div class="sci-detail-bar-row"><span class="sci-detail-bar-label">Response Rate</span><div class="sci-detail-bar-track"><div class="sci-detail-bar-fill" style="width:${supplier.responseRate}%;background:var(--accent-yellow)"></div></div><span class="sci-detail-bar-val">${supplier.responseRate}%</span></div>
            <div class="sci-detail-bar-row"><span class="sci-detail-bar-label">Fulfillment</span><div class="sci-detail-bar-track"><div class="sci-detail-bar-fill" style="width:${supplier.fulfillmentRate}%;background:var(--accent-green)"></div></div><span class="sci-detail-bar-val">${supplier.fulfillmentRate}%</span></div>
          </div>
        </div>

        <div class="sci-detail-actions">
          <button class="sci-detail-action-btn sci-detail-primary" onclick="window.HuntDrop.navigateTo('section-profit-lab')">💰 Calculate Profit</button>
          <button class="sci-detail-action-btn" onclick="window.HuntDrop.navigateTo('section-ad-studio')">🎬 Create Ads</button>
          <button class="sci-detail-action-btn" onclick="window.HuntDrop.navigateTo('section-supplier-hub')">🏭 Find Suppliers</button>
        </div>
      </div>`;
      panel.classList.add('sci-detail-open');

      const closeBtn = panel.querySelector('#sciDetailCloseBtn');
      const overlay = panel.querySelector('#sciDetailClose');
      const closeDetail = function () {
        panel.classList.remove('sci-detail-open');
        panel.innerHTML = '';
      };
      if (closeBtn) closeBtn.addEventListener('click', closeDetail);
      if (overlay) overlay.addEventListener('click', closeDetail);

      panel.querySelectorAll('.sci-detail-product-chip').forEach(function (chip) {
        const handler = function () {
          const productName = chip.dataset.product;
          if (productName && window.HuntDrop.navigateTo) {
            closeDetail();
            setTimeout(function () {
              const searchInput = document.querySelector('.search-input, #searchInput');
              if (searchInput) {
                searchInput.value = productName;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
              window.HuntDrop.navigateTo('section-product-hunt');
            }, 350);
          }
        };
        chip.addEventListener('click', handler);
        chip.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler();
          }
        });
      });
    },

    renderRiskAlerts(analyzed) {
      const self = this;
      const riskList = self._section ? self._section.querySelector('#sciRiskList') : null;
      if (!riskList) return;
      const risks = analyzed.filter(function (x) {
        return x.risk.level !== 'LOW';
      });
      if (risks.length === 0) {
        riskList.innerHTML =
          '<div class="sci-no-risk"><span style="font-size:32px">🎉</span><div>All suppliers are healthy — no alerts</div></div>';
        return;
      }
      riskList.innerHTML = risks
        .map(function (x) {
          const s = x.supplier;
          const reasons = [];
          if (!s.verified) reasons.push('Not verified');
          if (s.rating < 4.5) reasons.push('Low rating');
          if (s.disputeRate > 1.5) reasons.push('High dispute rate (' + s.disputeRate + '%)');
          if (s.responseRate < 90) reasons.push('Low response rate (' + s.responseRate + '%)');
          return (
            '<div class="sci-risk-card" tabindex="0" role="button" aria-label="View ' +
            esc(s.name) +
            ' details" data-name="' +
            esc(s.name) +
            '" style="border-left:3px solid ' +
            esc(x.risk.color) +
            '">' +
            '<div class="sci-risk-header">' +
            '<div class="sci-risk-avatar" style="background:' +
            esc(x.risk.color) +
            '22;color:' +
            esc(x.risk.color) +
            '">' +
            esc(s.name.charAt(0)) +
            '</div>' +
            '<div><div class="sci-risk-name">' +
            esc(s.name) +
            '</div><div class="sci-risk-platform">' +
            esc(s.platform) +
            ' · ' +
            esc(s.location) +
            '</div></div>' +
            '<div class="sci-risk-badge" style="background:' +
            esc(x.risk.color) +
            '18;color:' +
            esc(x.risk.color) +
            ';border:1px solid ' +
            esc(x.risk.color) +
            '44">' +
            esc(x.risk.level) +
            ' RISK</div>' +
            '</div>' +
            '<div class="sci-risk-reasons">' +
            reasons
              .map(function (r) {
                return '<span class="sci-risk-reason">⚠ ' + esc(r) + '</span>';
              })
              .join('') +
            '</div>' +
            '<div class="sci-risk-view">View Details →</div>' +
            '</div>'
          );
        })
        .join('');

      riskList.querySelectorAll('.sci-risk-card').forEach(function (card) {
        const handler = function () {
          const s = analyzed.find(function (x) {
            return x.supplier.name === card.dataset.name;
          });
          if (s) self.showDetail(s.supplier);
        };
        card.addEventListener('click', handler);
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler();
          }
        });
      });
    },

    renderScoreboard(analyzed) {
      const self = this;
      const scoreBody = self._section ? self._section.querySelector('#sciScoreBody') : null;
      if (!scoreBody) return;
      scoreBody.innerHTML = analyzed
        .map(function (x, i) {
          const s = x.supplier;
          return (
            '<tr tabindex="0" role="button" aria-label="View ' +
            esc(s.name) +
            ' details" data-name="' +
            esc(s.name) +
            '">' +
            '<td class="sci-rank">#' +
            (i + 1) +
            '</td>' +
            '<td><div class="sci-tbl-name"><div class="sci-tbl-avatar" style="background:' +
            esc(s.color) +
            '22;color:' +
            esc(s.color) +
            '">' +
            esc(s.name.charAt(0)) +
            '</div>' +
            esc(s.name) +
            '</div></td>' +
            '<td>' +
            esc(s.platform) +
            '</td>' +
            '<td><span class="sci-grade" style="background:' +
            esc(x.grade.color) +
            '18;color:' +
            esc(x.grade.color) +
            '">' +
            esc(x.grade.grade) +
            '</span></td>' +
            '<td><span class="sci-tbl-score" style="color:' +
            esc(x.grade.color) +
            '">' +
            x.score +
            '</span></td>' +
            '<td><span class="sci-risk-pill" style="background:' +
            esc(x.risk.color) +
            '18;color:' +
            esc(x.risk.color) +
            '">' +
            esc(x.risk.level) +
            '</span></td>' +
            '<td>' +
            s.responseRate +
            '%</td>' +
            '<td>' +
            s.fulfillmentRate +
            '%</td>' +
            '<td>' +
            s.disputeRate +
            '%</td>' +
            '<td>' +
            s.yearsActive +
            'yr</td>' +
            '</tr>'
          );
        })
        .join('');

      scoreBody.querySelectorAll('tr').forEach(function (row) {
        const handler = function () {
          const s = analyzed.find(function (x) {
            return x.supplier.name === row.dataset.name;
          });
          if (s) self.showDetail(s.supplier);
        };
        row.addEventListener('click', handler);
        row.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler();
          }
        });
      });
    },

    renderBreakdown(analyzed) {
      const self = this;
      const breakdownGrid = self._section ? self._section.querySelector('#sciBreakdownGrid') : null;
      if (!breakdownGrid) return;
      breakdownGrid.innerHTML = analyzed
        .map(function (x) {
          const s = x.supplier;
          return (
            '<div class="sci-bd-card" tabindex="0" role="button" aria-label="View ' +
            s.name +
            ' breakdown" data-name="' +
            s.name +
            '">' +
            '<div class="sci-bd-header">' +
            '<div class="sci-bd-avatar" style="background:' +
            s.color +
            '22;color:' +
            s.color +
            '">' +
            s.name.charAt(0) +
            '</div>' +
            '<div><div class="sci-bd-name">' +
            s.name +
            '</div><div class="sci-bd-platform">' +
            s.platform +
            '</div></div>' +
            '<div class="sci-bd-grade" style="background:' +
            x.grade.color +
            '18;color:' +
            x.grade.color +
            '">' +
            x.grade.grade +
            '</div>' +
            '</div>' +
            '<div class="sci-bd-bars">' +
            '<div class="sci-bd-row"><span>Response Rate</span><div class="sci-bd-bar"><div class="sci-bd-bar-fill" style="width:' +
            s.responseRate +
            '%;background:var(--accent-cyan)"></div></div><span>' +
            s.responseRate +
            '%</span></div>' +
            '<div class="sci-bd-row"><span>Fulfillment</span><div class="sci-bd-bar"><div class="sci-bd-bar-fill" style="width:' +
            s.fulfillmentRate +
            '%;background:var(--accent-green)"></div></div><span>' +
            s.fulfillmentRate +
            '%</span></div>' +
            '<div class="sci-bd-row"><span>Rating</span><div class="sci-bd-bar"><div class="sci-bd-bar-fill" style="width:' +
            (s.rating / 5) * 100 +
            '%;background:var(--accent-yellow)"></div></div><span>' +
            s.rating +
            '★</span></div>' +
            '<div class="sci-bd-row"><span>Dispute Rate</span><div class="sci-bd-bar"><div class="sci-bd-bar-fill" style="width:' +
            Math.min(100, s.disputeRate * 20) +
            '%;background:var(--accent-red)"></div></div><span>' +
            s.disputeRate +
            '%</span></div>' +
            '</div>' +
            '<div class="sci-bd-footer"><span class="sci-bd-specialty">🏷️ ' +
            s.specialty +
            '</span><span class="sci-bd-years">📅 ' +
            s.yearsActive +
            ' years</span></div>' +
            '</div>'
          );
        })
        .join('');

      breakdownGrid.querySelectorAll('.sci-bd-card').forEach(function (card) {
        const handler = function () {
          const s = analyzed.find(function (x) {
            return x.supplier.name === card.dataset.name;
          });
          if (s) self.showDetail(s.supplier);
        };
        card.addEventListener('click', handler);
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler();
          }
        });
      });
    },

    renderChecklist() {
      const self = this;
      const checklist = self._section ? self._section.querySelector('#sciChecklist') : null;
      if (!checklist) return;
      const items = [
        {
          icon: '📋',
          title: 'Business License',
          desc: 'Valid import/export registration and business permits',
          weight: '20%',
        },
        {
          icon: '⭐',
          title: 'Order History',
          desc: 'Minimum 1000+ completed orders with consistent volume',
          weight: '15%',
        },
        {
          icon: '💬',
          title: 'Response Time',
          desc: 'Average response under 2 hours during business hours',
          weight: '15%',
        },
        {
          icon: '📦',
          title: 'Fulfillment Rate',
          desc: 'Order fulfillment above 95% with tracking provided',
          weight: '15%',
        },
        { icon: '🔄', title: 'Return Policy', desc: 'Clear refund process with <5% dispute rate', weight: '10%' },
        { icon: '🛡️', title: 'Verified Status', desc: 'Platform-verified supplier badge displayed', weight: '10%' },
        { icon: '📊', title: 'Product Quality', desc: 'Sample inspection pass rate above 90%', weight: '10%' },
        {
          icon: '🤝',
          title: 'Communication',
          desc: 'Professional communication with English proficiency',
          weight: '5%',
        },
      ];
      checklist.innerHTML = items
        .map(function (i) {
          return (
            '<div class="sci-check-item">' +
            '<div class="sci-check-icon">' +
            i.icon +
            '</div>' +
            '<div class="sci-check-info"><div class="sci-check-title">' +
            i.title +
            '</div><div class="sci-check-desc">' +
            i.desc +
            '</div></div>' +
            '<div class="sci-check-weight">' +
            i.weight +
            '</div>' +
            '</div>'
          );
        })
        .join('');
    },

    renderBackups() {
      const self = this;
      const backupGrid = self._section ? self._section.querySelector('#sciBackupGrid') : null;
      if (!backupGrid) return;
      const backups = [
        {
          category: 'Electronics',
          primary: 'TechGear Direct',
          backup: 'SwiftSource Direct',
          reason: 'Higher fulfillment rate (99.1%)',
          score: 92,
        },
        {
          category: 'Smart Home',
          primary: 'SmartHome US',
          backup: 'PostureTech',
          reason: 'Similar specialty with faster shipping',
          score: 88,
        },
        {
          category: 'Pet Products',
          primary: 'PetEase Supplies',
          backup: 'NexGen Supply',
          reason: 'Verified with 410K orders',
          score: 85,
        },
        {
          category: 'Beauty',
          primary: 'BeautyGlow Co',
          backup: 'QuickShip Asia',
          reason: 'Lower dispute rate (0.9%)',
          score: 90,
        },
        {
          category: 'Fitness',
          primary: 'FitGear Pro',
          backup: 'PrimeSource Hub',
          reason: 'US-based for faster delivery',
          score: 82,
        },
        {
          category: 'Kitchen',
          primary: 'KitchenWiz',
          backup: 'TradeBridge Co',
          reason: 'Higher response rate (97%)',
          score: 86,
        },
      ];
      backupGrid.innerHTML = backups
        .map(function (b) {
          return (
            '<div class="sci-backup-card" tabindex="0" role="button" aria-label="Compare ' +
            esc(b.primary) +
            ' with ' +
            esc(b.backup) +
            '" data-primary="' +
            esc(b.primary) +
            '" data-backup="' +
            esc(b.backup) +
            '">' +
            '<div class="sci-backup-category">' +
            esc(b.category) +
            '</div>' +
            '<div class="sci-backup-flow">' +
            '<div class="sci-backup-box sci-backup-primary"><div class="sci-backup-label">Primary</div><div class="sci-backup-name">' +
            b.primary +
            '</div></div>' +
            '<div class="sci-backup-arrow">→</div>' +
            '<div class="sci-backup-box sci-backup-alt"><div class="sci-backup-label">Backup</div><div class="sci-backup-name">' +
            b.backup +
            '</div></div>' +
            '</div>' +
            '<div class="sci-backup-reason">💡 ' +
            b.reason +
            '</div>' +
            '<div class="sci-backup-score">Match Score: <strong>' +
            b.score +
            '%</strong></div>' +
            '</div>'
          );
        })
        .join('');

      backupGrid.querySelectorAll('.sci-backup-card').forEach(function (card) {
        const handler = function () {
          const primaryName = card.dataset.primary;
          const analyzed = self._analyzed || [];
          const found = analyzed.find(function (x) {
            return x.supplier.name === primaryName;
          });
          if (found) self.showDetail(found.supplier);
          else window.HuntDrop.navigateTo('section-supplier-hub');
        };
        card.addEventListener('click', handler);
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler();
          }
        });
      });
    },

    renderTips() {
      const self = this;
      const tipsGrid = self._section ? self._section.querySelector('#sciTipsGrid') : null;
      if (!tipsGrid) return;
      const tips = [
        {
          icon: '📞',
          title: 'Weekly Check-ins',
          desc: 'Schedule regular communication with top suppliers to stay updated on stock levels and pricing changes',
        },
        {
          icon: '📦',
          title: 'Sample Orders',
          desc: 'Order samples quarterly to verify consistent product quality and packaging standards',
        },
        {
          icon: '📊',
          title: 'Track Metrics',
          desc: 'Monitor fulfillment rate, response time, and dispute rate monthly for each supplier',
        },
        {
          icon: '🔄',
          title: 'Maintain Backups',
          desc: 'Always have at least 2 backup suppliers ready for each product category',
        },
        {
          icon: '💰',
          title: 'Negotiate Terms',
          desc: 'Leverage order volume to negotiate better pricing, payment terms, and shipping rates',
        },
        {
          icon: '📝',
          title: 'Document Everything',
          desc: 'Keep records of all agreements, pricing quotes, and communication for dispute resolution',
        },
      ];
      tipsGrid.innerHTML = tips
        .map(function (t) {
          return (
            '<div class="sci-tip-card" tabindex="0" role="button" aria-label="' +
            t.title +
            '" data-tip="' +
            t.title +
            '">' +
            '<div class="sci-tip-icon">' +
            t.icon +
            '</div>' +
            '<div class="sci-tip-title">' +
            t.title +
            '</div>' +
            '<div class="sci-tip-desc">' +
            t.desc +
            '</div>' +
            '</div>'
          );
        })
        .join('');

      tipsGrid.querySelectorAll('.sci-tip-card').forEach(function (card) {
        const handler = function () {
          window.HuntDrop.navigateTo('section-supplier-hub');
        };
        card.addEventListener('click', handler);
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler();
          }
        });
      });
    },

    unmount(_ctx) {
      const el = UI.$('section-supplier-intel');
      if (el) el.remove();
      var panel = document.getElementById('sciDetailPanel');
      if (panel) panel.remove();
    },
  };

  PluginRegistry.register('supplier-intelligence', SupplierIntelligencePlugin);
})();
