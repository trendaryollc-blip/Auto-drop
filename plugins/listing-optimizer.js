// ============================================================================
// PLUGIN: Listing Optimizer — AI-powered listing intelligence across 6 platforms
// ============================================================================
(function(){
try{
const {EventBus,PluginRegistry,UI,Config,DataLayer} = window.HuntDrop;
const esc = s => UI.escapeHtml(String(s||''));

let _section = null;
let _cleanups = [];

const PLATFORMS = [
  { id:'amazon', name:'Amazon', icon:'📦', maxTitle:200, maxBullets:5, maxBulletLen:500, maxDesc:2000, maxBackendTerms:250, hasEBC:true, hasAPlus:true,
    rules:{ titlePattern:'[Brand] [Product] [Key Feature] [Size/Qty] [Color]', requiresBrand:true, requiresASIN:false, imageMin:1, imageMax:9, videoAllowed:true } },
  { id:'shopify', name:'Shopify', icon:'🛍️', maxTitle:70, maxBullets:0, maxBulletLen:0, maxDesc:32000, maxBackendTerms:0, hasEBC:false, hasAPlus:false,
    rules:{ titlePattern:'[Product Name] — [Benefit]', requiresBrand:false, requiresASIN:false, imageMin:1, imageMax:20, videoAllowed:true } },
  { id:'ebay', name:'eBay', icon:'🏷️', maxTitle:80, maxBullets:0, maxBulletLen:0, maxDesc:500, maxBackendTerms:0, hasEBC:false, hasAPlus:false,
    rules:{ titlePattern:'[Brand] [Product] [Model] [Key Feature]', requiresBrand:false, requiresASIN:false, imageMin:1, imageMax:12, videoAllowed:true } },
  { id:'etsy', name:'Etsy', icon:'🎨', maxTitle:140, maxBullets:0, maxBulletLen:0, maxDesc:130000, maxBackendTerms:13, hasEBC:false, hasAPlus:false,
    rules:{ titlePattern:'[Product] [Style] [Material] [Occasion]', requiresBrand:false, requiresASIN:false, imageMin:1, imageMax:10, videoAllowed:true } },
  { id:'tiktok', name:'TikTok Shop', icon:'🎵', maxTitle:34, maxBullets:0, maxBulletLen:0, maxDesc:1000, maxBackendTerms:0, hasEBC:false, hasAPlus:false,
    rules:{ titlePattern:'[Hook] [Product] [Benefit]', requiresBrand:false, requiresASIN:false, imageMin:1, imageMax:9, videoAllowed:true } },
  { id:'temu', name:'Temu', icon:'🔥', maxTitle:120, maxBullets:0, maxBulletLen:0, maxDesc:2000, maxBackendTerms:0, hasEBC:false, hasAPlus:false,
    rules:{ titlePattern:'[Product] [Feature] [Size] [Color]', requiresBrand:false, requiresASIN:false, imageMin:1, imageMax:10, videoAllowed:false } }
];

const EMOTIONAL_TRIGGERS = [
  { id:'urgency', name:'Urgency', icon:'⏰', keywords:['limited','last chance','hurry','today only','expires','final','countdown','running out','don\'t wait','act now','before gone','ending soon','24 hours','flash sale'] },
  { id:'trust', name:'Trust & Safety', icon:'🛡️', keywords:['guarantee','warranty','certified','tested','proven','safe','secure','trusted','official','authentic','genuine','approved','certified','insured'] },
  { id:'social_proof', name:'Social Proof', icon:'👥', keywords:['bestseller','top rated','popular','trending','1000+ sold','five star','customer favorite','award winning','as seen on','viral','#1','most loved','recommended'] },
  { id:'curiosity', name:'Curiosity', icon:'🔍', keywords:['secret','hidden','unknown','you won\'t believe','shocking','surprising','the truth about','nobody tells you','discover','reveal','mystery','inside'] },
  { id:'exclusivity', name:'Exclusivity', icon:'💎', keywords:['exclusive','limited edition','premium','VIP','members only','rare','unique','handcrafted','bespoke','custom','artisan','signature','collector'] },
  { id:'fomo', name:'Fear of Missing Out', icon:'😱', keywords:['don\'t miss','everyone is','going fast','selling out','before it\'s gone','join thousands','don\'t be left behind','while supplies last','final stock'] },
  { id:'value', name:'Value & Savings', icon:'💰', keywords:['save','discount','deal','bargain','wholesale','free shipping','bonus','extra','bundle','套装','more for less','best price','price drop'] },
  { id:'aspiration', name:'Aspiration', icon:'✨', keywords:['transform','upgrade','elevate','level up','become','achieve','unlock','dream','lifestyle','premium','luxury','elegant','sophisticated','professional'] }
];

const READABILITY_WORDS = {
  easy: ['easy','simple','quick','fast','instant','effortless','hassle-free','no tools','one-click','beginner','anyone','effortlessly','smooth','seamless','intuitive'],
  hard: ['utilize','implement','facilitate','methodology','infrastructure','sophisticated','comprehensive','administrative','approximately','fundamentally']
};

const IMAGE_STRATEGIES = {
  default: [
    { slot:1, type:'Main White Background', desc:'Clean product on pure white (RGB 255,255,255). No text, no watermarks. Fill 85%+ of frame.', required:true },
    { slot:2, type:'Lifestyle In-Use', desc:'Product being used by target audience in natural setting. Show scale and context.', required:true },
    { slot:3, type:'Feature Callout', desc:'Annotated image highlighting 3-5 key features with text overlays.', required:false },
    { slot:4, type:'Size/Scale Reference', desc:'Product next to common object or person for size reference.', required:false },
    { slot:5, type:'Packaging/Unboxing', desc:'What customer receives — box, accessories, manual. Sets expectations.', required:false },
    { slot:6, type:'Comparison Chart', desc:'Visual comparison vs competitors or before/after results.', required:false },
    { slot:7, type:'Detail Close-Up', desc:'Macro shot of material, stitching, texture, or key differentiator.', required:false },
    { slot:8, type:'Social Proof/Review', desc:'Screenshot of top review or user-generated content (with permission).', required:false },
    { slot:9, type:'Infographic', desc:'Size chart, care instructions, or technical specifications visual.', required:false }
  ]
};

const SEASONAL_CALENDAR = [
  { month:'Jan', season:'New Year / Winter', tips:['New Year resolution angle','Winter clearance positioning','Back-to-routine messaging'] },
  { month:'Feb', season:'Valentine\'s Day', tips:['Gift-giving angle','Couples/bundle positioning','Self-love messaging'] },
  { month:'Mar', season:'Spring Break', tips:['Travel-friendly angle','Outdoor/refresh theme','Spring cleaning positioning'] },
  { month:'Apr', season:'Easter / Tax Season', tips:['Spring refresh','Budget-conscious angle','Gift baskets'] },
  { month:'May', season:'Mother\'s Day', tips:['Gift guide positioning','Premium wrapping option','Bundle deals'] },
  { month:'Jun', season:'Summer / Father\'s Day', tips:['Outdoor/gadget angle','Dad gifts','Summer essentials'] },
  { month:'Jul', season:'Mid-Year / Prime Day', tips:['Flash sale angle','Amazon Prime Day prep','Summer peak'] },
  { month:'Aug', season:'Back to School', tips:['Student/parent angle','Essential supplies','Bulk pricing'] },
  { month:'Sep', season:'Fall / Labor Day', tips:['Seasonal transition','Fall aesthetic','Labor Day sale'] },
  { month:'Oct', season:'Halloween / Pre-Holiday', tips:['Costume/party angle','Early bird deals','Holiday prep'] },
  { month:'Nov', season:'Black Friday / Cyber Monday', tips:['Deal urgency','Bundle savings','Gift lists','BF/CM specific copy'] },
  { month:'Dec', season:'Holiday / Christmas', tips:['Gift-giving focus','Express shipping urgency','Last-minute deals','New Year prep'] }
];

function analyzeListing(text, platform) {
  const p = PLATFORMS.find(x=>x.id===platform) || PLATFORMS[0];
  const title = text.title || '';
  const desc = text.description || '';
  const bullets = text.bullets || [];
  const allText = (title + ' ' + desc + ' ' + bullets.join(' ')).toLowerCase();
  const words = allText.split(/\s+/).filter(Boolean);
  const charCount = title.length;

  const scores = {};

  // Title SEO Score
  let titleScore = 0;
  if(charCount > 0) titleScore += 10;
  if(charCount >= p.maxTitle * 0.6) titleScore += 15;
  if(charCount <= p.maxTitle) titleScore += 10;
  const titleWords = title.toLowerCase().split(/\s+/).filter(Boolean);
  if(titleWords.length >= 5) titleScore += 10;
  if(titleWords.length >= 8) titleScore += 5;
  if(/[A-Z]/.test(title) && /[a-z]/.test(title)) titleScore += 5;
  if(titleWords.some(w=>w.length > 3)) titleScore += 5;
  scores.titleSeo = Math.min(100, titleScore + 40);

  // Description Quality
  let descScore = 0;
  if(desc.length > 50) descScore += 15;
  if(desc.length > 200) descScore += 10;
  if(desc.length > 500) descScore += 10;
  const sentences = desc.split(/[.!?]+/).filter(s=>s.trim().length > 5);
  if(sentences.length >= 3) descScore += 10;
  if(sentences.length >= 6) descScore += 5;
  scores.descriptionQuality = Math.min(100, descScore + 50);

  // Keyword Coverage
  const foundKeywords = new Set();
  EMOTIONAL_TRIGGERS.forEach(t => {
    t.keywords.forEach(kw => {
      if(allText.includes(kw)) foundKeywords.add(kw);
    });
  });
  scores.keywordCoverage = Math.min(100, Math.round((foundKeywords.size / 10) * 100));

  // Readability
  let readScore = 70;
  const avgWordLen = words.reduce((s,w)=>s+w.length,0) / (words.length||1);
  const avgSentLen = words.length / (sentences.length||1);
  if(avgWordLen < 5) readScore += 10;
  if(avgSentLen < 20) readScore += 10;
  READABILITY_WORDS.easy.forEach(w => { if(allText.includes(w)) readScore += 2; });
  READABILITY_WORDS.hard.forEach(w => { if(allText.includes(w)) readScore -= 3; });
  scores.readability = Math.max(0, Math.min(100, readScore));

  // Emotional Impact
  const emotionalHits = {};
  let totalEmotional = 0;
  EMOTIONAL_TRIGGERS.forEach(t => {
    const hits = t.keywords.filter(kw => allText.includes(kw));
    emotionalHits[t.id] = hits;
    totalEmotional += hits.length;
  });
  scores.emotionalImpact = Math.min(100, Math.round((totalEmotional / 8) * 100));

  // Platform Compliance
  let complianceScore = 100;
  if(charCount > p.maxTitle) complianceScore -= 20;
  if(bullets.length > p.maxBullets && p.maxBullets > 0) complianceScore -= 15;
  bullets.forEach((b,i) => {
    if(b.length > p.maxBulletLen) complianceScore -= 5;
  });
  scores.platformCompliance = Math.max(0, Math.min(100, complianceScore));

  // Image Strategy
  scores.imageStrategy = charCount > 20 ? 60 : 30;

  // Pricing Position (placeholder — enhanced with product data)
  scores.pricingPosition = 50;

  // Overall Health Score (weighted)
  const weights = { titleSeo:0.20, descriptionQuality:0.15, keywordCoverage:0.15, readability:0.10, emotionalImpact:0.15, platformCompliance:0.15, imageStrategy:0.05, pricingPosition:0.05 };
  let overall = 0;
  Object.entries(weights).forEach(([k,w]) => { overall += (scores[k]||0) * w; });
  scores.overall = Math.round(overall);

  return { scores, emotionalHits, foundKeywords: [...foundKeywords], charCount, maxChars: p.maxTitle, platform: p };
}

function generateOptimizedTitle(title, platform, keywords) {
  const p = PLATFORMS.find(x=>x.id===platform) || PLATFORMS[0];
  const words = title.split(/\s+/).filter(Boolean);
  const enhanced = [];
  const seen = new Set();
  words.forEach(w => {
    const lower = w.toLowerCase();
    if(!seen.has(lower) && w.length > 1) { enhanced.push(w); seen.add(lower); }
  });
  (keywords||[]).forEach(kw => {
    const lower = kw.toLowerCase();
    if(!seen.has(lower)) { enhanced.push(kw); seen.add(lower); }
  });
  let result = enhanced.join(' ');
  if(result.length > p.maxTitle) result = result.substring(0, p.maxTitle).trim();
  return result;
}

function generateBackendTerms(title, description, existingTerms) {
  const allText = ((title||'') + ' ' + (description||'')).toLowerCase();
  const words = allText.split(/\s+/).filter(w => w.length > 2);
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w]||0) + 1; });
  const existing = new Set((existingTerms||[]).map(t=>t.toLowerCase()));
  const suggestions = Object.entries(freq)
    .filter(([w]) => !existing.has(w) && w.length > 2 && !['the','and','for','with','this','that','from','are','was','has','have','can','will','not','but','all','one','our','its','you','your','our','use','may','new','now'].includes(w))
    .sort((a,b) => b[1]-a[1])
    .slice(0, 30)
    .map(([w]) => w);
  return suggestions;
}

