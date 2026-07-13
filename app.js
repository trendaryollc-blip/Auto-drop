// ============================================================================
// HUNTDROP APP — Main Orchestrator
// ============================================================================
// This file wires everything together using the core system.
// Plugins are loaded and initialized here.
// ============================================================================
(function(){
'use strict';

const {EventBus,PluginRegistry,Config,DataLayer,UI,FeatureFlags,Router} = window.HuntDrop;

// ===== Debounce Utility =====
function debounce(fn, delay) {
  var timer;
  return function() {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
  };
}

// ===== Chart.js Fallback Guard =====
if (typeof Chart === 'undefined') {
  window.Chart = function() { return { destroy: function(){} }; };
  window.Chart.prototype = {};
  console.warn('[HuntDrop] Chart.js not loaded. Charts will be disabled.');
}

// ===== Global Error Handlers =====
window.onerror = function(msg, url, line, col, error) {
  console.error('[HuntDrop] Uncaught error:', msg, 'at', url + ':' + line);
  return false;
};
window.addEventListener('unhandledrejection', function(e) {
  console.error('[HuntDrop] Unhandled promise rejection:', e.reason);
  e.preventDefault();
});

// ===== Default Config =====
Config.defaults('app', {
  name: 'HuntDrop AI',
  version: '3.0.0',
  defaultSection: 'dashboard'
});
Config.defaults('search', {
  platforms: ['all','aliexpress','amazon','shopify','ebay','temu','tiktok','etsy','cjdropshipping','dhgate','wish'],
  defaultPlatform: 'all',
  sortBy: 'score'
});

// ===== localStorage Persistence =====
function loadPersistedState() {
  try {
    var saved = localStorage.getItem('huntdrop_state');
    if (saved) {
      var state = JSON.parse(saved);
      if (state.search) Config.set('search', Object.assign(Config.get('search') || {}, state.search));
      if (state.lastSection) Config.set('app.currentSection', state.lastSection);
    }
  } catch(e) {}
}
function persistState() {
  try {
    var state = {
      search: {
        lastQuery: Config.get('search.lastQuery', ''),
        defaultPlatform: Config.get('search.defaultPlatform', 'all'),
        sortBy: Config.get('search.sortBy', 'score')
      },
      lastSection: Config.get('app.currentSection', 'section-dashboard')
    };
    localStorage.setItem('huntdrop_state', JSON.stringify(state));
  } catch(e) {}
}
loadPersistedState();
window.addEventListener('beforeunload', persistState);

// ===== Feature Flags =====
FeatureFlags.register('darkMode', true);
FeatureFlags.register('aiAnalysis', true);
FeatureFlags.register('adStudio', true);
FeatureFlags.register('profitCalc', true);

// ===== Navigation History =====
window.HuntDrop._navHistory = [];
window.HuntDrop._navMaxHistory = 20;

window.HuntDrop.navigateTo = function(sectionId, skipHistory) {
  const current = Config.get('app.currentSection', 'section-dashboard');
  if (!skipHistory && current && current !== sectionId) {
    window.HuntDrop._navHistory.push(current);
    if (window.HuntDrop._navHistory.length > window.HuntDrop._navMaxHistory) {
      window.HuntDrop._navHistory.shift();
    }
  }
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.add('active');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  Config.set('app.currentSection', sectionId);
  const name = sectionId.replace('section-', '');
  document.querySelectorAll('.nav-link[data-section]').forEach(l => {
    if (l.dataset.section === name) l.classList.add('active');
  });
  window.HuntDrop._updateBackBtn();
};

window.HuntDrop.goBack = function() {
  if (window.HuntDrop._navHistory.length === 0) return;
  const prev = window.HuntDrop._navHistory.pop();
  window.HuntDrop.navigateTo(prev, true);
};

window.HuntDrop._updateBackBtn = function() {
  const btn = document.getElementById('navBackBtn');
  if (btn) {
    btn.style.display = window.HuntDrop._navHistory.length > 0 ? 'flex' : 'none';
  }
};

// ===== Navigation =====
function setupNavigation() {
  // Helper to navigate to a section (pushes to history)
  function navigateToSection(section) {
    window.HuntDrop.navigateTo('section-' + section);
    closeAllDropdowns();
  }

  // Close all dropdowns
  function closeAllDropdowns() {
    document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
  }

  // Only bind these once (use a flag)
  if (window._navSetup) return;
  window._navSetup = true;

  // EVENT DELEGATION: Handle all nav clicks from the nav container
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    navLinks.addEventListener('click', (e) => {
      // Find the closest clickable element
      const dropdownItem = e.target.closest('.nav-dropdown-item[data-section]');
      const navLink = e.target.closest('.nav-link[data-section]');
      const dropdownTrigger = e.target.closest('.nav-dropdown-trigger');

      // Dropdown item click → navigate
      if (dropdownItem) {
        e.preventDefault();
        e.stopPropagation();
        const section = dropdownItem.dataset.section;

        navigateToSection(section);
        return;
      }

      // Direct nav link click (Dashboard) → navigate
      if (navLink && !dropdownTrigger) {
        e.preventDefault();
        navigateToSection(navLink.dataset.section);
        return;
      }

      // Dropdown trigger click → toggle dropdown
      if (dropdownTrigger) {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = dropdownTrigger.closest('.nav-dropdown');
        const isOpen = dropdown.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) dropdown.classList.add('open');
        return;
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown')) closeAllDropdowns();
  });

  // Quick tools card clicks (event delegation on the categories container)
  const qtCategories = document.querySelector('.qt-categories');
  if (qtCategories) {
    qtCategories.addEventListener('click', (e) => {
      const card = e.target.closest('.qt-card[data-section]');
      if (card) {
        e.preventDefault();
        navigateToSection(card.dataset.section);
      }
    });
  }

  // Quick tools tab filtering (show/hide category groups)
  const qtTabs = document.querySelector('.quick-tools-tabs');
  if (qtTabs) {
    qtTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.qt-tab');
      if (!tab) return;
      document.querySelectorAll('.qt-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.cat;
      document.querySelectorAll('.qt-category').forEach(group => {
        if (cat === 'all' || group.dataset.cat === cat) {
          group.classList.add('qt-visible');
        } else {
          group.classList.remove('qt-visible');
        }
      });
    });
  }

  // KPI card clicks — navigate to linked sections or scroll to dashboard anchors
  const kpiBar = document.querySelector('.kpi-bar');
  if (kpiBar) {
    kpiBar.addEventListener('click', (e) => {
      const card = e.target.closest('.kpi-card[data-section]');
      if (!card) return;
      e.preventDefault();
      // If this KPI card links to search but specifies a platform, pre-filter it
      if (card.dataset.section === 'section-search' && card.dataset.platform) {
        var plat = card.dataset.platform;
        var platSelect = document.getElementById('platformSelect') || document.getElementById('searchPagePlatform');
        if (platSelect) platSelect.value = plat;
        var input = document.getElementById('searchPageInput') || document.getElementById('searchInput');
        if (input) input.value = '';
        if (window.HuntDrop) {
          window.HuntDrop.navigateTo('section-search');
        }
        return;
      }
      // Scroll-to behavior (stay on dashboard but scroll to element)
      if (card.dataset.scrollTo) {
        var target = document.getElementById(card.dataset.scrollTo);
        if (target) {
          // Ensure dashboard section is active
          if (window.HuntDrop) {
            window.HuntDrop.navigateTo('section-dashboard');
          }
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      // Standard section navigation
      navigateToSection(card.dataset.section.replace('section-', ''));
    });
  }
}

// ===== Search & Filters =====
function setupSearch() {
  const searchInput = UI.$('searchInput');
  const searchBtn = UI.$('searchBtn');
  const platformSelect = UI.$('platformSelect');
  const sortSelect = UI.$('sortSelect');
  const priceRange = UI.$('priceRange');
  const scoreRange = UI.$('scoreRange');
  const scoreValue = UI.$('scoreValue');
  const resetBtn = UI.$('resetFilters');

  // Search page elements
  const searchPageInput = UI.$('searchPageInput');
  const searchPageBtn = UI.$('searchPageBtn');
  const searchPagePlatform = UI.$('searchPagePlatform');
  const sortSelectSearch = UI.$('sortSelectSearch');
  const priceRangeSearch = UI.$('priceRangeSearch');
  const scoreRangeSearch = UI.$('scoreRangeSearch');
  const scoreValueSearch = UI.$('scoreValueSearch');

  const getFilters = () => ({
    platform: (searchPagePlatform?.value || platformSelect?.value || 'all'),
    priceMax: parseInt(UI.$('priceMax')?.value || UI.$('priceMaxSearch')?.value) || parseInt(priceRange?.value || priceRangeSearch?.value) || 200,
    margin: document.querySelector('.sr-pill[data-margin].active')?.dataset.margin || document.querySelector('.margin-btn.active')?.dataset.margin || 'all',
    competition: document.querySelector('.sr-pill.comp-pill[data-comp].active')?.dataset.comp || document.querySelector('.comp-btn.active')?.dataset.comp || 'all',
    sort: (sortSelectSearch?.value || sortSelect?.value || 'score'),
    minScore: parseInt(scoreRange?.value || scoreRangeSearch?.value) || 0
  });

  const doSearch = () => {
    const input = searchPageInput || searchInput;
    const query = input?.value?.trim() || '';
    Config.set('search.lastQuery', query);
    // Sync inputs across pages
    if (searchInput && input !== searchInput) searchInput.value = query;
    if (searchPageInput && input !== searchPageInput) searchPageInput.value = query;
    EventBus.emit('filter:changed', { filters: getFilters(), query });
    // Navigate to search results page
    window.HuntDrop.navigateTo('section-search');
  };

  // Note: search:results is handled by product-grid plugin.
  // app.js only orchestrates — plugins do the rendering.

  // Dashboard search handlers
  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  if (searchInput) searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });

  // Search page handlers
  if (searchPageBtn) searchPageBtn.addEventListener('click', doSearch);
  if (searchPageInput) searchPageInput.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });
  if (searchPagePlatform) searchPagePlatform.addEventListener('change', doSearch);
  if (sortSelectSearch) sortSelectSearch.addEventListener('change', doSearch);

  // Shared filter handlers
  if (platformSelect) platformSelect.addEventListener('change', doSearch);
  if (sortSelect) sortSelect.addEventListener('change', doSearch);
  if (priceRange) priceRange.addEventListener('input', (e) => {
    var pm = UI.$('priceMax'); if(pm) pm.value = e.target.value;
    var prVal = document.getElementById('priceRangeVal');
    if (prVal) prVal.textContent = '$' + e.target.value;
    doSearch();
  });
  if (priceRangeSearch) priceRangeSearch.addEventListener('input', (e) => {
    var pm = UI.$('priceMaxSearch'); if(pm) pm.value = e.target.value;
    doSearch();
  });
  if (scoreRange) scoreRange.addEventListener('input', (e) => {
    if (scoreValue) scoreValue.textContent = e.target.value;
    doSearch();
  });
  if (scoreRangeSearch) scoreRangeSearch.addEventListener('input', (e) => {
    if (scoreValueSearch) scoreValueSearch.textContent = e.target.value;
    doSearch();
  });

  // Search chips
  document.querySelectorAll('.search-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (searchInput) searchInput.value = chip.dataset.query;
      doSearch();
    });
  });

  // Filter buttons — margin pills
  document.querySelectorAll('.sr-pill[data-margin]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sr-pill[data-margin]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      doSearch();
    });
  });
  // Filter buttons — competition pills
  document.querySelectorAll('.sr-pill.comp-pill[data-comp]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sr-pill.comp-pill[data-comp]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      doSearch();
    });
  });

  // Rating stars
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      const r = parseInt(star.dataset.rating);
      document.querySelectorAll('.star').forEach(s => s.classList.toggle('active', parseInt(s.dataset.rating) <= r));
    });
  });

  // View toggles
  document.querySelectorAll('.sr-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sr-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const grid = UI.$('productsGrid');
      if (!grid) return;
      const isList = btn.dataset.view === 'list';
      grid.classList.toggle('list-view', isList);
      if (isList) {
        grid.style.setProperty('grid-template-columns', '1fr', 'important');
      } else {
        grid.style.setProperty('grid-template-columns', 'repeat(auto-fill, minmax(240px, 1fr))', 'important');
      }
    });
  });

  // Reset
  if (resetBtn) resetBtn.addEventListener('click', () => {
    const input = searchPageInput || searchInput;
    if (input) input.value = '';
    if (platformSelect) platformSelect.value = 'all';
    if (searchPagePlatform) searchPagePlatform.value = 'all';
    if (sortSelect) sortSelect.value = 'score';
    if (sortSelectSearch) sortSelectSearch.value = 'score';
    if (priceRange) priceRange.value = 200;
    if (priceRangeSearch) priceRangeSearch.value = 200;
    if (scoreRange) { scoreRange.value = 0; if (scoreValue) scoreValue.textContent = '0'; }
    if (scoreRangeSearch) { scoreRangeSearch.value = 0; if (scoreValueSearch) scoreValueSearch.textContent = '0'; }
    var pm1 = UI.$('priceMin'); if(pm1) pm1.value = '';
    var pm2 = UI.$('priceMax'); if(pm2) pm2.value = '';
    document.querySelectorAll('.sr-pill[data-margin]').forEach((b, i) => b.classList.toggle('active', i === 0));
    document.querySelectorAll('.sr-pill.comp-pill[data-comp]').forEach((b, i) => b.classList.toggle('active', i === 0));
    doSearch();
  });

  UI.$('priceMin')?.addEventListener('input', debounce(doSearch, 300));
  UI.$('priceMax')?.addEventListener('input', debounce(function(e) {
    var pr = priceRange || priceRangeSearch;
    if (pr) pr.value = e.target.value || 200;
    doSearch();
  }, 300));
}

