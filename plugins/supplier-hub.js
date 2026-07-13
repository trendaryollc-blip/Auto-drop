// ============================================================================
// PLUGIN: Supplier Hub v3 — Verified supplier directory with detail view
// ============================================================================
(function(){
const {EventBus,PluginRegistry,Config,UI} = window.HuntDrop;

const SUPPLIERS=[
  {name:"TechGear Direct",platform:"AliExpress",location:"Shenzhen, CN",rating:4.9,orders:"120K",response:"< 2h",verified:true,products:342,shipTime:"7-15 days",shipCost:"$2-5",minOrder:"$50",refundRate:"1.2%",quality:95,communication:92,value:88,color:"var(--accent-cyan)",specialty:"Electronics & Gadgets",yearsActive:6,responseRate:96,fulfillmentRate:98.5,disputeRate:0.8,paymentTerms:"Escrow",sampleAvailable:true,customPackaging:true,dropshipSupport:true,topProducts:["Wireless Earbuds","Smart Watch","Phone Holder","LED Strip Lights","Bluetooth Speaker"]},
  {name:"SmartHome US",platform:"Amazon",location:"Dallas, US",rating:4.7,orders:"200K",response:"< 1h",verified:true,products:156,shipTime:"2-5 days",shipCost:"Free Prime",minOrder:"$0",refundRate:"0.8%",quality:90,communication:96,value:82,color:"var(--accent-orange)",specialty:"Smart Home Devices",yearsActive:4,responseRate:99,fulfillmentRate:99.2,disputeRate:0.5,paymentTerms:"Credit Card",sampleAvailable:true,customPackaging:false,dropshipSupport:true,topProducts:["Smart Plug","WiFi Camera","Smart Light","Voice Assistant","Door Sensor"]},
  {name:"PetEase Supplies",platform:"AliExpress",location:"Yiwu, CN",rating:4.8,orders:"95K",response:"< 3h",verified:true,products:228,shipTime:"8-18 days",shipCost:"$1-4",minOrder:"$30",refundRate:"1.5%",quality:88,communication:85,value:92,color:"var(--accent-green)",specialty:"Pet Products",yearsActive:5,responseRate:93,fulfillmentRate:97.8,disputeRate:1.2,paymentTerms:"Escrow",sampleAvailable:true,customPackaging:true,dropshipSupport:true,topProducts:["Pet Camera","Dog Collar","Cat Toy","Pet Feeder","Grooming Kit"]},
  {name:"BeautyGlow Co",platform:"CJ Dropshipping",location:"Yiwu, CN",rating:4.6,orders:"400K",response:"< 1h",verified:true,products:567,shipTime:"5-12 days",shipCost:"$1-3",minOrder:"$0",refundRate:"2.1%",quality:86,communication:94,value:90,color:"var(--accent-pink)",specialty:"Beauty & Health",yearsActive:7,responseRate:97,fulfillmentRate:96.5,disputeRate:1.8,paymentTerms:"PayPal/CC",sampleAvailable:true,customPackaging:true,dropshipSupport:true,topProducts:["Facial Device","Hair Remover","Massage Gun","Skincare Set","Makeup Mirror"]},
  {name:"StarLight Tech",platform:"DHgate",location:"Shenzhen, CN",rating:4.9,orders:"200K",response:"< 1h",verified:true,products:189,shipTime:"6-14 days",shipCost:"$2-6",minOrder:"$100",refundRate:"0.9%",quality:94,communication:91,value:85,color:"var(--accent-purple)",specialty:"LED & Lighting",yearsActive:8,responseRate:98,fulfillmentRate:99.1,disputeRate:0.6,paymentTerms:"Escrow",sampleAvailable:true,customPackaging:true,dropshipSupport:true,topProducts:["LED Galaxy Projector","Star Light","Strip Lights","Night Light","Lamp"]},
  {name:"PawWalk USA",platform:"Amazon",location:"Los Angeles, US",rating:4.7,orders:"110K",response:"< 1h",verified:true,products:94,shipTime:"1-4 days",shipCost:"Free Prime",minOrder:"$0",refundRate:"0.6%",quality:92,communication:97,value:80,color:"var(--accent-yellow)",specialty:"Pet Accessories",yearsActive:3,responseRate:99,fulfillmentRate:99.5,disputeRate:0.4,paymentTerms:"Credit Card",sampleAvailable:true,customPackaging:false,dropshipSupport:true,topProducts:["Dog Harness","Pet Carrier","Dog Bed","Cat Tree","Water Fountain"]},
  {name:"FitGear Pro",platform:"Temu",location:"Yiwu, CN",rating:4.7,orders:"320K",response:"< 1h",verified:true,products:445,shipTime:"7-14 days",shipCost:"Free",minOrder:"$0",refundRate:"1.8%",quality:82,communication:88,value:95,color:"var(--accent-red)",specialty:"Fitness Equipment",yearsActive:5,responseRate:95,fulfillmentRate:97.2,disputeRate:1.5,paymentTerms:"Credit Card",sampleAvailable:true,customPackaging:true,dropshipSupport:true,topProducts:["Resistance Bands","Yoga Mat","Massage Gun","Jump Rope","Dumbbells"]},
  {name:"PostureTech",platform:"TikTok Shop",location:"Shenzhen, CN",rating:4.9,orders:"90K",response:"< 1h",verified:true,products:128,shipTime:"5-10 days",shipCost:"$1-3",minOrder:"$20",refundRate:"1.0%",quality:93,communication:90,value:87,color:"var(--accent-cyan)",specialty:"Ergonomic Products",yearsActive:4,responseRate:97,fulfillmentRate:98.8,disputeRate:0.7,paymentTerms:"Escrow",sampleAvailable:true,customPackaging:true,dropshipSupport:true,topProducts:["Neck Corrector","Back Support","Desk Organizer","Foot Massager","Eye Massager"]},
  {name:"KitchenWiz",platform:"AliExpress",location:"Ningbo, CN",rating:4.8,orders:"70K",response:"< 2h",verified:true,products:267,shipTime:"8-16 days",shipCost:"$2-5",minOrder:"$50",refundRate:"1.4%",quality:89,communication:86,value:91,color:"var(--accent-orange)",specialty:"Kitchen Gadgets",yearsActive:6,responseRate:94,fulfillmentRate:97.5,disputeRate:1.1,paymentTerms:"Escrow",sampleAvailable:true,customPackaging:true,dropshipSupport:true,topProducts:["Air Fryer","Food Chopper","Coffee Maker","Knife Set","Storage Containers"]},
  {name:"ChargeTech",platform:"DHgate",location:"Shenzhen, CN",rating:4.7,orders:"100K",response:"< 2h",verified:true,products:178,shipTime:"6-12 days",shipCost:"$2-4",minOrder:"$80",refundRate:"1.1%",quality:91,communication:88,value:86,color:"var(--accent-purple)",specialty:"Phone Accessories",yearsActive:5,responseRate:95,fulfillmentRate:98.0,disputeRate:0.9,paymentTerms:"Escrow",sampleAvailable:true,customPackaging:true,dropshipSupport:true,topProducts:["Car Mount","Wireless Charger","Phone Case","Screen Protector","Cable Set"]},
  {name:"CleanTech Labs",platform:"Temu",location:"Shenzhen, CN",rating:4.6,orders:"45K",response:"< 3h",verified:true,products:56,shipTime:"7-14 days",shipCost:"Free",minOrder:"$0",refundRate:"2.0%",quality:80,communication:84,value:93,color:"var(--accent-cyan)",specialty:"Cleaning Products",yearsActive:3,responseRate:91,fulfillmentRate:96.0,disputeRate:2.0,paymentTerms:"Credit Card",sampleAvailable:true,customPackaging:false,dropshipSupport:true,topProducts:["Vacuum Cleaner","Mop Set","Cleaning Spray","Organizer","Air Purifier"]},
  {name:"GlowDecor",platform:"Etsy",location:"Shenzhen, CN",rating:4.8,orders:"65K",response:"< 2h",verified:true,products:89,shipTime:"10-20 days",shipCost:"$3-8",minOrder:"$25",refundRate:"1.3%",quality:87,communication:89,value:84,color:"var(--accent-green)",specialty:"Home Decor",yearsActive:4,responseRate:93,fulfillmentRate:97.8,disputeRate:1.0,paymentTerms:"PayPal",sampleAvailable:true,customPackaging:true,dropshipSupport:true,topProducts:["Wall Art","LED Frame","Plant Pot","Candle Holder","Photo Frame"]}
];

function computeScore(s){
  return Math.round((s.quality*0.3 + s.communication*0.3 + s.value*0.4));
}

function getRiskLevel(s){
  var risk=0;
  if(!s.verified) risk+=30;
  if(s.rating<4.5) risk+=15;
  if(s.disputeRate>1.5) risk+=20;
  if(s.responseRate<90) risk+=15;
  if(risk>40) return {level:'HIGH',color:'var(--accent-red)'};
  if(risk>20) return {level:'MEDIUM',color:'var(--accent-orange)'};
  return {level:'LOW',color:'var(--accent-green)'};
}

function getGrade(score){
  if(score>=90) return {grade:'A+',color:'var(--accent-green)'};
  if(score>=80) return {grade:'A',color:'var(--accent-green)'};
  if(score>=70) return {grade:'B+',color:'var(--accent-cyan)'};
  if(score>=60) return {grade:'B',color:'var(--accent-cyan)'};
  if(score>=50) return {grade:'C',color:'var(--accent-orange)'};
  return {grade:'D',color:'var(--accent-red)'};
}

function formatMoney(n){return '$'+n.toFixed(2);}

const SupplierHubPlugin = {
  id: 'supplier-hub',
  name: 'Find Suppliers',
  version: '3.0.0',
  description: 'Verified suppliers from all 10 platforms — compare shipping, pricing & reliability scores',
  _section: null,

  init(ctx) {},

  mount(ctx) {
    const container = UI.$('sections-container');
    if (!container) return;

    const verifiedCount = SUPPLIERS.filter(s=>s.verified).length;
    const avgRating = (SUPPLIERS.reduce((a,s)=>a+s.rating,0)/SUPPLIERS.length).toFixed(1);
    const avgProducts = Math.round(SUPPLIERS.reduce((a,s)=>a+s.products,0)/SUPPLIERS.length);
    const totalOrders = SUPPLIERS.reduce((a,s)=>a+parseInt(s.orders),0);

    const section = document.createElement('section');
    section.className = 'section section-suppliers';
    section.id = 'section-supplier-hub';
    section.innerHTML = `
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">Supplier Intelligence Hub</h2>
          <p class="section-desc">Verified suppliers from all 10 platforms — compare shipping, pricing & reliability scores</p>
        </div>

        <div class="sh-overview">
          <div class="sh-stat-card"><div class="sh-stat-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🏢</div><div class="sh-stat-info"><div class="sh-stat-value">${SUPPLIERS.length}</div><div class="sh-stat-label">Total Suppliers</div></div></div>
          <div class="sh-stat-card"><div class="sh-stat-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">✅</div><div class="sh-stat-info"><div class="sh-stat-value">${verifiedCount}</div><div class="sh-stat-label">Verified</div></div></div>
          <div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(255,215,0,0.12);color:var(--accent-yellow)">⭐</div><div class="sh-stat-info"><div class="sh-stat-value">${avgRating}</div><div class="sh-stat-label">Avg Rating</div></div></div>
          <div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(168,85,247,0.12);color:var(--accent-purple)">📦</div><div class="sh-stat-info"><div class="sh-stat-value">${(totalOrders/1000).toFixed(0)}K</div><div class="sh-stat-label">Total Orders</div></div></div>
          <div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(255,138,0,0.12);color:var(--accent-orange)">🛍️</div><div class="sh-stat-info"><div class="sh-stat-value">${avgProducts}</div><div class="sh-stat-label">Avg Products</div></div></div>
        </div>

        <div class="supplier-filters">
          <button class="sf-btn active" data-sf="all">All Suppliers</button>
          <button class="sf-btn" data-sf="verified">✅ Verified</button>
          <button class="sf-btn" data-sf="fast">⚡ Fast Ship</button>
          <button class="sf-btn" data-sf="cheap">💲 Best Price</button>
          <button class="sf-btn" data-sf="rated">⭐ Top Rated</button>
        </div>

        <div class="supplier-hub-grid" id="supplierHubGrid"></div>
        <div id="supplierDetailPanel" class="sh-detail-panel"></div>

        <div class="sh-section">
          <h3 class="sh-section-title">📊 Supplier Comparison</h3>
          <p class="sh-section-sub">Side-by-side comparison of top suppliers across key metrics</p>
          <div class="sh-table-wrap">
            <table class="sh-table">
              <thead><tr><th>Supplier</th><th>Platform</th><th>Rating</th><th>Ship Time</th><th>Ship Cost</th><th>Min Order</th><th>Refund Rate</th><th>Score</th></tr></thead>
              <tbody id="shComparisonBody"></tbody>
            </table>
          </div>
        </div>

        <div class="sh-section">
          <h3 class="sh-section-title">🎯 Score Breakdown</h3>
          <p class="sh-section-sub">Detailed performance metrics for each supplier</p>
          <div class="sh-scores-grid" id="shScoresGrid"></div>
        </div>

        <div class="sh-section">
          <h3 class="sh-section-title">🚚 Shipping & Logistics</h3>
          <p class="sh-section-sub">Average shipping times and costs by platform</p>
          <div class="sh-shipping-grid" id="shShippingGrid"></div>
        </div>

        <div class="sh-section">
          <h3 class="sh-section-title">✅ Supplier Verification Checklist</h3>
          <p class="sh-section-sub">Essential checks before committing to any supplier</p>
          <div class="sh-checklist" id="shChecklist"></div>
        </div>

        <div class="sh-section">
          <h3 class="sh-section-title">🏆 Top Picks by Use Case</h3>
          <p class="sh-section-sub">Best supplier recommendations based on your needs</p>
          <div class="sh-picks-grid" id="shPicksGrid"></div>
        </div>

        ${window.HuntDrop.renderRelatedTools([
          { section:'section-store-gen', name:'Store Generator', desc:'Build your store', icon:'🏪', color:'#FF6B6B' },
          { section:'section-profit-lab', name:'Profit Calculator', desc:'Calculate margins', icon:'🧮', color:'#4ECDC4' },
          { section:'section-health', name:'Store Health', desc:'Check readiness', icon:'❤️', color:'#45B7D1' },
          { section:'section-bundles', name:'Bundle Intelligence', desc:'Source bundles', icon:'📦', color:'#96CEB4' }
        ])}
      </div>`;
    container.appendChild(section);
    const self = SupplierHubPlugin;
    self._section = section;

    self.renderCards(SUPPLIERS);
    self.renderComparison(SUPPLIERS);
    self.renderScores(SUPPLIERS);
    self.renderShipping(SUPPLIERS);
    self.renderChecklist();
    self.renderPicks();
    self.bindFilters();
  },

  renderCards(suppliers){
    const grid = this._section?.querySelector('#supplierHubGrid');
    if(!grid) return;
    grid.innerHTML = suppliers.map((s,i)=>{
      const score = computeScore(s);
      const risk = getRiskLevel(s);
      const grade = getGrade(score);
      return `<div class="supplier-hub-card" tabindex="0" role="button" aria-label="View ${s.name} details" data-idx="${i}" data-verified="${s.verified}" data-response="${s.response}" data-rating="${s.rating}" data-platform="${s.platform}">
        <div class="supplier-hub-header">
          <div class="supplier-hub-avatar" style="background:${s.color}22;color:${s.color}">${s.name.charAt(0)}</div>
          <div><div class="supplier-hub-name">${s.name}</div><div class="supplier-hub-platform">${s.platform} \u2022 ${s.location}</div></div>
          <div class="sh-card-grade" style="background:${grade.color}18;color:${grade.color}">${grade.grade}</div>
        </div>
        <div class="supplier-hub-stats">
          <div class="supplier-hub-stat"><span class="supplier-hub-stat-value" style="color:var(--accent-yellow)">${s.rating}\u2605</span><span class="supplier-hub-stat-label">Rating</span></div>
          <div class="supplier-hub-stat"><span class="supplier-hub-stat-value">${s.orders}</span><span class="supplier-hub-stat-label">Orders</span></div>
          <div class="supplier-hub-stat"><span class="supplier-hub-stat-value">${s.response}</span><span class="supplier-hub-stat-label">Response</span></div>
          <div class="supplier-hub-stat"><span class="supplier-hub-stat-value">${s.products}</span><span class="supplier-hub-stat-label">Products</span></div>
        </div>
        <div class="supplier-hub-score-bar"><div class="supplier-hub-score-fill" style="width:${score}%;background:${score>=90?'var(--accent-green)':score>=80?'var(--accent-cyan)':'var(--accent-orange)'}"></div><span class="supplier-hub-score-text">${score}/100</span></div>
        <div class="supplier-hub-footer">
          ${s.verified ? '<span class="supplier-verified">\u2713 Verified</span>' : ''}
          <span class="sh-card-risk" style="color:${risk.color}">${risk.level} RISK</span>
          <span class="sh-card-view">View Details \u2192</span>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.supplier-hub-card').forEach(card=>{
      const handler = ()=>{ const idx = parseInt(card.dataset.idx); this.showDetail(suppliers[idx]); };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handler(); }});
    });
  },

  showDetail(supplier){
    const panel = this._section?.querySelector('#supplierDetailPanel');
    if(!panel) return;
    const score = computeScore(supplier);
    const risk = getRiskLevel(supplier);
    const grade = getGrade(score);

    panel.innerHTML = `
      <div class="sh-detail-overlay" id="shDetailClose"></div>
      <div class="sh-detail-content">
        <button class="sh-detail-close" id="shDetailCloseBtn" aria-label="Close detail panel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div class="sh-detail-hero">
          <div class="sh-detail-avatar" style="background:${supplier.color}22;color:${supplier.color};border:2px solid ${supplier.color}">${supplier.name.charAt(0)}</div>
          <div class="sh-detail-hero-info">
            <h2 class="sh-detail-name">${supplier.name}</h2>
            <div class="sh-detail-meta">${supplier.platform} \u2022 ${supplier.location} \u2022 ${supplier.specialty}</div>
            <div class="sh-detail-badges">
              <span class="sh-detail-badge" style="background:${grade.color}18;color:${grade.color}">Grade ${grade.grade}</span>
              <span class="sh-detail-badge" style="background:var(--accent-yellow-dim);color:var(--accent-yellow)">${supplier.rating}\u2605</span>
              <span class="sh-detail-badge" style="background:${risk.color}18;color:${risk.color}">${risk.level} RISK</span>
              ${supplier.verified?'<span class="sh-detail-badge" style="background:var(--accent-green-dim);color:var(--accent-green)">\u2713 Verified</span>':''}
            </div>
          </div>
          <div class="sh-detail-score-ring">
            <svg viewBox="0 0 100 100" class="sh-detail-ring-svg">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-primary)" stroke-width="6"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke="${score>=90?'var(--accent-green)':score>=80?'var(--accent-cyan)':'var(--accent-orange)'}" stroke-width="6" stroke-dasharray="${264}" stroke-dashoffset="${264-(264*score/100)}" stroke-linecap="round" transform="rotate(-90 50 50)" style="transition:stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)"/>
            </svg>
            <div class="sh-detail-score-val">${score}</div>
            <div class="sh-detail-score-label">Score</div>
          </div>
        </div>

        <div class="sh-detail-grid">
          <div class="sh-detail-card">
            <h4>\uD83D\uDCCA Key Metrics</h4>
            <div class="sh-detail-metrics">
              <div class="sh-detail-m"><span class="sh-detail-m-label">Total Orders</span><span class="sh-detail-m-val">${supplier.orders}</span></div>
              <div class="sh-detail-m"><span class="sh-detail-m-label">Products</span><span class="sh-detail-m-val">${supplier.products}</span></div>
              <div class="sh-detail-m"><span class="sh-detail-m-label">Response Time</span><span class="sh-detail-m-val">${supplier.response}</span></div>
              <div class="sh-detail-m"><span class="sh-detail-m-label">Response Rate</span><span class="sh-detail-m-val">${supplier.responseRate}%</span></div>
              <div class="sh-detail-m"><span class="sh-detail-m-label">Fulfillment Rate</span><span class="sh-detail-m-val">${supplier.fulfillmentRate}%</span></div>
              <div class="sh-detail-m"><span class="sh-detail-m-label">Dispute Rate</span><span class="sh-detail-m-val" style="color:${supplier.disputeRate<1?'var(--accent-green)':'var(--accent-orange)'}">${supplier.disputeRate}%</span></div>
              <div class="sh-detail-m"><span class="sh-detail-m-label">Refund Rate</span><span class="sh-detail-m-val">${supplier.refundRate}</span></div>
              <div class="sh-detail-m"><span class="sh-detail-m-label">Years Active</span><span class="sh-detail-m-val">${supplier.yearsActive} years</span></div>
            </div>
          </div>

          <div class="sh-detail-card">
            <h4>\uD83D\uDCE9 Shipping Info</h4>
            <div class="sh-detail-metrics">
              <div class="sh-detail-m"><span class="sh-detail-m-label">Ship Time</span><span class="sh-detail-m-val">${supplier.shipTime}</span></div>
              <div class="sh-detail-m"><span class="sh-detail-m-label">Ship Cost</span><span class="sh-detail-m-val">${supplier.shipCost}</span></div>
              <div class="sh-detail-m"><span class="sh-detail-m-label">Min Order</span><span class="sh-detail-m-val">${supplier.minOrder}</span></div>
              <div class="sh-detail-m"><span class="sh-detail-m-label">Payment Terms</span><span class="sh-detail-m-val">${supplier.paymentTerms}</span></div>
            </div>
          </div>

          <div class="sh-detail-card">
            <h4>\u2705 Capabilities</h4>
            <div class="sh-detail-cap-list">
              <div class="sh-detail-cap ${supplier.verified?'cap-yes':'cap-no'}">${supplier.verified?'✓':'✗'} Verified Supplier</div>
              <div class="sh-detail-cap ${supplier.sampleAvailable?'cap-yes':'cap-no'}">${supplier.sampleAvailable?'✓':'✗'} Sample Available</div>
              <div class="sh-detail-cap ${supplier.customPackaging?'cap-yes':'cap-no'}">${supplier.customPackaging?'✓':'✗'} Custom Packaging</div>
              <div class="sh-detail-cap ${supplier.dropshipSupport?'cap-yes':'cap-no'}">${supplier.dropshipSupport?'✓':'✗'} Dropship Support</div>
            </div>
          </div>

          <div class="sh-detail-card">
            <h4>\uD83C\uDFC6 Top Products</h4>
            <div class="sh-detail-products">
              ${supplier.topProducts.map(p=>`<span class="sh-detail-product-chip" tabindex="0" role="button" aria-label="Search for ${p}" data-product="${p}">${p}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="sh-detail-score-bars">
          <h4>\uD83C\uDFAF Score Breakdown</h4>
          <div class="sh-detail-bars">
            <div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Quality</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:${supplier.quality}%;background:var(--accent-green)"></div></div><span class="sh-detail-bar-val">${supplier.quality}</span></div>
            <div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Communication</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:${supplier.communication}%;background:var(--accent-cyan)"></div></div><span class="sh-detail-bar-val">${supplier.communication}</span></div>
            <div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Value</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:${supplier.value}%;background:var(--accent-purple)"></div></div><span class="sh-detail-bar-val">${supplier.value}</span></div>
            <div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Response Rate</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:${supplier.responseRate}%;background:var(--accent-yellow)"></div></div><span class="sh-detail-bar-val">${supplier.responseRate}%</span></div>
            <div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Fulfillment</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:${supplier.fulfillmentRate}%;background:var(--accent-green)"></div></div><span class="sh-detail-bar-val">${supplier.fulfillmentRate}%</span></div>
          </div>
        </div>

        <div class="sh-detail-actions">
          <button class="sh-detail-action-btn sh-detail-primary" onclick="window.HuntDrop.navigateTo('section-profit-lab')">\uD83D\uDCB0 Calculate Profit</button>
          <button class="sh-detail-action-btn" onclick="window.HuntDrop.navigateTo('section-store-gen')">\uD83C\uDFEA Build Store</button>
          <button class="sh-detail-action-btn" onclick="window.HuntDrop.navigateTo('section-ad-studio')">\uD83C\uDFAC Create Ads</button>
        </div>
      </div>`;
    panel.classList.add('sh-detail-open');

    const closeBtn = panel.querySelector('#shDetailCloseBtn');
    const overlay = panel.querySelector('#shDetailClose');
    const closeDetail = ()=>{ panel.classList.remove('sh-detail-open'); panel.innerHTML=''; };
    if(closeBtn) closeBtn.addEventListener('click', closeDetail);
    if(overlay) overlay.addEventListener('click', closeDetail);

    panel.querySelectorAll('.sh-detail-product-chip').forEach(chip=>{
      const handler = ()=>{
        const productName = chip.dataset.product;
        if(productName && window.HuntDrop.navigateTo){
          closeDetail();
          setTimeout(()=>{
            const searchInput = document.querySelector('.search-input, #searchInput');
            if(searchInput){ searchInput.value = productName; searchInput.dispatchEvent(new Event('input',{bubbles:true})); }
            window.HuntDrop.navigateTo('section-product-hunt');
          },350);
        }
      };
      chip.addEventListener('click', handler);
      chip.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handler(); }});
    });
  },

  renderComparison(suppliers){
    const compBody = this._section?.querySelector('#shComparisonBody');
    if(!compBody) return;
    const sorted = [...suppliers].sort((a,b)=>b.rating-a.rating).slice(0,8);
    compBody.innerHTML = sorted.map(s=>{
      const score = computeScore(s);
      return `<tr tabindex="0" role="button" aria-label="View ${s.name}" data-name="${s.name}">
        <td><div class="sh-comp-name"><div class="sh-comp-avatar" style="background:${s.color}22;color:${s.color}">${s.name.charAt(0)}</div>${s.name}</div></td>
        <td>${s.platform}</td>
        <td><span class="sh-badge sh-badge-yellow">${s.rating}\u2605</span></td>
        <td>${s.shipTime}</td>
        <td>${s.shipCost}</td>
        <td>${s.minOrder}</td>
        <td><span class="sh-badge ${parseFloat(s.refundRate)<1.5?'sh-badge-green':'sh-badge-orange'}">${s.refundRate}</span></td>
        <td><span class="sh-badge sh-badge-cyan">${score}</span></td>
      </tr>`;
    }).join('');
    compBody.querySelectorAll('tr').forEach(row=>{
      const handler = ()=>{ const s = suppliers.find(x=>x.name===row.dataset.name); if(s) this.showDetail(s); };
      row.addEventListener('click', handler);
      row.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handler(); }});
    });
  },

  renderScores(suppliers){
    const scoresGrid = this._section?.querySelector('#shScoresGrid');
    if(!scoresGrid) return;
    const top6 = [...suppliers].sort((a,b)=>b.rating-a.rating).slice(0,6);
    scoresGrid.innerHTML = top6.map(s=>{
      const score = computeScore(s);
      return `<div class="sh-score-card" tabindex="0" role="button" aria-label="View ${s.name} scores" data-name="${s.name}">
        <div class="sh-score-header">
          <div class="sh-comp-avatar" style="background:${s.color}22;color:${s.color}">${s.name.charAt(0)}</div>
          <div><div class="sh-score-name">${s.name}</div><div class="sh-score-platform">${s.platform}</div></div>
          <div class="sh-score-total">${score}</div>
        </div>
        <div class="sh-score-bars">
          <div class="sh-score-row"><span>Quality</span><div class="sh-bar"><div class="sh-bar-fill" style="width:${s.quality}%;background:var(--accent-green)"></div></div><span>${s.quality}</span></div>
          <div class="sh-score-row"><span>Communication</span><div class="sh-bar"><div class="sh-bar-fill" style="width:${s.communication}%;background:var(--accent-cyan)"></div></div><span>${s.communication}</span></div>
          <div class="sh-score-row"><span>Value</span><div class="sh-bar"><div class="sh-bar-fill" style="width:${s.value}%;background:var(--accent-purple)"></div></div><span>${s.value}</span></div>
        </div>
      </div>`;
    }).join('');
    scoresGrid.querySelectorAll('.sh-score-card').forEach(card=>{
      const handler = ()=>{ const s = suppliers.find(x=>x.name===card.dataset.name); if(s) this.showDetail(s); };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handler(); }});
    });
  },

  renderShipping(suppliers){
    const shipGrid = this._section?.querySelector('#shShippingGrid');
    if(!shipGrid) return;
    const platforms = {};
    suppliers.forEach(s=>{
      if(!platforms[s.platform]) platforms[s.platform]={times:[],costs:[],count:0};
      const parts = s.shipTime.split('-');
      platforms[s.platform].times.push((parseInt(parts[0])+parseInt(parts[1]))/2);
      if(s.shipCost!=='Free' && s.shipCost!=='Free Prime'){
        const c = s.shipCost.replace('$','').split('-');
        platforms[s.platform].costs.push((parseFloat(c[0])+parseFloat(c[1]))/2);
      }
      platforms[s.platform].count++;
    });
    const icons = {'AliExpress':'\uD83C\uDF10','Amazon':'\uD83D\uDCE6','CJ Dropshipping':'\uD83D\uDE9A','DHgate':'\uD83C\uDFEA','Temu':'\uD83D\uDCB0','TikTok Shop':'\uD83C\uDFB5','Etsy':'\uD83C\uDFA8'};
    shipGrid.innerHTML = Object.entries(platforms).map(([name,p])=>{
      const avgTime = Math.round(p.times.reduce((a,b)=>a+b,0)/p.times.length);
      const avgCost = p.costs.length ? '$'+(p.costs.reduce((a,b)=>a+b,0)/p.costs.length).toFixed(2) : 'Free';
      return `<div class="sh-ship-card" tabindex="0" role="button" aria-label="Filter suppliers by ${name}" data-platform="${name}">
        <div class="sh-ship-icon">${icons[name]||'\uD83C\uDFE2'}</div>
        <div class="sh-ship-name">${name}</div>
        <div class="sh-ship-stats">
          <div class="sh-ship-stat"><span class="sh-ship-stat-label">Avg Ship Time</span><span class="sh-ship-stat-value">${avgTime} days</span></div>
          <div class="sh-ship-stat"><span class="sh-ship-stat-label">Avg Ship Cost</span><span class="sh-ship-stat-value">${avgCost}</span></div>
          <div class="sh-ship-stat"><span class="sh-ship-stat-label">Suppliers</span><span class="sh-ship-stat-value">${p.count}</span></div>
        </div>
      </div>`;
    }).join('');

    shipGrid.querySelectorAll('.sh-ship-card').forEach(card=>{
      const handler = ()=>{
        const platform = card.dataset.platform;
        const filterBtns = this._section.querySelectorAll('.sf-btn');
        filterBtns.forEach(b=>b.classList.remove('active'));
        const allBtn = this._section.querySelector('.sf-btn[data-sf="all"]');
        if(allBtn) allBtn.classList.add('active');
        const grid = this._section?.querySelector('#supplierHubGrid');
        if(!grid) return;
        grid.querySelectorAll('.supplier-hub-card').forEach(c=>{
          const show = c.dataset.platform === platform;
          if(show){ c.classList.remove('sh-card-hidden'); c.style.display=''; }
          else { c.classList.add('sh-card-hidden'); setTimeout(()=>{ c.style.display='none'; },300); }
        });
        this._section.scrollIntoView({behavior:'smooth',block:'start'});
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handler(); }});
    });
  },

  renderChecklist(){
    const checklist = this._section?.querySelector('#shChecklist');
    if(!checklist) return;
    const items = [
      {icon:'\uD83D\uDD0D',title:'Verify Business License',desc:'Confirm the supplier has valid business registration and import/export licenses',priority:'Critical'},
      {icon:'\uD83D\uDCCB',title:'Request Product Samples',desc:'Always order 2-3 samples before committing to bulk orders',priority:'Critical'},
      {icon:'\uD83D\uDCAC',title:'Test Response Time',desc:'Send inquiries at different hours to verify claimed response times',priority:'High'},
      {icon:'\uD83D\uDCCA',title:'Check Order History',desc:'Look for consistent order volume and positive feedback trends over 6+ months',priority:'High'},
      {icon:'\uD83D\uDD04',title:'Review Return Policy',desc:'Understand refund terms, restocking fees, and dispute resolution process',priority:'High'},
      {icon:'\uD83D\uDCF7',title:'Verify Product Photos',desc:'Request actual product photos, not just stock images',priority:'Medium'},
      {icon:'\uD83C\uDFF7\uFE0F',title:'Compare Unit Pricing',desc:'Get quotes for different quantities to understand volume discounts',priority:'Medium'},
      {icon:'\uD83D\uDE9A',title:'Confirm Shipping Methods',desc:'Verify available carriers, tracking options, and insurance coverage',priority:'Medium'},
      {icon:'\uD83D\uDCDD',title:'Read Sample Reviews',desc:'Check reviews from other dropshippers who use this supplier',priority:'Low'},
      {icon:'\uD83E\uDD1D',title:'Negotiate Terms',desc:'Discuss payment terms, exclusivity options, and custom packaging availability',priority:'Low'}
    ];
    const priColors = {Critical:'var(--accent-red)',High:'var(--accent-orange)',Medium:'var(--accent-cyan)',Low:'var(--text-muted)'};
    checklist.innerHTML = items.map(i=>`
      <div class="sh-check-item">
        <div class="sh-check-icon">${i.icon}</div>
        <div class="sh-check-info">
          <div class="sh-check-title">${i.title}</div>
          <div class="sh-check-desc">${i.desc}</div>
        </div>
        <div class="sh-check-priority" style="color:${priColors[i.priority]}">${i.priority}</div>
      </div>
    `).join('');
  },

  renderPicks(){
    const picksGrid = this._section?.querySelector('#shPicksGrid');
    if(!picksGrid) return;
    const picks = [
      {use:'\uD83D\uDE80 Fastest Shipping',supplier:'PawWalk USA',reason:'1-4 day delivery with Free Prime shipping',platform:'Amazon',color:'var(--accent-green)'},
      {use:'\uD83D\uDCB0 Best Value',supplier:'FitGear Pro',reason:'Lowest cost with high order volume (320K+)',platform:'Temu',color:'var(--accent-cyan)'},
      {use:'\u2B50 Highest Rated',supplier:'TechGear Direct',reason:'4.9 rating with 120K orders and <2h response',platform:'AliExpress',color:'var(--accent-yellow)'},
      {use:'\uD83D\uDCE6 Largest Catalog',supplier:'BeautyGlow Co',reason:'567 products with fastest response time',platform:'CJ Dropshipping',color:'var(--accent-pink)'},
      {use:'\uD83D\uDEE1\uFE0F Lowest Risk',supplier:'StarLight Tech',reason:'0.9% refund rate with premium quality score',platform:'DHgate',color:'var(--accent-purple)'},
      {use:'\uD83C\uDFAF Best for Beginners',supplier:'SmartHome US',reason:'No minimum order, free shipping, US-based',platform:'Amazon',color:'var(--accent-orange)'}
    ];
    picksGrid.innerHTML = picks.map(p=>`
      <div class="sh-pick-card" tabindex="0" role="button" aria-label="View ${p.supplier}" style="border-left:3px solid ${p.color}" data-supplier="${p.supplier}">
        <div class="sh-pick-use">${p.use}</div>
        <div class="sh-pick-supplier">${p.supplier}</div>
        <div class="sh-pick-platform">${p.platform}</div>
        <div class="sh-pick-reason">${p.reason}</div>
      </div>
    `).join('');
    picksGrid.querySelectorAll('.sh-pick-card').forEach(card=>{
      const handler = ()=>{ const s = SUPPLIERS.find(x=>x.name===card.dataset.supplier); if(s) this.showDetail(s); };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handler(); }});
    });
  },

  bindFilters(){
    const grid = this._section?.querySelector('#supplierHubGrid');
    if(!grid) return;
    var filterBtns = this._section.querySelectorAll('.sf-btn');
    filterBtns.forEach(btn=>{
      const handler = ()=>{
        filterBtns.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        var filter = btn.getAttribute('data-sf');
        var cards = grid.querySelectorAll('.supplier-hub-card');
        cards.forEach(card=>{
          var show = filter==='all'||
            (filter==='verified' && card.getAttribute('data-verified')==='true')||
            (filter==='fast' && card.getAttribute('data-response').indexOf('1h')>-1)||
            (filter==='rated' && parseFloat(card.getAttribute('data-rating'))>=4.8)||
            (filter==='cheap' && card.getAttribute('data-platform')==='Temu');
          if(show){ card.classList.remove('sh-card-hidden'); card.style.display=''; }
          else { card.classList.add('sh-card-hidden'); setTimeout(()=>{ card.style.display='none'; },300); }
        });
      };
      btn.addEventListener('click', handler);
      btn.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handler(); }});
    });
  },

  unmount(ctx) {
    const el = UI.$('section-supplier-hub');
    if (el) el.remove();
  }
};

PluginRegistry.register('supplier-hub', SupplierHubPlugin);
})();