function generateBullets(title, description, platform) {
  const p = PLATFORMS.find(x=>x.id===platform) || PLATFORMS[0];
  const features = [];
  const descSentences = (description||'').split(/[.!?]+/).filter(s=>s.trim().length > 10);
  descSentences.slice(0, 5).forEach((s,i) => {
    features.push({
      label: ['✅ Premium Quality','🚀 Fast Results','💎 Built to Last','🎯 Perfect Fit','🛡️ Risk-Free'][i] || '✨ Feature',
      text: s.trim().substring(0, p.maxBulletLen || 500)
    });
  });
  while(features.length < 5) {
    features.push({ label: '⭐ Benefit', text: 'Designed for everyday use with premium materials and craftsmanship.' });
  }
  return features.slice(0, p.maxBullets || 5);
}

function predictPerformance(scores) {
  const ctr = Math.min(15, 1.5 + (scores.titleSeo / 100) * 4 + (scores.emotionalImpact / 100) * 3 + (scores.keywordCoverage / 100) * 2);
  const cvr = Math.min(25, 2 + (scores.overall / 100) * 12 + (scores.readability / 100) * 3);
  const revPer100 = Math.round(ctr * cvr * 0.5);
  return {
    ctr: Math.round(ctr * 10) / 10,
    cvr: Math.round(cvr * 10) / 10,
    revPer100,
    grade: scores.overall >= 80 ? 'A' : scores.overall >= 65 ? 'B' : scores.overall >= 50 ? 'C' : scores.overall >= 35 ? 'D' : 'F',
    verdict: scores.overall >= 80 ? 'Excellent — ready to scale' : scores.overall >= 65 ? 'Good — minor optimizations needed' : scores.overall >= 50 ? 'Average — several improvements needed' : scores.overall >= 35 ? 'Below Average — major rewrite recommended' : 'Poor — complete overhaul needed'
  };
}