// ===== Product Modal (disabled — product-detail plugin handles product views now) =====
function setupProductModal() {
  // Product detail is now handled by plugins/product-detail.js
  // Keep this function for backward compatibility but remove the modal handler
  const closeBtn = document.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => UI.closeModal());
}

function generateModalContent(p) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtN = n => n>=1000?(n/1000).toFixed(1)+'K':n.toString();
  const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
  const esc = s => UI.escapeHtml(s);
  const compColor = c => ({low:'var(--accent-green)',medium:'var(--accent-yellow)',high:'var(--accent-red)'}[c]);
  const platColor = pl => ({aliexpress:'#e62e04',amazon:'#ff9900',shopify:'#96bf48',ebay:'#e53238',temu:'#fb7701',tiktok:'#00f2ea',etsy:'#f1641e',cjdropshipping:'#40c351',dhgate:'#e62e04',wish:'#2fb7ec'}[pl]||'#888');

  return `
    <div class="modal-hero">
      <div class="modal-image"><img src="${esc(p.image)}" alt="${esc(p.title)}"></div>
      <div class="modal-info">
        <h2 class="modal-title">${esc(p.title)}</h2>
        <div class="modal-price-row">
          <span class="modal-price">$${p.price.toFixed(2)}</span>
          <span class="modal-original-price">$${p.originalPrice.toFixed(2)}</span>
          <span class="modal-margin-badge">${p.margin}% profit</span>
        </div>
        <div class="modal-stats-grid">
          <div class="modal-stat"><span class="modal-stat-value" style="color:var(--accent-green)">${p.score}</span><span class="modal-stat-label">AI Score</span></div>
          <div class="modal-stat"><span class="modal-stat-value">${fmtN(p.salesVelocity)}</span><span class="modal-stat-label">Sales/mo</span></div>
          <div class="modal-stat"><span class="modal-stat-value">${p.rating}★</span><span class="modal-stat-label">${fmtN(p.reviews)} reviews</span></div>
          <div class="modal-stat"><span class="modal-stat-value">${p.orders}</span><span class="modal-stat-label">Total Orders</span></div>
        </div>
      </div>
    </div>
    <div class="modal-section"><h3 class="modal-section-title"><span class="section-icon icon-cyan">📈</span>12-Month Sales Trend</h3><div class="chart-container"><canvas id="salesChart"></canvas></div></div>
    <div class="modal-section"><h3 class="modal-section-title"><span class="section-icon icon-green">💲</span>Cross-Platform Prices</h3><div class="platform-comparison">${Object.entries(p.platformPrices).map(([pl,pr])=>`<div class="platform-row"><span class="platform-name"><span class="platform-dot" style="background:${platColor(pl)}"></span>${esc(cap(pl))}</span><span class="platform-price">$${pr.toFixed(2)}</span></div>`).join('')}</div></div>
    <div class="modal-section"><h3 class="modal-section-title"><span class="section-icon icon-purple">📊</span>Price Distribution</h3><div class="chart-container"><canvas id="priceChart"></canvas></div></div>
    <div class="modal-section"><h3 class="modal-section-title"><span class="section-icon icon-orange">🔥</span>Market Analytics</h3><div class="demand-grid">
      <div class="demand-card demand-card-high"><div class="demand-value" style="color:var(--accent-green)">${p.demand}</div><div class="demand-label">Demand</div><div class="demand-trend trend-up">↑ +${5+Math.floor(Math.random()*15)}%</div></div>
      <div class="demand-card demand-card-${p.competition==='high'?'low':p.competition==='medium'?'medium':'high'}"><div class="demand-value" style="color:${compColor(p.competition)}">${esc(cap(p.competition))}</div><div class="demand-label">Competition</div><div class="demand-trend ${p.competition==='low'?'trend-up':p.competition==='medium'?'trend-stable':'trend-down'}">${p.competition==='low'?'↓ Low barrier':p.competition==='medium'?'→ Moderate':'↑ Saturated'}</div></div>
      <div class="demand-card demand-card-high"><div class="demand-value" style="color:var(--accent-orange)">${p.marketSaturation}%</div><div class="demand-label">Saturation</div><div class="demand-trend ${p.marketSaturation<40?'trend-up':'trend-stable'}">${p.marketSaturation<40?'↓ Unsaturated':'→ Moderate'}</div></div>
      <div class="demand-card demand-card-high"><div class="demand-value" style="color:var(--accent-cyan)">${fmtN(p.salesVelocity)}</div><div class="demand-label">Monthly Sales</div><div class="demand-trend trend-up">↑ +${8+Math.floor(Math.random()*12)}%</div></div>
      <div class="demand-card demand-card-${p.riskScore<30?'high':p.riskScore<50?'medium':'low'}"><div class="demand-value" style="color:${p.riskScore<30?'var(--accent-green)':p.riskScore<50?'var(--accent-yellow)':'var(--accent-red)'}">${p.riskScore}/100</div><div class="demand-label">Risk Score</div><div class="demand-trend ${p.riskScore<30?'trend-up':'trend-stable'}">${p.riskScore<30?'✓ Low Risk':'→ Medium'}</div></div>
      <div class="demand-card demand-card-high"><div class="demand-value" style="color:var(--accent-cyan);font-size:16px">${esc(p.audience.age)}</div><div class="demand-label">Target Age</div></div>
    </div></div>
    <div class="modal-section"><h3 class="modal-section-title"><span class="section-icon icon-cyan">💡</span>Profit Breakdown</h3><div class="chart-container"><canvas id="profitChart"></canvas></div></div>
    <div class="modal-section"><h3 class="modal-section-title"><span class="section-icon icon-purple">📅</span>Seasonal Demand</h3><div class="chart-container"><canvas id="seasonChart"></canvas></div></div>
    <div class="modal-section"><h3 class="modal-section-title"><span class="section-icon icon-green">🏭</span>Suppliers</h3><div class="supplier-cards">${p.suppliers.map(s=>`<div class="supplier-card"><div class="supplier-card-header"><div class="supplier-avatar">${esc(s.name.charAt(0))}</div><div><div class="supplier-name">${esc(s.name)}</div><div class="supplier-location">${esc(s.location)}</div></div></div><div class="supplier-stats"><div class="supplier-stat"><span class="supplier-stat-label">Rating</span><span class="supplier-stat-value" style="color:var(--accent-yellow)">${s.rating}★</span></div><div class="supplier-stat"><span class="supplier-stat-label">Orders</span><span class="supplier-stat-value">${esc(s.orders)}</span></div><div class="supplier-stat"><span class="supplier-stat-label">Response</span><span class="supplier-stat-value">${esc(s.responseTime)}</span></div><div class="supplier-stat"><span class="supplier-stat-label">Status</span><span class="supplier-stat-value" style="color:${s.verified?'var(--accent-green)':'var(--accent-orange)'}">${s.verified?'✓ Verified':'Pending'}</span></div></div></div>`).join('')}</div></div>
    <div class="modal-section"><h3 class="modal-section-title"><span class="section-icon icon-cyan">✦</span>AI Insight</h3><div style="padding:16px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);"><p class="ai-text">${esc(p.aiInsight)}</p><div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:5px">${p.keywords.slice(0,5).map(k=>`<span class="ai-tag">${esc(k)}</span>`).join('')}</div></div></div>`;
}

