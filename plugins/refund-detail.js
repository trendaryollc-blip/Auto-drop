// ============================================================================
// PLUGIN: Refund Detail — Detailed landing page for individual refund events
// ============================================================================
(function () {
  try {
    const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;
    const esc = (s) => UI.escapeHtml(String(s || ''));

    let _section = null;

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

    function navigateToSection(sectionId) {
      if (window.HuntDrop && window.HuntDrop.navigateTo) {
        window.HuntDrop.navigateTo(sectionId);
      }
    }

    function getSeverityColor(severity) {
      if (severity === 'critical') return 'var(--accent-red)';
      if (severity === 'high') return 'var(--accent-orange)';
      if (severity === 'medium') return 'var(--accent-yellow)';
      return 'var(--accent-green)';
    }

    function getStatusConfig(status) {
      const map = {
        completed: { color: 'var(--accent-green)', bg: 'var(--accent-green-dim)', label: 'Completed' },
        pending: { color: 'var(--accent-orange)', bg: 'var(--accent-orange-dim)', label: 'Pending' },
        disputed: { color: 'var(--accent-red)', bg: 'var(--accent-red-dim)', label: 'Disputed' },
        processing: { color: 'var(--accent-cyan)', bg: 'var(--accent-cyan-dim)', label: 'Processing' },
      };
      return map[status] || map.pending;
    }

    function renderNotFound() {
      const el = UI.$('rdContent');
      if (!el) return;
      el.innerHTML = `<div class="rd-not-found">
    <div class="rd-not-found-icon">🔍</div>
    <h2 class="rd-not-found-title">No Refund Selected</h2>
    <p class="rd-not-found-desc">No refund ID was found. Please go back to Refund Shield and select a refund to view its details.</p>
    <button class="rd-not-found-btn" id="rdBackToShield">← Back to Refund Shield</button>
  </div>`;
      UI.$('rdBackToShield')?.addEventListener('click', () => navigateToSection('section-refund-shield'));
    }

    function renderDetail(refund) {
      const el = UI.$('rdContent');
      if (!el) return;

      const reason = REFUND_REASONS.find((r) => r.id === refund.reason) || REFUND_REASONS[0];
      const sevColor = getSeverityColor(reason.severity);
      const statusCfg = getStatusConfig(refund.status);
      const totalCost = calcRefundCost(refund);
      const netLoss = calcTrueLoss(refund);
      const margin = refund.amount > 0 ? Math.round(((refund.amount - totalCost) / refund.amount) * 100) : 0;
      const allRefunds = getStoredRefunds();
      const related = allRefunds
        .filter((r) => r.id !== refund.id && (r.reason === refund.reason || r.supplier === refund.supplier))
        .slice(0, 3);

      const costBreakdown = [
        { label: 'Product Cost', value: refund.cost, icon: '📦', color: 'var(--accent-cyan)' },
        { label: 'Shipping Cost', value: refund.shippingCost, icon: '🚚', color: 'var(--accent-orange)' },
        { label: 'Ad Cost (CAC)', value: refund.adCost, icon: '📢', color: 'var(--accent-purple)' },
        { label: 'Total Cost', value: totalCost, icon: '💰', color: 'var(--text-primary)', bold: true },
        { label: 'Refund Amount', value: refund.amount, icon: '💸', color: 'var(--accent-red)' },
        { label: 'Net Loss', value: netLoss, icon: '📉', color: 'var(--accent-red)', bold: true, large: true },
      ];

      const timeline = [
        {
          step: 'Order Placed',
          date: refund.date,
          icon: '🛒',
          active: true,
          desc: `Order ${refund.orderId} placed on ${refund.platform}`,
        },
        { step: 'Shipped', date: refund.date, icon: '🚚', active: true, desc: `Shipped from ${refund.supplier}` },
        { step: 'Refunded', date: refund.date, icon: '↩️', active: true, desc: `Refund processed — ${reason.name}` },
      ];

      el.innerHTML = `
    <div class="rd-hero">
      <div class="rd-hero-glow"></div>
      <div class="rd-hero-content">
        <button class="rd-hero-back" id="rdBackBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Shield
        </button>
        <div class="rd-hero-top">
          <div class="rd-hero-info">
            <div class="rd-hero-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Refund Event
            </div>
            <h1 class="rd-hero-id">${esc(refund.id)}</h1>
            <p class="rd-hero-product">${esc(refund.product)} — ${esc(refund.customer)}</p>
          </div>
          <div class="rd-hero-status-area">
            <div class="rd-hero-status-badge" style="background:${statusCfg.bg};color:${statusCfg.color};border:1px solid ${statusCfg.color}">${statusCfg.label}</div>
            <div class="rd-hero-date">${refund.date}</div>
          </div>
        </div>
        <div class="rd-hero-kpis">
          <div class="rd-hero-kpi">
            <div class="rd-hero-kpi-val" style="color:var(--accent-red)">-$${refund.amount.toFixed(2)}</div>
            <div class="rd-hero-kpi-label">Refund Amount</div>
          </div>
          <div class="rd-hero-kpi">
            <div class="rd-hero-kpi-val">${reason.icon} ${reason.name}</div>
            <div class="rd-hero-kpi-label">Root Cause</div>
          </div>
          <div class="rd-hero-kpi">
            <div class="rd-hero-kpi-val" style="color:var(--accent-red)">-$${netLoss.toFixed(2)}</div>
            <div class="rd-hero-kpi-label">Net Loss</div>
          </div>
          <div class="rd-hero-kpi">
            <div class="rd-hero-kpi-val">${esc(refund.platform)}</div>
            <div class="rd-hero-kpi-label">Platform</div>
          </div>
        </div>
      </div>
    </div>

    <div class="rd-body">
      <div class="rd-grid-main">
        <div class="rd-card rd-cost-card">
          <div class="rd-card-header">
            <h3 class="rd-card-title">💸 Cost Breakdown</h3>
            <p class="rd-card-subtitle">Full financial impact of this refund</p>
          </div>
          <div class="rd-cost-items">
            ${costBreakdown
              .map(
                (c) => `
              <div class="rd-cost-row ${c.bold ? 'rd-cost-total' : ''} ${c.large ? 'rd-cost-loss' : ''}">
                <div class="rd-cost-left">
                  <span class="rd-cost-icon">${c.icon}</span>
                  <span class="rd-cost-label">${c.label}</span>
                </div>
                <div class="rd-cost-value" style="color:${c.color};${c.large ? 'font-size:18px;' : ''}">
                  ${c.label.includes('Net Loss') ? '' : '-'}$${c.value.toFixed(2)}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
          <div class="rd-cost-margin">
            <span class="rd-cost-margin-label">Margin Impact</span>
            <span class="rd-cost-margin-val" style="color:${margin >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${margin}%</span>
            <div class="rd-cost-margin-bar"><div class="rd-cost-margin-fill" style="width:${Math.min(100, Math.abs(margin))}%;background:${margin >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}"></div></div>
          </div>
        </div>

        <div class="rd-card rd-timeline-card">
          <div class="rd-card-header">
            <h3 class="rd-card-title">📅 Order Timeline</h3>
            <p class="rd-card-subtitle">From purchase to refund</p>
          </div>
          <div class="rd-timeline">
            ${timeline
              .map(
                (t, i) => `
              <div class="rd-timeline-step ${t.active ? 'rd-tl-active' : ''}">
                <div class="rd-timeline-dot">
                  <span class="rd-tl-icon">${t.icon}</span>
                </div>
                <div class="rd-timeline-line ${i < timeline.length - 1 ? 'rd-tl-line-active' : ''}"></div>
                <div class="rd-timeline-content">
                  <div class="rd-tl-label">${t.step}</div>
                  <div class="rd-tl-date">${t.date}</div>
                  <div class="rd-tl-desc">${t.desc}</div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>

      <div class="rd-grid-secondary">
        <div class="rd-card rd-cause-card">
          <div class="rd-card-header">
            <h3 class="rd-card-title">${reason.icon} Root Cause Analysis</h3>
            <div class="rd-sev-badge" style="background:${sevColor}20;color:${sevColor};border-color:${sevColor}">${reason.severity} severity</div>
          </div>
          <div class="rd-cause-desc">${esc(reason.desc)}</div>
          <div class="rd-cause-prevention">
            <div class="rd-cause-prev-label">Prevention Strategy</div>
            <div class="rd-cause-prev-text">${esc(reason.prevention)}</div>
          </div>
          <div class="rd-cause-notes">
            <div class="rd-cause-notes-label">Incident Notes</div>
            <div class="rd-cause-notes-text">${esc(refund.notes || 'No notes recorded for this refund.')}</div>
          </div>
        </div>

        <div class="rd-card rd-supplier-card">
          <div class="rd-card-header">
            <h3 class="rd-card-title">🏭 Supplier Info</h3>
            <button class="rd-supplier-link" id="rdSupplierLink">
              View Risk Profile
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </button>
          </div>
          <div class="rd-supplier-name">${esc(refund.supplier)}</div>
          <div class="rd-supplier-meta">
            <div class="rd-supplier-meta-item">
              <span class="rd-supplier-meta-label">Platform</span>
              <span class="rd-supplier-meta-val">${esc(refund.platform)}</span>
            </div>
            <div class="rd-supplier-meta-item">
              <span class="rd-supplier-meta-label">Refund Reason</span>
              <span class="rd-supplier-meta-val" style="color:${sevColor}">${reason.icon} ${reason.name}</span>
            </div>
            <div class="rd-supplier-meta-item">
              <span class="rd-supplier-meta-label">Order Value</span>
              <span class="rd-supplier-meta-val">$${refund.amount.toFixed(2)}</span>
            </div>
          </div>
          <div class="rd-supplier-action">
            <button class="rd-supplier-check-btn" id="rdSupplierCheckBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Check Supplier Risk
            </button>
          </div>
        </div>

        <div class="rd-card rd-prevention-card">
          <div class="rd-card-header">
            <h3 class="rd-card-title">🛡️ Prevention Tips</h3>
          </div>
          <div class="rd-prevention-list">
            ${reason.tips
              .map(
                (tip, i) => `
              <div class="rd-prevention-item">
                <div class="rd-prevention-num">${i + 1}</div>
                <div class="rd-prevention-text">${esc(tip)}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        ${
          related.length > 0
            ? `
        <div class="rd-card rd-related-card">
          <div class="rd-card-header">
            <h3 class="rd-card-title">🔗 Related Refunds</h3>
            <p class="rd-card-subtitle">Same reason (${reason.name}) or supplier (${refund.supplier})</p>
          </div>
          <div class="rd-related-list">
            ${related
              .map((r) => {
                const rr = REFUND_REASONS.find((x) => x.id === r.reason) || REFUND_REASONS[0];
                return `<div class="rd-related-item" data-refund="${r.id}">
                <div class="rd-related-head">
                  <span class="rd-related-id">${esc(r.id)}</span>
                  <span class="rd-related-status rd-status-${r.status}">${r.status}</span>
                </div>
                <div class="rd-related-product">${esc(r.product)}</div>
                <div class="rd-related-meta">
                  <span>${rr.icon} ${rr.name}</span>
                  <span style="color:var(--accent-red)">-$${r.amount.toFixed(2)}</span>
                </div>
              </div>`;
              })
              .join('')}
          </div>
        </div>`
            : ''
        }
      </div>

      <div class="rd-cross-links">
        <div class="rd-cross-title">Related Tools</div>
        <div class="rd-cross-grid">
          <button class="rd-cross-btn" data-nav="section-refund-shield">
            <span class="rd-cross-icon">🛡️</span>
            <span class="rd-cross-name">Refund Shield</span>
            <span class="rd-cross-desc">Overview & analytics</span>
          </button>
          <button class="rd-cross-btn" data-nav="section-order-tracker">
            <span class="rd-cross-icon">📦</span>
            <span class="rd-cross-name">Order Tracker</span>
            <span class="rd-cross-desc">Track order status</span>
          </button>
          <button class="rd-cross-btn" data-nav="section-supplier-intel">
            <span class="rd-cross-icon">🔒</span>
            <span class="rd-cross-name">Supplier Risk</span>
            <span class="rd-cross-desc">Verify supplier quality</span>
          </button>
          <button class="rd-cross-btn" data-nav="section-profit-lab">
            <span class="rd-cross-icon">💰</span>
            <span class="rd-cross-name">Profit Calculator</span>
            <span class="rd-cross-desc">Factor in refund costs</span>
          </button>
          <button class="rd-cross-btn" data-nav="section-cash-flow">
            <span class="rd-cross-icon">💳</span>
            <span class="rd-cross-name">Cash Flow</span>
            <span class="rd-cross-desc">Refund impact on cash</span>
          </button>
        </div>
      </div>
    </div>`;

      UI.$('rdBackBtn')?.addEventListener('click', () => navigateToSection('section-refund-shield'));
      UI.$('rdSupplierLink')?.addEventListener('click', () => {
        sessionStorage.setItem('rs_drill_supplier', refund.supplier);
        navigateToSection('section-refund-supplier-risk');
      });
      UI.$('rdSupplierCheckBtn')?.addEventListener('click', () => {
        sessionStorage.setItem('rs_drill_supplier', refund.supplier);
        navigateToSection('section-refund-supplier-risk');
      });
      el.querySelectorAll('.rd-related-item').forEach((item) => {
        item.addEventListener('click', function () {
          const refundId = this.dataset.refund;
          sessionStorage.setItem('rs_drill_refund', refundId);
          navigateToSection('section-refund-detail');
        });
      });
      el.querySelectorAll('.rd-cross-btn').forEach((btn) => {
        btn.addEventListener('click', function () {
          navigateToSection(this.dataset.nav);
        });
      });
    }

    function render() {
      const refundId = sessionStorage.getItem('rs_drill_refund');
      if (!refundId) {
        renderNotFound();
        return;
      }
      const refunds = getStoredRefunds();
      const refund = refunds.find((r) => r.id === refundId);
      if (!refund) {
        renderNotFound();
        return;
      }
      renderDetail(refund);
    }

    PluginRegistry.register('refund-detail', {
      id: 'refund-detail',
      name: 'Refund Detail',
      version: '1.0.0',
      description: 'Detailed view of a single refund event',
      init(_ctx) {},
      mount(_ctx) {
        const container = UI.$('sections-container');
        if (!container) return;
        const section = document.createElement('section');
        section.className = 'section section-refund-detail';
        section.id = 'section-refund-detail';
        section.innerHTML = '<div class="section-inner" id="rdContent"></div>';
        container.appendChild(section);
        _section = section;
        render();
      },
      unmount(_ctx) {
        const el = UI.$('section-refund-detail');
        if (el) el.remove();
        _section = null;
      },
    });
    Object.defineProperty(window.HuntDrop.PluginRegistry.get('refund-detail'), '_section', {
      get() {
        return _section;
      },
      set(v) {
        _section = v;
      },
      configurable: true,
    });
  } catch (e) {
    console.error('[RefundDetail] error:', e);
  }
})();
