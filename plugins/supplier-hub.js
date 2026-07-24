// ============================================================================
// PLUGIN: Supplier Hub v4 — Internet-connected supplier search + directory
// ============================================================================
(function () {
  const { PluginRegistry, UI } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(String(s || ''));
  let _section = null;
  let _suppliers = [];
  let _searching = false;

  const BACKEND_URL =
    window.HuntDrop.BACKEND_URL ||
    (window.HuntDrop._proxyUrl
      ? window.HuntDrop._proxyUrl.replace(/\/api\/platform\/?$/, '/api')
      : 'https://backend-psi-five-60.vercel.app/api');

  function computeScore(s) {
    if (!s) return 0;
    const q = s.quality || 0;
    const c = s.communication || 0;
    const v = s.value || 0;
    return Math.round(q * 0.3 + c * 0.3 + v * 0.4);
  }

  function getRiskLevel(s) {
    if (!s) return { level: 'LOW', color: 'var(--accent-green)' };
    let risk = 0;
    if (!s.verified) risk += 30;
    if ((s.rating || 5) < 4.5) risk += 15;
    if ((s.disputeRate || 0) > 1.5) risk += 20;
    if ((s.responseRate || 100) < 90) risk += 15;
    if (risk > 40) return { level: 'HIGH', color: 'var(--accent-red)' };
    if (risk > 20) return { level: 'MEDIUM', color: 'var(--accent-orange)' };
    return { level: 'LOW', color: 'var(--accent-green)' };
  }

  function getGrade(score) {
    if (score >= 90) return { grade: 'A+', color: 'var(--accent-green)' };
    if (score >= 80) return { grade: 'A', color: 'var(--accent-green)' };
    if (score >= 70) return { grade: 'B+', color: 'var(--accent-cyan)' };
    if (score >= 60) return { grade: 'B', color: 'var(--accent-cyan)' };
    if (score >= 50) return { grade: 'C', color: 'var(--accent-orange)' };
    return { grade: 'D', color: 'var(--accent-red)' };
  }

  function _formatMoney(n) {
    return '$' + n.toFixed(2);
  }

  function renderCards(suppliers) {
    const grid = _section?.querySelector('#supplierHubGrid');
    if (!grid) return;
    grid.innerHTML = suppliers
      .map((s, i) => {
        try {
          const score = computeScore(s);
          const risk = getRiskLevel(s);
          const grade = getGrade(score);
          const name = s.name || 'Unknown Supplier';
          const platform = s.platform || 'Unknown';
          const location = s.location || '';
          const color = s.color || '#667eea';
          return `<div class="supplier-hub-card" tabindex="0" role="button" aria-label="View ${esc(name)} details" data-idx="${i}" data-verified="${s.verified}" data-response="${esc(s.responseTime || '')}" data-rating="${s.rating || 0}" data-platform="${esc(platform)}">
      <div class="supplier-hub-header">
        <div class="supplier-hub-avatar" style="background:${esc(color)}22;color:${esc(color)}">${esc(name.charAt(0))}</div>
        <div><div class="supplier-hub-name">${esc(name)}</div><div class="supplier-hub-platform">${esc(platform)} \u2022 ${esc(location)}</div></div>
        <div class="sh-card-grade" style="background:${esc(grade.color)}18;color:${esc(grade.color)}">${esc(grade.grade)}</div>
      </div>
      <div class="supplier-hub-stats">
        <div class="supplier-hub-stat"><span class="supplier-hub-stat-value" style="color:var(--accent-yellow)">${esc(s.rating || 0)}\u2605</span><span class="supplier-hub-stat-label">Rating</span></div>
        <div class="supplier-hub-stat"><span class="supplier-hub-stat-value">${esc(s.orders || 0)}</span><span class="supplier-hub-stat-label">Orders</span></div>
        <div class="supplier-hub-stat"><span class="supplier-hub-stat-value">${esc(s.responseTime || 'N/A')}</span><span class="supplier-hub-stat-label">Response</span></div>
        <div class="supplier-hub-stat"><span class="supplier-hub-stat-value">${esc(s.topProducts?.length || 0)}</span><span class="supplier-hub-stat-label">Products</span></div>
      </div>
      <div class="supplier-hub-score-bar"><div class="supplier-hub-score-fill" style="width:${score}%;background:${score >= 90 ? 'var(--accent-green)' : score >= 80 ? 'var(--accent-cyan)' : 'var(--accent-orange)'}"></div><span class="supplier-hub-score-text">${score}/100</span></div>
      <div class="supplier-hub-footer">
        ${s.verified ? '<span class="supplier-verified">\u2713 Verified</span>' : ''}
        <span class="sh-card-risk" style="color:${esc(risk.color)}">${esc(risk.level)} RISK</span>
        <span class="sh-card-view">View Details \u2192</span>
      </div>
    </div>`;
        } catch (err) {
          console.warn('[SupplierHub] Failed to render card:', s, err);
          return '';
        }
      })
      .join('');

    grid.querySelectorAll('.supplier-hub-card').forEach((card) => {
      const handler = () => {
        const idx = parseInt(card.dataset.idx);
        if (suppliers[idx]) showDetail(suppliers[idx]);
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });
  }

  function showDetail(supplier) {
    if (!supplier) return;
    const panel = _section?.querySelector('#supplierDetailPanel');
    if (!panel) return;
    try {
      const score = computeScore(supplier);
      const risk = getRiskLevel(supplier);
      const grade = getGrade(score);
      const name = supplier.name || 'Unknown Supplier';
      const platform = supplier.platform || 'Unknown';
      const location = supplier.location || 'N/A';
      const specialty = supplier.specialty || 'General';
      const color = supplier.color || '#667eea';
      const quality = supplier.quality || 0;
      const communication = supplier.communication || 0;
      const value = supplier.value || 0;
      const responseRate = supplier.responseRate || 0;
      const fulfillmentRate = supplier.fulfillmentRate || 0;
      const disputeRate = supplier.disputeRate || 0;

      panel.innerHTML = `
    <div class="sh-detail-overlay" id="shDetailClose"></div>
    <div class="sh-detail-content">
      <button class="sh-detail-close" id="shDetailCloseBtn" aria-label="Close detail panel">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="sh-detail-hero">
        <div class="sh-detail-avatar" style="background:${esc(color)}22;color:${esc(color)};border:2px solid ${esc(color)}">${esc(name.charAt(0))}</div>
        <div class="sh-detail-hero-info">
          <h2 class="sh-detail-name">${esc(name)}</h2>
          <div class="sh-detail-meta">${esc(platform)} \u2022 ${esc(location)} \u2022 ${esc(specialty)}</div>
          <div class="sh-detail-badges">
            <span class="sh-detail-badge" style="background:${esc(grade.color)}18;color:${esc(grade.color)}">Grade ${esc(grade.grade)}</span>
            <span class="sh-detail-badge" style="background:var(--accent-yellow-dim);color:var(--accent-yellow)">${esc(supplier.rating || 0)}\u2605</span>
            <span class="sh-detail-badge" style="background:${esc(risk.color)}18;color:${esc(risk.color)}">${esc(risk.level)} RISK</span>
            ${supplier.verified ? '<span class="sh-detail-badge" style="background:var(--accent-green-dim);color:var(--accent-green)">\u2713 Verified</span>' : ''}
          </div>
        </div>
        <div class="sh-detail-score-ring">
          <svg viewBox="0 0 100 100" class="sh-detail-ring-svg">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-primary)" stroke-width="6"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke="${score >= 90 ? 'var(--accent-green)' : score >= 80 ? 'var(--accent-cyan)' : 'var(--accent-orange)'}" stroke-width="6" stroke-dasharray="${264}" stroke-dashoffset="${264 - (264 * score) / 100}" stroke-linecap="round" transform="rotate(-90 50 50)" style="transition:stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)"/>
          </svg>
          <div class="sh-detail-score-val">${score}</div>
          <div class="sh-detail-score-label">Score</div>
        </div>
      </div>

      <div class="sh-detail-grid">
        <div class="sh-detail-card">
          <h4>\uD83D\uDCCA Key Metrics</h4>
          <div class="sh-detail-metrics">
            <div class="sh-detail-m"><span class="sh-detail-m-label">Total Orders</span><span class="sh-detail-m-val">${esc(supplier.orders || 0)}</span></div>
            <div class="sh-detail-m"><span class="sh-detail-m-label">Products</span><span class="sh-detail-m-val">${esc(supplier.topProducts?.length || 0)}</span></div>
            <div class="sh-detail-m"><span class="sh-detail-m-label">Response Time</span><span class="sh-detail-m-val">${esc(supplier.responseTime || 'N/A')}</span></div>
            <div class="sh-detail-m"><span class="sh-detail-m-label">Response Rate</span><span class="sh-detail-m-val">${esc(responseRate)}%</span></div>
            <div class="sh-detail-m"><span class="sh-detail-m-label">Fulfillment Rate</span><span class="sh-detail-m-val">${esc(fulfillmentRate)}%</span></div>
            <div class="sh-detail-m"><span class="sh-detail-m-label">Dispute Rate</span><span class="sh-detail-m-val" style="color:${disputeRate < 1 ? 'var(--accent-green)' : 'var(--accent-orange)'}">${esc(disputeRate)}%</span></div>
            <div class="sh-detail-m"><span class="sh-detail-m-label">Refund Rate</span><span class="sh-detail-m-val">${esc(supplier.refundRate || 'N/A')}</span></div>
            <div class="sh-detail-m"><span class="sh-detail-m-label">Years Active</span><span class="sh-detail-m-val">${esc(supplier.yearsActive || 'N/A')} years</span></div>
          </div>
        </div>

        <div class="sh-detail-card">
          <h4>\uD83D\uDCE9 Shipping Info</h4>
          <div class="sh-detail-metrics">
            <div class="sh-detail-m"><span class="sh-detail-m-label">Ship Time</span><span class="sh-detail-m-val">${esc(supplier.shipTime || 'N/A')}</span></div>
            <div class="sh-detail-m"><span class="sh-detail-m-label">Ship Cost</span><span class="sh-detail-m-val">${esc(supplier.shipCost || 'N/A')}</span></div>
            <div class="sh-detail-m"><span class="sh-detail-m-label">Min Order</span><span class="sh-detail-m-val">${esc(supplier.minOrder || 'N/A')}</span></div>
            <div class="sh-detail-m"><span class="sh-detail-m-label">Payment Terms</span><span class="sh-detail-m-val">${esc(supplier.paymentTerms || 'N/A')}</span></div>
          </div>
        </div>

        <div class="sh-detail-card">
          <h4>\u2705 Capabilities</h4>
          <div class="sh-detail-cap-list">
            <div class="sh-detail-cap ${supplier.verified ? 'cap-yes' : 'cap-no'}">${supplier.verified ? '\u2713' : '\u2717'} Verified Supplier</div>
            <div class="sh-detail-cap ${supplier.sampleAvailable ? 'cap-yes' : 'cap-no'}">${supplier.sampleAvailable ? '\u2713' : '\u2717'} Sample Available</div>
            <div class="sh-detail-cap ${supplier.customPackaging ? 'cap-yes' : 'cap-no'}">${supplier.customPackaging ? '\u2713' : '\u2717'} Custom Packaging</div>
            <div class="sh-detail-cap ${supplier.dropshipSupport ? 'cap-yes' : 'cap-no'}">${supplier.dropshipSupport ? '\u2713' : '\u2717'} Dropship Support</div>
          </div>
        </div>

        <div class="sh-detail-card">
          <h4>\uD83C\uDFC6 Top Products</h4>
          <div class="sh-detail-products">
            ${(supplier.topProducts || []).map((p) => `<span class="sh-detail-product-chip" tabindex="0" role="button" aria-label="Search for ${esc(p)}" data-product="${esc(p)}">${esc(p)}</span>`).join('') || '<span class="sh-empty">No products listed</span>'}
          </div>
        </div>
      </div>

      <div class="sh-detail-score-bars">
        <h4>\uD83C\uDFAF Score Breakdown</h4>
        <div class="sh-detail-bars">
          <div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Quality</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:${quality}%;background:var(--accent-green)"></div></div><span class="sh-detail-bar-val">${quality}</span></div>
          <div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Communication</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:${communication}%;background:var(--accent-cyan)"></div></div><span class="sh-detail-bar-val">${communication}</span></div>
          <div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Value</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:${value}%;background:var(--accent-purple)"></div></div><span class="sh-detail-bar-val">${value}</span></div>
          <div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Response Rate</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:${responseRate}%;background:var(--accent-yellow)"></div></div><span class="sh-detail-bar-val">${responseRate}%</span></div>
          <div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Fulfillment</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:${fulfillmentRate}%;background:var(--accent-green)"></div></div><span class="sh-detail-bar-val">${fulfillmentRate}%</span></div>
        </div>
      </div>

      <div class="sh-detail-actions">
        <button class="sh-detail-action-btn sh-detail-primary" onclick="window.HuntDrop.navigateTo('section-profit-lab')">\uD83D\uDCB0 Calculate Profit</button>
        <button class="sh-detail-action-btn" onclick="window.HuntDrop.navigateTo('section-store-gen')">\uD83C\uDFEA Build Store</button>
        <button class="sh-detail-action-btn" onclick="window.HuntDrop.navigateTo('section-ad-studio')">\uD83C\uDFAC Create Ads</button>
      </div>
    </div>`;
      panel.classList.add('sh-detail-open');
      document.body.style.overflow = 'hidden';

      const closeBtn = panel.querySelector('#shDetailCloseBtn');
      const overlay = panel.querySelector('#shDetailClose');
      const closeDetail = () => {
        panel.classList.remove('sh-detail-open');
        panel.innerHTML = '';
        document.body.style.overflow = '';
      };
      if (closeBtn) closeBtn.addEventListener('click', closeDetail);
      if (overlay) overlay.addEventListener('click', closeDetail);

      const onEsc = (e) => {
        if (e.key === 'Escape') {
          closeDetail();
          document.removeEventListener('keydown', onEsc);
        }
      };
      document.addEventListener('keydown', onEsc);

      panel.querySelectorAll('.sh-detail-product-chip').forEach((chip) => {
        const handler = () => {
          const productName = chip.dataset.product;
          if (productName && window.HuntDrop.navigateTo) {
            closeDetail();
            setTimeout(() => {
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
        chip.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler();
          }
        });
      });
    } catch (err) {
      console.error('[SupplierHub] showDetail error:', err);
    }
  }

  function renderComparison(suppliers) {
    const compBody = _section?.querySelector('#shComparisonBody');
    if (!compBody) return;
    const sorted = [...suppliers].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);
    compBody.innerHTML = sorted
      .map((s) => {
        const score = computeScore(s);
        const name = s.name || 'Unknown';
        const color = s.color || '#667eea';
        return `<tr tabindex="0" role="button" aria-label="View ${esc(name)}" data-name="${esc(name)}">
      <td><div class="sh-comp-name"><div class="sh-comp-avatar" style="background:${esc(color)}22;color:${esc(color)}">${esc(name.charAt(0))}</div>${esc(name)}</div></td>
      <td>${esc(s.platform || 'Unknown')}</td>
      <td><span class="sh-badge sh-badge-yellow">${esc(s.rating || 0)}\u2605</span></td>
      <td>${esc(s.shipTime || 'N/A')}</td>
      <td>${esc(s.shipCost || 'N/A')}</td>
      <td>${esc(s.minOrder || 'N/A')}</td>
      <td><span class="sh-badge ${parseFloat(s.refundRate) < 1.5 ? 'sh-badge-green' : 'sh-badge-orange'}">${esc(s.refundRate || 'N/A')}</span></td>
      <td><span class="sh-badge sh-badge-cyan">${score}</span></td>
    </tr>`;
      })
      .join('');
    compBody.querySelectorAll('tr').forEach((row) => {
      const handler = () => {
        const s = suppliers.find((x) => x.name === row.dataset.name);
        if (s) showDetail(s);
      };
      row.addEventListener('click', handler);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });
  }

  function renderScores(suppliers) {
    const scoresGrid = _section?.querySelector('#shScoresGrid');
    if (!scoresGrid) return;
    const top6 = [...suppliers].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);
    scoresGrid.innerHTML = top6
      .map((s) => {
        const score = computeScore(s);
        const name = s.name || 'Unknown';
        const color = s.color || '#667eea';
        const quality = s.quality || 0;
        const communication = s.communication || 0;
        const value = s.value || 0;
        return `<div class="sh-score-card" tabindex="0" role="button" aria-label="View ${esc(name)} scores" data-name="${esc(name)}">
      <div class="sh-score-header">
        <div class="sh-comp-avatar" style="background:${esc(color)}22;color:${esc(color)}">${esc(name.charAt(0))}</div>
        <div><div class="sh-score-name">${esc(name)}</div><div class="sh-score-platform">${esc(s.platform || 'Unknown')}</div></div>
        <div class="sh-score-total">${score}</div>
      </div>
      <div class="sh-score-bars">
        <div class="sh-score-row"><span>Quality</span><div class="sh-bar"><div class="sh-bar-fill" style="width:${quality}%;background:var(--accent-green)"></div></div><span>${quality}</span></div>
        <div class="sh-score-row"><span>Communication</span><div class="sh-bar"><div class="sh-bar-fill" style="width:${communication}%;background:var(--accent-cyan)"></div></div><span>${communication}</span></div>
        <div class="sh-score-row"><span>Value</span><div class="sh-bar"><div class="sh-bar-fill" style="width:${value}%;background:var(--accent-purple)"></div></div><span>${value}</span></div>
      </div>
    </div>`;
      })
      .join('');
    scoresGrid.querySelectorAll('.sh-score-card').forEach((card) => {
      const handler = () => {
        const s = suppliers.find((x) => x.name === card.dataset.name);
        if (s) showDetail(s);
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });
  }

  function renderShipping(suppliers) {
    const shipGrid = _section?.querySelector('#shShippingGrid');
    if (!shipGrid) return;
    const platforms = {};
    suppliers.forEach((s) => {
      if (!platforms[s.platform]) platforms[s.platform] = { times: [], costs: [], count: 0 };
      if (s.shipTime) {
        const parts = s.shipTime.split('-');
        if (parts.length === 2) platforms[s.platform].times.push((parseInt(parts[0]) + parseInt(parts[1])) / 2);
      }
      if (s.shipCost && s.shipCost !== 'Free' && s.shipCost !== 'Free Prime') {
        const c = s.shipCost.replace('$', '').split('-');
        if (c.length === 2) platforms[s.platform].costs.push((parseFloat(c[0]) + parseFloat(c[1])) / 2);
      }
      platforms[s.platform].count++;
    });
    const icons = {
      AliExpress: '\uD83C\uDF10',
      Amazon: '\uD83D\uDCE6',
      'CJ Dropshipping': '\uD83D\uDE9A',
      DHgate: '\uD83C\uDFEA',
      Temu: '\uD83D\uDCB0',
      'TikTok Shop': '\uD83C\uDFB5',
      Etsy: '\uD83C\uDFA8',
    };
    shipGrid.innerHTML = Object.entries(platforms)
      .map(([name, p]) => {
        const avgTime = Math.round(p.times.reduce((a, b) => a + b, 0) / p.times.length);
        const avgCost = p.costs.length
          ? '$' + (p.costs.reduce((a, b) => a + b, 0) / p.costs.length).toFixed(2)
          : 'Free';
        return `<div class="sh-ship-card" tabindex="0" role="button" aria-label="Filter suppliers by ${name}" data-platform="${name}">
      <div class="sh-ship-icon">${icons[name] || '\uD83C\uDFE2'}</div>
      <div class="sh-ship-name">${name}</div>
      <div class="sh-ship-stats">
        <div class="sh-ship-stat"><span class="sh-ship-stat-label">Avg Ship Time</span><span class="sh-ship-stat-value">${avgTime} days</span></div>
        <div class="sh-ship-stat"><span class="sh-ship-stat-label">Avg Ship Cost</span><span class="sh-ship-stat-value">${avgCost}</span></div>
        <div class="sh-ship-stat"><span class="sh-ship-stat-label">Suppliers</span><span class="sh-ship-stat-value">${p.count}</span></div>
      </div>
    </div>`;
      })
      .join('');

    shipGrid.querySelectorAll('.sh-ship-card').forEach((card) => {
      const handler = () => {
        const platform = card.dataset.platform;
        const filterBtns = _section.querySelectorAll('.sf-btn');
        filterBtns.forEach((b) => b.classList.remove('active'));
        const allBtn = _section.querySelector('.sf-btn[data-sf="all"]');
        if (allBtn) allBtn.classList.add('active');
        const grid = _section?.querySelector('#supplierHubGrid');
        if (!grid) return;
        grid.querySelectorAll('.supplier-hub-card').forEach((c) => {
          const show = c.dataset.platform === platform;
          if (show) {
            c.classList.remove('sh-card-hidden');
            c.style.display = '';
          } else {
            c.classList.add('sh-card-hidden');
            setTimeout(() => {
              c.style.display = 'none';
            }, 300);
          }
        });
        _section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });
  }

  const CHECKLIST_KEY = 'huntdrop_supplier_checklist';

  function getCheckedItems() {
    try {
      return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function setCheckedItem(id, checked) {
    const items = getCheckedItems();
    if (checked) {
      items[id] = true;
    } else {
      delete items[id];
    }
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(items));
    updateChecklistProgress();
  }

  function updateChecklistProgress() {
    const progressEl = _section?.querySelector('#shChecklistProgress');
    const countEl = _section?.querySelector('#shChecklistCount');
    if (!progressEl || !countEl) return;
    const checked = getCheckedItems();
    const total = 10;
    const done = Object.keys(checked).length;
    const pct = Math.round((done / total) * 100);
    progressEl.style.width = pct + '%';
    countEl.textContent = done + '/' + total;
  }

  function renderChecklist() {
    const checklist = _section?.querySelector('#shChecklist');
    if (!checklist) return;
    const checked = getCheckedItems();
    const items = [
      {
        id: 'verify-license',
        icon: '\uD83D\uDD0D',
        title: 'Verify Business License',
        desc: 'Confirm the supplier has valid business registration and import/export licenses',
        priority: 'Critical',
      },
      {
        id: 'request-samples',
        icon: '\uD83D\uDCCB',
        title: 'Request Product Samples',
        desc: 'Always order 2-3 samples before committing to bulk orders',
        priority: 'Critical',
      },
      {
        id: 'test-response',
        icon: '\uD83D\uDCAC',
        title: 'Test Response Time',
        desc: 'Send inquiries at different hours to verify claimed response times',
        priority: 'High',
      },
      {
        id: 'check-orders',
        icon: '\uD83D\uDCCA',
        title: 'Check Order History',
        desc: 'Look for consistent order volume and positive feedback trends over 6+ months',
        priority: 'High',
      },
      {
        id: 'review-return',
        icon: '\uD83D\uDD04',
        title: 'Review Return Policy',
        desc: 'Understand refund terms, restocking fees, and dispute resolution process',
        priority: 'High',
      },
      {
        id: 'verify-photos',
        icon: '\uD83D\uDCF7',
        title: 'Verify Product Photos',
        desc: 'Request actual product photos, not just stock images',
        priority: 'Medium',
      },
      {
        id: 'compare-pricing',
        icon: '\uD83C\uDFF7\uFE0F',
        title: 'Compare Unit Pricing',
        desc: 'Get quotes for different quantities to understand volume discounts',
        priority: 'Medium',
      },
      {
        id: 'confirm-shipping',
        icon: '\uD83D\uDE9A',
        title: 'Confirm Shipping Methods',
        desc: 'Verify available carriers, tracking options, and insurance coverage',
        priority: 'Medium',
      },
      {
        id: 'read-reviews',
        icon: '\uD83D\uDCDD',
        title: 'Read Sample Reviews',
        desc: 'Check reviews from other dropshippers who use this supplier',
        priority: 'Low',
      },
      {
        id: 'negotiate-terms',
        icon: '\uD83E\uDD1D',
        title: 'Negotiate Terms',
        desc: 'Discuss payment terms, exclusivity options, and custom packaging availability',
        priority: 'Low',
      },
    ];
    const priColors = {
      Critical: 'var(--accent-red)',
      High: 'var(--accent-orange)',
      Medium: 'var(--accent-cyan)',
      Low: 'var(--text-muted)',
    };
    const done = Object.keys(checked).length;
    const total = items.length;
    const pct = Math.round((done / total) * 100);

    checklist.innerHTML = `
      <div class="sh-check-progress-bar">
        <div class="sh-check-progress-track">
          <div class="sh-check-progress-fill" id="shChecklistProgress" style="width:${pct}%"></div>
        </div>
        <div class="sh-check-progress-info">
          <span class="sh-check-progress-label">Verification Progress</span>
          <span class="sh-check-progress-count" id="shChecklistCount">${done}/${total}</span>
        </div>
      </div>
      ${items
        .map(
          (i) => `
    <div class="sh-check-item${checked[i.id] ? ' sh-check-done' : ''}" data-check-id="${i.id}" tabindex="0" role="checkbox" aria-checked="${checked[i.id] ? 'true' : 'false'}" aria-label="${i.title}">
      <div class="sh-check-box">${checked[i.id] ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
      <div class="sh-check-icon">${i.icon}</div>
      <div class="sh-check-info">
        <div class="sh-check-title">${i.title}</div>
        <div class="sh-check-desc">${i.desc}</div>
      </div>
      <div class="sh-check-priority" style="color:${priColors[i.priority]}">${i.priority}</div>
    </div>
  `
        )
        .join('')}`;

    checklist.querySelectorAll('.sh-check-item').forEach((item) => {
      const handler = () => {
        const id = item.dataset.checkId;
        const isChecked = item.classList.toggle('sh-check-done');
        const box = item.querySelector('.sh-check-box');
        item.setAttribute('aria-checked', isChecked);
        box.innerHTML = isChecked
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
          : '';
        setCheckedItem(id, isChecked);
      };
      item.addEventListener('click', handler);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });
  }

  function renderPicks(suppliers) {
    const picksGrid = _section?.querySelector('#shPicksGrid');
    if (!picksGrid) return;
    const list = suppliers || _suppliers;
    if (list.length === 0) {
      picksGrid.innerHTML = '<div class="sh-empty">Search for suppliers to see recommendations</div>';
      return;
    }
    // Generate picks dynamically from actual supplier data
    const fastestShip = [...list].sort((a, b) => {
      const aDays = parseInt((a.shipTime || '10').split('-')[0]);
      const bDays = parseInt((b.shipTime || '10').split('-')[0]);
      return aDays - bDays;
    })[0];
    const bestValue = [...list].sort((a, b) => (b.value || 0) - (a.value || 0))[0];
    const highestRated = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    const mostOrders = [...list].sort((a, b) => (b.orders || 0) - (a.orders || 0))[0];
    const lowestRisk = [...list].sort((a, b) => (a.disputeRate || 5) - (b.disputeRate || 5))[0];
    const bestBeginner = list.find((s) => s.verified && (s.minOrder || '').includes('1')) || highestRated;

    const picks = [
      {
        use: '\uD83D\uDE80 Fastest Shipping',
        s: fastestShip,
        reason: (fastestShip?.shipTime || '?') + ' day delivery',
        color: 'var(--accent-green)',
      },
      {
        use: '\uD83D\uDCB0 Best Value',
        s: bestValue,
        reason: 'Score: ' + (bestValue?.value || 0) + '/100 value rating',
        color: 'var(--accent-cyan)',
      },
      {
        use: '\u2B50 Highest Rated',
        s: highestRated,
        reason: (highestRated?.rating || 0) + '\u2605 with ' + (highestRated?.orders || 0) + ' orders',
        color: 'var(--accent-yellow)',
      },
      {
        use: '\uD83D\uDCE6 Most Orders',
        s: mostOrders,
        reason: (mostOrders?.orders || 0) + ' total orders',
        color: 'var(--accent-pink)',
      },
      {
        use: '\uD83D\uDEE1\uFE0F Lowest Risk',
        s: lowestRisk,
        reason: (lowestRisk?.disputeRate || 0) + '% dispute rate',
        color: 'var(--accent-purple)',
      },
      {
        use: '\uD83C\uDFAF Best for Beginners',
        s: bestBeginner,
        reason: bestBeginner?.verified ? 'Verified supplier' : 'Top rated',
        color: 'var(--accent-orange)',
      },
    ].filter((p) => p.s);

    picksGrid.innerHTML = picks
      .map(
        (p) => `
    <div class="sh-pick-card" tabindex="0" role="button" aria-label="View ${esc(p.s.name)}" style="border-left:3px solid ${p.color}" data-supplier="${esc(p.s.name)}">
      <div class="sh-pick-use">${p.use}</div>
      <div class="sh-pick-supplier">${esc(p.s.name)}</div>
      <div class="sh-pick-platform">${esc(p.s.platform)}</div>
      <div class="sh-pick-reason">${esc(p.reason)}</div>
    </div>
  `
      )
      .join('');
    picksGrid.querySelectorAll('.sh-pick-card').forEach((card) => {
      const handler = () => {
        const s = list.find((x) => x.name === card.dataset.supplier);
        if (s) showDetail(s);
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });
  }

  function updateOverviewStats(suppliers) {
    const overview = _section?.querySelector('#shOverview');
    if (!overview) return;
    if (suppliers.length === 0) {
      overview.style.display = 'none';
      return;
    }
    overview.style.display = '';
    const verifiedCount = suppliers.filter((s) => s.verified).length;
    const avgRating = (suppliers.reduce((a, s) => a + (s.rating || 0), 0) / suppliers.length).toFixed(1);
    const avgProducts = Math.round(suppliers.reduce((a, s) => a + (s.topProducts?.length || 0), 0) / suppliers.length);
    const totalOrders = suppliers.reduce((a, s) => a + (s.orders || 0), 0);

    overview.innerHTML = `
      <div class="sh-stat-card"><div class="sh-stat-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🏢</div><div class="sh-stat-info"><div class="sh-stat-value">${suppliers.length}</div><div class="sh-stat-label">Suppliers Found</div></div></div>
      <div class="sh-stat-card"><div class="sh-stat-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">✅</div><div class="sh-stat-info"><div class="sh-stat-value">${verifiedCount}</div><div class="sh-stat-label">Verified</div></div></div>
      <div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(255,215,0,0.12);color:var(--accent-yellow)">⭐</div><div class="sh-stat-info"><div class="sh-stat-value">${avgRating}</div><div class="sh-stat-label">Avg Rating</div></div></div>
      <div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(168,85,247,0.12);color:var(--accent-purple)">📦</div><div class="sh-stat-info"><div class="sh-stat-value">${(totalOrders / 1000).toFixed(0)}K</div><div class="sh-stat-label">Total Orders</div></div></div>
      <div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(255,138,0,0.12);color:var(--accent-orange)">🛍️</div><div class="sh-stat-info"><div class="sh-stat-value">${avgProducts}</div><div class="sh-stat-label">Avg Products</div></div></div>
    `;
  }

  async function searchSuppliers(query) {
    if (_searching) return;
    _searching = true;

    const statusEl = _section?.querySelector('#supplierSearchStatus');
    const resultsEl = _section?.querySelector('#supplierSearchResults');
    const searchBtn = _section?.querySelector('#supplierSearchBtn');
    const searchInput = _section?.querySelector('#supplierSearchInput');

    if (searchBtn) searchBtn.disabled = true;
    if (searchInput) searchInput.disabled = true;
    if (statusEl)
      statusEl.innerHTML = '<span class="sh-search-spinner"></span> Searching web + platforms for suppliers...';
    if (resultsEl) resultsEl.innerHTML = '';

    try {
      const resp = await fetch(BACKEND_URL + '/suppliers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(err.error || 'Search failed');
      }

      const data = await resp.json();
      _suppliers = data.suppliers || [];

      // Update all sections with new data
      updateOverviewStats(_suppliers);
      renderCards(_suppliers);
      renderComparison(_suppliers);
      renderScores(_suppliers);
      renderShipping(_suppliers);
      renderPicks(_suppliers);

      // Show sections that were hidden
      const filtersEl = _section?.querySelector('#supplierFilters');
      const compSection = _section?.querySelector('#shComparisonSection');
      const scoresSection = _section?.querySelector('#shScoresSection');
      const shipSection = _section?.querySelector('#shShippingSection');
      const picksSection = _section?.querySelector('#shPicksSection');
      if (filtersEl) filtersEl.style.display = _suppliers.length > 0 ? '' : 'none';
      if (compSection) compSection.style.display = _suppliers.length > 0 ? '' : 'none';
      if (scoresSection) scoresSection.style.display = _suppliers.length > 0 ? '' : 'none';
      if (shipSection) shipSection.style.display = _suppliers.length > 0 ? '' : 'none';
      if (picksSection) picksSection.style.display = _suppliers.length > 0 ? '' : 'none';

      const webLabel = data.webProvider ? `Web: ${data.webProvider}` : 'Web: none';
      const aiLabel = data.aiProvider ? `AI: ${data.aiProvider}` : 'AI: regex';
      const platformsSearched =
        data.searchedPlatforms && data.searchedPlatforms.length > 0 ? data.searchedPlatforms.join(', ') : 'none';
      if (statusEl) {
        statusEl.innerHTML = `Found <strong>${_suppliers.length}</strong> suppliers for "${esc(query)}" — ${webLabel}, ${aiLabel}, Searched: ${platformsSearched}, Platforms: ${data.platformCount || 0}`;
      }
    } catch (e) {
      console.error('[SupplierHub] Search error:', e);
      if (statusEl) {
        let msg = 'Search failed';
        if (e instanceof Error) {
          msg = e.message;
        } else if (typeof e === 'object' && e !== null) {
          msg = e.error || e.message || JSON.stringify(e);
        } else if (typeof e === 'string') {
          msg = e;
        }
        statusEl.innerHTML = '<span class="sh-search-error">Error: ' + esc(String(msg)) + '</span>';
      }
    } finally {
      _searching = false;
      if (searchBtn) searchBtn.disabled = false;
      if (searchInput) searchInput.disabled = false;
    }
  }

  function bindSearch() {
    const searchBtn = _section?.querySelector('#supplierSearchBtn');
    const searchInput = _section?.querySelector('#supplierSearchInput');
    if (!searchBtn || !searchInput) return;

    const doSearch = () => {
      const query = searchInput.value.trim();
      if (query && query.length >= 2) searchSuppliers(query);
    };

    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
  }

  function bindFilters() {
    const filterBtns = _section?.querySelectorAll('.sf-btn');
    if (!filterBtns) return;
    filterBtns.forEach((btn) => {
      const handler = () => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-sf');
        const grid = _section?.querySelector('#supplierHubGrid');
        if (!grid) return;
        const cards = grid.querySelectorAll('.supplier-hub-card');
        cards.forEach((card) => {
          const show =
            filter === 'all' ||
            (filter === 'verified' && card.getAttribute('data-verified') === 'true') ||
            (filter === 'fast' && (card.getAttribute('data-response') || '').indexOf('1h') > -1) ||
            (filter === 'rated' && parseFloat(card.getAttribute('data-rating')) >= 4.8) ||
            (['accio', 'globalsources', 'madeinchina', 'aliexpress', 'amazon'].indexOf(filter) !== -1 &&
              card.getAttribute('data-platform')?.toLowerCase().indexOf(filter) !== -1);
          if (show) {
            card.classList.remove('sh-card-hidden');
            card.style.display = '';
          } else {
            card.classList.add('sh-card-hidden');
            setTimeout(() => {
              card.style.display = 'none';
            }, 300);
          }
        });
      };
      btn.addEventListener('click', handler);
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });
  }

  const SupplierHubPlugin = {
    id: 'supplier-hub',
    name: 'Find Suppliers',
    version: '4.1.0',
    description: 'Verified suppliers from all 10 platforms — compare shipping, pricing & reliability scores',

    init(_ctx) {},

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section section-suppliers';
      section.id = 'section-supplier-hub';
      section.innerHTML = `
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">Supplier Intelligence Hub</h2>
          <p class="section-desc">Search the internet for suppliers — web search + AI parsing + platform data</p>
        </div>

        <div class="sh-search-hero">
          <div class="sh-search-bar">
            <div class="sh-search-icon">\uD83D\uDD0D</div>
            <input type="text" id="supplierSearchInput" class="sh-search-input" placeholder="Find suppliers for modern smart watches..." aria-label="Search for suppliers" />
            <button id="supplierSearchBtn" class="sh-search-btn" aria-label="Search suppliers">Find Suppliers</button>
          </div>
          <div id="supplierSearchStatus" class="sh-search-status"></div>
        </div>

        <div id="supplierSearchResults" class="sh-search-results"></div>

        <div class="sh-overview" id="shOverview" style="display:none"></div>

        <div class="supplier-filters" id="supplierFilters" style="display:none">
          <button class="sf-btn active" data-sf="all">All Suppliers</button>
          <button class="sf-btn" data-sf="verified">✅ Verified</button>
          <button class="sf-btn" data-sf="fast">⚡ Fast Ship</button>
          <button class="sf-btn" data-sf="rated">⭐ Top Rated</button>
          <div class="sf-divider"></div>
          <button class="sf-btn sf-platform" data-sf="accio">🤖 Accio</button>
          <button class="sf-btn sf-platform" data-sf="globalsources">🌐 Global Sources</button>
          <button class="sf-btn sf-platform" data-sf="madeinchina">🇨🇳 Made-in-China</button>
          <button class="sf-btn sf-platform" data-sf="aliexpress">📦 AliExpress</button>
          <button class="sf-btn sf-platform" data-sf="amazon">🛒 Amazon</button>
        </div>

        <div class="supplier-hub-grid" id="supplierHubGrid">
          <div class="sh-empty">Use the search bar above to find suppliers for any product</div>
        </div>
        <div id="supplierDetailPanel" class="sh-detail-panel"></div>

        <div class="sh-section" id="shComparisonSection" style="display:none">
          <h3 class="sh-section-title">📊 Supplier Comparison</h3>
          <p class="sh-section-sub">Side-by-side comparison of top suppliers across key metrics</p>
          <div class="sh-table-wrap">
            <table class="sh-table">
              <thead><tr><th>Supplier</th><th>Platform</th><th>Rating</th><th>Ship Time</th><th>Ship Cost</th><th>Min Order</th><th>Refund Rate</th><th>Score</th></tr></thead>
              <tbody id="shComparisonBody"></tbody>
            </table>
          </div>
        </div>

        <div class="sh-section" id="shScoresSection" style="display:none">
          <h3 class="sh-section-title">🎯 Score Breakdown</h3>
          <p class="sh-section-sub">Detailed performance metrics for each supplier</p>
          <div class="sh-scores-grid" id="shScoresGrid"></div>
        </div>

        <div class="sh-section" id="shShippingSection" style="display:none">
          <h3 class="sh-section-title">🚚 Shipping & Logistics</h3>
          <p class="sh-section-sub">Average shipping times and costs by platform</p>
          <div class="sh-shipping-grid" id="shShippingGrid"></div>
        </div>

        <div class="sh-section">
          <h3 class="sh-section-title">✅ Supplier Verification Checklist</h3>
          <p class="sh-section-sub">Essential checks before committing to any supplier</p>
          <div class="sh-checklist" id="shChecklist"></div>
        </div>

        <div class="sh-section" id="shPicksSection" style="display:none">
          <h3 class="sh-section-title">🏆 Top Picks by Use Case</h3>
          <p class="sh-section-sub">Best supplier recommendations based on your needs</p>
          <div class="sh-picks-grid" id="shPicksGrid"></div>
        </div>

        ${window.HuntDrop.renderRelatedTools([
          {
            section: 'section-store-gen',
            name: 'Store Generator',
            desc: 'Build your store',
            icon: '🏪',
            color: '#FF6B6B',
          },
          {
            section: 'section-profit-lab',
            name: 'Profit Calculator',
            desc: 'Calculate margins',
            icon: '🧮',
            color: '#4ECDC4',
          },
          { section: 'section-health', name: 'Store Health', desc: 'Check readiness', icon: '❤️', color: '#45B7D1' },
          {
            section: 'section-bundles',
            name: 'Bundle Intelligence',
            desc: 'Source bundles',
            icon: '📦',
            color: '#96CEB4',
          },
        ])}
      </div>`;
      container.appendChild(section);
      _section = section;

      renderChecklist();
      bindFilters();
      bindSearch();
    },

    unmount(_ctx) {
      const el = UI.$('section-supplier-hub');
      if (el) el.remove();
      _section = null;
      _suppliers = [];
    },
  };

  PluginRegistry.register('supplier-hub', SupplierHubPlugin);
})();
