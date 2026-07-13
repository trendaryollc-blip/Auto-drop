// ============================================================================
// PLUGIN: Price Elasticity Simulator
// ============================================================================
(function(){
const {EventBus,PluginRegistry,UI,Config} = window.HuntDrop;

const PriceElasticityPlugin = {
  id:'price-elasticity', name:'Price Calculator', version:'2.0.0',
  description:'Simulate price changes and see impact on demand, revenue, and profit',
  _selectedProduct:null, _chart:null, _demandChart:null, _section:null,

  init(ctx){ Config.defaults('elasticity',{defaultProduct:null}); },

  mount(ctx){
    const container = UI.$('sections-container');
    if(!container) return;
    const section = document.createElement('section');
    section.className = 'section section-price-elasticity';
    section.id = 'section-elasticity';
    section.innerHTML = `
      <div class="section-inner">
        <div class="pes-hero">
          <div class="pes-hero-badge">Pricing Intelligence</div>
          <h1 class="pes-hero-title">Price Elasticity Simulator</h1>
          <p class="pes-hero-desc">Drag one slider, instantly see how every dollar change affects demand, revenue, and profit. Find the exact price that makes you the most money.</p>
        </div>

        <div class="pes-features">
          <div class="pes-feat"><div class="pes-feat-icon pes-feat-cyan">📊</div><div class="pes-feat-text">Live Simulation</div></div>
          <div class="pes-feat"><div class="pes-feat-icon pes-feat-green">🎯</div><div class="pes-feat-text">Sweet Spot Finder</div></div>
          <div class="pes-feat"><div class="pes-feat-icon pes-feat-orange">⚔️</div><div class="pes-feat-text">Competitor Mapping</div></div>
          <div class="pes-feat"><div class="pes-feat-icon pes-feat-purple">💡</div><div class="pes-feat-text">Strategy Advice</div></div>
        </div>

        <div class="pes-select-box">
          <label class="pes-select-label">Choose a product to simulate</label>
          <select id="peProductSelect" class="pes-select">
            <option value="">Select a product...</option>
          </select>
        </div>

        <div id="peResults" class="pe-results"></div>
      </div>`;
    container.appendChild(section);
    const self = PriceElasticityPlugin;
    self._section = section;
    self.populateProductDropdown();
    const sel = section.querySelector('#peProductSelect');
    if(sel) sel.addEventListener('change',()=>self.onProductSelect(sel.value));
  },

  unmount(ctx){
    if(this._chart){this._chart.destroy();this._chart=null;}
    if(this._demandChart){this._demandChart.destroy();this._demandChart=null;}
    if(this._section){this._section.remove();this._section=null;}
  },

  populateProductDropdown(){
    const sel=this._section?this._section.querySelector('#peProductSelect'):null;
    if(!sel) return;
    const products=window.HuntDrop.ALL_PRODUCTS||[];
    sel.innerHTML='<option value="">Select a product...</option>'+
      products.map(p=>`<option value="${p.id}">${p.title.split('—')[0].trim()}</option>`).join('');
  },

  onProductSelect(id){
    if(!id){this._selectedProduct=null;return;}
    const products=window.HuntDrop.ALL_PRODUCTS||[];
    this._selectedProduct=products.find(p=>p.id===parseInt(id));
    if(!this._selectedProduct) return;
    this.renderFull();
  },

  renderFull(){
    const p=this._selectedProduct;
    if(!p) return;
    const el=this._section?this._section.querySelector('#peResults'):null;
    if(!el) return;
    const prices=Object.values(p.platformPrices);
    const avgPrice=prices.reduce((a,b)=>a+b,0)/prices.length;
    const minSlider=Math.floor(Math.max(p.price*0.5,1)*100);
    const maxSlider=Math.ceil(p.price*2.5*100);
    const costPerUnit=p.price*(1-p.margin/100);

    const priceRanges=[
      {label:'Budget',mult:0.6,color:'var(--accent-red)'},
      {label:'Competitive',mult:0.85,color:'var(--accent-orange)'},
      {label:'Current',mult:1.0,color:'var(--accent-cyan)'},
      {label:'Premium',mult:1.2,color:'var(--accent-green)'},
      {label:'Luxury',mult:1.8,color:'var(--accent-purple)'}
    ];

    el.innerHTML=`
      <div class="pes-output">
        <div class="pes-product-header">
          <div class="pes-product-img"><img src="${p.image}" alt=""></div>
          <div class="pes-product-info">
            <h3 class="pes-product-title">${p.title}</h3>
            <div class="pes-product-meta">
              <span class="pes-badge pes-badge-score">Score ${p.score}</span>
              <span class="pes-badge pes-badge-margin">${p.margin}% margin</span>
              <span class="pes-badge pes-badge-cost">Cost $${costPerUnit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="pes-slider-card">
          <div class="pes-slider-top">
            <div class="pes-slider-title">Drag to Simulate Price Change</div>
            <div class="pes-slider-price" id="peCurrentPriceLabel">$${p.price.toFixed(2)}</div>
          </div>
          <div class="pes-slider-track">
            <input type="range" class="pes-price-slider" id="pePriceSlider" min="${minSlider}" max="${maxSlider}" value="${Math.round(p.price*100)}" step="1">
            <div class="pes-slider-range"><span>$${(p.price*0.5).toFixed(2)}</span><span>$${(p.price*2.5).toFixed(2)}</span></div>
          </div>
          <div class="pes-slider-bottom">
            <div class="pes-competitor-avg">Avg competitor: <strong>$${avgPrice.toFixed(2)}</strong></div>
            <button class="pes-match-btn" id="peMatchCompetitorBtn">Match Competitor Price</button>
          </div>
          <div class="pes-price-tiers">
            ${priceRanges.map(r=>{
              const tierPrice=p.price*r.mult;
              const tierDemand=Math.max(100,Math.round(p.salesVelocity*Math.pow(r.mult,p.competition==='high'?-2:p.competition==='medium'?-1.7:-1.5)));
              const tierProfit=(tierPrice-costPerUnit)*tierDemand;
              return `<div class="pes-tier" style="border-color:${r.color}33">
                <div class="pes-tier-label" style="color:${r.color}">${r.label}</div>
                <div class="pes-tier-price">$${tierPrice.toFixed(2)}</div>
                <div class="pes-tier-demand">${tierDemand.toLocaleString()} units</div>
                <div class="pes-tier-profit" style="color:${tierProfit>=0?'var(--accent-green)':'var(--accent-red)'}">$${tierProfit.toLocaleString(undefined,{maximumFractionDigits:0})}/mo</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="pes-metrics" id="peMetrics"></div>

        <div class="pes-charts-row">
          <div class="pes-chart-card">
            <h4 class="pes-chart-title">Revenue & Profit Curve</h4>
            <div class="pes-chart-wrap"><canvas id="peChart"></canvas></div>
          </div>
          <div class="pes-chart-card">
            <h4 class="pes-chart-title">Demand Curve</h4>
            <div class="pes-chart-wrap"><canvas id="peDemandChart"></canvas></div>
          </div>
        </div>

        <div id="peSweetSpot"></div>
        <div id="peStrategy"></div>
        <div id="peCompetitorOverlay"></div>
      </div>
      ${window.HuntDrop.renderRelatedTools([
        {section:'section-profit-lab',name:'Profit Calculator',desc:'Calculate margins',icon:'💰',color:'#00ff88'},
        {section:'section-time-machine',name:'Profit Time Machine',desc:'Forecast revenue',icon:'🔮',color:'#00e5ff'},
        {section:'section-bundles',name:'Bundle Intelligence',desc:'Optimize bundles',icon:'📦',color:'#a855f7'},
        {section:'section-battlefield',name:'Competitor Battlefield',desc:'See competitor pricing',icon:'⚔️',color:'#ff3366'}
      ])}`;

    const slider=el.querySelector('#pePriceSlider');
    if(slider) slider.addEventListener('input',()=>this.simulate());
    const matchBtn=el.querySelector('#peMatchCompetitorBtn');
    if(matchBtn) matchBtn.addEventListener('click',()=>this.matchCompetitor());
    this.simulate();
  },

  simulate(){
    const p=this._selectedProduct;
    if(!p) return;
    const section=this._section;
    const slider=section?section.querySelector('#pePriceSlider'):null;
    if(!slider) return;
    const newPrice=parseInt(slider.value)/100;
    const priceLabel=section?section.querySelector('#peCurrentPriceLabel'):null;
    if(priceLabel){priceLabel.textContent='$'+newPrice.toFixed(2);priceLabel.style.color=newPrice>=p.price?'var(--accent-green)':'var(--accent-red)';}

    const priceRatio=newPrice/p.price;
    const elasticity=-1.5-(p.competition==='high'?0.5:p.competition==='medium'?0.2:0);
    const demandChange=Math.pow(priceRatio,elasticity)-1;
    const newDemand=Math.max(100,Math.round(p.salesVelocity*(1+demandChange)));
    const revenueChange=((newPrice*newDemand)/(p.price*p.salesVelocity)-1);
    const costPerUnit=p.price*(1-p.margin/100);
    const oldProfit=(p.price-costPerUnit)*p.salesVelocity;
    const newProfit=(newPrice-costPerUnit)*newDemand;
    const profitChange=oldProfit>0?(newProfit/oldProfit-1):0;
    const newMargin=newPrice>0?((newPrice-costPerUnit)/newPrice*100):0;

    this.renderMetrics(newPrice,newDemand,demandChange,revenueChange,profitChange,newProfit,newMargin);
    this.renderChart(newPrice);
    this.renderDemandChart(newPrice);
    this.renderSweetSpot(p);
    this.renderStrategy(p,newPrice,newDemand,newProfit,costPerUnit);
    this.renderCompetitorOverlay(p,newPrice);
  },

  renderMetrics(price,demand,demandChg,revChg,profitChg,profit,margin){
    const el=this._section?this._section.querySelector('#peMetrics'):null;
    if(!el) return;
    const fmtChg=v=>{const pct=(v*100).toFixed(1);return v>=0?'+'+pct+'%':pct+'%'};
    const colorChg=v=>v>=0?'var(--accent-green)':'var(--accent-red)';
    const arrow=v=>v>=0?'↑':'↓';
    el.innerHTML=`
      <div class="pes-metric-card">
        <div class="pes-metric-icon pes-metric-cyan">📦</div>
        <div class="pes-metric-label">Demand</div>
        <div class="pes-metric-value">${demand.toLocaleString()}</div>
        <div class="pes-metric-sub">units/month</div>
        <div class="pes-metric-change" style="color:${colorChg(demandChg)}">${arrow(demandChg)} ${fmtChg(demandChg)}</div>
      </div>
      <div class="pes-metric-card">
        <div class="pes-metric-icon pes-metric-green">💰</div>
        <div class="pes-metric-label">Revenue</div>
        <div class="pes-metric-value" style="color:${colorChg(revChg)}">$${(price*demand).toLocaleString(undefined,{maximumFractionDigits:0})}</div>
        <div class="pes-metric-sub">per month</div>
        <div class="pes-metric-change" style="color:${colorChg(revChg)}">${arrow(revChg)} ${fmtChg(revChg)}</div>
      </div>
      <div class="pes-metric-card">
        <div class="pes-metric-icon pes-metric-green">📈</div>
        <div class="pes-metric-label">Profit</div>
        <div class="pes-metric-value" style="color:${colorChg(profitChg)}">$${profit.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
        <div class="pes-metric-sub">per month</div>
        <div class="pes-metric-change" style="color:${colorChg(profitChg)}">${arrow(profitChg)} ${fmtChg(profitChg)}</div>
      </div>
      <div class="pes-metric-card">
        <div class="pes-metric-icon pes-metric-purple">📊</div>
        <div class="pes-metric-label">Margin</div>
        <div class="pes-metric-value" style="color:${margin>=30?'var(--accent-green)':margin>=15?'var(--accent-yellow)':'var(--accent-red)'}">${margin.toFixed(1)}%</div>
        <div class="pes-metric-sub">at this price</div>
        <div class="pes-metric-change" style="color:var(--text-muted)">${margin>=30?'Healthy':'Needs attention'}</div>
      </div>`;
  },

  renderChart(newPrice){
    const canvas=this._section?this._section.querySelector('#peChart'):null;
    if(!canvas) return;
    if(this._chart) this._chart.destroy();
    const p=this._selectedProduct;
    const prices=[];const revenues=[];const profits=[];
    const costPerUnit=p.price*(1-p.margin/100);
    const elasticity=-1.5-(p.competition==='high'?0.5:p.competition==='medium'?0.2:0);
    for(let i=0;i<=20;i++){
      const pr=p.price*(0.5+i*0.1);
      const ratio=pr/p.price;
      const d=Math.max(100,Math.round(p.salesVelocity*Math.pow(ratio,elasticity)));
      prices.push('$'+pr.toFixed(0));
      revenues.push(Math.round(pr*d));
      profits.push(Math.round((pr-costPerUnit)*d));
    }
    this._chart=new Chart(canvas,{
      type:'line',
      data:{labels:prices,datasets:[
        {label:'Revenue',data:revenues,borderColor:'#00e5ff',backgroundColor:'rgba(0,229,255,0.08)',borderWidth:2,fill:true,tension:0.4,pointRadius:2,pointHoverRadius:5},
        {label:'Profit',data:profits,borderColor:'#00ff88',backgroundColor:'rgba(0,255,136,0.08)',borderWidth:2,fill:true,tension:0.4,pointRadius:2,pointHoverRadius:5}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#8888a4',font:{family:'Inter',size:11},usePointStyle:true,padding:16}}},scales:{x:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},maxRotation:45}},y:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},callback:v=>'$'+(v>=1000?(v/1000).toFixed(0)+'K':v)}}},interaction:{intersect:false,mode:'index'}}
    });
  },

  renderDemandChart(newPrice){
    const canvas=this._section?this._section.querySelector('#peDemandChart'):null;
    if(!canvas) return;
    if(this._demandChart) this._demandChart.destroy();
    const p=this._selectedProduct;
    const elasticity=-1.5-(p.competition==='high'?0.5:p.competition==='medium'?0.2:0);
    const prices=[];const demands=[];const colors=[];
    for(let i=0;i<=20;i++){
      const pr=p.price*(0.5+i*0.1);
      const ratio=pr/p.price;
      const d=Math.max(100,Math.round(p.salesVelocity*Math.pow(ratio,elasticity)));
      prices.push('$'+pr.toFixed(0));
      demands.push(d);
      colors.push(Math.abs(pr-newPrice)<p.price*0.05?'rgba(0,229,255,0.9)':'rgba(168,85,247,0.5)');
    }
    this._demandChart=new Chart(canvas,{
      type:'bar',
      data:{labels:prices,datasets:[{label:'Demand',data:demands,backgroundColor:colors,borderRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:8},maxRotation:45}},y:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9}}}}}
    });
  },

  renderSweetSpot(p){
    const el=this._section?this._section.querySelector('#peSweetSpot'):null;
    if(!el) return;
    const costPerUnit=p.price*(1-p.margin/100);
    let bestPrice=p.price;let bestProfit=0;let bestDemand=0;
    const elasticity=-1.5-(p.competition==='high'?0.5:p.competition==='medium'?0.2:0);
    for(let i=1;i<=50;i++){
      const pr=p.price*(0.5+i*0.04);
      const ratio=pr/p.price;
      const d=Math.max(100,Math.round(p.salesVelocity*Math.pow(ratio,elasticity)));
      const profit=(pr-costPerUnit)*d;
      if(profit>bestProfit){bestProfit=profit;bestPrice=pr;bestDemand=d;}
    }
    const baseProfit=(p.price-costPerUnit)*p.salesVelocity;
    const improvement=baseProfit>0?((bestProfit/baseProfit-1)*100).toFixed(0):0;
    const bestMargin=bestPrice>0?((bestPrice-costPerUnit)/bestPrice*100).toFixed(1):0;

    el.innerHTML=`
      <div class="pes-sweet-card">
        <div class="pes-sweet-left">
          <div class="pes-sweet-icon">🎯</div>
          <div>
            <div class="pes-sweet-label">Optimal Price Point</div>
            <div class="pes-sweet-price">$${bestPrice.toFixed(2)}</div>
          </div>
        </div>
        <div class="pes-sweet-stats">
          <div class="pes-sweet-stat"><div class="pes-sweet-stat-val" style="color:var(--accent-green)">$${bestProfit.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div class="pes-sweet-stat-label">Monthly Profit</div></div>
          <div class="pes-sweet-stat"><div class="pes-sweet-stat-val">${bestDemand.toLocaleString()}</div><div class="pes-sweet-stat-label">Monthly Sales</div></div>
          <div class="pes-sweet-stat"><div class="pes-sweet-stat-val">${bestMargin}%</div><div class="pes-sweet-stat-label">Profit Margin</div></div>
          <div class="pes-sweet-stat"><div class="pes-sweet-stat-val" style="color:var(--accent-green)">+${improvement}%</div><div class="pes-sweet-stat-label">vs Current</div></div>
        </div>
      </div>`;
  },

  renderStrategy(p,price,demand,profit,costPerUnit){
    const el=this._section?this._section.querySelector('#peStrategy'):null;
    if(!el) return;
    const margin=price>0?((price-costPerUnit)/price*100):0;
    const avgPrice=Object.values(p.platformPrices).reduce((a,b)=>a+b,0)/Object.values(p.platformPrices).length;
    const strategies=[];

    if(margin>=40) strategies.push({icon:'✅',title:'High-Margin Pricing',text:`Your ${margin.toFixed(1)}% margin is excellent. You have room to invest in ads and still stay profitable. Consider reinvesting 20-30% of margin into scaling.`});
    else if(margin>=20) strategies.push({icon:'⚠️',title:'Moderate Margin',text:`${margin.toFixed(1)}% margin is workable but tight. Focus on reducing ad costs or increasing perceived value to boost margin above 30%.`});
    else strategies.push({icon:'🚨',title:'Low Margin Warning',text:`${margin.toFixed(1)}% margin is dangerously low. One bad ad day could erase profits. Raise price or reduce costs immediately.`});

    if(price<avgPrice*0.8) strategies.push({icon:'💡',title:'Underpricing Detected',text:`You're priced ${((1-price/avgPrice)*100).toFixed(0)}% below average. Unless you're intentionally going for volume, you're leaving money on the table.`});
    else if(price>avgPrice*1.3) strategies.push({icon:'💡',title:'Premium Positioning',text:`You're priced ${((price/avgPrice-1)*100).toFixed(0)}% above average. Make sure your ad copy and product page justify the premium.`});

    if(p.competition==='high') strategies.push({icon:'⚔️',title:'High Competition Strategy',text:`In a crowded market, differentiate on brand/story/guarantee rather than price. Competing on price alone will destroy margins.`});

    strategies.push({icon:'📊',title:'Revenue Mix',text:`At $${price.toFixed(2)}, you earn $${(price-costPerUnit).toFixed(2)} profit per sale × ${demand.toLocaleString()} sales = $${profit.toLocaleString(undefined,{maximumFractionDigits:0})}/mo. To hit $10K/mo, you need ${Math.ceil(10000/(price-costPerUnit)).toLocaleString()} sales.`});

    el.innerHTML=`
      <div class="pes-strategy-card">
        <h4 class="pes-strategy-title">💡 Pricing Strategy Advice</h4>
        <div class="pes-strategy-grid">
          ${strategies.map(s=>`<div class="pes-strategy-item"><div class="pes-strategy-icon">${s.icon}</div><div class="pes-strategy-info"><div class="pes-strategy-item-title">${s.title}</div><div class="pes-strategy-text">${s.text}</div></div></div>`).join('')}
        </div>
      </div>`;
  },

  renderCompetitorOverlay(p,currentPrice){
    const el=this._section?this._section.querySelector('#peCompetitorOverlay'):null;
    if(!el) return;
    const prices=Object.entries(p.platformPrices).sort((a,b)=>a[1]-b[1]);
    const maxP=prices[prices.length-1][1];
    const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);

    el.innerHTML=`
      <div class="pes-comp-card">
        <h4 class="pes-comp-title">🗺️ Competitor Price Map</h4>
        <div class="pes-comp-list">
          ${prices.map(([pl,pr])=>{
            const pct=(pr/maxP)*100;
            const color=pr<currentPrice?'var(--accent-red)':pr>currentPrice?'var(--accent-green)':'var(--accent-cyan)';
            const diff=pr-currentPrice;
            const diffStr=diff>=0?'+$'+diff.toFixed(2):'-$'+Math.abs(diff).toFixed(2);
            return `<div class="pes-comp-row">
              <span class="pes-comp-name">${cap(pl)}</span>
              <div class="pes-comp-bar-wrap"><div class="pes-comp-bar" style="width:${pct}%;background:${color}"></div></div>
              <span class="pes-comp-price" style="color:${color}">$${pr.toFixed(2)}</span>
              <span class="pes-comp-diff" style="color:${diff>=0?'var(--accent-green)':'var(--accent-red)'}">${diffStr}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="pes-comp-legend">
          <span><span class="pes-dot" style="background:var(--accent-red)"></span>Below you</span>
          <span><span class="pes-dot" style="background:var(--accent-cyan)"></span>Your price</span>
          <span><span class="pes-dot" style="background:var(--accent-green)"></span>Above you</span>
        </div>
      </div>`;
  },

  matchCompetitor(){
    const p=this._selectedProduct;
    if(!p) return;
    const prices=Object.values(p.platformPrices).filter(pr=>pr>p.price);
    if(prices.length===0) return;
    const target=prices[0];
    const slider=this._section?this._section.querySelector('#pePriceSlider'):null;
    if(slider){slider.value=Math.round(target*100);this.simulate();}
    UI.toast('📊 Simulating competitor price: $'+target.toFixed(2),'info');
  }
};

PluginRegistry.register('price-elasticity',PriceElasticityPlugin);
})();