function renderModalCharts(p) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const chartOpts = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{backgroundColor:'#111119',borderColor:'#2a2a3d',borderWidth:1,titleFont:{family:'Outfit',size:11},bodyFont:{family:'JetBrains Mono',size:12},padding:10,displayColors:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9}}},y:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9}}}} };

  // Sales chart
  const sc = document.getElementById('salesChart');
  if (sc) new Chart(sc, { type:'line', data:{labels:months,datasets:[{data:p.trendData,borderColor:'#00e5ff',backgroundColor:'rgba(0,229,255,0.06)',borderWidth:2,fill:true,tension:0.4,pointBackgroundColor:'#00e5ff',pointBorderColor:'#06060c',pointBorderWidth:2,pointRadius:3}]}, options:{...chartOpts,interaction:{intersect:false,mode:'index'}} });

  // Price chart
  const pc = document.getElementById('priceChart');
  if (pc) { const labels=Object.keys(p.platformPrices).map(s=>s.charAt(0).toUpperCase()+s.slice(1)); new Chart(pc, { type:'bar', data:{labels,datasets:[{data:Object.values(p.platformPrices),backgroundColor:'rgba(0,229,255,0.4)',borderColor:'#00e5ff',borderWidth:1,borderRadius:5}]}, options:{...chartOpts,scales:{...chartOpts.scales,y:{...chartOpts.scales.y,ticks:{...chartOpts.scales.y.ticks,callback:v=>'$'+v.toFixed(0)}}}} }); }

  // Profit chart
  const prc = document.getElementById('profitChart');
  if (prc) { const sp=p.platformPrices.amazon,cost=p.price,ship=2.50,ads=sp*0.15,profit=sp-cost-ship-ads; new Chart(prc, { type:'bar', data:{labels:['Sell Price','Cost','Shipping','Ads','Net Profit'],datasets:[{data:[sp,-cost,-ship,-ads,profit],backgroundColor:['rgba(0,229,255,0.6)','rgba(255,51,102,0.6)','rgba(255,138,0,0.6)','rgba(168,85,247,0.6)',profit>0?'rgba(0,255,136,0.6)':'rgba(255,51,102,0.6)'],borderColor:['#00e5ff','#ff3366','#ff8a00','#a855f7',profit>0?'#00ff88':'#ff3366'],borderWidth:1,borderRadius:5}]}, options:{...chartOpts,scales:{...chartOpts.scales,y:{...chartOpts.scales.y,ticks:{...chartOpts.scales.y.ticks,callback:v=>'$'+v.toFixed(0)}}}} }); }

  // Season chart
  const sec = document.getElementById('seasonChart');
  if (sec) new Chart(sec, { type:'line', data:{labels:months,datasets:[{data:p.seasonality,borderColor:'#a855f7',backgroundColor:'rgba(168,85,247,0.06)',borderWidth:2,fill:true,tension:0.4,pointBackgroundColor:'#a855f7',pointBorderColor:'#06060c',pointBorderWidth:2,pointRadius:3}]}, options:{...chartOpts,scales:{...chartOpts.scales,y:{...chartOpts.scales.y,min:50,max:160}},interaction:{intersect:false,mode:'index'}} });
}



