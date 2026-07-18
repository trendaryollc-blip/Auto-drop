// ============================================================================
// PLUGIN: Profit Time Machine v3 — Complete Forecast Intelligence
// ============================================================================
(function(){
const {PluginRegistry,UI,Config} = window.HuntDrop;
const esc = s => UI.escapeHtml(s);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let _section = null;
let _chart = null;
let _chartSat = null;

function projectData(trendData, seasonality, days) {
  const len = trendData.length;
  const projected = [];
  const labels = [];
  for (let i = 0; i < days; i++) {
    const monthIdx = (len + Math.floor(i / 30)) % 12;
    const seasonFactor = seasonality[monthIdx] / 100;
    const trendSlope = (trendData[len-1] - trendData[0]) / len;
    const baseProjection = trendData[len-1] + (trendSlope * (i / 30));
    const noise = 1 + (Math.sin(i * 0.3) * 0.08) + ((Math.random() - 0.5) * 0.06);
    projected.push(Math.max(0, Math.round(baseProjection * seasonFactor * noise)));
    const d = new Date(); d.setDate(d.getDate() + i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return { projected, labels };
}

function calculateConfidence(product) {
  let score = 50;
  if (product.score >= 80) score += 15; else if (product.score >= 60) score += 8;
  if (product.competition === 'low') score += 12; else if (product.competition === 'medium') score += 5; else score -= 10;
  if (product.margin >= 60) score += 10; else if (product.margin >= 40) score += 5;
  const trend = product.trendData;
  const last3 = (trend[9]+trend[10]+trend[11])/3;
  const first3 = (trend[0]+trend[1]+trend[2])/3;
  if (last3 > first3*1.2) score += 8; else if (last3 > first3) score += 4; else score -= 5;
  if (product.riskScore < 30) score += 5; else if (product.riskScore > 60) score -= 5;
  return Math.min(98, Math.max(25, score + Math.floor(Math.random()*6)));
}

function getTimingRecommendation(confidence, trendData, seasonality) {
  const last3 = (trendData[9]+trendData[10]+trendData[11])/3;
  const prev3 = (trendData[6]+trendData[7]+trendData[8])/3;
  const momentum = last3 - prev3;
  const currentMonth = new Date().getMonth();
  const nextSeason = seasonality[(currentMonth+1)%12];
  const currentSeason = seasonality[currentMonth];
  if (confidence >= 80 && momentum > 0 && nextSeason >= currentSeason)
    return { action:'SELL NOW', color:'var(--accent-green)', icon:'🚀', urgency:'high', reason:`Momentum is strong (+${Math.round(momentum)}%), seasonality rising, confidence ${confidence}%. Every day you wait is lost profit.` };
  if (confidence >= 65 && momentum >= 0)
    return { action:'SELL NOW', color:'var(--accent-green)', icon:'✅', urgency:'medium', reason:`Good confidence (${confidence}%) with stable trend. Start with a small test budget ($10-15/day) to validate before scaling.` };
  if (confidence >= 50 && momentum < 0)
    return { action:'WAIT 2 WEEKS', color:'var(--accent-orange)', icon:'⏳', urgency:'low', reason:`Trend declining slightly. Wait 2 weeks to see if it stabilizes. Monitor competitor count and ad frequency.` };
  return { action:'WATCH', color:'var(--accent-red)', icon:'👀', urgency:'none', reason:`Low confidence (${confidence}%) or declining trend. Add to watchlist. Look for products with 70+ score and upward momentum.` };
}

function detectPeak(trendData, projected) {
  const allData = [...trendData, ...projected];
  const maxVal = Math.max(...allData);
  const peakIdx = allData.indexOf(maxVal);
  const daysOut = peakIdx - trendData.length;
  if (daysOut < 0) return { imminent:false, daysOut:0, value:maxVal, note:'Peak already passed' };
  if (daysOut <= 5) return { imminent:true, daysOut, value:maxVal };
  return { imminent:false, daysOut, value:maxVal };
}

function formatMoney(n) { return '$'+Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function formatMoneyDec(n) { return '$'+Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,','); }

function getHistory() {
  try { return JSON.parse(localStorage.getItem('ptm_history') || '[]'); } catch { return []; }
}
function saveHistory(entry) {
  try {
    const h = getHistory();
    h.unshift(entry);
    if (h.length > 20) h.length = 20;
    localStorage.setItem('ptm_history', JSON.stringify(h));
  } catch { /* ignored */ }
}

function buildHTML() {
  return `
      <div class="section-inner">
        <div class="ptm-hero">
          <div class="ptm-hero-badge">🔮 Time Travel Intelligence</div>
          <h1 class="ptm-hero-title">Profit Time Machine</h1>
          <p class="ptm-hero-desc">See your future profit before your competitors do. AI-powered projections for 30, 60, and 90 days out — with peak alerts, saturation timeline, inventory planning, and timing recommendations.</p>
        </div>

        <div class="ptm-hero-cards">
          <div class="ptm-hc"><div class="ptm-hc-icon ptm-hc-green">📈</div><div class="ptm-hc-text"><strong>90-Day Forecast</strong><span>Project profit + revenue</span></div></div>
          <div class="ptm-hc"><div class="ptm-hc-icon ptm-hc-orange">⚠️</div><div class="ptm-hc-text"><strong>Peak Detection</strong><span>Know exactly when demand peaks</span></div></div>
          <div class="ptm-hc"><div class="ptm-hc-icon ptm-hc-purple">🎯</div><div class="ptm-hc-text"><strong>Timing Signal</strong><span>Buy now, wait, or watch</span></div></div>
          <div class="ptm-hc"><div class="ptm-hc-icon ptm-hc-cyan">📊</div><div class="ptm-hc-text"><strong>Saturation Timeline</strong><span>When market gets crowded</span></div></div>
        </div>

        <div class="ptm-search-box">
          <div class="ptm-search-inner">
            <svg class="ptm-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" id="ptmInput" class="ptm-search-input" placeholder="Enter a product name to forecast...">
            <button id="ptmAnalyzeBtn" class="ptm-search-btn">Analyze Future Profit</button>
          </div>
        </div>

        <div id="ptmChips" class="ptm-chips"></div>
        <div id="ptmEmpty" class="ptm-empty"></div>
        <div id="ptmResults" class="ptm-results"></div>
      </div>`;
}

function bindEvents(){
  const el = _section;
  if(!el) return;
  const btn = el.querySelector('#ptmAnalyzeBtn');
  const input = el.querySelector('#ptmInput');
  if(btn) btn.addEventListener('click',()=>analyze(input?.value||''));
  if(input) input.addEventListener('keypress',e=>{if(e.key==='Enter')analyze(input.value);});
}

function renderEmptyState(){
  const chips = _section?.querySelector('#ptmChips');
  const empty = _section?.querySelector('#ptmEmpty');
  if(!chips || !empty) return;
  const products = window.HuntDrop.ALL_PRODUCTS || [];
  const trending = [...products].sort((a,b)=>b.salesVelocity-a.salesVelocity).slice(0,6);
  chips.innerHTML = trending.map(p=>`<button class="ptm-chip" data-q="${esc(p.title.split('—')[0].trim())}"><img src="${esc(p.image)}" class="ptm-chip-img" alt=""><span class="ptm-chip-name">${esc(p.title.split('—')[0].trim())}</span><span class="ptm-chip-score">${p.score}</span></button>`).join('');
  chips.querySelectorAll('.ptm-chip').forEach(c=>{
    c.addEventListener('click',()=>{
      const input = _section?.querySelector('#ptmInput');
      if(input) input.value = c.dataset.q;
      analyze(c.dataset.q);
    });
  });

  const history = getHistory();
  empty.innerHTML = `
      <div class="ptm-empty-grid">
        <div class="ptm-empty-card">
          <div class="ptm-empty-icon">🚀</div>
          <div class="ptm-empty-title">How It Works</div>
          <div class="ptm-empty-steps">
            <div class="ptm-step"><span class="ptm-step-num">1</span>Enter a product name above</div>
            <div class="ptm-step"><span class="ptm-step-num">2</span>AI projects 90 days of profit</div>
            <div class="ptm-step"><span class="ptm-step-num">3</span>Get timing, inventory & pricing advice</div>
          </div>
        </div>
        <div class="ptm-empty-card">
          <div class="ptm-empty-icon">📊</div>
          <div class="ptm-empty-title">What You Get</div>
          <div class="ptm-empty-features">
            <span class="ptm-ef">90-day profit + revenue forecast</span>
            <span class="ptm-ef">Peak detection & timing signals</span>
            <span class="ptm-ef">Market saturation timeline</span>
            <span class="ptm-ef">Break-even analysis</span>
            <span class="ptm-ef">Inventory planning calculator</span>
            <span class="ptm-ef">What-if price scenarios</span>
          </div>
        </div>
        ${history.length?`<div class="ptm-empty-card">
          <div class="ptm-empty-icon">🕐</div>
          <div class="ptm-empty-title">Recent Forecasts</div>
          <div class="ptm-history-list">
            ${history.slice(0,5).map(h=>`<div class="ptm-history-item" data-q="${h.title}"><span class="ptm-history-name">${h.title}</span><span class="ptm-history-timing" style="color:${h.timingColor}">${h.timing}</span></div>`).join('')}
          </div>
        </div>`:''}
      </div>`;
  empty.querySelectorAll('.ptm-history-item').forEach(item=>{
    item.addEventListener('click',()=>{
      const input = _section?.querySelector('#ptmInput');
      if(input) input.value = item.dataset.q;
      analyze(item.dataset.q);
    });
  });
}

function analyze(query){
  if(!query.trim()) return;
  const products = window.HuntDrop.ALL_PRODUCTS || [];
  const product = products.find(p=>
    p.title.toLowerCase().includes(query.toLowerCase())||
    p.keywords.some(k=>k.toLowerCase().includes(query.toLowerCase()))
  )||[...products].sort((a,b)=>b.score-a.score)[0];
  if(!product) return;

  const cost = product.price;
  const sellPrice = product.platformPrices.amazon;
  const shipping = 2.50;
  const adSpend = product.adSpendAvg || sellPrice * 0.15;
  const profitPerSale = sellPrice - cost - shipping - adSpend;
  const monthlySales = product.salesVelocity;
  const currentMonthlyProfit = profitPerSale * monthlySales;
  const currentMonthlyRevenue = sellPrice * monthlySales;

  const {projected,labels} = projectData(product.trendData,product.seasonality,90);
  const confidence = calculateConfidence(product);
  const timing = getTimingRecommendation(confidence,product.trendData,product.seasonality);
  const peak = detectPeak(product.trendData,projected);

  const proj30sales = projected.slice(0,30).reduce((a,b)=>a+b,0);
  const proj60sales = projected.slice(0,60).reduce((a,b)=>a+b,0);
  const proj90sales = projected.reduce((a,b)=>a+b,0);
  const proj30profit = proj30sales * profitPerSale;
  const _proj60profit = proj60sales * profitPerSale;
  const proj90profit = proj90sales * profitPerSale;
  const proj30rev = proj30sales * sellPrice;
  const proj90rev = proj90sales * sellPrice;
  const _profitDelta = currentMonthlyProfit>0?((proj30profit/currentMonthlyProfit-proj30sales*profitPerSale/currentMonthlyProfit/30*30)*100||0).toFixed(0):0;

  const breakEvenUnits = Math.ceil((cost + shipping + adSpend) / profitPerSale);
  const breakEvenDays = monthlySales > 0 ? Math.ceil(breakEvenUnits / (monthlySales/30)) : 999;

  const saturationRate = product.marketSaturation || 50;
  const daysToSaturation = Math.round((100 - saturationRate) / (saturationRate > 60 ? 1.2 : 0.6));

  const _avgOrderValue = sellPrice;
  const units30 = Math.round(proj30sales);
  const units90 = Math.round(proj90sales);
  const recommendedInventory = Math.round(units30 * 1.3);
  const reorderPoint = Math.round(units30 / 3);

  saveHistory({
    title: product.title.split('—')[0].trim(),
    timing: timing.action,
    timingColor: timing.color,
    confidence,
    date: new Date().toLocaleDateString()
  });

  const el = _section?_section.querySelector('#ptmResults'):null;
  const empty = _section?_section.querySelector('#ptmEmpty'):null;
  const chips = _section?_section.querySelector('#ptmChips'):null;
  if(empty) empty.innerHTML = '';
  if(chips) chips.innerHTML = '';
  if(!el) return;

  el.innerHTML = `
      <div class="ptm-output">
        <div class="ptm-product-header">
          <div class="ptm-product-img"><img src="${esc(product.image)}" alt=""></div>
          <div class="ptm-product-info">
            <h3 class="ptm-product-title">${esc(product.title)}</h3>
            <div class="ptm-product-meta">
              <span class="ptm-badge ptm-badge-score">Score ${product.score}</span>
              <span class="ptm-badge ptm-badge-margin">${product.margin}% margin</span>
              <span class="ptm-badge ptm-badge-comp">${product.competition} competition</span>
            </div>
          </div>
          <div class="ptm-timing-badge" style="border-color:${timing.color}">
            <span class="ptm-timing-icon">${timing.icon}</span>
            <span class="ptm-timing-action" style="color:${timing.color}">${timing.action}</span>
          </div>
          <div class="ptm-export-btns">
            <button class="ptm-export-btn" id="ptmExportCsv">📋 Export CSV</button>
            <button class="ptm-export-btn ptm-export-compare" id="ptmCompareBtn">⚖️ Compare</button>
          </div>
        </div>

        <div class="ptm-hero-grid">
          <div class="ptm-hero-card ptm-confidence">
            <div class="ptm-hero-label">Confidence Score</div>
            <div class="ptm-confidence-ring">
              <svg viewBox="0 0 120 120" class="ptm-ring-svg">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-primary)" stroke-width="8"/>
                <circle cx="60" cy="60" r="52" fill="none" stroke="${confidence>=70?'var(--accent-green)':confidence>=50?'var(--accent-orange)':'var(--accent-red)'}" stroke-width="8" stroke-dasharray="${327}" stroke-dashoffset="${327-(327*confidence/100)}" stroke-linecap="round" transform="rotate(-90 60 60)" class="ptm-ring-progress"/>
              </svg>
              <div class="ptm-confidence-value">${confidence}%</div>
            </div>
            <div class="ptm-confidence-label">${confidence>=80?'High conviction':confidence>=60?'Moderate signal':'Proceed with caution'}</div>
          </div>
          <div class="ptm-hero-card">
            <div class="ptm-hero-label">Now (Monthly)</div>
            <div class="ptm-hero-value" style="color:var(--accent-green)">${formatMoney(currentMonthlyProfit)}</div>
            <div class="ptm-hero-sub">${Math.round(monthlySales)} sales/mo</div>
            <div class="ptm-hero-sub">Revenue: ${formatMoney(currentMonthlyRevenue)}</div>
          </div>
          <div class="ptm-hero-card">
            <div class="ptm-hero-label">+30 Days</div>
            <div class="ptm-hero-value" style="color:${proj30profit>currentMonthlyProfit?'var(--accent-green)':'var(--accent-red)'}">${formatMoney(proj30profit)}</div>
            <div class="ptm-hero-sub">${units30} units · ${formatMoney(proj30rev)} rev</div>
          </div>
          <div class="ptm-hero-card">
            <div class="ptm-hero-label">+90 Days Total</div>
            <div class="ptm-hero-value" style="color:var(--accent-cyan)">${formatMoney(proj90profit)}</div>
            <div class="ptm-hero-sub">${units90} units · ${formatMoney(proj90rev)} rev</div>
          </div>
        </div>

        ${peak.imminent?`
        <div class="ptm-alert">
          <div class="ptm-alert-pulse"></div>
          <span class="ptm-alert-icon">⚠️</span>
          <div>
            <div class="ptm-alert-title">Peak Alert — ${peak.daysOut} days away</div>
            <div class="ptm-alert-text">This product is projected to peak in <strong>${peak.daysOut} days</strong>. ${peak.daysOut<=7?'Act NOW to capture maximum profit before saturation.':'Plan your launch to hit stride before the peak.'}</div>
          </div>
        </div>`:''}

        <div class="ptm-section-row">
          <div class="ptm-chart-section ptm-chart-main">
            <div class="ptm-chart-header">
              <h3>90-Day Profit & Revenue Forecast</h3>
              <div class="ptm-chart-legend">
                <span class="ptm-legend-item"><span class="ptm-legend-dot" style="background:var(--accent-green)"></span>Profit</span>
                <span class="ptm-legend-item"><span class="ptm-legend-dot" style="background:var(--accent-cyan)"></span>Revenue</span>
                <span class="ptm-legend-item"><span class="ptm-legend-dot" style="background:rgba(255,138,0,0.5)"></span>Break-even</span>
              </div>
            </div>
            <div class="ptm-chart-container"><canvas id="ptmChart"></canvas></div>
          </div>
          <div class="ptm-chart-section ptm-chart-side">
            <div class="ptm-chart-header"><h3>Saturation Timeline</h3></div>
            <div class="ptm-chart-container"><canvas id="ptmSatChart"></canvas></div>
            <div class="ptm-sat-info">
              <div class="ptm-sat-item"><span class="ptm-sat-label">Current Saturation</span><span class="ptm-sat-val" style="color:${saturationRate>60?'var(--accent-red)':'var(--accent-orange)'}">${saturationRate}%</span></div>
              <div class="ptm-sat-item"><span class="ptm-sat-label">Days to 90% Sat.</span><span class="ptm-sat-val" style="color:var(--accent-red)">${daysToSaturation}d</span></div>
              <div class="ptm-sat-item"><span class="ptm-sat-label">Safe Entry Window</span><span class="ptm-sat-val" style="color:${daysToSaturation>30?'var(--accent-green)':'var(--accent-red)'}">${daysToSaturation>30?'Open':'Closing'}</span></div>
            </div>
          </div>
        </div>

        <div class="ptm-timing-section">
          <h3>🎯 Strategic Timing</h3>
          <div class="ptm-timing-card" style="border-left-color:${timing.color}">
            <div class="ptm-timing-header">
              <span class="ptm-timing-badge-icon">${timing.icon}</span>
              <span class="ptm-timing-badge-text" style="color:${timing.color}">${timing.action}</span>
            </div>
            <p class="ptm-timing-reason">${timing.reason}</p>
          </div>
        </div>

        <div class="ptm-section-row">
          <div class="ptm-section-half">
            <div class="ptm-card">
              <h3>💰 Break-Even Analysis</h3>
              <div class="ptm-be-grid">
                <div class="ptm-be-item"><span class="ptm-be-label">Cost Per Unit</span><span class="ptm-be-val">${formatMoneyDec(cost + shipping + adSpend)}</span></div>
                <div class="ptm-be-item"><span class="ptm-be-label">Profit Per Sale</span><span class="ptm-be-val" style="color:var(--accent-green)">${formatMoneyDec(profitPerSale)}</span></div>
                <div class="ptm-be-item"><span class="ptm-be-label">Units to Break Even</span><span class="ptm-be-val" style="color:var(--accent-cyan)">${breakEvenUnits} units</span></div>
                <div class="ptm-be-item"><span class="ptm-be-label">Days to Break Even</span><span class="ptm-be-val" style="color:${breakEvenDays<=14?'var(--accent-green)':'var(--accent-orange)'}">${breakEvenDays} days</span></div>
              </div>
            </div>
          </div>
          <div class="ptm-section-half">
            <div class="ptm-card">
              <h3>📦 Inventory Planning</h3>
              <div class="ptm-inv-grid">
                <div class="ptm-inv-item"><span class="ptm-inv-label">Recommended Order</span><span class="ptm-inv-val" style="color:var(--accent-cyan)">${recommendedInventory} units</span></div>
                <div class="ptm-inv-item"><span class="ptm-inv-label">Est. Inventory Cost</span><span class="ptm-inv-val">${formatMoney(recommendedInventory * cost)}</span></div>
                <div class="ptm-inv-item"><span class="ptm-inv-label">Reorder Point</span><span class="ptm-inv-val" style="color:var(--accent-orange)">${reorderPoint} units</span></div>
                <div class="ptm-inv-item"><span class="ptm-inv-label">Est. 30-Day ROI</span><span class="ptm-inv-val" style="color:var(--accent-green)">${recommendedInventory>0?((proj30profit/(recommendedInventory*cost))*100).toFixed(0):'0'}%</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="ptm-card">
          <h3>📅 Monthly Breakdown</h3>
          <div class="ptm-table-wrap">
            <table class="ptm-table">
              <thead><tr><th>Month</th><th>Projected Sales</th><th>Revenue</th><th>Costs</th><th>Profit</th><th>Cumulative</th></tr></thead>
              <tbody>${buildMonthlyTable(projected, sellPrice, cost, shipping, adSpend)}</tbody>
            </table>
          </div>
        </div>

        <div class="ptm-whatif">
          <h3>📊 What-If Scenarios</h3>
          <p class="ptm-whatif-sub">See how profit changes at different price points</p>
          <div class="ptm-whatif-grid">
            ${[0.8,0.9,1.0,1.1,1.2].map(mult=>{
              const adjPrice = cost*mult;
              const adjProfit = sellPrice - adjPrice - shipping - adSpend;
              const adjMonthly = adjProfit*monthlySales;
              const isBase = mult===1.0;
              return `<div class="ptm-whatif-card ${isBase?'ptm-whatif-base':''}">
                <div class="ptm-whatif-price">$${adjPrice.toFixed(2)}</div>
                <div class="ptm-whatif-mult">${mult===1?'Current':mult<1?'Discount':'Premium'}</div>
                <div class="ptm-whatif-profit" style="color:${adjMonthly>=0?'var(--accent-green)':'var(--accent-red)'}">${formatMoney(adjMonthly)}/mo</div>
                <div class="ptm-whatif-margin">${adjProfit>0?((adjProfit/adjPrice)*100).toFixed(1):'0.0'}% margin</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="ptm-factors-grid">
          <div class="ptm-factor">
            <div class="ptm-factor-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">📈</div>
            <div class="ptm-factor-info">
              <div class="ptm-factor-title">Trend Trajectory</div>
              <div class="ptm-factor-value">${((product.trendData[11]-product.trendData[0])/product.trendData[0]*100).toFixed(0)}% growth</div>
            </div>
          </div>
          <div class="ptm-factor">
            <div class="ptm-factor-icon" style="background:var(--accent-purple-dim);color:var(--accent-purple)">📊</div>
            <div class="ptm-factor-info">
              <div class="ptm-factor-title">Seasonality Index</div>
              <div class="ptm-factor-value">${product.seasonality[new Date().getMonth()]}/100 current</div>
            </div>
          </div>
          <div class="ptm-factor">
            <div class="ptm-factor-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">⚔️</div>
            <div class="ptm-factor-info">
              <div class="ptm-factor-title">Competition</div>
              <div class="ptm-factor-value">${product.competition==='low'?'Growing slowly':product.competition==='medium'?'Moderate pace':'Saturating fast'}</div>
            </div>
          </div>
          <div class="ptm-factor">
            <div class="ptm-factor-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🎯</div>
            <div class="ptm-factor-info">
              <div class="ptm-factor-title">Risk Score</div>
              <div class="ptm-factor-value">${product.riskScore}/100</div>
            </div>
          </div>
        </div>

        <div id="ptmCompare" class="ptm-compare-section"></div>
      </div>
      ${window.HuntDrop.renderRelatedTools([
        {section:'section-profit-lab',name:'Profit Calculator',desc:'Current margins',icon:'💰',color:'#00ff88'},
        {section:'section-elasticity',name:'Price Elasticity',desc:'Test pricing scenarios',icon:'📊',color:'#a855f7'},
        {section:'section-budget',name:'Ad Budget Allocator',desc:'Plan ad spend',icon:'📢',color:'#ff8a00'},
        {section:'section-simulator',name:'Business Simulator',desc:'Model scenarios',icon:'🚀',color:'#00e5ff'}
      ])}`;

  bindResultEvents(product, projected, labels, sellPrice, cost, shipping, adSpend, monthlySales);
  renderCharts(product, projected, labels, sellPrice, cost, shipping, adSpend, monthlySales, saturationRate);
}

function buildMonthlyTable(projected, sellPrice, cost, shipping, adSpend) {
  const profitPerSale = sellPrice - cost - shipping - adSpend;
  let cumulative = 0;
  const _monthlySales = projected.slice(0,30).reduce((a,b)=>a+b,0)/3;
  const rows = [];
  for(let m=0; m<3; m++){
    const slice = projected.slice(m*30,(m+1)*30);
    const sales = slice.reduce((a,b)=>a+b,0);
    const revenue = sales * sellPrice;
    const totalCost = sales * (cost + shipping + adSpend);
    const profit = sales * profitPerSale;
    cumulative += profit;
    const d = new Date(); d.setMonth(d.getMonth()+m);
    const monthName = d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    rows.push(`<tr>
        <td class="ptm-td-month">${monthName}</td>
        <td>${Math.round(sales).toLocaleString()} units</td>
        <td style="color:var(--accent-cyan)">${formatMoney(revenue)}</td>
        <td style="color:var(--accent-orange)">${formatMoney(totalCost)}</td>
        <td style="color:${profit>=0?'var(--accent-green)':'var(--accent-red)'}">${formatMoney(profit)}</td>
        <td style="color:${cumulative>=0?'var(--accent-green)':'var(--accent-red)'}">${formatMoney(cumulative)}</td>
      </tr>`);
  }
  return rows.join('');
}

function bindResultEvents(product, projected, labels, sellPrice, cost, shipping, adSpend, _monthlySales){
  const el = _section;
  if(!el) return;

  const csvBtn = el.querySelector('#ptmExportCsv');
  if(csvBtn) csvBtn.addEventListener('click',()=>exportCSV(product,projected,labels,sellPrice,cost,shipping,adSpend));

  const compareBtn = el.querySelector('#ptmCompareBtn');
  if(compareBtn) compareBtn.addEventListener('click',()=>showCompare(product));
}

function exportCSV(product, projected, labels, sellPrice, cost, shipping, adSpend){
  const profitPerSale = sellPrice - cost - shipping - adSpend;
  let cumulative = 0;
  const headers = ['Day','Date','Projected Sales','Revenue','Costs','Profit','Cumulative Profit'];
  const rows = projected.map((sales,i)=>{
    const revenue = sales * sellPrice;
    const costs = sales * (cost + shipping + adSpend);
    const profit = sales * profitPerSale;
    cumulative += profit;
    return [i+1, labels[i], Math.round(sales), '$'+revenue.toFixed(0), '$'+costs.toFixed(0), '$'+profit.toFixed(0), '$'+cumulative.toFixed(0)];
  });
  const csv = [headers,...rows].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'profit-forecast-' + product.title.split('—')[0].trim().replace(/\s+/g,'-').toLowerCase() + '.csv';
  a.click();
}

function showCompare(currentProduct){
  const el = _section?.querySelector('#ptmCompare');
  if(!el) return;
  const products = (window.HuntDrop.ALL_PRODUCTS||[]).filter(p=>p.id!==currentProduct.id).slice(0,4);
  if(!products.length){el.innerHTML='';return;}
  el.innerHTML = `
      <div class="ptm-compare">
        <h3>⚖️ Compare With Other Products</h3>
        <p class="ptm-compare-sub">Click a product to run its forecast</p>
        <div class="ptm-compare-grid">
          ${products.map(p=>{
            const profit = p.platformPrices.amazon - p.price - 2.50 - (p.adSpendAvg||p.platformPrices.amazon*0.15);
            const monthly = profit * p.salesVelocity;
            return `<div class="ptm-compare-card" data-q="${esc(p.title.split('—')[0].trim())}">
              <img src="${esc(p.image)}" class="ptm-compare-img" alt="">
              <div class="ptm-compare-info">
                <div class="ptm-compare-name">${esc(p.title.split('—')[0].trim())}</div>
                <div class="ptm-compare-stats">
                  <span>Score: ${p.score}</span>
                  <span style="color:var(--accent-green)">${formatMoney(monthly)}/mo</span>
                  <span>${p.margin}% margin</span>
                </div>
              </div>
              <div class="ptm-compare-arrow">→</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  el.querySelectorAll('.ptm-compare-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const input = _section?.querySelector('#ptmInput');
      if(input) input.value = card.dataset.q;
      analyze(card.dataset.q);
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });
}

function renderCharts(product, projected, labels, sellPrice, cost, shipping, adSpend, monthlySales, saturationRate){
  setTimeout(()=>{
    const canvas = _section?_section.querySelector('#ptmChart'):null;
    if(!canvas) return;
    const profitPerSale = sellPrice - cost - shipping - adSpend;
    const histLabels = MONTHS;
    const fullLabels = [...histLabels,...labels];
    const fullData = [...product.trendData,...projected];
    const profitData = fullData.map(v=>Math.round(v*profitPerSale));
    const revData = fullData.map(v=>Math.round(v*sellPrice));
    const breakEven = fullData.map(()=>Math.round(monthlySales*profitPerSale*0.7));
    if(_chart) _chart.destroy();
    _chart = new Chart(canvas,{
      type:'line',
      data:{labels:fullLabels.filter((_,i)=>i%6===0),datasets:[
        {label:'Profit',data:profitData.filter((_,i)=>i%6===0),borderColor:'#00ff88',backgroundColor:'rgba(0,255,136,0.08)',borderWidth:2,fill:true,tension:0.4,pointBackgroundColor:'#00ff88',pointBorderColor:'#06060c',pointBorderWidth:2,pointRadius:2,pointHoverRadius:6},
        {label:'Revenue',data:revData.filter((_,i)=>i%6===0),borderColor:'#00e5ff',backgroundColor:'rgba(0,229,255,0.05)',borderWidth:2,fill:true,tension:0.4,pointBackgroundColor:'#00e5ff',pointBorderColor:'#06060c',pointBorderWidth:2,pointRadius:2,pointHoverRadius:6},
        {label:'Break-even',data:breakEven.filter((_,i)=>i%6===0),borderColor:'rgba(255,138,0,0.5)',borderWidth:1,borderDash:[6,4],pointRadius:0,fill:false}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#111119',borderColor:'#2a2a3d',borderWidth:1,titleFont:{family:'Outfit',size:11},bodyFont:{family:'JetBrains Mono',size:12},padding:12,displayColors:false,callbacks:{label:c=>c.dataset.label+': $'+c.parsed.y.toLocaleString()}}},scales:{x:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},maxTicksLimit:12}},y:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},callback:v=>'$'+v}}},interaction:{intersect:false,mode:'index'}}
    });

    const satCanvas = _section?_section.querySelector('#ptmSatChart'):null;
    if(satCanvas){
      if(_chartSat) _chartSat.destroy();
      const satData = [];
      const satLabels = [];
      for(let i=0;i<90;i+=3){
        const sat = Math.min(98, saturationRate + (i * (saturationRate>60?1.2:0.6)));
        satData.push(Math.round(sat));
        satLabels.push('Day '+(i+1));
      }
      _chartSat = new Chart(satCanvas,{
        type:'line',
        data:{labels:satLabels,datasets:[{label:'Saturation %',data:satData,borderColor:'#ff3366',backgroundColor:'rgba(255,51,102,0.08)',borderWidth:2,fill:true,tension:0.4,pointRadius:0}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},callback:v=>v+'%'}}}}
      });
    }
  },150);
}

const ProfitTimeMachinePlugin = {
  id:'profit-time-machine', name:'Sales Forecast', version:'3.0.0',
  description:'Predictive profit analytics — see the future before your competitors',
  dependencies:['search-engine'],

  init(_ctx){ Config.defaults('profitTimeMachine',{enabled:true}); },

  mount(_ctx){
    const container = UI.$('sections-container');
    if (!container) return;
    const section = document.createElement('section');
    section.className = 'section section-profit-time-machine';
    section.id = 'section-time-machine';
    section.innerHTML = buildHTML();
    container.appendChild(section);
    _section = section;
    bindEvents();
    renderEmptyState();
  },

  unmount(_ctx){
    if(_chart){_chart.destroy();_chart=null;}
    if(_chartSat){_chartSat.destroy();_chartSat=null;}
    if(_section){_section.remove();_section=null;}
  }
};

PluginRegistry.register('profit-time-machine',ProfitTimeMachinePlugin);
})();
