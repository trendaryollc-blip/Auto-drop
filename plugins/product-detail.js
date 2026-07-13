// ============================================================================
// PLUGIN: Product Detail Page
// ============================================================================
// Full-page product detail view with all available data.
// ============================================================================
(function(){
const {EventBus,Config,UI,DataLayer} = window.HuntDrop;

var _currentChart = {trend:null,season:null,price:null,profit:null};

function destroyCharts() {
  Object.keys(_currentChart).forEach(function(k){
    if(_currentChart[k]){try{_currentChart[k].destroy();}catch(e){} _currentChart[k]=null;}
  });
}

function fmtN(n){return n>=1000?(n/1000).toFixed(1)+'K':String(n);}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):'';}
function esc(s){return UI.escapeHtml(String(s||''));}

function platColor(pl){
  return {aliexpress:'#e62e04',amazon:'#ff9900',shopify:'#96bf48',ebay:'#e53238',temu:'#fb7701',tiktok:'#00f2ea',etsy:'#f1641e',cjdropshipping:'#40c351',dhgate:'#e62e04',wish:'#2fb7ec'}[pl]||'#888';
}

function renderDetail(p) {
  if (!p) return '<div class="pd-container"><p style="color:var(--text-muted)">Product not found.</p></div>';
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var scoreClass = p.score>=85?'score-excellent':p.score>=70?'score-good':'score-fair';
  var badges = (p.badges||[]).map(function(b){return '<span class="badge badge-'+b+'">'+(b==='ai'?'AI':b)+'</span>';}).join('');
  var platColorMap = {aliexpress:'#e62e04',amazon:'#ff9900',shopify:'#96bf48',ebay:'#e53238',temu:'#fb7701',tiktok:'#00f2ea',etsy:'#f1641e',cjdropshipping:'#40c351',dhgate:'#e62e04',wish:'#2fb7ec'};

  var platformPricesHtml = '';
  var bestPrice = Infinity;
  var bestPlat = '';
  Object.keys(p.platformPrices||{}).forEach(function(pl){
    var pr = p.platformPrices[pl];
    if(pr < bestPrice){bestPrice = pr; bestPlat = pl;}
  });
  Object.keys(p.platformPrices||{}).forEach(function(pl){
    var pr = p.platformPrices[pl];
    var isBest = pl === bestPlat;
    platformPricesHtml += '<div class="pd-price-card'+(isBest?' best':'')+'">'
      +'<div class="pd-price-platform"><span class="platform-dot" style="background:'+(platColorMap[pl]||'#888')+'"></span>'+esc(cap(pl))+'</div>'
      +'<div class="pd-price-value">$'+pr.toFixed(2)+'</div>'
      +(isBest?'<span class="badge badge-winning" style="position:static">Best</span>':'')
      +'</div>';
  });

  var suppliersHtml = (p.suppliers||[]).map(function(s){
    return '<div class="pd-supplier-card">'
      +'<div class="pd-supplier-header">'
      +'<div class="pd-supplier-avatar">'+esc(s.name.charAt(0))+'</div>'
      +'<div><div class="pd-supplier-name">'+esc(s.name)+'</div><div class="pd-supplier-location">'+esc(s.location)+'</div></div>'
      +'</div>'
      +'<div class="pd-supplier-stats">'
      +'<div class="pd-supplier-stat"><div class="pd-supplier-stat-label">Rating</div><div class="pd-supplier-stat-value" style="color:var(--accent-yellow)">'+s.rating+'&#9733;</div></div>'
      +'<div class="pd-supplier-stat"><div class="pd-supplier-stat-label">Orders</div><div class="pd-supplier-stat-value">'+esc(s.orders)+'</div></div>'
      +'<div class="pd-supplier-stat"><div class="pd-supplier-stat-label">Response</div><div class="pd-supplier-stat-value">'+esc(s.responseTime)+'</div></div>'
      +'<div class="pd-supplier-stat"><div class="pd-supplier-stat-label">Status</div><div class="pd-supplier-stat-value" style="color:'+(s.verified?'var(--accent-green)':'var(--accent-orange)')+'">'+(s.verified?'&#10003; Verified':'Pending')+'</div></div>'
      +'</div></div>';
  }).join('');

  var riskColor = p.riskScore<30?'var(--accent-green)':p.riskScore<50?'var(--accent-yellow)':'var(--accent-red)';
  var riskLabel = p.riskScore<30?'Low Risk':p.riskScore<50?'Medium Risk':'High Risk';
  var satColor = p.marketSaturation<40?'var(--accent-green)':p.marketSaturation<60?'var(--accent-yellow)':'var(--accent-red)';
  var satLabel = p.marketSaturation<40?'Unsaturated':p.marketSaturation<60?'Moderate':'Saturated';

  var keywordsHtml = (p.keywords||[]).slice(0,10).map(function(k){return '<span class="pd-keyword">'+esc(k)+'</span>';}).join('');
  var interestsHtml = (p.audience&&p.audience.interests||[]).map(function(i){return '<span class="pd-audience-tag">'+esc(i)+'</span>';}).join('');
  var countriesHtml = (p.audience&&p.audience.countries||[]).map(function(c){return '<span class="pd-audience-tag">'+esc(c)+'</span>';}).join('');

  return '<div class="pd-hero">'
    +'<div class="pd-hero-image">'
    +'<img src="'+esc(p.image)+'" alt="'+esc(p.title)+'">'
    +'<div class="pd-hero-badges">'+badges+'</div>'
    +'<div class="pd-hero-score '+scoreClass+'">'+p.score+'</div>'
    +'<div class="pd-hero-platform"><span class="platform-dot" style="background:'+(platColorMap[p.platform]||'#888')+'"></span>'+esc(cap(p.platform))+'</div>'
    +'</div>'
    +'<div class="pd-hero-info">'
    +'<div class="pd-hero-category">'+esc(p.category)+'</div>'
    +'<h1 class="pd-hero-title">'+esc(p.title)+'</h1>'
    +'<div class="pd-hero-price-row">'
    +'<span class="pd-hero-price">$'+p.price.toFixed(2)+'</span>'
    +'<span class="pd-hero-original">$'+p.originalPrice.toFixed(2)+'</span>'
    +'<span class="pd-hero-margin">'+p.margin+'% profit</span>'
    +'</div>'
    +'<div class="pd-stats-grid">'
    +'<div class="pd-stat"><span class="pd-stat-value" style="color:var(--accent-green)">'+p.score+'</span><span class="pd-stat-label">AI Score</span></div>'
    +'<div class="pd-stat"><span class="pd-stat-value">'+fmtN(p.salesVelocity)+'</span><span class="pd-stat-label">Sales/mo</span></div>'
    +'<div class="pd-stat"><span class="pd-stat-value">'+p.rating+'&#9733;</span><span class="pd-stat-label">'+fmtN(p.reviews)+' reviews</span></div>'
    +'<div class="pd-stat"><span class="pd-stat-value">'+p.orders+'</span><span class="pd-stat-label">Total Orders</span></div>'
    +'</div>'
    +'<div class="pd-actions">'
    +'<button class="pd-action-btn primary" onclick="window.HuntDrop.navigateTo(\'section-profit-lab\')">&#128200; Profit Calculator</button>'
    +'<button class="pd-action-btn" onclick="window.HuntDrop.navigateTo(\'section-ad-studio\')">&#127909; Create Ad</button>'
    +'<button class="pd-action-btn" onclick="window.HuntDrop.navigateTo(\'section-supplier-hub\')">&#128230; Find Suppliers</button>'
    +'<button class="pd-action-btn" onclick="window.HuntDrop.navigateTo(\'section-ai-settings\')">&#9881; AI Analysis</button>'
    +'</div>'
    +'</div></div>'

    +'<div class="pd-grid-2">'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-cyan">&#128200;</div><h2 class="pd-section-title">12-Month Sales Trend</h2></div>'
    +'<div class="pd-chart-box"><canvas id="pdTrendChart"></canvas></div>'
    +'</div>'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-purple">&#128197;</div><h2 class="pd-section-title">Seasonal Demand</h2></div>'
    +'<div class="pd-chart-box"><canvas id="pdSeasonChart"></canvas></div>'
    +'</div>'

    +'</div>'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-green">&#128176;</div><h2 class="pd-section-title">Cross-Platform Prices</h2></div>'
    +'<div class="pd-prices-grid">'+platformPricesHtml+'</div>'
    +'</div>'

    +'<div class="pd-grid-2">'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-green">&#128202;</div><h2 class="pd-section-title">Price Distribution</h2></div>'
    +'<div class="pd-chart-box"><canvas id="pdPriceChart"></canvas></div>'
    +'</div>'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-cyan">&#128176;</div><h2 class="pd-section-title">Profit Breakdown</h2></div>'
    +'<div class="pd-chart-box"><canvas id="pdProfitChart"></canvas></div>'
    +'</div>'

    +'</div>'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-orange">&#128293;</div><h2 class="pd-section-title">Market Analytics</h2></div>'
    +'<div class="pd-analytics-grid">'
    +'<div class="pd-analytics-card"><span class="pd-analytics-value" style="color:var(--accent-green)">'+p.demand+'</span><span class="pd-analytics-label">Demand Score</span><span class="pd-analytics-trend up">&#8593; High</span></div>'
    +'<div class="pd-analytics-card"><span class="pd-analytics-value" style="color:'+({low:'var(--accent-green)',medium:'var(--accent-yellow)',high:'var(--accent-red)'}[p.competition]||'var(--accent-yellow)')+'">'+cap(p.competition)+'</span><span class="pd-analytics-label">Competition</span><span class="pd-analytics-trend '+(p.competition==='low'?'up':'stable')+'">'+(p.competition==='low'?'&#8595; Low barrier':'&#8594; Moderate')+'</span></div>'
    +'<div class="pd-analytics-card"><span class="pd-analytics-value" style="color:'+satColor+'">'+p.marketSaturation+'%</span><span class="pd-analytics-label">Market Saturation</span><span class="pd-analytics-trend '+(p.marketSaturation<40?'up':'stable')+'">'+satLabel+'</span></div>'
    +'<div class="pd-analytics-card"><span class="pd-analytics-value" style="color:var(--accent-cyan)">'+fmtN(p.salesVelocity)+'</span><span class="pd-analytics-label">Monthly Sales</span><span class="pd-analytics-trend up">&#8593; Growing</span></div>'
    +'<div class="pd-analytics-card"><span class="pd-analytics-value" style="color:'+riskColor+'">'+p.riskScore+'/100</span><span class="pd-analytics-label">Risk Score</span><span class="pd-analytics-trend '+(p.riskScore<30?'up':'stable')+'">'+riskLabel+'</span></div>'
    +'<div class="pd-analytics-card"><span class="pd-analytics-value" style="color:var(--accent-purple)">'+p.rating+'&#9733;</span><span class="pd-analytics-label">Customer Rating</span><span class="pd-analytics-trend up">'+fmtN(p.reviews)+' reviews</span></div>'
    +'</div>'
    +'</div>'

    +'<div class="pd-grid-2">'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-red">&#128100;</div><h2 class="pd-section-title">Target Audience</h2></div>'
    +'<div class="pd-audience-grid">'
    +'<div class="pd-audience-card"><span class="pd-audience-value">'+esc(p.audience.age)+'</span><span class="pd-audience-label">Age Range</span></div>'
    +'<div class="pd-audience-card"><span class="pd-audience-value">'+esc(p.audience.gender)+'</span><span class="pd-audience-label">Gender</span></div>'
    +'<div class="pd-audience-card" style="grid-column:span 2"><span class="pd-audience-label" style="display:block;margin-bottom:6px">Interests</span><div class="pd-audience-tags">'+interestsHtml+'</div></div>'
    +'</div>'
    +'<div style="margin-top:12px"><span class="pd-audience-label" style="display:block;margin-bottom:6px">Top Countries</span><div class="pd-audience-tags">'+countriesHtml+'</div></div>'
    +'</div>'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-orange">&#128184;</div><h2 class="pd-section-title">Ad Spend & CPA</h2></div>'
    +'<div class="pd-spend-grid">'
    +'<div class="pd-spend-card"><span class="pd-spend-value">$'+p.adSpendAvg.toFixed(2)+'</span><span class="pd-spend-label">Avg. Ad Spend/Click</span></div>'
    +'<div class="pd-spend-card"><span class="pd-spend-value">$'+p.cpaAvg.toFixed(2)+'</span><span class="pd-spend-label">Avg. Cost Per Acquisition</span></div>'
    +'</div>'
    +'<div style="margin-top:16px;padding:14px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md)">'
    +'<div class="pd-risk-labels"><span>Low Risk</span><span>High Risk</span></div>'
    +'<div class="pd-risk-bar"><div class="pd-risk-fill" style="width:'+p.riskScore+'%;background:'+riskColor+'"></div></div>'
    +'</div>'
    +'</div>'

    +'</div>'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-green">&#127981;</div><h2 class="pd-section-title">Suppliers ('+(p.suppliers||[]).length+')</h2></div>'
    +'<div class="pd-suppliers-grid">'+(suppliersHtml||'<p style="color:var(--text-muted)">No suppliers available</p>')+'</div>'
    +'</div>'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-cyan">&#10024;</div><h2 class="pd-section-title">AI Insight</h2></div>'
    +'<div class="pd-insight-box">'
    +'<p class="pd-insight-text">'+esc(p.aiInsight)+'</p>'
    +'<div class="pd-insight-tags">'+(p.keywords||[]).slice(0,6).map(function(k){return '<span class="pd-insight-tag">'+esc(k)+'</span>';}).join('')+'</div>'
    +'</div>'
    +'</div>'

    +'<div class="pd-section">'
    +'<div class="pd-section-header"><div class="pd-section-icon icon-purple">&#128273;</div><h2 class="pd-section-title">Keywords</h2></div>'
    +'<div class="pd-keywords">'+keywordsHtml+'</div>'
    +'</div>';
}