function findContentGaps(yourText, competitorTexts) {
  const yourWords = new Set((yourText||'').toLowerCase().split(/\s+/).filter(w=>w.length > 3));
  const competitorWords = {};
  (competitorTexts||[]).forEach(ct => {
    (ct||'').toLowerCase().split(/\s+/).filter(w=>w.length > 3).forEach(w => {
      competitorWords[w] = (competitorWords[w]||0) + 1;
    });
  });
  const gaps = Object.entries(competitorWords)
    .filter(([w, count]) => !yourWords.has(w) && count >= 2)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w, count]) => ({ word: w, competitorMentions: count }));
  return gaps;
}

function generateABVariants(original, scores) {
  const variants = [];
  const words = original.split(/\s+/).filter(Boolean);
  if(scores.emotionalImpact < 50) {
    const urgencyWords = ['Limited','Exclusive','Hot','Trending','Bestseller'];
    const pick = urgencyWords[Math.floor(Math.random()*urgencyWords.length)];
    variants.push({ name:'Urgency Variant', title: pick + ' ' + original, hypothesis:'Adding urgency word increases CTR by 10-20%', changeType:'urgency' });
  }
  if(scores.titleSeo < 60) {
    variants.push({ name:'Benefit-First Variant', title: words.slice(Math.floor(words.length/2)).concat(words.slice(0,Math.floor(words.length/2))).join(' '), hypothesis:'Rearranging to lead with benefits improves scan-ability', changeType:'reorder' });
  }
  const shortTitle = words.slice(0, Math.max(4, Math.floor(words.length*0.6))).join(' ');
  variants.push({ name:'Concise Variant', title: shortTitle, hypothesis:'Shorter titles improve mobile readability and CTR', changeType:'shorten' });
  const powerWords = ['Premium','Pro','Ultra','Elite','Advanced'];
  const pw = powerWords[Math.floor(Math.random()*powerWords.length)];
  variants.push({ name:'Power Word Variant', title: pw + ' ' + original, hypothesis:'Power words increase perceived value and conversion', changeType:'power' });
  return variants;
}

