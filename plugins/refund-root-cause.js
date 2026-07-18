// ============================================================================
// PLUGIN: Refund Root Cause Analysis — Deep-dive into a specific refund reason
// ============================================================================
(function () {
  try {
    const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;
    const esc = (s) => UI.escapeHtml(String(s || ''));

    let _section = null;
    let _cleanups = [];
    let _reasonId = null;

    const REFUND_REASONS = [
      {
        id: 'quality',
        name: 'Product Quality',
        icon: '🔍',
        desc: 'Item not as described, poor materials, defective',
        severity: 'high',
        prevention: 'Improve product selection, order samples before listing',
        tips: [
          'Order samples before listing any product',
          'Compare supplier photos with actual items',
          'Read supplier reviews for quality patterns',
          'Set up quality checkpoints at receiving',
          'Create a quality scoring rubric for each supplier',
        ],
      },
      {
        id: 'damage',
        name: 'Shipping Damage',
        icon: '📦',
        desc: 'Item arrived broken or damaged in transit',
        severity: 'high',
        prevention: 'Use better packaging, switch to tracked/insured shipping',
        tips: [
          'Upgrade to double-walled packaging',
          'Add bubble wrap for fragile items',
          'Switch to tracked shipping methods',
          'Insure high-value shipments',
          'Test packaging with drop tests',
        ],
      },
      {
        id: 'wrong_item',
        name: 'Wrong Item Sent',
        icon: '❌',
        desc: 'Customer received incorrect product or variant',
        severity: 'medium',
        prevention: 'Verify SKU matching with supplier, improve order accuracy',
        tips: [
          'Implement SKU verification with suppliers',
          'Create variant mapping documents',
          'Use barcode scanning for fulfillment',
          'Double-check orders before shipping',
          'Add visual confirmation step',
        ],
      },
      {
        id: 'not_as_described',
        name: 'Not As Described',
        icon: '📸',
        desc: 'Product differs from listing photos/description',
        severity: 'high',
        prevention: 'Use accurate photos, honest descriptions, manage expectations',
        tips: [
          'Use only actual product photos',
          'Write honest, detailed descriptions',
          'Include size charts and measurements',
          'Add disclaimers for color variations',
          'Show product from multiple angles',
        ],
      },
      {
        id: 'late_delivery',
        name: 'Late Delivery',
        icon: '⏰',
        desc: 'Package arrived after expected delivery date',
        severity: 'medium',
        prevention: 'Set realistic delivery estimates, use faster shipping methods',
        tips: [
          'Set delivery windows instead of exact dates',
          'Offer expedited shipping options',
          'Use local warehouses when possible',
          'Communicate proactively about delays',
          'Track and alert on delayed shipments',
        ],
      },
      {
        id: 'buyer_remorse',
        name: 'Buyer Remorse',
        icon: '🤷',
        desc: 'Customer changed mind, no longer wants product',
        severity: 'low',
        prevention: 'Improve product-market fit, better listing targeting',
        tips: [
          'Target ads more precisely',
          'Use retargeting for warm audiences',
          'Improve product descriptions',
          'Add social proof and reviews',
          'Implement post-purchase follow-up',
        ],
      },
      {
        id: 'fraud',
        name: 'Suspected Fraud',
        icon: '🚨',
        desc: 'Suspicious order pattern or chargeback',
        severity: 'critical',
        prevention: 'Implement fraud checks, verify high-value orders',
        tips: [
          'Implement address verification',
          'Use fraud detection tools',
          'Verify high-value orders manually',
          'Set up chargeback alerts',
          'Monitor velocity of orders per IP',
        ],
      },
      {
        id: 'duplicate',
        name: 'Duplicate Order',
        icon: '🔄',
        desc: 'Customer accidentally ordered twice',
        severity: 'low',
        prevention: 'Add order confirmation step, clear cart UX',
        tips: [
          'Add order confirmation dialog',
          'Implement duplicate detection',
          'Clear cart after purchase',
          'Send order confirmation emails',
          'Add quantity limit warnings',
        ],
      },
    ];

    const BENCHMARKS = { ecommerce: 3.0, dropshipping: 5.0, amazon_fba: 1.5, shopify: 4.0 };

    const SAMPLE_REFUNDS = [
      {
        id: 'REF-001',
        orderId: 'ORD-008',
        product: 'Bluetooth Speaker Mini',
        customer: 'Tom H.',
        date: '2026-07-14',
        amount: 22.99,
        cost: 7.5,
        shippingCost: 3.5,
        adCost: 4.0,
        reason: 'damage',
        status: 'completed',
        supplier: 'AliExpress Supplier A',
        platform: 'Shopify',
        notes: 'Speaker arrived with cracked casing — shipping damage',
      },
      {
        id: 'REF-002',
        orderId: 'ORD-012',
        product: 'LED Strip Lights 5m',
        customer: 'Mike R.',
        date: '2026-07-13',
        amount: 18.99,
        cost: 6.5,
        shippingCost: 2.8,
        adCost: 3.0,
        reason: 'quality',
        status: 'completed',
        supplier: 'CJ Dropshipping',
        platform: 'Shopify',
        notes: 'LEDs only half lit — product defect',
      },
      {
        id: 'REF-003',
        orderId: 'ORD-015',
        product: 'Phone Case Set',
        customer: 'Anna B.',
        date: '2026-07-12',
        amount: 12.99,
        cost: 3.2,
        shippingCost: 1.5,
        adCost: 2.5,
        reason: 'wrong_item',
        status: 'pending',
        supplier: 'AliExpress Supplier B',
        platform: 'Amazon',
        notes: 'Ordered black, received blue — SKU mismatch',
      },
      {
        id: 'REF-004',
        orderId: 'ORD-018',
        product: 'Smart Watch Band',
        customer: 'Chris P.',
        date: '2026-07-11',
        amount: 15.99,
        cost: 4.5,
        shippingCost: 2.0,
        adCost: 2.8,
        reason: 'not_as_described',
        status: 'completed',
        supplier: 'AliExpress Supplier A',
        platform: 'Shopify',
        notes: 'Buckle quality much lower than photos showed',
      },
      {
        id: 'REF-005',
        orderId: 'ORD-020',
        product: 'Yoga Mat Premium',
        customer: 'Dana W.',
        date: '2026-07-10',
        amount: 24.99,
        cost: 8.5,
        shippingCost: 5.0,
        adCost: 4.5,
        reason: 'late_delivery',
        status: 'completed',
        supplier: 'CJ Dropshipping',
        platform: 'TikTok Shop',
        notes: 'Took 28 days — customer needed it sooner',
      },
      {
        id: 'REF-006',
        orderId: 'ORD-022',
        product: 'Portable Charger 20000mAh',
        customer: 'Sam L.',
        date: '2026-07-09',
        amount: 34.99,
        cost: 11.0,
        shippingCost: 4.0,
        adCost: 5.5,
        reason: 'fraud',
        status: 'disputed',
        supplier: 'AliExpress Supplier C',
        platform: 'Shopify',
        notes: 'Chargeback filed — customer claims unauthorized purchase',
      },
    ];

    function getStoredRefunds() {
      try {
        return JSON.parse(localStorage.getItem('hd_refunds')) || SAMPLE_REFUNDS;
      } catch (e) {
        return SAMPLE_REFUNDS;
      }
    }

    function calcRefundCost(r) {
      return r.cost + r.shippingCost + r.adCost;
    }
    function calcTrueLoss(r) {
      return r.amount - calcRefundCost(r);
    }

    function getActionPlan() {
      try {
        return JSON.parse(localStorage.getItem('rrc_action_plan')) || {};
      } catch (e) {
        return {};
      }
    }
    function saveActionPlan(plan) {
      try {
        localStorage.setItem('rrc_action_plan', JSON.stringify(plan));
      } catch (e) {}
    }

    function navigateToSection(sectionId) {
      if (window.HuntDrop && window.HuntDrop.navigateTo) {
        window.HuntDrop.navigateTo(sectionId);
      }
    }

    function buildEmptyState() {
      return `
    <div class="rrc-empty">
      <div class="rrc-empty-icon">🔍</div>
      <div class="rrc-empty-title">No Root Cause Selected</div>
      <div class="rrc-empty-desc">Navigate here from Refund Shield by clicking "Full Analysis" on any root cause.</div>
      <button class="rrc-empty-btn" id="rrcGoBack">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Refund Shield
      </button>
    </div>`;
    }

    function buildFullPage(reason, refunds) {
      const reasonRefunds = refunds.filter((r) => r.reason === reason.id);
      const totalRefunds = refunds.length || 1;
      const reasonCount = reasonRefunds.length;
      const reasonPct = Math.round((reasonCount / totalRefunds) * 100);
      const totalLost = reasonRefunds.reduce((s, r) => s + calcTrueLoss(r), 0);
      const totalRevenue = reasonRefunds.reduce((s, r) => s + r.amount, 0);
      const avgCost = reasonCount > 0 ? totalLost / reasonCount : 0;
      const sevColor =
        reason.severity === 'critical'
          ? 'var(--accent-red)'
          : reason.severity === 'high'
            ? 'var(--accent-orange)'
            : reason.severity === 'medium'
              ? 'var(--accent-yellow)'
              : 'var(--accent-green)';

      const suppliers = {};
      reasonRefunds.forEach((r) => {
        const k = r.supplier || 'Unknown';
        if (!suppliers[k]) suppliers[k] = { name: k, refunds: 0, totalLost: 0, platforms: {} };
        suppliers[k].refunds++;
        suppliers[k].totalLost += calcTrueLoss(r);
        suppliers[k].platforms[r.platform] = (suppliers[k].platforms[r.platform] || 0) + 1;
      });
      const sortedSuppliers = Object.values(suppliers).sort((a, b) => b.totalLost - a.totalLost);

      const platforms = {};
      reasonRefunds.forEach((r) => {
        const k = r.platform || 'Unknown';
        if (!platforms[k]) platforms[k] = { name: k, refunds: 0, totalLost: 0 };
        platforms[k].refunds++;
        platforms[k].totalLost += calcTrueLoss(r);
      });
      const sortedPlatforms = Object.values(platforms).sort((a, b) => b.totalLost - a.totalLost);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const trendData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = months[d.getMonth()];
        const count = reasonRefunds.filter((r) => {
          const rd = new Date(r.date);
          return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        }).length;
        trendData.push({ month, count });
      }
      const maxTrend = Math.max(...trendData.map((d) => d.count), 1);

      const actionPlan = getActionPlan();
      const planKey = 'rrc_' + reason.id;

      const impactCards = [
        {
          icon: '💰',
          label: 'Total Lost to This Reason',
          value: '-$' + totalLost.toFixed(2),
          color: 'var(--accent-red)',
          sub: reasonCount + ' refund' + (reasonCount !== 1 ? 's' : ''),
        },
        {
          icon: '📊',
          label: 'Avg Cost Per Refund',
          value: '$' + avgCost.toFixed(2),
          color: 'var(--accent-orange)',
          sub: 'Product + shipping + ads',
        },
        {
          icon: '📈',
          label: '% of All Refunds',
          value: reasonPct + '%',
          color: reasonPct > 30 ? 'var(--accent-red)' : reasonPct > 15 ? 'var(--accent-yellow)' : 'var(--accent-green)',
          sub: reasonCount + ' of ' + totalRefunds + ' total',
        },
        {
          icon: '💸',
          label: 'Revenue Refunded',
          value: '-$' + totalRevenue.toFixed(2),
          color: 'var(--accent-red)',
          sub: 'Gross amount returned',
        },
      ];

      const severityLabels = {
        critical: 'Critical — Immediate Action Required',
        high: 'High — Needs Urgent Attention',
        medium: 'Medium — Monitor Closely',
        low: 'Low — Minor Issue',
      };
      const severityDescs = {
        critical:
          'This is a severe issue that can lead to chargebacks, payment processor penalties, and store bans. It must be addressed immediately to protect your business.',
        high: 'This is a significant problem causing substantial losses. Without intervention, costs will compound and customer trust will erode.',
        medium:
          'This issue is creating unnecessary friction and costs. While not urgent, addressing it will improve margins and customer satisfaction.',
        low: "This is a minor issue that has limited impact. Monitor it to ensure it doesn't escalate, but focus resources on higher-severity problems first.",
      };

      return `
    <div class="rrc-hero">
      <div class="rrc-hero-bg"></div>
      <div class="rrc-hero-content">
        <button class="rrc-back-btn" id="rrcBackBtn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Refund Shield
        </button>
        <div class="rrc-hero-badge">${reason.icon} Root Cause Deep Dive</div>
        <h1 class="rrc-hero-title">${reason.name}</h1>
        <p class="rrc-hero-desc">${reason.desc}</p>
        <div class="rrc-hero-kpis">
          <div class="rrc-hkpi"><div class="rrc-hkpi-val">${reasonCount}</div><div class="rrc-hkpi-label">Occurrences</div></div>
          <div class="rrc-hkpi"><div class="rrc-hkpi-val" style="color:var(--accent-red)">-$${totalLost.toFixed(2)}</div><div class="rrc-hkpi-label">Total Lost</div></div>
          <div class="rrc-hkpi"><div class="rrc-hkpi-val">${reasonPct}%</div><div class="rrc-hkpi-label">Of All Refunds</div></div>
        </div>
      </div>
    </div>

    <div class="rrc-section">
      <div class="rrc-section-header">
        <h2 class="rrc-section-title">⚠️ Severity Assessment</h2>
      </div>
      <div class="rrc-sev-card" style="border-left:4px solid ${sevColor}">
        <div class="rrc-sev-head">
          <span class="rrc-sev-badge" style="background:${sevColor}20;color:${sevColor};border:1px solid ${sevColor}40">${reason.severity.toUpperCase()}</span>
          <span class="rrc-sev-label">${severityLabels[reason.severity]}</span>
        </div>
        <p class="rrc-sev-desc">${severityDescs[reason.severity]}</p>
        <div class="rrc-sev-indicator">
          <div class="rrc-sev-track">
            <div class="rrc-sev-fill" style="width:${reason.severity === 'critical' ? '100%' : reason.severity === 'high' ? '75%' : reason.severity === 'medium' ? '50%' : '25%'};background:${sevColor}"></div>
          </div>
          <div class="rrc-sev-labels">
            <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
          </div>
        </div>
      </div>
    </div>

    <div class="rrc-section">
      <div class="rrc-section-header">
        <h2 class="rrc-section-title">📋 Detailed Description & Impact</h2>
      </div>
      <div class="rrc-desc-card">
        <div class="rrc-desc-text">
          <h3 class="rrc-desc-heading">What is ${reason.name}?</h3>
          <p class="rrc-desc-body">${reason.desc}. This root cause has resulted in <strong>${reasonCount} refund${reasonCount !== 1 ? 's' : ''}</strong> accounting for <strong>${reasonPct}%</strong> of all refund events, with a combined loss of <strong style="color:var(--accent-red)">-$${totalLost.toFixed(2)}</strong>.</p>
          <div class="rrc-desc-meta">
            <div class="rrc-desc-meta-item"><span class="rrc-desc-meta-label">Primary Prevention:</span> <span>${reason.prevention}</span></div>
            <div class="rrc-desc-meta-item"><span class="rrc-desc-meta-label">Avg Cost/Event:</span> <span style="color:var(--accent-orange)">$${avgCost.toFixed(2)}</span></div>
            <div class="rrc-desc-meta-item"><span class="rrc-desc-meta-label">Affected Orders:</span> <span>${reasonCount}</span></div>
          </div>
        </div>
        <div class="rrc-desc-chart">
          <div class="rrc-desc-donut">
            <svg viewBox="0 0 36 36" class="rrc-donut-svg">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--bg-elevated)" stroke-width="3"/>
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="${sevColor}" stroke-width="3" stroke-dasharray="${reasonPct} ${100 - reasonPct}" stroke-dashoffset="25" stroke-linecap="round"/>
            </svg>
            <div class="rrc-donut-center">
              <div class="rrc-donut-val">${reasonPct}%</div>
              <div class="rrc-donut-label">of refunds</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="rrc-section">
      <div class="rrc-section-header">
        <h2 class="rrc-section-title">💡 Prevention Tips</h2>
        <p class="rrc-section-desc">Step-by-step actions to eliminate this root cause</p>
      </div>
      <div class="rrc-tips-list">
        ${reason.tips
          .map(
            (tip, i) => `
          <div class="rrc-tip-card">
            <div class="rrc-tip-num">${i + 1}</div>
            <div class="rrc-tip-body">
              <div class="rrc-tip-text">${tip}</div>
              <div class="rrc-tip-explain">${getTipExplanation(reason.id, i)}</div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <div class="rrc-section">
      <div class="rrc-section-header">
        <h2 class="rrc-section-title">💸 Financial Impact</h2>
        <p class="rrc-section-desc">Complete breakdown of losses from this specific root cause</p>
      </div>
      <div class="rrc-impact-grid">
        ${impactCards
          .map(
            (c) => `
          <div class="rrc-impact-card">
            <div class="rrc-impact-icon">${c.icon}</div>
            <div class="rrc-impact-label">${c.label}</div>
            <div class="rrc-impact-val" style="color:${c.color}">${c.value}</div>
            <div class="rrc-impact-sub">${c.sub}</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <div class="rrc-section">
      <div class="rrc-section-header">
        <h2 class="rrc-section-title">🏭 Affected Suppliers</h2>
        <p class="rrc-section-desc">Which suppliers contribute to this root cause</p>
      </div>
      ${
        sortedSuppliers.length
          ? `
        <div class="rrc-sup-grid">
          ${sortedSuppliers
            .map((s) => {
              const riskLevel =
                s.totalLost > 30 ? 'critical' : s.totalLost > 15 ? 'high' : s.totalLost > 5 ? 'medium' : 'low';
              const riskColor =
                riskLevel === 'critical'
                  ? 'var(--accent-red)'
                  : riskLevel === 'high'
                    ? 'var(--accent-orange)'
                    : riskLevel === 'medium'
                      ? 'var(--accent-yellow)'
                      : 'var(--accent-green)';
              return `
              <div class="rrc-sup-card">
                <div class="rrc-sup-head">
                  <span class="rrc-sup-name">🏭 ${esc(s.name)}</span>
                  <span class="rrc-sup-risk" style="background:${riskColor}20;color:${riskColor};border:1px solid ${riskColor}40">${riskLevel}</span>
                </div>
                <div class="rrc-sup-stats">
                  <div class="rrc-sup-stat"><span class="rrc-sup-stat-val">${s.refunds}</span><span class="rrc-sup-stat-label">Refunds</span></div>
                  <div class="rrc-sup-stat"><span class="rrc-sup-stat-val" style="color:var(--accent-red)">-$${s.totalLost.toFixed(2)}</span><span class="rrc-sup-stat-label">Lost</span></div>
                </div>
                <div class="rrc-sup-platforms">${Object.entries(s.platforms)
                  .map(([p, c]) => `<span class="rrc-platform-tag">${p} (${c})</span>`)
                  .join('')}</div>
              </div>`;
            })
            .join('')}
        </div>
      `
          : `<div class="rrc-empty-inline">No supplier data available for this reason.</div>`
      }
    </div>

    <div class="rrc-section">
      <div class="rrc-section-header">
        <h2 class="rrc-section-title">🛍️ Affected Platforms</h2>
        <p class="rrc-section-desc">Which sales channels are impacted by this root cause</p>
      </div>
      ${
        sortedPlatforms.length
          ? `
        <div class="rrc-platform-grid">
          ${sortedPlatforms
            .map((p) => {
              const pct = reasonCount > 0 ? Math.round((p.refunds / reasonCount) * 100) : 0;
              return `
              <div class="rrc-platform-card">
                <div class="rrc-platform-head">
                  <span class="rrc-platform-name">${esc(p.name)}</span>
                  <span class="rrc-platform-pct">${pct}%</span>
                </div>
                <div class="rrc-platform-bar"><div class="rrc-platform-bar-fill" style="width:${pct}%;background:var(--accent-cyan)"></div></div>
                <div class="rrc-platform-stats">
                  <span>${p.refunds} refund${p.refunds !== 1 ? 's' : ''}</span>
                  <span style="color:var(--accent-red)">-$${p.totalLost.toFixed(2)} lost</span>
                </div>
              </div>`;
            })
            .join('')}
        </div>
      `
          : `<div class="rrc-empty-inline">No platform data available for this reason.</div>`
      }
    </div>

    <div class="rrc-section">
      <div class="rrc-section-header">
        <h2 class="rrc-section-title">📊 Refund Timeline</h2>
        <p class="rrc-section-desc">Monthly trend for ${reason.name} refunds</p>
      </div>
      <div class="rrc-trend-chart">
        ${trendData
          .map(
            (d) => `
          <div class="rrc-trend-bar-wrap">
            <div class="rrc-trend-bar" style="height:${Math.max(4, (d.count / maxTrend) * 120)}px;background:${d.count > 2 ? 'var(--accent-red)' : d.count > 0 ? 'var(--accent-orange)' : 'var(--accent-green)'}"></div>
            <div class="rrc-trend-label">${d.month}</div>
            <div class="rrc-trend-val">${d.count}</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <div class="rrc-section">
      <div class="rrc-section-header">
        <h2 class="rrc-section-title">✅ Action Plan</h2>
        <p class="rrc-section-desc">Track your prevention progress — checkboxes persist automatically</p>
      </div>
      <div class="rrc-action-list" id="rrcActionList">
        ${reason.tips
          .map((tip, i) => {
            const checked = actionPlan[planKey] && actionPlan[planKey][i] ? 'checked' : '';
            return `
            <label class="rrc-action-item ${checked}">
              <input type="checkbox" class="rrc-action-cb" data-tip="${i}" ${checked}>
              <span class="rrc-action-check"></span>
              <span class="rrc-action-text">${tip}</span>
            </label>`;
          })
          .join('')}
      </div>
    </div>

    <div class="rrc-section">
      <div class="rrc-section-header">
        <h2 class="rrc-section-title">🔗 Related Tools</h2>
        <p class="rrc-section-desc">Cross-reference with other tools to build a complete prevention strategy</p>
      </div>
      <div class="rrc-links-grid">
        <a class="rrc-link-card" href="javascript:void(0)" data-nav="section-refund-shield">
          <div class="rrc-link-icon" style="background:var(--accent-red-dim);color:var(--accent-red)">🛡️</div>
          <div class="rrc-link-info">
            <div class="rrc-link-name">Refund Shield</div>
            <div class="rrc-link-desc">View all refund causes and trends</div>
          </div>
          <svg class="rrc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
        <a class="rrc-link-card" href="javascript:void(0)" data-nav="section-supplier-intel">
          <div class="rrc-link-icon" style="background:var(--accent-yellow-dim);color:var(--accent-yellow)">🏭</div>
          <div class="rrc-link-info">
            <div class="rrc-link-name">Supplier Risk</div>
            <div class="rrc-link-desc">Deep supplier verification and risk scoring</div>
          </div>
          <svg class="rrc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
        <a class="rrc-link-card" href="javascript:void(0)" data-nav="section-order-tracker">
          <div class="rrc-link-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">📦</div>
          <div class="rrc-link-info">
            <div class="rrc-link-name">Order Tracker</div>
            <div class="rrc-link-desc">Track orders before they become refunds</div>
          </div>
          <svg class="rrc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
        <a class="rrc-link-card" href="javascript:void(0)" data-nav="section-health">
          <div class="rrc-link-icon" style="background:var(--accent-red-dim);color:var(--accent-red)">❤️</div>
          <div class="rrc-link-info">
            <div class="rrc-link-name">Store Health</div>
            <div class="rrc-link-desc">Refund rate affects store health score</div>
          </div>
          <svg class="rrc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>
    </div>`;
    }

    function getTipExplanation(reasonId, tipIndex) {
      const explanations = {
        quality: [
          'Ordering samples lets you verify quality firsthand before your customers see the product. This catches defects, material issues, and sizing problems early.',
          "Supplier photos can be misleading. Compare them with independent reviews and user-uploaded images to get a realistic picture of what you're selling.",
          'Patterns in supplier reviews reveal systemic quality issues. Look for recurring complaints about materials, durability, or accuracy.',
          'Quality checkpoints at receiving allow you to catch defective items before they reach customers, reducing refund requests and improving satisfaction.',
          'A scoring rubric standardizes quality evaluation across suppliers, making it easy to compare and make data-driven sourcing decisions.',
        ],
        damage: [
          'Double-walled packaging absorbs impact during transit. Standard packaging often fails with fragile items, leading to costly damage claims.',
          "Bubble wrap creates an air cushion that protects against drops and impacts. It's cheap insurance against expensive damage refunds.",
          'Tracked shipping provides visibility into package handling. Carriers handle tracked packages more carefully and you can prove delivery conditions.',
          'Insuring high-value shipments transfers the financial risk to the carrier. The small premium is worth it for items over $20.',
          'Drop testing simulates real shipping conditions. Test your packaging with a 4-foot drop on each side to identify weak points.',
        ],
        wrong_item: [
          'SKU verification creates a double-check between order and fulfillment. This simple step catches the most common fulfillment errors.',
          'Variant mapping documents prevent confusion between similar-looking products. Keep a living document that maps product variants to SKUs.',
          'Barcode scanning eliminates human error in picking. Even one wrong item can lead to a refund plus a replacement shipment.',
          "A final order review before shipping catches discrepancies. Assign someone to verify each order matches the customer's selection.",
          'Visual confirmation adds a photo check to the process. Snap a photo of the packed order for dispute resolution if needed.',
        ],
        not_as_described: [
          'Actual product photos build trust. Customers who receive what they expected are far less likely to request refunds.',
          'Honest descriptions prevent disappointment. Overpromising leads to refunds; accurate descriptions lead to satisfied customers.',
          'Size charts reduce the #1 cause of "not as described" complaints. Include measurements in both metric and imperial units.',
          'Color disclaimers set expectations. Screen colors vary, and acknowledging this prevents unnecessary returns.',
          'Multiple angles show the product honestly. Include close-ups, scale references, and photos in different lighting conditions.',
        ],
        late_delivery: [
          'Delivery windows are more honest than exact dates. Shipping variability makes precise dates unreliable and leads to disappointed customers.',
          'Expedited options give impatient customers a choice. Offering faster shipping for a premium reduces complaints about standard delivery times.',
          'Local warehouses cut delivery time dramatically. Storing inventory closer to customers reduces transit time from weeks to days.',
          'Proactive communication manages expectations. A simple "your order is delayed" email can prevent a refund request.',
          'Tracking alerts let you intervene before a complaint. If a package is stuck, reach out to the customer before they reach out to you.',
        ],
        buyer_remorse: [
          'Precise targeting reaches people who actually want your product. Broad targeting generates impulse purchases that lead to refunds.',
          'Warm audiences convert with less regret. Retargeting people who already showed interest reduces post-purchase dissonance.',
          'Detailed descriptions help customers make informed decisions. The more they know before buying, the less likely they are to regret it.',
          'Social proof validates the purchase. Reviews and testimonials reassure buyers that they made the right choice.',
          'Post-purchase follow-up reinforces the decision. A thank-you email with usage tips can reduce regret-driven refunds.',
        ],
        fraud: [
          'Address verification catches mismatched billing/shipping addresses. This is the #1 indicator of fraudulent orders.',
          'Fraud detection tools analyze patterns humans miss. They flag suspicious velocity, location, and device data.',
          'Manual verification of high-value orders catches sophisticated fraud. The extra time is worth it for orders over $50.',
          'Chargeback alerts give you time to respond. Early notification lets you resolve disputes before they escalate.',
          'IP velocity monitoring catches bot-driven fraud. Multiple orders from the same IP in a short window is a major red flag.',
        ],
        duplicate: [
          'Order confirmation dialogs prevent accidental purchases. A simple "Are you sure?" can save you a refund.',
          'Duplicate detection algorithms catch repeated orders automatically. Flag and review orders with matching details.',
          'Clearing the cart after purchase prevents double-buying. Some customers forget they already ordered and place another.',
          'Confirmation emails reinforce the purchase. Customers who receive confirmation are less likely to order again by mistake.',
          'Quantity warnings alert customers to unusual quantities. Buying 5 of the same item is often a mistake.',
        ],
      };
      return (
        (explanations[reasonId] && explanations[reasonId][tipIndex]) ||
        'Implementing this tip will help reduce ' + (reasonId || 'this') + ' refunds over time.'
      );
    }

    PluginRegistry.register('refund-root-cause', {
      id: 'refund-root-cause',
      name: 'Root Cause Analysis',
      version: '1.0.0',
      description: 'Deep-dive analysis of a specific refund root cause',

      init(_ctx) {},

      mount(_ctx) {
        const container = UI.$('sections-container');
        if (!container) return;

        const section = document.createElement('section');
        section.className = 'section section-refund-root-cause';
        section.id = 'section-refund-root-cause';

        _reasonId = sessionStorage.getItem('rs_drill_reason');
        const refunds = getStoredRefunds();

        let content;
        if (!_reasonId) {
          content = buildEmptyState();
        } else {
          const reason = REFUND_REASONS.find((r) => r.id === _reasonId);
          if (!reason) {
            content = buildEmptyState();
          } else {
            content = buildFullPage(reason, refunds);
          }
        }

        section.innerHTML = `<div class="section-inner"><div class="rrc-container">${content}</div></div>`;
        container.appendChild(section);
        _section = section;

        const backBtn = _section.querySelector('#rrcBackBtn') || _section.querySelector('#rrcGoBack');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            sessionStorage.removeItem('rs_drill_reason');
            navigateToSection('section-refund-shield');
          });
        }

        _section.querySelectorAll('[data-nav]').forEach((el) => {
          el.addEventListener('click', () => {
            navigateToSection(el.dataset.nav);
          });
        });

        _section.querySelectorAll('.rrc-action-cb').forEach((cb) => {
          cb.addEventListener('change', function () {
            const tipIdx = this.dataset.tip;
            const plan = getActionPlan();
            const planKey = 'rrc_' + _reasonId;
            if (!plan[planKey]) plan[planKey] = {};
            plan[planKey][tipIdx] = this.checked;
            saveActionPlan(plan);
            const item = this.closest('.rrc-action-item');
            if (item) item.classList.toggle('checked', this.checked);
            const completed = _section.querySelectorAll('.rrc-action-cb:checked').length;
            const total = _section.querySelectorAll('.rrc-action-cb').length;
            if (completed === total && total > 0) {
              UI.toast &&
                UI.toast(
                  '🎉 Action plan complete! Great work preventing ' +
                    (REFUND_REASONS.find((r) => r.id === _reasonId)?.name || 'refunds') +
                    '.',
                  'success'
                );
            }
          });
        });
      },

      unmount(_ctx) {
        (_cleanups || []).forEach((fn) => {
          try {
            fn();
          } catch (e) {}
        });
        _cleanups = [];
        const el = UI.$('section-refund-root-cause');
        if (el) el.remove();
        _section = null;
        _reasonId = null;
      },
    });
    Object.defineProperty(window.HuntDrop.PluginRegistry.get('refund-root-cause'), '_section', {
      get() {
        return _section;
      },
      set(v) {
        _section = v;
      },
      configurable: true,
    });
  } catch (e) {
    console.error('[RefundRootCause] error:', e);
  }
})();
