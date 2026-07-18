// ============================================================================
// PLUGIN: Refund & Returns Shield — Profit protection through refund intelligence
// ============================================================================
(function () {
  try {
    const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;
    const esc = (s) => UI.escapeHtml(String(s || ''));

    let _section = null;
    let _cleanups = [];
    let _refunds = [];
    let _selectedReason = null;

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
    function saveRefunds(r) {
      try {
        localStorage.setItem('hd_refunds', JSON.stringify(r));
      } catch (e) {}
    }

    function calcRefundCost(r) {
      return r.cost + r.shippingCost + r.adCost;
    }
    function calcTrueLoss(r) {
      return r.amount - calcRefundCost(r);
    }

    function getStats() {
      const refunds = _refunds;
      const total = refunds.length;
      const totalRevenue = refunds.reduce((s, r) => s + r.amount, 0);
      const totalLost = refunds.reduce((s, r) => s + calcTrueLoss(r), 0);
      const avgCostPerRefund = total > 0 ? totalLost / total : 0;
      const refundRate = total > 0 ? Math.min(100, Math.round((total / Math.max(total + 20, 1)) * 100)) : 0;
      const shieldScore = Math.max(0, Math.min(100, 100 - refundRate * 8 - (totalLost > 100 ? 15 : 0)));
      const byReason = {};
      refunds.forEach((r) => {
        byReason[r.reason] = (byReason[r.reason] || 0) + 1;
      });
      const topReason = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0];
      const bySupplier = {};
      refunds.forEach((r) => {
        const k = r.supplier || 'Unknown';
        bySupplier[k] = (bySupplier[k] || 0) + 1;
      });
      const topSupplier = Object.entries(bySupplier).sort((a, b) => b[1] - a[1])[0];
      return {
        totalRefunds: total,
        totalLost,
        avgCostPerRefund,
        refundRate,
        shieldScore,
        topReason: topReason ? topReason[0] : null,
        topSupplier: topSupplier ? topSupplier[0] : null,
        totalRevenue,
      };
    }

    function scrollToSection(id) {
      const el = UI.$(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function navigateToSection(sectionId) {
      if (window.HuntDrop && window.HuntDrop.navigateTo) {
        window.HuntDrop.navigateTo(sectionId);
      }
    }

    function renderCauses() {
      const el = UI.$('rsCauses');
      if (!el) return;
      const counts = {};
      _refunds.forEach((r) => {
        counts[r.reason] = (counts[r.reason] || 0) + 1;
      });
      const total = _refunds.length || 1;
      el.innerHTML = REFUND_REASONS.map((r) => {
        const count = counts[r.id] || 0;
        const pct = Math.round((count / total) * 100);
        const sevColor =
          r.severity === 'critical'
            ? 'var(--accent-red)'
            : r.severity === 'high'
              ? 'var(--accent-orange)'
              : r.severity === 'medium'
                ? 'var(--accent-yellow)'
                : 'var(--accent-green)';
        const isFiltered = _selectedReason === r.id;
        return `<div class="rs-cause-card ${isFiltered ? 'rs-cause-active' : ''}" data-reason="${r.id}" tabindex="0" role="button" aria-label="View ${r.name} details">
      <div class="rs-cause-head">
        <span class="rs-cause-icon">${r.icon}</span>
        <span class="rs-cause-name">${r.name}</span>
        <span class="rs-cause-count">${count} (${pct}%)</span>
        <svg class="rs-cause-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <div class="rs-cause-bar"><div class="rs-cause-bar-fill" style="width:${pct}%;background:${sevColor}"></div></div>
      <div class="rs-cause-desc">${r.desc}</div>
      <div class="rs-cause-bottom">
        <div class="rs-cause-sev" style="color:${sevColor}">Severity: ${r.severity}</div>
        <div class="rs-cause-prevention">💡 ${r.prevention}</div>
      </div>
      <div class="rs-cause-detail-preview">
        <div class="rs-cause-tips-label">Prevention Tips:</div>
        <ul class="rs-cause-tips">${r.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
        <div class="rs-cause-actions">
          <button class="rs-cause-btn rs-cause-filter-btn" data-filter="${r.id}">Filter Refunds</button>
          <button class="rs-cause-btn rs-cause-detail-btn" data-reason="${r.id}">Full Analysis →</button>
        </div>
      </div>
    </div>`;
      }).join('');

      el.querySelectorAll('.rs-cause-card').forEach((card) => {
        card.addEventListener('click', function (e) {
          if (e.target.closest('.rs-cause-filter-btn') || e.target.closest('.rs-cause-detail-btn')) {
            return;
          }
          this.classList.toggle('rs-cause-expanded');
        });
      });

      el.querySelectorAll('.rs-cause-filter-btn').forEach((btn) => {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          const reason = this.dataset.filter;
          _selectedReason = _selectedReason === reason ? null : reason;
          renderCauses();
          renderRefundList();
        });
      });

      el.querySelectorAll('.rs-cause-detail-btn').forEach((btn) => {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          const reason = this.dataset.reason;
          sessionStorage.setItem('rs_drill_reason', reason);
          navigateToSection('section-refund-root-cause');
        });
      });
    }

    function renderSupplierGrid() {
      const el = UI.$('rsSupplierGrid');
      if (!el) return;
      const suppliers = {};
      _refunds.forEach((r) => {
        const key = r.supplier || 'Unknown';
        if (!suppliers[key]) suppliers[key] = { name: key, refunds: 0, totalLost: 0, reasons: {}, platforms: {} };
        const s = suppliers[key];
        s.refunds++;
        s.totalLost += calcTrueLoss(r);
        s.reasons[r.reason] = (s.reasons[r.reason] || 0) + 1;
        s.platforms[r.platform] = (s.platforms[r.platform] || 0) + 1;
      });
      const sorted = Object.values(suppliers).sort((a, b) => b.totalLost - a.totalLost);
      el.innerHTML = sorted
        .map((s) => {
          const topReason = Object.entries(s.reasons).sort((a, b) => b[1] - a[1])[0];
          const reasonObj = REFUND_REASONS.find((r) => r.id === topReason[0]);
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
          return `<div class="rs-sup-card" data-supplier="${esc(s.name)}" tabindex="0" role="button" aria-label="View ${s.name} risk profile">
      <div class="rs-sup-header">
        <div class="rs-sup-name">🏭 ${esc(s.name)}</div>
        <div class="rs-sup-risk-badge" style="background:${riskColor}20;color:${riskColor};border-color:${riskColor}">${riskLevel}</div>
      </div>
      <div class="rs-sup-stats-row">
        <div class="rs-sup-stat"><span class="rs-sup-stat-val">${s.refunds}</span><span class="rs-sup-stat-label">Refunds</span></div>
        <div class="rs-sup-stat"><span class="rs-sup-stat-val" style="color:var(--accent-red)">-$${s.totalLost.toFixed(0)}</span><span class="rs-sup-stat-label">Lost</span></div>
      </div>
      <div class="rs-sup-top">Top issue: ${reasonObj ? reasonObj.icon + ' ' + reasonObj.name : 'Unknown'} (${topReason[1]}x)</div>
      <div class="rs-sup-platforms">${Object.entries(s.platforms)
        .map(([p, c]) => `<span class="rs-sup-platform-tag">${p} (${c})</span>`)
        .join('')}</div>
      <div class="rs-sup-action">
        <button class="rs-sup-view-btn" data-supplier="${esc(s.name)}">View Risk Profile →</button>
      </div>
    </div>`;
        })
        .join('');

      el.querySelectorAll('.rs-sup-card').forEach((card) => {
        card.addEventListener('click', function (e) {
          if (e.target.closest('.rs-sup-view-btn')) return;
          const supplier = this.dataset.supplier;
          sessionStorage.setItem('rs_drill_supplier', supplier);
          navigateToSection('section-refund-supplier-risk');
        });
      });

      el.querySelectorAll('.rs-sup-view-btn').forEach((btn) => {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          const supplier = this.dataset.supplier;
          sessionStorage.setItem('rs_drill_supplier', supplier);
          navigateToSection('section-refund-supplier-risk');
        });
      });
    }

    function renderImpact() {
      const el = UI.$('rsImpact');
      if (!el) return;
      const totalRefundAmount = _refunds.reduce((s, r) => s + r.amount, 0);
      const totalAdSpend = _refunds.reduce((s, r) => s + r.adCost, 0);
      const totalShipping = _refunds.reduce((s, r) => s + r.shippingCost, 0);
      const totalProduct = _refunds.reduce((s, r) => s + r.cost, 0);
      const recovered = _refunds.filter((r) => r.status === 'disputed').reduce((s, r) => s + r.amount, 0);
      const netLoss = totalRefundAmount - recovered;
      const recoveryRate = totalRefundAmount > 0 ? Math.round((recovered / totalRefundAmount) * 100) : 0;
      el.innerHTML = `
    <div class="rs-impact-grid">
      <div class="rs-impact-card rs-impact-clickable" data-section="section-order-tracker" role="button" tabindex="0" style="cursor:pointer">
        <div class="rs-impact-icon">💰</div>
        <div class="rs-impact-label">Refund Amount Paid</div>
        <div class="rs-impact-val" style="color:var(--accent-red)">-$${totalRefundAmount.toFixed(2)}</div>
        <div class="rs-impact-sub">Direct customer refunds</div>
      </div>
      <div class="rs-impact-card rs-impact-clickable" data-section="section-profit-lab" role="button" tabindex="0" style="cursor:pointer">
        <div class="rs-impact-icon">📦</div>
        <div class="rs-impact-label">Product Cost Lost</div>
        <div class="rs-impact-val">-$${totalProduct.toFixed(2)}</div>
        <div class="rs-impact-sub">Non-recoverable COGS</div>
      </div>
      <div class="rs-impact-card rs-impact-clickable" data-section="section-shipping-calc" role="button" tabindex="0" style="cursor:pointer">
        <div class="rs-impact-icon">🚚</div>
        <div class="rs-impact-label">Shipping Cost Lost</div>
        <div class="rs-impact-val">-$${totalShipping.toFixed(2)}</div>
        <div class="rs-impact-sub">Outbound + return shipping</div>
      </div>
      <div class="rs-impact-card rs-impact-clickable" data-section="section-budget" role="button" tabindex="0" style="cursor:pointer">
        <div class="rs-impact-icon">📢</div>
        <div class="rs-impact-label">Ad Spend Wasted</div>
        <div class="rs-impact-val" style="color:var(--accent-orange)">-$${totalAdSpend.toFixed(2)}</div>
        <div class="rs-impact-sub">CAC on refunded orders</div>
      </div>
      <div class="rs-impact-card rs-impact-clickable" data-section="section-refund-shield" role="button" tabindex="0" style="cursor:pointer">
        <div class="rs-impact-icon">🛡️</div>
        <div class="rs-impact-label">Disputed/Recovered</div>
        <div class="rs-impact-val" style="color:var(--accent-green)">+$${recovered.toFixed(2)}</div>
        <div class="rs-impact-sub">${recoveryRate}% recovery rate</div>
      </div>
      <div class="rs-impact-card rs-impact-total">
        <div class="rs-impact-icon">📊</div>
        <div class="rs-impact-label">Net Loss</div>
        <div class="rs-impact-val" style="color:var(--accent-red);font-size:24px">-$${netLoss.toFixed(2)}</div>
        <div class="rs-impact-sub">Total profit impact</div>
      </div>
    </div>`;
    }

    function renderRefundList() {
      const el = UI.$('rsRefundList');
      if (!el) return;
      let filtered = _refunds;
      if (_selectedReason) {
        filtered = _refunds.filter((r) => r.reason === _selectedReason);
      }
      if (!filtered.length) {
        el.innerHTML = `<div class="rs-refund-empty">
      <div class="rs-refund-empty-icon">📋</div>
      <div class="rs-refund-empty-title">${_selectedReason ? 'No refunds match this filter' : 'No refunds logged yet'}</div>
      <div class="rs-refund-empty-desc">${_selectedReason ? 'Try clearing the filter or log a new refund.' : 'Start tracking refunds to see them here.'}</div>
      ${_selectedReason ? `<button class="rs-refund-empty-btn" id="rsClearFilter">Clear Filter</button>` : ''}
    </div>`;
        const clearBtn = UI.$('rsClearFilter');
        if (clearBtn)
          clearBtn.addEventListener('click', () => {
            _selectedReason = null;
            renderCauses();
            renderRefundList();
          });
        return;
      }
      el.innerHTML = filtered
        .map((r) => {
          const reason = REFUND_REASONS.find((x) => x.id === r.reason) || REFUND_REASONS[0];
          const trueLoss = calcTrueLoss(r);
          const sevColor =
            reason.severity === 'critical'
              ? 'var(--accent-red)'
              : reason.severity === 'high'
                ? 'var(--accent-orange)'
                : reason.severity === 'medium'
                  ? 'var(--accent-yellow)'
                  : 'var(--accent-green)';
          return `<div class="rs-refund-card" data-refund="${r.id}" tabindex="0" role="button" aria-label="View refund ${r.id} details">
      <div class="rs-ref-head">
        <span class="rs-ref-id">${esc(r.id)}</span>
        <span class="rs-ref-order">← ${esc(r.orderId)}</span>
        <span class="rs-ref-status rs-ref-${r.status}">${r.status}</span>
        <svg class="rs-ref-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <div class="rs-ref-body">
        <div class="rs-ref-product">${esc(r.product)} · ${esc(r.customer)}</div>
        <div class="rs-ref-reason">
          <span class="rs-ref-reason-tag" style="background:${sevColor}20;color:${sevColor}">${reason.icon} ${reason.name}</span>
        </div>
        <div class="rs-ref-amounts">
          <span class="rs-ref-amt"><span class="rs-ref-amt-label">Refunded</span><strong>$${r.amount.toFixed(2)}</strong></span>
          <span class="rs-ref-amt"><span class="rs-ref-amt-label">True cost</span><strong style="color:var(--accent-red)">$${calcRefundCost(r).toFixed(2)}</strong></span>
          <span class="rs-ref-amt"><span class="rs-ref-amt-label">Net loss</span><strong style="color:var(--accent-red)">$${trueLoss.toFixed(2)}</strong></span>
        </div>
        ${r.notes ? `<div class="rs-ref-notes">📝 ${esc(r.notes)}</div>` : ''}
        <div class="rs-ref-meta">
          <span class="rs-ref-meta-item">🏭 ${esc(r.supplier)}</span>
          <span class="rs-ref-meta-item">🛍️ ${esc(r.platform)}</span>
          <span class="rs-ref-meta-item">📅 ${r.date}</span>
        </div>
      </div>
      <div class="rs-ref-detail-panel">
        <div class="rs-ref-detail-title">Refund Breakdown</div>
        <div class="rs-ref-detail-grid">
          <div class="rs-ref-detail-item"><span>Product Cost</span><span>$${r.cost.toFixed(2)}</span></div>
          <div class="rs-ref-detail-item"><span>Shipping Cost</span><span>$${r.shippingCost.toFixed(2)}</span></div>
          <div class="rs-ref-detail-item"><span>Ad Cost (CAC)</span><span>$${r.adCost.toFixed(2)}</span></div>
          <div class="rs-ref-detail-item rs-ref-detail-total"><span>Total Cost</span><span>$${calcRefundCost(r).toFixed(2)}</span></div>
          <div class="rs-ref-detail-item rs-ref-detail-total"><span>Net Loss</span><span style="color:var(--accent-red)">$${trueLoss.toFixed(2)}</span></div>
        </div>
        <div class="rs-ref-detail-actions">
          <button class="rs-ref-detail-btn" data-refund="${r.id}">View Full Details →</button>
        </div>
      </div>
    </div>`;
        })
        .join('');

      el.querySelectorAll('.rs-refund-card').forEach((card) => {
        card.addEventListener('click', function (e) {
          if (e.target.closest('.rs-ref-detail-btn')) return;
          this.classList.toggle('rs-ref-expanded');
        });
      });

      el.querySelectorAll('.rs-ref-detail-btn').forEach((btn) => {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          const refundId = this.dataset.refund;
          sessionStorage.setItem('rs_drill_refund', refundId);
          navigateToSection('section-refund-detail');
        });
      });
    }

    function renderTrend() {
      const el = UI.$('rsTrend');
      if (!el) return;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const data = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = months[d.getMonth()];
        const count = _refunds.filter((r) => {
          const rd = new Date(r.date);
          return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        }).length;
        data.push({ month, count });
      }
      const maxCount = Math.max(...data.map((d) => d.count), 1);
      el.innerHTML = `<div class="rs-trend-chart">
    ${data
      .map(
        (
          d
        ) => `<div class="rs-trend-bar-wrap" data-section="section-refund-shield" role="button" tabindex="0" style="cursor:pointer" aria-label="${d.month}: ${d.count} refunds">
      <div class="rs-trend-bar" style="height:${Math.max(4, (d.count / maxCount) * 120)}px;background:${d.count > 3 ? 'var(--accent-red)' : d.count > 1 ? 'var(--accent-orange)' : 'var(--accent-green)'}"></div>
      <div class="rs-trend-label">${d.month}</div>
      <div class="rs-trend-val">${d.count}</div>
    </div>`
      )
      .join('')}
  </div>`;
    }

    function renderPlaybook() {
      const el = UI.$('rsPlaybook');
      if (!el) return;
      const counts = {};
      _refunds.forEach((r) => {
        counts[r.reason] = (counts[r.reason] || 0) + 1;
      });
      const topReasons = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      const plays = topReasons
        .map(([reasonId]) => {
          const r = REFUND_REASONS.find((x) => x.id === reasonId);
          return r
            ? {
                id: r.id,
                icon: r.icon,
                title: r.name,
                prevention: r.prevention,
                severity: r.severity,
                tips: r.tips,
                count: counts[reasonId],
              }
            : null;
        })
        .filter(Boolean);
      if (!plays.length)
        plays.push({
          id: 'none',
          icon: '✅',
          title: 'No Major Issues',
          prevention: 'Your refund rate is low. Keep monitoring and maintain quality standards.',
          severity: 'low',
          tips: [],
          count: 0,
        });
      el.innerHTML = `<div class="rs-play-grid">${plays
        .map((p, i) => {
          const sevColor =
            p.severity === 'critical'
              ? 'var(--accent-red)'
              : p.severity === 'high'
                ? 'var(--accent-orange)'
                : p.severity === 'medium'
                  ? 'var(--accent-yellow)'
                  : 'var(--accent-green)';
          return `<div class="rs-play-card" data-reason="${p.id}" tabindex="0" role="button">
      <div class="rs-play-num">${i + 1}</div>
      <div class="rs-play-icon">${p.icon}</div>
      <div class="rs-play-info">
        <div class="rs-play-title">${p.title} <span class="rs-play-count">(${p.count}x)</span></div>
        <div class="rs-play-action">${p.prevention}</div>
        ${
          p.tips.length
            ? `<div class="rs-play-tips">${p.tips
                .slice(0, 2)
                .map((t) => `<span class="rs-play-tip">• ${t}</span>`)
                .join('')}</div>`
            : ''
        }
      </div>
      <div class="rs-play-right">
        <div class="rs-play-sev" style="color:${sevColor}">${p.severity}</div>
        <svg class="rs-play-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>`;
        })
        .join('')}</div>`;

      el.querySelectorAll('.rs-play-card').forEach((card) => {
        card.addEventListener('click', function () {
          const reason = this.dataset.reason;
          if (reason && reason !== 'none') {
            sessionStorage.setItem('rs_drill_reason', reason);
            navigateToSection('section-refund-root-cause');
          }
        });
      });
    }

    function refreshAll() {
      renderCauses();
      renderSupplierGrid();
      renderImpact();
      renderRefundList();
      renderTrend();
      renderPlaybook();
    }

    function bindEvents() {
      if (!_section) return;

      _section.querySelectorAll('[data-scroll-target]').forEach((el) => {
        el.addEventListener('click', function () {
          scrollToSection(this.dataset.scrollTarget);
        });
      });

      UI.$('rsAddBtn')?.addEventListener('click', () => {
        const refund = {
          id: 'REF-' + String(_refunds.length + 1).padStart(3, '0'),
          orderId: UI.$('rsNewOrder')?.value || 'ORD-XXX',
          product: UI.$('rsNewProduct')?.value || 'Product',
          customer: UI.$('rsNewCustomer')?.value || 'Customer',
          date: new Date().toISOString().split('T')[0],
          amount: parseFloat(UI.$('rsNewAmount')?.value) || 0,
          cost: parseFloat(UI.$('rsNewCost')?.value) || 0,
          shippingCost: parseFloat(UI.$('rsNewShip')?.value) || 0,
          adCost: parseFloat(UI.$('rsNewAd')?.value) || 0,
          reason: UI.$('rsNewReason')?.value || 'quality',
          status: 'completed',
          supplier: UI.$('rsNewSupplier')?.value || 'Unknown',
          platform: UI.$('rsNewPlatform')?.value || 'Shopify',
          notes: UI.$('rsNewNotes')?.value || '',
        };
        _refunds.unshift(refund);
        saveRefunds(_refunds);
        refreshAll();
        [
          'rsNewOrder',
          'rsNewProduct',
          'rsNewCustomer',
          'rsNewAmount',
          'rsNewCost',
          'rsNewShip',
          'rsNewAd',
          'rsNewSupplier',
          'rsNewNotes',
        ].forEach((id) => {
          const el = UI.$(id);
          if (el) el.value = '';
        });
        UI.toast && UI.toast('Refund logged successfully', 'success');
      });

      UI.$('rsExportBtn')?.addEventListener('click', () => {
        const csv = [
          'Refund ID,Order ID,Product,Customer,Date,Amount,Cost,Shipping,Ad Cost,Reason,Status,Supplier,Platform,Notes',
        ];
        _refunds.forEach((r) => {
          csv.push(
            `"${r.id}","${r.orderId}","${r.product}","${r.customer}","${r.date}",${r.amount},${r.cost},${r.shippingCost},${r.adCost},"${r.reason}","${r.status}","${r.supplier}","${r.platform}","${r.notes || ''}"`
          );
        });
        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'refund-shield-report.csv';
        a.click();
        URL.revokeObjectURL(url);
        UI.toast && UI.toast('CSV exported successfully', 'success');
      });
    }

    PluginRegistry.register('refund-shield', {
      id: 'refund-shield',
      name: 'Refund Shield',
      version: '2.0.0',
      description: 'Refund intelligence — track, analyze, and prevent refund losses across all platforms',

      init(_ctx) {
        Config.defaults('refundShield', { period: '30d' });
        _refunds = getStoredRefunds();
      },

      mount(_ctx) {
        const container = UI.$('sections-container');
        if (!container) return;

        const section = document.createElement('section');
        section.className = 'section section-refund-shield';
        section.id = 'section-refund-shield';

        const stats = getStats();

        section.innerHTML = `
      <div class="section-inner">
        <div class="rs-hero">
          <div class="rs-hero-bg"></div>
          <div class="rs-hero-content">
            <div class="rs-hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Profit Protection
            </div>
            <h1 class="rs-hero-title">Refund Shield</h1>
            <p class="rs-hero-desc">Every refund silently eats your profit. Track refund rates, identify root causes, quantify true losses, and take action before problems compound.</p>
            <div class="rs-hero-kpis">
              <div class="rs-hkpi rs-hkpi-clickable" data-scroll-target="rsRefundList" tabindex="0" role="button" aria-label="View all refunds">
                <div class="rs-hkpi-val">${stats.totalRefunds}</div>
                <div class="rs-hkpi-label">Total Refunds</div>
                <div class="rs-hkpi-link">View All →</div>
              </div>
              <div class="rs-hkpi rs-hkpi-clickable" data-scroll-target="rsCauses" tabindex="0" role="button" aria-label="View root causes">
                <div class="rs-hkpi-val" style="color:${stats.refundRate > BENCHMARKS.dropshipping ? 'var(--accent-red)' : 'var(--accent-green)'}">${stats.refundRate}%</div>
                <div class="rs-hkpi-label">Refund Rate</div>
                <div class="rs-hkpi-link">Analyze →</div>
              </div>
              <div class="rs-hkpi rs-hkpi-clickable" data-scroll-target="rsImpact" tabindex="0" role="button" aria-label="View profit impact">
                <div class="rs-hkpi-val" style="color:var(--accent-red)">-$${stats.totalLost.toFixed(2)}</div>
                <div class="rs-hkpi-label">Total Lost</div>
                <div class="rs-hkpi-link">Breakdown →</div>
              </div>
              <div class="rs-hkpi rs-hkpi-clickable" data-scroll-target="rsPlaybook" tabindex="0" role="button" aria-label="View prevention playbook">
                <div class="rs-hkpi-val" style="color:var(--accent-orange)">$${stats.avgCostPerRefund.toFixed(2)}</div>
                <div class="rs-hkpi-label">Avg Cost/Refund</div>
                <div class="rs-hkpi-link">Prevent →</div>
              </div>
            </div>
          </div>
        </div>

        <div class="rs-quick-actions">
          <button class="rs-quick-btn" id="rsExportBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button class="rs-quick-btn" onclick="document.getElementById('rsAddForm')?.scrollIntoView({behavior:'smooth'})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Log Refund
          </button>
          <button class="rs-quick-btn rs-quick-nav" data-nav="section-refund-root-cause">
            Root Cause Deep Dive →
          </button>
          <button class="rs-quick-btn rs-quick-nav" data-nav="section-refund-supplier-risk">
            Supplier Risk Profiles →
          </button>
        </div>

        <div class="rs-section" id="rsOverviewSection">
          <div class="rs-section-header">
            <h2 class="rs-section-title">📊 Refund Overview</h2>
            <p class="rs-section-desc">Key metrics compared against industry benchmarks — where do you stand?</p>
          </div>
          <div class="rs-overview">
            <div class="rs-ov-card" data-section="section-refund-root-cause" role="button" tabindex="0" style="cursor:pointer">
              <div class="rs-ov-header">
                <span class="rs-ov-icon">📉</span>
                <span class="rs-ov-title">Your Refund Rate</span>
              </div>
              <div class="rs-ov-big" style="color:${stats.refundRate > BENCHMARKS.dropshipping ? 'var(--accent-red)' : 'var(--accent-green)'}">${stats.refundRate}%</div>
              <div class="rs-ov-bench">Industry avg: ${BENCHMARKS.dropshipping}% (dropshipping)</div>
              <div class="rs-ov-bar"><div class="rs-ov-bar-fill" style="width:${Math.min(100, stats.refundRate * 10)}%;background:${stats.refundRate > BENCHMARKS.dropshipping ? 'var(--accent-red)' : 'var(--accent-green)'}"></div></div>
            </div>
            <div class="rs-ov-card" data-section="section-refund-root-cause" role="button" tabindex="0" style="cursor:pointer">
              <div class="rs-ov-header">
                <span class="rs-ov-icon">💰</span>
                <span class="rs-ov-title">Revenue Lost to Refunds</span>
              </div>
              <div class="rs-ov-big" style="color:var(--accent-red)">-$${stats.totalLost.toFixed(2)}</div>
              <div class="rs-ov-bench">${stats.refundRate > 0 ? Math.round(stats.refundRate) + '% of your gross revenue' : 'No losses yet'}</div>
            </div>
            <div class="rs-ov-card" data-section="section-profit-lab" role="button" tabindex="0" style="cursor:pointer">
              <div class="rs-ov-header">
                <span class="rs-ov-icon">💸</span>
                <span class="rs-ov-title">True Cost Per Refund</span>
              </div>
              <div class="rs-ov-big" style="color:var(--accent-orange)">$${stats.avgCostPerRefund.toFixed(2)}</div>
              <div class="rs-ov-bench">Includes: product + shipping + ad spend</div>
            </div>
            <div class="rs-ov-card" data-section="section-refund-shield" role="button" tabindex="0" style="cursor:pointer">
              <div class="rs-ov-header">
                <span class="rs-ov-icon">🛡️</span>
                <span class="rs-ov-title">Shield Score</span>
              </div>
              <div class="rs-ov-big" style="color:${stats.shieldScore >= 70 ? 'var(--accent-green)' : stats.shieldScore >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)'}">${stats.shieldScore}/100</div>
              <div class="rs-ov-bench">${stats.shieldScore >= 70 ? 'Good — losses well controlled' : stats.shieldScore >= 40 ? 'Needs attention — significant losses' : 'Critical — urgent action needed'}</div>
            </div>
          </div>
        </div>

        <div class="rs-section" id="rsCausesSection">
          <div class="rs-section-header">
            <h2 class="rs-section-title">🔍 Root Cause Analysis</h2>
            <p class="rs-section-desc">Why customers request refunds — click any cause to expand details or view full analysis</p>
          </div>
          <div class="rs-causes" id="rsCauses"></div>
        </div>

        <div class="rs-section" id="rsSupplierSection">
          <div class="rs-section-header">
            <h2 class="rs-section-title">🏭 Supplier Risk Matrix</h2>
            <p class="rs-section-desc">Which suppliers cause the most refund losses — click to view full risk profile</p>
          </div>
          <div class="rs-supplier-grid" id="rsSupplierGrid"></div>
        </div>

        <div class="rs-section" id="rsImpactSection">
          <div class="rs-section-header">
            <h2 class="rs-section-title">💸 Profit Impact Calculator</h2>
            <p class="rs-section-desc">True cost of each refund — including sunk ad spend that can never be recovered</p>
          </div>
          <div class="rs-impact" id="rsImpact"></div>
        </div>

        <div class="rs-section" id="rsAddSection">
          <div class="rs-section-header">
            <h2 class="rs-section-title">➕ Log New Refund</h2>
            <p class="rs-section-desc">Record a refund event to keep your data accurate and improve intelligence</p>
          </div>
          <div class="rs-panel">
            <div class="rs-add-form" id="rsAddForm">
              <div class="rs-form-row">
                <div class="rs-field"><label class="rs-label">Order ID</label><input id="rsNewOrder" class="rs-input" placeholder="ORD-001"></div>
                <div class="rs-field"><label class="rs-label">Product</label><input id="rsNewProduct" class="rs-input" placeholder="Product name"></div>
                <div class="rs-field"><label class="rs-label">Customer</label><input id="rsNewCustomer" class="rs-input" placeholder="Customer name"></div>
              </div>
              <div class="rs-form-row">
                <div class="rs-field"><label class="rs-label">Refund Amount ($)</label><input id="rsNewAmount" class="rs-input" type="number" min="0" step="0.01" placeholder="0.00"></div>
                <div class="rs-field"><label class="rs-label">Product Cost ($)</label><input id="rsNewCost" class="rs-input" type="number" min="0" step="0.01" placeholder="0.00"></div>
                <div class="rs-field"><label class="rs-label">Shipping Cost ($)</label><input id="rsNewShip" class="rs-input" type="number" min="0" step="0.01" placeholder="0.00"></div>
                <div class="rs-field"><label class="rs-label">Ad Cost ($)</label><input id="rsNewAd" class="rs-input" type="number" min="0" step="0.01" placeholder="0.00"></div>
              </div>
              <div class="rs-form-row">
                <div class="rs-field"><label class="rs-label">Reason</label>
                  <select id="rsNewReason" class="rs-select">${REFUND_REASONS.map((r) => `<option value="${r.id}">${r.icon} ${r.name}</option>`).join('')}</select>
                </div>
                <div class="rs-field"><label class="rs-label">Supplier</label><input id="rsNewSupplier" class="rs-input" placeholder="Supplier name"></div>
                <div class="rs-field"><label class="rs-label">Platform</label>
                  <select id="rsNewPlatform" class="rs-select"><option>Shopify</option><option>Amazon</option><option>eBay</option><option>TikTok Shop</option><option>Etsy</option></select>
                </div>
              </div>
              <div class="rs-field"><label class="rs-label">Notes</label><textarea id="rsNewNotes" class="rs-textarea" rows="2" placeholder="What happened..."></textarea></div>
              <button class="rs-add-btn" id="rsAddBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Log Refund
              </button>
            </div>
          </div>
        </div>

        <div class="rs-section" id="rsListSection">
          <div class="rs-section-header">
            <h2 class="rs-section-title">📋 All Refund Events</h2>
            <p class="rs-section-desc">Complete log of every refund — click any card to expand details or view full breakdown</p>
          </div>
          <div class="rs-refund-list" id="rsRefundList"></div>
        </div>

        <div class="rs-section" id="rsTrendSection">
          <div class="rs-section-header">
            <h2 class="rs-section-title">📊 Monthly Trend</h2>
            <p class="rs-section-desc">Refund rate trend over time — are you improving or getting worse?</p>
          </div>
          <div class="rs-trend" id="rsTrend"></div>
        </div>

        <div class="rs-section" id="rsPlaybookSection">
          <div class="rs-section-header">
            <h2 class="rs-section-title">💡 Prevention Playbook</h2>
            <p class="rs-section-desc">Actionable steps to reduce refunds — click any card for the full prevention guide</p>
          </div>
          <div class="rs-playbook" id="rsPlaybook"></div>
        </div>

        ${
          window.HuntDrop.renderRelatedTools
            ? window.HuntDrop.renderRelatedTools([
                {
                  section: 'section-profit-lab',
                  name: 'Profit Calculator',
                  desc: 'Factor refund rates into profit margins',
                  icon: '💰',
                  color: 'var(--accent-green)',
                },
                {
                  section: 'section-order-tracker',
                  name: 'Order Tracker',
                  desc: 'Track orders before they become refunds',
                  icon: '📦',
                  color: 'var(--accent-cyan)',
                },
                {
                  section: 'section-supplier-intel',
                  name: 'Supplier Check',
                  desc: 'Verify supplier quality and reliability',
                  icon: '🛡',
                  color: 'var(--accent-yellow)',
                },
                {
                  section: 'section-store-health',
                  name: 'Store Health',
                  desc: 'Refund rate affects store health score',
                  icon: '❤',
                  color: 'var(--accent-red)',
                },
                {
                  section: 'section-business-sim',
                  name: 'Business Simulator',
                  desc: 'Model scenarios with real refund rates',
                  icon: '🎯',
                  color: 'var(--accent-purple)',
                },
                {
                  section: 'section-cash-flow',
                  name: 'Cash Flow',
                  desc: 'Refund impact on cash position',
                  icon: '💳',
                  color: 'var(--accent-orange)',
                },
              ])
            : ''
        }
      </div>`;
        container.appendChild(section);
        _section = section;

        _section.querySelectorAll('.rs-quick-nav').forEach((btn) => {
          btn.addEventListener('click', function () {
            navigateToSection(this.dataset.nav);
          });
        });

        section.addEventListener('click', (e) => {
          const card = e.target.closest('[data-section]');
          if (!card) return;
          if (
            e.target.closest(
              'button, a, select, input, .rs-cause-filter-btn, .rs-cause-detail-btn, .rs-sup-view-btn, .rs-ref-detail-btn'
            )
          )
            return;
          e.preventDefault();
          const target = card.getAttribute('data-section');
          if (target && window.HuntDrop && window.HuntDrop.navigateTo) {
            window.HuntDrop.navigateTo(target);
          }
        });

        section.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            const card = e.target.closest('[data-section]');
            if (card && !e.target.closest('button, a, select, input')) {
              e.preventDefault();
              card.click();
            }
          }
        });

        bindEvents();
        renderCauses();
        renderSupplierGrid();
        renderImpact();
        renderRefundList();
        renderTrend();
        renderPlaybook();
      },

      unmount(_ctx) {
        (_cleanups || []).forEach((fn) => {
          try {
            fn();
          } catch (e) {}
        });
        _cleanups = [];
        const el = UI.$('section-refund-shield');
        if (el) el.remove();
        _section = null;
      },
    });
    Object.defineProperty(window.HuntDrop.PluginRegistry.get('refund-shield'), '_section', {
      get() {
        return _section;
      },
      set(v) {
        _section = v;
      },
      configurable: true,
    });
  } catch (e) {
    console.error('[RefundShield] error:', e);
  }
})();