function renderCharts(p) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var chartOpts = {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#111119',borderColor:'#2a2a3d',borderWidth:1,titleFont:{family:'Outfit',size:11},bodyFont:{family:'JetBrains Mono',size:12},padding:10,displayColors:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9}}},y:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9}}}}};

  var tc = document.getElementById('pdTrendChart');
  if(tc) _currentChart.trend = new Chart(tc,{type:'line',data:{labels:months,datasets:[{data:p.trendData,borderColor:'#00e5ff',backgroundColor:'rgba(0,229,255,0.06)',borderWidth:2,fill:true,tension:0.4,pointBackgroundColor:'#00e5ff',pointBorderColor:'#06060c',pointBorderWidth:2,pointRadius:3}]},options:{...chartOpts,interaction:{intersect:false,mode:'index'}}});

  var sc = document.getElementById('pdSeasonChart');
  if(sc) _currentChart.season = new Chart(sc,{type:'line',data:{labels:months,datasets:[{data:p.seasonality,borderColor:'#a855f7',backgroundColor:'rgba(168,85,247,0.06)',borderWidth:2,fill:true,tension:0.4,pointBackgroundColor:'#a855f7',pointBorderColor:'#06060c',pointBorderWidth:2,pointRadius:3}]},options:{...chartOpts,scales:{...chartOpts.scales,y:{...chartOpts.scales.y,min:50,max:160}},interaction:{intersect:false,mode:'index'}}});

  var pc = document.getElementById('pdPriceChart');
  if(pc){var labels=Object.keys(p.platformPrices).map(function(s){return cap(s);});_currentChart.price = new Chart(pc,{type:'bar',data:{labels:labels,datasets:[{data:Object.values(p.platformPrices),backgroundColor:'rgba(0,229,255,0.4)',borderColor:'#00e5ff',borderWidth:1,borderRadius:5}]},options:{...chartOpts,scales:{...chartOpts.scales,y:{...chartOpts.scales.y,ticks:{...chartOpts.scales.y.ticks,callback:function(v){return '$'+v.toFixed(0);}}}}}});}

  var prc = document.getElementById('pdProfitChart');
  if(prc){var sp=p.platformPrices.amazon||p.price,cost=p.price,ship=2.50,ads=sp*0.15,profit=sp-cost-ship-ads;_currentChart.profit = new Chart(prc,{type:'bar',data:{labels:['Sell Price','Cost','Shipping','Ads','Net Profit'],datasets:[{data:[sp,-cost,-ship,-ads,profit],backgroundColor:['rgba(0,229,255,0.6)','rgba(255,51,102,0.6)','rgba(255,138,0,0.6)','rgba(168,85,247,0.6)',profit>0?'rgba(0,255,136,0.6)':'rgba(255,51,102,0.6)'],borderColor:['#00e5ff','#ff3366','#ff8a00','#a855f7',profit>0?'#00ff88':'#ff3366'],borderWidth:1,borderRadius:5}]},options:{...chartOpts,scales:{...chartOpts.scales,y:{...chartOpts.scales.y,ticks:{...chartOpts.scales.y.ticks,callback:function(v){return '$'+v.toFixed(0);}}}}}});}
}

var ProductDetailPlugin = {
  id: 'product-detail',
  name: 'Product Detail',
  version: '1.0.0',
  description: 'Full-page product detail view',

  init(ctx) {},

  mount(ctx) {
    EventBus.on('product:analyze', function(data) {
      var products = window.HuntDrop.ALL_PRODUCTS || [];
      var p = products.find(function(x){return x.id === data.id;});
      if (!p) return;
      var container = UI.$('productDetailContent');
      if (!container) return;
      destroyCharts();
      container.innerHTML = renderDetail(p);
      container.scrollTop = 0;
      document.getElementById('section-product-detail').scrollTop = 0;
      window.HuntDrop.navigateTo('section-product-detail');
      setTimeout(function(){ renderCharts(p); }, 150);
    });
  },

  unmount(ctx) {
    destroyCharts();
  }
};

window.HuntDrop.PluginRegistry.register('product-detail', ProductDetailPlugin);
})();