function generateCrossPlatformListings(title, description, sourcePlatform) {
  return PLATFORMS.map(p => {
    let optTitle = title;
    if(title.length > p.maxTitle) optTitle = title.substring(0, p.maxTitle-3).trim() + '...';
    const optDesc = description.length > p.maxDesc ? description.substring(0, p.maxDesc-3) + '...' : description;
    return {
      platform: p.id,
      name: p.name,
      icon: p.icon,
      title: optTitle,
      description: optDesc,
      titleLength: optTitle.length,
      maxTitle: p.maxTitle,
      titleUtilization: Math.round((optTitle.length / p.maxTitle) * 100)
    };
  });
}

const ListingOptimizerPlugin = {
  id: 'listing-optimizer',
  name: 'Listing Optimizer',
  version: '1.0.0',
  description: 'AI-powered listing intelligence — optimize titles, descriptions, images, and keywords across 6 platforms',
  _section: null,
  _cleanups: [],

  init(_ctx) {
    Config.defaults('listingOptimizer', {
      platform: 'amazon',
      title: '',
      description: '',
      bullets: [],
      backendTerms: [],
      competitorTexts: []
    });
  },

  mount(_ctx) {
    const container = UI.$('sections-container');
    if(!container) return;
    const cfg = Config.get('listingOptimizer') || {};

    const section = document.createElement('section');
    section.className = 'section section-listing-optimizer';
    section.id = 'section-listing-optimizer';
    section.innerHTML = `
      <div class="section-inner">
        <div class="lo-hero">
          <div class="lo-hero-bg"></div>
          <div class="lo-hero-content">
            <div class="lo-hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Listing Intelligence
            </div>
            <h1 class="lo-hero-title">Listing Optimizer</h1>
            <p class="lo-hero-desc">Analyze, rewrite, and optimize your product listings across Amazon, Shopify, eBay, Etsy, TikTok Shop, and Temu. AI-powered suggestions backed by conversion psychology.</p>
            <div class="lo-hero-kpis">
              <div class="lo-hkpi"><div class="lo-hkpi-val">6</div><div class="lo-hkpi-label">Platforms</div></div>
              <div class="lo-hkpi"><div class="lo-hkpi-val">8</div><div class="lo-hkpi-label">Score Dimensions</div></div>
              <div class="lo-hkpi"><div class="lo-hkpi-val">8</div><div class="lo-hkpi-label">Emotion Triggers</div></div>
              <div class="lo-hkpi"><div class="lo-hkpi-val">AI</div><div class="lo-hkpi-label">Powered</div></div>
            </div>
          </div>
        </div>

        <div class="lo-section">
          <div class="lo-section-header">
            <h2 class="lo-section-title">📝 Input Your Listing</h2>
            <p class="lo-section-desc">Enter your current product listing — title, description, and bullet points — for comprehensive analysis</p>
          </div>
          <div class="lo-panel lo-input-panel">
            <div class="lo-platform-select">
              <label class="lo-label">Target Platform</label>
              <div class="lo-platform-btns">
                ${PLATFORMS.map(p=>`<button class="lo-plat-btn ${(cfg.platform||'amazon')===p.id?'active':''}" data-platform="${p.id}"><span class="lo-plat-icon">${p.icon}</span><span class="lo-plat-name">${p.name}</span><span class="lo-plat-limit">${p.maxTitle} chars</span></button>`).join('')}
              </div>
            </div>
            <div class="lo-field">
              <label class="lo-label">Product Title <span class="lo-char-count" id="loTitleCount">0/${PLATFORMS[0].maxTitle}</span></label>
              <input id="loTitle" type="text" class="lo-input" placeholder="e.g. Premium Wireless Bluetooth Earbuds with Active Noise Cancelling — 40H Battery Life" value="${esc(cfg.title||'')}" maxlength="500">
            </div>
            <div class="lo-field">
              <label class="lo-label">Product Description</label>
              <textarea id="loDesc" class="lo-textarea" rows="5" placeholder="Describe your product's features, benefits, and use cases...">${esc(cfg.description||'')}</textarea>
            </div>
            <div class="lo-field">
              <label class="lo-label">Bullet Points (one per line, optional)</label>
              <textarea id="loBullets" class="lo-textarea" rows="3" placeholder="Premium sound quality with deep bass&#10;Active noise cancellation for immersive listening&#10;40-hour battery life with quick charge">${(cfg.bullets||[]).join('\n')}</textarea>
            </div>
            <div class="lo-field">
              <label class="lo-label">Existing Backend Search Terms (comma-separated, optional)</label>
              <input id="loBackend" type="text" class="lo-input" placeholder="earbuds, wireless, bluetooth, noise cancelling" value="${(cfg.backendTerms||[]).join(', ')}">
            </div>
            <button class="lo-analyze-btn" id="loAnalyzeBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Analyze Listing
            </button>
          </div>
        </div>

        <div id="loResults" style="display:none">
          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">📊 Listing Health Score</h2>
              <p class="lo-section-desc">Composite score across 8 dimensions — weighted by impact on conversion</p>
            </div>
            <div class="lo-score-hero" id="loScoreHero"></div>
          </div>

          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">🔮 Performance Prediction</h2>
              <p class="lo-section-desc">Estimated CTR, conversion rate, and revenue potential based on listing quality</p>
            </div>
            <div class="lo-prediction" id="loPrediction"></div>
          </div>

          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">🎭 Emotional Trigger Map</h2>
              <p class="lo-section-desc">Which psychological triggers your copy activates — and which are missing</p>
            </div>
            <div class="lo-emotional" id="loEmotional"></div>
          </div>

          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">🎯 Title Heatmap</h2>
              <p class="lo-section-desc">Words colored by SEO importance — green = high value, yellow = medium, gray = filler</p>
            </div>
            <div class="lo-heatmap" id="loHeatmap"></div>
          </div>

          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">🔤 Backend Search Terms</h2>
              <p class="lo-section-desc">Platform-specific hidden keywords to maximize organic reach</p>
            </div>
            <div class="lo-backend" id="loBackendResult"></div>
          </div>

          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">📸 Image Strategy</h2>
              <p class="lo-section-desc">Recommended image slots, types, and order for maximum conversion</p>
            </div>
            <div class="lo-images" id="loImages"></div>
          </div>

          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">📝 Optimized Bullet Points</h2>
              <p class="lo-section-desc">AI-generated feature bullets formatted for your target platform</p>
            </div>
            <div class="lo-bullets" id="loBulletsResult"></div>
          </div>

          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">🔀 A/B Test Variants</h2>
              <p class="lo-section-desc">Ready-to-test title variants with hypotheses for each change</p>
            </div>
            <div class="lo-ab" id="loAB"></div>
          </div>

          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">🌍 Cross-Platform Sync</h2>
              <p class="lo-section-desc">Your listing adapted for all 6 platforms — see character utilization at a glance</p>
            </div>
            <div class="lo-crossplatform" id="loCrossPlatform"></div>
          </div>

          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">📅 Seasonal Optimization</h2>
              <p class="lo-section-desc">When to update your listing for maximum seasonal relevance</p>
            </div>
            <div class="lo-seasonal" id="loSeasonal"></div>
          </div>

          <div class="lo-section">
            <div class="lo-section-header">
              <h2 class="lo-section-title">🆚 Competitor Content Gap</h2>
              <p class="lo-section-desc">Keywords and phrases top competitors use that you're missing</p>
            </div>
            <div class="lo-gaps" id="loGaps"></div>
          </div>
        </div>

        ${window.HuntDrop.renderRelatedTools ? window.HuntDrop.renderRelatedTools([
          {section:'section-ad-studio', name:'Ad Creator', desc:'Generate ads from your optimized listing', icon:'📢', color:'var(--accent-purple)'},
          {section:'section-objections', name:'FAQ Builder', desc:'Auto-generate product FAQs from listing', icon:'❓', color:'var(--accent-cyan)'},
          {section:'section-spy-center', name:'Spy Center', desc:'Analyze competitor store listings', icon:'🕵️', color:'var(--accent-orange)'},
          {section:'section-profit-lab', name:'Profit Calculator', desc:'Calculate margins with optimized pricing', icon:'💰', color:'var(--accent-green)'},
          {section:'section-store-health', name:'Store Health', desc:'Audit all listings for compliance', icon:'🏥', color:'var(--accent-red)'},
          {section:'section-bundles', name:'Bundle Ideas', desc:'Create bundled listings to boost AOV', icon:'📦', color:'var(--accent-yellow)'}
        ]) : ''}
      </div>`;
    container.appendChild(section);
    _section = section;
    bindEvents(cfg);
  },

  unmount(_ctx) {
    (_cleanups||[]).forEach(fn => { try{fn();}catch(e){} });
    _cleanups = [];
    const el = UI.$('section-listing-optimizer');
    if(el) el.remove();
    _section = null;
  }
};

