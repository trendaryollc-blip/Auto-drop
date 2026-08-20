/* ===================================================================
   SUPPLIER CENTER — Unified Supplier Discovery Page
   =================================================================== */

(function() {
  'use strict';

  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;

  PluginRegistry.register('supplier-center', {
    id: 'supplier-center',
    name: 'Supplier Center',
    version: '1.0.0',
    dependencies: [],

    init(ctx) {
      this.product = null;
      this.suppliers = [];
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
      section.id = 'section-supplier-center';
      section.innerHTML = `
        <div class="unified-page">
          <div class="unified-breadcrumb">
            <a href="#" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('dashboard');">Dashboard</a>
            <span class="separator">/</span>
            <span class="current">Supplier Center</span>
          </div>

          <div class="unified-page-header">
            <h1 class="unified-page-title">
              <span class="page-icon">🏭</span>
              Find Suppliers
            </h1>
          </div>

          <!-- Product Display -->
          <div class="unified-section">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-cyan">📦</span>
                Product to Source
              </h2>
            </div>
            <div id="scProductDisplay">
              <div class="dashboard-empty">
                <div class="dashboard-empty-icon">📦</div>
                <h3>No product selected</h3>
                <p>Go to Product Finder to select a product first.</p>
                <button class="unified-btn unified-btn-primary" onclick="window.HuntDrop.Router.navigate('product-finder')" style="margin-top: 16px;">
                  Find Products
                </button>
              </div>
            </div>
          </div>

          <!-- Supplier Comparison -->
          <div class="unified-section" id="scSuppliersSection" style="display: none;">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-green">✅</span>
                Available Suppliers
              </h2>
              <span class="unified-section-badge" id="scSupplierCount">0 suppliers</span>
            </div>
            <div class="sc-supplier-grid" id="scSupplierGrid"></div>
          </div>

          <!-- Risk Assessment -->
          <div class="unified-section" id="scRiskSection" style="display: none;">
            <div class="unified-section-header">
              <h2 class="unified-section-title">
                <span class="section-icon icon-orange">⚠️</span>
                Risk Assessment
              </h2>
            </div>
            <div class="sc-risk-grid" id="scRiskGrid"></div>
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
    },

    loadProduct() {
      this.product = window.HuntDrop.selectedProduct || this.product;
      
      const display = document.getElementById('scProductDisplay');
      const suppliersSection = document.getElementById('scSuppliersSection');
      const riskSection = document.getElementById('scRiskSection');
      const emptyState = display?.querySelector('.dashboard-empty');

      if (!this.product) {
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';
      if (suppliersSection) suppliersSection.style.display = 'block';
      if (riskSection) riskSection.style.display = 'block';

      // Set product info
      if (display) {
        display.innerHTML = `
          <div class="ph-product-info">
            <img src="${this.product.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect fill=%22%231a1a2e%22 width=%2280%22 height=%2280%22/></svg>'}" alt="${this.product.title}" class="ph-product-img" />
            <div>
              <h3 class="ph-product-name">${this.product.title}</h3>
              <p class="ph-product-platform">Looking for suppliers...</p>
            </div>
          </div>
        `;
      }

      // Load suppliers
      this.loadSuppliers();
    },

    loadSuppliers() {
      const grid = document.getElementById('scSupplierGrid');
      const count = document.getElementById('scSupplierCount');
      const riskGrid = document.getElementById('scRiskGrid');

      if (!grid) return;

      // Generate mock suppliers (replace with real data)
      this.suppliers = [
        {
          id: 1,
          name: 'Golden Trading Co.',
          location: 'Guangdong, China',
          rating: 4.8,
          orders: 2340,
          responseTime: '< 2 hours',
          deliveryTime: '7-12 days',
          verified: true,
          price: this.product?.price ? (this.product.price * 0.4).toFixed(2) : '8.50',
          riskScore: 92
        },
        {
          id: 2,
          name: 'Best Source Ltd.',
          location: 'Yiwu, China',
          rating: 4.6,
          orders: 890,
          responseTime: '< 4 hours',
          deliveryTime: '10-18 days',
          verified: true,
          price: this.product?.price ? (this.product.price * 0.35).toFixed(2) : '7.20',
          riskScore: 85
        },
        {
          id: 3,
          name: 'Quick Ship Direct',
          location: 'Shenzhen, China',
          rating: 4.3,
          orders: 156,
          responseTime: '< 8 hours',
          deliveryTime: '15-25 days',
          verified: false,
          price: this.product?.price ? (this.product.price * 0.3).toFixed(2) : '6.80',
          riskScore: 68
        }
      ];

      if (count) count.textContent = `${this.suppliers.length} suppliers`;

      grid.innerHTML = this.suppliers.map((supplier, index) => `
        <div class="sc-supplier-card ${index === 0 ? 'best' : ''}" style="animation: fadeUp 0.4s ease ${index * 0.1}s both;">
          ${index === 0 ? '<div class="sc-best-badge">Best Value</div>' : ''}
          <div class="sc-supplier-header">
            <div class="sc-supplier-avatar">${supplier.name.charAt(0)}</div>
            <div>
              <h3 class="sc-supplier-name">${supplier.name}</h3>
              <p class="sc-supplier-location">${supplier.location}</p>
            </div>
          </div>
          <div class="sc-supplier-stats">
            <div class="sc-stat">
              <span class="sc-stat-label">Price per Unit</span>
              <span class="sc-stat-value sc-price">$${supplier.price}</span>
            </div>
            <div class="sc-stat">
              <span class="sc-stat-label">Rating</span>
              <span class="sc-stat-value">⭐ ${supplier.rating}</span>
            </div>
            <div class="sc-stat">
              <span class="sc-stat-label">Orders</span>
              <span class="sc-stat-value">${supplier.orders.toLocaleString()}</span>
            </div>
            <div class="sc-stat">
              <span class="sc-stat-label">Delivery</span>
              <span class="sc-stat-value">${supplier.deliveryTime}</span>
            </div>
            <div class="sc-stat">
              <span class="sc-stat-label">Response</span>
              <span class="sc-stat-value">${supplier.responseTime}</span>
            </div>
            <div class="sc-stat">
              <span class="sc-stat-label">Status</span>
              <span class="sc-stat-value">
                ${supplier.verified ? '<span class="unified-tag green">✓ Verified</span>' : '<span class="unified-tag yellow">New</span>'}
              </span>
            </div>
          </div>
          <div class="sc-supplier-actions">
            <button class="unified-btn unified-btn-primary" style="flex: 1;">Contact Supplier</button>
            <button class="unified-btn unified-btn-secondary">View Details</button>
          </div>
        </div>
      `).join('');

      // Risk assessment
      if (riskGrid) {
        riskGrid.innerHTML = this.suppliers.map(supplier => `
          <div class="sc-risk-item">
            <div class="sc-risk-info">
              <span class="sc-risk-name">${supplier.name}</span>
              <div class="unified-progress" style="flex: 1; margin-left: 16px;">
                <div class="unified-progress-bar">
                  <div class="unified-progress-fill ${supplier.riskScore >= 80 ? 'green' : supplier.riskScore >= 60 ? 'yellow' : 'red'}" style="width: ${supplier.riskScore}%"></div>
                </div>
              </div>
            </div>
            <span class="sc-risk-score">${supplier.riskScore}/100</span>
            <span class="unified-tag ${supplier.riskScore >= 80 ? 'green' : supplier.riskScore >= 60 ? 'yellow' : 'red'}">
              ${supplier.riskScore >= 80 ? 'Low Risk' : supplier.riskScore >= 60 ? 'Medium Risk' : 'High Risk'}
            </span>
          </div>
        `).join('');
      }
    }
  });

})();