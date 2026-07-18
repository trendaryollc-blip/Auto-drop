// ============================================================================
// PLUGIN: FAQ Builder — Objection Handler Generator
// ============================================================================
(function(){
const {PluginRegistry,UI,Config} = window.HuntDrop;
const esc = s => UI.escapeHtml(s);
let _section = null;

const ObjectionCategories = {
  trust: {
    label: 'Trust & Safety', icon: '🛡️', color: '#06b6d4',
    objections: [
      { q: 'Is this product safe to use?', a: 'Absolutely. This product has been tested and verified by independent labs. It meets all US/EU safety standards. Plus, our 30-day money-back guarantee means you can try it completely risk-free. If you\'re not 100% satisfied, we\'ll refund every penny — no questions asked.', angle: 'Safety certification + guarantee' },
      { q: 'How do I know this isn\'t a scam?', a: 'We get it — the internet is full of sketchy products. Here\'s what makes us different: 12,847 verified 5-star reviews, a real US-based customer support team (you can call us), and every order ships with tracking. We\'ve been in business for 3+ years and have an A+ BBB rating.', angle: 'Track record + social proof' },
      { q: 'Is my payment information secure?', a: 'Your payment is 100% secure. We use bank-level SSL encryption and never store your card details. We accept PayPal, Apple Pay, and all major credit cards through Stripe — the same processor used by Amazon and Shopify.', angle: 'Payment security + trusted processors' },
      { q: 'Can I trust the reviews on your site?', a: 'Every review on our site is from a verified buyer. We use an independent review platform (Judge.me) that verifies each purchase. We also display unfiltered reviews — including the occasional 4-star one — because we believe in transparency.', angle: 'Verified reviews + transparency' }
    ]
  },
  quality: {
    label: 'Product Quality', icon: '✨', color: '#8b5cf6',
    objections: [
      { q: 'Is this product actually good quality?', a: 'This product has a 4.8/5 average rating across 3 platforms (Amazon, Shopify, Etsy). We personally test every product before listing it. The materials are [premium grade] and it\'s built to last. Most customers report it exceeds their expectations compared to similar products at 2-3x the price.', angle: 'Cross-platform ratings + hands-on testing' },
      { q: 'Will this break after a few uses?', a: 'We stand behind the durability of this product with a 6-month warranty. If it breaks under normal use within 6 months, we\'ll replace it for free. The average customer uses this product daily for 8+ months before replacing.', angle: 'Warranty + longevity data' },
      { q: 'How does this compare to the expensive version?', a: 'Honestly? It performs 90% as well at 40% of the price. We specifically source products that match premium quality without the brand markup. Same factories, same materials, different price tag. Save $50+ without sacrificing quality.', angle: 'Value comparison + factory sourcing' },
      { q: 'I\'ve been burned by similar products before', a: 'We hear this a lot. That\'s why we offer a 60-day satisfaction guarantee (double the industry standard). If this product doesn\'t blow your mind, return it for a full refund. We also include a free bonus guide to help you get the most out of your purchase.', angle: 'Extended guarantee + bonus value' }
    ]
  },
  price: {
    label: 'Price & Value', icon: '💰', color: '#10b981',
    objections: [
      { q: 'Why is this so expensive?', a: 'When you break it down: this product replaces $150+ worth of alternatives. At our price, you\'re paying less than $0.15 per use over its lifetime. Compare that to salon visits ($80/session), subscriptions ($30/month), or cheaper versions you\'ll replace 3x.', angle: 'Cost-per-use breakdown' },
      { q: 'Can I find this cheaper on AliExpress?', a: 'You can find similar products on AliExpress for $2-5 less — but here\'s what you\'re paying for with us: US-based customer support (response in <1 hour), 60-day returns (not 15-day), a 6-month warranty, and guaranteed 3-5 day shipping vs. 20-40 days.', angle: 'Service premium + convenience' },
      { q: 'Is this worth the money?', a: '87% of our customers say this product paid for itself within the first 2 weeks. Whether it\'s saving you time, money, or stress — the ROI is real. And with our money-back guarantee, you can find out for yourself with zero risk.', angle: 'ROI proof + risk reversal' },
      { q: 'Do you have any discounts or coupons?', a: 'Great news — we\'re currently running a limited promotion: buy 1 get 1 20% off. Use code SAVE20 at checkout. We also offer a 10% discount for first-time buyers who sign up for our newsletter.', angle: 'Bundle discount + first-buy offer' }
    ]
  },
  shipping: {
    label: 'Shipping & Delivery', icon: '🚚', color: '#f59e0b',
    objections: [
      { q: 'How long does shipping take?', a: 'Standard shipping: 3-5 business days (US). Express shipping: 1-2 business days ($4.99). Every order includes real-time tracking. We ship from our US warehouse in Texas, so most domestic orders arrive in under a week.', angle: 'Fast shipping + tracking' },
      { q: 'What if my order gets lost?', a: 'Every order is insured. If your package gets lost or damaged in transit, we\'ll reship it immediately at no cost. We also provide tracking for every shipment so you can monitor it from warehouse to doorstep.', angle: 'Insurance + reship guarantee' },
      { q: 'Do you ship internationally?', a: 'Yes! We ship to 40+ countries. International shipping takes 7-14 business days. All international orders include tracking and customs documentation. Free shipping on orders over $50.', angle: 'Global reach + free shipping threshold' },
      { q: 'The shipping cost is too high', a: 'We offer free standard shipping on orders over $50. For orders under $50, shipping is a flat $4.99 — no hidden fees. We also have express options available at checkout if you need it faster.', angle: 'Free shipping threshold + flat rate' }
    ]
  },
  returns: {
    label: 'Returns & Guarantees', icon: '🔄', color: '#f43f5e',
    objections: [
      { q: 'What if I don\'t like it?', a: 'No problem! We offer a 60-day hassle-free return policy. If you\'re not completely satisfied, just email us and we\'ll send you a prepaid return label. Full refund within 3 business days. No restocking fees, no questions asked.', angle: 'No-hassle returns + fast refund' },
      { q: 'Is there a money-back guarantee?', a: 'Yes — our "Love It or Leave It" guarantee: you have 60 full days to decide. If you don\'t absolutely love this product, return it for a complete refund. We\'ve processed over 12,000 returns with a 98% satisfaction rate.', angle: 'Named guarantee + return stats' },
      { q: 'What if it arrives damaged?', a: 'If your product arrives damaged, don\'t worry. Contact us within 48 hours with a photo, and we\'ll ship a replacement immediately — no need to return the damaged one. We stand behind our packaging and product quality.', angle: 'Instant replacement + no return needed' },
      { q: 'How do I initiate a return?', a: 'Simply email support@[yourstore].com with your order number, or use our self-service return portal. You\'ll get a prepaid shipping label instantly. Drop it off at any USPS location. Refund processed within 3 business days of receiving the return.', angle: 'Easy process + fast processing' }
    ]
  },
  socialproof: {
    label: 'Social Proof & Results', icon: '📊', color: '#ec4899',
    objections: [
      { q: 'How do I know this works?', a: 'This product has helped 12,847+ customers achieve [specific result]. Check out our verified reviews with photos and videos. We also have a 30-day "see the results yourself" guarantee — if you don\'t see improvement, we\'ll refund you.', angle: 'Customer count + photo evidence' },
      { q: 'Are there any before/after results?', a: 'Yes! Visit our reviews page to see 200+ before/after photos from verified customers. The average customer sees visible results within 14 days. We also have a 60-day photo challenge — share your transformation for a chance to win $100.', angle: 'Photo gallery + timeline + contest' },
      { q: 'I don\'t see many reviews', a: 'We actually have 4,200+ verified reviews across platforms. On our site alone, we have 847 reviews with a 4.8/5 average. We\'re a newer brand building trust one customer at a time — and every single review is from a real buyer.', angle: 'Cross-platform review count' },
      { q: 'Do real people actually use this?', a: 'Over 25,000 units sold in the last 90 days. Our average customer is a 28-42 year old professional who discovered us through TikTok or Instagram. We have a thriving community of 15,000+ members sharing tips and results daily.', angle: 'Sales volume + demographic proof' }
    ]
  },
  product: {
    label: 'Product-Specific', icon: '📦', color: '#6366f1',
    objections: [
      { q: 'Will this work for my specific situation?', a: 'This product is designed to be universal. Whether you\'re [beginner/experienced], [small/large], or [budget/premium] — it adapts to your needs. We include an adjustment guide and our support team can help customize settings for your exact situation.', angle: 'Universal design + customization' },
      { q: 'Is this product safe for [kids/pets/sensitive skin]?', a: 'Yes! This product is made with [non-toxic/hypoallergenic/eco-friendly] materials. It\'s been tested and certified safe for [relevant use case]. We also include a detailed safety data sheet with every order.', angle: 'Safety certifications + materials' },
      { q: 'How big/small is it exactly?', a: 'Dimensions: [X] x [Y] x [Z] inches. It\'s designed to be portable yet functional. We include a size comparison photo in the product images showing it next to common objects. If it doesn\'t fit your needs, our 60-day return policy has you covered.', angle: 'Exact specs + visual reference' },
      { q: 'What\'s included in the box?', a: 'Everything you need: the main product, [accessory 1], [accessory 2], a quick-start guide, and a QR code linking to our full video tutorial series. No additional purchases needed — it works right out of the box.', angle: 'Complete package + no hidden costs' }
    ]
  }
};

function findProduct(query,products){
  const q=query.toLowerCase();
  return products.find(p=>p.title.toLowerCase().includes(q)||p.keywords.some(k=>k.toLowerCase().includes(q)))||[...products].sort((a,b)=>b.score-a.score)[0];
}

function generate(query){
  if(!query.trim()) return;
  const products=window.HuntDrop.ALL_PRODUCTS||[];
  if(!products.length) return;
  const product=findProduct(query,products);
  if(!product) return;
  const el=_section?_section.querySelector('#ohResults'):null;
  if(!el) return;

  const allObjections=Object.entries(ObjectionCategories).map(([key,cat])=>({
    ...cat,key,objections:cat.objections.map(o=>({...o}))
  }));

  const totalObjections=allObjections.reduce((sum,c)=>sum+c.objections.length,0);

  el.innerHTML=`
    <!-- Summary Stats -->
    <div class="oh-summary-row">
      <div class="oh-summary-card oh-sum-cyan"><div class="oh-sum-icon">🛡️</div><div class="oh-sum-val">${allObjections.length}</div><div class="oh-sum-label">Categories</div></div>
      <div class="oh-summary-card oh-sum-purple"><div class="oh-sum-icon">💬</div><div class="oh-sum-val">${totalObjections}</div><div class="oh-sum-label">Objections Covered</div></div>
      <div class="oh-summary-card oh-sum-green"><div class="oh-sum-icon">📋</div><div class="oh-sum-val">4</div><div class="oh-sum-label">Output Formats</div></div>
      <div class="oh-summary-card oh-sum-orange"><div class="oh-sum-icon">🎯</div><div class="oh-sum-val">100%</div><div class="oh-sum-label">Objection Coverage</div></div>
    </div>

    <!-- Category Cards -->
    <div class="oh-section">
      <h3>📂 Objection Categories</h3>
      <p class="oh-section-sub">28 pre-written responses across 7 categories</p>
      <div class="oh-category-grid">
        ${allObjections.map(cat=>`
          <div class="oh-cat-card" style="border-left:4px solid ${cat.color}">
            <div class="oh-cat-card-header">
              <span class="oh-cat-card-icon">${esc(cat.icon)}</span>
              <span class="oh-cat-card-name">${esc(cat.label)}</span>
            </div>
            <div class="oh-cat-card-count">${cat.objections.length} objections</div>
            <div class="oh-cat-card-preview">${esc(cat.objections[0].q)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Tabs -->
    <div class="oh-tabs">
      <button class="oh-tab active" data-tab="all">📋 All Objections</button>
      <button class="oh-tab" data-tab="page-copy">📄 Page Copy</button>
      <button class="oh-tab" data-tab="ad-scripts">🎯 Ad Scripts</button>
      <button class="oh-tab" data-tab="cs-templates">💬 CS Templates</button>
    </div>

    <div id="ohTabContent">
      ${renderAllObjections(allObjections)}
    </div>
  `;

  el.querySelectorAll('.oh-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      el.querySelectorAll('.oh-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const content=el.querySelector('#ohTabContent');
      switch(tab.dataset.tab){
        case 'all': content.innerHTML=renderAllObjections(allObjections); break;
        case 'page-copy': content.innerHTML=renderPageCopy(allObjections,product); break;
        case 'ad-scripts': content.innerHTML=renderAdScripts(allObjections,product); break;
        case 'cs-templates': content.innerHTML=renderCSTemplates(allObjections,product); break;
      }
    });
  });
}

const ObjectionHandlerPlugin = {
  id:'objection-handler',name:'FAQ Builder',version:'2.0.0',
  description:'Generate responses to every customer objection for any product',
  dependencies:['search-engine'],

  init(_ctx){Config.defaults('objectionHandler',{enabled:true});},

  mount(_ctx){
    const container=UI.$('sections-container');
    if(!container) return;
    const section=document.createElement('section');
    section.className='section section-objection-handler';
    section.id='section-objections';
    section.innerHTML=`
      <div class="section-inner">
        <div class="oh-hero">
          <div class="oh-hero-content">
            <div class="oh-hero-badge">🛡️ Objection Intelligence</div>
            <h1 class="oh-hero-title">FAQ Builder</h1>
            <p class="oh-hero-desc">Generate responses to every customer objection for any product. Includes trust-building copy, ad scripts, CS templates, and FAQ sections. Never lose a sale to doubt again.</p>
          </div>
          <div class="oh-hero-cards">
            <div class="oh-hero-card"><div class="oh-hero-card-icon">🛡️</div><div class="oh-hero-card-num">7</div><div class="oh-hero-card-label">Categories</div></div>
            <div class="oh-hero-card"><div class="oh-hero-card-icon">💬</div><div class="oh-hero-card-num">28</div><div class="oh-hero-card-label">Objections</div></div>
            <div class="oh-hero-card"><div class="oh-hero-card-icon">📋</div><div class="oh-hero-card-num">4</div><div class="oh-hero-card-label">Output Tabs</div></div>
            <div class="oh-hero-card"><div class="oh-hero-card-icon">🎯</div><div class="oh-hero-card-num">100%</div><div class="oh-hero-card-label">Coverage</div></div>
          </div>
        </div>

        <div class="oh-feat-list">
          <div class="oh-feat-item"><span class="oh-feat-icon">🛡️</span> Trust & Safety</div>
          <div class="oh-feat-item"><span class="oh-feat-icon">✨</span> Quality Assurance</div>
          <div class="oh-feat-item"><span class="oh-feat-icon">💰</span> Price Objections</div>
          <div class="oh-feat-item"><span class="oh-feat-icon">🚚</span> Shipping Concerns</div>
          <div class="oh-feat-item"><span class="oh-feat-icon">🔄</span> Returns & Guarantees</div>
          <div class="oh-feat-item"><span class="oh-feat-icon">📊</span> Social Proof</div>
          <div class="oh-feat-item"><span class="oh-feat-icon">📦</span> Product-Specific</div>
        </div>

        <div class="oh-input-card">
          <h3>🔍 Enter Your Product</h3>
          <div class="oh-input-row">
            <div class="oh-input-wrap">
              <svg class="oh-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" class="oh-input" id="ohInput" placeholder="Type a product keyword to generate objection responses...">
              <button class="oh-generate-btn" id="ohGenerateBtn">🛡️ Generate Responses</button>
            </div>
          </div>
          <div class="oh-quick-picks">
            <span class="oh-quick-label">Quick try:</span>
            <button class="oh-quick-btn" data-q="wireless earbuds">🎧 Earbuds</button>
            <button class="oh-quick-btn" data-q="pet gadgets">🐾 Pet Gadgets</button>
            <button class="oh-quick-btn" data-q="kitchen organizer">🍳 Kitchen</button>
            <button class="oh-quick-btn" data-q="posture corrector">🧍 Posture</button>
            <button class="oh-quick-btn" data-q="galaxy projector">🌌 Galaxy Light</button>
          </div>
        </div>

        <div id="ohResults"></div>

        ${window.HuntDrop.renderRelatedTools([
          { section:'section-personas', name:'Customer Persona', desc:'Understand buyers', icon:'👤', color:'#ec4899' },
          { section:'section-ad-studio', name:'Ad Studio', desc:'Generate ad copy', icon:'🎯', color:'#f59e0b' },
          { section:'section-calendar', name:'Content Calendar', desc:'Schedule content', icon:'📅', color:'#f97316' },
          { section:'section-health', name:'Store Health', desc:'Check store readiness', icon:'💊', color:'#10b981' }
        ])}
      </div>`;
    container.appendChild(section);
    _section=section;
    const btn=section.querySelector('#ohGenerateBtn');
    const input=section.querySelector('#ohInput');
    if(btn) btn.addEventListener('click',()=>generate(input?.value||''));
    if(input) input.addEventListener('keypress',e=>{if(e.key==='Enter')generate(input.value);});
    section.querySelectorAll('.oh-quick-btn').forEach(b=>{
      b.addEventListener('click',()=>{input.value=b.dataset.q;generate(b.dataset.q);});
    });
  },

  unmount(_ctx){if(_section){_section.remove();_section=null;}},

  generate(query){generate(query);}
};

function renderAllObjections(categories){
    return `<div class="oh-categories">
      ${categories.map(cat=>`
        <div class="oh-category">
          <div class="oh-cat-header" style="border-left-color:${cat.color}">
            <span class="oh-cat-icon">${esc(cat.icon)}</span>
            <span class="oh-cat-label">${esc(cat.label)}</span>
            <span class="oh-cat-count">${cat.objections.length} objections</span>
          </div>
          <div class="oh-objections">
            ${cat.objections.map(o=>`
              <div class="oh-objection">
                <div class="oh-obj-q">
                  <span class="oh-q-icon">❓</span>
                  <span>${esc(o.q)}</span>
                </div>
                <div class="oh-obj-a">
                  <span class="oh-a-icon">✅</span>
                  <div>
                    <div class="oh-a-text">${esc(o.a)}</div>
                    <div class="oh-a-angle">💡 Angle: ${esc(o.angle)}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>`;
  }

function renderPageCopy(categories,_product){
  const topObjections=categories.flatMap(c=>c.objections).slice(0,8);
  return `
    <div class="oh-page-section">
      <h3 class="oh-section-title">📋 Product Page — Trust Section Copy</h3>

      <div class="oh-copy-block">
        <div class="oh-copy-label">Suggested Trust Bar (top of product page)</div>
        <div class="oh-copy-text">✓ 30-Day Money-Back Guarantee &nbsp;|&nbsp; ✓ 12,847+ Happy Customers &nbsp;|&nbsp; ✓ Free Shipping Over $50 &nbsp;|&nbsp; ✓ 24/7 Support</div>
      </div>

      <div class="oh-copy-block">
        <div class="oh-copy-label">FAQ Section — Objection-Handling Answers</div>
        <div class="oh-copy-faq">
          ${topObjections.map(o=>`
            <div class="oh-faq-item">
              <div class="oh-faq-q">${esc(o.q)}</div>
              <div class="oh-faq-a">${esc(o.a)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="oh-copy-block">
        <div class="oh-copy-label">Guarantee Badge Text</div>
        <div class="oh-copy-text">🛡️ <strong>"Love It or Leave It"</strong> — 60-Day 100% Money-Back Guarantee. No questions asked. No hoops to jump through. If this product doesn't blow your mind, email us and we'll refund every penny.</div>
      </div>

      <div class="oh-copy-block">
        <div class="oh-copy-label">Social Proof Widget</div>
        <div class="oh-copy-text">🔥 <span id="ohLiveSales">${Math.floor(8+Math.random()*12)}</span> people are viewing this right now &nbsp;|&nbsp; ⏰ ${Math.floor(3+Math.random()*5)} bought in the last hour &nbsp;|&nbsp; 📦 ${Math.floor(85+Math.random()*10)}% in stock</div>
      </div>
    </div>
  `;
}

function renderAdScripts(categories,product){
  const scripts=[
    {platform:'Facebook/Instagram',icon:'📘',angle:'Fear-based',copy:`Stop wasting money on products that don't work. This ${product.title.split(' ').slice(0,3).join(' ')} has helped 12,847+ people save time every single day. 60-day money-back guarantee. Try it risk-free →`},
    {platform:'Facebook/Instagram',icon:'📘',angle:'Social proof',copy:`"I can't believe I waited this long to buy this." — That's what 4,200+ 5-star reviewers said. Join 25,000+ customers who already made the switch. Free shipping today only →`},
    {platform:'TikTok',icon:'🎵',angle:'Hook',copy:`POV: you found the ${product.title.split(' ').slice(0,3).join(' ')} that actually works. 12,847+ 5-star reviews can't be wrong. Link in bio before it sells out again →`},
    {platform:'TikTok',icon:'🎵',angle:'Myth-busting',copy:`"You can't find quality products online" — Wrong. This ${product.title.split(' ').slice(0,3).join(' ')} has a 4.8/5 rating across 3 platforms. 60-day guarantee proves we're not lying →`},
    {platform:'Google Ads',icon:'🔍',angle:'Search intent',copy:`Looking for ${product.title.split(' ').slice(0,3).join(' ')}? Join 25,000+ customers. 60-day money-back guarantee. Free shipping over $50. ★★★★★ 4.8/5 rating.`},
  ];

  return `
    <div class="oh-ad-section">
      <h3 class="oh-section-title">🎯 Ad Copy — Preemptively Addresses Objections</h3>
      <div class="oh-ad-grid">
        ${scripts.map(s=>`
          <div class="oh-ad-card">
            <div class="oh-ad-header">
              <span class="oh-ad-platform">${s.icon} ${s.platform}</span>
              <span class="oh-ad-angle">${s.angle}</span>
            </div>
            <div class="oh-ad-copy">${s.copy}</div>
            <div class="oh-ad-note">✅ Addresses: Trust + Social proof + Risk reversal</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderCSTemplates(_categories,_product){
  const templates=[
    {trigger:'Customer asks about return policy',icon:'🔄',response:`Hi [Name], thank you for reaching out! We offer a 60-day hassle-free return policy. If you're not completely satisfied, we'll send you a prepaid return label and process your refund within 3 business days. Would you like me to start the return process for you?`,priority:'High'},
    {trigger:'Customer complains about quality',icon:'⚠️',response:`Hi [Name], I'm sorry to hear that. Your satisfaction is our top priority. I'd like to send you a replacement at no cost — or if you prefer, a full refund. Which would you prefer? We also have a troubleshooting guide that might help if you'd like to try that first.`,priority:'Critical'},
    {trigger:'Customer asks if product is safe',icon:'🛡️',response:`Hi [Name], great question! This product is made with [non-toxic/eco-friendly] materials and has been independently tested and certified. It meets all US and EU safety standards. We also include a safety data sheet with every order. Let me know if you have any other concerns!`,priority:'High'},
    {trigger:'Customer wants a discount',icon:'💰',response:`Hi [Name]! I appreciate your interest. We're currently running a bundle deal: buy 2, save 15% with code BUNDLE15. I can also add you to our VIP list for exclusive early access to sales. Would either of those work for you?`,priority:'Medium'},
    {trigger:'Customer says it\'s too expensive',icon:'💸',response:`Hi [Name], I understand budget is a concern. Here's the thing: this product replaces $150+ worth of alternatives. At our price, that's less than $0.15 per use over its lifetime. Plus, our 60-day guarantee means you can try it completely risk-free. If it doesn't pay for itself, we'll refund you.`,priority:'High'},
    {trigger:'Customer asks about shipping time',icon:'🚚',response:`Hi [Name]! Standard shipping: 3-5 business days. Express: 1-2 days ($4.99). Every order includes real-time tracking. I just checked — orders placed before 2 PM EST ship same day. Where are you located? I can give you an exact delivery estimate.`,priority:'Medium'}
  ];

  return `
    <div class="oh-cs-section">
      <h3 class="oh-section-title">💬 Customer Service Response Templates</h3>
      <div class="oh-cs-grid">
        ${templates.map(t=>`
          <div class="oh-cs-card">
            <div class="oh-cs-header">
              <span class="oh-cs-trigger">${t.icon} ${t.trigger}</span>
              <span class="oh-cs-priority oh-cs-priority-${t.priority.toLowerCase()}">${t.priority}</span>
            </div>
            <div class="oh-cs-response">${t.response}</div>
            <div class="oh-cs-actions">
              <button class="oh-copy-btn" onclick="const r=this.closest('.oh-cs-card').querySelector('.oh-cs-response');navigator.clipboard.writeText(r.textContent);this.textContent='✅ Copied!';setTimeout(()=>this.textContent='📋 Copy Template',1500)">📋 Copy Template</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

PluginRegistry.register('objection-handler',ObjectionHandlerPlugin);
})();
