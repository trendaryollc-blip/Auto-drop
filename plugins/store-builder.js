/* ===================================================================
   STORE BUILDER — Unified Store Creation Page
   =================================================================== */

(function () {
  'use strict';

  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;

  PluginRegistry.register('store-builder', {
    id: 'store-builder',
    name: 'Store Builder',
    version: '1.0.0',
    dependencies: [],

    init(ctx) {},

    mount(ctx) {
      this.render();
      this.bindEvents();
    },

    unmount(ctx) {},

    render() {
      const container = document.getElementById('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section';
      section.id = 'section-store-builder';
      section.innerHTML = `
        <div class="unified-page">
          <div class="unified-breadcrumb">
            <a href="#" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('dashboard');">Dashboard</a>
            <span class="separator">/</span>
            <span class="current">Store Builder</span>
          </div>
          <div class="unified-page-header">
            <h1 class="unified-page-title">
              <span class="page-icon">🏪</span>
              Store Builder
            </h1>
          </div>

          <!-- Store Setup -->
          <div class="unified-section">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-purple">🎨</span>
                Store Setup
              </h2>
            </div>
            <div class="unified-grid-2">
              <div class="unified-input-group">
                <label class="unified-input-label">Store Name</label>
                <input type="text" class="unified-input" id="sbStoreName" placeholder="My Awesome Store" />
              </div>
              <div class="unified-input-group">
                <label class="unified-input-label">Theme</label>
                <select class="unified-select" id="sbTheme">
                  <option value="modern">Modern Dark</option>
                  <option value="minimal">Minimal Clean</option>
                  <option value="bold">Bold & Colorful</option>
                  <option value="elegant">Elegant</option>
                </select>
              </div>
            </div>
            <div class="unified-input-group" style="margin-top: 16px;">
              <label class="unified-input-label">Domain</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" class="unified-input" id="sbDomain" placeholder="mystore" style="flex: 1;" />
                <span style="padding: 12px; background: var(--bg-elevated); border: 1px solid var(--border-primary); border-radius: var(--radius-md); color: var(--text-muted); font-size: 14px;">.myshopify.com</span>
              </div>
            </div>
            <button class="unified-btn unified-btn-primary" id="sbGenerateStore" style="margin-top: 20px;">
              🚀 Generate Store
            </button>
          </div>

          <!-- Store Health -->
          <div class="unified-section" id="sbHealthSection" style="display: none;">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-green">💚</span>
                Store Health
              </h2>
            </div>
            <div class="unified-grid-3">
              <div class="unified-stat">
                <div class="unified-score-circle high" id="sbSpeedScore">82</div>
                <div class="unified-stat-label">Speed</div>
              </div>
              <div class="unified-stat">
                <div class="unified-score-circle medium" id="sbSeoScore">75</div>
                <div class="unified-stat-label">SEO</div>
              </div>
              <div class="unified-stat">
                <div class="unified-score-circle medium" id="sbConvScore">68</div>
                <div class="unified-stat-label">Conversion</div>
              </div>
            </div>
            <div class="sb-health-tips" id="sbHealthTips"></div>
          </div>

          <!-- Smart Bundles -->
          <div class="unified-section" id="sbBundleSection" style="display: none;">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-orange">📦</span>
                Smart Bundles
              </h2>
            </div>
            <div class="sb-bundle-grid" id="sbBundleGrid"></div>
          </div>
        </div>
      `;

      container.appendChild(section);
    },

    bindEvents() {
      const genBtn = document.getElementById('sbGenerateStore');
      if (genBtn) genBtn.addEventListener('click', () => this.generateStore());
    },

    generateStore() {
      const name = document.getElementById('sbStoreName')?.value || 'My Store';
      const healthSection = document.getElementById('sbHealthSection');
      const bundleSection = document.getElementById('sbBundleSection');
      const tips = document.getElementById('sbHealthTips');
      const bundleGrid = document.getElementById('sbBundleGrid');

      if (healthSection) healthSection.style.display = 'block';
      if (bundleSection) bundleSection.style.display = 'block';

      if (tips) {
        tips.innerHTML = `
          <div class="sb-tip">✅ Store "${name}" generated successfully!</div>
          <div class="sb-tip">⚡ Enable image compression for +5 speed points</div>
          <div class="sb-tip">📝 Add meta descriptions for better SEO</div>
        `;
      }

      if (bundleGrid) {
        bundleGrid.innerHTML = `
          <div class="sb-bundle-card">
            <h4>Bundle A: Starter Pack</h4>
            <p>Product + Accessory 1 + Accessory 2</p>
            <div class="sb-bundle-price"><span class="sb-bundle-original">$49.99</span> → <span class="sb-bundle-sale">$39.99</span></div>
            <span class="unified-tag green">Save 20%</span>
          </div>
          <div class="sb-bundle-card">
            <h4>Bundle B: Premium Set</h4>
            <p>Product + All Accessories</p>
            <div class="sb-bundle-price"><span class="sb-bundle-original">$79.99</span> → <span class="sb-bundle-sale">$59.99</span></div>
            <span class="unified-tag green">Save 25%</span>
          </div>
        `;
      }
    },
  });
})();
