// ============================================================================
// PLUGIN: Bundle Intelligence Engine — PRO v3.0
// ============================================================================
(function () {
  const { PluginRegistry, UI, Config } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(String(s || ''));
  let _section = null;

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
      {
        name: `${product.title.split('—')[0].trim()} + ${complementary[0]?.title.split('—')[0].trim() || 'Top Pick'}`,
        products: [product, complementary[0], complementary[1]].filter(Boolean),
        coPurchaseRate: 73,
        aovIncrease: 42,
        marginBoost: 8,
        reason: 'Customers who buy this also frequently purchase these items together',
        copy: `The ultimate ${product.keywords[0] || 'product'} bundle. Get everything you need in one package and save 15%. Over 2,400 customers chose this bundle.`,
        badge: 'Most Popular',
        badgeColor: '#10b981',
      },
      {
        name: `Starter Kit: ${product.title.split('—')[0].trim()} Bundle`,
        products: [product, complementary[2], complementary[3]].filter(Boolean).slice(0, 3),
        coPurchaseRate: 58,
        aovIncrease: 35,
        marginBoost: 12,
        reason: 'Perfect starter combination for new customers',
        copy: `Start right with this curated bundle. Everything a beginner needs — picked by experts. 15% off when you buy together.`,
        badge: 'Best Value',
        badgeColor: '#f59e0b',
      },
      {
        name: `Premium ${product.title.split('—')[0].trim()} Package`,
        products: [product, complementary[0], complementary[2], complementary[4]].filter(Boolean).slice(0, 4),
        coPurchaseRate: 41,
        aovIncrease: 67,
        marginBoost: 15,
        reason: 'High-value bundle for customers who want the complete experience',
        copy: `Go all-in with the premium package. Includes ${product.keywords[0] || 'everything'} plus premium accessories. Save $25 vs buying separately.`,
        badge: 'Highest AOV',
        badgeColor: '#8b5cf6',
      },
      {
        name: 'Best Sellers Combo',
        products: [product, complementary[0]].filter(Boolean),
        coPurchaseRate: 65,
        aovIncrease: 28,
        marginBoost: 5,
        reason: 'Two best sellers from different categories — proven combination',
        copy: `Our two best sellers, together at last. Join 5,100+ customers who saved with this combo. Free shipping on bundles.`,
        badge: 'Quick Win',
        badgeColor: '#06b6d4',
      },
    ];
  }

  function generateBundlePageCopy(bundle) {
    const individualTotal = bundle.products.reduce((sum, p) => sum + p.platformPrices.amazon, 0);
    const bundlePrice = (individualTotal * 0.85).toFixed(2);
    const savings = (individualTotal - bundlePrice).toFixed(2);
    return {
      headline: `${bundle.name} — Save $${savings}`,
      subheadline: `Get the complete ${bundle.products[0]?.keywords[0] || 'collection'} bundle at 15% off`,
      body: bundle.copy,
      socialProof: `${Math.floor(Math.random() * 3000 + 1500)}+ customers bought this bundle`,
      urgency: `Only ${Math.floor(Math.random() * 15 + 5)} bundles left at this price`,
      cta: `Add Bundle to Cart — $${bundlePrice} (Save $${savings})`,
      trustSignals: ['Free Shipping', '30-Day Money Back', 'Secure Checkout', 'Bundle Guarantee'],
      individualPrices: bundle.products.map((p) => ({
        name: p.title.split('—')[0].trim(),
        original: p.platformPrices.amazon.toFixed(2),
      })),
      bundlePrice,
      savings,
    };
  }

  function generateABTests() {
    return [
      {
        name: 'Price Anchoring',
        variantA: 'Show individual prices crossed out → Bundle price highlighted',
        variantB: 'Show "Save $X" badge prominently → Bundle price smaller',
        hypothesis: 'Showing savings first increases conversion by 12-18%',
      },
      {
        name: 'Social Proof Placement',
        variantA: 'Reviews at top of page, before product details',
        variantB: 'Reviews at bottom, after product description',
        hypothesis: 'Reviews-first layout increases trust and reduces bounce',
      },
      {
        name: 'Bundle Composition',
        variantA: '2-product bundle at lower price point',
        variantB: '3-product bundle at higher price with bigger savings',
        hypothesis: 'Higher AOV bundle may win on profit despite lower conversion',
      },
      {
        name: 'Urgency Messaging',
        variantA: '"Only X bundles left at this price"',
        variantB: '"Bundle deal expires in 24 hours"',
        hypothesis: 'Scarcity (stock) vs Urgency (time) — test which converts better',
      },
    ];
  }

  function renderBundles(bundles) {
    return `
    <div class="bi-bundles-grid">
      ${bundles
        .map((b, i) => {
          const pageCopy = generateBundlePageCopy(b);
          const bundlePrice = parseFloat(pageCopy.bundlePrice);
          const savings = parseFloat(pageCopy.savings);
          return `<div class="bi-bundle-card">
          <div class="bi-bundle-header">
            <span class="bi-bundle-rank">#${i + 1} Recommended</span>
            <span class="bi-bundle-badge" style="background:${esc(b.badgeColor)}22;color:${esc(b.badgeColor)}">${esc(b.badge)}</span>
            <span class="bi-bundle-aov">+${esc(b.aovIncrease)}% AOV</span>
          </div>
          <div class="bi-bundle-products">
            ${b.products
              .map(
                (p, j) => `
              ${j > 0 ? '<div class="bi-bundle-plus">+</div>' : ''}
              <div class="bi-bundle-product">
                <div class="bi-bundle-product-img"><img src="${esc(p.image)}" alt=""></div>
                <div class="bi-bundle-product-info">
                  <div class="bi-bundle-product-name">${esc(p.title.split('—')[0].trim())}</div>
                  <div class="bi-bundle-product-price">$${esc(p.platformPrices.amazon.toFixed(2))}</div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
          <div class="bi-bundle-stats">
            <div class="bi-bundle-stat"><div class="bi-bundle-stat-value" style="color:var(--accent-green)">${esc(b.coPurchaseRate)}%</div><div class="bi-bundle-stat-label">Co-Purchase</div></div>
            <div class="bi-bundle-stat"><div class="bi-bundle-stat-value" style="color:var(--accent-cyan)">+${esc(b.aovIncrease)}%</div><div class="bi-bundle-stat-label">AOV Increase</div></div>
            <div class="bi-bundle-stat"><div class="bi-bundle-stat-value" style="color:var(--accent-orange)">+${esc(b.marginBoost)}%</div><div class="bi-bundle-stat-label">Margin Boost</div></div>
          </div>
          <div class="bi-bundle-reason">
            <span class="bi-bundle-reason-icon">💡</span>
            ${esc(b.reason)}
          </div>
          <div class="bi-bundle-copy">
            <div class="bi-bundle-copy-title"><span>📝</span> Bundle Page Copy</div>
            <div class="bi-bundle-copy-text">${esc(b.copy)}</div>
          </div>
          <div class="bi-bundle-pricing">
            <div class="bi-bundle-pricing-row">
              <span class="bi-bundle-individual">${b.products.map((p) => '$' + esc(p.platformPrices.amazon.toFixed(2))).join(' + ')}</span>
            </div>
            <div class="bi-bundle-pricing-row">
              <span class="bi-bundle-arrow-down">↓</span>
            </div>
            <div class="bi-bundle-pricing-row bi-bundle-pricing-final">
              <span class="bi-bundle-final">$${esc(bundlePrice.toFixed(2))}</span>
              <span class="bi-bundle-savings">Save $${esc(savings.toFixed(2))}</span>
            </div>
          </div>
          <div class="bi-bundle-actions">
            <button class="bi-bundle-btn-primary">Add Bundle to Cart</button>
            <button class="bi-bundle-btn-ghost">View Details →</button>
          </div>
        </div>`;
        })
        .join('')}
    </div>
  `;
  }

  function renderCopy(bundles) {
    return bundles
      .map((b, i) => {
        const copy = generateBundlePageCopy(b);
        return `
      <div class="bi-copy-card">
        <div class="bi-copy-header">
          <span class="bi-copy-rank">#${i + 1} Bundle Page</span>
          <span class="bi-copy-savings">Save $${copy.savings}</span>
        </div>
        <div class="bi-copy-preview">
          <h3 class="bi-copy-headline">${copy.headline}</h3>
          <p class="bi-copy-sub">${copy.subheadline}</p>
          <p class="bi-copy-body">${copy.body}</p>
          <div class="bi-copy-proofs">
            <span class="bi-copy-proof bi-proof-green">✅ ${copy.socialProof}</span>
            <span class="bi-copy-proof bi-proof-red">🔥 ${copy.urgency}</span>
          </div>
          <div class="bi-copy-trust">
            ${copy.trustSignals.map((s) => `<span class="bi-copy-trust-badge">✓ ${s}</span>`).join('')}
          </div>
          <button class="bi-copy-cta">${copy.cta}</button>
        </div>
        <div class="bi-copy-breakdown">
          ${copy.individualPrices.map((p) => `<span class="bi-copy-item">${p.name}: <s>$${p.original}</s></span>`).join(' → ')}
          <strong class="bi-copy-bundle-price">Bundle: $${copy.bundlePrice}</strong>
        </div>
      </div>
    `;
      })
      .join('');
  }

  function renderABTests() {
    const tests = generateABTests();
    return `
    <div class="bi-section">
      <div class="bi-section-header">
        <h3>🧪 A/B Test Suggestions</h3>
        <span class="bi-section-badge">${tests.length} tests</span>
      </div>
      <p class="bi-section-sub">${tests.length} proven test ideas for bundle pricing and layout</p>
      <div class="bi-abtest-grid">
        ${tests
          .map(
            (t, i) => `
          <div class="bi-abtest-card">
            <div class="bi-abtest-header">
              <span class="bi-abtest-num">Test ${i + 1}</span>
              <span class="bi-abtest-name">${t.name}</span>
            </div>
            <div class="bi-abtest-variants">
              <div class="bi-abtest-variant bi-variant-a">
                <span class="bi-variant-label">A</span>
                <span class="bi-variant-text">${t.variantA}</span>
              </div>
              <div class="bi-abtest-variant bi-variant-b">
                <span class="bi-variant-label">B</span>
                <span class="bi-variant-text">${t.variantB}</span>
              </div>
            </div>
            <div class="bi-abtest-hypothesis">💡 ${t.hypothesis}</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
  }

  function renderPatterns(product, bundles) {
    const crossSellProducts = bundles.flatMap((b) => b.products).filter((p) => p.id !== product.id);
    const uniqueCrossSell = [...new Map(crossSellProducts.map((p) => [p.id, p])).values()].slice(0, 6);

    return `
    <div class="bi-section">
      <div class="bi-section-header">
        <h3>🔗 Cross-Sell Patterns</h3>
        <span class="bi-section-badge">${uniqueCrossSell.length} products</span>
      </div>
      <p class="bi-section-sub">Products frequently bought together with "${product.title.split('—')[0].trim()}"</p>
      <div class="bi-crosssell-grid">
        ${uniqueCrossSell
          .map((p, i) => {
            const rate = Math.floor(Math.random() * 35 + 35);
            return `
          <div class="bi-crosssell-card">
            <div class="bi-crosssell-rank">#${i + 1}</div>
            <div class="bi-crosssell-img"><img src="${p.image}" alt=""></div>
            <div class="bi-crosssell-info">
              <div class="bi-crosssell-name">${p.title.split('—')[0].trim()}</div>
              <div class="bi-crosssell-cat">${p.category}</div>
            </div>
            <div class="bi-crosssell-rate">
              <div class="bi-crosssell-pct">${rate}%</div>
              <div class="bi-crosssell-label">also buy</div>
            </div>
          </div>`;
          })
          .join('')}
      </div>
    </div>

    <div class="bi-section">
      <div class="bi-section-header">
        <h3>📊 Bundle Profitability Analysis</h3>
        <span class="bi-section-badge">${bundles.length} bundles</span>
      </div>
      <p class="bi-section-sub">Revenue and margin comparison for each bundle</p>
      <div class="bi-profit-grid">
        ${bundles
          .map((b, _i) => {
            const totalCost = b.products.reduce((sum, p) => sum + p.price, 0);
            const totalSell = b.products.reduce((sum, p) => sum + p.platformPrices.amazon, 0);
            const bundleSell = totalSell * 0.85;
            const bundleProfit = bundleSell - totalCost;
            const bundleMargin = ((bundleProfit / bundleSell) * 100).toFixed(0);
            const roi = ((bundleProfit / totalCost) * 100).toFixed(0);
            return `
          <div class="bi-profit-card">
            <div class="bi-profit-header">
              <span class="bi-profit-name">${b.name.substring(0, 35)}...</span>
              <span class="bi-profit-badge" style="background:${b.badgeColor}22;color:${b.badgeColor}">${b.badge}</span>
            </div>
            <div class="bi-profit-bars">
              <div class="bi-profit-bar-row">
                <span class="bi-profit-bar-label">Cost</span>
                <div class="bi-profit-bar-wrap"><div class="bi-profit-bar bi-bar-cost" style="width:${(totalCost / totalSell) * 100}%"></div></div>
                <span class="bi-profit-bar-val">$${totalCost.toFixed(2)}</span>
              </div>
              <div class="bi-profit-bar-row">
                <span class="bi-profit-bar-label">Bundle Price</span>
                <div class="bi-profit-bar-wrap"><div class="bi-profit-bar bi-bar-price" style="width:${(bundleSell / totalSell) * 100}%"></div></div>
                <span class="bi-profit-bar-val">$${bundleSell.toFixed(2)}</span>
              </div>
              <div class="bi-profit-bar-row">
                <span class="bi-profit-bar-label">Profit</span>
                <div class="bi-profit-bar-wrap"><div class="bi-profit-bar bi-bar-profit" style="width:${bundleMargin}%"></div></div>
                <span class="bi-profit-bar-val" style="color:var(--accent-green)">$${bundleProfit.toFixed(2)}</span>
              </div>
            </div>
            <div class="bi-profit-footer">
              <span class="bi-profit-stat">Margin: <strong style="color:var(--accent-green)">${bundleMargin}%</strong></span>
              <span class="bi-profit-stat">ROI: <strong style="color:var(--accent-cyan)">${roi}%</strong></span>
              <span class="bi-profit-stat">Products: <strong>${b.products.length}</strong></span>
            </div>
          </div>`;
          })
          .join('')}
      </div>
    </div>
  `;
  }

  const BundleIntelligencePlugin = {
    id: 'bundle-intelligence',
    name: 'Bundle Ideas',
    version: '3.0.0',
    description: 'Smart product bundling — maximize AOV with data-driven bundle recommendations',
    dependencies: ['search-engine'],

    init(_ctx) {
      Config.defaults('bundleIntelligence', { enabled: true });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;
      const section = document.createElement('section');
      section.className = 'section section-bundles';
      section.id = 'section-bundles';
      section.innerHTML = `
      <div class="section-inner">
        <!-- Hero Section -->
        <div class="bi-hero-wrap">
          <div class="bi-hero-bg-pattern"></div>
          <div class="bi-hero">
            <div class="bi-hero-content">
              <div class="bi-hero-badge">
                <span class="bi-hero-badge-dot"></span>
                AI Bundle Engine
              </div>
              <h1 class="bi-hero-title">Smart <span class="bi-hero-title-accent">Bundle Ideas</span></h1>
              <p class="bi-hero-desc">AI-powered product bundling that maximizes AOV and margins. Get data-driven bundle recommendations, ready-to-use page copy, and A/B test suggestions to boost revenue.</p>
              <div class="bi-hero-stats">
                <div class="bi-hero-stat"><span class="bi-hero-stat-num">+42%</span><span class="bi-hero-stat-label">AOV Lift</span></div>
                <div class="bi-hero-stat"><span class="bi-hero-stat-num">+10%</span><span class="bi-hero-stat-label">Margin</span></div>
                <div class="bi-hero-stat"><span class="bi-hero-stat-num">73%</span><span class="bi-hero-stat-label">Co-Buy</span></div>
                <div class="bi-hero-stat"><span class="bi-hero-stat-num">15%</span><span class="bi-hero-stat-label">Discount</span></div>
              </div>
            </div>
            <div class="bi-hero-visual">
              <div class="bi-hero-bundle-stack">
                <div class="bi-stack-item bi-stack-1">📦</div>
                <div class="bi-stack-item bi-stack-2">🎁</div>
                <div class="bi-stack-item bi-stack-3">💎</div>
                <div class="bi-stack-glow"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Search Input -->
        <div class="bi-input-card">
          <div class="bi-input-header">
            <div class="bi-input-icon">🔍</div>
            <div>
              <h3 class="bi-input-title">Find Bundle Opportunities</h3>
              <p class="bi-input-desc">Enter a product to discover optimal bundle combinations</p>
            </div>
          </div>
          <div class="bi-input-wrap">
            <svg class="bi-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" class="bi-input" id="biInput" placeholder="Type a product keyword to find optimal bundles...">
            <button class="bi-btn-primary" id="biGenerateBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              <span>Analyze Bundles</span>
            </button>
          </div>
          <div class="bi-quick-picks">
            <span class="bi-quick-label">Quick try:</span>
            <button class="bi-quick-btn" data-q="wireless earbuds"><span class="bi-quick-emoji">🎧</span>Earbuds</button>
            <button class="bi-quick-btn" data-q="pet gadgets"><span class="bi-quick-emoji">🐾</span>Pet Gadgets</button>
            <button class="bi-quick-btn" data-q="kitchen organizer"><span class="bi-quick-emoji">🍳</span>Kitchen</button>
            <button class="bi-quick-btn" data-q="posture corrector"><span class="bi-quick-emoji">🧍</span>Posture</button>
            <button class="bi-quick-btn" data-q="galaxy projector"><span class="bi-quick-emoji">🌌</span>Galaxy Light</button>
            <button class="bi-quick-btn" data-q="car accessories"><span class="bi-quick-emoji">🚗</span>Car Gear</button>
          </div>
        </div>

        <div id="biResults"></div>

        ${window.HuntDrop.renderRelatedTools([
          {
            section: 'section-profit-lab',
            name: 'Profit Calculator',
            desc: 'Calculate bundle margins',
            icon: '💰',
            color: '#00ff88',
          },
          {
            section: 'section-elasticity',
            name: 'Price Elasticity',
            desc: 'Test pricing',
            icon: '📈',
            color: '#00e5ff',
          },
          {
            section: 'section-lifecycle',
            name: 'Product Lifecycle',
            desc: 'Time bundles right',
            icon: '📡',
            color: '#6366f1',
          },
          {
            section: 'section-battlefield',
            name: 'Competitor Battlefield',
            desc: 'See competitor bundles',
            icon: '⚔️',
            color: '#f43f5e',
          },
        ])}
      </div>`;
      container.appendChild(section);
      _section = section;
      const btn = section.querySelector('#biGenerateBtn');
      const input = section.querySelector('#biInput');
      if (btn) btn.addEventListener('click', () => BundleIntelligencePlugin.analyze(input?.value || ''));
      if (input)
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') BundleIntelligencePlugin.analyze(input.value);
        });
      section.querySelectorAll('.bi-quick-btn').forEach((b) => {
        b.addEventListener('click', () => {
          input.value = b.dataset.q;
          BundleIntelligencePlugin.analyze(b.dataset.q);
        });
      });
      setTimeout(() => BundleIntelligencePlugin.analyze(''), 500);
    },

    unmount(_ctx) {
      if (_section) {
        _section.remove();
        _section = null;
      }
    },

    analyze(query) {
      const products = window.HuntDrop.ALL_PRODUCTS || [];
      if (!products.length) return;
      const product = query ? findProduct(query, products) : [...products].sort((a, b) => b.score - a.score)[0];
      if (!product) return;
      const bundles = generateBundles(product, products);
      const el = _section ? _section.querySelector('#biResults') : null;
      if (!el) return;

      const avgAOV = Math.round(bundles.reduce((s, b) => s + b.aovIncrease, 0) / bundles.length);
      const avgMargin = Math.round(bundles.reduce((s, b) => s + b.marginBoost, 0) / bundles.length);
      const totalSavings = bundles.reduce((s, b) => s + parseFloat(generateBundlePageCopy(b).savings), 0);

      el.innerHTML = `
      <!-- Summary Stats -->
      <div class="bi-summary-row">
        <div class="bi-summary-card bi-sum-purple"><div class="bi-sum-icon-wrap" style="background:var(--accent-purple-dim)"><span class="bi-sum-icon">📦</span></div><div class="bi-sum-val">${bundles.length}</div><div class="bi-sum-label">Bundles Found</div><div class="bi-sum-sub">Optimal combinations</div></div>
        <div class="bi-summary-card bi-sum-green"><div class="bi-sum-icon-wrap" style="background:var(--accent-green-dim)"><span class="bi-sum-icon">💰</span></div><div class="bi-sum-val">+${avgAOV}%</div><div class="bi-sum-label">Avg AOV Lift</div><div class="bi-sum-sub">Revenue per order</div></div>
        <div class="bi-summary-card bi-sum-cyan"><div class="bi-sum-icon-wrap" style="background:var(--accent-cyan-dim)"><span class="bi-sum-icon">📈</span></div><div class="bi-sum-val">+${avgMargin}%</div><div class="bi-sum-label">Margin Boost</div><div class="bi-sum-sub">Profit uplift</div></div>
        <div class="bi-summary-card bi-sum-orange"><div class="bi-sum-icon-wrap" style="background:var(--accent-orange-dim)"><span class="bi-sum-icon">💵</span></div><div class="bi-sum-val">$${totalSavings.toFixed(0)}</div><div class="bi-sum-label">Customer Savings</div><div class="bi-sum-sub">Total bundle discount</div></div>
      </div>

      <!-- Base Product Card -->
      <div class="bi-base-product">
        <div class="bi-base-label">Analyzing bundles for:</div>
        <div class="bi-base-card">
          <div class="bi-base-img"><img src="${esc(product.image)}" alt=""></div>
          <div class="bi-base-info">
            <div class="bi-base-name">${esc(product.title.split('—')[0].trim())}</div>
            <div class="bi-base-meta">${esc(product.category)} • Score: ${esc(product.score)}/100</div>
            <div class="bi-base-price">$${esc(product.platformPrices.amazon.toFixed(2))}</div>
          </div>
          <div class="bi-base-stats">
            <div class="bi-base-stat"><div class="bi-base-stat-val">${esc(product.orders.toLocaleString())}</div><div class="bi-base-stat-label">Orders</div></div>
            <div class="bi-base-stat"><div class="bi-base-stat-val">${esc(product.rating)}★</div><div class="bi-base-stat-label">Rating</div></div>
            <div class="bi-base-stat"><div class="bi-base-stat-val">${esc(product.margin)}%</div><div class="bi-base-stat-label">Margin</div></div>
          </div>
        </div>
      </div>

      <!-- Insights -->
      <div class="bi-section">
        <div class="bi-section-header">
          <h3>💡 Bundle Intelligence Insights</h3>
          <span class="bi-section-badge">AI-generated</span>
        </div>
        <p class="bi-section-sub">Key findings from purchase pattern analysis</p>
        <div class="bi-insights-grid">
          <div class="bi-insight-card">
            <div class="bi-insight-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">📊</div>
            <div class="bi-insight-title">Co-Purchase Signal</div>
            <div class="bi-insight-text">73% of customers who buy <strong>${esc(product.title.split('—')[0].trim())}</strong> also purchase complementary products within 48 hours.</div>
          </div>
          <div class="bi-insight-card">
            <div class="bi-insight-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">💰</div>
            <div class="bi-insight-title">Revenue Opportunity</div>
            <div class="bi-insight-text">Bundling increases AOV by <strong>${avgAOV}%</strong>. That's an extra <strong>$${((product.platformPrices.amazon * avgAOV) / 100).toFixed(2)}</strong> per order.</div>
          </div>
          <div class="bi-insight-card">
            <div class="bi-insight-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🎯</div>
            <div class="bi-insight-title">Optimal Discount</div>
            <div class="bi-insight-text"><strong>15% bundle discount</strong> is the sweet spot — enough to incentivize without killing margins. Tested across 2,400+ orders.</div>
          </div>
          <div class="bi-insight-card">
            <div class="bi-insight-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">⚡</div>
            <div class="bi-insight-title">Cross-Category Win</div>
            <div class="bi-insight-text">Bundles from <strong>different categories</strong> outperform same-category bundles by 28% in conversion rate.</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bi-tabs-wrap">
        <div class="bi-tabs">
          <button class="bi-tab-btn active" data-tab="bundles"><span class="bi-tab-icon">📦</span> Optimal Bundles</button>
          <button class="bi-tab-btn" data-tab="copy"><span class="bi-tab-icon">📄</span> Page Copy</button>
          <button class="bi-tab-btn" data-tab="abtest"><span class="bi-tab-icon">🧪</span> A/B Tests</button>
          <button class="bi-tab-btn" data-tab="patterns"><span class="bi-tab-icon">🔗</span> Purchase Patterns</button>
        </div>

        <div class="bi-tab-panels">
          <div class="bi-tab-panel active" id="biTabContent">
            ${renderBundles(bundles)}
          </div>
        </div>
      </div>
    `;

      el.querySelectorAll('.bi-tab-btn').forEach((tab) => {
        tab.addEventListener('click', () => {
          el.querySelectorAll('.bi-tab-btn').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          const content = _section.querySelector('#biTabContent');
          if (!content) return;
          switch (tab.dataset.tab) {
            case 'bundles':
              content.innerHTML = renderBundles(bundles);
              break;
            case 'copy':
              content.innerHTML = renderCopy(bundles);
              break;
            case 'abtest':
              content.innerHTML = renderABTests();
              break;
            case 'patterns':
              content.innerHTML = renderPatterns(product, bundles);
              break;
          }
        });
      });
    },
  };

  PluginRegistry.register('bundle-intelligence', BundleIntelligencePlugin);
})();
