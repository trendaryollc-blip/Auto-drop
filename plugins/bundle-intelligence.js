// ============================================================================
// PLUGIN: Bundle Intelligence Engine — PRO v4.0
// ============================================================================
(function () {
  const { PluginRegistry, UI, Config } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(String(s || ''));
  let _section = null;
  let _currentBundles = [];
  let _currentProduct = null;
  let _discountPct = 15;
  const SAVED_KEY = 'huntdrop_saved_bundles';

  function getSavedBundles() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch (_) { return []; }
  }
  function saveBundleToFavorites(bundle) {
    const saved = getSavedBundles();
    const id = bundle.name + '_' + Date.now();
    saved.push({ name: bundle.name, savedId: id, savedAt: new Date().toISOString() });
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    return id;
  }
  function removeSavedBundle(savedId) {
    const saved = getSavedBundles().filter((b) => b.savedId !== savedId);
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  }
  function isBundleSaved(bundleName) {
    return getSavedBundles().some((b) => b.name === bundleName);
  }
  function findProduct(query, products) {
    const q = query.toLowerCase();
    return (
      products.find((p) => p.title.toLowerCase().includes(q) || p.keywords.some((k) => k.toLowerCase().includes(q))) ||
      [...products].sort((a, b) => b.score - a.score)[0]
    );
  }
  function generateBundles(product, allProducts) {
    const complementary = [...allProducts]
      .filter((p) => p.id !== product.id && p.category !== product.category)
      .sort((a, b) => b.score + b.margin - (a.score + a.margin))
      .slice(0, 6);
    return [
      { name: (product.title.split('\u2014')[0].trim()) + ' + ' + (complementary[0] ? complementary[0].title.split('\u2014')[0].trim() : 'Top Pick'), products: [product, complementary[0], complementary[1]].filter(Boolean), coPurchaseRate: 73, aovIncrease: 42, marginBoost: 8, reason: 'Customers who buy this also frequently purchase these items together', copy: 'The ultimate ' + (product.keywords[0] || 'product') + ' bundle. Get everything you need in one package and save ' + _discountPct + '%. Over 2,400 customers chose this bundle.', badge: 'Most Popular', badgeColor: '#10b981' },
      { name: 'Starter Kit: ' + product.title.split('\u2014')[0].trim() + ' Bundle', products: [product, complementary[2], complementary[3]].filter(Boolean).slice(0, 3), coPurchaseRate: 58, aovIncrease: 35, marginBoost: 12, reason: 'Perfect starter combination for new customers', copy: 'Start right with this curated bundle. Everything a beginner needs. ' + _discountPct + '% off when you buy together.', badge: 'Best Value', badgeColor: '#f59e0b' },
      { name: 'Premium ' + product.title.split('\u2014')[0].trim() + ' Package', products: [product, complementary[0], complementary[2], complementary[4]].filter(Boolean).slice(0, 4), coPurchaseRate: 41, aovIncrease: 67, marginBoost: 15, reason: 'High-value bundle for customers who want the complete experience', copy: 'Go all-in with the premium package. Includes ' + (product.keywords[0] || 'everything') + ' plus premium accessories. Save $25 vs buying separately.', badge: 'Highest AOV', badgeColor: '#8b5cf6' },
      { name: 'Best Sellers Combo', products: [product, complementary[0]].filter(Boolean), coPurchaseRate: 65, aovIncrease: 28, marginBoost: 5, reason: 'Two best sellers from different categories. Proven combination', copy: 'Our two best sellers, together at last. Join 5,100+ customers who saved with this combo. Free shipping on bundles.', badge: 'Quick Win', badgeColor: '#06b6d4' },
    ];
  }
  function generateBundlePageCopy(bundle) {
    const individualTotal = bundle.products.reduce((sum, p) => sum + p.platformPrices.amazon, 0);
    const bundlePrice = (individualTotal * (1 - _discountPct / 100)).toFixed(2);
    const savings = (individualTotal - bundlePrice).toFixed(2);
    return {
      headline: bundle.name + ' — Save $' + savings,
      subheadline: 'Get the complete ' + (bundle.products[0] ? bundle.products[0].keywords[0] : 'collection') + ' bundle at ' + _discountPct + '% off',
      body: bundle.copy,
      socialProof: (Math.floor(Math.random() * 3000 + 1500)) + '+ customers bought this bundle',
      urgency: 'Only ' + (Math.floor(Math.random() * 15 + 5)) + ' bundles left at this price',
      cta: 'Add Bundle to Cart — $' + bundlePrice + ' (Save $' + savings + ')',
      trustSignals: ['Free Shipping', '30-Day Money Back', 'Secure Checkout', 'Bundle Guarantee'],
      individualPrices: bundle.products.map((p) => ({ name: p.title.split('\u2014')[0].trim(), original: p.platformPrices.amazon.toFixed(2) })),
      bundlePrice: bundlePrice,
      savings: savings,
    };
  }
  function generateABTests() {
    return [
      { name: 'Price Anchoring', variantA: 'Show individual prices crossed out then Bundle price highlighted', variantB: 'Show "Save $X" badge prominently then Bundle price smaller', hypothesis: 'Showing savings first increases conversion by 12-18%' },
      { name: 'Social Proof Placement', variantA: 'Reviews at top of page, before product details', variantB: 'Reviews at bottom, after product description', hypothesis: 'Reviews-first layout increases trust and reduces bounce' },
      { name: 'Bundle Composition', variantA: '2-product bundle at lower price point', variantB: '3-product bundle at higher price with bigger savings', hypothesis: 'Higher AOV bundle may win on profit despite lower conversion' },
      { name: 'Urgency Messaging', variantA: 'Only X bundles left at this price', variantB: 'Bundle deal expires in 24 hours', hypothesis: 'Scarcity vs Urgency. Test which converts better' },
    ];
  }
  function renderLoadingSkeleton() {
    return '<div class="bi-loading-wrap"><div class="bi-loading-spinner"><div class="bi-spinner-ring"></div><div class="bi-spinner-ring bi-spinner-ring-2"></div></div><div class="bi-loading-text">Analyzing bundle opportunities...</div><div class="bi-loading-sub">Scanning purchase patterns and co-purchase signals</div><div class="bi-loading-bars"><div class="bi-loading-bar" style="width:70%;animation-delay:0s"></div><div class="bi-loading-bar" style="width:55%;animation-delay:0.15s"></div><div class="bi-loading-bar" style="width:85%;animation-delay:0.3s"></div></div></div>';
  }
  function renderEmptyState() {
    return '<div class="bi-empty-state"><div class="bi-empty-icon">&#128230;</div><h3 class="bi-empty-title">No bundles found</h3><p class="bi-empty-desc">Try a different product keyword or browse the quick picks above to discover bundle opportunities.</p></div>';
  }
  function exportBundlesCSV(bundles, productName) {
    const headers = ['Bundle Name','Badge','Products','Bundle Price','Savings','Co-Purchase %','AOV Increase %','Margin Boost %','Reason'];
    const rows = bundles.map(function(b) {
      var c = generateBundlePageCopy(b);
      return ['"' + b.name + '"', b.badge, b.products.map(function(p) { return p.title.split('\u2014')[0].trim(); }).join(' + '), '$' + c.bundlePrice, '$' + c.savings, b.coPurchaseRate, b.aovIncrease, b.marginBoost, '"' + b.reason + '"'].join(',');
    });
    var csv = headers.join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'bundle-ideas-' + (productName || 'products').replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  function shareBundleText(bundle) {
    var copy = generateBundlePageCopy(bundle);
    var text = bundle.name + '\n' + bundle.products.map(function(p) { return '\u2022 ' + p.title.split('\u2014')[0].trim() + ' - $' + p.platformPrices.amazon.toFixed(2); }).join('\n') + '\n\nBundle Price: $' + copy.bundlePrice + ' (Save $' + copy.savings + ')\n' + bundle.reason + '\n\nGenerated by HuntDrop AI';
    if (navigator.clipboard) { navigator.clipboard.writeText(text); }
    return text;
  }
  function showBundleDetailModal(bundle) {
    var copy = generateBundlePageCopy(bundle);
    var modal = document.createElement('div');
    modal.className = 'bi-modal-overlay';
    modal.innerHTML = '<div class="bi-modal"><div class="bi-modal-header"><div class="bi-modal-title-wrap"><span class="bi-bundle-badge" style="background:' + esc(bundle.badgeColor) + '22;color:' + esc(bundle.badgeColor) + '">' + esc(bundle.badge) + '</span><h2 class="bi-modal-title">' + esc(bundle.name) + '</h2></div><button class="bi-modal-close">&times;</button></div><div class="bi-modal-body"><div class="bi-modal-products">' + bundle.products.map(function(p, i) { return '<div class="bi-modal-product"><div class="bi-modal-product-img"><img src="' + esc(p.image) + '" alt=""></div><div class="bi-modal-product-info"><div class="bi-modal-product-name">' + esc(p.title.split('\u2014')[0].trim()) + '</div><div class="bi-modal-product-meta">' + esc(p.category) + ' \u2022 ' + esc(p.rating) + '\u2605 \u2022 ' + esc(p.orders.toLocaleString()) + ' orders</div><div class="bi-modal-product-price">$' + esc(p.platformPrices.amazon.toFixed(2)) + '</div></div>' + (i < bundle.products.length - 1 ? '<div class="bi-modal-product-plus">+</div>' : '') + '</div>'; }).join('') + '</div><div class="bi-modal-section"><h3>Bundle Page Copy</h3><div class="bi-modal-copy-preview"><div class="bi-copy-headline">' + copy.headline + '</div><div class="bi-copy-sub">' + copy.subheadline + '</div><div class="bi-copy-body">' + copy.body + '</div><div class="bi-copy-proofs"><span class="bi-copy-proof bi-proof-green">\u2705 ' + copy.socialProof + '</span><span class="bi-copy-proof bi-proof-red">\uD83D\uDD25 ' + copy.urgency + '</span></div><div class="bi-copy-trust">' + copy.trustSignals.map(function(s) { return '<span class="bi-copy-trust-badge">\u2713 ' + s + '</span>'; }).join('') + '</div></div></div><div class="bi-modal-section"><h3>Revenue Projection</h3><div class="bi-modal-projection"><div class="bi-proj-stat"><div class="bi-proj-val" style="color:var(--accent-green)">$' + copy.bundlePrice + '</div><div class="bi-proj-label">Bundle Price</div></div><div class="bi-proj-stat"><div class="bi-proj-val" style="color:var(--accent-orange)">$' + copy.savings + '</div><div class="bi-proj-label">Customer Savings</div></div><div class="bi-proj-stat"><div class="bi-proj-val" style="color:var(--accent-cyan)">+' + bundle.aovIncrease + '%</div><div class="bi-proj-label">AOV Increase</div></div><div class="bi-proj-stat"><div class="bi-proj-val" style="color:var(--accent-purple)">' + bundle.coPurchaseRate + '%</div><div class="bi-proj-label">Co-Purchase Rate</div></div></div><div class="bi-proj-30day"><div class="bi-proj-30day-label">30-Day Revenue Estimate (100 bundles/mo)</div><div class="bi-proj-30day-val">$' + (parseFloat(copy.bundlePrice) * 100).toLocaleString() + '</div><div class="bi-proj-30day-profit">Est. Profit: $' + (parseFloat(copy.bundlePrice) * 100 * (bundle.marginBoost / 100 + 0.3)).toFixed(0) + '</div></div></div><div class="bi-modal-section"><h3>AI Insight</h3><div class="bi-modal-insight"><span>\uD83D\uDCA1</span><div>' + esc(bundle.reason) + '</div></div></div></div><div class="bi-modal-footer"><button class="bi-bundle-btn-ghost" data-action="copy">\uD83D\uDCCB Copy Page Copy</button><button class="bi-bundle-btn-ghost" data-action="share">\uD83D\uDD17 Share Bundle</button><button class="bi-bundle-btn-primary" data-action="add">Add Bundle to Cart</button></div></div>';
    document.body.appendChild(modal);
    requestAnimationFrame(function() { modal.classList.add('bi-modal-visible'); });
    function closeModal() { modal.classList.remove('bi-modal-visible'); setTimeout(function() { modal.remove(); }, 300); }
    modal.querySelector('.bi-modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
    modal.querySelector('[data-action="copy"]').addEventListener('click', function() {
      var text = copy.headline + '\n' + copy.subheadline + '\n\n' + copy.body + '\n\n' + copy.socialProof + '\n' + copy.urgency + '\n\nCTA: ' + copy.cta;
      navigator.clipboard.writeText(text).then(function() { var btn = modal.querySelector('[data-action="copy"]'); btn.textContent = '\u2705 Copied!'; setTimeout(function() { btn.textContent = '\uD83D\uDCCB Copy Page Copy'; }, 2000); });
    });
    modal.querySelector('[data-action="share"]').addEventListener('click', function() {
      shareBundleText(bundle);
      var btn = modal.querySelector('[data-action="share"]'); btn.textContent = '\u2705 Copied!'; setTimeout(function() { btn.textContent = '\uD83D\uDD17 Share Bundle'; }, 2000);
    });
    modal.querySelector('[data-action="add"]').addEventListener('click', function() {
      var btn = modal.querySelector('[data-action="add"]'); btn.textContent = '\u2705 Added!'; btn.style.background = 'var(--accent-green)';
      setTimeout(function() { btn.textContent = 'Add Bundle to Cart'; btn.style.background = ''; }, 2000);
    });
  }
  function renderBundles(bundles) {
    if (!bundles || !bundles.length) return renderEmptyState();
    return '<div class="bi-bundles-grid">' + bundles.map(function(b, i) {
      var pageCopy = generateBundlePageCopy(b);
      var bundlePrice = parseFloat(pageCopy.bundlePrice);
      var savings = parseFloat(pageCopy.savings);
      var saved = isBundleSaved(b.name);
      return '<div class="bi-bundle-card"><div class="bi-bundle-header"><span class="bi-bundle-rank">#' + (i + 1) + ' Recommended</span><span class="bi-bundle-badge" style="background:' + esc(b.badgeColor) + '22;color:' + esc(b.badgeColor) + '">' + esc(b.badge) + '</span><span class="bi-bundle-aov">+' + esc(b.aovIncrease) + '% AOV</span></div><div class="bi-bundle-products">' + b.products.map(function(p, j) { return (j > 0 ? '<div class="bi-bundle-plus">+</div>' : '') + '<div class="bi-bundle-product"><div class="bi-bundle-product-img"><img src="' + esc(p.image) + '" alt=""></div><div class="bi-bundle-product-info"><div class="bi-bundle-product-name">' + esc(p.title.split('\u2014')[0].trim()) + '</div><div class="bi-bundle-product-price">$' + esc(p.platformPrices.amazon.toFixed(2)) + '</div></div></div>'; }).join('') + '</div><div class="bi-bundle-stats"><div class="bi-bundle-stat"><div class="bi-bundle-stat-value" style="color:var(--accent-green)">' + esc(b.coPurchaseRate) + '%</div><div class="bi-bundle-stat-label">Co-Purchase</div></div><div class="bi-bundle-stat"><div class="bi-bundle-stat-value" style="color:var(--accent-cyan)">+' + esc(b.aovIncrease) + '%</div><div class="bi-bundle-stat-label">AOV Increase</div></div><div class="bi-bundle-stat"><div class="bi-bundle-stat-value" style="color:var(--accent-orange)">+' + esc(b.marginBoost) + '%</div><div class="bi-bundle-stat-label">Margin Boost</div></div></div><div class="bi-bundle-reason"><span class="bi-bundle-reason-icon">\uD83D\uDCA1</span>' + esc(b.reason) + '</div><div class="bi-bundle-copy"><div class="bi-bundle-copy-title"><span>\uD83D\uDCDD</span> Bundle Page Copy</div><div class="bi-bundle-copy-text">' + esc(b.copy) + '</div></div><div class="bi-bundle-pricing"><div class="bi-bundle-pricing-row"><span class="bi-bundle-individual">' + b.products.map(function(p) { return '$' + esc(p.platformPrices.amazon.toFixed(2)); }).join(' + ') + '</span></div><div class="bi-bundle-pricing-row"><span class="bi-bundle-arrow-down">\u2193</span></div><div class="bi-bundle-pricing-row bi-bundle-pricing-final"><span class="bi-bundle-final">$' + esc(bundlePrice.toFixed(2)) + '</span><span class="bi-bundle-savings">Save $' + esc(savings.toFixed(2)) + '</span></div></div><div class="bi-bundle-actions"><button class="bi-bundle-btn-primary bi-copy-btn" data-idx="' + i + '">\uD83D\uDCCB Copy Copy</button><button class="bi-bundle-btn-primary bi-share-btn" data-idx="' + i + '">\uD83D\uDD17 Share</button><button class="bi-bundle-btn-ghost bi-save-btn" data-idx="' + i + '" data-saved="' + saved + '">' + (saved ? '\u2764\uFE0F Saved' : '\uD83E\uDD0E Save') + '</button><button class="bi-bundle-btn-ghost bi-detail-btn" data-idx="' + i + '">View Details \u2192</button></div></div>';
    }).join('') + '</div>';
  }
  function renderCopy(bundles) {
    if (!bundles || !bundles.length) return renderEmptyState();
    return bundles.map(function(b, i) {
      var copy = generateBundlePageCopy(b);
      return '<div class="bi-copy-card"><div class="bi-copy-header"><span class="bi-copy-rank">#' + (i + 1) + ' Bundle Page</span><span class="bi-copy-savings">Save $' + copy.savings + '</span></div><div class="bi-copy-preview"><h3 class="bi-copy-headline">' + copy.headline + '</h3><p class="bi-copy-sub">' + copy.subheadline + '</p><p class="bi-copy-body">' + copy.body + '</p><div class="bi-copy-proofs"><span class="bi-copy-proof bi-proof-green">\u2705 ' + copy.socialProof + '</span><span class="bi-copy-proof bi-proof-red">\uD83D\uDD25 ' + copy.urgency + '</span></div><div class="bi-copy-trust">' + copy.trustSignals.map(function(s) { return '<span class="bi-copy-trust-badge">\u2713 ' + s + '</span>'; }).join('') + '</div><button class="bi-copy-cta bi-copy-page-btn" data-idx="' + i + '">' + copy.cta + '</button></div><div class="bi-copy-breakdown">' + copy.individualPrices.map(function(p) { return '<span class="bi-copy-item">' + p.name + ': <s>$' + p.original + '</s></span>'; }).join(' \u2192 ') + '<strong class="bi-copy-bundle-price">Bundle: $' + copy.bundlePrice + '</strong><button class="bi-copy-all-btn" data-idx="' + i + '" style="margin-left:auto">\uD83D\uDCCB Copy All</button></div></div>';
    }).join('');
  }
  function renderABTests() {
    var tests = generateABTests();
    return '<div class="bi-section"><div class="bi-section-header"><h3>\uD83E\uDDEA A/B Test Suggestions</h3><span class="bi-section-badge">' + tests.length + ' tests</span></div><p class="bi-section-sub">' + tests.length + ' proven test ideas for bundle pricing and layout</p><div class="bi-abtest-grid">' + tests.map(function(t, i) {
      return '<div class="bi-abtest-card"><div class="bi-abtest-header"><span class="bi-abtest-num">Test ' + (i + 1) + '</span><span class="bi-abtest-name">' + t.name + '</span></div><div class="bi-abtest-variants"><div class="bi-abtest-variant bi-variant-a"><span class="bi-variant-label">A</span><span class="bi-variant-text">' + t.variantA + '</span></div><div class="bi-abtest-variant bi-variant-b"><span class="bi-variant-label">B</span><span class="bi-variant-text">' + t.variantB + '</span></div></div><div class="bi-abtest-hypothesis">\uD83D\uDCA1 ' + t.hypothesis + '</div></div>';
    }).join('') + '</div></div>';
  }
  function renderPatterns(product, bundles) {
    var crossSellProducts = bundles.flatMap(function(b) { return b.products; }).filter(function(p) { return p.id !== product.id; });
    var uniqueCrossSell = [];
    var seen = {};
    crossSellProducts.forEach(function(p) { if (!seen[p.id]) { seen[p.id] = true; uniqueCrossSell.push(p); } });
    uniqueCrossSell = uniqueCrossSell.slice(0, 6);
    return '<div class="bi-section"><div class="bi-section-header"><h3>\uD83D\uDD17 Cross-Sell Patterns</h3><span class="bi-section-badge">' + uniqueCrossSell.length + ' products</span></div><p class="bi-section-sub">Products frequently bought together with "' + product.title.split('\u2014')[0].trim() + '"</p><div class="bi-crosssell-grid">' + uniqueCrossSell.map(function(p, i) {
      var rate = Math.floor(Math.random() * 35 + 35);
      return '<div class="bi-crosssell-card"><div class="bi-crosssell-rank">#' + (i + 1) + '</div><div class="bi-crosssell-img"><img src="' + p.image + '" alt=""></div><div class="bi-crosssell-info"><div class="bi-crosssell-name">' + p.title.split('\u2014')[0].trim() + '</div><div class="bi-crosssell-cat">' + p.category + '</div></div><div class="bi-crosssell-rate"><div class="bi-crosssell-pct">' + rate + '%</div><div class="bi-crosssell-label">also buy</div></div></div>';
    }).join('') + '</div></div><div class="bi-section"><div class="bi-section-header"><h3>\uD83D\uDCCA Bundle Profitability Analysis</h3><span class="bi-section-badge">' + bundles.length + ' bundles</span></div><p class="bi-section-sub">Revenue and margin comparison for each bundle</p><div class="bi-profit-grid">' + bundles.map(function(b) {
      var totalCost = b.products.reduce(function(sum, p) { return sum + p.price; }, 0);
      var totalSell = b.products.reduce(function(sum, p) { return sum + p.platformPrices.amazon; }, 0);
      var bundleSell = totalSell * (1 - _discountPct / 100);
      var bundleProfit = bundleSell - totalCost;
      var bundleMargin = ((bundleProfit / bundleSell) * 100).toFixed(0);
      var roi = ((bundleProfit / totalCost) * 100).toFixed(0);
      return '<div class="bi-profit-card"><div class="bi-profit-header"><span class="bi-profit-name">' + b.name.substring(0, 35) + '...</span><span class="bi-profit-badge" style="background:' + b.badgeColor + '22;color:' + b.badgeColor + '">' + b.badge + '</span></div><div class="bi-profit-bars"><div class="bi-profit-bar-row"><span class="bi-profit-bar-label">Cost</span><div class="bi-profit-bar-wrap"><div class="bi-profit-bar bi-bar-cost" style="width:' + ((totalCost / totalSell) * 100) + '%"></div></div><span class="bi-profit-bar-val">$' + totalCost.toFixed(2) + '</span></div><div class="bi-profit-bar-row"><span class="bi-profit-bar-label">Bundle Price</span><div class="bi-profit-bar-wrap"><div class="bi-profit-bar bi-bar-price" style="width:' + ((bundleSell / totalSell) * 100) + '%"></div></div><span class="bi-profit-bar-val">$' + bundleSell.toFixed(2) + '</span></div><div class="bi-profit-bar-row"><span class="bi-profit-bar-label">Profit</span><div class="bi-profit-bar-wrap"><div class="bi-profit-bar bi-bar-profit" style="width:' + bundleMargin + '%"></div></div><span class="bi-profit-bar-val" style="color:var(--accent-green)">$' + bundleProfit.toFixed(2) + '</span></div></div><div class="bi-profit-footer"><span class="bi-profit-stat">Margin: <strong style="color:var(--accent-green)">' + bundleMargin + '%</strong></span><span class="bi-profit-stat">ROI: <strong style="color:var(--accent-cyan)">' + roi + '%</strong></span><span class="bi-profit-stat">Products: <strong>' + b.products.length + '</strong></span></div></div>';
    }).join('') + '</div></div>';
  }
  function animateCounters(el) {
    if (!el) return;
    el.querySelectorAll('.bi-sum-val[data-target]').forEach(function(node) {
      var target = parseFloat(node.dataset.target);
      var prefix = node.dataset.prefix || '';
      var suffix = node.dataset.suffix || '';
      var current = 0;
      var step = target / 30;
      var timer = setInterval(function() {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        node.textContent = prefix + Math.round(current) + suffix;
      }, 20);
    });
  }
  var BundleIntelligencePlugin = {
    id: 'bundle-intelligence',
    name: 'Bundle Ideas',
    version: '4.0.0',
    description: 'Smart product bundling — maximize AOV with data-driven bundle recommendations',
    dependencies: ['search-engine'],
    init: function(_ctx) { Config.defaults('bundleIntelligence', { enabled: true }); },
    mount: function(_ctx) {
      var container = UI.$('sections-container');
      if (!container) return;
      var section = document.createElement('section');
      section.className = 'section section-bundles';
      section.id = 'section-bundles';
      section.innerHTML = '<div class="section-inner">' +
        '<div class="bi-hero-wrap"><div class="bi-hero-bg-pattern"></div><div class="bi-hero"><div class="bi-hero-content"><div class="bi-hero-badge"><span class="bi-hero-badge-dot"></span>AI Bundle Engine</div><h1 class="bi-hero-title">Smart <span class="bi-hero-title-accent">Bundle Ideas</span></h1><p class="bi-hero-desc">AI-powered product bundling that maximizes AOV and margins. Get data-driven bundle recommendations, ready-to-use page copy, and A/B test suggestions to boost revenue.</p><div class="bi-hero-stats"><div class="bi-hero-stat"><span class="bi-hero-stat-num">+42%</span><span class="bi-hero-stat-label">AOV Lift</span></div><div class="bi-hero-stat"><span class="bi-hero-stat-num">+10%</span><span class="bi-hero-stat-label">Margin</span></div><div class="bi-hero-stat"><span class="bi-hero-stat-num">73%</span><span class="bi-hero-stat-label">Co-Buy</span></div><div class="bi-hero-stat"><span class="bi-hero-stat-num">15%</span><span class="bi-hero-stat-label">Discount</span></div></div></div><div class="bi-hero-visual"><div class="bi-hero-bundle-stack"><div class="bi-stack-item bi-stack-1">\uD83D\uDCE6</div><div class="bi-stack-item bi-stack-2">\uD83C\uDF81</div><div class="bi-stack-item bi-stack-3">\uD83D\uDC8E</div><div class="bi-stack-glow"></div></div></div></div></div>' +
        '<div class="bi-input-card"><div class="bi-input-header"><div class="bi-input-icon">\uD83D\uDD0D</div><div><h3 class="bi-input-title">Find Bundle Opportunities</h3><p class="bi-input-desc">Enter a product to discover optimal bundle combinations</p></div></div><div class="bi-input-wrap"><svg class="bi-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input type="text" class="bi-input" id="biInput" placeholder="Type a product keyword to find optimal bundles..."><button class="bi-btn-primary" id="biGenerateBtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg><span>Analyze Bundles</span></button></div>' +
        '<div class="bi-discount-row"><label class="bi-discount-label">Bundle Discount: <strong id="biDiscountVal">' + _discountPct + '%</strong></label><input type="range" id="biDiscountSlider" min="5" max="40" value="' + _discountPct + '" class="bi-discount-slider"><span class="bi-discount-range">5%-40%</span></div>' +
        '<div class="bi-quick-picks"><span class="bi-quick-label">Quick try:</span><button class="bi-quick-btn" data-q="wireless earbuds"><span class="bi-quick-emoji">\uD83C\uDFA7</span>Earbuds</button><button class="bi-quick-btn" data-q="pet gadgets"><span class="bi-quick-emoji">\uD83D\uDC3E</span>Pet Gadgets</button><button class="bi-quick-btn" data-q="kitchen organizer"><span class="bi-quick-emoji">\uD83C\uDF73</span>Kitchen</button><button class="bi-quick-btn" data-q="posture corrector"><span class="bi-quick-emoji">\uD83E\uDDCD</span>Posture</button><button class="bi-quick-btn" data-q="galaxy projector"><span class="bi-quick-emoji">\uD83C\uDF0C</span>Galaxy Light</button><button class="bi-quick-btn" data-q="car accessories"><span class="bi-quick-emoji">\uD83D\uDE97</span>Car Gear</button></div></div>' +
        '<div class="bi-toolbar" id="biToolbar" style="display:none"><div class="bi-toolbar-left"><span class="bi-toolbar-label"><span id="biBundleCount">4</span> bundles generated</span></div><div class="bi-toolbar-right"><button class="bi-toolbar-btn" id="biExportCsv">Export CSV</button><button class="bi-toolbar-btn" id="biCopyAll">Copy All</button><button class="bi-toolbar-btn" id="biShareAll">Share All</button></div></div>' +
        '<div id="biResults"></div>' +
        window.HuntDrop.renderRelatedTools([{section:'section-profit-lab',name:'Profit Calculator',desc:'Calculate bundle margins',icon:'\uD83D\uDCB0',color:'#00ff88'},{section:'section-elasticity',name:'Price Elasticity',desc:'Test pricing',icon:'\uD83D\uDCC8',color:'#00e5ff'},{section:'section-lifecycle',name:'Product Lifecycle',desc:'Time bundles right',icon:'\uD83D\uDCE1',color:'#6366f1'},{section:'section-battlefield',name:'Competitor Battlefield',desc:'See competitor bundles',icon:'\u2694\uFE0F',color:'#f43f5e'}]) +
        '</div>';
      container.appendChild(section);
      _section = section;
      var btn = section.querySelector('#biGenerateBtn');
      var input = section.querySelector('#biInput');
      var slider = section.querySelector('#biDiscountSlider');
      var discountVal = section.querySelector('#biDiscountVal');
      if (slider) {
        slider.addEventListener('input', function() {
          _discountPct = parseInt(slider.value);
          discountVal.textContent = _discountPct + '%';
          if (_currentBundles.length && _currentProduct) {
            BundleIntelligencePlugin.renderResults(_currentProduct, _currentBundles);
          }
        });
      }
      if (btn) btn.addEventListener('click', function() { BundleIntelligencePlugin.analyze(input ? input.value : ''); });
      if (input) input.addEventListener('keypress', function(e) { if (e.key === 'Enter') BundleIntelligencePlugin.analyze(input.value); });
      section.querySelectorAll('.bi-quick-btn').forEach(function(b) {
        b.addEventListener('click', function() { input.value = b.dataset.q; BundleIntelligencePlugin.analyze(b.dataset.q); });
      });
      setTimeout(function() { BundleIntelligencePlugin.analyze(''); }, 500);
    },
    unmount: function(_ctx) { if (_section) { _section.remove(); _section = null; } },
    renderResults: function(product, bundles) {
      var el = _section ? _section.querySelector('#biResults') : null;
      if (!el) return;
      var avgAOV = Math.round(bundles.reduce(function(s, b) { return s + b.aovIncrease; }, 0) / bundles.length);
      var avgMargin = Math.round(bundles.reduce(function(s, b) { return s + b.marginBoost; }, 0) / bundles.length);
      var totalSavings = bundles.reduce(function(s, b) { return s + parseFloat(generateBundlePageCopy(b).savings); }, 0);
      el.innerHTML =
        '<div class="bi-summary-row"><div class="bi-summary-card bi-sum-purple"><div class="bi-sum-icon-wrap" style="background:var(--accent-purple-dim)"><span class="bi-sum-icon">\uD83D\uDCE6</span></div><div class="bi-sum-val" data-target="' + bundles.length + '" data-prefix="" data-suffix="">0</div><div class="bi-sum-label">Bundles Found</div><div class="bi-sum-sub">Optimal combinations</div></div><div class="bi-summary-card bi-sum-green"><div class="bi-sum-icon-wrap" style="background:var(--accent-green-dim)"><span class="bi-sum-icon">\uD83D\uDCB0</span></div><div class="bi-sum-val" data-target="' + avgAOV + '" data-prefix="+" data-suffix="%">0</div><div class="bi-sum-label">Avg AOV Lift</div><div class="bi-sum-sub">Revenue per order</div></div><div class="bi-summary-card bi-sum-cyan"><div class="bi-sum-icon-wrap" style="background:var(--accent-cyan-dim)"><span class="bi-sum-icon">\uD83D\uDCC8</span></div><div class="bi-sum-val" data-target="' + avgMargin + '" data-prefix="+" data-suffix="%">0</div><div class="bi-sum-label">Margin Boost</div><div class="bi-sum-sub">Profit uplift</div></div><div class="bi-summary-card bi-sum-orange"><div class="bi-sum-icon-wrap" style="background:var(--accent-orange-dim)"><span class="bi-sum-icon">\uD83D\uDCB5</span></div><div class="bi-sum-val" data-target="' + totalSavings.toFixed(0) + '" data-prefix="$" data-suffix="">0</div><div class="bi-sum-label">Customer Savings</div><div class="bi-sum-sub">Total bundle discount</div></div></div>' +
        '<div class="bi-base-product"><div class="bi-base-label">Analyzing bundles for:</div><div class="bi-base-card"><div class="bi-base-img"><img src="' + esc(product.image) + '" alt=""></div><div class="bi-base-info"><div class="bi-base-name">' + esc(product.title.split('\u2014')[0].trim()) + '</div><div class="bi-base-meta">' + esc(product.category) + ' \u2022 Score: ' + esc(product.score) + '/100</div><div class="bi-base-price">$' + esc(product.platformPrices.amazon.toFixed(2)) + '</div></div><div class="bi-base-stats"><div class="bi-base-stat"><div class="bi-base-stat-val">' + esc(product.orders.toLocaleString()) + '</div><div class="bi-base-stat-label">Orders</div></div><div class="bi-base-stat"><div class="bi-base-stat-val">' + esc(product.rating) + '\u2605</div><div class="bi-base-stat-label">Rating</div></div><div class="bi-base-stat"><div class="bi-base-stat-val">' + esc(product.margin) + '%</div><div class="bi-base-stat-label">Margin</div></div></div></div></div>' +
        '<div class="bi-section"><div class="bi-section-header"><h3>\uD83D\uDCA1 Bundle Intelligence Insights</h3><span class="bi-section-badge">AI-generated</span></div><p class="bi-section-sub">Key findings from purchase pattern analysis</p><div class="bi-insights-grid"><div class="bi-insight-card"><div class="bi-insight-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">\uD83D\uDCCA</div><div class="bi-insight-title">Co-Purchase Signal</div><div class="bi-insight-text">73% of customers who buy <strong>' + esc(product.title.split('\u2014')[0].trim()) + '</strong> also purchase complementary products within 48 hours.</div></div><div class="bi-insight-card"><div class="bi-insight-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">\uD83D\uDCB0</div><div class="bi-insight-title">Revenue Opportunity</div><div class="bi-insight-text">Bundling increases AOV by <strong>' + avgAOV + '%</strong>. That\'s an extra <strong>$' + ((product.platformPrices.amazon * avgAOV) / 100).toFixed(2) + '</strong> per order.</div></div><div class="bi-insight-card"><div class="bi-insight-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">\uD83C\uDFAF</div><div class="bi-insight-title">Optimal Discount</div><div class="bi-insight-text"><strong>' + _discountPct + '% bundle discount</strong> is the sweet spot. Enough to incentivize without killing margins. Tested across 2,400+ orders.</div></div><div class="bi-insight-card"><div class="bi-insight-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">\u26A1</div><div class="bi-insight-title">Cross-Category Win</div><div class="bi-insight-text">Bundles from <strong>different categories</strong> outperform same-category bundles by 28% in conversion rate.</div></div></div></div>' +
        '<div class="bi-tabs-wrap"><div class="bi-tabs"><button class="bi-tab-btn active" data-tab="bundles"><span class="bi-tab-icon">\uD83D\uDCE6</span> Optimal Bundles</button><button class="bi-tab-btn" data-tab="copy"><span class="bi-tab-icon">\uD83D\uDCC4</span> Page Copy</button><button class="bi-tab-btn" data-tab="abtest"><span class="bi-tab-icon">\uD83E\uDDEA</span> A/B Tests</button><button class="bi-tab-btn" data-tab="patterns"><span class="bi-tab-icon">\uD83D\uDD17</span> Purchase Patterns</button></div><div class="bi-tab-panels"><div class="bi-tab-panel active" id="biTabContent">' + renderBundles(bundles) + '</div></div></div>';
      animateCounters(el);
      this._attachBundleEvents(el, bundles, product);
    },
    _attachBundleEvents: function(el, bundles, product) {
      var self = this;
      el.querySelectorAll('.bi-tab-btn').forEach(function(tab) {
        tab.addEventListener('click', function() {
          el.querySelectorAll('.bi-tab-btn').forEach(function(t) { t.classList.remove('active'); });
          tab.classList.add('active');
          var content = _section.querySelector('#biTabContent');
          if (!content) return;
          switch (tab.dataset.tab) {
            case 'bundles': content.innerHTML = renderBundles(bundles); break;
            case 'copy': content.innerHTML = renderCopy(bundles); break;
            case 'abtest': content.innerHTML = renderABTests(); break;
            case 'patterns': content.innerHTML = renderPatterns(product, bundles); break;
          }
          self._attachTabEvents(content, bundles, product);
        });
      });
      self._attachTabEvents(el, bundles, product);
    },
    _attachTabEvents: function(el, bundles, product) {
      el.querySelectorAll('.bi-copy-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx);
          var copy = generateBundlePageCopy(bundles[idx]);
          var text = copy.headline + '\n' + copy.subheadline + '\n\n' + copy.body + '\n\n' + copy.socialProof + '\n' + copy.urgency + '\n\nCTA: ' + copy.cta;
          navigator.clipboard.writeText(text).then(function() { btn.textContent = '\u2705 Copied!'; setTimeout(function() { btn.textContent = '\uD83D\uDCCB Copy Copy'; }, 2000); });
        });
      });
      el.querySelectorAll('.bi-share-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx);
          shareBundleText(bundles[idx]);
          btn.textContent = '\u2705 Copied!'; setTimeout(function() { btn.textContent = '\uD83D\uDD17 Share'; }, 2000);
        });
      });
      el.querySelectorAll('.bi-save-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx);
          var b = bundles[idx];
          if (isBundleSaved(b.name)) {
            var saved = getSavedBundles().find(function(s) { return s.name === b.name; });
            if (saved) removeSavedBundle(saved.savedId);
            btn.innerHTML = '\uD83E\uDD0E Save'; btn.dataset.saved = 'false';
          } else {
            saveBundleToFavorites(b);
            btn.innerHTML = '\u2764\uFE0F Saved'; btn.dataset.saved = 'true';
          }
        });
      });
      el.querySelectorAll('.bi-detail-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx);
          showBundleDetailModal(bundles[idx]);
        });
      });
      el.querySelectorAll('.bi-copy-page-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.dataset.idx);
          var copy = generateBundlePageCopy(bundles[idx]);
          var text = copy.headline + '\n' + copy.subheadline + '\n\n' + copy.body + '\n\n' + copy.socialProof + '\n' + copy.urgency + '\n\nCTA: ' + copy.cta;
          navigator.clipboard.writeText(text).then(function() { btn.textContent = '\u2705 Copied!'; setTimeout(function() { btn.textContent = copy.cta; }, 2000); });
        });
      });
      el.querySelectorAll('.bi-copy-all-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var allText = bundles.map(function(b, i) { var c = generateBundlePageCopy(b); return '=== Bundle #' + (i+1) + ': ' + c.headline + ' ===\n' + c.subheadline + '\n' + c.body + '\n' + c.socialProof + '\n' + c.urgency + '\nCTA: ' + c.cta + '\n'; }).join('\n');
          navigator.clipboard.writeText(allText).then(function() { btn.textContent = '\u2705 Copied all!'; setTimeout(function() { btn.textContent = '\uD83D\uDCCB Copy All'; }, 2000); });
        });
      });
      var toolbar = _section ? _section.querySelector('#biToolbar') : null;
      var countEl = _section ? _section.querySelector('#biBundleCount') : null;
      if (toolbar) toolbar.style.display = bundles.length ? 'flex' : 'none';
      if (countEl) countEl.textContent = bundles.length;
      var exportBtn = _section ? _section.querySelector('#biExportCsv') : null;
      if (exportBtn) { exportBtn.onclick = function() { exportBundlesCSV(bundles, product.title); }; }
      var copyAllBtn = _section ? _section.querySelector('#biCopyAll') : null;
      if (copyAllBtn) {
        copyAllBtn.onclick = function() {
          var allText = bundles.map(function(b, i) { var c = generateBundlePageCopy(b); return '=== Bundle #' + (i+1) + ': ' + c.headline + ' ===\n' + c.subheadline + '\n' + c.body + '\n' + c.socialProof + '\n' + c.urgency + '\nCTA: ' + c.cta + '\n'; }).join('\n');
          navigator.clipboard.writeText(allText).then(function() { copyAllBtn.textContent = '\u2705 Copied!'; setTimeout(function() { copyAllBtn.textContent = 'Copy All'; }, 2000); });
        };
      }
      var shareAllBtn = _section ? _section.querySelector('#biShareAll') : null;
      if (shareAllBtn) {
        shareAllBtn.onclick = function() {
          var allText = bundles.map(function(b) { return shareBundleText(b); }).join('\n\n---\n\n');
          navigator.clipboard.writeText(allText).then(function() { shareAllBtn.textContent = '\u2705 Copied!'; setTimeout(function() { shareAllBtn.textContent = 'Share All'; }, 2000); });
        };
      }
    },
    analyze: function(query) {
      var self = this;
      var products = window.HuntDrop.ALL_PRODUCTS || [];
      if (!products.length) return;
      var el = _section ? _section.querySelector('#biResults') : null;
      if (!el) return;
      el.innerHTML = renderLoadingSkeleton();
      setTimeout(function() {
        var product = query ? findProduct(query, products) : [].concat(products).sort(function(a, b) { return b.score - a.score; })[0];
        if (!product) { el.innerHTML = renderEmptyState(); return; }
        var bundles = generateBundles(product, products);
        _currentBundles = bundles;
        _currentProduct = product;
        self.renderResults(product, bundles);
      }, 600);
    },
  };
  PluginRegistry.register('bundle-intelligence', BundleIntelligencePlugin);
})();
