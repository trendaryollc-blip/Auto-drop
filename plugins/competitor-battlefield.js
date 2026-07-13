// ============================================================================
// PLUGIN: Competitor Battlefield (Live Spy Dashboard)
// ============================================================================
// 10-section competitive intelligence hub: overview, leaderboard, live ads,
// price wars, new products, revenue intel, ad spend, SWOT, head-to-head, playbook.
// ============================================================================
(function(){
const {EventBus,PluginRegistry,DataLayer,UI,Config} = window.HuntDrop;
const esc = s => UI.escapeHtml(s);

const Competitors = [
  {id:'c1',name:'PetLover Store',platform:'Shopify',url:'petlover.myshopify.com',revenue:48200,traffic:32400,convRate:3.2,ads:23,products:156,lastActive:'2 min ago',avatar:'P',color:'var(--accent-green)',age:'14 months',theme:'Dawn',apps:['Klaviyo','Loox','DSers','Tidio'],pageSpeed:92,seoScore:88,bounceRate:34,sessionMin:4.2,social:{fb:12400,ig:28900,tk:45200},topCountries:['US','UK','CA'],cat:'Pet Supplies'},
  {id:'c2',name:'TechGadget Hub',platform:'Shopify',url:'techgadget.myshopify.com',revenue:32100,traffic:21800,convRate:2.9,ads:18,products:89,lastActive:'5 min ago',avatar:'T',color:'var(--accent-cyan)',age:'9 months',theme:'Refresh',apps:['Oberlo','Judge.me','PushOwl','ReConvert'],pageSpeed:78,seoScore:72,bounceRate:42,sessionMin:3.1,social:{fb:8200,ig:15600,tk:31400},topCountries:['US','DE','AU'],cat:'Tech Gadgets'},
  {id:'c3',name:'BeautyGlow',platform:'Shopify',url:'beautyglow.myshopify.com',revenue:28400,traffic:19200,convRate:3.5,ads:31,products:203,lastActive:'1 min ago',avatar:'B',color:'var(--accent-pink)',age:'18 months',theme:'Sense',apps:['Klaviyo','Yotpo','Stamped','Gorgias'],pageSpeed:85,seoScore:91,bounceRate:28,sessionMin:5.1,social:{fb:18700,ig:52300,tk:67800},topCountries:['US','FR','BR'],cat:'Beauty & Skincare'},
  {id:'c4',name:'FitGear Pro',platform:'Shopify',url:'fitgearpro.myshopify.com',revenue:19600,traffic:14100,convRate:2.7,ads:12,products:67,lastActive:'8 min ago',avatar:'F',color:'var(--accent-orange)',age:'6 months',theme:'Craft',apps:['Spocket','Vitals','Wishlist','HelpCenter'],pageSpeed:71,seoScore:65,bounceRate:48,sessionMin:2.4,social:{fb:4500,ig:9800,tk:18700},topCountries:['US','CA','UK'],cat:'Fitness'},
  {id:'c5',name:'HomeEssentials',platform:'WooCommerce',url:'homeessentials.com',revenue:22300,traffic:16500,convRate:2.4,ads:15,products:134,lastActive:'12 min ago',avatar:'H',color:'var(--accent-purple)',age:'22 months',theme:'Flavor',apps:['WooCommerce','Mailchimp','WooCommerce Stripe','MonsterInsights'],pageSpeed:64,seoScore:58,bounceRate:52,sessionMin:2.1,social:{fb:6200,ig:11400,tk:0},topCountries:['US','IN','PH'],cat:'Home & Kitchen'},
  {id:'c6',name:'Kawaii Decor Co',platform:'Shopify',url:'kawaiidecor.myshopify.com',revenue:15800,traffic:11200,convRate:3.1,ads:9,products:92,lastActive:'3 min ago',avatar:'K',color:'var(--accent-yellow)',age:'7 months',theme:'Flavor',apps:['Oberlo','Loox','Privy','Tidio'],pageSpeed:88,seoScore:82,bounceRate:31,sessionMin:4.5,social:{fb:3200,ig:21500,tk:38900},topCountries:['US','JP','KR'],cat:'Home Decor'},
  {id:'c7',name:'ChargeTech',platform:'Shopify',url:'chargetech.myshopify.com',revenue:27600,traffic:18900,convRate:2.8,ads:20,products:112,lastActive:'6 min ago',avatar:'C',color:'var(--accent-cyan)',age:'11 months',theme:'Dawn',apps:['DSers','AliReviews','SMSBump','Yotpo'],pageSpeed:80,seoScore:76,bounceRate:38,sessionMin:3.4,social:{fb:7800,ig:14200,tk:29100},topCountries:['US','UK','DE'],cat:'Phone Accessories'},
  {id:'c8',name:'EcoKitchen Pro',platform:'WooCommerce',url:'ecokitchenpro.com',revenue:18400,traffic:13200,convRate:2.6,ads:11,products:78,lastActive:'15 min ago',avatar:'E',color:'var(--accent-green)',age:'16 months',theme:'flavor',apps:['WooCommerce','MailPoet','WooCommerce UPS','Google Analytics'],pageSpeed:59,seoScore:52,bounceRate:55,sessionMin:1.9,social:{fb:5100,ig:8700,tk:0},topCountries:['US','CA','AU'],cat:'Eco Kitchen'},
  {id:'c9',name:'PostureTech',platform:'Shopify',url:'posturetech.myshopify.com',revenue:24100,traffic:17600,convRate:3.0,ads:16,products:45,lastActive:'4 min ago',avatar:'P',color:'var(--accent-red)',age:'8 months',theme:'Refresh',apps:['Spocket','Judge.me','ReConvert','Klaviyo'],pageSpeed:83,seoScore:79,bounceRate:36,sessionMin:3.8,social:{fb:6900,ig:16800,tk:42100},topCountries:['US','UK','AU'],cat:'Wellness'},
  {id:'c10',name:'StarLight Tech',platform:'Shopify',url:'starlighttech.myshopify.com',revenue:35200,traffic:24100,convRate:3.3,ads:27,products:134,lastActive:'1 min ago',avatar:'S',color:'var(--accent-purple)',age:'12 months',theme:'Dawn',apps:['Oberlo','Loox','PushOwl','Gorgias'],pageSpeed:90,seoScore:86,bounceRate:30,sessionMin:4.7,social:{fb:14500,ig:32100,tk:58700},topCountries:['US','DE','JP'],cat:'Tech Gadgets'}
];

const LiveAds = [
  {competitor:'PetLover Store',product:'GPS Pet Tracker',platform:'Facebook',hook:'Is your pet always running off?',ctr:3.8,spend:42,status:'running',age:'3 days',engagement:12.4,adCreative:'Video',targeting:'Interest: Dogs + Cats',estReach:28400},
  {competitor:'TechGadget Hub',product:'Wireless Earbuds Pro',platform:'TikTok',hook:'POV: you found earbuds that actually stay in',ctr:4.2,spend:67,status:'running',age:'1 day',engagement:18.7,adCreative:'UGC Video',targeting:'18-34 Tech Enthusiasts',estReach:42100},
  {competitor:'BeautyGlow',product:'Heated Hair Curler',platform:'Instagram',hook:'5 min salon blowout at home',ctr:3.1,spend:89,status:'running',age:'5 days',engagement:9.2,adCreative:'Carousel',targeting:'Women 20-40 Beauty',estReach:35600},
  {competitor:'FitGear Pro',product:'Posture Corrector',platform:'Facebook',hook:'Back pain ruined my life until this',ctr:2.9,spend:34,status:'running',age:'7 days',engagement:6.8,adCreative:'Image',targeting:'Office Workers 25-55',estReach:18200},
  {competitor:'StarLight Tech',product:'Galaxy Projector',platform:'TikTok',hook:'Turn your room into another dimension',ctr:5.1,spend:112,status:'scaling',age:'2 days',engagement:24.3,adCreative:'Video',targeting:'Gen Z Home Decor',estReach:67800},
  {competitor:'PostureTech',product:'Neck Massager',platform:'Facebook',hook:'The $29 device replacing $200 massages',ctr:3.6,spend:56,status:'running',age:'4 days',engagement:11.1,adCreative:'Video',targeting:'Pain Relief Seekers',estReach:31200},
  {competitor:'ChargeTech',product:'MagSafe Power Bank',platform:'Instagram',hook:'Never run out of battery again',ctr:2.7,spend:28,status:'testing',age:'1 day',engagement:7.9,adCreative:'Story',targeting:'iPhone Users 18-45',estReach:14800},
  {competitor:'Kawaii Decor Co',product:'LED Cloud Lamp',platform:'TikTok',hook:'My room went from basic to magical',ctr:4.8,spend:45,status:'running',age:'3 days',engagement:15.6,adCreative:'UGC Video',targeting:'Aesthetic Home 16-28',estReach:52400},
  {competitor:'PetLover Store',product:'Auto Pet Feeder',platform:'Facebook',hook:'Feed your pet from anywhere in the world',ctr:3.4,spend:38,status:'running',age:'6 days',engagement:10.2,adCreative:'Video',targeting:'Pet Owners Remote Workers',estReach:22100},
  {competitor:'BeautyGlow',product:'LED Face Mask',platform:'TikTok',hook:'Dermatologists hate this $30 secret',ctr:4.6,spend:72,status:'scaling',age:'3 days',engagement:21.4,adCreative:'Video',targeting:'Skincare Community',estReach:58900},
  {competitor:'StarLight Tech',product:'Levitating Speaker',platform:'Instagram',hook:'The speaker that floats itself',ctr:4.9,spend:95,status:'scaling',age:'2 days',engagement:22.8,adCreative:'Reel',targeting:'Music Lovers 18-35',estReach:51200},
  {competitor:'PostureTech',product:'Desk Posture Band',platform:'TikTok',hook:'Your desk job is destroying your back',ctr:3.9,spend:48,status:'running',age:'5 days',engagement:13.5,adCreative:'UGC Video',targeting:'Remote Workers 25-45',estReach:34600}
];

const PriceChanges = [
  {competitor:'StarLight Tech',product:'Galaxy Projector',oldPrice:49.99,newPrice:39.99,change:-20,time:'14 min ago',impact:'HIGH'},
  {competitor:'BeautyGlow',product:'LED Face Mask',oldPrice:34.99,newPrice:29.99,change:-14,time:'1 hour ago',impact:'MEDIUM'},
  {competitor:'FitGear Pro',product:'Yoga Mat Pro',oldPrice:24.99,newPrice:19.99,change:-20,time:'2 hours ago',impact:'HIGH'},
  {competitor:'PetLover Store',product:'Auto Pet Feeder',oldPrice:39.99,newPrice:44.99,change:12,time:'3 hours ago',impact:'LOW'},
  {competitor:'TechGadget Hub',product:'Mini Projector',oldPrice:59.99,newPrice:49.99,change:-17,time:'4 hours ago',impact:'MEDIUM'},
  {competitor:'PostureTech',product:'Desk Posture Band',oldPrice:19.99,newPrice:14.99,change:-25,time:'5 hours ago',impact:'HIGH'},
  {competitor:'ChargeTech',product:'MagSafe Power Bank',oldPrice:34.99,newPrice:29.99,change:-14,time:'6 hours ago',impact:'MEDIUM'},
  {competitor:'Kawaii Decor Co',product:'LED Cloud Lamp',oldPrice:29.99,newPrice:24.99,change:-17,time:'8 hours ago',impact:'HIGH'}
];

const NewProducts = [
  {competitor:'StarLight Tech',name:'Levitating Speaker',category:'Audio',price:79.99,score:94,time:'2 hours ago',trend:'rising',demandScore:92},
  {competitor:'BeautyGlow',name:'Smart Skincare Mirror',category:'Beauty Tech',price:59.99,score:91,time:'4 hours ago',trend:'rising',demandScore:88},
  {competitor:'PetLover Store',name:'Interactive Cat Laser',category:'Pet Gadgets',price:24.99,score:88,time:'6 hours ago',trend:'stable',demandScore:85},
  {competitor:'TechGadget Hub',name:'Holographic Phone Case',category:'Phone Accessories',price:19.99,score:86,time:'8 hours ago',trend:'rising',demandScore:79},
  {competitor:'PostureTech',name:'Vibration Reminder Band',category:'Wellness',price:34.99,score:92,time:'10 hours ago',trend:'rising',demandScore:90},
  {competitor:'ChargeTech',name:'Solar Power Bank 30W',category:'Charging',price:44.99,score:89,time:'12 hours ago',trend:'stable',demandScore:82}
];

const AdSpendIntel = [
  {competitor:'StarLight Tech',totalSpend:112,daily:112,weekly:784,monthly:3360,platforms:{facebook:28,tiktok:62,instagram:22},topAd:'Galaxy Projector',estROI:3.8},
  {competitor:'BeautyGlow',totalSpend:161,daily:161,weekly:1127,monthly:4830,platforms:{facebook:45,tiktok:38,instagram:78},topAd:'Heated Hair Curler',estROI:2.9},
  {competitor:'PetLover Store',totalSpend:80,daily:80,weekly:560,monthly:2400,platforms:{facebook:52,tiktok:0,instagram:28},topAd:'GPS Pet Tracker',estROI:4.2},
  {competitor:'TechGadget Hub',totalSpend:67,daily:67,weekly:469,monthly:2010,platforms:{facebook:0,tiktok:67,instagram:0},topAd:'Wireless Earbuds Pro',estROI:3.1},
  {competitor:'PostureTech',totalSpend:104,daily:104,weekly:728,monthly:3120,platforms:{facebook:56,tiktok:48,instagram:0},topAd:'Neck Massager',estROI:3.5},
  {competitor:'ChargeTech',totalSpend:28,daily:28,weekly:196,monthly:840,platforms:{facebook:0,tiktok:0,instagram:28},topAd:'MagSafe Power Bank',estROI:2.1},
  {competitor:'Kawaii Decor Co',totalSpend:45,daily:45,weekly:315,monthly:1350,platforms:{facebook:0,tiktok:45,instagram:0},topAd:'LED Cloud Lamp',estROI:4.5},
  {competitor:'FitGear Pro',totalSpend:34,daily:34,weekly:238,monthly:1020,platforms:{facebook:34,tiktok:0,instagram:0},topAd:'Posture Corrector',estROI:2.4}
];

const SWOTData = [
  {competitor:'PetLover Store',strengths:['Highest revenue ($48.2K/mo)','Strong organic traffic (32.4K)','Excellent page speed (92)','Massive TikTok following (45.2K)'],weaknesses:['Premium pricing vs competitors','Low product count (156)','Facebook-heavy ad spend'],opportunities:['Expand to TikTok ads','Add subscription model','Launch loyalty program'],threats:['BeautyGlow gaining fast','Price wars in pet niche','New pet stores launching']},
  {competitor:'BeautyGlow',strengths:['Highest conversion rate (3.5%)','Most products (203)','Strongest social presence (120K+)','Best session duration (5.1 min)'],weaknesses:['Second-highest ad spend','Heavy Instagram dependency','Low page speed vs leaders'],opportunities:['Expand to Amazon','Launch own product line','Influencer partnerships'],threats:['Market saturation in beauty','Copycat stores rising','Ad costs increasing']},
  {competitor:'StarLight Tech',strengths:['Second-highest revenue ($35.2K)','Best ad performance (5.1% CTR)','Fastest growing social (58.7K TK)','Strong page speed (90)'],weaknesses:['Limited product range','High ad spend per product','Platform dependency (Shopify only)'],opportunities:['Cross-sell accessories','Bundle deals','Enter new markets (EU, APAC)'],threats:['Tech gadget trend fading','Price competition intensifying','Supplier delays']},
  {competitor:'PetLover Store',strengths:['Highest revenue ($48.2K/mo)','Strong organic traffic (32.4K)','Excellent page speed (92)','Massive TikTok following (45.2K)'],weaknesses:['Premium pricing vs competitors','Low product count (156)','Facebook-heavy ad spend'],opportunities:['Expand to TikTok ads','Add subscription model','Launch loyalty program'],threats:['BeautyGlow gaining fast','Price wars in pet niche','New pet stores launching']},
  {competitor:'PostureTech',strengths:['Strong conversion (3.0%)','Best niche focus (45 products)','High engagement ads (13.5%)','Good page speed (83)'],weaknesses:['Smallest product catalog','No Instagram presence','Limited traffic sources'],opportunities:['Wellness market booming','Corporate B2B sales','Subscription model potential'],threats:['Copycat products flooding','Amazon competition','Market education needed']},
  {competitor:'ChargeTech',strengths:['Strong brand recognition','Good page speed (80)','Diversified product line','Moderate ad spend'],weaknesses:['Lowest conversion (2.8%)','Testing phase ads only','Lowest engagement (7.9%)'],opportunities:['MagSafe ecosystem growing','B2B corporate gifting','Accessory bundles'],threats:['Apple ecosystem changes','Cheap alternatives flooding','Low brand loyalty']}
];

const WeeklyRevenue = [
  {week:'Week 1',c1:42100,c2:28400,c3:25200,c7:24100,c10:31200},
  {week:'Week 2',c1:44800,c2:29900,c3:26800,c7:25600,c10:33100},
  {week:'Week 3',c1:46200,c2:31200,c3:27400,c7:26800,c10:34200},
  {week:'Week 4',c1:48200,c2:32100,c3:28400,c7:27600,c10:35200}
];

const PriceMatrix = [
  {product:'GPS Pet Tracker',PetLover:59.99,'TechGadget':null,BeautyGlow:null,'FitGear':null,'HomeEssentials':null,Kawaii:null,ChargeTech:null,EcoKitchen:null,PostureTech:null,StarLight:null},
  {product:'Wireless Earbuds',PetLover:null,'TechGadget':34.99,BeautyGlow:null,'FitGear':null,'HomeEssentials':null,Kawaii:null,ChargeTech:29.99,EcoKitchen:null,PostureTech:null,StarLight:32.99},
  {product:'LED Face Mask',PetLover:null,'TechGadget':null,BeautyGlow:29.99,'FitGear':null,'HomeEssentials':24.99,Kawaii:null,ChargeTech:null,EcoKitchen:null,PostureTech:null,StarLight:null},
  {product:'Galaxy Projector',PetLover:null,'TechGadget':49.99,BeautyGlow:null,'FitGear':null,'HomeEssentials':null,Kawaii:null,ChargeTech:null,EcoKitchen:null,PostureTech:null,StarLight:39.99},
  {product:'Posture Corrector',PetLover:null,'TechGadget':null,BeautyGlow:null,'FitGear':19.99,'HomeEssentials':null,Kawaii:null,ChargeTech:null,EcoKitchen:null,PostureTech:14.99,StarLight:null}
];

// ========================================================================
// DATA ACCESSOR LAYER — MockAPI with live data fallback
// ========================================================================
const IntelService = () => window.HuntDrop?.CBIntelligenceService || null;
const Mock = () => window.MockAPI || null;

const Data = {
  getCompetitors() {
    const svc = IntelService();
    if (svc && svc.isLive() && svc.getCachedData('competitors')) return svc.getCachedData('competitors');
    if (svc && svc.getCachedData('competitors_')) return svc.getCachedData('competitors_');
    var m = Mock();
    return m ? m.getCompetitors() : Competitors;
  },
  getLiveAds() {
    const svc = IntelService();
    if (svc && svc.isLive() && svc.getCachedData('liveAds')) return svc.getCachedData('liveAds');
    var m = Mock();
    return m ? m.getLiveAds() : LiveAds;
  },
  getPriceChanges() {
    const svc = IntelService();
    if (svc && svc.isLive() && svc.getCachedData('priceChanges')) return svc.getCachedData('priceChanges');
    var m = Mock();
    return m ? m.getPriceChanges() : PriceChanges;
  },
  getNewProducts() {
    const svc = IntelService();
    if (svc && svc.isLive() && svc.getCachedData('newProducts')) return svc.getCachedData('newProducts');
    return NewProducts;
  },
  getAdSpend() {
    const svc = IntelService();
    if (svc && svc.isLive() && svc.getCachedData('adSpend')) return svc.getCachedData('adSpend');
    var m = Mock();
    return m ? m.getAdSpend() : AdSpendIntel;
  },
  getSWOT() {
    const svc = IntelService();
    if (svc && svc.isLive() && svc.getCachedData('swot')) return svc.getCachedData('swot');
    return SWOTData;
  },
  isLiveData() {
    const svc = IntelService();
    return svc && svc.isLive();
  },
  getStatus() {
    const svc = IntelService();
    return svc ? svc.getStatus() : { status: 'demo', hasAI: false, hasSearch: false };
  }
};

function fmtMoney(n){return '$'+n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function fmtNum(n){return n>=1000?(n/1000).toFixed(1)+'K':n.toString();}

function renderCompetitorRow(c,i){
  const revPerDay = Math.round(c.revenue/30);
  return `<div class="cb-comp-row" data-id="${c.id}">
    <div class="cb-comp-rank">#${i+1}</div>
    <div class="cb-comp-avatar" style="background:${c.color}22;color:${c.color}">${esc(c.avatar)}</div>
    <div class="cb-comp-info">
      <div class="cb-comp-name">${esc(c.name)}</div>
      <div class="cb-comp-url">${esc(c.url)}</div>
    </div>
    <div class="cb-comp-stats">
      <div class="cb-comp-stat"><span class="cb-comp-stat-val" style="color:var(--accent-green)">${fmtMoney(c.revenue)}</span><span class="cb-comp-stat-lbl">Rev/mo</span></div>
      <div class="cb-comp-stat"><span class="cb-comp-stat-val">${fmtNum(c.traffic)}</span><span class="cb-comp-stat-lbl">Traffic</span></div>
      <div class="cb-comp-stat"><span class="cb-comp-stat-val">${c.convRate}%</span><span class="cb-comp-stat-lbl">Conv.</span></div>
      <div class="cb-comp-stat"><span class="cb-comp-stat-val">${c.ads}</span><span class="cb-comp-stat-lbl">Ads</span></div>
    </div>
    <div class="cb-comp-active"><span class="cb-comp-active-dot"></span>${c.lastActive}</div>
  </div>`;
}

function renderAdCard(a){
  const statusClass = a.status==='scaling'?'cb-ad-status-scaling':a.status==='testing'?'cb-ad-status-testing':'cb-ad-status-running';
  return `<div class="cb-ad-card" data-competitor="${a.competitor}" style="cursor:pointer">
    <div class="cb-ad-header">
      <span class="cb-ad-platform">${esc(a.platform)}</span>
      <span class="cb-ad-status ${statusClass}">${esc(a.status)}</span>
    </div>
    <div class="cb-ad-product">${esc(a.product)}</div>
    <div class="cb-ad-hook">"${esc(a.hook)}"</div>
    <div class="cb-ad-meta">
      <span>CTR: <strong>${a.ctr}%</strong></span>
      <span>$${a.spend}/day</span>
      <span>${a.age} old</span>
    </div>
    <div class="cb-ad-details">
      <span>Creative: ${esc(a.adCreative)}</span>
      <span>Reach: ${fmtNum(a.estReach)}</span>
    </div>
    <div class="cb-ad-engagement">Engagement: ${a.engagement}%</div>
    <div class="cb-ad-targeting">${esc(a.targeting)}</div>
  </div>`;
}

function renderPriceRow(p){
  const isDown = p.change < 0;
  return `<div class="cb-price-row" data-competitor="${esc(p.competitor)}" style="cursor:pointer">
    <div class="cb-price-comp">${esc(p.competitor)}</div>
    <div class="cb-price-product">${esc(p.product)}</div>
    <div class="cb-price-change">
      <span class="cb-price-old">$${p.oldPrice.toFixed(2)}</span>
      <span class="cb-price-arrow">${isDown?'↓':'↑'}</span>
      <span class="cb-price-new" style="color:${isDown?'var(--accent-green)':'var(--accent-red)'}">$${p.newPrice.toFixed(2)}</span>
      <span class="cb-price-pct" style="color:${isDown?'var(--accent-green)':'var(--accent-red)'}">${isDown?'':'+'}${p.change}%</span>
    </div>
    <div class="cb-price-impact cb-impact-${(p.impact||'').toLowerCase()}">${p.impact||''}</div>
    <div class="cb-price-time">${p.time}</div>
  </div>`;
}

function renderNewProductRow(np){
  return `<div class="cb-newprod-row" data-competitor="${np.competitor}" style="cursor:pointer">
    <div class="cb-newprod-comp">${np.competitor}</div>
    <div class="cb-newprod-info">
      <div class="cb-newprod-name">${np.name}</div>
      <div class="cb-newprod-cat">${np.category}</div>
    </div>
    <div class="cb-newprod-price">$${np.price.toFixed(2)}</div>
    <div class="cb-newprod-score"><span class="cb-newprod-score-val">${np.score}</span>/100</div>
    <div class="cb-newprod-trend cb-trend-${np.trend}">${np.trend==='rising'?'↑ Rising':'→ Stable'}</div>
    <div class="cb-newprod-demand">Demand: ${np.demandScore}/100</div>
    <div class="cb-newprod-time">${np.time}</div>
  </div>`;
}

function generateRevenueChart(sectionEl){
  var el = sectionEl ? sectionEl.querySelector('#cbRevenueChart') : document.getElementById('cbRevenueChart');
  if(!el || typeof Chart==='undefined') return;
  var existing = Chart.getChart(el); if(existing) existing.destroy();
  const comps = Data.getCompetitors();
  const labels = comps.map(c=>c.name.split(' ')[0]);
  const revenues = comps.map(c=>c.revenue);
  new Chart(el,{
    type:'bar',
    data:{labels,datasets:[{data:revenues,backgroundColor:comps.map(c=>c.color+'88'),borderColor:comps.map(c=>c.color),borderWidth:1,borderRadius:5}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{backgroundColor:'#111119',borderColor:'#2a2a3d',borderWidth:1,titleFont:{family:'Outfit',size:11},bodyFont:{family:'JetBrains Mono',size:12},padding:10,displayColors:false,callbacks:{label:ctx=>'$'+ctx.parsed.y.toLocaleString()+'/mo'}}},
      scales:{x:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9}}},y:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},callback:v=>'$'+fmtNum(v)}}}
    }
  });
}