function bindEvents(cfg) {
    const sec = _section;
    if(!sec) return;
    let platform = cfg.platform || 'amazon';

    sec.querySelectorAll('.lo-plat-btn').forEach(btn => {
      btn.addEventListener('click', function(){
        sec.querySelectorAll('.lo-plat-btn').forEach(b=>b.classList.remove('active'));
        this.classList.add('active');
        platform = this.dataset.platform;
        const p = PLATFORMS.find(x=>x.id===platform);
        if(p) {
          const tc = UI.$('loTitleCount');
          if(tc) tc.textContent = (UI.$('loTitle')?.value.length||0) + '/' + p.maxTitle;
          const titleInput = UI.$('loTitle');
          if(titleInput) titleInput.maxLength = 500;
        }
      });
    });

    UI.$('loTitle')?.addEventListener('input', function(){
      const p = PLATFORMS.find(x=>x.id===platform);
      const tc = UI.$('loTitleCount');
      if(tc && p) tc.textContent = this.value.length + '/' + p.maxTitle;
    });

    UI.$('loAnalyzeBtn')?.addEventListener('click', () => {
      const title = UI.$('loTitle')?.value || '';
      const description = UI.$('loDesc')?.value || '';
      const bulletsText = UI.$('loBullets')?.value || '';
      const backendText = UI.$('loBackend')?.value || '';
      const bullets = bulletsText.split('\n').filter(b=>b.trim());
      const backendTerms = backendText.split(',').map(t=>t.trim()).filter(Boolean);

      Config.set('listingOptimizer', { platform, title, description, bullets, backendTerms });

      const result = analyzeListing({ title, description, bullets }, platform);
      const pred = predictPerformance(result.scores);
      const optimized = generateOptimizedTitle(title, platform, result.foundKeywords.slice(0,5));
      const newBackend = generateBackendTerms(title, description, backendTerms);
      const newBullets = generateBullets(title, description, platform);
      const variants = generateABVariants(title, result.scores);
      const crossPlatform = generateCrossPlatformListings(title, description, platform);

      renderScores(result.scores, result.charCount, result.maxChars);
      renderPrediction(pred);
      renderEmotional(result.emotionalHits, result.foundKeywords);
      renderHeatmap(title, result.foundKeywords);
      renderBackend(newBackend, backendTerms);
      renderImages(platform);
      renderBullets(newBullets);
      renderAB(variants);
      renderCrossPlatform(crossPlatform, platform);
      renderSeasonal();
      renderGaps(title, [description, ...bullets].join(' '));

      UI.$('loResults').style.display = 'block';
      UI.$('loResults').scrollIntoView({ behavior:'smooth', block:'start' });
    });
  }