// ===== Skeleton & Empty State =====
function showSkeleton() {
  const skeleton = UI.$('productsSkeleton');
  const empty = UI.$('productsEmpty');
  const grid = UI.$('productsGrid');
  if (skeleton) skeleton.classList.add('visible');
  if (empty) empty.classList.remove('visible');
  if (grid) grid.innerHTML = '';
}

function hideSkeleton() {
  const skeleton = UI.$('productsSkeleton');
  if (skeleton) skeleton.classList.remove('visible');
}

function showEmpty() {
  const empty = UI.$('productsEmpty');
  const grid = UI.$('productsGrid');
  if (empty) empty.classList.add('visible');
  if (grid) grid.innerHTML = '';
}

// Listen for search events to toggle skeleton/empty states
EventBus.on('filter:changed', () => { showSkeleton(); });
EventBus.on('search:results', (data) => {
  hideSkeleton();
  if (!data.results || data.results.length === 0) {
    showEmpty();
  }
});

// Listen for search results to add related tools to search page
EventBus.on('search:results', function(data) {
  var container = document.getElementById('srRelatedTools');
  if (!container) return;
  var tools = [
    { section:'section-ai-analyst', name:'AI Analyst', desc:'Deep AI-powered product analysis', icon:'🧠', color:'var(--accent-purple)' },
    { section:'section-profit-lab', name:'Profit Calculator', desc:'Calculate exact profit margins', icon:'💰', color:'var(--accent-green)' },
    { section:'section-spy-center', name:'Spy Center', desc:'Spy on competitor stores', icon:'🔍', color:'var(--accent-orange)' },
    { section:'section-supplier-hub', name:'Supplier Hub', desc:'Find verified suppliers', icon:'🏭', color:'var(--accent-cyan)' }
  ];
  container.innerHTML = renderRelatedTools(tools);
});

// ===== Related Tools Helper =====
function renderRelatedTools(tools) {
  if (!tools || !tools.length) return '';
  const esc = s => UI.escapeHtml(s);
  const cards = tools.map(t => {
    const bg = t.color || 'var(--accent-cyan)';
    return `<div class="related-tool-card" onclick="window.HuntDrop.navigateTo('${esc(t.section)}')" role="button" tabindex="0">
      <div class="related-tool-icon" style="background:${esc(bg)}15;color:${esc(bg)}">${esc(t.icon||'🔗')}</div>
      <div class="related-tool-info"><div class="related-tool-name">${esc(t.name)}</div><div class="related-tool-desc">${esc(t.desc||'')}</div></div>
      <div class="related-tool-arrow">→</div>
    </div>`;
  }).join('');
  return `<div class="related-tools"><h3>🔗 Related Tools</h3><p class="related-tools-sub">Continue your workflow with these connected insights</p><div class="related-tools-grid">${cards}</div></div>`;
}
window.HuntDrop.renderRelatedTools = renderRelatedTools;

// ===== Keyboard Shortcuts =====
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      UI.closeModal();
      document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
      document.querySelectorAll('.huntdrop-tooltip').forEach(function(t){t.remove();});
    }
    if (e.key === '/' && document.activeElement?.id !== 'searchInput') {
      e.preventDefault();
      UI.$('searchInput')?.focus();
    }
    if ((e.altKey && e.key === 'ArrowLeft') || (e.key === 'Backspace' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
      e.preventDefault();
      window.HuntDrop.goBack();
    }
  });
}

// ===== First-Use Onboarding =====
function setupOnboarding() {
  try {
    if (localStorage.getItem('huntdrop_onboarded')) return;
  } catch(e) { return; }

  var tips = [
    { target: '.hero-search', text: 'Search across 10 platforms at once! Try "wireless earbuds" or "pet gadgets".', pos: 'bottom' },
    { target: '.quick-tools', text: 'Quick Access cards let you jump to any tool instantly.', pos: 'top' },
    { target: '.trending-section', text: 'Product grid updates in real-time as you search and filter.', pos: 'top' }
  ];

  var tipIndex = 0;
  function showTip() {
    if (tipIndex >= tips.length) {
      try { localStorage.setItem('huntdrop_onboarded', '1'); } catch(e) {}
      return;
    }
    var tip = tips[tipIndex];
    var el = document.querySelector(tip.target);
    if (!el) { tipIndex++; showTip(); return; }

    var overlay = document.createElement('div');
    overlay.className = 'huntdrop-tooltip';
    overlay.innerHTML = '<div class="huntdrop-tip-box">'
      + '<div class="huntdrop-tip-text">' + tip.text + '</div>'
      + '<div class="huntdrop-tip-actions">'
      + '<span class="huntdrop-tip-count">' + (tipIndex+1) + '/' + tips.length + '</span>'
      + '<button class="huntdrop-tip-next">Got it</button>'
      + '</div></div>';

    document.body.appendChild(overlay);

    var rect = el.getBoundingClientRect();
    overlay.querySelector('.huntdrop-tip-box').style.top = (rect.bottom + window.scrollY + 10) + 'px';

    overlay.querySelector('.huntdrop-tip-next').addEventListener('click', function() {
      overlay.remove();
      tipIndex++;
      showTip();
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { overlay.remove(); tipIndex++; showTip(); }
    });
  }
  setTimeout(showTip, 1500);
}

// ===== #15: Theme Toggle (Dark/Light Mode) =====
function setupThemeToggle() {
  var btn = document.getElementById('themeToggle');
  if (!btn) return;

  // Restore saved theme
  var saved = localStorage.getItem('huntdrop_theme') || 'dark';
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  btn.addEventListener('click', function() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try { localStorage.setItem('huntdrop_theme', next); } catch(e) {}
    if (window.HuntDrop.toast) window.HuntDrop.toast(next === 'light' ? '☀️ Light mode enabled' : '🌙 Dark mode enabled', 'info');
  });
}

// ===== #16: Error Boundaries — User-facing error messages =====
function setupErrorBoundaries() {
  window.addEventListener('error', function(e) {
    showErrorBanner('JavaScript Error', e.message + ' at ' + (e.filename || '').split('/').pop() + ':' + e.lineno);
  });
  window.addEventListener('unhandledrejection', function(e) {
    showErrorBanner('Promise Error', (e.reason && e.reason.message) || 'An async operation failed');
  });
}