function generateMarketShareChart(sectionEl){
  var el = sectionEl ? sectionEl.querySelector('#cbMarketShareChart') : document.getElementById('cbMarketShareChart');
  if(!el || typeof Chart==='undefined') return;
  var existing = Chart.getChart(el); if(existing) existing.destroy();
  const comps = Data.getCompetitors();
  const total = comps.reduce((a,c)=>a+c.revenue,0);
  new Chart(el,{
    type:'doughnut',
    data:{labels:comps.map(c=>c.name),datasets:[{data:comps.map(c=>c.revenue),backgroundColor:comps.map(c=>c.color+'88'),borderColor:comps.map(c=>c.color),borderWidth:2,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'right',labels:{color:'#aaa',font:{family:'JetBrains Mono',size:10},padding:8,usePointStyle:true,pointStyleWidth:8}},tooltip:{backgroundColor:'#111119',borderColor:'#2a2a3d',borderWidth:1, callbacks:{label:ctx=>{const pct=((ctx.parsed/total)*100).toFixed(1);return ctx.label+': $'+ctx.parsed.toLocaleString()+' ('+pct+'%)';}}}}}
  });
}

function generateAdSpendChart(sectionEl){
  var el = sectionEl ? sectionEl.querySelector('#cbAdSpendChart') : document.getElementById('cbAdSpendChart');
  if(!el || typeof Chart==='undefined') return;
  var existing = Chart.getChart(el); if(existing) existing.destroy();
  const spend = Data.getAdSpend();
  const sorted = [...spend].sort((a,b)=>(parseInt(b.totalSpend)||parseInt(b.daily)||0)-(parseInt(a.totalSpend)||parseInt(a.daily)||0));
  new Chart(el,{
    type:'bar',
    data:{labels:sorted.map(a=>a.competitor.split(' ')[0]),datasets:[
      {label:'Facebook',data:sorted.map(a=>a.platforms.facebook),backgroundColor:'#1877f288',borderColor:'#1877f2',borderWidth:1,borderRadius:3},
      {label:'TikTok',data:sorted.map(a=>a.platforms.tiktok),backgroundColor:'#00000088',borderColor:'#fff',borderWidth:1,borderRadius:3},
      {label:'Instagram',data:sorted.map(a=>a.platforms.instagram),backgroundColor:'#e6683c88',borderColor:'#e6683c',borderWidth:1,borderRadius:3}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#aaa',font:{family:'JetBrains Mono',size:10},usePointStyle:true}},tooltip:{backgroundColor:'#111119',borderColor:'#2a2a3d',borderWidth:1,callbacks:{label:ctx=>ctx.dataset.label+': $'+ctx.parsed.y+'/day'}}},scales:{x:{stacked:true,grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9}}},y:{stacked:true,grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},callback:v=>'$'+v}}}}
  });
}

function generateWeeklyTrendChart(sectionEl){
  var el = sectionEl ? sectionEl.querySelector('#cbWeeklyChart') : document.getElementById('cbWeeklyChart');
  if(!el || typeof Chart==='undefined') return;
  var existing = Chart.getChart(el); if(existing) existing.destroy();
  const comps = Data.getCompetitors();
  const top5 = comps.length >= 10 ? [comps[0],comps[1],comps[2],comps[6],comps[9]] : comps.slice(0,5);
  const keys = ['c1','c2','c3','c7','c10'];
  new Chart(el,{
    type:'line',
    data:{labels:WeeklyRevenue.map(w=>w.week),datasets:top5.map((c,i)=>({label:c.name,data:WeeklyRevenue.map(w=>w[keys[i]]),borderColor:c.color,backgroundColor:c.color+'22',tension:0.3,borderWidth:2,pointRadius:3,fill:false}))},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#aaa',font:{family:'JetBrains Mono',size:10},usePointStyle:true}},tooltip:{backgroundColor:'#111119',borderColor:'#2a2a3d',borderWidth:1,callbacks:{label:ctx=>ctx.dataset.label+': $'+ctx.parsed.y.toLocaleString()}}},scales:{x:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:10}}},y:{grid:{color:'rgba(255,255,255,0.025)'},ticks:{color:'#555570',font:{family:'JetBrains Mono',size:9},callback:v=>'$'+fmtNum(v)}}}}
  });
}

function showCompetitorProfile(comp){
  const existing = document.querySelector('.cb-profile-overlay');
  if(existing) existing.remove();
  const ads = Data.getLiveAds().filter(a=>a.competitor===comp.name);
  const prices = Data.getPriceChanges().filter(p=>p.competitor===comp.name);
  const products = Data.getNewProducts().filter(n=>n.competitor===comp.name);
  const spend = Data.getAdSpend().find(s=>s.competitor===comp.name);
  const swot = Data.getSWOT().find(s=>s.competitor===comp.name);

  const overlay = document.createElement('div');
  overlay.className = 'cb-profile-overlay';
  overlay.innerHTML = `<div class="cb-profile-panel">
    <div class="cb-profile-header">
      <button class="cb-profile-close">&times;</button>
      <div class="cb-profile-title-row">
        <div class="cb-profile-avatar" style="background:${comp.color}22;color:${comp.color}">${comp.avatar}</div>
        <div><div class="cb-profile-name">${esc(comp.name)}</div><div class="cb-profile-url">${esc(comp.url)}</div></div>
      </div>
      <div class="cb-profile-badges">
        <span class="cb-badge cb-badge-cat">${esc(comp.cat)}</span>
        <span class="cb-badge cb-badge-age">${esc(comp.age)}</span>
        <span class="cb-badge cb-badge-platform">${esc(comp.platform)}</span>
        <span class="cb-badge cb-badge-theme">${esc(comp.theme)}</span>
      </div>
    </div>
    <div class="cb-profile-stats">
      <div class="cb-profile-stat"><div class="cb-profile-stat-val" style="color:var(--accent-green)">${fmtMoney(comp.revenue)}</div><div class="cb-profile-stat-lbl">Revenue/mo</div></div>
      <div class="cb-profile-stat"><div class="cb-profile-stat-val">${fmtNum(comp.traffic)}</div><div class="cb-profile-stat-lbl">Traffic/mo</div></div>
      <div class="cb-profile-stat"><div class="cb-profile-stat-val">${comp.convRate}%</div><div class="cb-profile-stat-lbl">Conversion</div></div>
      <div class="cb-profile-stat"><div class="cb-profile-stat-val">${comp.products}</div><div class="cb-profile-stat-lbl">Products</div></div>
      <div class="cb-profile-stat"><div class="cb-profile-stat-val">${comp.ads}</div><div class="cb-profile-stat-lbl">Active Ads</div></div>
      <div class="cb-profile-stat"><div class="cb-profile-stat-val">${comp.pageSpeed}/100</div><div class="cb-profile-stat-lbl">Page Speed</div></div>
    </div>
    <div class="cb-profile-sections">
      <div class="cb-profile-section">
        <h4>Tech Stack</h4>
        <div class="cb-profile-apps">${comp.apps.map(a=>'<span class="cb-tech-app">'+esc(a)+'</span>').join('')}</div>
      </div>
      <div class="cb-profile-section">
        <h4>Performance Metrics</h4>
        <div class="cb-profile-perf">
          <div class="cb-profile-perf-row"><span>Page Speed</span><span class="cb-metric-bar-wrap"><span class="cb-metric-bar"><span class="cb-metric-bar-fill" style="width:${comp.pageSpeed}%;background:${comp.pageSpeed>80?'var(--accent-green)':comp.pageSpeed>60?'var(--accent-orange)':'var(--accent-red)'}"></span></span></span><span>${comp.pageSpeed}/100</span></div>
          <div class="cb-profile-perf-row"><span>SEO Score</span><span class="cb-metric-bar-wrap"><span class="cb-metric-bar"><span class="cb-metric-bar-fill" style="width:${comp.seoScore}%;background:${comp.seoScore>80?'var(--accent-green)':comp.seoScore>60?'var(--accent-orange)':'var(--accent-red)'}"></span></span></span><span>${comp.seoScore}/100</span></div>
          <div class="cb-profile-perf-row"><span>Bounce Rate</span><span class="cb-metric-bar-wrap"><span class="cb-metric-bar"><span class="cb-metric-bar-fill" style="width:${comp.bounceRate}%;background:${comp.bounceRate<35?'var(--accent-green)':comp.bounceRate<50?'var(--accent-orange)':'var(--accent-red)'}"></span></span></span><span>${comp.bounceRate}%</span></div>
          <div class="cb-profile-perf-row"><span>Session Duration</span><span class="cb-metric-bar-wrap"><span class="cb-metric-bar"><span class="cb-metric-bar-fill" style="width:${Math.min(comp.sessionMin*20,100)}%;background:var(--accent-cyan)"></span></span></span><span>${comp.sessionMin} min</span></div>
        </div>
      </div>
      ${ads.length?`<div class="cb-profile-section"><h4>Live Ads (${ads.length})</h4><div class="cb-profile-ads">${ads.map(a=>`<div class="cb-profile-ad"><span class="cb-profile-ad-platform">${esc(a.platform)}</span><span class="cb-profile-ad-hook">"${esc(a.hook)}"</span><span class="cb-profile-ad-ctr">${a.ctr}% CTR</span></div>`).join('')}</div></div>`:''}
      ${products.length?`<div class="cb-profile-section"><h4>Recent Products</h4><div class="cb-profile-newprods">${products.map(p=>`<div class="cb-profile-newprod"><span>${p.name}</span><span>$${p.price}</span><span>${p.score}/100</span></div>`).join('')}</div></div>`:''}
      ${prices.length?`<div class="cb-profile-section"><h4>Price Changes</h4><div class="cb-profile-prices">${prices.map(p=>`<div class="cb-profile-price"><span>${p.product}</span><span style="color:${p.change<0?'var(--accent-green)':'var(--accent-red)'}">${p.change>0?'+':''}${p.change}%</span></div>`).join('')}</div></div>`:''}
      ${spend?`<div class="cb-profile-section"><h4>Ad Spend</h4><div class="cb-profile-perf">
        <div class="cb-profile-perf-row"><span>Daily</span><span>$${spend.daily}/day</span></div>
        <div class="cb-profile-perf-row"><span>Weekly</span><span>$${spend.weekly.toLocaleString()}</span></div>
        <div class="cb-profile-perf-row"><span>Monthly</span><span>$${spend.monthly.toLocaleString()}</span></div>
        <div class="cb-profile-perf-row"><span>Est. ROI</span><span style="color:var(--accent-green)">${spend.estROI}x</span></div>
      </div></div>`:''}
      <div class="cb-profile-section">
        <h4>Social Following</h4>
        <div class="cb-profile-social">
          ${comp.social.fb?`<div class="cb-social-item"><span class="cb-social-icon fb">F</span><span class="cb-social-val">${fmtNum(comp.social.fb)}</span></div>`:''}
          ${comp.social.ig?`<div class="cb-social-item"><span class="cb-social-icon ig">I</span><span class="cb-social-val">${fmtNum(comp.social.ig)}</span></div>`:''}
          ${comp.social.tk?`<div class="cb-social-item"><span class="cb-social-icon tk">T</span><span class="cb-social-val">${fmtNum(comp.social.tk)}</span></div>`:''}
        </div>
      </div>
      ${swot?`<div class="cb-profile-section"><h4>SWOT Snapshot</h4><div class="cb-profile-swot-grid">
        <div class="cb-swot-card cb-swot-s"><div class="cb-swot-label">Strengths</div><ul>${swot.strengths.map(s=>'<li>'+s+'</li>').join('')}</ul></div>
        <div class="cb-swot-card cb-swot-w"><div class="cb-swot-label">Weaknesses</div><ul>${swot.weaknesses.map(s=>'<li>'+s+'</li>').join('')}</ul></div>
        <div class="cb-swot-card cb-swot-o"><div class="cb-swot-label">Opportunities</div><ul>${swot.opportunities.map(s=>'<li>'+s+'</li>').join('')}</ul></div>
        <div class="cb-swot-card cb-swot-t"><div class="cb-swot-label">Threats</div><ul>${swot.threats.map(s=>'<li>'+s+'</li>').join('')}</ul></div>
      </div></div>`:''}
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('.cb-profile-close').addEventListener('click',()=>overlay.remove());
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
}

const CompetitorBattlefieldPlugin = {
  id:'competitor-battlefield',
  name:'Rival Check',
  version:'2.0.0',
  description:'10-section competitive intelligence hub — spy on ads, prices, products, revenue, SWOT & more',
  dependencies:['search-engine'],

  init(ctx){Config.defaults('competitorBattlefield',{enabled:true});},

  mount(ctx){
    const container = UI.$('sections-container');
    if (!container) return;

    const section = document.createElement('section');
    section.className = 'section section-battlefield';
    section.id = 'section-battlefield';
    section.innerHTML = `
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">Competitor Battlefield</h2>
          <p class="section-desc">10-section competitive intelligence hub — spy on everything your rivals do</p>
        </div>
        <div id="cbResults"></div>
      </div>`;
    const relatedHtml = window.HuntDrop.renderRelatedTools ? window.HuntDrop.renderRelatedTools([
      {section:'section-market-gaps',name:'Market Gap Finder',desc:'Find gaps',icon:'🎯',color:'#a855f7'},
      {section:'section-lifecycle',name:'Product Lifecycle Radar',desc:'Track maturity',icon:'📈',color:'#00ff88'},
      {section:'section-ad-studio',name:'Ad Studio',desc:'Create competitive ads',icon:'🎨',color:'#ff8a00'},
      {section:'section-spy-center',name:'Spy Center',desc:'Monitor competitors',icon:'👁️',color:'#ff3366'},
      {section:'section-elasticity',name:'Price Elasticity',desc:'Optimize pricing',icon:'💰',color:'#00e5ff'}
    ]) : '';
    section.insertAdjacentHTML('beforeend', relatedHtml);
    container.appendChild(section);

    const self = CompetitorBattlefieldPlugin;
    self.section = section;
    self.render();
    self._liveInterval = setInterval(()=>self.updateLiveIndicator(),3000);

    // Attempt to fetch live data if AI keys available
    self._attemptLiveFetch();
  },

  async _attemptLiveFetch() {
    const svc = IntelService();
    if (!svc || !svc.getStatus().hasAI) {
      this._updateStatusIndicator('demo');
      return;
    }
    this._updateStatusIndicator('fetching');
    try {
      const result = await svc.fetchAllIntelligence('dropshipping');
      if (result.success) {
        this._updateStatusIndicator('live');
        this.render(); // Re-render with live data
      } else {
        this._updateStatusIndicator('demo');
      }
    } catch (e) {
      console.warn('CB live fetch failed:', e);
      this._updateStatusIndicator('demo');
    }
  },

  _updateStatusIndicator(status) {
    if (!this.section) return;
    const indicator = this.section.querySelector('#cbStatusIndicator');
    if (!indicator) return;
    const labels = {
      live: '<span class="cb-status-live"><span class="cb-status-dot cb-status-dot-live"></span>LIVE DATA</span>',
      fetching: '<span class="cb-status-fetching"><span class="cb-status-dot cb-status-dot-fetching"></span>FETCHING...</span>',
      demo: '<span class="cb-status-demo"><span class="cb-status-dot cb-status-dot-demo"></span>DEMO DATA</span>',
      error: '<span class="cb-status-error"><span class="cb-status-dot cb-status-dot-error"></span>ERROR</span>'
    };
    indicator.innerHTML = labels[status] || labels.demo;
  },

  unmount(ctx){
    if (this._liveInterval) clearInterval(this._liveInterval);
    const el = UI.$('section-battlefield');
    if (el) {
      el.querySelectorAll('canvas').forEach(function(c) {
        try { var inst = Chart.getChart(c); if (inst) inst.destroy(); } catch(e) {}
      });
      el.remove();
    }
  },

  render(){
    const el = this.section?.querySelector('#cbResults');
    if(!el) return;
    try{
    el.innerHTML = this.buildHTML();
    }catch(e){console.error('CB render error:',e);el.innerHTML='<p style="color:red;padding:20px">Render error — check console</p>';return;}

    const self = this;
    el.querySelectorAll('.cb-tab').forEach(tab=>{
      tab.addEventListener('click',()=>{
        el.querySelectorAll('.cb-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        const content = self.section.querySelector('#cbTabContent');
        if (!content) return;
        try{
        switch(tab.dataset.tab){
          case 'overview': content.innerHTML=self.renderOverview(); break;
          case 'leaderboard': content.innerHTML=self.renderLeaderboard(); break;
          case 'ads': content.innerHTML=self.renderAds(); break;
          case 'prices': content.innerHTML=self.renderPrices(); break;
          case 'products': content.innerHTML=self.renderNewProducts(); break;
          case 'revenue': content.innerHTML=self.renderRevenue(); setTimeout(()=>{generateRevenueChart(self.section);generateMarketShareChart(self.section);},100); break;
          case 'adspend': content.innerHTML=self.renderAdSpend(); setTimeout(()=>generateAdSpendChart(self.section),100); break;
          case 'swot': content.innerHTML=self.renderSWOT(); break;
          case 'headtohead': content.innerHTML=self.renderHeadToHead(); setTimeout(()=>self.bindH2H(),100); break;
          case 'playbook': content.innerHTML=self.renderPlaybook(); break;
        }
        self.attachRowClicks();
        }catch(e){console.error('CB tab error:',e);}
      });
    });

    const stealBtn = el.querySelector('#cbStealBtn');
    if(stealBtn) stealBtn.addEventListener('click',()=>this.renderPlaybookModal());

    const refreshBtn = el.querySelector('#cbRefreshBtn');
    if(refreshBtn) refreshBtn.addEventListener('click', async ()=>{
      refreshBtn.textContent = '⏳ Fetching...';
      refreshBtn.disabled = true;
      await this._attemptLiveFetch();
      refreshBtn.textContent = '🔄 Refresh';
      refreshBtn.disabled = false;
    });

    this.attachRowClicks();
    this._updateStatusIndicator(Data.isLiveData() ? 'live' : 'demo');
  },

  switchTab(tabName){
    if(!this.section) return;
    const tab = this.section.querySelector(`.cb-tab[data-tab="${tabName}"]`);
    if(tab) tab.click();
  },

  buildHTML(){
    const comps = Data.getCompetitors();
    const ads = Data.getLiveAds();
    const prices = Data.getPriceChanges();
    const prods = Data.getNewProducts();
    const isLive = Data.isLiveData();
    const statusLabel = isLive ? 'LIVE INTELLIGENCE' : 'DEMO DATA';
    const banner = `<div class="cb-live-banner"><span class="cb-live-dot"></span><span class="cb-live-text">${statusLabel} — Tracking ${comps.length} competitors • ${ads.length} active ads</span><div class="cb-banner-actions"><span id="cbStatusIndicator"></span><button class="cb-refresh-btn" id="cbRefreshBtn" title="Fetch live data">🔄 Refresh</button><button class="cb-steal-btn" id="cbStealBtn">⚡ Winning Playbook</button></div></div>`;
    const tabs = `<div class="cb-tabs"><button class="cb-tab active" data-tab="overview">Overview</button><button class="cb-tab" data-tab="leaderboard">Leaderboard</button><button class="cb-tab" data-tab="ads">Live Ads (${ads.length})</button><button class="cb-tab" data-tab="prices">Price Wars (${prices.length})</button><button class="cb-tab" data-tab="products">New Products (${prods.length})</button><button class="cb-tab" data-tab="revenue">Revenue Intel</button><button class="cb-tab" data-tab="adspend">Ad Spend</button><button class="cb-tab" data-tab="swot">SWOT Analysis</button><button class="cb-tab" data-tab="headtohead">Head-to-Head</button><button class="cb-tab" data-tab="playbook">Winning Playbook</button></div>`;
    const content = `<div class="cb-tab-content" id="cbTabContent">${this.renderOverview()}</div>`;
    return banner + tabs + content;
  },

  attachRowClicks(){
    if(!this.section) return;
    this.section.querySelectorAll('.cb-comp-row').forEach(row=>{
      row.style.cursor='pointer';
      row.addEventListener('click',()=>{
        const comp = Data.getCompetitors().find(c=>c.id===row.dataset.id);
        if(comp) showCompetitorProfile(comp);
      });
    });
    this.section.querySelectorAll('.cb-price-row').forEach(row=>{
      row.addEventListener('click',()=>{
        const comp = Data.getCompetitors().find(c=>c.name===row.dataset.competitor);
        if(comp) showCompetitorProfile(comp);
      });
    });
    this.section.querySelectorAll('.cb-newprod-row').forEach(row=>{
      row.addEventListener('click',()=>{
        const comp = Data.getCompetitors().find(c=>c.name===row.dataset.competitor);
        if(comp) showCompetitorProfile(comp);
      });
    });
    this.section.querySelectorAll('.cb-ad-card').forEach(row=>{
      row.addEventListener('click',()=>{
        const comp = Data.getCompetitors().find(c=>c.name===row.dataset.competitor);
        if(comp) showCompetitorProfile(comp);
      });
    });
    this.section.querySelectorAll('.cb-adspend-row').forEach(row=>{
      row.addEventListener('click',()=>{
        const comp = Data.getCompetitors().find(c=>c.name===row.dataset.competitor);
        if(comp) showCompetitorProfile(comp);
      });
    });
    this.section.querySelectorAll('.cb-swot-competitor').forEach(row=>{
      row.addEventListener('click',()=>{
        const comp = Data.getCompetitors().find(c=>c.name===row.dataset.competitor);
        if(comp) showCompetitorProfile(comp);
      });
    });
    this.section.querySelectorAll('.cb-ov-card').forEach(card=>{
      card.style.cursor='pointer';
      card.addEventListener('click',()=>{
        const label = card.querySelector('.cb-ov-label')?.textContent || '';
        if(label.includes('Price Drops')) this.switchTab('prices');
        else if(label.includes('New Products')) this.switchTab('products');
        else if(label.includes('Revenue')) this.switchTab('revenue');
        else if(label.includes('Ads Running') || label.includes('Ad CTR')) this.switchTab('ads');
        else if(label.includes('Competitors')) this.switchTab('leaderboard');
      });
    });
  },

  renderOverview(){
    const comps = Data.getCompetitors();
    const ads = Data.getLiveAds();
    const prices = Data.getPriceChanges();
    const prods = Data.getNewProducts();
    const totalRev = comps.reduce((a,c)=>a+c.revenue,0);
    const totalAds = ads.length;
    const priceDrops = prices.filter(p=>p.change<0).length;
    const avgConv = (comps.reduce((a,c)=>a+c.convRate,0)/comps.length).toFixed(1);
    return `
      <div class="cb-overview-grid">
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🏢</div><div class="cb-ov-label">Competitors Tracked</div><div class="cb-ov-value" style="color:var(--accent-cyan)">${comps.length}</div><div class="cb-ov-sub">Active monitoring</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">💰</div><div class="cb-ov-label">Combined Revenue</div><div class="cb-ov-value" style="color:var(--accent-green)">${fmtMoney(totalRev)}</div><div class="cb-ov-sub">Monthly estimate</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">📢</div><div class="cb-ov-label">Live Ads Running</div><div class="cb-ov-value" style="color:var(--accent-orange)">${totalAds}</div><div class="cb-ov-sub">Across all platforms</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-red-dim);color:var(--accent-red)">📉</div><div class="cb-ov-label">Price Drops Today</div><div class="cb-ov-value" style="color:var(--accent-red)">${priceDrops}</div><div class="cb-ov-sub">Competitive pressure</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:rgba(168,85,247,0.12);color:var(--accent-purple)">📊</div><div class="cb-ov-label">Avg Conversion</div><div class="cb-ov-value" style="color:var(--accent-purple)">${avgConv}%</div><div class="cb-ov-sub">Across competitors</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-pink-dim);color:var(--accent-pink)">🆕</div><div class="cb-ov-label">New Products Today</div><div class="cb-ov-value" style="color:var(--accent-pink)">${prods.length}</div><div class="cb-ov-sub">Just launched</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-yellow-dim);color:var(--accent-yellow)">🎯</div><div class="cb-ov-label">Top Ad CTR</div><div class="cb-ov-value" style="color:var(--accent-yellow)">${ads.length?Math.max(...ads.map(a=>parseFloat(a.ctr)||0)):0}%</div><div class="cb-ov-sub">${ads.length?[...ads].sort((a,b)=>parseFloat(b.ctr)-parseFloat(a.ctr))[0].competitor:'N/A'}</div></div>
        <div class="cb-ov-card"><div class="cb-ov-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">⚡</div><div class="cb-ov-label">Highest Revenue</div><div class="cb-ov-value" style="color:var(--accent-cyan)">${comps.length?fmtMoney(Math.max(...comps.map(c=>c.revenue))):'$0'}</div><div class="cb-ov-sub">${comps.length?[...comps].sort((a,b)=>b.revenue-a.revenue)[0].name:'N/A'}</div></div>
      </div>

      <div class="cb-section">
        <h3 class="cb-section-title">Top Competitors by Revenue</h3>
        <div class="cb-comp-list">${[...comps].sort((a,b)=>b.revenue-a.revenue).slice(0,5).map((c,i)=>renderCompetitorRow(c,i)).join('')}</div>
      </div>

      <div class="cb-overview-bottom-grid">
        <div class="cb-section">
          <h3 class="cb-section-title">Latest Price Changes</h3>
          <div class="cb-price-list">${prices.slice(0,3).map(p=>renderPriceRow(p)).join('')}</div>
        </div>
        <div class="cb-section">
          <h3 class="cb-section-title">New Products Just Launched</h3>
          <div class="cb-newprod-list">${prods.slice(0,3).map(np=>renderNewProductRow(np)).join('')}</div>
        </div>
      </div>
    `;
  },

  renderLeaderboard(){
    const comps = Data.getCompetitors();
    const sorted = [...comps].sort((a,b)=>b.revenue-a.revenue);
    return `
      <div class="cb-lb-controls">
        <input type="text" class="cb-lb-search" placeholder="Search competitors..." id="cbLbSearch">
        <select class="cb-lb-sort" id="cbLbSort">
          <option value="revenue">Sort: Revenue</option>
          <option value="traffic">Sort: Traffic</option>
          <option value="convRate">Sort: Conversion</option>
          <option value="ads">Sort: Active Ads</option>
          <option value="products">Sort: Products</option>
          <option value="pageSpeed">Sort: Page Speed</option>
        </select>
      </div>
      <div class="cb-lb-list" id="cbLbList">
        ${sorted.map((c,i)=>`<div class="cb-lb-row" data-id="${c.id}">
          <div class="cb-lb-rank">#${i+1}</div>
          <div class="cb-lb-avatar" style="background:${c.color}22;color:${c.color}">${c.avatar}</div>
          <div class="cb-lb-info">
            <div class="cb-lb-name">${c.name}</div>
            <div class="cb-lb-url">${c.url} • ${c.platform} • ${c.cat}</div>
          </div>
          <div class="cb-lb-metrics">
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.revenue/(sorted[0].revenue||1))*100}%;background:var(--accent-green)"></div></div><span class="cb-lb-metric-val" style="color:var(--accent-green)">${fmtMoney(c.revenue)}</span><span class="cb-lb-metric-lbl">Revenue</span></div>
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.traffic/(sorted[0].traffic||1))*100}%;background:var(--accent-cyan)"></div></div><span class="cb-lb-metric-val">${fmtNum(c.traffic)}</span><span class="cb-lb-metric-lbl">Traffic</span></div>
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.convRate/3.5)*100}%;background:var(--accent-purple)"></div></div><span class="cb-lb-metric-val">${c.convRate}%</span><span class="cb-lb-metric-lbl">Conv.</span></div>
            <div class="cb-lb-metric"><div class="cb-lb-metric-bar"><div class="cb-lb-metric-fill" style="width:${(c.pageSpeed/100)*100}%;background:var(--accent-orange)"></div></div><span class="cb-lb-metric-val">${c.pageSpeed}</span><span class="cb-lb-metric-lbl">Speed</span></div>
          </div>
          <div class="cb-lb-social">
            ${c.social.fb?`<span class="cb-social-icon-sm fb">F</span>${fmtNum(c.social.fb)}`:''}
            ${c.social.ig?`<span class="cb-social-icon-sm ig">I</span>${fmtNum(c.social.ig)}`:''}
            ${c.social.tk?`<span class="cb-social-icon-sm tk">T</span>${fmtNum(c.social.tk)}`:''}
          </div>
          <div class="cb-lb-active"><span class="cb-comp-active-dot"></span>${c.lastActive}</div>
        </div>`).join('')}
      </div>
    `;
  },

  renderAds(){
    const ads = Data.getLiveAds();
    const groups = {};
    ads.forEach(a=>{if(!groups[a.platform])groups[a.platform]=[];groups[a.platform].push(a);});
    return `
      <div class="cb-ads-summary">
        <div class="cb-ads-summary-card"><span class="cb-ads-summary-val" style="color:var(--accent-green)">${ads.length}</span><span class="cb-ads-summary-lbl">Total Ads</span></div>
        <div class="cb-ads-summary-card"><span class="cb-ads-summary-val" style="color:var(--accent-orange)">${ads.filter(a=>a.status==='scaling').length}</span><span class="cb-ads-summary-lbl">Scaling</span></div>
        <div class="cb-ads-summary-card"><span class="cb-ads-summary-val" style="color:var(--accent-cyan)">${(ads.reduce((a,b)=>a+parseInt(b.spend)||0,0))}</span><span class="cb-ads-summary-lbl">Total $/day</span></div>
        <div class="cb-ads-summary-card"><span class="cb-ads-summary-val" style="color:var(--accent-purple)">${ads.length?(ads.reduce((a,b)=>a+parseFloat(b.ctr)||0,0)/ads.length).toFixed(1):0}%</span><span class="cb-ads-summary-lbl">Avg CTR</span></div>
      </div>
      <div class="cb-ads-groups">
        ${Object.entries(groups).map(([platform,adList])=>`
          <div class="cb-ads-group">
            <h3 class="cb-ads-group-header">${platform} <span class="cb-ads-group-count">${adList.length} ads</span></h3>
            <div class="cb-ads-grid">${adList.map(a=>renderAdCard(a)).join('')}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderPrices(){
    const prices = Data.getPriceChanges();
    return `
      <div class="cb-prices-summary">
        <div class="cb-prices-summary-card"><span class="cb-prices-summary-val" style="color:var(--accent-red)">${prices.filter(p=>p.change<0).length}</span><span class="cb-prices-summary-lbl">Price Drops</span></div>
        <div class="cb-prices-summary-card"><span class="cb-prices-summary-val" style="color:var(--accent-green)">${prices.filter(p=>p.change>0).length}</span><span class="cb-prices-summary-lbl">Price Increases</span></div>
        <div class="cb-prices-summary-card"><span class="cb-prices-summary-val" style="color:var(--accent-orange)">${prices.filter(p=>p.impact==='HIGH').length}</span><span class="cb-prices-summary-lbl">High Impact</span></div>
        <div class="cb-prices-summary-card"><span class="cb-prices-summary-val">${prices.length?Math.round(prices.reduce((a,p)=>a+parseInt(p.change)||0,0)/prices.length):0}%</span><span class="cb-prices-summary-lbl">Avg Change</span></div>
      </div>
      <div class="cb-section">
        <h3 class="cb-section-title">All Price Changes</h3>
        <div class="cb-price-list-full">${prices.map(p=>renderPriceRow(p)).join('')}</div>
      </div>
    `;
  },

  renderNewProducts(){
    const prods = Data.getNewProducts();
    return `
      <div class="cb-newprod-summary">
        <div class="cb-newprod-summary-card"><span class="cb-newprod-summary-val">${prods.length}</span><span class="cb-newprod-summary-lbl">Products Launched</span></div>
        <div class="cb-newprod-summary-card"><span class="cb-newprod-summary-val" style="color:var(--accent-green)">${prods.filter(n=>n.trend==='rising').length}</span><span class="cb-newprod-summary-lbl">Trending Up</span></div>
        <div class="cb-newprod-summary-card"><span class="cb-newprod-summary-val" style="color:var(--accent-cyan)">${prods.length?Math.round(prods.reduce((a,n)=>a+parseInt(n.score)||0,0)/prods.length):0}</span><span class="cb-newprod-summary-lbl">Avg Score</span></div>
        <div class="cb-newprod-summary-card"><span class="cb-newprod-summary-val">$${prods.length?(prods.reduce((a,n)=>a+parseFloat(n.price)||0,0)/prods.length).toFixed(0):'0'}</span><span class="cb-newprod-summary-lbl">Avg Price</span></div>
      </div>
      <div class="cb-section">
        <h3 class="cb-section-title">All New Product Launches</h3>
        <div class="cb-newprod-list-full">${prods.map(np=>renderNewProductRow(np)).join('')}</div>
      </div>
    `;
  },

  renderRevenue(){
    const comps = Data.getCompetitors();
    return `
      <div class="cb-revenue-section">
        <h3 class="cb-section-title">Revenue Intelligence</h3>
        <p class="cb-revenue-desc">Estimated based on traffic volume, conversion rates, and average order values</p>
        <div class="cb-revenue-charts-grid">
          <div class="cb-chart-box"><h4>Revenue Comparison</h4><div class="cb-chart-container"><canvas id="cbRevenueChart"></canvas></div></div>
          <div class="cb-chart-box"><h4>Market Share</h4><div class="cb-chart-container"><canvas id="cbMarketShareChart"></canvas></div></div>
        </div>
        <div class="cb-revenue-table">
          <div class="cb-rev-header"><span>Store</span><span>Platform</span><span>Traffic</span><span>Conv.</span><span>AOV</span><span>Est. Revenue</span><span>Daily Rev</span></div>
          ${[...comps].sort((a,b)=>b.revenue-a.revenue).map(c=>{
            const aov = c.traffic && c.convRate ? (c.revenue / (c.traffic * c.convRate / 100)).toFixed(2) : '0';
            const daily = Math.round(c.revenue / 30);
            return `<div class="cb-rev-row"><span class="cb-rev-name">${c.name}</span><span>${c.platform}</span><span>${fmtNum(c.traffic||0)}</span><span>${c.convRate||0}%</span><span>$${aov}</span><span style="color:var(--accent-green)">${fmtMoney(c.revenue||0)}</span><span>${fmtMoney(daily)}</span></div>`;
          }).join('')}
        </div>
      </div>
    `;
  },

  renderAdSpend(){
    const spend = Data.getAdSpend();
    const totalDaily = spend.reduce((a,s)=>a+parseInt(s.totalSpend)||parseInt(s.daily)||0,0);
    const totalMonthly = spend.reduce((a,s)=>a+parseInt(s.monthly)||0,0);
    const avgROI = spend.length?(spend.reduce((a,s)=>a+parseFloat(s.estROI)||0,0)/spend.length).toFixed(1):'0';
    const topSpender = [...spend].sort((a,b)=>(parseInt(b.totalSpend)||parseInt(b.daily)||0)-(parseInt(a.totalSpend)||parseInt(a.daily)||0))[0];
    return `
      <div class="cb-adspend-summary">
        <div class="cb-adspend-card"><div class="cb-adspend-icon" style="background:var(--accent-orange-dim);color:var(--accent-orange)">💵</div><div class="cb-adspend-val">$${totalDaily}/day</div><div class="cb-adspend-lbl">Total Daily Spend</div></div>
        <div class="cb-adspend-card"><div class="cb-adspend-icon" style="background:var(--accent-green-dim);color:var(--accent-green)">📈</div><div class="cb-adspend-val">$${totalMonthly.toLocaleString()}/mo</div><div class="cb-adspend-lbl">Total Monthly Spend</div></div>
        <div class="cb-adspend-card"><div class="cb-adspend-icon" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">🎯</div><div class="cb-adspend-val">${avgROI}x</div><div class="cb-adspend-lbl">Average ROI</div></div>
        <div class="cb-adspend-card"><div class="cb-adspend-icon" style="background:var(--accent-red-dim);color:var(--accent-red)">🏆</div><div class="cb-adspend-val">${topSpender?(topSpender.competitor||'N/A').split(' ')[0]:'N/A'}</div><div class="cb-adspend-lbl">Biggest Spender</div></div>
      </div>
      <div class="cb-chart-box"><h4>Daily Ad Spend by Platform</h4><div class="cb-chart-container"><canvas id="cbAdSpendChart"></canvas></div></div>
      <div class="cb-section" style="margin-top:24px">
        <h3 class="cb-section-title">Ad Spend Breakdown</h3>
        <div class="cb-adspend-table">
          <div class="cb-adspend-header"><span>Store</span><span>Facebook</span><span>TikTok</span><span>Instagram</span><span>Daily</span><span>Monthly</span><span>ROI</span></div>
          ${[...spend].sort((a,b)=>(parseInt(b.totalSpend)||parseInt(b.daily)||0)-(parseInt(a.totalSpend)||parseInt(a.daily)||0)).map(s=>`
            <div class="cb-adspend-row" data-competitor="${s.competitor}" style="cursor:pointer">
              <span class="cb-adspend-name">${s.competitor}</span>
              <span>${s.platforms?.facebook?'$'+s.platforms.facebook:'—'}</span>
              <span>${s.platforms?.tiktok?'$'+s.platforms.tiktok:'—'}</span>
              <span>${s.platforms?.instagram?'$'+s.platforms.instagram:'—'}</span>
              <span style="color:var(--accent-orange)">$${s.daily||s.totalSpend||0}</span>
              <span>$${(s.monthly||0).toLocaleString()}</span>
              <span style="color:var(--accent-green)">${s.estROI||0}x</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderSWOT(){
    const swot = Data.getSWOT();
    return `
      <div class="cb-swot-intro">
        <h3 class="cb-section-title">SWOT Analysis — Top Competitors</h3>
        <p class="cb-swot-desc">Strengths, Weaknesses, Opportunities and Threats for each competitor</p>
      </div>
      <div class="cb-swot-grid">
        ${swot.map(s=>`
          <div class="cb-swot-competitor" data-competitor="${s.competitor}" style="cursor:pointer">
            <h4 class="cb-swot-comp-name">${s.competitor}</h4>
            <div class="cb-swot-cards">
              <div class="cb-swot-card cb-swot-s"><div class="cb-swot-label">💪 Strengths</div><ul>${(s.strengths||[]).map(x=>'<li>'+x+'</li>').join('')}</ul></div>
              <div class="cb-swot-card cb-swot-w"><div class="cb-swot-label">⚠️ Weaknesses</div><ul>${(s.weaknesses||[]).map(x=>'<li>'+x+'</li>').join('')}</ul></div>
              <div class="cb-swot-card cb-swot-o"><div class="cb-swot-label">🚀 Opportunities</div><ul>${(s.opportunities||[]).map(x=>'<li>'+x+'</li>').join('')}</ul></div>
              <div class="cb-swot-card cb-swot-t"><div class="cb-swot-label">🔥 Threats</div><ul>${(s.threats||[]).map(x=>'<li>'+x+'</li>').join('')}</ul></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderHeadToHead(){
    const comps = Data.getCompetitors();
    const sorted = [...comps].sort((a,b)=>b.revenue-a.revenue);
    return `
      <div class="cb-h2h-intro">
        <h3 class="cb-section-title">Head-to-Head Comparison</h3>
        <p class="cb-h2h-desc">Select two competitors to compare side-by-side</p>
        <div class="cb-h2h-selectors">
          <select class="cb-h2h-select" id="cbH2H1">
            ${sorted.map((c,i)=>`<option value="${c.id}" ${i===0?'selected':''}>${c.name}</option>`).join('')}
          </select>
          <span class="cb-h2h-vs">VS</span>
          <select class="cb-h2h-select" id="cbH2H2">
            ${sorted.map((c,i)=>`<option value="${c.id}" ${i===1?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="cb-h2h-result" id="cbH2HResult">${this.renderH2HResult(sorted[0],sorted[1])}</div>
    `;
  },

  renderH2HResult(a,b){
    const maxRev = Math.max(a.revenue, b.revenue) || 1;
    const maxTraffic = Math.max(a.traffic, b.traffic) || 1;
    const maxConv = Math.max(a.convRate, b.convRate) || 1;
    const maxAds = Math.max(a.ads, b.ads) || 1;
    const maxProducts = Math.max(a.products, b.products) || 1;
    const metrics = [
      {label:'Revenue/mo',aVal:fmtMoney(a.revenue),bVal:fmtMoney(b.revenue),aPct:(a.revenue/maxRev)*100,bPct:(b.revenue/maxRev)*100,color:'var(--accent-green)'},
      {label:'Traffic/mo',aVal:fmtNum(a.traffic),bVal:fmtNum(b.traffic),aPct:(a.traffic/maxTraffic)*100,bPct:(b.traffic/maxTraffic)*100,color:'var(--accent-cyan)'},
      {label:'Conversion',aVal:a.convRate+'%',bVal:b.convRate+'%',aPct:(a.convRate/maxConv)*100,bPct:(b.convRate/maxConv)*100,color:'var(--accent-purple)'},
      {label:'Active Ads',aVal:a.ads+'',bVal:b.ads+'',aPct:(a.ads/maxAds)*100,bPct:(b.ads/maxAds)*100,color:'var(--accent-orange)'},
      {label:'Products',aVal:a.products+'',bVal:b.products+'',aPct:(a.products/maxProducts)*100,bPct:(b.products/maxProducts)*100,color:'var(--accent-pink)'},
      {label:'Page Speed',aVal:a.pageSpeed+'/100',bVal:b.pageSpeed+'/100',aPct:a.pageSpeed,bPct:b.pageSpeed,color:'var(--accent-yellow)'},
      {label:'Bounce Rate',aVal:a.bounceRate+'%',bVal:b.bounceRate+'%',aPct:(1-a.bounceRate/100)*100,bPct:(1-b.bounceRate/100)*100,color:'var(--accent-red)'}
    ];
    return `
      <div class="cb-h2h-panels">
        <div class="cb-h2h-panel">
          <div class="cb-h2h-panel-avatar" style="background:${a.color}22;color:${a.color}">${a.avatar}</div>
          <div class="cb-h2h-panel-name">${a.name}</div>
          <div class="cb-h2h-panel-url">${a.url}</div>
        </div>
        <div class="cb-h2h-panel">
          <div class="cb-h2h-panel-avatar" style="background:${b.color}22;color:${b.color}">${b.avatar}</div>
          <div class="cb-h2h-panel-name">${b.name}</div>
          <div class="cb-h2h-panel-url">${b.url}</div>
        </div>
      </div>
      <div class="cb-h2h-metrics">
        ${metrics.map(m=>`
          <div class="cb-h2h-metric-row">
            <div class="cb-h2h-metric-left"><div class="cb-h2h-metric-bar-bg"><div class="cb-h2h-metric-bar-fill" style="width:${m.aPct}%;background:${m.color}"></div></div><span class="cb-h2h-metric-val">${m.aVal}</span></div>
            <div class="cb-h2h-metric-label">${m.label}</div>
            <div class="cb-h2h-metric-right"><div class="cb-h2h-metric-bar-bg"><div class="cb-h2h-metric-bar-fill" style="width:${m.bPct}%;background:${m.color}"></div></div><span class="cb-h2h-metric-val">${m.bVal}</span></div>
          </div>
        `).join('')}
      </div>
      <div class="cb-h2h-verdict">
        <div class="cb-h2h-winner">${a.name} wins ${metrics.filter(m=>a.revenue>=b.revenue?m.aPct>m.bPct:m.bPct>m.aPct).length} categories</div>
        <div class="cb-h2h-loser">${b.name} wins ${metrics.filter(m=>a.revenue>=b.revenue?m.bPct>m.aPct:m.aPct>m.bPct).length} categories</div>
      </div>
    `;
  },

  bindH2H(){
    const sel1 = this.section?.querySelector('#cbH2H1');
    const sel2 = this.section?.querySelector('#cbH2H2');
    const result = this.section?.querySelector('#cbH2HResult');
    if(!sel1||!sel2||!result) return;
    const self=this;
    function update(){
      const a=Data.getCompetitors().find(c=>c.id===sel1.value);
      const b=Data.getCompetitors().find(c=>c.id===sel2.value);
      if(a&&b) result.innerHTML=self.renderH2HResult(a,b);
    }
    sel1.addEventListener('change',update);
    sel2.addEventListener('change',update);
  },

  renderPlaybook(){
    const ads = Data.getLiveAds();
    const prods = Data.getNewProducts();
    const comps = Data.getCompetitors();
    const prices = Data.getPriceChanges();
    const spend = Data.getAdSpend();
    const topAd = ads.length?[...ads].sort((a,b)=>parseFloat(b.ctr||0)-parseFloat(a.ctr||0))[0]:null;
    const topProduct = prods.length?[...prods].sort((a,b)=>parseInt(b.score||0)-parseInt(a.score||0))[0]:null;
    const topCompetitor = comps.length?[...comps].sort((a,b)=>b.revenue-a.revenue)[0]:null;
    const priceWar = prices.filter(p=>p.change<0).length;
    const topSpender = spend.length?[...spend].sort((a,b)=>(parseInt(b.totalSpend)||parseInt(b.daily)||0)-(parseInt(a.totalSpend)||parseInt(a.daily)||0))[0]:null;

    return `
      <div class="cb-playbook-header">
        <h3 class="cb-section-title">⚡ Winning Playbook</h3>
        <p class="cb-playbook-desc">AI-generated actionable strategies based on live competitor intelligence</p>
      </div>

      <div class="cb-playbook-cards">
        <div class="cb-playbook-card cb-playbook-urgent">
          <div class="cb-playbook-card-header"><span class="cb-playbook-icon">🚨</span><h4>Immediate Actions (Next 24h)</h4></div>
          <div class="cb-playbook-list">
            <div class="cb-playbook-item"><span class="cb-playbook-num">1</span><div><strong>Match ${topAd?topAd.product:'top product'} ad creative</strong><br><span class="cb-playbook-detail">${topAd?`${topAd.competitor}'s "${topAd.hook}" is getting ${topAd.ctr}% CTR on ${topAd.platform}. Create a similar UGC video with your own angle. Budget: $${Math.round((parseInt(topAd.spend)||50)*0.7)}/day to start.`:'Analyze top-performing competitor ads and create similar creatives. Focus on UGC-style video content.'}</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">2</span><div><strong>Source ${topProduct?topProduct.name:'trending product'} immediately</strong><br><span class="cb-playbook-detail">${topProduct?`${topProduct.competitor} just launched this at $${topProduct.price}. Score: ${topProduct.score}/100. Price at $${(parseFloat(topProduct.price)*1.4).toFixed(2)} for 40% margin. First-mover advantage is NOW.`:'Identify trending products from competitors and source them quickly for first-mover advantage.'}</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">3</span><div><strong>Drop prices on key products</strong><br><span class="cb-playbook-detail">${priceWar} competitors dropped prices today. Match or beat the lowest prices to stay competitive.</span></div></div>
          </div>
        </div>

        <div class="cb-playbook-card cb-playbook-week">
          <div class="cb-playbook-card-header"><span class="cb-playbook-icon">📅</span><h4>This Week's Strategy</h4></div>
          <div class="cb-playbook-list">
            <div class="cb-playbook-item"><span class="cb-playbook-num">4</span><div><strong>Scale TikTok ad budget to $${topSpender?Math.round((parseInt(topSpender.totalSpend)||parseInt(topSpender.daily)||50)*1.2):60}/day</strong><br><span class="cb-playbook-detail">TikTok ads are outperforming Facebook 2:1 across all competitors. Shift 70% of budget to TikTok, 20% Instagram, 10% Facebook retargeting.</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">5</span><div><strong>Launch a product bundle deal</strong><br><span class="cb-playbook-detail">Combine your top 3 products into a "Starter Kit" at 20% discount. Competitors aren't doing this yet. Target AOV increase from $35 to $55.</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">6</span><div><strong>Optimize page speed to 90+</strong><br><span class="cb-playbook-detail">Top stores are crushing you on speed. Compress images, enable lazy loading, minimize CSS/JS. Every 1s delay = 7% conversion loss.</span></div></div>
          </div>
        </div>

        <div class="cb-playbook-card cb-playbook-long">
          <div class="cb-playbook-card-header"><span class="cb-playbook-icon">🎯</span><h4>30-Day Growth Plan</h4></div>
          <div class="cb-playbook-list">
            <div class="cb-playbook-item"><span class="cb-playbook-num">7</span><div><strong>Build email list to 5,000 subscribers</strong><br><span class="cb-playbook-detail">Email marketing drives 35% of revenue for top stores. Add pop-up with 10% discount, launch welcome series, set up abandoned cart flows. Target: $5K/mo email revenue.</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">8</span><div><strong>Launch on Amazon FBA</strong><br><span class="cb-playbook-detail">Your top 3 products are selling on Amazon for 30-50% more. List there with FBA for Prime badge. Target: $8K/mo Amazon revenue within 30 days.</span></div></div>
            <div class="cb-playbook-item"><span class="cb-playbook-num">9</span><div><strong>Start influencer seeding program</strong><br><span class="cb-playbook-detail">Send free products to 20 micro-influencers (10K-50K followers) in your niche. Cost: ~$500 in products. Expected return: 3-5x ROAS from UGC content.</span></div></div>
          </div>
        </div>
      </div>
    `;
  },

  renderPlaybookModal(){
    const ads = Data.getLiveAds();
    const prods = Data.getNewProducts();
    const comps = Data.getCompetitors();
    const topAd = ads.length?[...ads].sort((a,b)=>parseFloat(b.ctr||0)-parseFloat(a.ctr||0))[0]:null;
    const topProduct = prods.length?[...prods].sort((a,b)=>parseInt(b.score||0)-parseInt(a.score||0))[0]:null;
    const topCompetitor = comps.length?[...comps].sort((a,b)=>b.revenue-a.revenue)[0]:null;

    if(!topAd && !topProduct && !topCompetitor){
      UI.modal('<div class="cb-steal-modal"><h2>No Data Available</h2><p>Need competitor data to generate playbook. Configure AI API keys in Settings to fetch live data.</p></div>');
      return;
    }

    UI.modal(`
      <div class="cb-steal-modal">
        <h2>⚡ Winning Playbook</h2>
        <p class="cb-steal-sub">AI-generated blueprint based on live competitor intelligence</p>

        <div class="cb-steal-card">
          <h3>🎯 Best-Performing Ad to Replicate</h3>
          <div class="cb-steal-ad">
            <div class="cb-steal-ad-header"><span class="cb-steal-platform">${topAd?topAd.platform:'N/A'}</span><span class="cb-steal-ctr">CTR: ${topAd?topAd.ctr:0}%</span></div>
            <div class="cb-steal-ad-hook">"${topAd?topAd.hook:'Ad hook not available'}"</div>
            <div class="cb-steal-ad-product">${topAd?topAd.product:'Product'} by ${topAd?topAd.competitor:'Competitor'}</div>
            <div class="cb-steal-ad-spend">Spending: $${topAd?topAd.spend:0}/day | Age: ${topAd?topAd.age:'N/A'} | Reach: ${fmtNum(topAd?topAd.estReach:0)}</div>
          </div>
          <div class="cb-steal-ad-blueprint">
            <h4>Your Version:</h4>
            <div class="cb-steal-ad-copy"><strong>Hook:</strong> "Everyone's been asking about this ${topAd?topAd.product.toLowerCase():'product'} — here's why it's going viral..."</div>
            <div class="cb-steal-ad-copy"><strong>Body:</strong> Show product in use → highlight unique feature → social proof (${Math.floor(Math.random()*5000+2000)}+ reviews) → urgency ("50% OFF ends tonight")</div>
            <div class="cb-steal-ad-copy"><strong>CTA:</strong> "Link in bio — Limited stock!"</div>
          </div>
        </div>

        <div class="cb-steal-card">
          <h3>📦 Product to Launch</h3>
          <div class="cb-steal-product">
            <strong>${topProduct?topProduct.name:'Product'}</strong> — Score ${topProduct?topProduct.score:0}/100 — $${topProduct?topProduct.price.toFixed(2):'0.00'}
            <div class="cb-steal-product-comp">Launched by ${topProduct?topProduct.competitor:'Competitor'} ${topProduct?topProduct.time:''}</div>
          </div>
          <div class="cb-steal-recommendation">
            <strong>Recommendation:</strong> Source this product NOW before competitors scale. Target ${topProduct?topProduct.category.toLowerCase():'niche'} enthusiasts. Price at $${topProduct?(topProduct.price * 1.4).toFixed(2):'0.00'} for 40% margin. Launch with UGC-style TikTok ads.
          </div>
        </div>

        <div class="cb-steal-card">
          <h3>🏆 Market Position Summary</h3>
          <div class="cb-steal-position">
            <div><strong>Top Competitor:</strong> ${topCompetitor?topCompetitor.name:'N/A'}</div>
            <div><strong>Their Revenue:</strong> ${fmtMoney(topCompetitor?topCompetitor.revenue:0)}/mo</div>
            <div><strong>Their Traffic:</strong> ${fmtNum(topCompetitor?topCompetitor.traffic:0)} visitors</div>
            <div><strong>Their Conversion:</strong> ${topCompetitor?topCompetitor.convRate:0}%</div>
            <div><strong>Active Ads:</strong> ${topCompetitor?topCompetitor.ads:0} running</div>
          </div>
          <div class="cb-steal-action">
            <strong>Action Plan:</strong><br>
            1. Copy their best ad creative style (but make it unique)<br>
            2. Price 10-15% lower to undercut<br>
            3. Target the SAME audience but with better creative<br>
            4. Launch within 48 hours before they scale further<br>
            5. Monitor their price drops — adjust accordingly
          </div>
        </div>
      </div>
    `);
  },

  updateLiveIndicator(){
    const dot = this.section?.querySelector('.cb-live-dot');
    if(dot) dot.style.opacity = dot.style.opacity === '0.3' ? '1' : '0.3';
  }
};

PluginRegistry.register('competitor-battlefield', CompetitorBattlefieldPlugin);
})();
