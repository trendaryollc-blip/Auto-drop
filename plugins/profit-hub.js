/* ===================================================================
   PROFIT HUB — Unified Profit Calculator Page
   =================================================================== */

(function () {
  'use strict';

  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;

  let product = null;

  function loadProduct() {
    product = window.HuntDrop.selectedProduct || product;

    const display = document.getElementById('phProductDisplay');
    const priceSection = document.getElementById('phPriceSection');
    const shippingSection = document.getElementById('phShippingSection');
    const feesSection = document.getElementById('phFeesSection');
    const profitSection = document.getElementById('phProfitSection');
    const forecastSection = document.getElementById('phForecastSection');
    const emptyState = display?.querySelector('.dashboard-empty');

    if (!product) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    [priceSection, shippingSection, feesSection, profitSection, forecastSection].forEach((s) => {
      if (s) s.style.display = 'block';
    });

    if (display) {
      display.innerHTML = `
        <div class="ph-product-info">
          <img src="${product.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect fill=%22%231a1a2e%22 width=%2280%22 height=%2280%22/></svg>'}" alt="${product.title}" class="ph-product-img" />
          <div>
            <h3 class="ph-product-name">${product.title}</h3>
            <p class="ph-product-platform">${product.platform || 'Unknown Platform'}</p>
          </div>
        </div>
      `;
    }

    const costInput = document.getElementById('phProductCost');
    if (costInput && product.price) {
      costInput.value = product.price;
    }

    calculateProfit();
  }

  function calculateProfit() {
    const selling = parseFloat(document.getElementById('phSellingPrice')?.value) || 0;
    const cost = parseFloat(document.getElementById('phProductCost')?.value) || 0;
    const shipping = parseFloat(document.getElementById('phShippingCost')?.value) || 0;
    const feePercent = parseFloat(document.getElementById('phPlatformFee')?.value) || 0;
    const adCost = parseFloat(document.getElementById('phAdCost')?.value) || 0;
    const taxPercent = parseFloat(document.getElementById('phTaxRate')?.value) || 0;

    const platformFee = selling * (feePercent / 100);
    const tax = selling * (taxPercent / 100);
    const totalCost = cost + shipping + platformFee + adCost + tax;
    const netProfit = selling - totalCost;
    const margin = selling > 0 ? (netProfit / selling) * 100 : 0;

    const updateEl = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    updateEl('phCalcSelling', `$${selling.toFixed(2)}`);
    updateEl('phCalcCost', `-$${cost.toFixed(2)}`);
    updateEl('phCalcShipping', `-$${shipping.toFixed(2)}`);
    updateEl('phCalcFee', `-$${platformFee.toFixed(2)}`);
    updateEl('phCalcAd', `-$${adCost.toFixed(2)}`);
    updateEl('phCalcTax', `-$${tax.toFixed(2)}`);
    updateEl('phCalcNet', `$${netProfit.toFixed(2)}`);
    updateEl('phCalcMargin', `${margin.toFixed(1)}%`);

    const netEl = document.getElementById('phCalcNet');
    const marginEl = document.getElementById('phCalcMargin');
    if (netEl) {
      netEl.style.color = netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    if (marginEl) {
      marginEl.style.color =
        margin >= 30 ? 'var(--accent-green)' : margin >= 15 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    }

    const profitBar = document.getElementById('phProfitBar');
    if (profitBar && selling > 0) {
      const profitPercent = Math.max(0, Math.min(100, margin));
      profitBar.style.width = `${profitPercent}%`;
      profitBar.style.background =
        margin >= 30 ? 'var(--accent-green)' : margin >= 15 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    }

    const monthlyLow = netProfit * 100;
    const monthlyMid = netProfit * 200;
    const monthlyHigh = netProfit * 300;
    updateEl('phForecastLow', `$${monthlyLow.toLocaleString()}`);
    updateEl('phForecastMid', `$${monthlyMid.toLocaleString()}`);
    updateEl('phForecastHigh', `$${monthlyHigh.toLocaleString()}`);

    const optimalLow = ((cost + shipping + adCost) / (1 - (feePercent + taxPercent) / 100)) * 1.3;
    const optimalHigh = optimalLow * 1.5;
    updateEl('phOptimalRange', `$${optimalLow.toFixed(2)} - $${optimalHigh.toFixed(2)}`);
    const optimalEl = document.getElementById('phOptimalPrice');
    if (optimalEl && selling === 0) optimalEl.style.display = 'flex';
  }

  function render() {
    const container = document.getElementById('sections-container');
    if (!container) return;

    const section = document.createElement('section');
    section.className = 'section';
    section.id = 'section-profit-hub';
    section.innerHTML = `
      <div class="unified-page">
        <div class="unified-breadcrumb">
          <a href="#" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('dashboard');">Dashboard</a>
          <span class="separator">/</span>
          <span class="current">Profit Hub</span>
        </div>

        <div class="unified-page-header">
          <h1 class="unified-page-title">
            <span class="page-icon">💰</span>
            Profit Calculator
          </h1>
        </div>

        <!-- Product Display -->
        <div class="unified-section" id="phProductSection">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-cyan">📦</span>
              Selected Product
            </h2>
          </div>
          <div id="phProductDisplay">
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

        <!-- Price Analysis -->
        <div class="unified-section" id="phPriceSection" style="display: none;">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-green">💲</span>
              Price Analysis
            </h2>
          </div>
          <div class="unified-grid-2">
            <div class="unified-input-group">
              <label class="unified-input-label">Your Selling Price ($)</label>
              <input type="number" class="unified-input" id="phSellingPrice" placeholder="0.00" step="0.01" min="0" />
            </div>
            <div class="unified-input-group">
              <label class="unified-input-label">Product Cost ($)</label>
              <input type="number" class="unified-input" id="phProductCost" placeholder="0.00" step="0.01" min="0" />
            </div>
          </div>
          <div class="ph-optimal-price" id="phOptimalPrice" style="display: none;">
            <span class="ph-optimal-label">Optimal Price Range:</span>
            <span class="ph-optimal-value" id="phOptimalRange">$0 - $0</span>
          </div>
        </div>

        <!-- Shipping -->
        <div class="unified-section" id="phShippingSection" style="display: none;">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-orange">🚚</span>
              Shipping
            </h2>
          </div>
          <div class="unified-grid-3">
            <div class="unified-input-group">
              <label class="unified-input-label">Shipping Method</label>
              <select class="unified-select" id="phShippingMethod">
                <option value="epacket">ePacket (7-15 days)</option>
                <option value="aliexpress">AliExpress Standard (15-30 days)</option>
                <option value="dhl">DHL Express (3-7 days)</option>
                <option value="fedex">FedEx (5-10 days)</option>
              </select>
            </div>
            <div class="unified-input-group">
              <label class="unified-input-label">Shipping Cost ($)</label>
              <input type="number" class="unified-input" id="phShippingCost" placeholder="0.00" step="0.01" min="0" value="4.50" />
            </div>
            <div class="unified-input-group">
              <label class="unified-input-label">Delivery Time</label>
              <div class="ph-delivery-time" id="phDeliveryTime">7-15 days</div>
            </div>
          </div>
        </div>

        <!-- Fees -->
        <div class="unified-section" id="phFeesSection" style="display: none;">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-purple">📋</span>
              Platform Fees & Expenses
            </h2>
          </div>
          <div class="unified-grid-3">
            <div class="unified-input-group">
              <label class="unified-input-label">Platform Fee (%)</label>
              <input type="number" class="unified-input" id="phPlatformFee" placeholder="0" step="0.1" min="0" value="15" />
            </div>
            <div class="unified-input-group">
              <label class="unified-input-label">Ad Cost per Sale ($)</label>
              <input type="number" class="unified-input" id="phAdCost" placeholder="0.00" step="0.01" min="0" value="5.00" />
            </div>
            <div class="unified-input-group">
              <label class="unified-input-label">Tax Rate (%)</label>
              <input type="number" class="unified-input" id="phTaxRate" placeholder="0" step="0.1" min="0" value="0" />
            </div>
          </div>
        </div>

        <!-- Profit Calculation -->
        <div class="unified-section" id="phProfitSection" style="display: none;">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-green">📊</span>
              Profit Breakdown
            </h2>
          </div>
          <div class="ph-profit-grid">
            <div class="ph-profit-row">
              <span class="ph-profit-label">Selling Price</span>
              <span class="ph-profit-value" id="phCalcSelling">$0.00</span>
            </div>
            <div class="ph-profit-row ph-profit-deduction">
              <span class="ph-profit-label">Product Cost</span>
              <span class="ph-profit-value" id="phCalcCost">-$0.00</span>
            </div>
            <div class="ph-profit-row ph-profit-deduction">
              <span class="ph-profit-label">Shipping</span>
              <span class="ph-profit-value" id="phCalcShipping">-$0.00</span>
            </div>
            <div class="ph-profit-row ph-profit-deduction">
              <span class="ph-profit-label">Platform Fee</span>
              <span class="ph-profit-value" id="phCalcFee">-$0.00</span>
            </div>
            <div class="ph-profit-row ph-profit-deduction">
              <span class="ph-profit-label">Ad Cost</span>
              <span class="ph-profit-value" id="phCalcAd">-$0.00</span>
            </div>
            <div class="ph-profit-row ph-profit-deduction">
              <span class="ph-profit-label">Tax</span>
              <span class="ph-profit-value" id="phCalcTax">-$0.00</span>
            </div>
            <div class="ph-profit-divider"></div>
            <div class="ph-profit-row ph-profit-total">
              <span class="ph-profit-label">NET PROFIT</span>
              <span class="ph-profit-value" id="phCalcNet">$0.00</span>
            </div>
            <div class="ph-profit-row ph-profit-total">
              <span class="ph-profit-label">Profit Margin</span>
              <span class="ph-profit-value" id="phCalcMargin">0%</span>
            </div>
          </div>
          <div class="ph-profit-visual">
            <div class="ph-profit-bar">
              <div class="ph-profit-bar-fill" id="phProfitBar"></div>
            </div>
            <div class="ph-profit-bar-labels">
              <span>Cost</span>
              <span>Profit</span>
            </div>
          </div>
        </div>

        <!-- Forecast -->
        <div class="unified-section" id="phForecastSection" style="display: none;">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-purple">📈</span>
              Revenue Forecast
            </h2>
          </div>
          <div class="unified-grid-3">
            <div class="unified-stat">
              <div class="unified-stat-value" id="phForecastLow">$0</div>
              <div class="unified-stat-label">Monthly (Low)</div>
            </div>
            <div class="unified-stat">
              <div class="unified-stat-value" id="phForecastMid">$0</div>
              <div class="unified-stat-label">Monthly (Avg)</div>
            </div>
            <div class="unified-stat">
              <div class="unified-stat-value" id="phForecastHigh">$0</div>
              <div class="unified-stat-label">Monthly (High)</div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(section);
  }

  function bindEvents() {
    const inputs = ['phSellingPrice', 'phProductCost', 'phShippingCost', 'phPlatformFee', 'phAdCost', 'phTaxRate'];
    inputs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => calculateProfit());
      }
    });

    const shippingMethod = document.getElementById('phShippingMethod');
    if (shippingMethod) {
      shippingMethod.addEventListener('change', (e) => {
        const costs = { epacket: 4.5, aliexpress: 3.0, dhl: 15.0, fedex: 12.0 };
        const times = { epacket: '7-15 days', aliexpress: '15-30 days', dhl: '3-7 days', fedex: '5-10 days' };
        const costInput = document.getElementById('phShippingCost');
        const timeDisplay = document.getElementById('phDeliveryTime');
        if (costInput) costInput.value = costs[e.target.value] || 4.5;
        if (timeDisplay) timeDisplay.textContent = times[e.target.value] || '7-15 days';
        calculateProfit();
      });
    }

    EventBus.on('product:selected', (data) => {
      product = data.product;
      loadProduct();
    });
  }

  PluginRegistry.register('profit-hub', {
    id: 'profit-hub',
    name: 'Profit Hub',
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