function showErrorBanner(title, detail) {
  var existing = document.getElementById('hd-error-banner');
  if (existing) return; // Don't stack errors
  var banner = document.createElement('div');
  banner.id = 'hd-error-banner';
  banner.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:10001;background:var(--bg-card);border:1px solid var(--accent-red);border-radius:var(--radius-md);padding:12px 20px;max-width:500px;width:90%;box-shadow:0 8px 32px rgba(255,51,102,0.2);display:flex;align-items:center;gap:12px;animation:fadeUp 0.3s ease';
  banner.innerHTML = '<span style="font-size:20px">⚠️</span>' +
    '<div style="flex:1;min-width:0">' +
      '<div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--accent-red);margin-bottom:2px">' + title + '</div>' +
      '<div style="font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + detail + '</div>' +
    '</div>' +
    '<button onclick="this.parentElement.remove()" style="background:none;border:1px solid var(--border-primary);border-radius:var(--radius-sm);color:var(--text-muted);padding:4px 10px;font-size:11px;cursor:pointer;flex-shrink:0">Dismiss</button>';
  document.body.appendChild(banner);
  setTimeout(function() { if (banner.parentElement) banner.remove(); }, 8000);
}

// ===== #17: Plugin Loading States =====
function showPluginLoading(sectionId, message) {
  var section = document.getElementById(sectionId);
  if (!section) return;
  var loader = section.querySelector('.plugin-loading-state');
  if (loader) return;
  var div = document.createElement('div');
  div.className = 'plugin-loading-state';
  div.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:10px;padding:40px 20px;color:var(--text-secondary);font-size:14px';
  div.innerHTML = '<div class="ph-scan-spinner" style="width:18px;height:18px;border:2px solid var(--border-primary);border-top-color:var(--accent-cyan);border-radius:50%;animation:spin 0.8s linear infinite"></div>' +
    '<span>' + (message || 'Loading...') + '</span>';
  var inner = section.querySelector('.section-inner');
  if (inner) inner.appendChild(div);
}

function hidePluginLoading(sectionId) {
  var section = document.getElementById(sectionId);
  if (!section) return;
  var loader = section.querySelector('.plugin-loading-state');
  if (loader) loader.remove();
}

window.HuntDrop.showPluginLoading = showPluginLoading;
window.HuntDrop.hidePluginLoading = hidePluginLoading;
window.HuntDrop.showErrorBanner = showErrorBanner;

// ===== #18: Export Helpers for All Tools =====
window.HuntDrop.exportCSV = function(headers, rows, filename) {
  var csv = [headers].concat(rows).map(function(r) {
    return r.map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'huntdrop-export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
};

window.HuntDrop.exportJSON = function(data, filename) {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'huntdrop-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

// ===== Utility: Debounce =====
function debounce(fn, delay) {
  var timer;
  return function() {
    var ctx = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
  };
}

// ===== #1: KPI Stats Bar =====
function setupKPIBar() {
  var saved = parseInt(localStorage.getItem('huntdrop_saved_count') || '0');
  var analyses = parseInt(localStorage.getItem('huntdrop_analysis_count') || '0');
  var savedEl = document.getElementById('kpiSaved');
  var analysesEl = document.getElementById('kpiAnalyses');
  if (savedEl) savedEl.textContent = saved;
  if (analysesEl) analysesEl.textContent = analyses;

  // Listen for product saves and analyses
  EventBus.on('product:saved', function() {
    var count = parseInt(localStorage.getItem('huntdrop_saved_count') || '0') + 1;
    localStorage.setItem('huntdrop_saved_count', count);
    var el = document.getElementById('kpiSaved');
    if (el) el.textContent = count;
  });
  EventBus.on('product:analyze', function() {
    var count = parseInt(localStorage.getItem('huntdrop_analysis_count') || '0') + 1;
    localStorage.setItem('huntdrop_analysis_count', count);
    var el = document.getElementById('kpiAnalyses');
    if (el) el.textContent = count;
  });

  // Animate number counting on load
  animateKPINumber('kpiProducts', 48291, 1200);
  animateKPINumber('kpiTrending', 127, 800);
}

function animateKPINumber(id, target, duration) {
  var el = document.getElementById(id);
  if (!el) return;
  var start = 0;
  var startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    var progress = Math.min((ts - startTime) / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
    var current = Math.floor(eased * target);
    el.textContent = current >= 1000 ? current.toLocaleString() : current;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}



// ===== #5: Quick Tools Collapse =====
function setupQuickToolsCollapse() {
  var toggle = document.getElementById('qtCollapseToggle');
  var section = toggle ? toggle.closest('.quick-tools') : null;
  if (!toggle || !section) return;
  toggle.addEventListener('click', function() {
    section.classList.toggle('collapsed');
  });
}

// ===== #6: Welcome State =====
function setupWelcomeState() {
  var card = document.getElementById('welcomeCard');
  if (!card) return;
  try {
    if (localStorage.getItem('huntdrop_welcome_dismissed')) return;
  } catch(e) { return; }

  card.style.display = 'block';

  var closeBtn = document.getElementById('welcomeClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      card.style.display = 'none';
      try { localStorage.setItem('huntdrop_welcome_dismissed', '1'); } catch(e) {}
    });
  }

  var searchBtn = document.getElementById('welcomeSearchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      var input = document.getElementById('searchInput');
      if (input) {
        input.value = 'wireless earbuds';
        input.dispatchEvent(new Event('keypress'));
        // Trigger search
        var btn = document.getElementById('searchBtn');
        if (btn) btn.click();
      }
      completeWelcomeStep(2);
    });
  }

  // Track progress
  updateWelcomeProgress();
}

function completeWelcomeStep(num) {
  try {
    var steps = JSON.parse(localStorage.getItem('huntdrop_welcome_steps') || '{}');
    steps[num] = true;
    localStorage.setItem('huntdrop_welcome_steps', JSON.stringify(steps));
  } catch(e) {}
  updateWelcomeProgress();
}

function updateWelcomeProgress() {
  try {
    var steps = JSON.parse(localStorage.getItem('huntdrop_welcome_steps') || '{}');
    var count = Object.keys(steps).filter(function(k) { return steps[k]; }).length;
    var bar = document.getElementById('welcomeProgress');
    var text = document.getElementById('welcomeProgressText');
    if (bar) bar.style.width = (count / 3 * 100) + '%';
    if (text) text.textContent = count + '/3 completed';
    for (var i = 1; i <= 3; i++) {
      var el = document.getElementById('welcomeStep' + i);
      if (el) el.classList.toggle('completed', !!steps[i]);
    }
  } catch(e) {}
}

// ===== #3: Recent Searches =====
var RECENT_SEARCHES_KEY = 'huntdrop_recent_searches';
var MAX_RECENT = 8;

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch(e) { return []; }
}

function saveRecentSearch(query) {
  if (!query || !query.trim()) return;
  var recent = getRecentSearches().filter(function(r) { return r.query !== query; });
  recent.unshift({ query: query, time: Date.now() });
  if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent)); } catch(e) {}
  renderRecentSearches();
}

