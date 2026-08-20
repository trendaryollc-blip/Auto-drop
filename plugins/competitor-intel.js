/* ===================================================================
   COMPETITOR INTEL — Unified Competitor Analysis Page
   =================================================================== */

(function () {
  'use strict';

  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;

  let product = null;

  function loadProduct() {
    product = window.HuntDrop.selectedProduct || product;
    const display = document.getElementById('ciProductDisplay');
    const competitorsSection = document.getElementById('ciCompetitorsSection');
    const techSection = document.getElementById('ciTechSection');
    const personaSection = document.getElementById('ciPersonaSection');
    const emptyState = display?.querySelector('.dashboard-empty');

    if (!product) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    [competitorsSection, techSection, personaSection].forEach((s) => {
      if (s) s.style.display = 'block';
    });

    if (display) {
      display.innerHTML = `
        <div class="ph-product-info">
          <img src="${product.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect fill=%22%231a1a2e%22 width=%2280%22 height=%2280%22/></svg>'}" alt="${product.title}" class="ph-product-img" />
          <div>
            <h3 class="ph-product-name">${product.title}</h3>
            <p class="ph-product-platform">Analyzing competitors...</p>
          </div>
        </div>
      `;
    }

    loadCompetitorData();
  }

  function loadCompetitorData() {
    const competitorList = document.getElementById('ciCompetitorList');
    const techTags = document.getElementById('ciTechTags');
    const personaGrid = document.getElementById('ciPersonaGrid');

    const competitors = [
      { name: 'TrendStore.com', revenue: '$45K/mo', products: 12, tech: ['Shopify', 'Klaviyo'], traffic: '125K/mo' },
      { name: 'DropPro.io', revenue: '$28K/mo', products: 8, tech: ['WooCommerce', 'Mailchimp'], traffic: '89K/mo' },
      { name: 'WinProduct.co', revenue: '$18K/mo', products: 15, tech: ['Shopify', 'Oberlo'], traffic: '62K/mo' },
    ];

    if (competitorList) {
      competitorList.innerHTML = competitors
        .map(
          (c, i) => `
        <div class="ci-competitor-card" style="animation: fadeUp 0.4s ease ${i * 0.1}s both;">
          <h3 class="ci-competitor-name">${c.name}</h3>
          <div class="ci-competitor-stats">
            <div class="unified-stat"><div class="unified-stat-value">${c.revenue}</div><div class="unified-stat-label">Revenue</div></div>
            <div class="unified-stat"><div class="unified-stat-value">${c.products}</div><div class="unified-stat-label">Products</div></div>
            <div class="unified-stat"><div class="unified-stat-value">${c.traffic}</div><div class="unified-stat-label">Traffic</div></div>
          </div>
        </div>
      `
        )
        .join('');
    }

    const techs = ['Shopify', 'Klaviyo', 'Facebook Pixel', 'TikTok Pixel', 'Google Analytics', 'Hotjar'];
    if (techTags) {
      techTags.innerHTML = techs.map((t) => `<span class="unified-tag cyan">${t}</span>`).join('');
    }

    if (personaGrid) {
      personaGrid.innerHTML = `
        <div class="unified-stat"><div class="unified-stat-value">25-34</div><div class="unified-stat-label">Age Range</div></div>
        <div class="unified-stat"><div class="unified-stat-value">68%</div><div class="unified-stat-label">Female</div></div>
        <div class="unified-stat"><div class="unified-stat-value">US, UK, CA</div><div class="unified-stat-label">Top Countries</div></div>
        <div class="unified-stat"><div class="unified-stat-value">Fitness</div><div class="unified-stat-label">Top Interest</div></div>
      `;
    }
  }

  function render() {
    const container = document.getElementById('sections-container');
    if (!container) return;

    const section = document.createElement('section');
    section.className = 'section';
    section.id = 'section-competitor-intel';
    section.innerHTML = `
      <div class="unified-page">
        <div class="unified-breadcrumb">
          <a href="#" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('dashboard');">Dashboard</a>
          <span class="separator">/</span>
          <span class="current">Competitor Intel</span>
        </div>
        <div class="unified-page-header">
          <h1 class="unified-page-title">
            <span class="page-icon">🕵️</span>
            Competitor Intelligence
          </h1>
        </div>

        <div class="unified-section" id="ciProductSection">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-cyan">📦</span>
              Product / Niche
            </h2>
          </div>
          <div id="ciProductDisplay">
            <div class="dashboard-empty">
              <div class="dashboard-empty-icon">🕵️</div>
              <h3>Select a product first</h3>
              <p>Go to Product Finder to select a product to analyze competitors.</p>
              <button class="unified-btn unified-btn-primary" onclick="window.HuntDrop.Router.navigate('product-finder')" style="margin-top: 16px;">Find Products</button>
            </div>
          </div>
        </div>

        <div class="unified-section" id="ciCompetitorsSection" style="display: none;">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-orange">🏪</span>
              Competitor Stores
            </h2>
          </div>
          <div class="ci-competitor-list" id="ciCompetitorList"></div>
        </div>

        <div class="unified-section" id="ciTechSection" style="display: none;">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-purple">⚙️</span>
              Their Tech Stack
            </h2>
          </div>
          <div class="ci-tech-tags" id="ciTechTags"></div>
        </div>

        <div class="unified-section" id="ciPersonaSection" style="display: none;">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-green">👤</span>
              Customer Persona
            </h2>
          </div>
          <div class="ci-persona-grid" id="ciPersonaGrid"></div>
        </div>
      </div>
    `;

    container.appendChild(section);
  }

  function bindEvents() {
    EventBus.on('product:selected', (data) => {
      product = data.product;
      loadProduct();
    });
  }

  PluginRegistry.register('competitor-intel', {
    id: 'competitor-intel',
    name: 'Competitor Intel',
    version: '1.0.0',
    dependencies: [],

    init(ctx) {},

    mount(ctx) {
      render();
      bindEvents();
      loadProduct();
    },

    unmount(ctx) {
      product = null;
    },
  });
})();
