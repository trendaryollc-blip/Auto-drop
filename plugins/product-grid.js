// ============================================================================
// PLUGIN: Product Grid UI
// ============================================================================
// Renders the product cards in the search results page.
// ============================================================================
(function(){
const {EventBus,Config,UI} = window.HuntDrop;

function renderCard(p) {
  if (!p) return '';
  var score = p.score || 0;
  var scoreClass = score>=85?'score-excellent':score>=70?'score-good':'score-fair';
  var scoreBar = score>=85?'100%':score>=70?'70%':'40%';
  var comp = p.competition || 'medium';
  var compColor = {low:'var(--accent-green)',medium:'var(--accent-yellow)',high:'var(--accent-red)'}[comp]||'var(--accent-yellow)';
  var compBar = {low:'green',medium:'orange',high:'red'}[comp]||'orange';
  var compW = {low:'30',medium:'60',high:'90'}[comp]||'60';
  var cap = function(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; };
  var fmtN = function(n){ return n>=1000?(n/1000).toFixed(1)+'K':n.toString(); };
  var badges = (p.badges || []).map(function(b){return '<span class="badge badge-'+b+'">'+(b==='ai'?'AI':b)+'</span>';}).join('');
  var supplierName = (p.suppliers && p.suppliers[0]) ? p.suppliers[0].name : 'N/A';
  var supplierVerified = (p.suppliers && p.suppliers[0] && p.suppliers[0].verified);
  var img = p.image || 'https://via.placeholder.com/300x200?text=Product';
  var title = (p.title || 'Unknown Product').replace(/"/g,'&quot;');
  var margin = p.margin || 0;
  var marginClass = margin >= 50 ? 'margin-high' : margin >= 30 ? 'margin-med' : 'margin-low';

  return '<div class="product-card" data-product-id="'+p.id+'">'
    +'<div class="card-image">'
    +'<img src="'+img+'" alt="'+title+'" loading="lazy">'
    +'<div class="card-badges">'+badges+'</div>'
    +'<div class="card-score '+scoreClass+'">'+score+'</div>'
    +'<div class="card-platform platform-'+(p.platform||'unknown')+'"><span class="platform-dot"></span>'+cap(p.platform)+'</div>'
    +'</div>'
    +'<div class="card-body">'
    +'<h3 class="card-title">'+title+'</h3>'
    +'<div class="card-prices">'
    +'<span class="price-current">$'+(p.price||0).toFixed(2)+'</span>'
    +'<span class="price-original">$'+(p.originalPrice||0).toFixed(2)+'</span>'
    +'<span class="price-margin '+marginClass+'">'+margin+'%</span>'
    +'</div>'
    +'<div class="card-metrics">'
    +'<div class="metric"><span class="metric-label">Sales/mo</span><span class="metric-value">'+fmtN(p.salesVelocity||0)+'</span><div class="metric-bar"><div class="metric-bar-fill bar-green" style="width:'+Math.min((p.salesVelocity||0)/92,100)+'%"></div></div></div>'
    +'<div class="metric"><span class="metric-label">Competition</span><span class="metric-value" style="color:'+compColor+'">'+cap(comp)+'</span><div class="metric-bar"><div class="metric-bar-fill bar-'+compBar+'" style="width:'+compW+'%"></div></div></div>'
    +'<div class="metric"><span class="metric-label">Demand</span><span class="metric-value">'+(p.demand||0)+'/100</span><div class="metric-bar"><div class="metric-bar-fill bar-cyan" style="width:'+Math.min(p.demand||0,100)+'%"></div></div></div>'
    +'<div class="metric"><span class="metric-label">Orders</span><span class="metric-value">'+(p.orders||0)+'</span><div class="metric-bar"><div class="metric-bar-fill bar-purple" style="width:'+Math.min(parseInt(p.orders||0)/32,100)+'%"></div></div></div>'
    +'</div>'
    +'<div class="card-footer">'
    +'<div class="card-supplier"><span class="supplier-dot"></span>'+supplierName+(supplierVerified?' <span class="supplier-verified">&#10003;</span>':'')+'</div>'
    +'<button class="card-action" data-action="analyze" data-id="'+p.id+'">Full Analysis</button>'
    +'</div>'
    +'</div>';
}

function updateSummaryBar(results) {
  var total = results.length;
  var avgMargin = 0;
  var avgScore = 0;
  var platformCounts = {};
  var platformMax = 0;
  var topPlatform = '—';

  for (var i = 0; i < results.length; i++) {
    var p = results[i];
    avgMargin += (p.margin || 0);
    avgScore += (p.score || 0);
    var pl = p.platform || 'unknown';
    platformCounts[pl] = (platformCounts[pl] || 0) + 1;
    if (platformCounts[pl] > platformMax) {
      platformMax = platformCounts[pl];
      topPlatform = cap(pl);
    }
  }
  if (total > 0) {
    avgMargin = Math.round(avgMargin / total);
    avgScore = Math.round(avgScore / total);
  }

  function cap(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; }

  var elTotal = document.getElementById('srTotalCount');
  var elMargin = document.getElementById('srAvgMargin');
  var elScore = document.getElementById('srAvgScore');
  var elPlatform = document.getElementById('srTopPlatform');
  if (elTotal) elTotal.textContent = total;
  if (elMargin) elMargin.textContent = avgMargin + '%';
  if (elScore) elScore.textContent = avgScore;
  if (elPlatform) elPlatform.textContent = topPlatform;
}

function updateActiveFilters(filters, query) {
  var chipsEl = document.getElementById('srFilterChips');
  if (!chipsEl) return;
  var html = '';

  if (query) {
    html += '<span class="sr-af-chip">Search: "' + query + '" <button class="sr-af-chip-remove" data-clear="query">&times;</button></span>';
  }
  if (filters.platform && filters.platform !== 'all') {
    html += '<span class="sr-af-chip">Platform: ' + cap(filters.platform) + ' <button class="sr-af-chip-remove" data-clear="platform">&times;</button></span>';
  }
  if (filters.margin && filters.margin !== 'all') {
    html += '<span class="sr-af-chip">Margin: ' + filters.margin + '%+ <button class="sr-af-chip-remove" data-clear="margin">&times;</button></span>';
  }
  if (filters.competition && filters.competition !== 'all') {
    html += '<span class="sr-af-chip">Competition: ' + cap(filters.competition) + ' <button class="sr-af-chip-remove" data-clear="competition">&times;</button></span>';
  }
  if (filters.minScore && filters.minScore > 0) {
    html += '<span class="sr-af-chip">Score: ' + filters.minScore + '+ <button class="sr-af-chip-remove" data-clear="score">&times;</button></span>';
  }

  chipsEl.innerHTML = html;

  // Bind remove buttons
  chipsEl.querySelectorAll('.sr-af-chip-remove').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var clearType = btn.dataset.clear;
      if (clearType === 'query') {
        var input = UI.$('searchPageInput');
        if (input) input.value = '';
      } else if (clearType === 'platform') {
        var sel = UI.$('searchPagePlatform');
        if (sel) sel.value = 'all';
        var sel2 = document.getElementById('sortSelectSearch');
        if (sel2) sel2.value = 'all';
      } else if (clearType === 'margin') {
        document.querySelectorAll('.sr-pill[data-margin]').forEach(function(b){b.classList.remove('active');});
        document.querySelector('.sr-pill[data-margin="all"]').classList.add('active');
      } else if (clearType === 'competition') {
        document.querySelectorAll('.sr-pill.comp-pill[data-comp]').forEach(function(b){b.classList.remove('active');});
        document.querySelector('.sr-pill.comp-pill[data-comp="all"]').classList.add('active');
      } else if (clearType === 'score') {
        var sr = UI.$('scoreRange');
        var sv = UI.$('scoreValue');
        if (sr) sr.value = 0;
        if (sv) sv.textContent = '0';
      }
      EventBus.emit('filter:changed', { filters: window.HuntDrop._lastFilters || {}, query: window.HuntDrop._lastQuery || '' });
    });
  });
}