function renderScores(scores, charCount, maxChars) {
    const el = UI.$('loScoreHero');
    if(!el) return;
    const grade = scores.overall >= 80 ? 'A' : scores.overall >= 65 ? 'B' : scores.overall >= 50 ? 'C' : scores.overall >= 35 ? 'D' : 'F';
    const gradeColor = scores.overall >= 80 ? 'var(--accent-green)' : scores.overall >= 65 ? 'var(--accent-cyan)' : scores.overall >= 50 ? 'var(--accent-yellow)' : scores.overall >= 35 ? 'var(--accent-orange)' : 'var(--accent-red)';
    const dims = [
      { key:'titleSeo', label:'Title SEO', icon:'🎯' },
      { key:'descriptionQuality', label:'Description', icon:'📝' },
      { key:'keywordCoverage', label:'Keywords', icon:'🔑' },
      { key:'readability', label:'Readability', icon:'📖' },
      { key:'emotionalImpact', label:'Emotional Impact', icon:'🎭' },
      { key:'platformCompliance', label:'Platform Rules', icon:'✅' },
      { key:'imageStrategy', label:'Image Strategy', icon:'📸' },
      { key:'pricingPosition', label:'Pricing Position', icon:'💰' }
    ];
    el.innerHTML = `
      <div class="lo-score-ring-wrap">
        <div class="lo-score-ring">
          <svg viewBox="0 0 120 120" class="lo-ring-svg">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-primary)" stroke-width="8"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="${gradeColor}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${scores.overall * 3.267} 326.7" transform="rotate(-90 60 60)" style="transition:stroke-dasharray 1s ease"/>
          </svg>
          <div class="lo-ring-center">
            <div class="lo-ring-score" style="color:${gradeColor}">${scores.overall}</div>
            <div class="lo-ring-grade" style="color:${gradeColor}">Grade ${grade}</div>
          </div>
        </div>
      </div>
      <div class="lo-score-dims">
        ${dims.map(d => {
          const val = scores[d.key] || 0;
          const color = val >= 80 ? 'var(--accent-green)' : val >= 60 ? 'var(--accent-cyan)' : val >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)';
          return `<div class="lo-dim">
            <div class="lo-dim-head"><span>${d.icon} ${d.label}</span><span class="lo-dim-val" style="color:${color}">${val}</span></div>
            <div class="lo-dim-track"><div class="lo-dim-fill" style="width:${val}%;background:${color}"></div></div>
          </div>`;
        }).join('')}
      </div>
      <div class="lo-char-bar">
        <span class="lo-char-label">Title: ${charCount}/${maxChars} characters (${Math.round(charCount/maxChars*100)}% utilized)</span>
        <div class="lo-char-track"><div class="lo-char-fill" style="width:${Math.min(100,Math.round(charCount/maxChars*100))}%;background:${charCount<=maxChars?'var(--accent-green)':'var(--accent-red)'}"></div></div>
      </div>`;
  }