function renderRecentSearches() {
  var recent = getRecentSearches();
  // Recent chips in hero
  var chipsContainer = document.getElementById('recentChips');
  if (chipsContainer) {
    if (recent.length > 0) {
      chipsContainer.style.display = 'flex';
      chipsContainer.innerHTML = recent.slice(0, 5).map(function(r) {
        return '<span class="recent-chip" data-query="' + r.query.replace(/"/g, '"') + '"><span class="rc-icon">🕒</span>' + r.query + '</span>';
      }).join('');
      // Bind click
      chipsContainer.querySelectorAll('.recent-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          var input = document.getElementById('searchInput');
          if (input) input.value = chip.dataset.query;
          var btn = document.getElementById('searchBtn');
          if (btn) btn.click();
        });
      });
    } else {
      chipsContainer.style.display = 'none';
    }
  }

  // Recent searches section
  var section = document.getElementById('recentSearchesSection');
  var itemsContainer = document.getElementById('recentItems');
  if (section && itemsContainer) {
    if (recent.length > 0) {
      section.style.display = 'block';
      itemsContainer.innerHTML = recent.slice(0, 6).map(function(r) {
        var ago = getTimeAgo(r.time);
        return '<div class="recent-item" data-query="' + r.query.replace(/"/g, '"') + '"><span class="recent-item-icon">🔍</span><span>' + r.query + '</span><span class="recent-item-time">' + ago + '</span></div>';
      }).join('');
      itemsContainer.querySelectorAll('.recent-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var input = document.getElementById('searchInput');
          if (input) input.value = item.dataset.query;
          var btn = document.getElementById('searchBtn');
          if (btn) btn.click();
        });
      });
    } else {
      section.style.display = 'none';
    }
  }

  // Search dropdown recent items
  renderSearchDropdown();
}

function getTimeAgo(ts) {
  var diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

function setupClearRecentSearches() {
  var btn = document.getElementById('clearRecentSearches');
  if (btn) {
    btn.addEventListener('click', function() {
      try { localStorage.removeItem(RECENT_SEARCHES_KEY); } catch(e) {}
      renderRecentSearches();
    });
  }
}

// ===== #2: Trending Products =====
function setupTrendingProducts() {
  var grid = document.getElementById('trendingGrid');
  if (!grid) return;

  var trendingData = [
    { title: 'Wireless Earbuds Pro', price: '$12.99', score: 92, badge: 'hot', badgeText: '🔥 Hot', image: 'https://picsum.photos/seed/trend1/100/100' },
    { title: 'Smart Posture Corrector', price: '$8.49', score: 87, badge: 'viral', badgeText: '🚀 Viral', image: 'https://picsum.photos/seed/trend2/100/100' },
    { title: 'Mini Portable Projector', price: '$29.99', score: 85, badge: 'hot', badgeText: '🔥 Hot', image: 'https://picsum.photos/seed/trend3/100/100' },
    { title: 'LED Galaxy Night Light', price: '$6.99', score: 91, badge: 'new', badgeText: '✨ New', image: 'https://picsum.photos/seed/trend4/100/100' },
    { title: 'Pet GPS Tracker Collar', price: '$15.99', score: 88, badge: 'viral', badgeText: '🚀 Viral', image: 'https://picsum.photos/seed/trend5/100/100' },
    { title: 'Car Phone Mount Magnetic', price: '$4.99', score: 83, badge: 'hot', badgeText: '🔥 Hot', image: 'https://picsum.photos/seed/trend6/100/100' },
    { title: 'Kitchen Herb Garden Kit', price: '$11.49', score: 86, badge: 'new', badgeText: '✨ New', image: 'https://picsum.photos/seed/trend7/100/100' },
    { title: 'Resistance Band Set Pro', price: '$9.99', score: 84, badge: 'hot', badgeText: '🔥 Hot', image: 'https://picsum.photos/seed/trend8/100/100' }
  ];

  grid.innerHTML = trendingData.map(function(item, i) {
    return '<div class="trending-card" style="animation-delay:' + (i * 0.05) + 's">' +
      '<div class="trending-card-image"><img src="' + item.image + '" alt="' + item.title + '" loading="lazy"></div>' +
      '<div class="trending-card-info">' +
        '<div class="trending-card-title">' + item.title + '</div>' +
        '<div class="trending-card-meta">' +
          '<span class="trending-card-price">' + item.price + '</span>' +
          '<span class="trending-card-score">' + item.score + '</span>' +
          '<span class="trending-card-badge trending-badge-' + item.badge + '">' + item.badgeText + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  // Click to search
  grid.querySelectorAll('.trending-card').forEach(function(card) {
    card.addEventListener('click', function() {
      var title = card.querySelector('.trending-card-title');
      if (title) {
        var input = document.getElementById('searchInput');
        if (input) input.value = title.textContent;
        var btn = document.getElementById('searchBtn');
        if (btn) btn.click();
      }
    });
  });

  // Refresh button
  var refreshBtn = document.getElementById('trendingRefresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      grid.style.opacity = '0.5';
      setTimeout(function() {
        grid.style.opacity = '1';
        // Shuffle the data
        trendingData.sort(function() { return Math.random() - 0.5; });
        grid.innerHTML = trendingData.map(function(item, i) {
          return '<div class="trending-card" style="animation-delay:' + (i * 0.05) + 's">' +
            '<div class="trending-card-image"><img src="' + item.image + '" alt="' + item.title + '" loading="lazy"></div>' +
            '<div class="trending-card-info">' +
              '<div class="trending-card-title">' + item.title + '</div>' +
              '<div class="trending-card-meta">' +
                '<span class="trending-card-price">' + item.price + '</span>' +
                '<span class="trending-card-score">' + item.score + '</span>' +
                '<span class="trending-card-badge trending-badge-' + item.badge + '">' + item.badgeText + '</span>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      }, 500);
    });
  }
}

// ===== #7: Filter Panel Mobile Toggle =====
function setupFilterMobileToggle() {
  var toggleBtn = document.getElementById('filterMobileToggle');
  var panel = document.getElementById('filtersPanel');
  var overlay = document.getElementById('filterOverlay');
  var closeBtn = document.getElementById('filterClose');
  if (!toggleBtn || !panel) return;

  function openFilters() {
    panel.classList.add('mobile-open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeFilters() {
    panel.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', openFilters);
  if (overlay) overlay.addEventListener('click', closeFilters);
  if (closeBtn) closeBtn.addEventListener('click', closeFilters);

  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeFilters();
  });
}

// ===== #8: Product Card Quick Actions =====
function addQuickActionsToCards() {
  var grid = document.getElementById('productsGrid');
  if (!grid) return;
  var cards = grid.querySelectorAll('.product-card');
  var savedProducts = getSavedProducts();

  cards.forEach(function(card) {
    if (card.querySelector('.card-quick-actions')) return; // already added
    var productId = card.dataset.productId || '';
    var isSaved = savedProducts.indexOf(productId) !== -1;
    var actions = document.createElement('div');
    actions.className = 'card-quick-actions';
    actions.innerHTML =
      '<button class="quick-action-btn qa-save ' + (isSaved ? 'saved' : '') + '" data-id="' + productId + '" title="Save">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isSaved ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
      '</button>' +
      '<button class="quick-action-btn qa-analyze" data-id="' + productId + '" title="Quick Analyze">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20.66 6A10 10 0 0 0 12 2v10h10a10 10 0 0 0-1.34-6z"/></svg>' +
      '</button>' +
      '<button class="quick-action-btn qa-profit" data-id="' + productId + '" title="Profit Calculator">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' +
      '</button>' +
      '<button class="quick-action-btn qa-share" data-id="' + productId + '" title="Share">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
      '</button>';
    card.appendChild(actions);

    // Stop card click when clicking actions
    actions.addEventListener('click', function(e) {
      e.stopPropagation();
      var btn = e.target.closest('.quick-action-btn');
      if (!btn) return;

      if (btn.classList.contains('qa-save')) {
        toggleSaveProduct(productId);
        btn.classList.toggle('saved');
        var svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', btn.classList.contains('saved') ? 'currentColor' : 'none');
      } else if (btn.classList.contains('qa-analyze')) {
        EventBus.emit('product:analyze', { id: productId });
      } else if (btn.classList.contains('qa-profit')) {
        window.HuntDrop.navigateTo('section-profit-lab');
      } else if (btn.classList.contains('qa-share')) {
        if (navigator.share) {
          navigator.share({ title: 'HuntDrop Product', text: 'Check out this product on HuntDrop AI!' }).catch(function() {});
        } else {
          // Fallback: copy to clipboard
          navigator.clipboard.writeText(window.location.href).then(function() {
            if (window.HuntDrop.toast) window.HuntDrop.toast('Link copied to clipboard!', 'success');
          }).catch(function() {});
        }
      }
    });
  });
}

function getSavedProducts() {
  try { return JSON.parse(localStorage.getItem('huntdrop_saved_products') || '[]'); } catch(e) { return []; }
}

function toggleSaveProduct(id) {
  var saved = getSavedProducts();
  var idx = saved.indexOf(id);
  if (idx !== -1) {
    saved.splice(idx, 1);
  } else {
    saved.push(id);
    EventBus.emit('product:saved');
  }
  try { localStorage.setItem('huntdrop_saved_products', JSON.stringify(saved)); } catch(e) {}
}

// Listen for new search results to add quick actions
EventBus.on('search:results', function() {
  setTimeout(addQuickActionsToCards, 100);
});

// ===== #11: Enhanced Empty State =====
function setupEmptyStateSuggestions() {
  document.querySelectorAll('.sr-empty-card').forEach(function(card) {
    card.addEventListener('click', function() {
      var query = card.dataset.query;
      var input = document.getElementById('searchInput');
      if (input) input.value = query;
      var btn = document.getElementById('searchBtn');
      if (btn) btn.click();
    });
  });
}

// ===== #13: Search Enhancements =====
function setupSearchEnhancements() {
  var searchInput = document.getElementById('searchInput');
  var dropdown = document.getElementById('searchDropdown');
  var recentSection = document.getElementById('recentSearchesDropdown');
  var recentItems = document.getElementById('recentSearchItems');
  var suggestionsSection = document.getElementById('suggestionsDropdown');
  var suggestionItems = document.getElementById('suggestionItems');

  if (!searchInput || !dropdown) return;

  var suggestions = [
    'wireless earbuds', 'pet gadgets', 'kitchen organizer', 'car accessories',
    'beauty tool', 'phone accessories', 'home decor', 'fitness gadget',
    'LED strip lights', 'portable blender', 'smart watch band', 'desk organizer',
    'travel accessories', 'baby products', 'garden tools', 'makeup brush set',
    'yoga mat', 'water bottle', 'backpack', 'phone holder'
  ];

  // Show dropdown on focus
  searchInput.addEventListener('focus', function() {
    renderSearchDropdown();
    dropdown.style.display = 'block';
  });

  // Hide dropdown on blur (with delay for clicks)
  searchInput.addEventListener('blur', function() {
    setTimeout(function() { dropdown.style.display = 'none'; }, 200);
  });

  // Filter suggestions on input
  searchInput.addEventListener('input', function() {
    renderSearchDropdown();
  });

  function renderSearchDropdown() {
    var query = searchInput.value.trim().toLowerCase();
    var recent = getRecentSearches();

    // Recent searches
    if (recentSection && recentItems) {
      if (recent.length > 0 && !query) {
        recentSection.style.display = 'block';
        recentItems.innerHTML = recent.slice(0, 5).map(function(r) {
          return '<div class="search-dropdown-item" data-query="' + r.query.replace(/"/g, '"') + '"><span class="sdi-icon">🕒</span><span class="sdi-text">' + r.query + '</span><span class="sdi-remove" data-remove="' + r.query.replace(/"/g, '"') + '">&times;</span></div>';
        }).join('');
        // Bind clicks
        recentItems.querySelectorAll('.search-dropdown-item').forEach(function(item) {
          item.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('sdi-remove')) {
              e.stopPropagation();
              removeRecentSearch(e.target.dataset.remove);
              renderSearchDropdown();
              return;
            }
            searchInput.value = item.dataset.query;
            dropdown.style.display = 'none';
            var btn = document.getElementById('searchBtn');
            if (btn) btn.click();
          });
        });
      } else {
        recentSection.style.display = 'none';
      }
    }

    // Suggestions
    if (suggestionsSection && suggestionItems) {
      var filtered = query ? suggestions.filter(function(s) { return s.toLowerCase().indexOf(query) !== -1; }).slice(0, 6) : suggestions.slice(0, 5);
      if (filtered.length > 0) {
        suggestionsSection.style.display = 'block';
        suggestionItems.innerHTML = filtered.map(function(s) {
          return '<div class="search-dropdown-item" data-query="' + s + '"><span class="sdi-icon">💡</span><span class="sdi-text">' + s + '</span></div>';
        }).join('');
        suggestionItems.querySelectorAll('.search-dropdown-item').forEach(function(item) {
          item.addEventListener('mousedown', function() {
            searchInput.value = item.dataset.query;
            dropdown.style.display = 'none';
            var btn = document.getElementById('searchBtn');
            if (btn) btn.click();
          });
        });
      } else {
        suggestionsSection.style.display = 'none';
      }
    }

    // Show/hide entire dropdown
    var hasContent = (recent.length > 0 && !query) || (query && suggestions.some(function(s) { return s.toLowerCase().indexOf(query) !== -1; }));
    dropdown.style.display = hasContent || document.activeElement === searchInput ? 'block' : 'none';
  }

  // Store reference for other functions
  window._renderSearchDropdown = renderSearchDropdown;
}

function renderSearchDropdown() {
  if (window._renderSearchDropdown) window._renderSearchDropdown();
}

function removeRecentSearch(query) {
  var recent = getRecentSearches().filter(function(r) { return r.query !== query; });
  try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent)); } catch(e) {}
  renderRecentSearches();
}

