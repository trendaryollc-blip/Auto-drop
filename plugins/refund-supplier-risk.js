// ============================================================================
// PLUGIN: Supplier Risk Profile — Deep-dive risk analysis for suppliers
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
        severity: 'high',
        prevention: 'Improve product selection, order samples before listing',
      },
      {
        id: 'damage',
        name: 'Shipping Damage',
        icon: '📦',
        severity: 'high',
        prevention: 'Use better packaging, switch to tracked/insured shipping',
      },
      {
        id: 'wrong_item',
        name: 'Wrong Item Sent',
        icon: '❌',
        severity: 'medium',
        prevention: 'Verify SKU matching with supplier, improve order accuracy',
      },
      {
        id: 'not_as_described',
        name: 'Not As Described',
        icon: '📸',
        severity: 'high',
        prevention: 'Use accurate photos, honest descriptions, manage expectations',
      },
      {
        id: 'late_delivery',
        name: 'Late Delivery',
        icon: '⏰',
        severity: 'medium',
        prevention: 'Set realistic delivery estimates, use faster shipping methods',
      },
      {
        id: 'buyer_remorse',
        name: 'Buyer Remorse',
        icon: '🤷',
        severity: 'low',
        prevention: 'Improve product-market fit, better listing targeting',
      },
      {
        id: 'fraud',
        name: 'Suspected Fraud',
        icon: '🚨',
        severity: 'critical',
        prevention: 'Implement fraud checks, verify high-value orders',
      },
      {
        id: 'duplicate',
        name: 'Duplicate Order',
        icon: '🔄',
        severity: 'low',
        prevention: 'Add order confirmation step, clear cart UX',
      },
    ];

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
        notes: 'Speaker arrived with cracked casing',
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
        notes: 'LEDs only half lit',
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
        notes: 'Ordered black, received blue',
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
        notes: 'Buckle quality lower than photos',
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
        notes: 'Took 28 days',
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
        notes: 'Chargeback filed',
      },
    ];

    function getStoredRefunds() {
      try {
        return JSON.parse(localStorage.getItem('hd_refunds')) || SAMPLE_REFUNDS;
      } catch (e) {
        return SAMPLE_REFUNDS;
      }
    }

    function calcTrueLoss(r) {
      return r.amount - (r.cost + r.shippingCost + r.adCost);
    }

    function navigateToSection(id) {
      if (window.HuntDrop && window.HuntDrop.navigateTo) window.HuntDrop.navigateTo(id);
    }

    function getSupplierData(supplierName) {
      const refunds = getStoredRefunds().filter((r) => r.supplier === supplierName);
      if (!refunds.length) return null;
      const totalLost = refunds.reduce((s, r) => s + calcTrueLoss(r), 0);
      const totalAmount = refunds.reduce((s, r) => s + r.amount, 0);
      const avgLoss = refunds.length > 0 ? totalLost / refunds.length : 0;
      const byReason = {};
      refunds.forEach((r) => {
        byReason[r.reason] = (byReason[r.reason] || 0) + 1;
      });
      const byPlatform = {};
      refunds.forEach((r) => {
        byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1;
      });
      const severityScores = { critical: 25, high: 15, medium: 8, low: 3 };
      let riskScore = 0;
      riskScore += Math.min(40, refunds.length * 8);
      riskScore += Math.min(30, totalLost * 0.3);
      Object.entries(byReason).forEach(([rid, c]) => {
        const reason = REFUND_REASONS.find((r) => r.id === rid);
        if (reason) riskScore += (severityScores[reason.severity] || 0) * c;
      });
      riskScore = Math.min(100, Math.round(riskScore));
      return {
        name: supplierName,
        refunds,
        totalLost,
        totalAmount,
        avgLoss,
        byReason,
        byPlatform,
        riskScore,
        count: refunds.length,
      };
    }

    PluginRegistry.register('refund-supplier-risk', {
      id: 'refund-supplier-risk',
      name: 'Supplier Risk Profile',
      version: '1.0.0',
      description: 'Deep-dive risk analysis for a specific supplier',

      init(_ctx) {},

      mount(_ctx) {
        const container = UI.$('sections-container');
        if (!container) return;

        const supplierName = sessionStorage.getItem('rs_drill_supplier');
        const section = document.createElement('section');
        section.className = 'section section-refund-supplier-risk';
        section.id = 'section-refund-supplier-risk';

        if (!supplierName) {
          section.innerHTML = `<div class="section-inner">
        <div class="rsr-empty">
          <div class="rsr-empty-icon">🏭</div>
          <h2 class="rsr-empty-title">No Supplier Selected</h2>
          <p class="rsr-empty-desc">Go to Refund Shield and click on a supplier to view their risk profile.</p>
          <button class="rsr-back-btn" onclick="window.HuntDrop.navigateTo('section-refund-shield')">← Back to Refund Shield</button>
        </div>
      </div>`;
          container.appendChild(section);
          _section = section;
          return;
        }

        const data = getSupplierData(supplierName);
        if (!data) {
          section.innerHTML = `<div class="section-inner">
        <div class="rsr-empty">
          <div class="rsr-empty-icon">🔍</div>
          <h2 class="rsr-empty-title">Supplier Not Found</h2>
          <p class="rsr-empty-desc">No refund data found for "${esc(supplierName)}".</p>
          <button class="rsr-back-btn" onclick="window.HuntDrop.navigateTo('section-refund-shield')">← Back to Refund Shield</button>
        </div>
      </div>`;
          container.appendChild(section);
          _section = section;
          return;
        }

        const riskColor =
          data.riskScore >= 80
            ? 'var(--accent-red)'
            : data.riskScore >= 60
              ? 'var(--accent-orange)'
              : data.riskScore >= 40
                ? 'var(--accent-yellow)'
                : 'var(--accent-green)';
        const riskLevel =
          data.riskScore >= 80 ? 'Critical' : data.riskScore >= 60 ? 'High' : data.riskScore >= 40 ? 'Medium' : 'Low';
        const maxReasonCount = Math.max(...Object.values(data.byReason), 1);
        const allRefunds = getStoredRefunds();
        const totalAll = allRefunds.length || 1;
        const pctOfAll = Math.round((data.count / totalAll) * 100);

        const otherSuppliers = {};
        allRefunds.forEach((r) => {
          if (r.supplier !== supplierName) {
            if (!otherSuppliers[r.supplier]) otherSuppliers[r.supplier] = { name: r.supplier, count: 0, lost: 0 };
            otherSuppliers[r.supplier].count++;
            otherSuppliers[r.supplier].lost += calcTrueLoss(r);
          }
        });
        const sortedOthers = Object.values(otherSuppliers)
          .sort((a, b) => b.lost - a.lost)
          .slice(0, 4);

        section.innerHTML = `
      <div class="section-inner">
        <div class="rsr-hero">
          <div class="rsr-hero-bg"></div>
          <div class="rsr-hero-content">
            <button class="rsr-back-btn rsr-back-hero" onclick="window.HuntDrop.navigateTo('section-refund-shield')">← Refund Shield</button>
            <div class="rsr-hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Supplier Intelligence
            </div>
            <h1 class="rsr-hero-title">🏭 ${esc(data.name)}</h1>
            <p class="rsr-hero-desc">Complete risk profile based on ${data.count} refund event${data.count > 1 ? 's' : ''} across ${Object.keys(data.byPlatform).length} platform${Object.keys(data.byPlatform).length > 1 ? 's' : ''}</p>
            <div class="rsr-hero-kpis">
              <div class="rsr-hkpi">
                <div class="rsr-hkpi-val" style="color:${riskColor}">${data.riskScore}/100</div>
                <div class="rsr-hkpi-label">Risk Score</div>
              </div>
              <div class="rsr-hkpi">
                <div class="rsr-hkpi-val">${data.count}</div>
                <div class="rsr-hkpi-label">Total Refunds</div>
              </div>
              <div class="rsr-hkpi">
                <div class="rsr-hkpi-val" style="color:var(--accent-red)">-$${data.totalLost.toFixed(0)}</div>
                <div class="rsr-hkpi-label">Total Lost</div>
              </div>
              <div class="rsr-hkpi">
                <div class="rsr-hkpi-val">${pctOfAll}%</div>
                <div class="rsr-hkpi-label">Of All Refunds</div>
              </div>
            </div>
          </div>
        </div>

        <div class="rsr-section">
          <div class="rsr-section-header">
            <h2 class="rsr-section-title">🎯 Risk Assessment</h2>
          </div>
          <div class="rsr-risk-grid">
            <div class="rsr-risk-score-card">
              <svg class="rsr-risk-ring" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-elevated)" stroke-width="8"/>
                <circle cx="60" cy="60" r="52" fill="none" stroke="${riskColor}" stroke-width="8" stroke-dasharray="${(data.riskScore / 100) * 327} 327" stroke-linecap="round" transform="rotate(-90 60 60)"/>
                <text x="60" y="56" text-anchor="middle" fill="${riskColor}" font-family="var(--font-mono)" font-size="28" font-weight="800">${data.riskScore}</text>
                <text x="60" y="74" text-anchor="middle" fill="var(--text-muted)" font-size="11" text-transform="uppercase">Risk Score</text>
              </svg>
              <div class="rsr-risk-level" style="color:${riskColor}">${riskLevel} Risk</div>
            </div>
            <div class="rsr-risk-details">
              <div class="rsr-risk-item">
                <span class="rsr-risk-label">Refund Count</span>
                <span class="rsr-risk-val">${data.count} (${pctOfAll}% of total)</span>
              </div>
              <div class="rsr-risk-item">
                <span class="rsr-risk-label">Total Revenue Lost</span>
                <span class="rsr-risk-val" style="color:var(--accent-red)">-$${data.totalLost.toFixed(2)}</span>
              </div>
              <div class="rsr-risk-item">
                <span class="rsr-risk-label">Avg Loss Per Refund</span>
                <span class="rsr-risk-val">$${data.avgLoss.toFixed(2)}</span>
              </div>
              <div class="rsr-risk-item">
                <span class="rsr-risk-label">Platforms Affected</span>
                <span class="rsr-risk-val">${Object.keys(data.byPlatform).join(', ')}</span>
              </div>
              <div class="rsr-risk-item">
                <span class="rsr-risk-label">Top Issue</span>
                <span class="rsr-risk-val">${REFUND_REASONS.find((r) => r.id === Object.entries(data.byReason).sort((a, b) => b[1] - a[1])[0]?.[0])?.icon || ''} ${REFUND_REASONS.find((r) => r.id === Object.entries(data.byReason).sort((a, b) => b[1] - a[1])[0]?.[0])?.name || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="rsr-section">
          <div class="rsr-section-header">
            <h2 class="rsr-section-title">📊 Refund Reasons Breakdown</h2>
            <p class="rsr-section-desc">Which issues dominate for this supplier</p>
          </div>
          <div class="rsr-reasons-chart">
            ${Object.entries(data.byReason)
              .sort((a, b) => b[1] - a[1])
              .map(([rid, count]) => {
                const reason = REFUND_REASONS.find((r) => r.id === rid);
                if (!reason) return '';
                const pct = Math.round((count / data.count) * 100);
                const sevColor =
                  reason.severity === 'critical'
                    ? 'var(--accent-red)'
                    : reason.severity === 'high'
                      ? 'var(--accent-orange)'
                      : reason.severity === 'medium'
                        ? 'var(--accent-yellow)'
                        : 'var(--accent-green)';
                return `<div class="rsr-reason-row" data-reason="${rid}" tabindex="0" role="button">
                <div class="rsr-reason-info">
                  <span class="rsr-reason-icon">${reason.icon}</span>
                  <span class="rsr-reason-name">${reason.name}</span>
                  <span class="rsr-reason-count">${count}x (${pct}%)</span>
                </div>
                <div class="rsr-reason-bar"><div class="rsr-reason-bar-fill" style="width:${(count / maxReasonCount) * 100}%;background:${sevColor}"></div></div>
                <div class="rsr-reason-sev" style="color:${sevColor}">${reason.severity}</div>
                <svg class="rsr-reason-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>`;
              })
              .join('')}
          </div>
        </div>

        <div class="rsr-section">
          <div class="rsr-section-header">
            <h2 class="rsr-section-title">🛍️ Platform Breakdown</h2>
            <p class="rsr-section-desc">Which platforms this supplier's refunds come from</p>
          </div>
          <div class="rsr-platforms-grid">
            ${Object.entries(data.byPlatform)
              .sort((a, b) => b[1] - a[1])
              .map(([platform, count]) => {
                const pct = Math.round((count / data.count) * 100);
                const colors = {
                  Shopify: '#96bf48',
                  Amazon: '#ff9900',
                  eBay: '#e53238',
                  'TikTok Shop': '#000',
                  Etsy: '#f1641e',
                };
                const c = colors[platform] || 'var(--accent-cyan)';
                return `<div class="rsr-platform-card">
                <div class="rsr-platform-icon" style="background:${c}20;color:${c}">🛍️</div>
                <div class="rsr-platform-name">${platform}</div>
                <div class="rsr-platform-count">${count} refund${count > 1 ? 's' : ''}</div>
                <div class="rsr-platform-bar"><div class="rsr-platform-bar-fill" style="width:${pct}%;background:${c}"></div></div>
              </div>`;
              })
              .join('')}
          </div>
        </div>

        <div class="rsr-section">
          <div class="rsr-section-header">
            <h2 class="rsr-section-title">📋 Refund History</h2>
            <p class="rsr-section-desc">All refunds from this supplier — click to view details</p>
          </div>
          <div class="rsr-refund-list">
            ${data.refunds
              .map((r) => {
                const reason = REFUND_REASONS.find((x) => x.id === r.reason) || REFUND_REASONS[0];
                const trueLoss = calcTrueLoss(r);
                return `<div class="rsr-refund-card" data-refund="${r.id}" tabindex="0" role="button">
                <div class="rsr-ref-head">
                  <span class="rsr-ref-id">${esc(r.id)}</span>
                  <span class="rsr-ref-order">← ${esc(r.orderId)}</span>
                  <span class="rsr-ref-status rsr-ref-${r.status}">${r.status}</span>
                </div>
                <div class="rsr-ref-body">
                  <div class="rsr-ref-product">${esc(r.product)} · ${esc(r.customer)}</div>
                  <div class="rsr-ref-reason">${reason.icon} ${reason.name}</div>
                  <div class="rsr-ref-amounts">
                    <span>Refunded: <strong>$${r.amount.toFixed(2)}</strong></span>
                    <span>Net loss: <strong style="color:var(--accent-red)">$${trueLoss.toFixed(2)}</strong></span>
                  </div>
                  <div class="rsr-ref-meta">🛍️ ${r.platform} · 📅 ${r.date}</div>
                </div>
                <svg class="rsr-ref-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>`;
              })
              .join('')}
          </div>
        </div>

        ${
          sortedOthers.length
            ? `
        <div class="rsr-section">
          <div class="rsr-section-header">
            <h2 class="rsr-section-title">⚖️ Supplier Comparison</h2>
            <p class="rsr-section-desc">How this supplier compares to others</p>
          </div>
          <div class="rsr-comparison-grid">
            <div class="rsr-comp-card rsr-comp-current">
              <div class="rsr-comp-name">${esc(data.name)}</div>
              <div class="rsr-comp-stat" style="color:var(--accent-red)">${data.count} refunds</div>
              <div class="rsr-comp-stat">-$${data.totalLost.toFixed(0)} lost</div>
              <div class="rsr-comp-badge" style="background:${riskColor}20;color:${riskColor}">${riskLevel}</div>
            </div>
            ${sortedOthers
              .map((s) => {
                const sRisk = Math.min(100, Math.round(s.count * 8 + s.lost * 0.3));
                const sColor =
                  sRisk >= 60 ? 'var(--accent-red)' : sRisk >= 40 ? 'var(--accent-orange)' : 'var(--accent-green)';
                return `<div class="rsr-comp-card">
                <div class="rsr-comp-name">${esc(s.name)}</div>
                <div class="rsr-comp-stat">${s.count} refund${s.count > 1 ? 's' : ''}</div>
                <div class="rsr-comp-stat">-$${s.lost.toFixed(0)} lost</div>
              </div>`;
              })
              .join('')}
          </div>
        </div>`
            : ''
        }

        <div class="rsr-section">
          <div class="rsr-section-header">
            <h2 class="rsr-section-title">💡 Recommendations</h2>
          </div>
          <div class="rsr-recommendations">
            ${
              data.riskScore >= 60
                ? `
              <div class="rsr-rec-card rsr-rec-critical">
                <div class="rsr-rec-icon">🚨</div>
                <div class="rsr-rec-content">
                  <div class="rsr-rec-title">Consider Switching Suppliers</div>
                  <div class="rsr-rec-desc">This supplier has a high risk score (${data.riskScore}/100). The cost of refunds likely exceeds any savings from their pricing.</div>
                </div>
              </div>`
                : ''
            }
            ${Object.entries(data.byReason)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 2)
              .map(([rid]) => {
                const reason = REFUND_REASONS.find((r) => r.id === rid);
                return reason
                  ? `<div class="rsr-rec-card">
                <div class="rsr-rec-icon">${reason.icon}</div>
                <div class="rsr-rec-content">
                  <div class="rsr-rec-title">Address: ${reason.name}</div>
                  <div class="rsr-rec-desc">${reason.prevention}</div>
                </div>
              </div>`
                  : '';
              })
              .join('')}
            <div class="rsr-rec-card">
              <div class="rsr-rec-icon">📊</div>
              <div class="rsr-rec-content">
                <div class="rsr-rec-title">Monitor Closely</div>
                <div class="rsr-rec-desc">Track this supplier's refund rate monthly. If it increases, escalate to alternatives immediately.</div>
              </div>
            </div>
          </div>
        </div>

        ${
          window.HuntDrop.renderRelatedTools
            ? window.HuntDrop.renderRelatedTools([
                {
                  section: 'section-refund-shield',
                  name: 'Refund Shield',
                  desc: 'Overview of all refund data',
                  icon: '🛡',
                  color: 'var(--accent-red)',
                },
                {
                  section: 'section-refund-root-cause',
                  name: 'Root Cause Analysis',
                  desc: 'Deep-dive into specific issues',
                  icon: '🔍',
                  color: 'var(--accent-orange)',
                },
                {
                  section: 'section-order-tracker',
                  name: 'Order Tracker',
                  desc: 'Track orders from this supplier',
                  icon: '📦',
                  color: 'var(--accent-cyan)',
                },
                {
                  section: 'section-supplier-intel',
                  name: 'Supplier Intelligence',
                  desc: 'Full supplier verification',
                  icon: '🏭',
                  color: 'var(--accent-yellow)',
                },
                {
                  section: 'section-profit-lab',
                  name: 'Profit Calculator',
                  desc: 'Factor supplier costs into margins',
                  icon: '💰',
                  color: 'var(--accent-green)',
                },
              ])
            : ''
        }
      </div>`;
        container.appendChild(section);
        _section = section;

        _section.querySelectorAll('.rsr-reason-row').forEach((row) => {
          row.addEventListener('click', function () {
            const reason = this.dataset.reason;
            sessionStorage.setItem('rs_drill_reason', reason);
            navigateToSection('section-refund-root-cause');
          });
        });

        _section.querySelectorAll('.rsr-refund-card').forEach((card) => {
          card.addEventListener('click', function () {
            const refundId = this.dataset.refund;
            sessionStorage.setItem('rs_drill_refund', refundId);
            navigateToSection('section-refund-detail');
          });
        });
      },

      unmount(_ctx) {
        const el = UI.$('section-refund-supplier-risk');
        if (el) el.remove();
        _section = null;
      },
    });
    Object.defineProperty(window.HuntDrop.PluginRegistry.get('refund-supplier-risk'), '_section', {
      get() {
        return _section;
      },
      set(v) {
        _section = v;
      },
      configurable: true,
    });
  } catch (e) {
    console.error('[RefundSupplierRisk] error:', e);
  }
})();
