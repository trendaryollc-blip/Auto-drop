// ============================================================================
// PLUGIN: Ad Creative Studio
// ============================================================================
// AI-generated ad copy for Facebook, TikTok, Instagram.
// ============================================================================
(function(){
const {EventBus,PluginRegistry,UI,Config} = window.HuntDrop;

const AdStudioPlugin = {
  id: 'ad-studio',
  name: 'Ad Creator',
  version: '1.0.0',
  description: 'AI-generated ad copy and audience targeting',
  section: null,

  init(ctx) {},
  mount(ctx) {
    const container = UI.$('sections-container');
    if (!container) return;

    const section = document.createElement('section');
    section.className = 'section section-ad-studio';
    section.id = 'section-ad-studio';
    section.innerHTML = `
      <div class="section-inner">
        <div class="section-header">
          <h2 class="section-title">Ad Creative Studio</h2>
          <p class="section-desc">AI-generated ad copy for Facebook, TikTok, Instagram</p>
        </div>
        <div class="ad-studio-input-area">
          <div class="ai-search-box">
            <input type="text" id="adProductInput" placeholder="Enter product name or keyword to generate ad creatives...">
            <button class="ai-analyze-btn ad-studio-btn" id="generateAdsBtn">
              <span class="ai-sparkle">✨</span> Generate Ads
            </button>
          </div>
        </div>
        <div class="ad-studio-results" id="adStudioResults"></div>
        ${window.HuntDrop.renderRelatedTools([
          { section:'section-personas', name:'Customer Persona', desc:'Target the right audience', icon:'🎯', color:'#FF6B6B' },
          { section:'section-budget', name:'Ad Budget Allocator', desc:'Plan ad spend', icon:'💰', color:'#4ECDC4' },
          { section:'section-calendar', name:'Content Calendar', desc:'Schedule campaigns', icon:'📅', color:'#45B7D1' },
          { section:'section-objections', name:'Objection Handler', desc:'Handle objections', icon:'🛡️', color:'#96CEB4' }
        ])}
      </div>`;
    container.appendChild(section);
    const self = AdStudioPlugin;
    self.section = section;
    const btn = section.querySelector('#generateAdsBtn');
    const input = section.querySelector('#adProductInput');
    if (btn) btn.addEventListener('click', () => self.generate(input?.value || ''));
    if (input) input.addEventListener('keypress', e => { if(e.key==='Enter') self.generate(input.value); });
  },

  generate(query) {
    if (!query.trim()) return;
    const esc = s => UI.escapeHtml(s);
    const products = window.HuntDrop.ALL_PRODUCTS || [];
    const match = products.find(p =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()))
    ) || products[Math.floor(Math.random() * products.length)];

    const fmtN = n => n>=1000?(n/1000).toFixed(1)+'K':n.toString();
    const el = this.section?.querySelector('#adStudioResults');
    if (!el) return;

    el.innerHTML = `
      <div class="ad-platforms">
        <div class="ad-platform-card">
          <h3>📘 Facebook / Instagram Ads</h3>
          <div class="platform-sub">Feed, Stories, Reels placements</div>
          <div class="ad-copy"><div class="ad-copy-label">Primary Text</div><div class="ad-copy-text">🔥 This ${esc(match.title.split('—')[0].trim())} is BREAKING the internet! Thousands of 5-star reviews can't be wrong. Get yours before we sell out! Free shipping + 30-day guarantee. 👉 Shop now!</div></div>
          <div class="ad-copy"><div class="ad-copy-label">Headline</div><div class="ad-copy-text">${esc(match.title.split('—')[0].trim())} — 50% OFF Today Only!</div></div>
          <div class="ad-copy"><div class="ad-copy-label">Description</div><div class="ad-copy-text">Rated ${match.rating}★ by ${fmtN(match.reviews)}+ happy customers. Premium quality at factory prices.</div></div>
          <div class="audience-card"><div class="audience-title">🎯 Recommended Audience</div><div class="audience-tags">
            <span class="audience-tag">Age: ${esc(match.audience.age)}</span>
            <span class="audience-tag">Gender: ${esc(match.audience.gender)}</span>
            ${match.audience.interests.map(i=>`<span class="audience-tag">${esc(i)}</span>`).join('')}
            ${match.audience.countries.slice(0,3).map(c=>`<span class="audience-tag">${esc(c)}</span>`).join('')}
          </div></div>
        </div>
        <div class="ad-platform-card">
          <h3>🎵 TikTok Ads</h3>
          <div class="platform-sub">In-Feed, Spark Ads, TopView</div>
          <div class="ad-copy"><div class="ad-copy-label">Script Hook (0-3s)</div><div class="ad-copy-text">"POV: You finally found the ${esc(match.keywords[0])} that actually works..."</div></div>
          <div class="ad-copy"><div class="ad-copy-label">Script Body (3-15s)</div><div class="ad-copy-text">Show product in use → highlight key feature → social proof (reviews counter) → urgency (limited stock)</div></div>
          <div class="ad-copy"><div class="ad-copy-label">CTA</div><div class="ad-copy-text">"Link in bio 👆 — 50% off ends tonight!"</div></div>
          <div class="audience-card"><div class="audience-title">🎵 TikTok Targeting</div><div class="audience-tags">
            <span class="audience-tag">Interest: ${esc(match.audience.interests[0])}</span>
            <span class="audience-tag">Behavior: Engaged Shoppers</span>
            <span class="audience-tag">Age: 18-34</span>
          </div></div>
        </div>
        <div class="ad-platform-card">
          <h3>📸 Instagram Reels / Stories</h3>
          <div class="platform-sub">Vertical video, 9:16 ratio</div>
          <div class="ad-copy"><div class="ad-copy-label">Caption</div><div class="ad-copy-text">The ${esc(match.keywords[0])} everyone's been asking about 🤩✨ Link in bio to grab yours! #${match.keywords[0].replace(/\s/g,'')} #trending #musthave #fyp</div></div>
          <div class="ad-copy"><div class="ad-copy-label">Hashtag Strategy</div><div class="ad-copy-text">${match.keywords.map(k=>'#'+k.replace(/\s/g,'')).join(' ')} #viral #shopping #deal</div></div>
          <div class="audience-card"><div class="audience-title">📸 Visual Direction</div><div class="audience-tags">
            <span class="audience-tag">Aesthetic: Clean/Modern</span>
            <span class="audience-tag">Colors: Bright/Natural</span>
            <span class="audience-tag">Style: Lifestyle</span>
          </div></div>
        </div>
      </div>
      <div class="ad-creative-ideas">
        <h3>💡 Creative Concepts</h3>
        <div class="ad-idea"><div class="ad-idea-icon" style="background:var(--accent-cyan-dim)">📱</div><div class="ad-idea-text"><h4>UGC Unboxing</h4><p>Authentic user unboxing video showing genuine reaction. Film in natural lighting, casual setting.</p></div></div>
        <div class="ad-idea"><div class="ad-idea-icon" style="background:var(--accent-green-dim)">⚡</div><div class="ad-idea-text"><h4>Problem → Solution</h4><p>Start with the pain point (${esc(match.audience.interests[0])} struggle) → reveal product as solution → show transformation.</p></div></div>
        <div class="ad-idea"><div class="ad-idea-icon" style="background:var(--accent-orange-dim)">🎬</div><div class="ad-idea-text"><h4>Compilation</h4><p>Compile top 3-5 features in 15 seconds. Fast cuts, trending music, text overlays with key benefits.</p></div></div>
        <div class="ad-idea"><div class="ad-idea-icon" style="background:var(--accent-purple-dim)">📊</div><div class="ad-idea-text"><h4>Social Proof Stack</h4><p>Lead with review count (${fmtN(match.reviews)}+ reviews) → show 5-star screenshots → "Join ${match.orders}+ happy customers"</p></div></div>
      </div>`;
  },

  unmount(ctx) {
    if (AdStudioPlugin.section) {
      AdStudioPlugin.section.remove();
      AdStudioPlugin.section = null;
    }
    this.section = null;
  }
};

PluginRegistry.register('ad-studio', AdStudioPlugin);
})();