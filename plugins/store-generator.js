// ============================================================================
// PLUGIN: One-Click Store Generator — PRO v4.0
// ============================================================================
(function () {
  const { PluginRegistry, UI, Config } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(s);

  let _section = null;
  const _state = { platform: 'shopify', theme: 'minimal', brand: null };

  const BrandPrefixes = [
    'Nova',
    'Apex',
    'Vibe',
    'Pulse',
    'Glow',
    'Zen',
    'Flux',
    'Luxe',
    'Peak',
    'Aura',
    'Orbit',
    'Drift',
    'Spark',
    'Ember',
    'Tidal',
    'Lunar',
    'Ionic',
    'Velo',
    'Onyx',
    'Echo',
  ];
  const BrandSuffixes = [
    'Lab',
    'Co',
    'Store',
    'Hub',
    'Box',
    'Drop',
    'Mart',
    'Shop',
    'Direct',
    'World',
    'Zone',
    'Gear',
    'Tech',
    'Craft',
    'Studio',
    'Works',
    'Den',
    'Vault',
    'Nest',
    'Core',
  ];
  const ColorPalettes = [
    { primary: '#6366f1', accent: '#818cf8', bg: '#0f0f23', name: 'Indigo Night', text: '#f0f0f8' },
    { primary: '#f43f5e', accent: '#fb7185', bg: '#1a0a12', name: 'Rose Ember', text: '#f8f0f2' },
    { primary: '#14b8a6', accent: '#2dd4bf', bg: '#0a1a17', name: 'Teal Zen', text: '#e8f8f5' },
    { primary: '#f59e0b', accent: '#fbbf24', bg: '#1a1408', name: 'Amber Glow', text: '#f8f2e8' },
    { primary: '#8b5cf6', accent: '#a78bfa', bg: '#130d1f', name: 'Violet Dream', text: '#f0eaf8' },
    { primary: '#06b6d4', accent: '#22d3ee', bg: '#0a1619', name: 'Cyan Frost', text: '#e8f4f8' },
    { primary: '#ec4899', accent: '#f472b6', bg: '#1a0d16', name: 'Pink Pulse', text: '#f8eaf0' },
    { primary: '#10b981', accent: '#34d399', bg: '#0a1a13', name: 'Emerald Fresh', text: '#eaf8f0' },
  ];

  const Platforms = [
    { id: 'shopify', name: 'Shopify', icon: '🟢', color: '#96bf48' },
    { id: 'woocommerce', name: 'WooCommerce', icon: '🟣', color: '#7b5ea7' },
    { id: 'bigcommerce', name: 'BigCommerce', icon: '🔵', color: '#34313f' },
    { id: 'wix', name: 'Wix', icon: '⚫', color: '#0c6efc' },
  ];

  const ThemeTemplates = [
    { id: 'minimal', name: 'Minimal Clean', desc: 'Ultra-clean layout with focus on product imagery', icon: '◻️' },
    { id: 'bold', name: 'Bold Commerce', desc: 'High-impact hero sections with strong typography', icon: '🔶' },
    { id: 'luxury', name: 'Luxury Prestige', desc: 'Elegant dark theme with gold accents', icon: '👑' },
    { id: 'playful', name: 'Playful Pop', desc: 'Colorful, energetic design for younger audiences', icon: '🎨' },
  ];

  function generateBrand(product) {
    const prefix = BrandPrefixes[Math.floor(Math.random() * BrandPrefixes.length)];
    const suffix = BrandSuffixes[Math.floor(Math.random() * BrandSuffixes.length)];
    const palette = ColorPalettes[Math.floor(Math.random() * ColorPalettes.length)];
    const taglines = [
      `Premium ${product.category || 'lifestyle'} essentials`,
      `Elevate your everyday`,
      `Quality that speaks for itself`,
      `Designed for modern living`,
      `Where style meets function`,
      `Curated for you`,
    ];
    return {
      name: prefix + ' ' + suffix,
      tagline: taglines[Math.floor(Math.random() * taglines.length)],
      palette,
      domain: (prefix + suffix).toLowerCase() + '.myshopify.com',
    };
  }

  function generateProductPage(product, _brand) {
    return {
      headline: `Introducing the ${product.title.split('—')[0].trim()}`,
      subheadline: `The #1 rated ${product.keywords[0] || 'product'} trusted by ${product.orders}+ customers`,
      features: [],
      reviews: [],
      sellingPoints: product.keywords.slice(0, 4),
    };
  }

  function generateLegalPages(brand) {
    const bName = brand.name.toLowerCase().replace(/\s/g, '');
    return {
      privacy: {
        title: 'Privacy Policy',
        content: `${brand.name} ("us", "we", or "our") operates the ${brand.domain} website.\n\nInformation We Collect:\nWe collect information you provide directly: name, email, shipping address, and payment information.\n\nHow We Use Your Information:\n• To process and fulfill your orders\n• To send order confirmations and updates\n• To respond to your customer service requests\n• To send promotional communications (with your consent)\n\nData Security:\nWe implement industry-standard SSL encryption and security measures to protect your personal information.\n\nContact Us:\nFor privacy-related inquiries, contact us at privacy@${bName}.com`,
      },
      terms: {
        title: 'Terms of Service',
        content: `Welcome to ${brand.name}. By accessing our website, you agree to these terms.\n\nProducts:\nAll product descriptions, images, and specifications are subject to change without notice.\n\nPricing:\nAll prices are in USD. We reserve the right to modify prices at any time.\n\nOrders:\nWe reserve the right to refuse or cancel any order for any reason.\n\nIntellectual Property:\nAll content on this site is the property of ${brand.name} and protected by copyright laws.\n\nLimitation of Liability:\n${brand.name} shall not be liable for any indirect, incidental, or consequential damages.`,
      },
      returns: {
        title: 'Return & Refund Policy',
        content: `30-Day Money-Back Guarantee\n\nWe want you to be completely satisfied with your purchase. If you're not happy, we'll make it right.\n\nEligibility:\n• Returns accepted within 30 days of delivery\n• Item must be unused and in original packaging\n• Proof of purchase required\n\nProcess:\n1. Contact our support team at support@${bName}.com\n2. Receive a return authorization number\n3. Ship the item back to us\n4. Refund processed within 5-7 business days\n\nReturn Shipping:\nReturn shipping costs are the responsibility of the customer unless the item is defective.`,
      },
    };
  }

  function generateShippingRules() {
    return [
      { zone: 'United States', method: 'Standard Shipping', time: '7-12 business days', cost: 'FREE', icon: '🇺🇸' },
      { zone: 'Canada', method: 'Standard Shipping', time: '10-15 business days', cost: 'FREE', icon: '🇨🇦' },
      {
        zone: 'United Kingdom',
        method: 'International Standard',
        time: '10-18 business days',
        cost: 'FREE',
        icon: '🇬🇧',
      },
      { zone: 'Europe (EU)', method: 'International Standard', time: '12-20 business days', cost: 'FREE', icon: '🇪🇺' },
      {
        zone: 'Australia / NZ',
        method: 'International Standard',
        time: '12-18 business days',
        cost: 'FREE',
        icon: '🇦🇺',
      },
      {
        zone: 'Rest of World',
        method: 'International Economy',
        time: '15-25 business days',
        cost: '$4.99',
        icon: '🌍',
      },
    ];
  }

  function generateSEO(product, brand) {
    return {
      title: `${product.title.split('—')[0].trim()} | ${brand.name}`,
      description: `Shop the ${product.title.split('—')[0].trim()} at ${brand.name}. Free shipping, 30-day returns, and premium quality guaranteed.`,
      keywords: product.keywords.slice(0, 8).join(', '),
      ogTitle: brand.name + ' — ' + product.keywords[0],
      ogDesc: `Discover the best ${product.keywords[0] || 'product'}. ${brand.tagline}`,
      slug: product.title
        .split('—')[0]
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    };
  }

  function generatePricing(product, _brand) {
    const base = product.platformPrices.amazon;
    const retail = (base * 2.2).toFixed(2);
    const cost = base.toFixed(2);
    const profit = (retail - cost).toFixed(2);
    const margin = ((profit / retail) * 100).toFixed(0);
    return { retail, cost, profit, margin, compareAtPrice: (base * 2.8).toFixed(2), currency: 'USD' };
  }

  function generateSocialProof(_product) {
    return {
      testimonials: [
        {
          name: 'Alex R.',
          role: 'Verified Buyer',
          text: 'This product changed my daily routine. Highly recommend!',
          avatar: 'A',
          color: '#6366f1',
        },
        {
          name: 'Jordan P.',
          role: 'Repeat Customer',
          text: 'Ordered twice already. Quality is consistently amazing.',
          avatar: 'J',
          color: '#10b981',
        },
        {
          name: 'Sam W.',
          role: 'First Purchase',
          text: 'Skeptical at first but blown away by the quality. 10/10.',
          avatar: 'S',
          color: '#f59e0b',
        },
        {
          name: 'Casey L.',
          role: 'Gift Buyer',
          text: 'Bought as a gift and now I need one for myself!',
          avatar: 'C',
          color: '#ec4899',
        },
      ],
      stats: [
        { label: 'Happy Customers', value: '10,000+', icon: '😊' },
        { label: '5-Star Reviews', value: '2,400+', icon: '⭐' },
        { label: 'Orders Shipped', value: '25,000+', icon: '📦' },
        { label: 'Countries Served', value: '80+', icon: '🌍' },
      ],
    };
  }

  function generatePaymentMethods() {
    return [
      { name: 'Credit Card', icon: '💳', desc: 'Visa, Mastercard, Amex' },
      { name: 'PayPal', icon: '🅿️', desc: 'Fast & secure checkout' },
      { name: 'Apple Pay', icon: '🍎', desc: 'One-tap checkout' },
      { name: 'Google Pay', icon: '🔵', desc: 'Quick payment' },
      { name: 'Shop Pay', icon: '🟩', desc: 'Accelerated checkout' },
      { name: 'Klarna', icon: '🩷', desc: 'Buy now, pay later' },
    ];
  }

  function generatePages() {
    return [
      { name: 'Home', icon: '🏠', desc: 'Main landing page with hero banner', status: 'ready' },
      { name: 'Product Page', icon: '📄', desc: 'Individual product detail page', status: 'ready' },
      { name: 'Collection', icon: '📁', desc: 'Product category/collection page', status: 'ready' },
      { name: 'About Us', icon: 'ℹ️', desc: 'Brand story and mission page', status: 'ready' },
      { name: 'Contact', icon: '📧', desc: 'Contact form and support info', status: 'ready' },
      { name: 'FAQ', icon: '❓', desc: 'Frequently asked questions', status: 'ready' },
      { name: 'Blog', icon: '📝', desc: 'Content marketing hub', status: 'ready' },
      { name: 'Cart', icon: '🛒', desc: 'Shopping cart page', status: 'ready' },
    ];
  }

  function goToStep(n) {
    if (!_section) return;
    _section.querySelectorAll('.osg-step').forEach((s) => {
      const sn = parseInt(s.dataset.step);
      s.classList.remove('osg-step-active', 'osg-step-done');
      if (sn < n) s.classList.add('osg-step-done');
      if (sn === n) s.classList.add('osg-step-active');
    });
    for (let i = 1; i <= 3; i++) {
      const panel = _section.querySelector('#osgStep' + i);
      if (panel) {
        if (i === n) {
          panel.classList.remove('osg-panel-hidden');
          panel.classList.add('osg-panel-visible');
        } else {
          panel.classList.add('osg-panel-hidden');
          panel.classList.remove('osg-panel-visible');
        }
      }
    }
  }

  function switchTab(tab) {
    if (!_section) return;
    _section.querySelectorAll('.osg-tab-btn').forEach((b) => b.classList.remove('active'));
    _section.querySelectorAll('.osg-tab-panel').forEach((p) => p.classList.remove('active'));
    const tabEl = _section.querySelector('#osgTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (tabEl) tabEl.classList.add('active');
    const panelEl = _section.querySelector('#osgPanel' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (panelEl) panelEl.classList.add('active');
  }

  function generate(query) {
    if (!query.trim()) return;
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    const product =
      products.find(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase()))
      ) || products.sort((a, b) => b.score - a.score)[0];
    if (!product) return;

    const brand = generateBrand(product);
    const page = generateProductPage(product, brand);
    const legal = generateLegalPages(brand);
    const shipping = generateShippingRules();
    const seo = generateSEO(product, brand);
    const pricing = generatePricing(product, brand);
    const social = generateSocialProof(product);
    const payments = generatePaymentMethods();
    const pages = generatePages();
    const el = _section ? _section.querySelector('#sgResults') : null;
    if (!el) return;

    _section.querySelectorAll('.osg-step').forEach((s) => s.classList.add('osg-step-done'));
    _section.querySelectorAll('.osg-panel').forEach((p) => {
      p.classList.add('osg-panel-hidden');
      p.classList.remove('osg-panel-visible');
    });

    el.innerHTML = `
      <div class="osg-output">

        <!-- Success Banner -->
        <div class="osg-success-banner">
          <div class="osg-success-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="osg-success-content">
            <h3>Store Generated Successfully!</h3>
            <p>Your <strong>${esc(brand.name)}</strong> store is ready with ${pages.length} pages, ${payments.length} payment methods, and full SEO optimization.</p>
          </div>
          <div class="osg-success-actions">
            <button class="osg-btn-primary" onclick="window.open('https://${esc(brand.domain)}','_blank')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>Preview Store</span>
            </button>
            <button class="osg-btn-ghost" id="osgCopyConfig">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy Config</span>
            </button>
          </div>
        </div>

        <!-- Store Summary Stats -->
        <div class="osg-summary-row">
          <div class="osg-summary-card osg-sum-purple"><div class="osg-sum-icon-wrap" style="background:var(--accent-purple-dim)"><span class="osg-sum-icon">🎨</span></div><div class="osg-sum-val">${brand.palette.name}</div><div class="osg-sum-label">Color Theme</div></div>
          <div class="osg-summary-card osg-sum-green"><div class="osg-sum-icon-wrap" style="background:var(--accent-green-dim)"><span class="osg-sum-icon">💰</span></div><div class="osg-sum-val">$${pricing.retail}</div><div class="osg-sum-label">Retail Price</div></div>
          <div class="osg-summary-card osg-sum-cyan"><div class="osg-sum-icon-wrap" style="background:var(--accent-cyan-dim)"><span class="osg-sum-icon">📈</span></div><div class="osg-sum-val">${pricing.margin}%</div><div class="osg-sum-label">Profit Margin</div></div>
          <div class="osg-summary-card osg-sum-orange"><div class="osg-sum-icon-wrap" style="background:var(--accent-orange-dim)"><span class="osg-sum-icon">📦</span></div><div class="osg-sum-val">${product.orders.toLocaleString()}</div><div class="osg-sum-label">Units Sold</div></div>
        </div>

        <!-- Live Store Preview with Toggle -->
        <div class="osg-section">
          <div class="osg-section-header">
            <h3>🖥️ Live Store Preview</h3>
            <div class="osg-device-toggle">
              <button class="osg-device-btn osg-device-active" data-device="desktop">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                Desktop
              </button>
              <button class="osg-device-btn" data-device="mobile">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                Mobile
              </button>
            </div>
          </div>
          <div class="osg-store-preview-frame" id="osgPreviewFrame">
            <div class="osg-store-preview" style="background:${brand.palette.bg};color:${brand.palette.text}">
              <div class="osg-store-topbar">
                <div class="osg-store-logo" style="color:${brand.palette.primary}">${esc(brand.name.split(' ')[0])}<span style="color:${brand.palette.accent}">${esc(brand.name.split(' ')[1] || '')}</span></div>
                <div class="osg-store-nav"><span>Shop</span><span>About</span><span>Contact</span><span class="osg-store-cart">🛒 (0)</span></div>
              </div>
              <div class="osg-store-hero">
                <div class="osg-store-hero-content">
                  <div class="osg-store-badge" style="background:${brand.palette.primary}22;color:${brand.palette.primary}">✨ NEW ARRIVAL</div>
                  <h1 style="color:${brand.palette.primary}">${page.headline}</h1>
                  <p>${page.subheadline}</p>
                  <div class="osg-store-price">
                    <span class="osg-price-now">$${pricing.retail}</span>
                    <span class="osg-price-old">$${pricing.compareAtPrice}</span>
                    <span class="osg-discount" style="background:${brand.palette.primary}">SAVE 45%</span>
                  </div>
                  <button class="osg-store-cta" style="background:${brand.palette.primary}">Add to Cart — Free Shipping</button>
                  <div class="osg-store-trust-strip">
                    ${['🔒 Secure', '🚚 Free Ship', '💯 Guarantee', '⭐ ${product.rating}★'].map((t) => '<span>' + t + '</span>').join('')}
                  </div>
                </div>
                <div class="osg-store-hero-img"><img src="${product.image}" alt=""></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Brand Identity Card -->
        <div class="osg-section">
          <div class="osg-section-header">
            <h3>🎨 Brand Identity</h3>
            <span class="osg-section-badge">Auto-Generated</span>
          </div>
          <div class="osg-brand-grid">
            <div class="osg-brand-item"><div class="osg-brand-label">Brand Name</div><div class="osg-brand-val" style="color:${brand.palette.primary}">${esc(brand.name)}</div></div>
            <div class="osg-brand-item"><div class="osg-brand-label">Tagline</div><div class="osg-brand-val">"${esc(brand.tagline)}"</div></div>
            <div class="osg-brand-item"><div class="osg-brand-label">Domain</div><div class="osg-brand-val" style="color:var(--accent-cyan)">${esc(brand.domain)}</div></div>
            <div class="osg-brand-item"><div class="osg-brand-label">Theme</div><div class="osg-brand-val">${brand.palette.name}</div></div>
            <div class="osg-brand-item osg-brand-colors">
              <div class="osg-brand-label">Color Palette</div>
              <div class="osg-color-dots">
                <div class="osg-color-swatch"><div class="osg-color-dot" style="background:${brand.palette.primary}"></div><span>${brand.palette.primary}</span></div>
                <div class="osg-color-swatch"><div class="osg-color-dot" style="background:${brand.palette.accent}"></div><span>${brand.palette.accent}</span></div>
                <div class="osg-color-swatch"><div class="osg-color-dot" style="background:${brand.palette.bg};border:1px solid var(--border-subtle)"></div><span>${brand.palette.bg}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pricing Breakdown -->
        <div class="osg-section osg-pricing-section">
          <div class="osg-section-header">
            <h3>💰 Pricing Breakdown</h3>
            <span class="osg-section-badge osg-badge-green">+$${pricing.profit}/order</span>
          </div>
          <div class="osg-pricing-grid">
            <div class="osg-price-box"><div class="osg-price-box-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🏷️</div><div class="osg-price-box-label">Retail Price</div><div class="osg-price-box-val">$${pricing.retail}</div><div class="osg-price-box-sub">Customer pays</div></div>
            <div class="osg-price-box"><div class="osg-price-box-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">📦</div><div class="osg-price-box-label">Product Cost</div><div class="osg-price-box-val">$${pricing.cost}</div><div class="osg-price-box-sub">Supplier price</div></div>
            <div class="osg-price-box osg-price-box-highlight"><div class="osg-price-box-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">💰</div><div class="osg-price-box-label">Your Profit</div><div class="osg-price-box-val" style="color:var(--accent-green)">$${pricing.profit}</div><div class="osg-price-box-sub">Per order</div></div>
            <div class="osg-price-box"><div class="osg-price-box-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">📊</div><div class="osg-price-box-label">Profit Margin</div><div class="osg-price-box-val" style="color:var(--accent-cyan)">${pricing.margin}%</div><div class="osg-price-box-sub">After cost</div></div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="osg-tabs-wrap">
          <div class="osg-tabs">
            <button class="osg-tab-btn active" id="osgTabProduct"><span class="osg-tab-icon">📄</span> Product Page</button>
            <button class="osg-tab-btn" id="osgTabShipping"><span class="osg-tab-icon">🚚</span> Shipping</button>
            <button class="osg-tab-btn" id="osgTabLegal"><span class="osg-tab-icon">⚖️</span> Legal</button>
            <button class="osg-tab-btn" id="osgTabEmail"><span class="osg-tab-icon">📧</span> Email Popup</button>
            <button class="osg-tab-btn" id="osgTabSeo"><span class="osg-tab-icon">🔍</span> SEO</button>
            <button class="osg-tab-btn" id="osgTabPayments"><span class="osg-tab-icon">💳</span> Payments</button>
            <button class="osg-tab-btn" id="osgTabPages"><span class="osg-tab-icon">📑</span> Pages</button>
          </div>

          <div class="osg-tab-panels">
            <!-- Product Page Tab -->
            <div class="osg-tab-panel active" id="osgPanelProduct">
              <div class="osg-section">
                <div class="osg-section-header"><h3>✨ Product Features</h3></div>
                <div class="osg-features-grid">
                  ${page.features.map((f) => `<div class="osg-feature-card"><div class="osg-feature-icon">${f.icon}</div><div class="osg-feature-title">${f.title}</div><div class="osg-feature-desc">${f.desc}</div></div>`).join('')}
                </div>
              </div>
              <div class="osg-section">
                <div class="osg-section-header"><h3>🎯 Selling Points</h3></div>
                <div class="osg-selling-points">
                  ${page.sellingPoints.map((sp) => `<div class="osg-sp"><span class="osg-sp-check" style="background:${brand.palette.primary}">✓</span><span>${sp}</span></div>`).join('')}
                </div>
              </div>
              <div class="osg-section">
                <div class="osg-section-header"><h3>⭐ Customer Reviews</h3><span class="osg-section-badge">${page.reviews.length} templates</span></div>
                <div class="osg-reviews-grid">
                  ${page.reviews.map((r) => `<div class="osg-review"><div class="osg-review-head"><div class="osg-review-avatar" style="background:${brand.palette.primary}22;color:${brand.palette.primary}">${r.name.charAt(0)}</div><div class="osg-review-meta"><div class="osg-review-name">${r.name}</div><div class="osg-review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div></div>${r.verified ? '<span class="osg-verified">✓ Verified</span>' : ''}</div><div class="osg-review-text">${r.text}</div><div class="osg-review-date">${r.date}</div></div>`).join('')}
                </div>
              </div>
              <div class="osg-section">
                <div class="osg-section-header"><h3>🛡️ Trust Badges</h3></div>
                <div class="osg-trust-row">
                  <div class="osg-trust-item"><div class="osg-trust-icon">🔒</div><div class="osg-trust-label">Secure Checkout</div></div>
                  <div class="osg-trust-item"><div class="osg-trust-icon">🚚</div><div class="osg-trust-label">Free Shipping</div></div>
                  <div class="osg-trust-item"><div class="osg-trust-icon">💯</div><div class="osg-trust-label">Money-Back</div></div>
                  <div class="osg-trust-item"><div class="osg-trust-icon">⭐</div><div class="osg-trust-label">${product.rating}★ Rated</div></div>
                </div>
              </div>
            </div>

            <!-- Shipping Tab -->
            <div class="osg-tab-panel" id="osgPanelShipping">
              <div class="osg-section">
                <div class="osg-section-header"><h3>🚚 Shipping Rules</h3><span class="osg-section-badge">${shipping.length} zones</span></div>
                <p class="osg-section-sub">Based on supplier: ${product.suppliers?.[0]?.name || 'N/A'} (${product.suppliers?.[0]?.location || 'Global'})</p>
                <div class="osg-ship-table">
                  <div class="osg-ship-head"><span>Zone</span><span>Method</span><span>Delivery</span><span>Cost</span></div>
                  ${shipping.map((s) => `<div class="osg-ship-row"><span class="osg-ship-zone">${s.icon} ${s.zone}</span><span>${s.method}</span><span>${s.time}</span><span class="osg-ship-cost" style="color:${s.cost === 'FREE' ? 'var(--accent-green)' : 'var(--text-primary)'}">${s.cost}</span></div>`).join('')}
                </div>
              </div>
              <div class="osg-section">
                <div class="osg-section-header"><h3>📋 Shipping Policy</h3></div>
                <div class="osg-ship-policy">
                  <div class="osg-ship-policy-item"><span class="osg-ship-policy-icon">✅</span><span>All orders include tracking numbers sent via email</span></div>
                  <div class="osg-ship-policy-item"><span class="osg-ship-policy-icon">✅</span><span>Orders processed within 1-2 business days</span></div>
                  <div class="osg-ship-policy-item"><span class="osg-ship-policy-icon">✅</span><span>Insurance available at checkout for $2.99</span></div>
                  <div class="osg-ship-policy-item"><span class="osg-ship-policy-icon">✅</span><span>Bulk orders (5+) qualify for express upgrade</span></div>
                </div>
              </div>
            </div>

            <!-- Legal Tab -->
            <div class="osg-tab-panel" id="osgPanelLegal">
              <div class="osg-section">
                <div class="osg-section-header"><h3>⚖️ Legal Pages</h3><span class="osg-section-badge">Auto-generated</span></div>
                <div class="osg-legal-tabs">
                  <button class="osg-legal-tab active" data-legal="privacy">Privacy Policy</button>
                  <button class="osg-legal-tab" data-legal="terms">Terms of Service</button>
                  <button class="osg-legal-tab" data-legal="returns">Return Policy</button>
                </div>
                <div class="osg-legal-content active" id="osgLegalPrivacy"><h4>${legal.privacy.title}</h4><pre>${legal.privacy.content}</pre></div>
                <div class="osg-legal-content" id="osgLegalTerms"><h4>${legal.terms.title}</h4><pre>${legal.terms.content}</pre></div>
                <div class="osg-legal-content" id="osgLegalReturns"><h4>${legal.returns.title}</h4><pre>${legal.returns.content}</pre></div>
              </div>
            </div>

            <!-- Email Popup Tab -->
            <div class="osg-tab-panel" id="osgPanelEmail">
              <div class="osg-section">
                <div class="osg-section-header"><h3>📧 Email Capture Popup</h3><span class="osg-section-badge osg-badge-green">8-12% capture rate</span></div>
                <div class="osg-email-layout">
                  <div class="osg-email-preview">
                    <div class="osg-email-popup" style="border-color:${brand.palette.primary}">
                      <div class="osg-email-popup-icon" style="background:${brand.palette.primary}22;color:${brand.palette.primary}">🎁</div>
                      <h4 style="color:${brand.palette.primary}">Get 15% OFF Your First Order</h4>
                      <p>Join 10,000+ happy customers. Enter your email for exclusive deals and early access.</p>
                      <div class="osg-email-form">
                        <input type="email" placeholder="Enter your email address" readonly>
                        <button style="background:${brand.palette.primary}">GET 15% OFF</button>
                      </div>
                      <div class="osg-email-disclaimer">No spam. Unsubscribe anytime.</div>
                    </div>
                  </div>
                  <div class="osg-settings-card">
                    <h4>⚙️ Popup Configuration</h4>
                    <div class="osg-setting"><span>Trigger:</span><span>After 5 seconds on page</span></div>
                    <div class="osg-setting"><span>Frequency:</span><span>Once per visitor (30 day cookie)</span></div>
                    <div class="osg-setting"><span>Exit Intent:</span><span style="color:var(--accent-green)">Enabled</span></div>
                    <div class="osg-setting"><span>Mobile Variant:</span><span style="color:var(--accent-green)">Bottom slide-up</span></div>
                    <div class="osg-setting"><span>Discount Code:</span><span style="color:var(--accent-cyan)">WELCOME15</span></div>
                    <div class="osg-setting"><span>Expected Capture:</span><span style="color:var(--accent-green)">8-12%</span></div>
                    <div class="osg-setting"><span>Est. Leads/Month:</span><span style="color:var(--accent-purple)">240-360</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SEO Tab -->
            <div class="osg-tab-panel" id="osgPanelSeo">
              <div class="osg-section">
                <div class="osg-section-header"><h3>🔍 SEO Optimization</h3><span class="osg-section-badge osg-badge-green">Score: A+</span></div>
                <div class="osg-seo-overview">
                  <div class="osg-seo-score-ring">
                    <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-primary)" stroke-width="6"/><circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent-green)" stroke-width="6" stroke-linecap="round" stroke-dasharray="232 264" transform="rotate(-90 50 50)"/></svg>
                    <div class="osg-seo-score-num">92</div>
                  </div>
                  <div class="osg-seo-score-details">
                    <div class="osg-seo-score-item"><span>Meta Tags</span><span class="osg-seo-pass">✓ Optimal</span></div>
                    <div class="osg-seo-score-item"><span>Schema Markup</span><span class="osg-seo-pass">✓ Product + FAQ</span></div>
                    <div class="osg-seo-score-item"><span>Sitemap</span><span class="osg-seo-pass">✓ Auto-generated</span></div>
                    <div class="osg-seo-score-item"><span>Open Graph</span><span class="osg-seo-pass">✓ Complete</span></div>
                    <div class="osg-seo-score-item"><span>Page Speed</span><span class="osg-seo-pass">✓ Optimized</span></div>
                  </div>
                </div>
                <div class="osg-seo-card">
                  <div class="osg-seo-row"><span class="osg-seo-label">Page Title</span><span class="osg-seo-val">${seo.title}</span></div>
                  <div class="osg-seo-row"><span class="osg-seo-label">Meta Description</span><span class="osg-seo-val">${seo.description}</span></div>
                  <div class="osg-seo-row"><span class="osg-seo-label">URL Slug</span><span class="osg-seo-val" style="color:var(--accent-cyan)">/${seo.slug}</span></div>
                  <div class="osg-seo-row"><span class="osg-seo-label">Keywords</span><span class="osg-seo-val">${seo.keywords}</span></div>
                  <div class="osg-seo-row"><span class="osg-seo-label">OG Title</span><span class="osg-seo-val">${seo.ogTitle}</span></div>
                  <div class="osg-seo-row"><span class="osg-seo-label">OG Description</span><span class="osg-seo-val">${seo.ogDesc}</span></div>
                </div>
              </div>
            </div>

            <!-- Payments Tab -->
            <div class="osg-tab-panel" id="osgPanelPayments">
              <div class="osg-section">
                <div class="osg-section-header"><h3>💳 Payment Methods</h3><span class="osg-section-badge">${payments.length} providers</span></div>
                <p class="osg-section-sub">Pre-configured and ready to accept payments from day one</p>
                <div class="osg-payments-grid">
                  ${payments.map((pm) => `<div class="osg-payment-card"><div class="osg-payment-icon">${pm.icon}</div><div class="osg-payment-name">${pm.name}</div><div class="osg-payment-desc">${pm.desc}</div><div class="osg-payment-status"><span class="osg-payment-dot"></span>Ready</div></div>`).join('')}
                </div>
              </div>
              <div class="osg-section">
                <div class="osg-section-header"><h3>🔒 Security Features</h3></div>
                <div class="osg-security-grid">
                  <div class="osg-security-item"><span class="osg-security-icon">🔐</span><div><div class="osg-security-title">SSL Certificate</div><div class="osg-security-desc">256-bit encryption on all pages</div></div></div>
                  <div class="osg-security-item"><span class="osg-security-icon">🛡️</span><div><div class="osg-security-title">PCI Compliance</div><div class="osg-security-desc">Level 1 PCI DSS certified</div></div></div>
                  <div class="osg-security-item"><span class="osg-security-icon">🚫</span><div><div class="osg-security-title">Fraud Protection</div><div class="osg-security-desc">AI-powered fraud detection</div></div></div>
                  <div class="osg-security-item"><span class="osg-security-icon">📋</span><div><div class="osg-security-title">GDPR Compliant</div><div class="osg-security-desc">Auto cookie consent banner</div></div></div>
                </div>
              </div>
            </div>

            <!-- Pages Tab -->
            <div class="osg-tab-panel" id="osgPanelPages">
              <div class="osg-section">
                <div class="osg-section-header"><h3>📑 Store Pages</h3><span class="osg-section-badge">${pages.length} pages</span></div>
                <p class="osg-section-sub">All pages auto-generated with your brand styling, copy, and SEO</p>
                <div class="osg-pages-grid">
                  ${pages.map((pg) => `<div class="osg-page-card"><div class="osg-page-icon">${pg.icon}</div><div class="osg-page-info"><div class="osg-page-name">${pg.name}</div><div class="osg-page-desc">${pg.desc}</div></div><div class="osg-page-status"><span class="osg-page-dot"></span>${pg.status}</div></div>`).join('')}
                </div>
              </div>
              <div class="osg-section">
                <div class="osg-section-header"><h3>🔌 Recommended Apps</h3></div>
                <div class="osg-apps-grid">
                  <div class="osg-app-card"><div class="osg-app-icon">📊</div><div class="osg-app-info"><div class="osg-app-name">Google Analytics</div><div class="osg-app-desc">Track visitors and conversions</div></div><div class="osg-app-status osg-app-free">Free</div></div>
                  <div class="osg-app-card"><div class="osg-app-icon">📧</div><div class="osg-app-info"><div class="osg-app-name">Klaviyo Email</div><div class="osg-app-desc">Email marketing automation</div></div><div class="osg-app-status osg-app-free">Free Tier</div></div>
                  <div class="osg-app-card"><div class="osg-app-icon">💬</div><div class="osg-app-info"><div class="osg-app-name">Tidio Chat</div><div class="osg-app-desc">Live chat & chatbot</div></div><div class="osg-app-status osg-app-free">Free</div></div>
                  <div class="osg-app-card"><div class="osg-app-icon">⭐</div><div class="osg-app-info"><div class="osg-app-name">Judge.me Reviews</div><div class="osg-app-desc">Product review system</div></div><div class="osg-app-status osg-app-free">Free</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Social Proof Section -->
        <div class="osg-section">
          <div class="osg-section-header"><h3>💬 Social Proof Templates</h3><span class="osg-section-badge">${social.testimonials.length} testimonials</span></div>
          <div class="osg-social-grid">
            ${social.testimonials.map((t) => `<div class="osg-social-card"><div class="osg-social-head"><div class="osg-social-avatar" style="background:${t.color}22;color:${t.color}">${t.avatar}</div><div><div class="osg-social-name">${t.name}</div><div class="osg-social-role">${t.role}</div></div></div><div class="osg-social-text">"${t.text}"</div></div>`).join('')}
          </div>
          <div class="osg-social-stats">
            ${social.stats.map((s) => `<div class="osg-social-stat"><div class="osg-social-stat-icon">${s.icon}</div><div class="osg-social-stat-val">${s.value}</div><div class="osg-social-stat-label">${s.label}</div></div>`).join('')}
          </div>
        </div>

        <!-- Store Footer Preview -->
        <div class="osg-store-footer" style="background:${brand.palette.bg}">
          <div class="osg-footer-brand" style="color:${brand.palette.primary}">${esc(brand.name)}</div>
          <div class="osg-footer-tagline">${esc(brand.tagline)}</div>
          <div class="osg-footer-links"><span>Privacy Policy</span><span>Terms</span><span>Contact</span><span>FAQ</span><span>Shipping</span></div>
          <div class="osg-footer-social"><span>📘</span><span>📸</span><span>🐦</span><span>📌</span></div>
          <div class="osg-footer-copy">© 2026 ${esc(brand.name)}. All rights reserved.</div>
        </div>
      </div>`;

    switchTab('product');
    ['Product', 'Shipping', 'Legal', 'Email', 'Seo', 'Payments', 'Pages'].forEach((tab) => {
      _section.querySelector('#osgTab' + tab)?.addEventListener('click', () => switchTab(tab.toLowerCase()));
    });
    _section.querySelectorAll('.osg-legal-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        _section.querySelectorAll('.osg-legal-tab').forEach((b) => b.classList.remove('active'));
        tab.classList.add('active');
        _section.querySelectorAll('.osg-legal-content').forEach((c) => c.classList.remove('active'));
        const legal = tab.dataset.legal || '';
        const t = _section.querySelector('#osgLegal' + legal.charAt(0).toUpperCase() + legal.slice(1));
        if (t) t.classList.add('active');
      });
    });
    _section.querySelectorAll('.osg-device-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        _section.querySelectorAll('.osg-device-btn').forEach((b) => b.classList.remove('osg-device-active'));
        btn.classList.add('osg-device-active');
        const frame = _section.querySelector('#osgPreviewFrame');
        if (frame) {
          if (btn.dataset.device === 'mobile') {
            frame.classList.add('osg-frame-mobile');
          } else {
            frame.classList.remove('osg-frame-mobile');
          }
        }
      });
    });
    _section.querySelector('#osgCopyConfig')?.addEventListener('click', () => {
      const config = {
        brand: brand.name,
        domain: brand.domain,
        palette: brand.palette.name,
        pricing,
        seo,
        platform: _state.platform,
      };
      navigator.clipboard?.writeText(JSON.stringify(config, null, 2));
      const btn = _section.querySelector('#osgCopyConfig span');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = 'Copy Config'), 2000);
      }
    });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const StoreGeneratorPlugin = {
    id: 'store-generator',
    name: 'Store Builder',
    version: '4.0.0',
    description: 'Generate a complete branded Shopify store in 60 seconds',
    dependencies: ['search-engine'],

    init(_ctx) {
      Config.defaults('storeGenerator', { enabled: true });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;
      const section = document.createElement('section');
      section.className = 'section section-store-gen';
      section.id = 'section-store-gen';
      section.innerHTML = `
      <div class="section-inner">

        <!-- Hero Section -->
        <div class="osg-hero">
          <div class="osg-hero-bg-pattern"></div>
          <div class="osg-hero-content">
            <div class="osg-hero-badge">
              <span class="osg-hero-badge-dot"></span>
              Store Intelligence Engine
            </div>
            <h1 class="osg-hero-title">One-Click<br><span class="osg-hero-title-accent">Store Builder</span></h1>
            <p class="osg-hero-desc">Generate a fully branded ecommerce store with product pages, legal docs, shipping rules, SEO optimization, email capture, and payment integrations — ready to launch in 60 seconds.</p>
            <div class="osg-hero-stats">
              <div class="osg-hero-stat"><span class="osg-hero-stat-num">60s</span><span class="osg-hero-stat-label">Build Time</span></div>
              <div class="osg-hero-stat"><span class="osg-hero-stat-num">8</span><span class="osg-hero-stat-label">Pages</span></div>
              <div class="osg-hero-stat"><span class="osg-hero-stat-num">6</span><span class="osg-hero-stat-label">Payments</span></div>
              <div class="osg-hero-stat"><span class="osg-hero-stat-num">A+</span><span class="osg-hero-stat-label">SEO Score</span></div>
            </div>
          </div>
          <div class="osg-hero-visual">
            <div class="osg-hero-mockup">
              <div class="osg-mockup-bar">
                <span class="osg-mockup-dot osg-dot-r"></span>
                <span class="osg-mockup-dot osg-dot-y"></span>
                <span class="osg-mockup-dot osg-dot-g"></span>
                <span class="osg-mockup-url">yourstore.myshopify.com</span>
              </div>
              <div class="osg-mockup-body">
                <div class="osg-mockup-nav">
                  <span class="osg-mockup-logo">⚡ Brand</span>
                  <span class="osg-mockup-nav-items"><span>Shop</span><span>About</span><span>🛒</span></span>
                </div>
                <div class="osg-mockup-hero-area">
                  <div class="osg-mockup-text-block">
                    <div class="osg-mockup-line osg-ml-80"></div>
                    <div class="osg-mockup-line osg-ml-60"></div>
                    <div class="osg-mockup-btn-mock"></div>
                  </div>
                  <div class="osg-mockup-img-block"></div>
                </div>
                <div class="osg-mockup-grid">
                  <div class="osg-mockup-card-mock"></div>
                  <div class="osg-mockup-card-mock"></div>
                  <div class="osg-mockup-card-mock"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Build Steps Progress -->
        <div class="osg-steps">
          <div class="osg-step osg-step-active" data-step="1">
            <div class="osg-step-num">1</div>
            <div class="osg-step-info"><div class="osg-step-title">Find Product</div><div class="osg-step-desc">Choose what to sell</div></div>
          </div>
          <div class="osg-step-line"></div>
          <div class="osg-step" data-step="2">
            <div class="osg-step-num">2</div>
            <div class="osg-step-info"><div class="osg-step-title">Choose Platform</div><div class="osg-step-desc">Select ecommerce platform</div></div>
          </div>
          <div class="osg-step-line"></div>
          <div class="osg-step" data-step="3">
            <div class="osg-step-num">3</div>
            <div class="osg-step-info"><div class="osg-step-title">Pick Theme</div><div class="osg-step-desc">Select design template</div></div>
          </div>
          <div class="osg-step-line"></div>
          <div class="osg-step" data-step="4">
            <div class="osg-step-num">4</div>
            <div class="osg-step-info"><div class="osg-step-title">Generate</div><div class="osg-step-desc">Launch your store</div></div>
          </div>
        </div>

        <!-- Step 1: Product Search -->
        <div class="osg-panel" id="osgStep1">
          <div class="osg-panel-header">
            <div class="osg-panel-icon">🔍</div>
            <div><h3 class="osg-panel-title">Find Your Winning Product</h3><p class="osg-panel-desc">Enter a product name or keyword to build your store around</p></div>
          </div>
          <div class="osg-input-wrap">
            <svg class="osg-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" class="osg-input" id="sgInput" placeholder="Type a product name to build a store for...">
            <button class="osg-btn-primary" id="sgNextBtn1">
              <span>Continue</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div class="osg-quick-picks">
            <span class="osg-quick-label">Trending now:</span>
            <button class="osg-quick-btn" data-q="wireless earbuds"><span class="osg-quick-emoji">🎧</span>Earbuds</button>
            <button class="osg-quick-btn" data-q="pet gadgets"><span class="osg-quick-emoji">🐾</span>Pet Gadgets</button>
            <button class="osg-quick-btn" data-q="kitchen organizer"><span class="osg-quick-emoji">🍳</span>Kitchen</button>
            <button class="osg-quick-btn" data-q="posture corrector"><span class="osg-quick-emoji">🧍</span>Posture</button>
            <button class="osg-quick-btn" data-q="galaxy projector"><span class="osg-quick-emoji">🌌</span>Galaxy Light</button>
            <button class="osg-quick-btn" data-q="car accessories"><span class="osg-quick-emoji">🚗</span>Car Gear</button>
          </div>
        </div>

        <!-- Step 2: Platform Selection -->
        <div class="osg-panel osg-panel-hidden" id="osgStep2">
          <div class="osg-panel-header">
            <div class="osg-panel-icon">🏪</div>
            <div><h3 class="osg-panel-title">Choose Your Platform</h3><p class="osg-panel-desc">Select the ecommerce platform for your store</p></div>
          </div>
          <div class="osg-platform-grid">
            ${Platforms.map(
              (p, i) => `
              <button class="osg-platform-card ${i === 0 ? 'osg-platform-active' : ''}" data-platform="${p.id}">
                <div class="osg-platform-icon">${p.icon}</div>
                <div class="osg-platform-name">${p.name}</div>
                <div class="osg-platform-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </button>
            `
            ).join('')}
          </div>
          <div class="osg-panel-actions">
            <button class="osg-btn-ghost" id="osgBack2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              <span>Back</span>
            </button>
            <button class="osg-btn-primary" id="sgNextBtn2">
              <span>Continue</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <!-- Step 3: Theme Selection -->
        <div class="osg-panel osg-panel-hidden" id="osgStep3">
          <div class="osg-panel-header">
            <div class="osg-panel-icon">🎨</div>
            <div><h3 class="osg-panel-title">Select Your Theme</h3><p class="osg-panel-desc">Pick a design template that matches your brand vibe</p></div>
          </div>
          <div class="osg-theme-grid">
            ${ThemeTemplates.map(
              (t, i) => `
              <button class="osg-theme-card ${i === 0 ? 'osg-theme-active' : ''}" data-theme="${t.id}">
                <div class="osg-theme-preview">
                  <div class="osg-theme-mock-header"></div>
                  <div class="osg-theme-mock-hero"></div>
                  <div class="osg-theme-mock-row">
                    <div class="osg-theme-mock-box"></div>
                    <div class="osg-theme-mock-box"></div>
                    <div class="osg-theme-mock-box"></div>
                  </div>
                </div>
                <div class="osg-theme-info">
                  <div class="osg-theme-icon">${t.icon}</div>
                  <div class="osg-theme-name">${t.name}</div>
                  <div class="osg-theme-desc">${t.desc}</div>
                </div>
                <div class="osg-theme-check">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </button>
            `
            ).join('')}
          </div>
          <div class="osg-panel-actions">
            <button class="osg-btn-ghost" id="osgBack3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              <span>Back</span>
            </button>
            <button class="osg-btn-primary osg-btn-generate" id="sgGenerateBtn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>Generate My Store</span>
            </button>
          </div>
        </div>

        <!-- Results -->
        <div id="sgResults"></div>

        ${window.HuntDrop.renderRelatedTools([
          {
            section: 'section-supplier-hub',
            name: 'Supplier Hub',
            desc: 'Find verified suppliers',
            icon: '🏢',
            color: '#06b6d4',
          },
          {
            section: 'section-profit-lab',
            name: 'Profit Calculator',
            desc: 'Calculate margins',
            icon: '💰',
            color: '#00ff88',
          },
          {
            section: 'section-budget',
            name: 'Ad Budget Allocator',
            desc: 'Plan ad spend',
            icon: '📊',
            color: '#a855f7',
          },
          {
            section: 'section-calendar',
            name: 'Content Calendar',
            desc: 'Plan launch content',
            icon: '📅',
            color: '#f97316',
          },
        ])}
      </div>`;
      container.appendChild(section);
      _section = section;

      const input = section.querySelector('#sgInput');

      section.querySelectorAll('.osg-quick-btn').forEach((b) => {
        b.addEventListener('click', () => {
          input.value = b.dataset.q;
        });
      });

      section.querySelector('#sgNextBtn1')?.addEventListener('click', () => {
        if (!input.value.trim()) {
          input.focus();
          return;
        }
        goToStep(2);
      });
      input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          if (input.value.trim()) goToStep(2);
        }
      });

      section.querySelector('#sgNextBtn2')?.addEventListener('click', () => goToStep(3));
      section.querySelector('#osgBack2')?.addEventListener('click', () => goToStep(1));

      section.querySelectorAll('.osg-platform-card').forEach((card) => {
        card.addEventListener('click', () => {
          section.querySelectorAll('.osg-platform-card').forEach((c) => c.classList.remove('osg-platform-active'));
          card.classList.add('osg-platform-active');
          _state.platform = card.dataset.platform;
        });
      });

      section.querySelector('#sgGenerateBtn')?.addEventListener('click', () => generate(input?.value || ''));
      section.querySelector('#osgBack3')?.addEventListener('click', () => goToStep(2));

      section.querySelectorAll('.osg-theme-card').forEach((card) => {
        card.addEventListener('click', () => {
          section.querySelectorAll('.osg-theme-card').forEach((c) => c.classList.remove('osg-theme-active'));
          card.classList.add('osg-theme-active');
          _state.theme = card.dataset.theme;
        });
      });
    },

    unmount(_ctx) {
      if (_section) {
        _section.remove();
        _section = null;
      }
    },
  };

  PluginRegistry.register('store-generator', StoreGeneratorPlugin);
})();
