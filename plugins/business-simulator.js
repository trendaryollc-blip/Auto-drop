// ============================================================================
// PLUGIN: Business Mode Simulator
// ============================================================================
// Simulate your ENTIRE business: "If I sell these products with this budget,
// here's what happens in 30/60/90 days" — revenue, profit, costs, growth.
// ============================================================================
(function(){
const {EventBus,PluginRegistry,UI,Config} = window.HuntDrop;

function simulate(params){
  const {budget,productCount,avgCpa,avgOrderValue,avgMargin,dailyAdSpend,growthRate,refundRate} = params;
  const days = 90;
  const results = {daily:[],scenarios:{best:[],worst:[],likely:[]},milestones:{},productPerformance:[]};

  const scenarios = {
    best:{growthMult:1.3,cpaDiscount:0.2,marginBonus:0.05,label:'Best Case'},
    worst:{growthMult:0.6,cpaPenalty:0.4,marginLoss:0.1,label:'Worst Case'},
    likely:{growthMult:1.0,cpaDiscount:0,marginBonus:0,label:'Likely Case'}
  };

  const dailySalesBase = Math.max(1,Math.round(dailyAdSpend / avgCpa));

  for(let d=1; d<=days; d++){
    const weekNum = Math.ceil(d/7);
    const growth = 1 + (growthRate/100) * ((d-1)/30);
    const seasonality = 1 + Math.sin(d * Math.PI / 30) * 0.05;
    const randomFactor = 0.9 + Math.random() * 0.2;

    const daySales = Math.max(0, Math.round(dailySalesBase * growth * seasonality * randomFactor));
    const revenue = daySales * avgOrderValue;
    const productCost = daySales * (avgOrderValue * (1 - avgMargin/100));
    const adCost = daySales * avgCpa;
    const refunds = revenue * (refundRate/100);
    const netRevenue = revenue - refunds;
    const profit = netRevenue - productCost - adCost;

    let cumRev=0, cumProfit=0, cumCost=0;
    results.daily.forEach(dd => { cumRev+=dd.revenue; cumProfit+=dd.profit; cumCost+=dd.cost+dd.adCost; });
    cumRev+=revenue; cumProfit+=profit; cumCost+=productCost+adCost;

    results.daily.push({day:d,sales:daySales,revenue,netRevenue,cost:productCost,adCost,refunds,profit,cumRevenue:cumRev,cumProfit:cumProfit,cumCost});
  }

  Object.entries(scenarios).forEach(([key,mult])=>{
    let cumRev=0,cumProfit=0;
    const cpaMult = 1-(mult.cpaDiscount||0)+(mult.cpaPenalty||0);
    const marginAdj = mult.marginBonus||0-(mult.marginLoss||0);
    for(let d=0;d<days;d++){
      const baseRev = results.daily[d].revenue * mult.growthMult;
      const baseProfit = (results.daily[d].netRevenue*(1+marginAdj) - results.daily[d].cost - results.daily[d].adCost*cpaMult) * mult.growthMult;
      cumRev += baseRev;
      cumProfit += baseProfit;
      results.scenarios[key].push({day:d+1,cumRevenue:cumRev,cumProfit:Math.round(cumProfit)});
    }
  });

  const sums = (arr,key) => arr.reduce((s,d)=>s+d[key],0);
  const d30=results.daily.slice(0,30), d60=results.daily.slice(0,60), d90=results.daily;
  results.milestones = {
    day30:{revenue:sums(d30,'revenue'),profit:sums(d30,'profit'),sales:sums(d30,'sales'),costs:sums(d30,'cost')+sums(d30,'adCost'),refunds:sums(d30,'refunds')},
    day60:{revenue:sums(d60,'revenue'),profit:sums(d60,'profit'),sales:sums(d60,'sales'),costs:sums(d60,'cost')+sums(d60,'adCost'),refunds:sums(d60,'refunds')},
    day90:{revenue:sums(d90,'revenue'),profit:sums(d90,'profit'),sales:sums(d90,'sales'),costs:sums(d90,'cost')+sums(d90,'adCost'),refunds:sums(d90,'refunds')}
  };

  let cumProfit=0;
  results.breakEvenDay=null;
  for(let d=0;d<days;d++){
    cumProfit+=results.daily[d].profit;
    if(cumProfit>=budget && !results.breakEvenDay) results.breakEvenDay=d+1;
  }

  results.maxDrawdown=0; results.peakProfit=0;
  cumProfit=0;
  for(let d=0;d<days;d++){
    cumProfit+=results.daily[d].profit;
    if(cumProfit>results.peakProfit) results.peakProfit=cumProfit;
    const drawdown=results.peakProfit-cumProfit;
    if(drawdown>results.maxDrawdown) results.maxDrawdown=drawdown;
  }

  results.dailyAvgProfit = sums(d90,'profit')/90;
  results.dailyAvgRevenue = sums(d90,'revenue')/90;
  results.roi = budget>0?((sums(d90,'profit')/budget)*100):0;
  results.profitMargin = sums(d90,'revenue')>0?((sums(d90,'profit')/sums(d90,'revenue'))*100):0;

  return results;
}

function fmt(n){return n>=0?'$'+Math.round(n).toLocaleString():'-$'+Math.abs(Math.round(n)).toLocaleString();}
function fmtK(n){return n>=1000?'$'+(n/1000).toFixed(1)+'K':'$'+Math.round(n);}
function pct(n){return n.toFixed(1)+'%';}

const BusinessSimulatorPlugin = {
  id:'business-simulator', name:'Business Mode Simulator', version:'2.0.0',
  description:'Simulate your entire dropshipping business for 30/60/90 days',
  _section:null, _chart:null, _scenarioChart:null,

  init(ctx){Config.defaults('businessSim',{enabled:true});},

  mount(ctx){
    const container = UI.$('sections-container');
    if(!container) return;
    const section = document.createElement('section');
    section.className = 'section section-business-simulator';
    section.id = 'section-simulator';
    section.innerHTML = `
      <div class="section-inner">
        <div class="bs-hero">
          <div class="bs-hero-badge">Business Intelligence</div>
          <h1 class="bs-hero-title">Business Mode Simulator</h1>
          <p class="bs-hero-desc">Plug in your numbers, see your future. Revenue, profit, costs, and growth — projected for 90 days with best/worst/likely scenarios.</p>
        </div>

        <div class="bs-features">
          <div class="bs-feat"><div class="bs-feat-icon bs-feat-green">📊</div><div class="bs-feat-text">90-Day Forecast</div></div>
          <div class="bs-feat"><div class="bs-feat-icon bs-feat-cyan">🎯</div><div class="bs-feat-text">3 Scenarios</div></div>
          <div class="bs-feat"><div class="bs-feat-icon bs-feat-orange">⚠️</div><div class="bs-feat-text">Risk Analysis</div></div>
          <div class="bs-feat"><div class="bs-feat-icon bs-feat-purple">💡</div><div class="bs-feat-text">Action Plan</div></div>
        </div>

        <div class="bs-input-card">
          <h3 class="bs-input-title">Business Parameters</h3>
          <div class="bs-input-grid">
            <div class="bs-field">
              <div class="bs-field-icon bs-field-cyan">$</div>
              <div class="bs-field-wrap">
                <label>Starting Budget</label>
                <input type="number" id="bsBudget" class="bs-input" value="500" min="50">
              </div>
            </div>
            <div class="bs-field">
              <div class="bs-field-icon bs-field-green">📦</div>
              <div class="bs-field-wrap">
                <label>Products to Sell</label>
                <input type="number" id="bsProducts" class="bs-input" value="5" min="1" max="20">
              </div>
            </div>
            <div class="bs-field">
              <div class="bs-field-icon bs-field-red">📢</div>
              <div class="bs-field-wrap">
                <label>Avg Cost Per Sale (CPA)</label>
                <input type="number" id="bsCPA" class="bs-input" value="4.50" step="0.10" min="0.50">
              </div>
            </div>
            <div class="bs-field">
              <div class="bs-field-icon bs-field-orange">💰</div>
              <div class="bs-field-wrap">
                <label>Avg Order Value</label>
                <input type="number" id="bsAOV" class="bs-input" value="34.99" step="0.01" min="5">
              </div>
            </div>
            <div class="bs-field">
              <div class="bs-field-icon bs-field-purple">📈</div>
              <div class="bs-field-wrap">
                <label>Profit Margin (%)</label>
                <input type="number" id="bsMargin" class="bs-input" value="72" min="10" max="95">
              </div>
            </div>
            <div class="bs-field">
              <div class="bs-field-icon bs-field-green">🚀</div>
              <div class="bs-field-wrap">
                <label>Monthly Growth Rate (%)</label>
                <input type="number" id="bsGrowth" class="bs-input" value="8" min="0" max="50">
              </div>
            </div>
            <div class="bs-field">
              <div class="bs-field-icon bs-field-orange">🔄</div>
              <div class="bs-field-wrap">
                <label>Refund Rate (%)</label>
                <input type="number" id="bsRefunds" class="bs-input" value="3" min="0" max="20">
              </div>
            </div>
            <div class="bs-field">
              <div class="bs-field-icon bs-field-cyan">📅</div>
              <div class="bs-field-wrap">
                <label>Daily Ad Budget</label>
                <input type="number" id="bsDailyBudget" class="bs-input" value="17" min="1">
              </div>
            </div>
          </div>
          <button id="bsSimulateBtn" class="bs-simulate-btn">Run 90-Day Simulation</button>
        </div>

        <div id="bsResults" class="bs-results"></div>
      </div>`;
    container.appendChild(section);
    const self = BusinessSimulatorPlugin;
    self._section = section;

    const btn=section.querySelector('#bsSimulateBtn');
    if(btn) btn.addEventListener('click',()=>self.runSimulation());
  },

  unmount(ctx){
    if(BusinessSimulatorPlugin._chart){BusinessSimulatorPlugin._chart.destroy();BusinessSimulatorPlugin._chart=null;}
    if(BusinessSimulatorPlugin._scenarioChart){BusinessSimulatorPlugin._scenarioChart.destroy();BusinessSimulatorPlugin._scenarioChart=null;}
    if(BusinessSimulatorPlugin._section){BusinessSimulatorPlugin._section.remove();BusinessSimulatorPlugin._section=null;}
    this._section=null;
  },

  getInputs(){
    const q=id=>this._section.querySelector('#'+id);
    return {
      budget:parseFloat(q('bsBudget')?.value)||500,
      productCount:parseInt(q('bsProducts')?.value)||5,
      avgCpa:parseFloat(q('bsCPA')?.value)||4.50,
      avgOrderValue:parseFloat(q('bsAOV')?.value)||34.99,
      avgMargin:parseFloat(q('bsMargin')?.value)||72,
      growthRate:parseFloat(q('bsGrowth')?.value)||8,
      refundRate:parseFloat(q('bsRefunds')?.value)||3,
      dailyAdSpend:parseFloat(q('bsDailyBudget')?.value)||17
    };
  },

  runSimulation(){
    const el=this._section?this._section.querySelector('#bsResults'):null;
    if(!el) return;

    const inputs=this.getInputs();
    const products=window.HuntDrop.ALL_PRODUCTS||[];
    const selected=products.slice(0,inputs.productCount);

    const results=simulate(inputs);
    const d30=results.milestones.day30;
    const d60=results.milestones.day60;
    const d90=results.milestones.day90;

    el.innerHTML=`
      <div class="bs-output">
        <div class="bs-hero-grid">
          <div class="bs-hero-card bs-hero-budget">
            <div class="bs-hc-icon">💵</div>
            <div class="bs-hc-label">Starting Budget</div>
            <div class="bs-hc-value" style="color:var(--accent-cyan)">${fmt(inputs.budget)}</div>
            <div class="bs-hc-sub">${inputs.productCount} products · $${inputs.dailyAdSpend}/day ads</div>
          </div>
          <div class="bs-hero-card">
            <div class="bs-hc-icon">📈</div>
            <div class="bs-hc-label">30-Day Revenue</div>
            <div class="bs-hc-value" style="color:var(--accent-green)">${fmtK(d30.revenue)}</div>
            <div class="bs-hc-sub">Profit: <span style="color:${d30.profit>=0?'var(--accent-green)':'var(--accent-red)'}">${fmt(d30.profit)}</span></div>
          </div>
          <div class="bs-hero-card">
            <div class="bs-hc-icon">📊</div>
            <div class="bs-hc-label">60-Day Revenue</div>
            <div class="bs-hc-value" style="color:var(--accent-green)">${fmtK(d60.revenue)}</div>
            <div class="bs-hc-sub">Profit: <span style="color:${d60.profit>=0?'var(--accent-green)':'var(--accent-red)'}">${fmt(d60.profit)}</span></div>
          </div>
          <div class="bs-hero-card">
            <div class="bs-hc-icon">🎯</div>
            <div class="bs-hc-label">90-Day Revenue</div>
            <div class="bs-hc-value" style="color:var(--accent-green)">${fmtK(d90.revenue)}</div>
            <div class="bs-hc-sub">Profit: <span style="color:${d90.profit>=0?'var(--accent-green)':'var(--accent-red)'}">${fmt(d90.profit)}</span></div>
          </div>
        </div>

        ${results.breakEvenDay?`
        <div class="bs-alert bs-alert-success">
          <div class="bs-alert-pulse"></div>
          <span class="bs-alert-icon">🎯</span>
          <div>
            <div class="bs-alert-title">Break-Even on Day ${results.breakEvenDay}</div>
            <div class="bs-alert-text">Your ${fmt(inputs.budget)} investment is recovered by day ${results.breakEvenDay}. After that, every sale is pure profit.</div>
          </div>
        </div>`:`
        <div class="bs-alert bs-alert-warning">
          <span class="bs-alert-icon">⚠️</span>
          <div>
            <div class="bs-alert-title">Break-Even Not Reached in 90 Days</div>
            <div class="bs-alert-text">Consider increasing ad budget, improving conversion rates, or reducing CPA. See suggestions below.</div>
          </div>
        </div>`}

        <div class="bs-stats-row">
          <div class="bs-stat"><div class="bs-stat-icon" style="color:var(--accent-green)">💰</div><div class="bs-stat-val" style="color:${d90.profit>=0?'var(--accent-green)':'var(--accent-red)'}">${fmt(d90.profit)}</div><div class="bs-stat-label">Total Profit (90d)</div></div>
          <div class="bs-stat"><div class="bs-stat-icon" style="color:var(--accent-cyan)">📦</div><div class="bs-stat-val">${d90.sales.toLocaleString()}</div><div class="bs-stat-label">Total Orders</div></div>
          <div class="bs-stat"><div class="bs-stat-icon" style="color:var(--accent-orange)">📊</div><div class="bs-stat-val">${pct(results.roi)}</div><div class="bs-stat-label">ROI on Budget</div></div>
          <div class="bs-stat"><div class="bs-stat-icon" style="color:var(--accent-purple)">📈</div><div class="bs-stat-val">${pct(results.profitMargin)}</div><div class="bs-stat-label">Profit Margin</div></div>
          <div class="bs-stat"><div class="bs-stat-icon" style="color:var(--accent-cyan)">💵</div><div class="bs-stat-val">${fmt(results.dailyAvgProfit)}</div><div class="bs-stat-label">Avg Daily Profit</div></div>
          <div class="bs-stat"><div class="bs-stat-icon" style="color:var(--accent-red)">📉</div><div class="bs-stat-val">${fmt(results.maxDrawdown)}</div><div class="bs-stat-label">Max Drawdown</div></div>
        </div>

        <div class="bs-chart-card">
          <div class="bs-chart-header">
            <h3>90-Day Revenue, Profit & Costs</h3>
            <div class="bs-chart-legend">
              <span class="bs-legend"><span class="bs-legend-dot" style="background:var(--accent-green)"></span>Revenue</span>
              <span class="bs-legend"><span class="bs-legend-dot" style="background:var(--accent-cyan)"></span>Profit</span>
              <span class="bs-legend"><span class="bs-legend-dot" style="background:var(--accent-red)"></span>Costs</span>
            </div>
          </div>
          <div class="bs-chart-wrap"><canvas id="bsMainChart"></canvas></div>
        </div>

        <div class="bs-scenarios-card">
          <h3 class="bs-card-title">Scenario Analysis</h3>
          <div class="bs-scenarios-grid">
            <div class="bs-scenario bs-scenario-best">
              <div class="bs-sc-top"><span class="bs-sc-emoji">📈</span><span class="bs-sc-label">Best Case</span></div>
              <div class="bs-sc-desc">30% faster growth, 20% lower CPA</div>
              <div class="bs-sc-values">
                <div class="bs-sc-row"><span>30 days</span><span class="bs-sc-rev">${fmtK(results.scenarios.best[29]?.cumRevenue||0)}</span></div>
                <div class="bs-sc-row"><span>60 days</span><span class="bs-sc-rev">${fmtK(results.scenarios.best[59]?.cumRevenue||0)}</span></div>
                <div class="bs-sc-row"><span>90 days</span><span class="bs-sc-rev">${fmtK(results.scenarios.best[89]?.cumRevenue||0)}</span></div>
                <div class="bs-sc-row bs-sc-profit"><span>90d Profit</span><span style="color:var(--accent-green)">${fmt(results.scenarios.best[89]?.cumProfit||0)}</span></div>
              </div>
            </div>
            <div class="bs-scenario bs-scenario-likely">
              <div class="bs-sc-top"><span class="bs-sc-emoji">📊</span><span class="bs-sc-label">Likely Case</span></div>
              <div class="bs-sc-desc">Baseline projection</div>
              <div class="bs-sc-values">
                <div class="bs-sc-row"><span>30 days</span><span class="bs-sc-rev">${fmtK(results.scenarios.likely[29]?.cumRevenue||0)}</span></div>
                <div class="bs-sc-row"><span>60 days</span><span class="bs-sc-rev">${fmtK(results.scenarios.likely[59]?.cumRevenue||0)}</span></div>
                <div class="bs-sc-row"><span>90 days</span><span class="bs-sc-rev">${fmtK(results.scenarios.likely[89]?.cumRevenue||0)}</span></div>
                <div class="bs-sc-row bs-sc-profit"><span>90d Profit</span><span style="color:${(results.scenarios.likely[89]?.cumProfit||0)>=0?'var(--accent-green)':'var(--accent-red)'}">${fmt(results.scenarios.likely[89]?.cumProfit||0)}</span></div>
              </div>
            </div>
            <div class="bs-scenario bs-scenario-worst">
              <div class="bs-sc-top"><span class="bs-sc-emoji">📉</span><span class="bs-sc-label">Worst Case</span></div>
              <div class="bs-sc-desc">40% slower growth, 40% higher CPA</div>
              <div class="bs-sc-values">
                <div class="bs-sc-row"><span>30 days</span><span class="bs-sc-rev">${fmtK(results.scenarios.worst[29]?.cumRevenue||0)}</span></div>
                <div class="bs-sc-row"><span>60 days</span><span class="bs-sc-rev">${fmtK(results.scenarios.worst[59]?.cumRevenue||0)}</span></div>
                <div class="bs-sc-row"><span>90 days</span><span class="bs-sc-rev">${fmtK(results.scenarios.worst[89]?.cumRevenue||0)}</span></div>
                <div class="bs-sc-row bs-sc-profit"><span>90d Profit</span><span style="color:${(results.scenarios.worst[89]?.cumProfit||0)>=0?'var(--accent-green)':'var(--accent-red)'}">${fmt(results.scenarios.worst[89]?.cumProfit||0)}</span></div>
              </div>
            </div>
          </div>
          <div class="bs-scenario-chart-wrap"><canvas id="bsScenarioChart"></canvas></div>
        </div>

        <div class="bs-products-card">
          <h3 class="bs-card-title">Product Performance Breakdown</h3>
          <div class="bs-products-grid">
            ${selected.map((p,i)=>{
              const prodRev=d90.revenue/selected.length;
              const prodProfit=d90.profit/selected.length;
              const prodSales=d90.sales/selected.length;
              const barWidth=Math.min(100,Math.abs(prodProfit)/Math.max(1,Math.abs(d90.profit)||1)*100);
              return `<div class="bs-prod-card">
                <div class="bs-prod-top"><img src="${p.image}" class="bs-prod-img" alt=""><div class="bs-prod-info"><div class="bs-prod-name">${p.title.split('—')[0].trim()}</div><div class="bs-prod-meta">${p.platform} · ${p.category}</div></div></div>
                <div class="bs-prod-stats">
                  <div class="bs-prod-stat"><div class="bs-prod-stat-val">${fmtK(prodRev)}</div><div class="bs-prod-stat-label">Revenue</div></div>
                  <div class="bs-prod-stat"><div class="bs-prod-stat-val" style="color:${prodProfit>=0?'var(--accent-green)':'var(--accent-red)'}">${fmt(prodProfit)}</div><div class="bs-prod-stat-label">Profit</div></div>
                  <div class="bs-prod-stat"><div class="bs-prod-stat-val">${Math.round(prodSales).toLocaleString()}</div><div class="bs-prod-stat-label">Sales</div></div>
                </div>
                <div class="bs-prod-bar"><div class="bs-prod-bar-fill" style="width:${barWidth}%;background:${prodProfit>=0?'var(--accent-green)':'var(--accent-red)'}"></div></div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="bs-monthly-card">
          <h3 class="bs-card-title">Monthly Breakdown</h3>
          <div class="bs-monthly-grid">
            ${[{label:'Month 1',data:d30},{label:'Month 2',data:{revenue:d60.revenue-d30.revenue,profit:d60.profit-d30.profit,sales:d60.sales-d30.sales}},{label:'Month 3',data:{revenue:d90.revenue-d60.revenue,profit:d90.profit-d60.profit,sales:d90.sales-d60.sales}}].map(m=>`
              <div class="bs-month-card">
                <div class="bs-month-label">${m.label}</div>
                <div class="bs-month-rev">${fmtK(m.data.revenue)}</div>
                <div class="bs-month-profit" style="color:${m.data.profit>=0?'var(--accent-green)':'var(--accent-red)'}">${fmt(m.data.profit)} profit</div>
                <div class="bs-month-sales">${Math.round(m.data.sales).toLocaleString()} orders</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bs-risk-card">
          <h3 class="bs-card-title">⚠️ Risk Assessment</h3>
          <div class="bs-risk-grid">
            <div class="bs-risk-item">
              <div class="bs-risk-level ${results.profitMargin>=20?'bs-risk-low':results.profitMargin>=10?'bs-risk-med':'bs-risk-high'}">${results.profitMargin>=20?'Low':results.profitMargin>=10?'Medium':'High'}</div>
              <div class="bs-risk-title">Margin Risk</div>
              <div class="bs-risk-desc">${results.profitMargin>=20?'Healthy margin provides buffer against cost increases.':results.profitMargin>=10?'Margin is tight. One bad week could erase profits.':'Dangerously low margin. Reduce costs or raise prices immediately.'}</div>
            </div>
            <div class="bs-risk-item">
              <div class="bs-risk-level ${results.maxDrawdown<budget*0.5?'bs-risk-low':results.maxDrawdown<budget?'bs-risk-med':'bs-risk-high'}">${results.maxDrawdown<budget*0.5?'Low':results.maxDrawdown<budget?'Medium':'High'}</div>
              <div class="bs-risk-title">Drawdown Risk</div>
              <div class="bs-risk-desc">Max drawdown of ${fmt(results.maxDrawdown)} ${results.maxDrawdown<budget*0.5?'is manageable.':'is significant. Keep reserve capital.'}</div>
            </div>
            <div class="bs-risk-item">
              <div class="bs-risk-level ${inputs.avgCpa< inputs.avgOrderValue*0.15?'bs-risk-low':inputs.avgCpa<inputs.avgOrderValue*0.25?'bs-risk-med':'bs-risk-high'}">${inputs.avgCpa<inputs.avgOrderValue*0.15?'Low':inputs.avgCpa<inputs.avgOrderValue*0.25?'Medium':'High'}</div>
              <div class="bs-risk-title">CPA Risk</div>
              <div class="bs-risk-desc">CPA of ${fmt(inputs.avgCpa)} is ${inputs.avgCpa<inputs.avgOrderValue*0.15?'healthy':inputs.avgCpa<inputs.avgOrderValue*0.25?'acceptable':'concerning'} relative to AOV of ${fmt(inputs.avgOrderValue)}.</div>
            </div>
            <div class="bs-risk-item">
              <div class="bs-risk-level ${inputs.refundRate<=3?'bs-risk-low':inputs.refundRate<=8?'bs-risk-med':'bs-risk-high'}">${inputs.refundRate<=3?'Low':inputs.refundRate<=8?'Medium':'High'}</div>
              <div class="bs-risk-title">Refund Risk</div>
              <div class="bs-risk-desc">${inputs.refundRate<=3?'Low refund rate protects profit.':inputs.refundRate<=8?'Moderate refunds eating into margin.':'High refunds will destroy profit. Fix product quality or expectations.'}</div>
            </div>
          </div>
        </div>

        <div class="bs-optimize-card">
          <h3 class="bs-card-title">💡 Action Plan to Improve</h3>
          <div class="bs-optimize-grid">
            <div class="bs-opt-item">
              <div class="bs-opt-num">1</div>
              <div class="bs-opt-info">
                <div class="bs-opt-title">Reduce CPA from ${fmt(inputs.avgCpa)} to ${fmt(inputs.avgCpa*0.7)}</div>
                <div class="bs-opt-desc">Test 5 new ad creatives. A 30% CPA reduction would increase 90-day profit by ~${fmt(d90.profit*0.4)}.</div>
              </div>
            </div>
            <div class="bs-opt-item">
              <div class="bs-opt-num">2</div>
              <div class="bs-opt-info">
                <div class="bs-opt-title">Increase AOV with Bundles</div>
                <div class="bs-opt-desc">Bundle 2 products at 15% off. AOV goes from ${fmt(inputs.avgOrderValue)} to ${fmt(inputs.avgOrderValue*1.6)} — revenue jumps 60%.</div>
              </div>
            </div>
            <div class="bs-opt-item">
              <div class="bs-opt-num">3</div>
              <div class="bs-opt-info">
                <div class="bs-opt-title">Add Retargeting (30% of budget)</div>
                <div class="bs-opt-desc">Retargeting recovers 15% of lost sales. Adds ~${fmtK(d90.revenue*0.15)} to 90-day revenue.</div>
              </div>
            </div>
            <div class="bs-opt-item">
              <div class="bs-opt-num">4</div>
              <div class="bs-opt-info">
                <div class="bs-opt-title">Build Email List from Day 1</div>
                <div class="bs-opt-desc">Even 5% repeat purchase rate adds ~${fmtK(d90.revenue*0.05)} in free traffic revenue over 90 days.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${window.HuntDrop.renderRelatedTools([
        {section:'section-time-machine',name:'Profit Time Machine',desc:'Revenue forecast',icon:'🔮',color:'#00e5ff'},
        {section:'section-profit-lab',name:'Profit Calculator',desc:'Unit economics',icon:'💰',color:'#00ff88'},
        {section:'section-battlefield',name:'Competitor Battlefield',desc:'Competitive analysis',icon:'⚔️',color:'#ff3366'},
        {section:'section-market-gaps',name:'Market Gap Finder',desc:'Find opportunities',icon:'🎯',color:'#a855f7'}
      ])}`;

    setTimeout(()=>this.renderCharts(results),100);
  },

  renderCharts(results){
    const canvas=this._section?this._section.querySelector('#bsMainChart'):null;
    if(!canvas) return;
    if(this._chart) this._chart.destroy();

    const labels=results.daily.filter((_,i)=>i%3===0).map(d=>'Day '+d.day);
    this._chart=new Chart(canvas,{
      type:'line',
      data:{labels,datasets:[
        {label:'Revenue',data:results.daily.filter((_,i)=>i%3===0).map(d=>d.revenue),borderColor:'#00ff88',backgroundColor:'rgba(0,255,136,0.06)',borderWidth:2,fill:true,tension:0.4,pointRadius:0},
        {label:'Profit',data:results.daily.filter((_,i)=>i%3===0).map(d=>d.profit),borderColor:'#00e5ff',backgroundColor:'rgba(0,229,255,0.06)',borderWidth:2,fill:true,tension:0.4,pointRadius:0},
        {label:'Costs',data:results.daily.filter((_,i)=>i%3===0).map(d=>d.cost+d.adCost),borderColor:'#ff3366',backgroundColor:'rgba(255,51,102,0.06)',borderWidth:2,fill:true,tension:0.4,pointRadius:0}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#111119',borderColor:'#2a2a3d',borderWidth:1,titleFont:{family:'Outfit',size:11},bodyFont:{family:'JetBrains Mono',size:12},padding:10,displayColors:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},maxTicksLimit:10}},y:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},callback:v=>'$'+(v>=1000?(v/1000).toFixed(0)+'K':v)}}},interaction:{intersect:false,mode:'index'}}
    });

    const scCanvas=this._section?this._section.querySelector('#bsScenarioChart'):null;
    if(!scCanvas) return;
    if(this._scenarioChart) this._scenarioChart.destroy();
    const scLabels=results.scenarios.likely.filter((_,i)=>i%6===0).map(s=>'Day '+s.day);
    this._scenarioChart=new Chart(scCanvas,{
      type:'line',
      data:{labels:scLabels,datasets:[
        {label:'Best',data:results.scenarios.best.filter((_,i)=>i%6===0).map(s=>s.cumRevenue),borderColor:'#00ff88',borderWidth:2,tension:0.4,pointRadius:0,borderDash:[5,3]},
        {label:'Likely',data:results.scenarios.likely.filter((_,i)=>i%6===0).map(s=>s.cumRevenue),borderColor:'#00e5ff',borderWidth:2,tension:0.4,pointRadius:0},
        {label:'Worst',data:results.scenarios.worst.filter((_,i)=>i%6===0).map(s=>s.cumRevenue),borderColor:'#ff3366',borderWidth:2,tension:0.4,pointRadius:0,borderDash:[5,3]}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#8888a4',font:{family:'Inter',size:11},usePointStyle:true,padding:16}},tooltip:{backgroundColor:'#111119',borderColor:'#2a2a3d',borderWidth:1}},scales:{x:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},maxTicksLimit:10}},y:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},callback:v=>'$'+(v>=1000?(v/1000).toFixed(0)+'K':v)}}},interaction:{intersect:false,mode:'index'}}
    });
  }
};

PluginRegistry.register('business-simulator',BusinessSimulatorPlugin);
})();
