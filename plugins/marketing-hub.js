/* ===================================================================
   MARKETING HUB — Unified Marketing Tools Page
   =================================================================== */

(function () {
  'use strict';

  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;

  PluginRegistry.register('marketing-hub', {
    id: 'marketing-hub',
    name: 'Marketing Hub',
    version: '1.0.0',
    dependencies: [],

    init(ctx) {
      this.product = null;
    },

    mount(ctx) {
      this.render();
      this.bindEvents();
      this.loadProduct();
    },

    unmount(ctx) {},

    render() {
      const container = document.getElementById('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section';
      section.id = 'section-marketing-hub';
      section.innerHTML = `
        <div class="unified-page">
          <div class="unified-breadcrumb">
            <a href="#" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('dashboard');">Dashboard</a>
            <span class="separator">/</span>
            <span class="current">Marketing Hub</span>
          </div>
          <div class="unified-page-header">
            <h1 class="unified-page-title">
              <span class="page-icon">📢</span>
              Marketing Hub
            </h1>
          </div>

          <div class="unified-section" id="mhProductSection">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-cyan">📦</span>
                Product to Promote
              </h2>
            </div>
            <div id="mhProductDisplay">
              <div class="dashboard-empty">
                <div class="dashboard-empty-icon">📢</div>
                <h3>Select a product first</h3>
                <p>Go to Product Finder to select a product to create ads for.</p>
                <button class="unified-btn unified-btn-primary" onclick="window.HuntDrop.Router.navigate('product-finder')" style="margin-top: 16px;">Find Products</button>
              </div>
            </div>
          </div>

          <div class="unified-section" id="mhAdSection" style="display: none;">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-purple">✍️</span>
                Ad Copy Generator
              </h2>
            </div>
            <div class="mh-platform-tabs">
              <button class="mh-tab active" data-platform="facebook">Facebook</button>
              <button class="mh-tab" data-platform="tiktok">TikTok</button>
              <button class="mh-tab" data-platform="instagram">Instagram</button>
            </div>
            <div class="mh-ad-output" id="mhAdOutput">
              <div class="mh-ad-placeholder">Click "Generate Ad" to create ad copy</div>
            </div>
            <button class="unified-btn unified-btn-primary" id="mhGenerateAd" style="margin-top: 16px;">
              ✨ Generate Ad Copy
            </button>
          </div>

          <div class="unified-section" id="mhBudgetSection" style="display: none;">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-green">💵</span>
                Budget Allocator
              </h2>
            </div>
            <div class="unified-input-group" style="margin-bottom: 16px;">
              <label class="unified-input-label">Total Daily Budget ($)</label>
              <input type="number" class="unified-input" id="mhBudget" placeholder="100" value="100" />
            </div>
            <div class="mh-budget-split" id="mhBudgetSplit">
              <div class="mh-budget-item">
                <span class="mh-budget-platform">Facebook</span>
                <span class="mh-budget-percent">40%</span>
                <span class="mh-budget-amount" id="mhBudgetFB">$40</span>
              </div>
              <div class="mh-budget-item">
                <span class="mh-budget-platform">TikTok</span>
                <span class="mh-budget-percent">35%</span>
                <span class="mh-budget-amount" id="mhBudgetTT">$35</span>
              </div>
              <div class="mh-budget-item">
                <span class="mh-budget-platform">Instagram</span>
                <span class="mh-budget-percent">25%</span>
                <span class="mh-budget-amount" id="mhBudgetIG">$25</span>
              </div>
            </div>
          </div>

          <div class="unified-section" id="mhObjectionSection" style="display: none;">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-orange">🛡️</span>
                Objection Handlers
              </h2>
            </div>
            <div class="mh-objection-list" id="mhObjectionList"></div>
          </div>
        </div>
      `;

      container.appendChild(section);
    },

    bindEvents() {
      EventBus.on('product:selected', (data) => {
        this.product = data.product;
        this.loadProduct();
      });

      const genBtn = document.getElementById('mhGenerateAd');
      if (genBtn) genBtn.addEventListener('click', () => this.generateAd());

      const budgetInput = document.getElementById('mhBudget');
      if (budgetInput) budgetInput.addEventListener('input', () => this.updateBudget());

      document.querySelectorAll('.mh-tab').forEach((tab) => {
        tab.addEventListener('click', (e) => {
          document.querySelectorAll('.mh-tab').forEach((t) => t.classList.remove('active'));
          e.target.classList.add('active');
          this.generateAd();
        });
      });
    },

    loadProduct() {
      this.product = window.HuntDrop.selectedProduct || this.product;
      const display = document.getElementById('mhProductDisplay');
      const adSection = document.getElementById('mhAdSection');
      const budgetSection = document.getElementById('mhBudgetSection');
      const objectionSection = document.getElementById('mhObjectionSection');
      const emptyState = display?.querySelector('.dashboard-empty');

      if (!this.product) {
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';
      [adSection, budgetSection, objectionSection].forEach((s) => {
        if (s) s.style.display = 'block';
      });

      if (display) {
        display.innerHTML = `
          <div class="ph-product-info">
            <img src="${this.product.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect fill=%22%231a1a2e%22 width=%2280%22 height=%2280%22/></svg>'}" alt="${this.product.title}" class="ph-product-img" />
            <div>
              <h3 class="ph-product-name">${this.product.title}</h3>
              <p class="ph-product-platform">Creating marketing materials...</p>
            </div>
          </div>
        `;
      }

      this.loadObjections();
    },

    generateAd() {
      const output = document.getElementById('mhAdOutput');
      const activePlatform = document.querySelector('.mh-tab.active')?.dataset.platform || 'facebook';

      if (!output || !this.product) return;

      const ads = {
        facebook: `🔥 Stop scrolling! This ${this.product.title} is selling out FAST.\n\n✅ Premium quality\n✅ Fast shipping\n✅ 30-day guarantee\n\nLimited time offer - 50% OFF today only!\n\n👆 Click "Shop Now" before it's gone!`,
        tiktok: `POV: You just found the product everyone's been looking for 😱\n\n${this.product.title} is here and it's AMAZING.\n\nLink in bio before it sells out! 🛒\n\n#trending #musthave #fyp`,
        instagram: `✨ Introducing the ${this.product.title} ✨\n\nThe product that's breaking the internet. See why everyone is talking about it.\n\n📸 Tag someone who needs this!\n\n🔗 Link in bio\n\n#trending #viral #musthave`,
      };

      output.innerHTML = `
        <div class="mh-ad-preview">
          <pre>${ads[activePlatform]}</pre>
        </div>
        <button class="unified-btn unified-btn-secondary" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy to Clipboard', 2000);">
          📋 Copy to Clipboard
        </button>
      `;
    },

    updateBudget() {
      const budget = parseFloat(document.getElementById('mhBudget')?.value) || 0;
      const fb = document.getElementById('mhBudgetFB');
      const tt = document.getElementById('mhBudgetTT');
      const ig = document.getElementById('mhBudgetIG');
      if (fb) fb.textContent = `$${(budget * 0.4).toFixed(0)}`;
      if (tt) tt.textContent = `$${(budget * 0.35).toFixed(0)}`;
      if (ig) ig.textContent = `$${(budget * 0.25).toFixed(0)}`;
    },

    loadObjections() {
      const list = document.getElementById('mhObjectionList');
      if (!list) return;

      const objections = [
        {
          objection: '"It\'s too expensive"',
          response: 'Compare the value: our product lasts 3x longer than alternatives, saving you money long-term.',
        },
        {
          objection: '"Does it actually work?"',
          response: 'Show social proof: 2,000+ happy customers, 4.8 star rating, and our 30-day money-back guarantee.',
        },
        {
          objection: '"I can find it cheaper elsewhere"',
          response: "Highlight unique features and quality guarantee that cheaper alternatives can't match.",
        },
      ];

      list.innerHTML = objections
        .map(
          (o) => `
        <div class="mh-objection-card">
          <div class="mh-objection-q">${o.objection}</div>
          <div class="mh-objection-a">💡 ${o.response}</div>
        </div>
      `
        )
        .join('');
    },
  });
})();