// ===== #13: Voice Search =====
function setupVoiceSearch() {
  var btn = document.getElementById('voiceSearchBtn');
  var input = document.getElementById('searchInput');
  if (!btn || !input) return;

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.style.display = 'none';
    return;
  }

  var recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  var isListening = false;

  btn.addEventListener('click', function() {
    if (isListening) {
      recognition.stop();
      return;
    }
    recognition.start();
    isListening = true;
    btn.classList.add('listening');
    btn.title = 'Listening...';
  });

  recognition.addEventListener('result', function(e) {
    var transcript = e.results[0][0].transcript;
    input.value = transcript;
    btn.classList.remove('listening');
    isListening = false;
    btn.title = 'Voice search';
    // Auto-search
    var searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.click();
  });

  recognition.addEventListener('end', function() {
    btn.classList.remove('listening');
    isListening = false;
    btn.title = 'Voice search';
  });

  recognition.addEventListener('error', function() {
    btn.classList.remove('listening');
    isListening = false;
    btn.title = 'Voice search';
  });
}

// ===== #13: I'm Feeling Lucky =====
function setupFeelingLucky() {
  var btn = document.getElementById('feelingLuckyBtn');
  var input = document.getElementById('searchInput');
  if (!btn || !input) return;

  var trendingQueries = [
    'wireless earbuds', 'pet gadgets', 'LED strip lights', 'portable blender',
    'smart watch band', 'car phone mount', 'kitchen organizer', 'yoga mat',
    'desk lamp', 'phone accessories', 'travel pillow', 'resistance bands',
    'water bottle', 'mini projector', 'posture corrector', 'face roller',
    'ring light', 'air purifier', 'robot vacuum', 'plant grow light'
  ];

  btn.addEventListener('click', function() {
    var random = trendingQueries[Math.floor(Math.random() * trendingQueries.length)];
    input.value = random;
    var searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.click();
  });
}

