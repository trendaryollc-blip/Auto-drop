// ============================================================================
// PLUGIN: Store Spy Center — Full-stack store intelligence
// ============================================================================
(function(){
const {EventBus,PluginRegistry,Config,UI} = window.HuntDrop;
const esc = s => UI.escapeHtml(s);
const Mock = window.MockAPI;

const STORES = Mock ? Mock.getSpyStores() : [];

var STORE_ADS=[
  {store:'PetLover Store',product:'GPS Pet Tracker',platform:'Facebook',hook:'Is your pet always running off? Track them 24/7',ctr:3.8,spend:42,status:'running',age:3,engagement:'12.4%',format:'Video',objective:'Conversions'},
  {store:'TechGadget Hub',product:'Wireless Earbuds Pro',platform:'TikTok',hook:'POV: you found earbuds that actually stay in',ctr:4.2,spend:67,status:'running',age:1,engagement:'18.7%',format:'UGC Video',objective:'Conversions'},
  {store:'BeautyGlow',product:'Heated Hair Curler',platform:'Instagram',hook:'5 min salon blowout at home',ctr:3.1,spend:89,status:'running',age:5,engagement:'9.2%',format:'Carousel',objective:'Traffic'},
  {store:'FitGear Pro',product:'Posture Corrector',platform:'Facebook',hook:'Back pain ruined my life until this $29 fix',ctr:2.9,spend:34,status:'running',age:7,engagement:'6.8%',format:'Image',objective:'Conversions'},
  {store:'StarLight Tech',product:'Galaxy Projector',platform:'TikTok',hook:'Turn your room into another dimension',ctr:5.1,spend:112,status:'scaling',age:2,engagement:'24.3%',format:'Video',objective:'Conversions'},
  {store:'PostureTech',product:'Neck Massager Pro',platform:'Facebook',hook:'The $29 device replacing $200 massages',ctr:3.6,spend:56,status:'running',age:4,engagement:'11.1%',format:'Video',objective:'Conversions'},
  {store:'ChargeTech',product:'MagSafe Power Bank',platform:'Instagram',hook:'Never run out of battery again',ctr:2.7,spend:28,status:'testing',age:1,engagement:'7.9%',format:'Reel',objective:'Traffic'},
  {store:'Kawaii Decor Co',product:'LED Cloud Lamp',platform:'TikTok',hook:'My room went from basic to magical in 10 sec',ctr:4.8,spend:45,status:'running',age:3,engagement:'15.6%',format:'Video',objective:'Conversions'},
  {store:'EcoKitchen Pro',product:'Smart Air Fryer',platform:'Facebook',hook:'I stopped using my oven 3 months ago',ctr:3.4,spend:38,status:'running',age:6,engagement:'8.4%',format:'Carousel',objective:'Conversions'},
  {store:'HomeEssentials',product:'Robot Vacuum Lite',platform:'Instagram',hook:'This $89 vacuum cleans better than my $400 one',ctr:3.9,spend:52,status:'scaling',age:2,engagement:'13.2%',format:'Reel',objective:'Conversions'},
  {store:'PetLover Store',product:'Auto Pet Feeder',platform:'TikTok',hook:'My cat eats better than me thanks to this gadget',ctr:4.5,spend:38,status:'running',age:4,engagement:'16.8%',format:'UGC Video',objective:'Conversions'},
  {store:'BeautyGlow',product:'LED Face Mask',platform:'TikTok',hook:'Dermatologists hate this $34 at-home facial',ctr:5.3,spend:95,status:'scaling',age:1,engagement:'22.1%',format:'Video',objective:'Conversions'}
];

var PRICE_CHANGES=[
  {store:'StarLight Tech',product:'Galaxy Projector',oldPrice:49.99,newPrice:39.99,change:-20,time:'14 min ago',impact:'HIGH'},
  {store:'BeautyGlow',product:'LED Face Mask',oldPrice:34.99,newPrice:29.99,change:-14,time:'1 hour ago',impact:'MEDIUM'},
  {store:'FitGear Pro',product:'Yoga Mat Pro',oldPrice:24.99,newPrice:19.99,change:-20,time:'2 hours ago',impact:'HIGH'},
  {store:'PetLover Store',product:'Auto Pet Feeder',oldPrice:39.99,newPrice:44.99,change:12,time:'3 hours ago',impact:'LOW'},
  {store:'TechGadget Hub',product:'Mini Projector',oldPrice:59.99,newPrice:49.99,change:-17,time:'4 hours ago',impact:'MEDIUM'},
  {store:'PostureTech',product:'Desk Posture Band',oldPrice:19.99,newPrice:14.99,change:-25,time:'5 hours ago',impact:'HIGH'},
  {store:'ChargeTech',product:'MagSafe Power Bank',oldPrice:34.99,newPrice:29.99,change:-14,time:'6 hours ago',impact:'MEDIUM'},
  {store:'HomeEssentials',product:'Robot Vacuum Lite',oldPrice:89.99,newPrice:79.99,change:-11,time:'8 hours ago',impact:'HIGH'}
];

var NEW_PRODUCTS=[
  {store:'StarLight Tech',name:'Levitating Speaker',category:'Audio',price:79.99,score:94,time:'2 hours ago'},
  {store:'BeautyGlow',name:'Smart Skincare Mirror',category:'Beauty Tech',price:59.99,score:91,time:'4 hours ago'},
  {store:'PetLover Store',name:'Interactive Cat Laser',category:'Pet Gadgets',price:24.99,score:88,time:'6 hours ago'},
  {store:'TechGadget Hub',name:'Holographic Phone Case',category:'Phone Accessories',price:19.99,score:86,time:'8 hours ago'},
  {store:'PostureTech',name:'Vibration Reminder Band',category:'Wellness',price:34.99,score:92,time:'10 hours ago'},
  {store:'ChargeTech',name:'Solar Power Bank 30W',category:'Charging',price:44.99,score:89,time:'12 hours ago'},
  {store:'Kawaii Decor Co',name:'Miniature Terrarium Kit',category:'Home Decor',price:29.99,score:85,time:'14 hours ago'},
  {store:'EcoKitchen Pro',name:'Bamboo Utensil Set',category:'Kitchen',price:18.99,score:82,time:'16 hours ago'}
];

function fmtMoney(n){return '$'+n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function fmtNum(n){return n>=1000?(n/1000).toFixed(1)+'K':n.toString();}

function getStoreScore(s){
  var r=0;
  r+=(s.revenue/500)*0.2;
  r+=(s.convRate*10)*0.2;
  r+=(s.products/2)*0.1;
  r+=(s.seoScore)*0.15;
  r+=(s.pageSpeed)*0.1;
  r+=((100-s.bounceRate))*0.1;
  r+=(s.ads>15?15:s.ads)*0.15;
  return Math.min(100,Math.round(r));
}

function getHealthGrade(score){
  if(score>=85) return {grade:'A+',color:'var(--accent-green)'};
  if(score>=75) return {grade:'A',color:'var(--accent-green)'};
  if(score>=65) return {grade:'B+',color:'var(--accent-cyan)'};
  if(score>=55) return {grade:'B',color:'var(--accent-cyan)'};
  if(score>=45) return {grade:'C',color:'var(--accent-orange)'};
  return {grade:'D',color:'var(--accent-red)'};
}

var SpyCenterPlugin = {
  id:'spy-center',
  name:'Store Spy Center',
  version:'2.0.0',
  description:'Full-stack store intelligence - revenue, ads, tech stack, traffic & pricing',
  dependencies:['search-engine'],

  init:function(ctx){Config.defaults('spyCenter',{enabled:true});},

  mount:function(ctx){
    var container = UI.$('sections-container');
    if(!container) return;

    var section = document.createElement('section');
    section.className = 'section section-spy';
    section.id = 'section-spy-center';

    var totalRevenue = STORES.reduce(function(a,s){return a+s.revenue;},0);
    var totalProducts = STORES.reduce(function(a,s){return a+s.products;},0);
    var avgConv = (STORES.reduce(function(a,s){return a+s.convRate;},0)/STORES.length).toFixed(1);

    section.innerHTML = ''
      +'<div class="section-inner">'
      +'<div class="section-header">'
      +'<h2 class="section-title">Store Spy Center</h2>'
      +'<p class="section-desc">Full-stack store intelligence - revenue, ads, tech stack, traffic & pricing analysis</p>'
      +'</div>'
      +'<div class="spy-input-area">'
      +'<div class="ai-search-box">'
      +'<input type="text" id="spyInput" placeholder="Enter store URL (e.g., store.myshopify.com)">'
      +'<button class="ai-analyze-btn spy-btn" id="spyBtn"><span class="ai-sparkle">&#128270;</span> Spy on Store</button>'
      +'</div>'
      +'<div class="spy-quick-picks">'
      +'<span class="spy-quick-label">Quick spy:</span>'
      +'<button class="spy-quick-btn" data-store="s1">PetLover</button>'
      +'<button class="spy-quick-btn" data-store="s3">BeautyGlow</button>'
      +'<button class="spy-quick-btn" data-store="s10">StarLight</button>'
      +'<button class="spy-quick-btn" data-store="s6">Kawaii Decor</button>'
      +'<button class="spy-quick-btn" data-store="s9">PostureTech</button>'
      +'</div>'
      +'</div>'
      +'<div class="spy-overview">'
      +'<div class="spy-ov-card"><div class="spy-ov-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">&#127978;</div><div class="spy-ov-info"><div class="spy-ov-value">'+STORES.length+'</div><div class="spy-ov-label">Stores Tracked</div></div></div>'
      +'<div class="spy-ov-card"><div class="spy-ov-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">&#128176;</div><div class="spy-ov-info"><div class="spy-ov-value">'+fmtMoney(totalRevenue)+'</div><div class="spy-ov-label">Combined Revenue</div></div></div>'
      +'<div class="spy-ov-card"><div class="spy-ov-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">&#128230;</div><div class="spy-ov-info"><div class="spy-ov-value">'+totalProducts+'</div><div class="spy-ov-label">Total Products</div></div></div>'
      +'<div class="spy-ov-card"><div class="spy-ov-icon" style="background:rgba(236,72,153,0.12);color:var(--accent-pink)">&#128200;</div><div class="spy-ov-info"><div class="spy-ov-value">'+avgConv+'%</div><div class="spy-ov-label">Avg Conversion</div></div></div>'
      +'<div class="spy-ov-card"><div class="spy-ov-icon" style="background:rgba(251,191,36,0.12);color:var(--accent-yellow)">&#127919;</div><div class="spy-ov-info"><div class="spy-ov-value">'+STORE_ADS.length+'</div><div class="spy-ov-label">Active Ads</div></div></div>'
      +'<div class="spy-ov-card"><div class="spy-ov-icon" style="background:rgba(168,85,247,0.12);color:var(--accent-purple)">&#9889;</div><div class="spy-ov-info"><div class="spy-ov-value">'+NEW_PRODUCTS.length+'</div><div class="spy-ov-label">New Products</div></div></div>'
      +'</div>'
      +'<div class="spy-tabs">'
      +'<button class="spy-tab active" data-tab="leaderboard">Leaderboard</button>'
      +'<button class="spy-tab" data-tab="ads">Ad Intelligence ('+STORE_ADS.length+')</button>'
      +'<button class="spy-tab" data-tab="pricing">Pricing Intel</button>'
      +'<button class="spy-tab" data-tab="techstack">Tech Stack</button>'
      +'<button class="spy-tab" data-tab="traffic">Traffic &amp; SEO</button>'
      +'<button class="spy-tab" data-tab="newproducts">New Products ('+NEW_PRODUCTS.length+')</button>'
      +'<button class="spy-tab" data-tab="revenue">Revenue Chart</button>'
      +'</div>'
      +'<div class="spy-tab-content" id="spyTabContent"></div>'
      +'<div id="spyProfileContainer"></div>'
      +window.HuntDrop.renderRelatedTools([
        {section:'section-battlefield',name:'Competitor Battlefield',desc:'Live competitive intel',icon:'&#9876;',color:'#FF6B6B'},
        {section:'section-ai-analyst',name:'AI Analyst',desc:'Deep product analysis',icon:'&#129504;',color:'#4ECDC4'},
        {section:'section-niche-radar',name:'Niche Radar',desc:'Track niche trends',icon:'&#128225;',color:'#45B7D1'},
        {section:'section-lifecycle',name:'Product Lifecycle',desc:'Monitor maturity',icon:'&#128202;',color:'#96CEB4'}
      ])
      +'</div>';

    container.appendChild(section);
    const self = SpyCenterPlugin;
    self.section = section;
    self.renderTab('leaderboard');

    self._liveInterval = setInterval(function(){self.updateLive();},5000);

    section.querySelectorAll('.spy-tab').forEach(function(tab){
      tab.addEventListener('click',function(){
        section.querySelectorAll('.spy-tab').forEach(function(t){t.classList.remove('active');});
        tab.classList.add('active');
        self.renderTab(tab.dataset.tab);
      });
    });

    section.querySelectorAll('.spy-quick-btn').forEach(function(btn){
      btn.addEventListener('click',function(){self.showStoreProfile(btn.dataset.store);});
    });

    var spyBtn = section.querySelector('#spyBtn');
    if(spyBtn) spyBtn.addEventListener('click',function(){
      var url = (section.querySelector('#spyInput')?.value || '').trim();
      if(!url) return;
      var match = STORES.find(function(s){return url.toLowerCase().indexOf(s.url.split('.')[0].toLowerCase())>-1;});
      if(match){self.showStoreProfile(match.id);}
      else{UI.toast('Store not found. Showing top store.','info',3000);self.showStoreProfile(STORES[0].id);}
    });
  },

  unmount:function(ctx){
    if(this._liveInterval) clearInterval(this._liveInterval);
    if(this._revenueChart){try{this._revenueChart.destroy();}catch(e){}this._revenueChart=null;}
    var el = UI.$('section-spy-center');
    if(el) el.remove();
  },

  renderTab:function(tab){
    var el = this.section.querySelector('#spyTabContent');
    if(!el) return;
    switch(tab){
      case 'leaderboard': el.innerHTML = this.renderLeaderboard(); this.bindLeaderboardClicks(); break;
      case 'ads': el.innerHTML = this.renderAds(); break;
      case 'pricing': el.innerHTML = this.renderPricing(); break;
      case 'techstack': el.innerHTML = this.renderTechStack(); break;
      case 'traffic': el.innerHTML = this.renderTraffic(); break;
      case 'newproducts': el.innerHTML = this.renderNewProducts(); break;
      case 'revenue': el.innerHTML = this.renderRevenue(); var self=this; setTimeout(function(){self.drawRevenueChart();},100); break;
    }
  },

  renderLeaderboard:function(){
    var ranked = STORES.map(function(s){
      return {store:s,score:getStoreScore(s),health:getHealthGrade(getStoreScore(s))};
    }).sort(function(a,b){return b.score-a.score;});
    var h='';
    h+='<div class="spy-lb-list">';
    ranked.forEach(function(r,i){
      var s=r.store;
      h+='<div class="spy-lb-row" data-store="'+s.id+'">'
        +'<div class="spy-lb-rank">#'+(i+1)+'</div>'
        +'<div class="spy-lb-avatar" style="background:'+s.color+'22;color:'+s.color+'">'+s.avatar+'</div>'
        +'<div class="spy-lb-info"><div class="spy-lb-name">'+esc(s.name)+'</div><div class="spy-lb-url">'+esc(s.url)+'</div></div>'
        +'<div class="spy-lb-stats">'
        +'<div class="spy-lb-stat"><span class="spy-lb-stat-val" style="color:var(--accent-green)">'+fmtMoney(s.revenue)+'</span><span class="spy-lb-stat-lbl">Revenue/mo</span></div>'
        +'<div class="spy-lb-stat"><span class="spy-lb-stat-val">'+fmtNum(s.traffic)+'</span><span class="spy-lb-stat-lbl">Traffic</span></div>'
        +'<div class="spy-lb-stat"><span class="spy-lb-stat-val">'+s.convRate+'%</span><span class="spy-lb-stat-lbl">Conv.</span></div>'
        +'<div class="spy-lb-stat"><span class="spy-lb-stat-val">'+s.products+'</span><span class="spy-lb-stat-lbl">Products</span></div>'
        +'<div class="spy-lb-stat"><span class="spy-lb-stat-val">'+s.ads+'</span><span class="spy-lb-stat-lbl">Ads</span></div>'
        +'</div>'
        +'<div class="spy-lb-health"><span class="spy-lb-grade" style="background:'+r.health.color+'18;color:'+r.health.color+'">'+r.health.grade+'</span><span class="spy-lb-score" style="color:'+r.health.color+'">'+r.score+'</span></div>'
        +'<div class="spy-lb-active"><span class="spy-lb-dot"></span>'+s.lastActive+'</div>'
        +'</div>';
    });
    h+='</div>';
    return h;
  },

  bindLeaderboardClicks:function(){
    var self = this;
    this.section.querySelectorAll('.spy-lb-row').forEach(function(row){
      row.addEventListener('click',function(){self.showStoreProfile(row.dataset.store);});
    });
  },

  renderAds:function(){
    var groups={running:[],scaling:[],testing:[]};
    STORE_ADS.forEach(function(a){groups[a.status]=groups[a.status]||[];groups[a.status].push(a);});
    var h='<div class="spy-ads-groups">';
    var order=[['scaling','&#128640; Scaling Now','var(--accent-orange)'],['running','&#9654; Running','var(--accent-green)'],['testing','&#129513; Testing','var(--accent-purple)']];
    order.forEach(function(g){
      var list=groups[g[0]]||[];
      if(!list.length) return;
      h+='<div class="spy-ads-group"><div class="spy-ads-group-header" style="color:'+g[2]+'">'+g[1]+' ('+list.length+')</div><div class="spy-ads-grid">';
      list.forEach(function(a){
        var store=STORES.find(function(s){return s.name===a.store;});
        var sc=a.status==='scaling'?'spy-ad-scaling':a.status==='testing'?'spy-ad-testing':'spy-ad-running';
        h+='<div class="spy-ad-card">'
          +'<div class="spy-ad-header"><span class="spy-ad-platform">'+a.platform+'</span><span class="spy-ad-status '+sc+'">'+a.status+'</span></div>'
          +'<div class="spy-ad-product">'+esc(a.product)+'</div>'
          +'<div class="spy-ad-hook">"'+esc(a.hook)+'"</div>'
          +'<div class="spy-ad-meta"><span>CTR: <strong style="color:var(--accent-cyan)">'+a.ctr+'%</strong></span><span>Spend: <strong>$'+a.spend+'/day</strong></span><span>'+a.age+' day'+(a.age>1?'s':'')+' old</span></div>'
          +'<div class="spy-ad-meta"><span>Format: '+a.format+'</span><span>Objective: '+a.objective+'</span></div>'
          +'<div class="spy-ad-engagement">Engagement: '+a.engagement+'</div>'
          +(store?'<div class="spy-ad-store"><span class="spy-ad-store-dot" style="background:'+store.color+'"></span>'+esc(store.name)+'</div>':'')
          +'</div>';
      });
      h+='</div></div>';
    });
    h+='</div>';
    return h;
  },

  renderPricing:function(){
    var h='<div class="spy-pricing-section">';
    h+='<div class="spy-pricing-alerts"><h3 class="spy-section-title">&#9888;&#65039; Recent Price Changes</h3><div class="spy-price-list">';
    PRICE_CHANGES.forEach(function(p){
      var isDown=p.change<0;
      var ic=p.impact==='HIGH'?'spy-impact-high':p.impact==='MEDIUM'?'spy-impact-medium':'spy-impact-low';
      h+='<div class="spy-price-row">'
        +'<div class="spy-price-store">'+esc(p.store)+'</div>'
        +'<div class="spy-price-product">'+esc(p.product)+'</div>'
        +'<div class="spy-price-change">'
        +'<span class="spy-price-old">$'+p.oldPrice.toFixed(2)+'</span>'
        +'<span class="spy-price-arrow">'+(isDown?'\u2193':'\u2191')+'</span>'
        +'<span class="spy-price-new" style="color:'+(isDown?'var(--accent-green)':'var(--accent-red)')+'">$'+p.newPrice.toFixed(2)+'</span>'
        +'<span class="spy-price-pct" style="color:'+(isDown?'var(--accent-green)':'var(--accent-red)')+'">'+(isDown?'':'+')+p.change+'%</span>'
        +'</div>'
        +'<div class="spy-price-impact '+ic+'">'+p.impact+'</div>'
        +'<div class="spy-price-time">'+p.time+'</div>'
        +'</div>';
    });
    h+='</div></div>';
    h+='<div class="spy-pricing-compare"><h3 class="spy-section-title">&#128202; Cross-Platform Price Comparison</h3>';
    h+='<div class="spy-compare-grid">';
    STORES.slice(0,5).forEach(function(s){
      h+='<div class="spy-compare-card"><div class="spy-compare-header"><span class="spy-compare-avatar" style="background:'+s.color+'22;color:'+s.color+'">'+s.avatar+'</span><span class="spy-compare-name">'+esc(s.name)+'</span></div>';
      h+='<div class="spy-compare-prices">';
      var platforms=['aliexpress','amazon','shopify','ebay','temu'];
      platforms.forEach(function(p){
        var price=Math.round(s.aov*(p==='aliexpress'?0.3:p==='amazon'?0.85:p==='shopify'?0.75:p==='ebay'?0.65:0.25));
        h+='<div class="spy-compare-price"><span class="spy-compare-platform">'+p.charAt(0).toUpperCase()+p.slice(1)+'</span><span class="spy-compare-val">$'+price+'</span></div>';
      });
      h+='</div></div>';
    });
    h+='</div></div></div>';
    return h;
  },

  renderTechStack:function(){
    var h='<div class="spy-tech-section">';
    STORES.forEach(function(s){
      var psColor=s.pageSpeed>=80?'var(--accent-green)':s.pageSpeed>=60?'var(--accent-orange)':'var(--accent-red)';
      var seoColor=s.seoScore>=75?'var(--accent-green)':s.seoScore>=60?'var(--accent-orange)':'var(--accent-red)';
      var brColor=s.bounceRate<=35?'var(--accent-green)':s.bounceRate<=45?'var(--accent-orange)':'var(--accent-red)';
      var sessionPct=(parseInt(s.avgSession.split(':')[0])*60+parseInt(s.avgSession.split(':')[1]))/6;
      h+='<div class="spy-tech-card">'
        +'<div class="spy-tech-header"><span class="spy-tech-avatar" style="background:'+s.color+'22;color:'+s.color+'">'+s.avatar+'</span><div><div class="spy-tech-name">'+esc(s.name)+'</div><div class="spy-tech-platform">'+esc(s.platform)+' \u00B7 '+esc(s.theme)+'</div></div><div class="spy-tech-age">'+esc(s.age)+' old</div></div>'
        +'<div class="spy-tech-apps">'+s.apps.map(function(a){return '<span class="spy-tech-app">'+a+'</span>';}).join('')+'</div>'
        +'<div class="spy-tech-metrics">'
        +'<div class="spy-tech-metric"><span class="spy-tech-metric-label">Page Speed</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:'+s.pageSpeed+'%;background:'+psColor+'"></div></div><span class="spy-tech-metric-val">'+s.pageSpeed+'/100</span></div>'
        +'<div class="spy-tech-metric"><span class="spy-tech-metric-label">SEO Score</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:'+s.seoScore+'%;background:'+seoColor+'"></div></div><span class="spy-tech-metric-val">'+s.seoScore+'/100</span></div>'
        +'<div class="spy-tech-metric"><span class="spy-tech-metric-label">Bounce Rate</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:'+s.bounceRate+'%;background:'+brColor+'"></div></div><span class="spy-tech-metric-val">'+s.bounceRate+'%</span></div>'
        +'<div class="spy-tech-metric"><span class="spy-tech-metric-label">Avg Session</span><div class="spy-tech-bar"><div class="spy-tech-bar-fill" style="width:'+sessionPct+'%;background:var(--accent-cyan)"></div></div><span class="spy-tech-metric-val">'+s.avgSession+'</span></div>'
        +'</div></div>';
    });
    h+='</div>';
    return h;
  },

  renderTraffic:function(){
    var h='<div class="spy-traffic-section">';
    h+='<h3 class="spy-section-title">&#127760; Traffic Sources &amp; Social Presence</h3>';
    h+='<div class="spy-traffic-grid">';
    STORES.forEach(function(s){
      h+='<div class="spy-traffic-card">'
        +'<div class="spy-traffic-header"><span class="spy-traffic-avatar" style="background:'+s.color+'22;color:'+s.color+'">'+s.avatar+'</span><div><div class="spy-traffic-name">'+esc(s.name)+'</div><div class="spy-traffic-cat">'+esc(s.category)+'</div></div></div>'
        +'<div class="spy-traffic-sources">';
      var srcs=s.trafficSources;
      ['direct','organic','paid','social','referral'].forEach(function(k){
        h+='<div class="spy-traffic-source"><div class="spy-traffic-source-label">'+k.charAt(0).toUpperCase()+k.slice(1)+'</div><div class="spy-traffic-source-bar"><div class="spy-traffic-source-fill" style="width:'+srcs[k]+'%"></div></div><div class="spy-traffic-source-val">'+srcs[k]+'%</div></div>';
      });
      h+='</div>'
        +'<div class="spy-traffic-social">'
        +'<div class="spy-social-item"><span class="spy-social-icon fb">f</span><span class="spy-social-val">'+fmtNum(s.socialFB)+'</span></div>'
        +'<div class="spy-social-item"><span class="spy-social-icon ig">\u25CE</span><span class="spy-social-val">'+fmtNum(s.socialIG)+'</span></div>'
        +'<div class="spy-social-item"><span class="spy-social-icon tk">\u266A</span><span class="spy-social-val">'+fmtNum(s.socialTK)+'</span></div>'
        +'</div>'
        +'<div class="spy-traffic-total"><span>Total Traffic:</span><span style="color:var(--accent-cyan);font-family:var(--font-mono);font-weight:700">'+fmtNum(s.traffic)+'/mo</span></div>'
        +'</div>';
    });
    h+='</div></div>';
    return h;
  },

  renderNewProducts:function(){
    var h='<div class="spy-newprod-list">';
    NEW_PRODUCTS.forEach(function(np){
      h+='<div class="spy-newprod-row">'
        +'<div class="spy-newprod-store">'+esc(np.store)+'</div>'
        +'<div class="spy-newprod-info"><div class="spy-newprod-name">'+esc(np.name)+'</div><div class="spy-newprod-cat">'+esc(np.category)+'</div></div>'
        +'<div class="spy-newprod-price">$'+np.price.toFixed(2)+'</div>'
        +'<div class="spy-newprod-score"><span class="spy-newprod-score-val">'+np.score+'</span>/100</div>'
        +'<div class="spy-newprod-time">'+np.time+'</div>'
        +'</div>';
    });
    h+='</div>';
    return h;
  },

  renderRevenue:function(){
    var h='<div class="spy-revenue-section">'
      +'<h3 class="spy-section-title">&#128200; Revenue Estimation</h3>'
      +'<p class="spy-revenue-desc">Estimated monthly revenue based on traffic, conversion rates, and average order values</p>'
      +'<div class="spy-chart-container"><canvas id="spyRevenueChart"></canvas></div>'
      +'<div class="spy-revenue-table">'
      +'<div class="spy-rev-header"><span>Store</span><span>Traffic</span><span>Conv.</span><span>AOV</span><span>Revenue</span><span>Daily</span><span>Refund</span></div>';
    var sorted=[].concat(STORES).sort(function(a,b){return b.revenue-a.revenue;});
    sorted.forEach(function(s){
      var daily=Math.round(s.revenue/30);
      h+='<div class="spy-rev-row"><span class="spy-rev-name">'+esc(s.name)+'</span><span>'+fmtNum(s.traffic)+'</span><span>'+s.convRate+'%</span><span>$'+s.aov.toFixed(2)+'</span><span style="color:var(--accent-green)">'+fmtMoney(s.revenue)+'</span><span>'+fmtMoney(daily)+'</span><span style="color:var(--accent-red)">'+s.refundRate+'%</span></div>';
    });
    h+='</div></div>';
    return h;
  },

  drawRevenueChart:function(){
    var el=this.section.querySelector('#spyRevenueChart');
    if(!el||typeof Chart==='undefined'||Chart===window.Chart) return;
    if(this._revenueChart) try{this._revenueChart.destroy();}catch(e){}
    var labels=STORES.map(function(s){return s.name.split(' ')[0];});
    var revenues=STORES.map(function(s){return s.revenue;});
    this._revenueChart=new Chart(el,{
      type:'bar',
      data:{labels:labels,datasets:[{data:revenues,backgroundColor:STORES.map(function(s){return s.color+'88';}),borderColor:STORES.map(function(s){return s.color;}),borderWidth:1,borderRadius:5}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{backgroundColor:'#111119',borderColor:'#2a2a3d',borderWidth:1,titleFont:{family:'Outfit',size:11},bodyFont:{family:'JetBrains Mono',size:12},padding:10,displayColors:false,callbacks:{label:function(ctx){return '$'+ctx.parsed.y.toLocaleString()+'/mo';}}}},
        scales:{x:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9}}},y:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},callback:function(v){return '$'+fmtNum(v);}}}}
      }
    });
  },

  showStoreProfile:function(storeId){
    var s=STORES.find(function(st){return st.id===storeId;});
    if(!s) return;
    var container=this.section.querySelector('#spyProfileContainer');
    if(!container) return;

    var score=getStoreScore(s);
    var health=getHealthGrade(score);
    var dailyRev=Math.round(s.revenue/30);
    var monthlyOrders=Math.round(s.revenue/s.aov);
    var storeAds=STORE_ADS.filter(function(a){return a.store===s.name;});
    var newProds=NEW_PRODUCTS.filter(function(p){return p.store===s.name;});
    var priceAlerts=PRICE_CHANGES.filter(function(p){return p.store===s.name;});

    var h='<div class="spy-profile-overlay" id="spyProfileOverlay"></div>'
      +'<div class="spy-profile-panel" id="spyProfilePanel">'
      +'<div class="spy-profile-header">'
      +'<div class="spy-profile-title-row"><div class="spy-profile-avatar" style="background:'+s.color+'22;color:'+s.color+';font-size:28px">'+s.avatar+'</div><div><h3 class="spy-profile-name">'+esc(s.name)+'</h3><div class="spy-profile-url">'+esc(s.url)+' \u00B7 '+esc(s.platform)+'</div></div>'
      +'<button class="spy-profile-close" id="spyProfileClose">\u2715</button></div>'
      +'<div class="spy-profile-badges">'
      +'<span class="spy-badge" style="background:'+health.color+'18;color:'+health.color+'">'+health.grade+' ('+score+')</span>'
      +'<span class="spy-badge spy-badge-cat">'+esc(s.category)+'</span>'
      +'<span class="spy-badge spy-badge-age">'+esc(s.age)+' old</span>'
      +'<span class="spy-badge spy-badge-theme">'+esc(s.theme)+'</span>'
      +'</div></div>'
      +'<div class="spy-profile-stats">'
      +'<div class="spy-profile-stat"><div class="spy-profile-stat-val" style="color:var(--accent-green)">'+fmtMoney(s.revenue)+'</div><div class="spy-profile-stat-lbl">Revenue/mo</div></div>'
      +'<div class="spy-profile-stat"><div class="spy-profile-stat-val">'+fmtMoney(dailyRev)+'</div><div class="spy-profile-stat-lbl">Daily Rev</div></div>'
      +'<div class="spy-profile-stat"><div class="spy-profile-stat-val">'+fmtNum(s.traffic)+'</div><div class="spy-profile-stat-lbl">Traffic/mo</div></div>'
      +'<div class="spy-profile-stat"><div class="spy-profile-stat-val">'+s.convRate+'%</div><div class="spy-profile-stat-lbl">Conversion</div></div>'
      +'<div class="spy-profile-stat"><div class="spy-profile-stat-val">'+fmtNum(monthlyOrders)+'</div><div class="spy-profile-stat-lbl">Orders/mo</div></div>'
      +'<div class="spy-profile-stat"><div class="spy-profile-stat-val">$'+s.aov.toFixed(2)+'</div><div class="spy-profile-stat-lbl">Avg Order</div></div>'
      +'</div>'
      +'<div class="spy-profile-sections">';

    if(storeAds.length>0){
      h+='<div class="spy-profile-section"><h4>&#127919; Active Ads ('+storeAds.length+')</h4><div class="spy-profile-ads">';
      storeAds.forEach(function(a){
        h+='<div class="spy-profile-ad"><span class="spy-profile-ad-platform">'+esc(a.platform)+'</span><span class="spy-profile-ad-hook">"'+esc(a.hook)+'"</span><span class="spy-profile-ad-ctr">CTR: '+a.ctr+'%</span></div>';
      });
      h+='</div></div>';
    }

    if(newProds.length>0){
      h+='<div class="spy-profile-section"><h4>&#127381; New Products ('+newProds.length+')</h4><div class="spy-profile-newprods">';
      newProds.forEach(function(p){
        h+='<div class="spy-profile-newprod"><span>'+esc(p.name)+'</span><span style="color:var(--accent-green)">$'+p.price.toFixed(2)+'</span><span style="color:var(--accent-cyan)">'+p.score+'/100</span></div>';
      });
      h+='</div></div>';
    }

    if(priceAlerts.length>0){
      h+='<div class="spy-profile-section"><h4>&#128176; Price Changes ('+priceAlerts.length+')</h4><div class="spy-profile-prices">';
      priceAlerts.forEach(function(p){
        var isDown=p.change<0;
        h+='<div class="spy-profile-price"><span>'+esc(p.product)+'</span><span class="spy-price-old">$'+p.oldPrice.toFixed(2)+'</span><span>'+(isDown?'\u2193':'\u2191')+'</span><span style="color:'+(isDown?'var(--accent-green)':'var(--accent-red)')+'">$'+p.newPrice.toFixed(2)+'</span></div>';
      });
      h+='</div></div>';
    }

    h+='<div class="spy-profile-section"><h4>&#128736; Tech Stack</h4><div class="spy-profile-apps">'
      +s.apps.map(function(a){return '<span class="spy-tech-app">'+a+'</span>';}).join('')
      +'</div></div>';

    h+='<div class="spy-profile-section"><h4>&#127760; Traffic Sources</h4><div class="spy-profile-traffic">';
    var srcs=s.trafficSources;
    ['direct','organic','paid','social','referral'].forEach(function(k){
      h+='<div class="spy-profile-traffic-row"><span>'+k.charAt(0).toUpperCase()+k.slice(1)+'</span><div class="spy-traffic-source-bar"><div class="spy-traffic-source-fill" style="width:'+srcs[k]+'%"></div></div><span>'+srcs[k]+'%</span></div>';
    });
    h+='</div></div>';

    h+='<div class="spy-profile-section"><h4>&#128241; Social Following</h4><div class="spy-profile-social">'
      +'<div class="spy-social-item"><span class="spy-social-icon fb">f</span><span class="spy-social-val">'+fmtNum(s.socialFB)+'</span></div>'
      +'<div class="spy-social-item"><span class="spy-social-icon ig">\u25CE</span><span class="spy-social-val">'+fmtNum(s.socialIG)+'</span></div>'
      +'<div class="spy-social-item"><span class="spy-social-icon tk">\u266A</span><span class="spy-social-val">'+fmtNum(s.socialTK)+'</span></div>'
      +'</div></div>';

    h+='<div class="spy-profile-section"><h4>&#128202; Performance Metrics</h4><div class="spy-profile-perf">'
      +'<div class="spy-profile-perf-row"><span>Page Speed</span><span style="color:var(--accent-cyan)">'+s.pageSpeed+'/100</span></div>'
      +'<div class="spy-profile-perf-row"><span>SEO Score</span><span style="color:var(--accent-cyan)">'+s.seoScore+'/100</span></div>'
      +'<div class="spy-profile-perf-row"><span>Bounce Rate</span><span style="color:var(--accent-orange)">'+s.bounceRate+'%</span></div>'
      +'<div class="spy-profile-perf-row"><span>Avg Session</span><span>'+s.avgSession+'</span></div>'
      +'<div class="spy-profile-perf-row"><span>Refund Rate</span><span style="color:var(--accent-red)">'+s.refundRate+'%</span></div>'
      +'</div></div>';

    h+='</div></div>';
    container.innerHTML=h;

    var self=this;
    var closeBtn=container.querySelector('#spyProfileClose');
    var overlay=container.querySelector('#spyProfileOverlay');
    function closeProfile(){container.innerHTML='';}
    if(closeBtn) closeBtn.addEventListener('click',closeProfile);
    if(overlay) overlay.addEventListener('click',closeProfile);
  },

  updateLive:function(){
    var dots=this.section.querySelectorAll('.spy-lb-dot');
    dots.forEach(function(d){d.style.opacity=d.style.opacity==='0.3'?'1':'0.3';});
  }
};

PluginRegistry.register('spy-center',SpyCenterPlugin);
})();
