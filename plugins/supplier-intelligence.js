// ============================================================================
// PLUGIN: Supplier Check — Reliability scoring, risk alerts, backup matching
// ============================================================================
(function(){
const {EventBus,PluginRegistry,UI,Config} = window.HuntDrop;

var SUPPLIER_DATABASE = [
  {name:"TechGear Direct",platform:"AliExpress",location:"Shenzhen, CN",rating:4.9,orders:"120K",responseTime:"< 2h",verified:true,specialty:"Electronics & Gadgets",responseRate:96,disputeRate:0.8,fulfillmentRate:98.5,yearsActive:6,color:"var(--accent-cyan)"},
  {name:"SmartHome US",platform:"Amazon",location:"Dallas, US",rating:4.7,orders:"200K",responseTime:"< 1h",verified:true,specialty:"Smart Home Devices",responseRate:99,disputeRate:0.5,fulfillmentRate:99.2,yearsActive:4,color:"var(--accent-orange)"},
  {name:"PetEase Supplies",platform:"AliExpress",location:"Yiwu, CN",rating:4.8,orders:"95K",responseTime:"< 3h",verified:true,specialty:"Pet Products",responseRate:93,disputeRate:1.2,fulfillmentRate:97.8,yearsActive:5,color:"var(--accent-green)"},
  {name:"BeautyGlow Co",platform:"CJ Dropshipping",location:"Yiwu, CN",rating:4.6,orders:"400K",responseTime:"< 1h",verified:true,specialty:"Beauty & Health",responseRate:97,disputeRate:1.8,fulfillmentRate:96.5,yearsActive:7,color:"var(--accent-pink)"},
  {name:"StarLight Tech",platform:"DHgate",location:"Shenzhen, CN",rating:4.9,orders:"200K",responseTime:"< 1h",verified:true,specialty:"LED & Lighting",responseRate:98,disputeRate:0.6,fulfillmentRate:99.1,yearsActive:8,color:"var(--accent-purple)"},
  {name:"PawWalk USA",platform:"Amazon",location:"Los Angeles, US",rating:4.7,orders:"110K",responseTime:"< 1h",verified:true,specialty:"Pet Accessories",responseRate:99,disputeRate:0.4,fulfillmentRate:99.5,yearsActive:3,color:"var(--accent-yellow)"},
  {name:"FitGear Pro",platform:"Temu",location:"Yiwu, CN",rating:4.7,orders:"320K",responseTime:"< 1h",verified:true,specialty:"Fitness Equipment",responseRate:95,disputeRate:1.5,fulfillmentRate:97.2,yearsActive:5,color:"var(--accent-red)"},
  {name:"PostureTech",platform:"TikTok Shop",location:"Shenzhen, CN",rating:4.9,orders:"90K",responseTime:"< 1h",verified:true,specialty:"Ergonomic Products",responseRate:97,disputeRate:0.7,fulfillmentRate:98.8,yearsActive:4,color:"var(--accent-cyan)"},
  {name:"KitchenWiz",platform:"AliExpress",location:"Ningbo, CN",rating:4.8,orders:"70K",responseTime:"< 2h",verified:true,specialty:"Kitchen Gadgets",responseRate:94,disputeRate:1.1,fulfillmentRate:97.5,yearsActive:6,color:"var(--accent-orange)"},
  {name:"ChargeTech",platform:"DHgate",location:"Shenzhen, CN",rating:4.7,orders:"100K",responseTime:"< 2h",verified:true,specialty:"Phone Accessories",responseRate:95,disputeRate:0.9,fulfillmentRate:98.0,yearsActive:5,color:"var(--accent-purple)"},
  {name:"CleanTech Labs",platform:"Temu",location:"Shenzhen, CN",rating:4.6,orders:"45K",responseTime:"< 3h",verified:true,specialty:"Cleaning Products",responseRate:91,disputeRate:2.0,fulfillmentRate:96.0,yearsActive:3,color:"var(--accent-cyan)"},
  {name:"GlowDecor",platform:"Etsy",location:"Shenzhen, CN",rating:4.8,orders:"65K",responseTime:"< 2h",verified:true,specialty:"Home Decor",responseRate:93,disputeRate:1.0,fulfillmentRate:97.8,yearsActive:4,color:"var(--accent-green)"}
];

function computeScore(s){
  var r=0;
  if(s.verified) r+=20;
  r+=(s.rating/5)*30;
  var o=parseInt(s.orders.replace(/[^0-9]/g,''))||0;
  if(o>200000) r+=15; else if(o>100000) r+=10; else r+=5;
  r+=s.responseRate*0.15;
  r+=(100-s.disputeRate*10)*0.1;
  r+=s.fulfillmentRate*0.1;
  return Math.min(100,Math.round(r));
}

function getRiskLevel(s){
  var risk=0;
  if(!s.verified) risk+=30;
  if(s.rating<4.5) risk+=15;
  if(s.disputeRate>1.5) risk+=20;
  if(s.responseRate<90) risk+=15;
  var o=parseInt(s.orders.replace(/[^0-9]/g,''))||0;
  if(o<50000) risk+=10;
  if(risk>40) return {level:'HIGH',color:'var(--accent-red)',pct:risk};
  if(risk>20) return {level:'MEDIUM',color:'var(--accent-orange)',pct:risk};
  return {level:'LOW',color:'var(--accent-green)',pct:risk};
}

function getGrade(score){
  if(score>=90) return {grade:'A+',color:'var(--accent-green)'};
  if(score>=80) return {grade:'A',color:'var(--accent-green)'};
  if(score>=70) return {grade:'B+',color:'var(--accent-cyan)'};
  if(score>=60) return {grade:'B',color:'var(--accent-cyan)'};
  if(score>=50) return {grade:'C',color:'var(--accent-orange)'};
  return {grade:'D',color:'var(--accent-red)'};
}

var SupplierIntelligencePlugin = {
  id: 'supplier-intelligence',
  name: 'Supplier Check',
  version: '2.0.0',
  description: 'Deep supplier verification, reliability scoring, risk alerts & backup matching',

  init(ctx) {
    Config.defaults('supplierIntel', { enabled: true });
  },

  mount(ctx) {
    var container = UI.$('sections-container');
    if (!container) return;

    var analyzed = SUPPLIER_DATABASE.map(function(s){
      var score = computeScore(s);
      var risk = getRiskLevel(s);
      var grade = getGrade(score);
      return {supplier:s, score:score, risk:risk, grade:grade};
    }).sort(function(a,b){return b.score-a.score;});

    var avgScore = Math.round(analyzed.reduce(function(a,x){return a+x.score;},0)/analyzed.length);
    var verifiedCount = analyzed.filter(function(x){return x.supplier.verified;}).length;
    var highRisk = analyzed.filter(function(x){return x.risk.level==='HIGH';});
    var avgResponse = (analyzed.reduce(function(a,x){return a+x.supplier.responseRate;},0)/analyzed.length).toFixed(1);

    var section = document.createElement('section');
    section.className = 'section section-supplier-intel';
    section.id = 'section-supplier-intel';
    section.innerHTML = `
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">Supplier Intelligence</h2>
          <p class="section-desc">Deep verification, reliability scoring, risk alerts & backup matching for every supplier</p>
        </div>

        <!-- OVERVIEW STATS -->
        <div class="sci-overview">
          <div class="sci-stat-card"><div class="sci-stat-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🔍</div><div class="sci-stat-info"><div class="sci-stat-value">${analyzed.length}</div><div class="sci-stat-label">Suppliers Checked</div></div></div>
          <div class="sci-stat-card"><div class="sci-stat-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">✅</div><div class="sci-stat-info"><div class="sci-stat-value">${verifiedCount}</div><div class="sci-stat-label">Verified</div></div></div>
          <div class="sci-stat-card"><div class="sci-stat-icon" style="background:rgba(255,215,0,0.12);color:var(--accent-yellow)">📊</div><div class="sci-stat-info"><div class="sci-stat-value">${avgScore}%</div><div class="sci-stat-label">Avg Score</div></div></div>
          <div class="sci-stat-card"><div class="sci-stat-icon" style="background:rgba(255,138,0,0.12);color:var(--accent-orange)">⏱️</div><div class="sci-stat-info"><div class="sci-stat-value">${avgResponse}%</div><div class="sci-stat-label">Avg Response Rate</div></div></div>
          <div class="sci-stat-card"><div class="sci-stat-icon" style="background:${highRisk.length>0?'rgba(255,51,102,0.12)':'var(--accent-green-dim)'};color:${highRisk.length>0?'var(--accent-red)':'var(--accent-green)'}">⚠️</div><div class="sci-stat-info"><div class="sci-stat-value">${highRisk.length}</div><div class="sci-stat-label">At-Risk</div></div></div>
        </div>

        <!-- RISK ALERTS -->
        <div class="sci-section">
          <h3 class="sci-section-title">🚨 Risk Alerts</h3>
          <p class="sci-section-sub">Suppliers that need immediate attention</p>
          <div class="sci-risk-list" id="sciRiskList"></div>
        </div>

        <!-- SUPPLIER SCOREBOARD -->
        <div class="sci-section">
          <h3 class="sci-section-title">📊 Supplier Scoreboard</h3>
          <p class="sci-section-sub">Reliability scores ranked from best to worst</p>
          <div class="sci-table-wrap">
            <table class="sci-table">
              <thead><tr><th>#</th><th>Supplier</th><th>Platform</th><th>Grade</th><th>Score</th><th>Risk</th><th>Response</th><th>Fulfillment</th><th>Disputes</th><th>Years</th></tr></thead>
              <tbody id="sciScoreBody"></tbody>
            </table>
          </div>
        </div>

        <!-- SCORE BREAKDOWN CARDS -->
        <div class="sci-section">
          <h3 class="sci-section-title">🎯 Score Breakdown</h3>
          <p class="sci-section-sub">Detailed metrics for each supplier</p>
          <div class="sci-breakdown-grid" id="sciBreakdownGrid"></div>
        </div>

        <!-- VERIFICATION CHECKLIST -->
        <div class="sci-section">
          <h3 class="sci-section-title">✅ Verification Checklist</h3>
          <p class="sci-section-sub">What we check for every supplier</p>
          <div class="sci-checklist" id="sciChecklist"></div>
        </div>

        <!-- BACKUP SUPPLIER MATCHER -->
        <div class="sci-section">
          <h3 class="sci-section-title">🔄 Backup Supplier Matcher</h3>
          <p class="sci-section-sub">Best alternatives if your primary supplier fails</p>
          <div class="sci-backup-grid" id="sciBackupGrid"></div>
        </div>

        <!-- SUPPLIER HEALTH TIPS -->
        <div class="sci-section">
          <h3 class="sci-section-title">💡 Supplier Health Tips</h3>
          <p class="sci-section-sub">Best practices to maintain strong supplier relationships</p>
          <div class="sci-tips-grid" id="sciTipsGrid"></div>
        </div>

        ${window.HuntDrop.renderRelatedTools([
          { section:'section-supplier-hub', name:'Find Suppliers', desc:'Browse supplier directory', icon:'🏭', color:'#06b6d4' },
          { section:'section-store-gen', name:'Store Generator', desc:'Build your store', icon:'🏪', color:'#FF6B6B' },
          { section:'section-profit-lab', name:'Profit Calculator', desc:'Calculate margins', icon:'🧮', color:'#4ECDC4' },
          { section:'section-health', name:'Store Health', desc:'Check readiness', icon:'❤️', color:'#45B7D1' }
        ])}
      </div>`;
    container.appendChild(section);

    // Risk alerts
    var riskList = section.querySelector('#sciRiskList');
    if(riskList){
      var risks = analyzed.filter(function(x){return x.risk.level!=='LOW';});
      if(risks.length===0){
        riskList.innerHTML = '<div class="sci-no-risk"><span style="font-size:32px">🎉</span><div>All suppliers are healthy — no alerts</div></div>';
      } else {
        riskList.innerHTML = risks.map(function(x){
          var s=x.supplier;
          var reasons=[];
          if(!s.verified) reasons.push('Not verified');
          if(s.rating<4.5) reasons.push('Low rating');
          if(s.disputeRate>1.5) reasons.push('High dispute rate ('+s.disputeRate+'%)');
          if(s.responseRate<90) reasons.push('Low response rate ('+s.responseRate+'%)');
          return '<div class="sci-risk-card" style="border-left:3px solid '+x.risk.color+'">'+
            '<div class="sci-risk-header">'+
              '<div class="sci-risk-avatar" style="background:'+x.risk.color+'22;color:'+x.risk.color+'">'+s.name.charAt(0)+'</div>'+
              '<div><div class="sci-risk-name">'+s.name+'</div><div class="sci-risk-platform">'+s.platform+' · '+s.location+'</div></div>'+
              '<div class="sci-risk-badge" style="background:'+x.risk.color+'18;color:'+x.risk.color+';border:1px solid '+x.risk.color+'44">'+x.risk.level+' RISK</div>'+
            '</div>'+
            '<div class="sci-risk-reasons">'+reasons.map(function(r){return '<span class="sci-risk-reason">⚠ '+r+'</span>';}).join('')+'</div>'+
          '</div>';
        }).join('');
      }
    }

    // Scoreboard table
    var scoreBody = section.querySelector('#sciScoreBody');
    if(scoreBody){
      scoreBody.innerHTML = analyzed.map(function(x,i){
        var s=x.supplier;
        return '<tr>'+
          '<td class="sci-rank">#'+(i+1)+'</td>'+
          '<td><div class="sci-tbl-name"><div class="sci-tbl-avatar" style="background:'+s.color+'22;color:'+s.color+'">'+s.name.charAt(0)+'</div>'+s.name+'</div></td>'+
          '<td>'+s.platform+'</td>'+
          '<td><span class="sci-grade" style="background:'+x.grade.color+'18;color:'+x.grade.color+'">'+x.grade.grade+'</span></td>'+
          '<td><span class="sci-tbl-score" style="color:'+x.grade.color+'">'+x.score+'</span></td>'+
          '<td><span class="sci-risk-pill" style="background:'+x.risk.color+'18;color:'+x.risk.color+'">'+x.risk.level+'</span></td>'+
          '<td>'+s.responseRate+'%</td>'+
          '<td>'+s.fulfillmentRate+'%</td>'+
          '<td>'+s.disputeRate+'%</td>'+
          '<td>'+s.yearsActive+'yr</td>'+
        '</tr>';
      }).join('');
    }

    // Breakdown cards
    var breakdownGrid = section.querySelector('#sciBreakdownGrid');
    if(breakdownGrid){
      breakdownGrid.innerHTML = analyzed.map(function(x){
        var s=x.supplier;
        return '<div class="sci-bd-card">'+
          '<div class="sci-bd-header">'+
            '<div class="sci-bd-avatar" style="background:'+s.color+'22;color:'+s.color+'">'+s.name.charAt(0)+'</div>'+
            '<div><div class="sci-bd-name">'+s.name+'</div><div class="sci-bd-platform">'+s.platform+'</div></div>'+
            '<div class="sci-bd-grade" style="background:'+x.grade.color+'18;color:'+x.grade.color+'">'+x.grade.grade+'</div>'+
          '</div>'+
          '<div class="sci-bd-bars">'+
            '<div class="sci-bd-row"><span>Response Rate</span><div class="sci-bd-bar"><div class="sci-bd-bar-fill" style="width:'+s.responseRate+'%;background:var(--accent-cyan)"></div></div><span>'+s.responseRate+'%</span></div>'+
            '<div class="sci-bd-row"><span>Fulfillment</span><div class="sci-bd-bar"><div class="sci-bd-bar-fill" style="width:'+s.fulfillmentRate+'%;background:var(--accent-green)"></div></div><span>'+s.fulfillmentRate+'%</span></div>'+
            '<div class="sci-bd-row"><span>Rating</span><div class="sci-bd-bar"><div class="sci-bd-bar-fill" style="width:'+((s.rating/5)*100)+'%;background:var(--accent-yellow)"></div></div><span>'+s.rating+'★</span></div>'+
            '<div class="sci-bd-row"><span>Dispute Rate</span><div class="sci-bd-bar"><div class="sci-bd-bar-fill" style="width:'+Math.min(100,s.disputeRate*20)+'%;background:var(--accent-red)"></div></div><span>'+s.disputeRate+'%</span></div>'+
          '</div>'+
          '<div class="sci-bd-footer"><span class="sci-bd-specialty">🏷️ '+s.specialty+'</span><span class="sci-bd-years">📅 '+s.yearsActive+' years</span></div>'+
        '</div>';
      }).join('');
    }

    // Verification checklist
    var checklist = section.querySelector('#sciChecklist');
    if(checklist){
      var items = [
        {icon:'📋',title:'Business License',desc:'Valid import/export registration and business permits',weight:'20%'},
        {icon:'⭐',title:'Order History',desc:'Minimum 1000+ completed orders with consistent volume',weight:'15%'},
        {icon:'💬',title:'Response Time',desc:'Average response under 2 hours during business hours',weight:'15%'},
        {icon:'📦',title:'Fulfillment Rate',desc:'Order fulfillment above 95% with tracking provided',weight:'15%'},
        {icon:'🔄',title:'Return Policy',desc:'Clear refund process with <5% dispute rate',weight:'10%'},
        {icon:'🛡️',title:'Verified Status',desc:'Platform-verified supplier badge displayed',weight:'10%'},
        {icon:'📊',title:'Product Quality',desc:'Sample inspection pass rate above 90%',weight:'10%'},
        {icon:'🤝',title:'Communication',desc:'Professional communication with English proficiency',weight:'5%'}
      ];
      checklist.innerHTML = items.map(function(i){return '<div class="sci-check-item">'+
        '<div class="sci-check-icon">'+i.icon+'</div>'+
        '<div class="sci-check-info"><div class="sci-check-title">'+i.title+'</div><div class="sci-check-desc">'+i.desc+'</div></div>'+
        '<div class="sci-check-weight">'+i.weight+'</div>'+
      '</div>';}).join('');
    }

    // Backup matcher
    var backupGrid = section.querySelector('#sciBackupGrid');
    if(backupGrid){
      var backups = [
        {category:'Electronics',primary:'TechGear Direct',backup:'SwiftSource Direct',reason:'Higher fulfillment rate (99.1%)',score:92},
        {category:'Smart Home',primary:'SmartHome US',backup:'PostureTech',reason:'Similar specialty with faster shipping',score:88},
        {category:'Pet Products',primary:'PetEase Supplies',backup:'NexGen Supply',reason:'Verified with 410K orders',score:85},
        {category:'Beauty',primary:'BeautyGlow Co',backup:'QuickShip Asia',reason:'Lower dispute rate (0.9%)',score:90},
        {category:'Fitness',primary:'FitGear Pro',backup:'PrimeSource Hub',reason:'US-based for faster delivery',score:82},
        {category:'Kitchen',primary:'KitchenWiz',backup:'TradeBridge Co',reason:'Higher response rate (97%)',score:86}
      ];
      backupGrid.innerHTML = backups.map(function(b){return '<div class="sci-backup-card">'+
        '<div class="sci-backup-category">'+b.category+'</div>'+
        '<div class="sci-backup-flow">'+
          '<div class="sci-backup-box sci-backup-primary"><div class="sci-backup-label">Primary</div><div class="sci-backup-name">'+b.primary+'</div></div>'+
          '<div class="sci-backup-arrow">→</div>'+
          '<div class="sci-backup-box sci-backup-alt"><div class="sci-backup-label">Backup</div><div class="sci-backup-name">'+b.backup+'</div></div>'+
        '</div>'+
        '<div class="sci-backup-reason">💡 '+b.reason+'</div>'+
        '<div class="sci-backup-score">Match Score: <strong>'+b.score+'%</strong></div>'+
      '</div>';}).join('');
    }

    // Tips
    var tipsGrid = section.querySelector('#sciTipsGrid');
    if(tipsGrid){
      var tips = [
        {icon:'📞',title:'Weekly Check-ins',desc:'Schedule regular communication with top suppliers to stay updated on stock levels and pricing changes'},
        {icon:'📦',title:'Sample Orders',desc:'Order samples quarterly to verify consistent product quality and packaging standards'},
        {icon:'📊',title:'Track Metrics',desc:'Monitor fulfillment rate, response time, and dispute rate monthly for each supplier'},
        {icon:'🔄',title:'Maintain Backups',desc:'Always have at least 2 backup suppliers ready for each product category'},
        {icon:'💰',title:'Negotiate Terms',desc:'Leverage order volume to negotiate better pricing, payment terms, and shipping rates'},
        {icon:'📝',title:'Document Everything',desc:'Keep records of all agreements, pricing quotes, and communication for dispute resolution'}
      ];
      tipsGrid.innerHTML = tips.map(function(t){return '<div class="sci-tip-card">'+
        '<div class="sci-tip-icon">'+t.icon+'</div>'+
        '<div class="sci-tip-title">'+t.title+'</div>'+
        '<div class="sci-tip-desc">'+t.desc+'</div>'+
      '</div>';}).join('');
    }
  },

  unmount(ctx) {
    var el = UI.$('section-supplier-intel');
    if (el) el.remove();
  }
};

PluginRegistry.register('supplier-intelligence', SupplierIntelligencePlugin);
})();