// ===== #14: Debounce Filter Inputs =====
function setupDebouncedFilters() {
  var priceMin = document.getElementById('priceMin');
  var priceMax = document.getElementById('priceMax');
  var priceRange = document.getElementById('priceRange');
  var scoreRange = document.getElementById('scoreRange');

  // These are already bound directly, so we replace with debounced versions
  // We remove old listeners by cloning and rebinding
  if (priceMin) {
    var newMin = priceMin.cloneNode(true);
    priceMin.parentNode.replaceChild(newMin, priceMin);
    newMin.addEventListener('input', debounce(function() {
      var priceRangeEl = document.getElementById('priceRange');
      if (priceRangeEl && newMin.value) priceRangeEl.value = newMin.value;
      EventBus.emit('filter:changed', { filters: {}, query: (document.getElementById('searchInput') || {}).value || '' });
    }, 300));
  }
  if (priceMax) {
    var newMax = priceMax.cloneNode(true);
    priceMax.parentNode.replaceChild(newMax, priceMax);
    newMax.addEventListener('input', debounce(function() {
      var priceRangeEl = document.getElementById('priceRange');
      if (priceRangeEl) priceRangeEl.value = newMax.value || 200;
      EventBus.emit('filter:changed', { filters: {}, query: (document.getElementById('searchInput') || {}).value || '' });
    }, 300));
  }
  if (priceRange) {
    var newRange = priceRange.cloneNode(true);
    priceRange.parentNode.replaceChild(newRange, priceRange);
    newRange.addEventListener('input', debounce(function() {
      var maxInput = document.getElementById('priceMax');
      if (maxInput) maxInput.value = newRange.value;
      EventBus.emit('filter:changed', { filters: {}, query: (document.getElementById('searchInput') || {}).value || '' });
    }, 150));
  }
  if (scoreRange) {
    var newScore = scoreRange.cloneNode(true);
    scoreRange.parentNode.replaceChild(newScore, scoreRange);
    newScore.addEventListener('input', debounce(function() {
      var scoreValue = document.getElementById('scoreValue');
      if (scoreValue) scoreValue.textContent = newScore.value;
      EventBus.emit('filter:changed', { filters: {}, query: (document.getElementById('searchInput') || {}).value || '' });
    }, 150));
  }
}

// ===== Hook: Save recent search on every search =====
function hookRecentSearchSaving() {
  EventBus.on('filter:changed', function(data) {
    if (data && data.query) {
      saveRecentSearch(data.query);
    }
  });
}

// ===== Hook: Welcome step tracking =====
function hookWelcomeTracking() {
  EventBus.on('product:analyze', function() { completeWelcomeStep(3); });
  EventBus.on('filter:changed', function(data) {
    if (data && data.query) completeWelcomeStep(2);
  });
}

// ===== ACCESSIBILITY ENHANCEMENTS =====
function enhanceAccessibility() {
  // Add ARIA roles to tab systems
  document.querySelectorAll('.cb-tabs, .sh-tabs, .bi-tabs, .osg-tabs, .spy-tabs').forEach(function(tabContainer) {
    tabContainer.setAttribute('role', 'tablist');
    tabContainer.querySelectorAll('button[class*="tab"]').forEach(function(tab, i) {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
      if (!tab.id) tab.id = 'a11y-tab-' + Math.random().toString(36).slice(2, 8);
    });
  });

  // Add keyboard navigation for tabs (arrow keys)
  document.addEventListener('keydown', function(e) {
    var target = e.target;
    if (!target || target.getAttribute('role') !== 'tab') return;
    var tablist = target.closest('[role="tablist"]');
    if (!tablist) return;
    var tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    var idx = tabs.indexOf(target);
    if (idx === -1) return;
    var next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next = tabs[(idx + 1) % tabs.length]; e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { next = tabs[(idx - 1 + tabs.length) % tabs.length]; e.preventDefault(); }
    else if (e.key === 'Home') { next = tabs[0]; e.preventDefault(); }
    else if (e.key === 'End') { next = tabs[tabs.length - 1]; e.preventDefault(); }
    if (next) { next.focus(); next.click(); }
  });

  // Add aria-label to icon-only buttons (buttons with only emoji/icon content)
  document.querySelectorAll('button').forEach(function(btn) {
    var text = btn.textContent.trim();
    if (text.length <= 2 && !btn.getAttribute('aria-label')) {
      var icon = text || btn.querySelector('span')?.textContent?.trim() || '';
      if (icon.length <= 2) btn.setAttribute('aria-label', 'Button');
    }
  });
}

// ===== BOOT SEQUENCE =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log(`%c✦ HuntDrop AI v${Config.get('app.version')} — Booting...`, 'color: #00e5ff; font-weight: bold;');

  // 1. Setup core UI
  setupNavigation();
  setupSearch();
  setupProductModal();
  setupKeyboard();
  setupOnboarding();

  // Back button
  const backBtn = document.getElementById('navBackBtn');
  if (backBtn) backBtn.addEventListener('click', () => window.HuntDrop.goBack());

  // 1b. Setup all new dashboard features
  setupThemeToggle();          // #15: Dark/Light Mode Toggle
  setupErrorBoundaries();      // #16: Error Boundaries
  setupKPIBar();               // #1: KPI Stats Bar
  setupQuickToolsCollapse();   // #5: Quick Tools Collapse
  setupWelcomeState();         // #6: Welcome State for New Users
  renderRecentSearches();      // #3: Recent Searches (render on load)
  setupClearRecentSearches();  // #3: Recent Searches clear button
  setupTrendingProducts();     // #2: Trending Products
  setupFilterMobileToggle();   // #7: Filter Panel Mobile Toggle
  setupEmptyStateSuggestions();// #11: Enhanced Empty State
  setupSearchEnhancements();   // #13: Search autocomplete & dropdown
  setupVoiceSearch();          // #13: Voice Search
  setupFeelingLucky();         // #13: I'm Feeling Lucky
  hookRecentSearchSaving();    // #3: Hook to save recent searches
  hookWelcomeTracking();       // #6: Hook welcome step tracking

  // 2. Load and initialize all plugins (this injects sections into #sections-container)
  const plugins = PluginRegistry.getAll();
  for (const plugin of plugins) {
    await PluginRegistry.init(plugin.id);
  }
  for (const plugin of plugins) {
    await PluginRegistry.mount(plugin.id);
  }

  // 3. Restore last visited section or default to dashboard
  const savedSection = Config.get('app.currentSection', 'section-dashboard');
  const targetExists = document.getElementById(savedSection);
  window.HuntDrop.navigateTo(targetExists ? savedSection : 'section-dashboard', true);

  // 4. Initial search to populate grid
  EventBus.emit('filter:changed', { filters: {}, query: '' });

  // 4b. Setup debounced filters (after initial search to avoid double-fire)
  setupDebouncedFilters();     // #14: Debounce filter inputs

  // 5. Accessibility enhancements
  enhanceAccessibility();

  // 15. Preload critical plugin CSS (ensure they're applied)
  document.querySelectorAll('link[media="print"]').forEach(function(link) {
    link.media = 'all';
  });

  console.log(`%c✦ HuntDrop AI Ready — ${plugins.length} plugins loaded`, 'color: #00ff88; font-weight: bold;');
});

})();
