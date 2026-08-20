/* ===================================================================
   PRODUCT FINDER — Unified Product Search & Discovery Page
   =================================================================== */

(function () {
  'use strict';

  const { EventBus, PluginRegistry, UI, Config, DataLayer } = window.HuntDrop;

  let selectedProduct = null;
  let searchResults = [];

  function performSearch(query) {
    const searchInput = document.getElementById('pfSearchInput');
    const platformSelect = document.getElementById('pfPlatformSelect');

    const searchQuery = query || (searchInput ? searchInput.value : '');
    const platform = platformSelect ? platformSelect.value : 'all';

    if (!searchQuery.trim()) return;

    const resultsSection = document.getElementById('pfResultsSection');
    const emptyState = document.getElementById('pfEmptyState');
    const resultsGrid = document.getElementById('pfResultsGrid');

    if (emptyState) emptyState.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'block';
    if (resultsGrid) {
      resultsGrid.innerHTML = `
        <div class="plugin-loading-state">
          <div class="plugin-loading-spinner"></div>
          <span>Searching across platforms...</span>
        </div>
      `;
    }

    setTimeout(async () => {
      try {
        const results = DataLayer.searchAll ? await DataLayer.searchAll(searchQuery, { platform }) : [];
        searchResults = Array.isArray(results) ? results : [];
      } catch (e) {
        searchResults = [];
      }
      renderResults(searchResults);
    }, 800);
  }

  function renderResults(results) {
    const resultsGrid = document.getElementById('pfResultsGrid');
    const resultCount = document.getElementById('pfResultCount');

    if (!resultsGrid) return;

    if (results.length === 0) {
      resultsGrid.innerHTML = `
        <div class="dashboard-empty">
          <div class="dashboard-empty-icon">😕</div>
          <h3>No products found</h3>
          <p>Try different keywords or adjust your filters.</p>
        </div>
      `;
      if (resultCount) resultCount.textContent = '0 products';
      return;
    }

    if (resultCount) resultCount.textContent = `${results.length} products`;

    resultsGrid.innerHTML = results
      .map(
        (product, index) => `
      <div class="pf-product-card" data-id="${product.id}" style="animation: fadeUp 0.4s ease ${index * 0.05}s both;">
        <div class="pf-product-image">
          <img src="${product.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%231a1a2e%22 width=%22200%22 height=%22200%22/></svg>'}" alt="${product.title}" />
          <div class="pf-product-score">${product.score || 0}</div>
        </div>
        <div class="pf-product-info">
          <h3 class="pf-product-title">${product.title}</h3>
          <div class="pf-product-price">
            <span class="pf-current-price">$${product.price || 0}</span>
            ${product.originalPrice ? `<span class="pf-original-price">$${product.originalPrice}</span>` : ''}
          </div>
          <div class="pf-product-meta">
            <span class="pf-platform">${product.platform || 'Unknown'}</span>
            <span class="pf-margin">${product.margin || 0}% margin</span>
          </div>
          <button class="pf-select-btn" data-action="select" data-id="${product.id}">
            Select Product →
          </button>
        </div>
      </div>
    `
      )
      .join('');

    resultsGrid.querySelectorAll('.pf-product-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('pf-select-btn')) {
          selectProduct(card.dataset.id);
        }
      });
    });

    resultsGrid.querySelectorAll('.pf-select-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectProduct(btn.dataset.id);
      });
    });
  }

  function selectProduct(productId) {
    const product = searchResults.find((p) => p.id === productId);
    if (!product) return;

    selectedProduct = product;

    window.HuntDrop = window.HuntDrop || {};
    window.HuntDrop.selectedProduct = product;

    const selectedSection = document.getElementById('pfSelectedSection');
    const selectedBanner = document.getElementById('pfSelectedBanner');
    const resultsSection = document.getElementById('pfResultsSection');

    if (selectedSection) selectedSection.style.display = 'block';
    if (resultsSection) resultsSection.style.display = 'none';

    if (selectedBanner) {
      selectedBanner.innerHTML = `
        <div class="product-selected-info">
          <div class="product-selected-img">
            <img src="${product.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect fill=%22%231a1a2e%22 width=%2248%22 height=%2248%22/></svg>'}" alt="${product.title}" />
          </div>
          <div>
            <div class="product-selected-name">${product.title}</div>
            <div class="product-selected-price">$${product.price || 0}</div>
          </div>
        </div>
        <div class="product-selected-actions">
          <button class="unified-btn unified-btn-secondary" id="pfClearSelection">Change Product</button>
        </div>
      `;

      const clearBtn = document.getElementById('pfClearSelection');
      if (clearBtn) clearBtn.addEventListener('click', clearSelection);
    }

    EventBus.emit('product:selected', { product });
  }

  function clearSelection() {
    selectedProduct = null;
    window.HuntDrop.selectedProduct = null;

    const selectedSection = document.getElementById('pfSelectedSection');
    const resultsSection = document.getElementById('pfResultsSection');

    if (selectedSection) selectedSection.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'block';
  }

  function render() {
    const container = document.getElementById('sections-container');
    if (!container) return;

    const section = document.createElement('section');
    section.className = 'section';
    section.id = 'section-product-finder';
    section.innerHTML = `
      <div class="unified-page">
        <div class="unified-breadcrumb">
          <a href="#" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('dashboard');">Dashboard</a>
          <span class="separator">/</span>
          <span class="current">Find Products</span>
        </div>

        <div class="unified-page-header">
          <h1 class="unified-page-title">
            <span class="page-icon">🔍</span>
            Find Winning Products
          </h1>
        </div>

        <!-- Search Section -->
        <div class="unified-section">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-search">🔍</span>
              Search Products
            </h2>
          </div>
          <div class="pf-search-container">
            <div class="pf-search-box">
              <div class="pf-search-platform">
                <select id="pfPlatformSelect">
                  <option value="all">All Platforms</option>
                  <option value="aliexpress">AliExpress</option>
                  <option value="amazon">Amazon</option>
                  <option value="shopify">Shopify</option>
                  <option value="ebay">eBay</option>
                  <option value="temu">Temu</option>
                  <option value="tiktok">TikTok Shop</option>
                  <option value="etsy">Etsy</option>
                  <option value="cjdropshipping">CJ Dropshipping</option>
                  <option value="dhgate">DHgate</option>
                  <option value="wish">Wish</option>
                </select>
              </div>
              <input type="text" id="pfSearchInput" placeholder="What products are you looking for?" />
              <button class="unified-btn unified-btn-primary" id="pfSearchBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Search
              </button>
            </div>
            <div class="pf-search-suggestions">
              <span class="pf-suggestion-label">Popular:</span>
              <button class="pf-suggestion" data-query="trending on tiktok">Trending on TikTok</button>
              <button class="pf-suggestion" data-query="summer products">Summer Products</button>
              <button class="pf-suggestion" data-query="beauty products">Beauty Products</button>
              <button class="pf-suggestion" data-query="fitness gadgets">Fitness Gadgets</button>
            </div>
          </div>
        </div>

        <!-- Results Section -->
        <div class="unified-section" id="pfResultsSection" style="display: none;">
          <div class="unified-section-header">
            <h2 class="unified-section-title">
              <span class="section-icon icon-cyan">📊</span>
              Search Results
              <span class="unified-section-badge" id="pfResultCount">0 products</span>
            </h2>
            <div class="pf-sort">
              <select id="pfSortSelect">
                <option value="score">Sort by AI Score</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="margin">Highest Margin</option>
                <option value="trending">Trending</option>
              </select>
            </div>
          </div>
          <div class="pf-results-grid" id="pfResultsGrid"></div>
        </div>

        <!-- Product Selected Section -->
        <div id="pfSelectedSection" style="display: none;">
          <div class="product-selected-banner" id="pfSelectedBanner"></div>

          <div class="pf-action-grid">
            <div class="dashboard-action-card" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('profit-hub');">
              <div class="dashboard-action-icon icon-profit">💰</div>
              <div class="dashboard-action-title">Check Profit</div>
              <div class="dashboard-action-desc">Calculate margins, shipping, and fees</div>
            </div>
            <div class="dashboard-action-card" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('supplier-center');">
              <div class="dashboard-action-icon icon-supplier">🏭</div>
              <div class="dashboard-action-title">Find Suppliers</div>
              <div class="dashboard-action-desc">Compare suppliers and ratings</div>
            </div>
            <div class="dashboard-action-card" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('competitor-intel');">
              <div class="dashboard-action-icon icon-spy">🕵️</div>
              <div class="dashboard-action-title">Spy on Competitors</div>
              <div class="dashboard-action-desc">See what others are doing</div>
            </div>
            <div class="dashboard-action-card" onclick="event.preventDefault(); window.HuntDrop.Router.navigate('marketing-hub');">
              <div class="dashboard-action-icon icon-ads">📢</div>
              <div class="dashboard-action-title">Create Ads</div>
              <div class="dashboard-action-desc">Generate winning ad copy</div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="dashboard-empty" id="pfEmptyState">
          <div class="dashboard-empty-icon">🔍</div>
          <h3>What product are you looking for?</h3>
          <p>Search across 10 platforms to find winning products. Try "trending on TikTok" or "summer gadgets".</p>
        </div>
      </div>
    `;

    container.appendChild(section);
  }

  function bindEvents() {
    const searchBtn = document.getElementById('pfSearchBtn');
    const searchInput = document.getElementById('pfSearchInput');
    const suggestions = document.querySelectorAll('.pf-suggestion');

    if (searchBtn) {
      searchBtn.addEventListener('click', () => performSearch());
    }

    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
      });
    }

    suggestions.forEach((btn) => {
      btn.addEventListener('click', () => {
        const query = btn.dataset.query;
        if (searchInput) searchInput.value = query;
        performSearch();
      });
    });

    EventBus.on('filter:changed', (data) => {
      performSearch(data.query);
    });
  }

  PluginRegistry.register('product-finder', {
    id: 'product-finder',
    name: 'Product Finder',
    version: '1.0.0',
    dependencies: [],

    init(ctx) {},

    mount(ctx) {
      render();
      bindEvents();
    },

    unmount(ctx) {
      selectedProduct = null;
      searchResults = [];
    },
  });
})();
