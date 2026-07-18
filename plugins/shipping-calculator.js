// ============================================================================
// PLUGIN: Shipping Cost Calculator v2 — Complete shipping intelligence hub
// ============================================================================
(function () {
  const { PluginRegistry, UI, Config } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(String(s || ''));

  let _section = null;

  const ORIGINS = [
    {
      id: 'cn',
      name: 'China (Shenzhen)',
      flag: '🇨🇳',
      zone: 1.0,
      region: 'asia',
      carriers: ['ePacket', 'CJ Packet', 'AliExpress Standard', 'Yanwen'],
    },
    {
      id: 'cn_yw',
      name: 'China (Yiwu)',
      flag: '🇨🇳',
      zone: 1.0,
      region: 'asia',
      carriers: ['ePacket', 'CJ Packet', '4PX', 'SunYou'],
    },
    { id: 'us', name: 'USA (LA)', flag: '🇺🇸', zone: 0.6, region: 'na', carriers: ['USPS', 'UPS', 'FedEx', 'DHL'] },
    {
      id: 'us_tx',
      name: 'USA (Dallas)',
      flag: '🇺🇸',
      zone: 0.65,
      region: 'na',
      carriers: ['USPS', 'UPS', 'FedEx', 'OnTrac'],
    },
    {
      id: 'uk',
      name: 'UK (London)',
      flag: '🇬🇧',
      zone: 0.75,
      region: 'eu',
      carriers: ['Royal Mail', 'DPD', 'Hermes', 'Evri'],
    },
    {
      id: 'de',
      name: 'Germany',
      flag: '🇩🇪',
      zone: 0.78,
      region: 'eu',
      carriers: ['DHL DE', 'Hermes', 'GLS', 'DPD DE'],
    },
    {
      id: 'th',
      name: 'Thailand',
      flag: '🇹🇭',
      zone: 0.9,
      region: 'asia',
      carriers: ['Thai Post', 'Kerry Express', 'Flash Express'],
    },
    {
      id: 'vn',
      name: 'Vietnam',
      flag: '🇻🇳',
      zone: 0.88,
      region: 'asia',
      carriers: ['Vietnam Post', 'Giao Hang', 'J&T Express'],
    },
    { id: 'tr', name: 'Turkey', flag: '🇹🇷', zone: 0.85, region: 'eu', carriers: ['PTT', 'Yurtiçi', 'MNG Kargo'] },
    {
      id: 'in',
      name: 'India',
      flag: '🇮🇳',
      zone: 0.7,
      region: 'asia',
      carriers: ['India Post', 'Delhivery', 'Blue Dart', 'Ecom Express'],
    },
  ];

  const DESTINATIONS = [
    { id: 'us', name: 'United States', flag: '🇺🇸', baseRate: 3.5, customsThreshold: 800, avgDuty: 0 },
    { id: 'uk', name: 'United Kingdom', flag: '🇬🇧', baseRate: 4.2, customsThreshold: 135, avgDuty: 20 },
    { id: 'ca', name: 'Canada', flag: '🇨🇦', baseRate: 4.0, customsThreshold: 40, avgDuty: 13 },
    { id: 'au', name: 'Australia', flag: '🇦🇺', baseRate: 5.5, customsThreshold: 1000, avgDuty: 10 },
    { id: 'de', name: 'Germany', flag: '🇩🇪', baseRate: 3.8, customsThreshold: 150, avgDuty: 19 },
    { id: 'fr', name: 'France', flag: '🇫🇷', baseRate: 4.1, customsThreshold: 150, avgDuty: 20 },
    { id: 'jp', name: 'Japan', flag: '🇯🇵', baseRate: 5.0, customsThreshold: 130, avgDuty: 10 },
    { id: 'br', name: 'Brazil', flag: '🇧🇷', baseRate: 6.5, customsThreshold: 50, avgDuty: 60 },
    { id: 'mx', name: 'Mexico', flag: '🇲🇽', baseRate: 4.5, customsThreshold: 50, avgDuty: 16 },
    { id: 'in', name: 'India', flag: '🇮🇳', baseRate: 3.0, customsThreshold: 0, avgDuty: 18 },
    { id: 'ae', name: 'UAE', flag: '🇦🇪', baseRate: 4.8, customsThreshold: 0, avgDuty: 5 },
    { id: 'za', name: 'South Africa', flag: '🇿🇦', baseRate: 6.0, customsThreshold: 0, avgDuty: 20 },
  ];

  const METHODS = [
    {
      id: 'economy',
      name: 'Economy',
      icon: '📦',
      speedLabel: 'Budget',
      desc: 'Cheapest option, no tracking',
      daysMult: 1.5,
      costMult: 0.55,
      tracking: false,
      insurance: false,
      color: 'var(--text-muted)',
    },
    {
      id: 'epacket',
      name: 'ePacket',
      icon: '📧',
      speedLabel: 'China-optimized',
      desc: 'Best for CN→US under 2kg',
      daysMult: 0.85,
      costMult: 0.75,
      tracking: true,
      insurance: false,
      color: 'var(--accent-cyan)',
    },
    {
      id: 'cj_packet',
      name: 'CJ Packet',
      icon: '⚡',
      speedLabel: 'CJ Fast',
      desc: '20% faster than ePacket',
      daysMult: 0.7,
      costMult: 0.85,
      tracking: true,
      insurance: true,
      color: 'var(--accent-green)',
    },
    {
      id: 'standard',
      name: 'Standard',
      icon: '🚚',
      speedLabel: 'Balanced',
      desc: 'Good balance of cost & speed',
      daysMult: 1.0,
      costMult: 1.0,
      tracking: true,
      insurance: true,
      color: 'var(--accent-yellow)',
    },
    {
      id: 'express',
      name: 'Express',
      icon: '✈️',
      speedLabel: 'Fastest',
      desc: 'DHL/FedEx/UPS priority',
      daysMult: 0.5,
      costMult: 1.8,
      tracking: true,
      insurance: true,
      color: 'var(--accent-orange)',
    },
  ];

  const WEIGHT_BRACKETS = [
    {
      label: 'Letter',
      emoji: '✉️',
      desc: '<0.1kg',
      weight: 0.08,
      baseCost: 1.5,
      examples: 'Phone cases, screen protectors, jewelry',
    },
    {
      label: 'Small',
      emoji: '📪',
      desc: '0.1–0.3kg',
      weight: 0.2,
      baseCost: 2.5,
      examples: 'Earbuds, keychains, small gadgets',
    },
    {
      label: 'Medium',
      emoji: '📦',
      desc: '0.3–1kg',
      weight: 0.65,
      baseCost: 4.0,
      examples: 'Watches, sunglasses, small electronics',
    },
    {
      label: 'Standard',
      emoji: '📬',
      desc: '1–2kg',
      weight: 1.5,
      baseCost: 6.5,
      examples: 'Speakers, kitchen gadgets, toys',
    },
    {
      label: 'Heavy',
      emoji: '📫',
      desc: '2–5kg',
      weight: 3.5,
      baseCost: 12.0,
      examples: 'Small appliances, fitness gear',
    },
    {
      label: 'Bulky',
      emoji: '📪',
      desc: '5–10kg',
      weight: 7.5,
      baseCost: 22.0,
      examples: 'LED panels, larger electronics',
    },
    {
      label: 'Oversize',
      emoji: '📮',
      desc: '10kg+',
      weight: 12,
      baseCost: 35.0,
      examples: 'Furniture parts, large equipment',
    },
  ];

  const DIM_FACTOR = 5000;

  function calcShipping(originId, destId, methodId, bracketIdx, customWeight) {
    const origin = ORIGINS.find((o) => o.id === originId) || ORIGINS[0];
    const dest = DESTINATIONS.find((d) => d.id === destId) || DESTINATIONS[0];
    const method = METHODS.find((m) => m.id === methodId) || METHODS[3];
    const bracket = WEIGHT_BRACKETS[bracketIdx] || WEIGHT_BRACKETS[2];
    const weight = customWeight > 0 ? customWeight : bracket.weight;
    let cost = bracket.baseCost * method.costMult * origin.zone * (dest.baseRate / 3.5);
    cost = Math.round(cost * 100) / 100;
    const baseDays = origin.region === 'na' || origin.region === 'eu' ? 5 : 14;
    const minDays = Math.max(Math.round(baseDays * method.daysMult * 0.8), 1);
    const maxDays = Math.max(Math.round(baseDays * method.daysMult * 1.3), 2);
    return {
      cost,
      minDays,
      maxDays,
      method,
      origin,
      dest,
      weight,
      effectiveWeight: weight,
      hasTracking: method.tracking,
      hasInsurance: method.insurance,
    };
  }

  function calcLanded(sell, prod, ship, feePct, customsPct) {
    const fee = sell * (feePct / 100);
    const customs = sell * (customsPct / 100);
    const total = prod + ship + fee + customs;
    return { fee, customs, total };
  }

  function updateMethodTable(o, d, br, cw) {
    if (window._scUpdateMethodTable) window._scUpdateMethodTable(o, d, br, cw);
  }
  function updateRoutes(m, br) {
    if (window._scUpdateRoutes) window._scUpdateRoutes(m, br);
  }

  function bindEvents(s) {
    const sec = _section;
    if (!sec) return;
    let bracket = s.bracketIdx || 2;
    let method = s.method || 'standard';
    let lastShipCost = 0;

    sec.querySelectorAll('.sc-weight-btn').forEach((btn) => {
      btn.addEventListener('click', function () {
        sec.querySelectorAll('.sc-weight-btn').forEach((b) => b.classList.remove('active'));
        this.classList.add('active');
        bracket = parseInt(this.dataset.idx);
      });
    });

    sec.querySelectorAll('.sc-method-btn').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        if (e.target.closest('.sc-mb-link')) {
          e.preventDefault();
          const link = e.target.closest('.sc-mb-link');
          const target = link.dataset.section;
          if (target && window.HuntDrop && window.HuntDrop.navigateTo) window.HuntDrop.navigateTo(target);
          return;
        }
        sec.querySelectorAll('.sc-method-btn').forEach((b) => b.classList.remove('active'));
        this.classList.add('active');
        method = this.dataset.method;
      });
    });

    sec.querySelectorAll('.sc-rf-btn').forEach((btn) => {
      btn.addEventListener('click', function () {
        sec.querySelectorAll('.sc-rf-btn').forEach((b) => b.classList.remove('active'));
        this.classList.add('active');
        const region = this.dataset.region;
        sec.querySelectorAll('.sc-route-card').forEach((card) => {
          card.style.display = region === 'all' || card.dataset.region === region ? '' : 'none';
        });
      });
    });

    UI.$('scResetBtn')?.addEventListener('click', function () {
      Config.set('shipcalc', {
        origin: 'cn',
        destination: 'us',
        method: 'standard',
        bracketIdx: 2,
        customWeight: 0,
        productCost: 5,
        sellPrice: 29.99,
        platformFee: 15,
        customs: 0,
        adCost: 3,
      });
      location.reload();
    });

    UI.$('scCalcBtn')?.addEventListener('click', function () {
      const originId = UI.$('scOrigin').value;
      const destId = UI.$('scDest').value;
      const customW = parseFloat(UI.$('scCustomWeight').value) || 0;
      Config.set('shipcalc', {
        origin: originId,
        destination: destId,
        method,
        bracketIdx: bracket,
        customWeight: customW,
        productCost: parseFloat(UI.$('scProdCost').value) || 5,
        sellPrice: parseFloat(UI.$('scSellPrice').value) || 29.99,
        platformFee: parseFloat(UI.$('scPlatFee').value) || 15,
        customs: parseFloat(UI.$('scCustoms').value) || 0,
        adCost: parseFloat(UI.$('scAdCost').value) || 3,
      });
      const r = calcShipping(originId, destId, method, bracket, customW);
      lastShipCost = r.cost;
      UI.$('scCostBig').textContent = '$' + r.cost.toFixed(2);
      UI.$('scCostBig').className = 'sc-result-cost';
      UI.$('scCostSub').textContent =
        r.method.icon + ' ' + r.method.name + ' · ' + r.origin.flag + r.origin.name + ' → ' + r.dest.flag + r.dest.name;
      UI.$('scKpiWeight').textContent = r.effectiveWeight + ' kg';
      UI.$('scKpiDays').textContent = r.minDays + '-' + r.maxDays + ' days';
      UI.$('scKpiMethod').textContent = r.method.icon + ' ' + r.method.name;
      UI.$('scKpiRoute').textContent = r.origin.flag + '→' + r.dest.flag;
      sec.querySelectorAll('.sc-kpi').forEach((k) => k.classList.add('sc-kpi-visible'));
      const trackInfo = UI.$('scTrackInfo');
      if (trackInfo) {
        trackInfo.style.display = 'flex';
        UI.$('scTrackBadge').textContent = r.hasTracking ? '✅ Tracking' : '❌ No Tracking';
        UI.$('scTrackBadge').className = 'sc-track-badge ' + (r.hasTracking ? 'sc-track-yes' : 'sc-track-no');
        UI.$('scTrackText').textContent = r.hasInsurance
          ? 'Full insurance coverage included'
          : 'No insurance — consider upgrading for high-value items';
      }
      updateLanded();
      updateMethodTable(originId, destId, bracket, customW);
      updateRoutes(method, bracket);
    });

    function updateLanded() {
      const sell = parseFloat(UI.$('scSellPrice').value) || 0;
      const prod = parseFloat(UI.$('scProdCost').value) || 0;
      const pf = parseFloat(UI.$('scPlatFee').value) || 0;
      const cu = parseFloat(UI.$('scCustoms').value) || 0;
      const ad = parseFloat(UI.$('scAdCost').value) || 0;
      const lc = calcLanded(sell, prod, lastShipCost, pf, cu);
      const profit = sell - lc.total - ad;
      const marginPct = sell > 0 ? Math.round((profit / sell) * 100) : 0;
      UI.$('scLProduct').textContent = '$' + prod.toFixed(2);
      UI.$('scLShipping').textContent = '$' + lastShipCost.toFixed(2);
      UI.$('scLFee').textContent = '$' + lc.fee.toFixed(2);
      UI.$('scLCustoms').textContent = '$' + lc.customs.toFixed(2);
      UI.$('scLAdCost').textContent = '$' + ad.toFixed(2);
      UI.$('scLTotal').textContent = '$' + (lc.total + ad).toFixed(2);
      UI.$('scLProfit').textContent = '$' + profit.toFixed(2);
      UI.$('scLProfit').style.color = profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      UI.$('scLMargin').textContent = marginPct + '%';
      UI.$('scLMargin').style.color =
        marginPct >= 30 ? 'var(--accent-green)' : marginPct >= 15 ? 'var(--accent-yellow)' : 'var(--accent-red)';
      const alert = UI.$('scLandedAlert');
      if (alert) {
        if (marginPct < 0)
          alert.innerHTML =
            '<div class="sc-alert sc-alert-danger">⚠️ Negative margin! You\'re losing money per sale. Reduce costs or increase price.</div>';
        else if (marginPct < 15)
          alert.innerHTML =
            '<div class="sc-alert sc-alert-warning">⚠️ Low margin (' +
            marginPct +
            '%). Consider <a data-section="section-price-elasticity" class="sc-link" style="cursor:pointer">optimizing your price</a> or finding cheaper suppliers on <a data-section="section-supplier-hub" class="sc-link" style="cursor:pointer">Supplier Hub</a>.</div>';
        else if (marginPct >= 30)
          alert.innerHTML =
            '<div class="sc-alert sc-alert-success">✅ Excellent margin! (' +
            marginPct +
            '%). Consider reinvesting in <a data-section="section-budget" class="sc-link" style="cursor:pointer">ad budget</a> to scale.</div>';
        else alert.innerHTML = '';
        alert.querySelectorAll('.sc-link[data-section]').forEach((link) => {
          link.addEventListener('click', () => window.HuntDrop.navigateTo(link.dataset.section));
        });
      }
      const chart = UI.$('scLandedChart');
      if (chart) {
        const total = lc.total + ad || 1;
        const items = [
          { pct: Math.round((prod / total) * 100), color: 'var(--accent-cyan)', label: 'Product' },
          { pct: Math.round((lastShipCost / total) * 100), color: 'var(--accent-orange)', label: 'Shipping' },
          { pct: Math.round((lc.fee / total) * 100), color: 'var(--accent-purple)', label: 'Fees' },
          { pct: Math.round((lc.customs / total) * 100), color: 'var(--accent-red)', label: 'Customs' },
          { pct: Math.round((ad / total) * 100), color: 'var(--accent-yellow)', label: 'Ads' },
        ];
        chart.innerHTML =
          '<div class="sc-bar-chart">' +
          items
            .map(
              (i) =>
                `<div class="sc-bar-seg" style="width:${Math.max(i.pct, 2)}%;background:${i.color}" title="${i.label}: ${i.pct}%"></div>`
            )
            .join('') +
          '</div><div class="sc-bar-legend">' +
          items
            .map(
              (i) =>
                `<span class="sc-bar-legend-item"><span class="sc-bar-dot" style="background:${i.color}"></span>${i.label} ${i.pct}%</span>`
            )
            .join('') +
          '</div>';
      }
    }

    ['scSellPrice', 'scProdCost', 'scPlatFee', 'scCustoms', 'scAdCost'].forEach((id) => {
      UI.$(id)?.addEventListener('input', updateLanded);
    });
  }

  function renderMethodTable(s) {
    const tbody = UI.$('scMethodTable');
    if (!tbody) return;
    const update = (o, d, br, cw) => {
      tbody.innerHTML = METHODS.map((m) => {
        const r = calcShipping(o, d, m.id, br, cw);
        const best = m.id === 'cj_packet';
        return `<tr class="${best ? 'sc-tr-best' : ''}" style="cursor:pointer" data-section="section-supplier-intel" tabindex="0" role="button">
        <td><span class="sc-tmethod">${m.icon} ${m.name}</span>${best ? '<span class="sc-best-badge">Best Value</span>' : ''}</td>
        <td class="sc-tcost">$${r.cost.toFixed(2)}</td>
        <td>${r.minDays}-${r.maxDays} days</td>
        <td>${m.tracking ? '<span class="sc-yes">✅</span>' : '<span class="sc-no">❌</span>'}</td>
        <td>${m.insurance ? '<span class="sc-yes">✅</span>' : '<span class="sc-no">—</span>'}</td>
        <td class="sc-tbest">${m.id === 'economy' ? 'Lowest cost' : m.id === 'epacket' ? 'China→US small' : m.id === 'cj_packet' ? 'Best all-round' : m.id === 'standard' ? 'Reliable default' : 'Urgent orders'}</td>
      </tr>`;
      }).join('');
    };
    update(s.origin || 'cn', s.destination || 'us', s.bracketIdx || 2, s.customWeight || 0);
    window._scUpdateMethodTable = update;
  }

  function renderRoutes(s) {
    const grid = UI.$('scRouteGrid');
    if (!grid) return;
    const update = (methodId, bracketIdx) => {
      const routes = ORIGINS.flatMap((origin) =>
        DESTINATIONS.map((dest) => {
          const r = calcShipping(origin.id, dest.id, methodId, bracketIdx, 0);
          return { origin, dest, cost: r.cost, days: r.minDays + '-' + r.maxDays, region: origin.region };
        })
      );
      routes.sort((a, b) => a.cost - b.cost);
      grid.innerHTML = routes
        .map(
          (r) => `
      <div class="sc-route-card" data-region="${r.region}" tabindex="0" role="button">
        <div class="sc-rc-header">
          <span class="sc-rc-from">${r.origin.flag} ${r.origin.name.split('(')[0].trim()}</span>
          <span class="sc-rc-arrow">→</span>
          <span class="sc-rc-to">${r.dest.flag} ${r.dest.name}</span>
        </div>
        <div class="sc-rc-body">
          <div class="sc-rc-cost">$${r.cost.toFixed(2)}</div>
          <div class="sc-rc-days">${r.days} days</div>
        </div>
        <div class="sc-rc-footer">
          <span class="sc-rc-speed">${r.cost < 3 ? '🟢 Cheap' : r.cost < 6 ? '🟡 Mid' : '🔴 Expensive'}</span>
        </div>
      </div>
    `
        )
        .join('');
      grid.querySelectorAll('.sc-route-card').forEach((card) => {
        card.addEventListener('click', function () {
          const region = this.dataset.region;
          const originObj = ORIGINS.find((o) => o.region === region);
          if (originObj) {
            UI.$('scOrigin').value = originObj.id;
            UI.$('scCalcBtn')?.click();
          }
        });
      });
    };
    update(s.method || 'standard', s.bracketIdx || 2);
    window._scUpdateRoutes = update;
  }

  function renderDimCalc() {
    const btn = UI.$('scDimCalcBtn');
    if (!btn) return;
    const calc = () => {
      const l = parseFloat(UI.$('scDimL').value) || 0;
      const w = parseFloat(UI.$('scDimW').value) || 0;
      const h = parseFloat(UI.$('scDimH').value) || 0;
      const act = parseFloat(UI.$('scDimAct').value) || 0;
      const dimW = Math.max((l * w * h) / DIM_FACTOR, 0.1);
      const billable = Math.max(act, dimW);
      const diff = dimW - act;
      const res = UI.$('scDimResult');
      if (!res) return;
      res.innerHTML = `
      <div class="sc-dim-results">
        <div class="sc-dim-r-item"><div class="sc-dim-r-label">Dimensional Weight</div><div class="sc-dim-r-val">${dimW.toFixed(2)} kg</div></div>
        <div class="sc-dim-r-item"><div class="sc-dim-r-label">Actual Weight</div><div class="sc-dim-r-val">${act.toFixed(2)} kg</div></div>
        <div class="sc-dim-r-item ${diff > 0 ? 'sc-dim-warn' : ''}"><div class="sc-dim-r-label">Billable Weight</div><div class="sc-dim-r-val">${billable.toFixed(2)} kg</div></div>
        ${diff > 0 ? `<div class="sc-dim-alert">⚠️ Dim weight is ${diff.toFixed(2)}kg heavier! You're paying for ${((diff / billable) * 100).toFixed(0)}% empty space. Reduce packaging to save.</div>` : '<div class="sc-dim-ok">✅ Actual weight is used — your packaging is efficient!</div>'}
      </div>`;
    };
    btn.addEventListener('click', calc);
    calc();
  }

  function renderHeatmap() {
    const el = UI.$('scHeatmap');
    if (!el) return;
    const regions = ['asia', 'na', 'eu'];
    const regionLabels = { asia: '🇨🇳 Asia', na: '🇺🇸 N. America', eu: '🇪🇺 Europe' };
    let html = '<div class="sc-hm-grid"><div class="sc-hm-header"><div class="sc-hm-cell"></div>';
    METHODS.forEach((m) => {
      html += `<div class="sc-hm-cell sc-hm-meth">${m.icon}<br>${m.name}</div>`;
    });
    html += '</div>';
    regions.forEach((reg) => {
      html += `<div class="sc-hm-row"><div class="sc-hm-cell sc-hm-region">${regionLabels[reg]}</div>`;
      METHODS.forEach((m) => {
        const base = reg === 'na' || reg === 'eu' ? 4 : 12;
        const days = Math.max(Math.round(base * m.daysMult), 1);
        const color =
          days <= 3
            ? 'var(--accent-green)'
            : days <= 7
              ? 'var(--accent-cyan)'
              : days <= 14
                ? 'var(--accent-yellow)'
                : 'var(--accent-orange)';
        html += `<div class="sc-hm-cell sc-hm-val" style="background:${color}20;color:${color};border:1px solid ${color}30;cursor:pointer" data-section="section-shipping-calc" tabindex="0" role="button" title="Click to calculate ${m.name} shipping from ${regionLabels[reg]}">${days}d</div>`;
      });
      html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  function renderTips() {
    const grid = UI.$('scTipsGrid');
    if (!grid) return;
    const tips = [
      {
        icon: '📦',
        title: 'Bundle Orders',
        text: 'Combine items from same supplier to cut per-item shipping 40-60%.',
        link: 'section-bundles',
        linkText: 'Find Bundles →',
      },
      {
        icon: '🏭',
        title: 'Use Local Warehouses',
        text: 'US/EU warehouses cut delivery from 12-18 days to 2-5 days.',
        link: 'section-supplier-hub',
        linkText: 'Find Suppliers →',
      },
      {
        icon: '📧',
        title: 'ePacket for China',
        text: 'Cheapest China→US option for items under 2kg. 7-15 day delivery.',
        link: 'section-supplier-intel',
        linkText: 'Check Carriers →',
      },
      {
        icon: '📐',
        title: 'Dim Weight Matters',
        text: 'Light but large items use L×W×H÷5000. Reduce packaging to save.',
        link: 'section-shipping-calc',
        linkText: 'Calculate Below →',
      },
      {
        icon: '💰',
        title: 'Factor into Pricing',
        text: 'Shipping is 20-40% of landed cost. Always include in profit math.',
        link: 'section-profit-lab',
        linkText: 'Calculate Profit →',
      },
      {
        icon: '⚡',
        title: 'CJ Packet Advantage',
        text: '20% faster than ePacket with similar pricing. Best for CJ users.',
        link: 'section-supplier-intel',
        linkText: 'Check Suppliers →',
      },
      {
        icon: '🌍',
        title: 'Avoid DDP for Small Orders',
        text: 'DDP adds $2-5 per order. For low-value items, let customers handle customs.',
        link: 'section-supplier-hub',
        linkText: 'Find Options →',
      },
      {
        icon: '📊',
        title: 'Track Refund Rates',
        text: 'High shipping damage = high refunds. Use insured methods for fragile items.',
        link: 'section-health',
        linkText: 'Check Store Health →',
      },
      {
        icon: '🎯',
        title: 'Scale with Budget',
        text: 'Once profitable, reinvest in faster shipping for better reviews.',
        link: 'section-budget',
        linkText: 'Plan Budget →',
      },
    ];
    grid.innerHTML = tips
      .map(
        (t) => `
    <div class="sc-tip-card">
      <div class="sc-tip-icon">${t.icon}</div>
      <div class="sc-tip-title">${t.title}</div>
      <div class="sc-tip-text">${t.text}</div>
      ${t.link ? `<a class="sc-tip-link" data-section="${t.link}">${t.linkText}</a>` : ''}
    </div>
  `
      )
      .join('');
    grid.querySelectorAll('.sc-tip-link[data-section]').forEach((link) => {
      link.addEventListener('click', () => window.HuntDrop.navigateTo(link.dataset.section));
    });
  }

  PluginRegistry.register('shipping-calculator', {
    id: 'shipping-calculator',
    name: 'Shipping Calculator',
    version: '2.0.0',
    description: 'Complete shipping intelligence — cost estimation, route optimization, landed cost & profitability',

    init(_ctx) {
      Config.defaults('shipcalc', {
        origin: 'cn',
        destination: 'us',
        method: 'standard',
        bracketIdx: 2,
        customWeight: 0,
        productCost: 5,
        sellPrice: 29.99,
        platformFee: 15,
        customs: 0,
        adCost: 3,
      });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;
      const s = Config.get('shipcalc') || {};
      const cheapestRoute = calcShipping('cn', 'us', 'economy', 2, 0);
      const fastestRoute = calcShipping('cn', 'us', 'express', 2, 0);
      const bestValue = calcShipping('cn', 'us', 'cj_packet', 2, 0);
      const section = document.createElement('section');
      section.className = 'section section-shipping-calc';
      section.id = 'section-shipping-calc';
      section.innerHTML = `
      <div class="section-inner">
        <div class="sc-hero">
          <div class="sc-hero-bg"></div>
          <div class="sc-hero-content">
            <div class="sc-hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              Shipping Intelligence
            </div>
            <h1 class="sc-hero-title">Shipping Cost Calculator</h1>
            <p class="sc-hero-desc">Estimate real shipping costs from ${ORIGINS.length} origins to ${DESTINATIONS.length} destinations. Know your exact landed cost before you sell.</p>
            <div class="sc-hero-kpis">
              <div class="sc-hkpi" data-section="section-profit-lab" role="button" tabindex="0" style="cursor:pointer"><div class="sc-hkpi-val">$${cheapestRoute.cost.toFixed(2)}</div><div class="sc-hkpi-label">Cheapest Route</div></div>
              <div class="sc-hkpi" data-section="section-supplier-hub" role="button" tabindex="0" style="cursor:pointer"><div class="sc-hkpi-val">${fastestRoute.minDays}d</div><div class="sc-hkpi-label">Fastest Delivery</div></div>
              <div class="sc-hkpi" data-section="section-supplier-intel" role="button" tabindex="0" style="cursor:pointer"><div class="sc-hkpi-val">$${bestValue.cost.toFixed(2)}</div><div class="sc-hkpi-label">Best Value</div></div>
              <div class="sc-hkpi" data-section="section-budget" role="button" tabindex="0" style="cursor:pointer"><div class="sc-hkpi-val">${ORIGINS.length * DESTINATIONS.length}</div><div class="sc-hkpi-label">Plan Budget</div></div>
            </div>
          </div>
        </div>

        <div class="sc-section">
          <div class="sc-section-header">
            <h2 class="sc-section-title">📦 Quick Calculator</h2>
            <p class="sc-section-desc">Configure your shipment and get instant cost estimates</p>
          </div>
          <div class="sc-grid">
            <div class="sc-panel sc-input-panel">
              <div class="sc-panel-header">
                <h3 class="sc-panel-title">Shipment Details</h3>
                <button class="sc-reset-btn" id="scResetBtn">Reset</button>
              </div>
              <div class="sc-field">
                <label class="sc-label">Origin Warehouse</label>
                <select id="scOrigin" class="sc-select">${ORIGINS.map((o) => `<option value="${o.id}" ${o.id === (s.origin || 'cn') ? 'selected' : ''}>${o.flag} ${o.name}</option>`).join('')}</select>
              </div>
              <div class="sc-field">
                <label class="sc-label">Destination Country</label>
                <select id="scDest" class="sc-select">${DESTINATIONS.map((d) => `<option value="${d.id}" ${d.id === (s.destination || 'us') ? 'selected' : ''}>${d.flag} ${d.name}</option>`).join('')}</select>
              </div>
              <div class="sc-field">
                <label class="sc-label">Weight Bracket</label>
                <div class="sc-weight-btns">
                  ${WEIGHT_BRACKETS.map((b, i) => `<button class="sc-weight-btn ${i === (s.bracketIdx || 2) ? 'active' : ''}" data-idx="${i}">${b.emoji} ${b.label}<span class="sc-wb-desc">${b.desc}</span></button>`).join('')}
                </div>
              </div>
              <div class="sc-field">
                <label class="sc-label">Custom Weight (kg) — overrides bracket</label>
                <input id="scCustomWeight" type="number" min="0" step="0.01" value="${s.customWeight || 0}" class="sc-input-sm" placeholder="0 = use bracket">
              </div>
              <div class="sc-field">
                <label class="sc-label">Shipping Method</label>
                <div class="sc-method-btns">
                  ${METHODS.map((m) => `<div class="sc-method-btn ${m.id === (s.method || 'standard') ? 'active' : ''}" data-method="${m.id}"><div class="sc-mb-main">${m.icon} ${m.name}<span class="sc-mb-desc">${m.speedLabel}</span><span class="sc-mb-track">${m.tracking ? '✅ Track' : '❌ No Track'} ${m.insurance ? '🛡 Insured' : ''}</span></div><a class="sc-mb-link" data-section="section-supplier-intel" tabindex="0" role="button">View Suppliers →</a></div>`).join('')}
                </div>
              </div>
              <button class="sc-calc-btn" id="scCalcBtn">Calculate Shipping Cost</button>
            </div>
            <div class="sc-panel sc-result-panel">
              <div class="sc-result-header">
                <h3 class="sc-panel-title">Estimated Cost</h3>
              </div>
              <div class="sc-result-big">
                <div class="sc-result-cost" id="scCostBig">$0.00</div>
                <div class="sc-result-sub" id="scCostSub">Select route and click Calculate</div>
              </div>
              <div class="sc-kpis" id="scKpis">
                <div class="sc-kpi"><div class="sc-kpi-label">Weight</div><div class="sc-kpi-val" id="scKpiWeight">—</div></div>
                <div class="sc-kpi"><div class="sc-kpi-label">Delivery</div><div class="sc-kpi-val" id="scKpiDays">—</div></div>
                <div class="sc-kpi"><div class="sc-kpi-label">Method</div><div class="sc-kpi-val" id="scKpiMethod">—</div></div>
                <div class="sc-kpi"><div class="sc-kpi-label">Route</div><div class="sc-kpi-val" id="scKpiRoute">—</div></div>
              </div>
              <div class="sc-track-info" id="scTrackInfo" style="display:none">
                <div class="sc-track-badge" id="scTrackBadge"></div>
                <div class="sc-track-text" id="scTrackText"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="sc-section">
          <div class="sc-section-header">
            <h2 class="sc-section-title">🧮 Landed Cost Breakdown</h2>
            <p class="sc-section-desc">Know your true total cost per unit — product, shipping, fees & duties all in one view</p>
          </div>
          <div class="sc-panel sc-landed-panel">
            <div class="sc-landed-inputs">
              <div class="sc-li-field">
                <label class="sc-label">Sell Price ($)</label>
                <input id="scSellPrice" type="number" min="0" step="0.01" value="${s.sellPrice || 29.99}" class="sc-input-sm">
              </div>
              <div class="sc-li-field">
                <label class="sc-label">Product Cost ($)</label>
                <input id="scProdCost" type="number" min="0" step="0.01" value="${s.productCost || 5}" class="sc-input-sm">
              </div>
              <div class="sc-li-field">
                <label class="sc-label">Platform Fee (%)</label>
                <input id="scPlatFee" type="number" min="0" max="50" step="1" value="${s.platformFee || 15}" class="sc-input-sm">
              </div>
              <div class="sc-li-field">
                <label class="sc-label">Customs / Duties (%)</label>
                <input id="scCustoms" type="number" min="0" max="100" step="1" value="${s.customs || 0}" class="sc-input-sm">
              </div>
              <div class="sc-li-field">
                <label class="sc-label">Ad Cost per Sale ($)</label>
                <input id="scAdCost" type="number" min="0" step="0.01" value="${s.adCost || 3}" class="sc-input-sm">
              </div>
            </div>
            <div class="sc-landed-visual">
              <div class="sc-landed-chart" id="scLandedChart"></div>
              <div class="sc-landed-breakdown" id="scLandedBreakdown">
                <div class="sc-lb-line"><span class="sc-lb-dot" style="background:var(--accent-cyan)"></span><span>Product Cost</span><span class="sc-lb-val" id="scLProduct">$0.00</span></div>
                <div class="sc-lb-line"><span class="sc-lb-dot" style="background:var(--accent-orange)"></span><span>Shipping</span><span class="sc-lb-val" id="scLShipping">$0.00</span></div>
                <div class="sc-lb-line"><span class="sc-lb-dot" style="background:var(--accent-purple)"></span><span>Platform Fee</span><span class="sc-lb-val" id="scLFee">$0.00</span></div>
                <div class="sc-lb-line"><span class="sc-lb-dot" style="background:var(--accent-red)"></span><span>Customs</span><span class="sc-lb-val" id="scLCustoms">$0.00</span></div>
                <div class="sc-lb-line"><span class="sc-lb-dot" style="background:var(--accent-yellow)"></span><span>Ad Cost</span><span class="sc-lb-val" id="scLAdCost">$0.00</span></div>
                <div class="sc-lb-total"><span>Total Landed</span><span class="sc-lb-val" id="scLTotal">$0.00</span></div>
                <div class="sc-lb-profit"><span>Profit Per Sale</span><span class="sc-lb-val" id="scLProfit">$0.00</span></div>
                <div class="sc-lb-margin"><span>Margin</span><span class="sc-lb-val" id="scLMargin">0%</span></div>
              </div>
            </div>
            <div class="sc-landed-alert" id="scLandedAlert"></div>
          </div>
        </div>

        <div class="sc-section">
          <div class="sc-section-header">
            <h2 class="sc-section-title">📊 Method Comparison</h2>
            <p class="sc-section-desc">Side-by-side comparison of all shipping methods for your selected route</p>
          </div>
          <div class="sc-table-wrap">
            <table class="sc-table">
              <thead><tr>
                <th>Method</th><th>Cost</th><th>Delivery</th><th>Tracking</th><th>Insurance</th><th>Best For</th>
              </tr></thead>
              <tbody id="scMethodTable"></tbody>
            </table>
          </div>
        </div>

        <div class="sc-section">
          <div class="sc-section-header">
            <h2 class="sc-section-title">🗺️ Route Explorer</h2>
            <p class="sc-section-desc">Click any route to see full shipping details — ${ORIGINS.length} origins × ${DESTINATIONS.length} destinations</p>
          </div>
          <div class="sc-route-filters">
            <button class="sc-rf-btn active" data-region="all">All Origins</button>
            <button class="sc-rf-btn" data-region="asia">🇨🇳 Asia</button>
            <button class="sc-rf-btn" data-region="na">🇺🇸 North America</button>
            <button class="sc-rf-btn" data-region="eu">🇪🇺 Europe</button>
          </div>
          <div class="sc-route-grid" id="scRouteGrid"></div>
        </div>

        <div class="sc-section">
          <div class="sc-section-header">
            <h2 class="sc-section-title">📐 Dimensional Weight Calculator</h2>
            <p class="sc-section-desc">Large but light items may cost more — carriers use max(actual weight, dim weight). Formula: L×W×H÷5000</p>
          </div>
          <div class="sc-panel sc-dim-panel">
            <div class="sc-dim-fields">
              <div class="sc-li-field"><label class="sc-label">Length (cm)</label><input id="scDimL" type="number" min="0" step="1" value="20" class="sc-input-sm"></div>
              <div class="sc-li-field"><label class="sc-label">Width (cm)</label><input id="scDimW" type="number" min="0" step="1" value="15" class="sc-input-sm"></div>
              <div class="sc-li-field"><label class="sc-label">Height (cm)</label><input id="scDimH" type="number" min="0" step="1" value="10" class="sc-input-sm"></div>
              <div class="sc-li-field"><label class="sc-label">Actual Weight (kg)</label><input id="scDimAct" type="number" min="0" step="0.01" value="0.5" class="sc-input-sm"></div>
            </div>
            <button class="sc-calc-btn" id="scDimCalcBtn">Calculate Dimensional Weight</button>
            <div class="sc-dim-result" id="scDimResult"></div>
          </div>
        </div>

        <div class="sc-section">
          <div class="sc-section-header">
            <h2 class="sc-section-title">⏱️ Shipping Time Heatmap</h2>
            <p class="sc-section-desc">Average delivery days by origin region and method — darker = faster</p>
          </div>
          <div class="sc-heatmap" id="scHeatmap"></div>
        </div>

        <div class="sc-section">
          <div class="sc-section-header">
            <h2 class="sc-section-title">💡 Smart Shipping Tips</h2>
            <p class="sc-section-desc">Proven strategies to cut costs and speed up delivery</p>
          </div>
          <div class="sc-tips-grid" id="scTipsGrid"></div>
        </div>

        ${
          window.HuntDrop.renderRelatedTools
            ? window.HuntDrop.renderRelatedTools([
                {
                  section: 'section-profit-lab',
                  name: 'Profit Calculator',
                  desc: 'Calculate exact profit margins with shipping included',
                  icon: '💰',
                  color: 'var(--accent-green)',
                },
                {
                  section: 'section-supplier-hub',
                  name: 'Supplier Hub',
                  desc: 'Find suppliers with best shipping terms',
                  icon: '🏭',
                  color: 'var(--accent-cyan)',
                },
                {
                  section: 'section-supplier-intel',
                  name: 'Supplier Check',
                  desc: 'Verify supplier shipping reliability',
                  icon: '🛡',
                  color: 'var(--accent-yellow)',
                },
                {
                  section: 'section-budget',
                  name: 'Budget Planner',
                  desc: 'Allocate shipping budget across orders',
                  icon: '💳',
                  color: 'var(--accent-purple)',
                },
                {
                  section: 'section-bundles',
                  name: 'Bundle Ideas',
                  desc: 'Bundle items to reduce per-unit shipping',
                  icon: '📦',
                  color: 'var(--accent-orange)',
                },
                {
                  section: 'section-simulator',
                  name: 'Business Simulator',
                  desc: 'Model scenarios with different shipping costs',
                  icon: '🎯',
                  color: 'var(--accent-pink)',
                },
              ])
            : ''
        }
      </div>`;
      container.appendChild(section);
      _section = section;
      bindEvents(s);
      renderMethodTable(s);
      renderRoutes(s);
      renderDimCalc();
      renderHeatmap();
      renderTips();

      section.addEventListener('click', (e) => {
        const card = e.target.closest('[data-section]');
        if (!card) return;
        if (e.target.closest('button, a, select, input')) return;
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
    },

    unmount(_ctx) {
      if (_section && _section.parentNode) _section.parentNode.removeChild(_section);
      _section = null;
    },
  });
  Object.defineProperty(window.HuntDrop.PluginRegistry.get('shipping-calculator'), '_section', {
    get() {
      return _section;
    },
    set(v) {
      _section = v;
    },
    configurable: true,
  });
})();