function cap(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; }

const ProductGridPlugin = {
  id: 'product-grid',
  name: 'Product Grid',
  version: '4.0.0',
  description: 'Renders product cards in the search results page',

  init(ctx) {},

  mount(ctx) {
    EventBus.on('search:results', function(data) {
      var grid = UI.$('productsGrid');
      if(!grid) return;
      var html = '';
      var count = Math.min(data.results.length, 60);
      for (var i = 0; i < count; i++) {
        html += renderCard(data.results[i]);
      }
      grid.innerHTML = html;
      // Force multi-column grid layout inline so it cannot be overridden by CSS cascade
      grid.style.removeProperty('display');
      grid.style.removeProperty('grid-template-columns');
      grid.style.removeProperty('gap');
      grid.classList.remove('list-view');
      grid.querySelectorAll('.product-card').forEach(function(card) {
        card.addEventListener('click', function(e) {
          if (e.target.closest('.card-action')) return;
          var id = parseInt(card.dataset.productId);
          if (id) {
            window.HuntDrop._currentProductId = id;
            EventBus.emit('product:analyze', { id: id });
          }
        });
      });
      var countEl = UI.$('resultsCount');
      if(countEl) countEl.textContent = data.total.toLocaleString() + ' products found';

      // Update summary bar
      updateSummaryBar(data.results);

      // Store for filter chip removal
      window.HuntDrop._lastFilters = data.filters || {};
      window.HuntDrop._lastQuery = data.query || '';
    });

    EventBus.on('filter:changed', function(data) {
      if (data) {
        updateActiveFilters(data.filters || {}, data.query || '');
      }
    });

    // Empty suggestion cards
    var emptyCards = document.querySelectorAll('.sr-empty-card');
    emptyCards.forEach(function(card) {
      card.addEventListener('click', function() {
        var query = card.dataset.query;
        if (query) {
          var input = UI.$('searchPageInput') || UI.$('searchInput');
          if (input) input.value = query;
          EventBus.emit('filter:changed', { filters: {}, query: query });
        }
      });
    });
  }
};

window.HuntDrop.PluginRegistry.register('product-grid', ProductGridPlugin);
})();