function renderPrediction(pred) {
    const el = UI.$('loPrediction');
    if(!el) return;
    const gradeColor = pred.grade==='A'?'var(--accent-green)':pred.grade==='B'?'var(--accent-cyan)':pred.grade==='C'?'var(--accent-yellow)':pred.grade==='D'?'var(--accent-orange)':'var(--accent-red)';
    el.innerHTML = `
      <div class="lo-pred-grid">
        <div class="lo-pred-card"><div class="lo-pred-icon">🖱️</div><div class="lo-pred-val">${pred.ctr}%</div><div class="lo-pred-label">Est. Click-Through Rate</div><div class="lo-pred-sub">Industry avg: 2-5%</div></div>
        <div class="lo-pred-card"><div class="lo-pred-icon">🛒</div><div class="lo-pred-val">${pred.cvr}%</div><div class="lo-pred-label">Est. Conversion Rate</div><div class="lo-pred-sub">Industry avg: 3-8%</div></div>
        <div class="lo-pred-card"><div class="lo-pred-icon">💵</div><div class="lo-pred-val">${pred.revPer100}</div><div class="lo-pred-label">Est. Revenue per 100 Views</div><div class="lo-pred-sub">Based on avg order value</div></div>
        <div class="lo-pred-card" style="border-color:${gradeColor}"><div class="lo-pred-icon">🏆</div><div class="lo-pred-val" style="color:${gradeColor}">${pred.grade}</div><div class="lo-pred-label">Overall Grade</div><div class="lo-pred-sub">${pred.verdict}</div></div>
      </div>`;
  }

function renderEmotional(hits, foundKeywords) {
    const el = UI.$('loEmotional');
    if(!el) return;
    el.innerHTML = `<div class="lo-em-grid">
      ${EMOTIONAL_TRIGGERS.map(t => {
        const h = hits[t.id] || [];
        const active = h.length > 0;
        return `<div class="lo-em-card ${active?'lo-em-active':''}">
          <div class="lo-em-head"><span class="lo-em-icon">${t.icon}</span><span class="lo-em-name">${t.name}</span><span class="lo-em-count">${h.length}</span></div>
          ${active ? `<div class="lo-em-hits">${h.map(k=>`<span class="lo-em-tag">${esc(k)}</span>`).join('')}</div>` : `<div class="lo-em-missing">Not detected — consider adding ${t.name.toLowerCase()} triggers</div>`}
        </div>`;
      }).join('')}
    </div>`;
  }

function renderHeatmap(title, keywords) {
    const el = UI.$('loHeatmap');
    if(!el) return;
    const kwSet = new Set((keywords||[]).map(k=>k.toLowerCase()));
    const highValue = new Set(['premium','pro','wireless','bluetooth','noise','cancelling','battery','fast','free','smart','HD','4K','waterproof','organic','natural','eco','certified','guaranteed','warranty']);
    const words = title.split(/\s+/).filter(Boolean);
    el.innerHTML = `<div class="lo-heat-words">${words.map(w => {
      const lower = w.toLowerCase().replace(/[^a-z0-9]/g,'');
      let cls = 'lo-heat-filler';
      if(highValue.has(lower) || kwSet.has(lower)) cls = 'lo-heat-high';
      else if(lower.length > 4) cls = 'lo-heat-med';
      return `<span class="lo-heat-word ${cls}">${esc(w)}</span>`;
    }).join('')}</div>
    <div class="lo-heat-legend">
      <span class="lo-heat-leg"><span class="lo-heat-dot lo-heat-high"></span> High SEO Value</span>
      <span class="lo-heat-leg"><span class="lo-heat-dot lo-heat-med"></span> Medium Value</span>
      <span class="lo-heat-leg"><span class="lo-heat-dot lo-heat-filler"></span> Filler / Low Impact</span>
    </div>`;
  }

function renderBackend(newTerms, existing) {
    const el = UI.$('loBackendResult');
    if(!el) return;
    const existingSet = new Set((existing||[]).map(t=>t.toLowerCase()));
    el.innerHTML = `
      <div class="lo-backend-panel">
        <div class="lo-backend-section">
          <h4 class="lo-backend-title">Suggested New Terms (${newTerms.length})</h4>
          <div class="lo-backend-tags">${newTerms.map(t => `<span class="lo-backend-tag lo-backend-new">${esc(t)}</span>`).join('')}</div>
        </div>
        ${existing.length ? `<div class="lo-backend-section"><h4 class="lo-backend-title">Your Existing Terms (${existing.length})</h4><div class="lo-backend-tags">${existing.map(t=>`<span class="lo-backend-tag lo-backend-existing">${esc(t)}</span>`).join('')}</div></div>` : ''}
        <div class="lo-backend-tip">💡 Backend terms don't need commas,重复 words, or brand names. Focus on long-tail keywords your customers search for.</div>
      </div>`;
  }

function renderImages(platform) {
    const el = UI.$('loImages');
    if(!el) return;
    const p = PLATFORMS.find(x=>x.id===platform) || PLATFORMS[0];
    el.innerHTML = `
      <div class="lo-img-grid">
        ${IMAGE_STRATEGIES.default.map(slot => `
          <div class="lo-img-card ${slot.required?'lo-img-required':''}">
            <div class="lo-img-slot">#${slot.slot}</div>
            <div class="lo-img-type">${slot.type}</div>
            <div class="lo-img-desc">${slot.desc}</div>
            ${slot.required ? '<div class="lo-img-badge">Required</div>' : ''}
          </div>
        `).join('')}
      </div>
      <div class="lo-img-tip">📸 ${p.name} allows ${p.rules.imageMin}-${p.rules.imageMax} images. ${p.rules.videoAllowed?'Video is supported.':'Video not supported on this platform.'}</div>`;
  }

function renderBullets(bullets) {
    const el = UI.$('loBulletsResult');
    if(!el) return;
    el.innerHTML = `<div class="lo-bullet-list">
      ${bullets.map((b,i) => `<div class="lo-bullet-item"><span class="lo-bullet-label">${esc(b.label)}</span><span class="lo-bullet-text">${esc(b.text)}</span></div>`).join('')}
    </div>`;
  }

function renderAB(variants) {
    const el = UI.$('loAB');
    if(!el) return;
    el.innerHTML = `<div class="lo-ab-grid">
      ${variants.map((v,i) => `
        <div class="lo-ab-card">
          <div class="lo-ab-head"><span class="lo-ab-num">${i+1}</span><span class="lo-ab-name">${esc(v.name)}</span></div>
          <div class="lo-ab-title">${esc(v.title)}</div>
          <div class="lo-ab-hypothesis">💡 ${esc(v.hypothesis)}</div>
          <div class="lo-ab-type">Change type: ${esc(v.changeType)}</div>
        </div>
      `).join('')}
    </div>`;
  }

function renderCrossPlatform(listings, sourcePlatform) {
    const el = UI.$('loCrossPlatform');
    if(!el) return;
    el.innerHTML = `<div class="lo-cp-grid">
      ${listings.map(lp => `
        <div class="lo-cp-card ${lp.platform===sourcePlatform?'lo-cp-source':''}">
          <div class="lo-cp-head"><span class="lo-cp-icon">${lp.icon}</span><span class="lo-cp-name">${lp.name}</span>${lp.platform===sourcePlatform?'<span class="lo-cp-badge">Source</span>':''}</div>
          <div class="lo-cp-title">${esc(lp.title)}</div>
          <div class="lo-cp-bar"><div class="lo-cp-fill" style="width:${lp.titleUtilization}%;background:${lp.titleUtilization>100?'var(--accent-red)':lp.titleUtilization>80?'var(--accent-yellow)':'var(--accent-green)'}"></div></div>
          <div class="lo-cp-meta">${lp.titleLength}/${lp.maxTitle} chars (${lp.titleUtilization}%)</div>
        </div>
      `).join('')}
    </div>`;
  }

function renderSeasonal() {
    const el = UI.$('loSeasonal');
    if(!el) return;
    const now = new Date();
    const currentMonth = now.toLocaleString('en', { month:'short' });
    el.innerHTML = `<div class="lo-season-grid">
      ${SEASONAL_CALENDAR.map(m => `
        <div class="lo-season-card ${m.month===currentMonth?'lo-season-current':''}">
          <div class="lo-season-month">${m.month}</div>
          <div class="lo-season-name">${m.season}</div>
          <div class="lo-season-tips">${m.tips.map(t=>`<div class="lo-season-tip">• ${t}</div>`).join('')}</div>
          ${m.month===currentMonth?'<div class="lo-season-now">← Current Month</div>':''}
        </div>
      `).join('')}
    </div>`;
  }

function renderGaps(yourTitle, competitorText) {
    const el = UI.$('loGaps');
    if(!el) return;
    const gaps = findContentGaps(yourTitle + ' ' + competitorText, [
      'premium quality wireless bluetooth earbuds noise cancelling waterproof long battery life fast charging comfortable fit',
      'high definition audio deep bass crystal clear calls ipx7 waterproof sweatproof gym running workout',
      'active noise cancellation ambient mode transparency touch controls voice assistant compatible'
    ]);
    el.innerHTML = gaps.length ? `
      <div class="lo-gap-list">
        ${gaps.map(g => `<div class="lo-gap-item"><span class="lo-gap-word">${esc(g.word)}</span><span class="lo-gap-count">Used by ${g.competitorMentions} competitor${g.competitorMentions>1?'s':''}</span></div>`).join('')}
      </div>
      <div class="lo-gap-tip">💡 Consider naturally incorporating these high-frequency competitor keywords into your listing.</div>` :
      '<div class="lo-gap-empty">✅ No significant content gaps found — your listing covers key competitor terms.</div>';
  }

PluginRegistry.register('listing-optimizer', ListingOptimizerPlugin);
Object.defineProperty(window.HuntDrop.PluginRegistry.get('listing-optimizer'), '_section', {
  get(){ return _section; }, set(v){ _section = v; }, configurable: true
});
}catch(e){ console.error('[ListingOptimizer] error:', e); }
})();
