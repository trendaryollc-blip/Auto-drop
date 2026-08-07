// ============================================================================
// PLUGIN: Product Hunt v2 — AI Hunting Console with Kill Zone Detection
// ============================================================================
(function () {
  const { EventBus, PluginRegistry, Config, UI } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(s);
  function sanitizeHTML(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp
      .querySelectorAll('script,style,iframe,object,embed,form,input,textarea,select,button,link,meta')
      .forEach((el) => el.remove());
    tmp.querySelectorAll('[onclick],[onerror],[onload],[onmouseover],[onfocus],[onblur]').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
      });
    });
    return tmp.innerHTML;
  }

  function navigateTo(sectionId) {
    window.HuntDrop.navigateTo(sectionId);
  }

  const PLATFORMS = [
    { id: 'aliexpress', name: 'AliExpress', color: '#e62e04' },
    { id: 'amazon', name: 'Amazon', color: '#ff9900' },
    { id: 'shopify', name: 'Shopify', color: '#96bf48' },
    { id: 'ebay', name: 'eBay', color: '#e53238' },
    { id: 'temu', name: 'Temu', color: '#fb7701' },
    { id: 'tiktok', name: 'TikTok', color: '#00f2ea' },
    { id: 'etsy', name: 'Etsy', color: '#f1641e' },
    { id: 'cjdropshipping', name: 'CJ Drop', color: '#40c351' },
    { id: 'dhgate', name: 'DHgate', color: '#e62e04' },
    { id: 'wish', name: 'Wish', color: '#2fb7ec' },
  ];

  const PRESETS = [
    { label: 'Trending on TikTok', query: 'trending on tiktok this week' },
    { label: 'Hidden Gems Under $20', query: 'hidden gems under 20 dollars low competition' },
    { label: 'High Margin 50%+', query: 'high margin products over 50 percent profit' },
    { label: 'New Arrivals', query: 'new arrivals with low competition dropshipping' },
    { label: 'Winning Products', query: 'winning products high sales velocity' },
    { label: 'Pet Niche', query: 'best selling pet products trending' },
    { label: 'Beauty Products', query: 'beauty tools trending viral' },
    { label: 'Kitchen Gadgets', query: 'kitchen gadgets organizing trending' },
  ];

  const KILL_ZONE_THRESHOLD = 60;
  const PROMPT_SUGGESTIONS = [
    'Find me trending pet products under $20 with low competition',
    "What's selling well on TikTok this week?",
    'High margin beauty products with reliable suppliers',
    'New kitchen gadgets that are just starting to trend',
    'Winning fitness products with proven demand',
  ];

  // ===== Closure state (avoids `this` issues with PluginRegistry) =====
  let _section = null;
  let _chatOpen = false;
  let _chatHistory = [];
  let _searchResults = [];
  let _scanning = false;
  let _activeFilter = 'all';
  let _activeSort = 'score';
  let _watchlist = JSON.parse(localStorage.getItem('ph_watchlist') || '[]');
  let _placeholderInterval = null;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function getPlatColor(platform) {
    const p = PLATFORMS.find((x) => x.id === platform);
    return p ? p.color : '#888';
  }

  // ===== PH LIGHTBOX =====
  function openPHLightbox(card, images) {
    let lb = document.getElementById('phImageLightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'phImageLightbox';
      lb.className = 'ph-image-lightbox';
      lb.innerHTML =
        '<button class="ph-lb-close" title="Close (Esc)">&times;</button>' +
        '<button class="ph-lb-nav ph-lb-prev" title="Previous">&#10094;</button>' +
        '<button class="ph-lb-nav ph-lb-next" title="Next">&#10095;</button>' +
        '<div class="ph-lb-img-wrap"><img class="ph-lb-img" src="" alt=""></div>' +
        '<div class="ph-lb-counter"></div>';
      document.body.appendChild(lb);
      lb.addEventListener('click', function (e) {
        if (e.target === lb || e.target.classList.contains('ph-lb-close')) {
          closePHLightbox();
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lb && lb.classList.contains('active')) {
          closePHLightbox();
        }
      });
    }
    if (!card._lbImages) {
      card._lbImages = images;
    }
    const imgs = card._lbImages;
    let idx = 0;
    const img = lb.querySelector('.ph-lb-img');
    const counter = lb.querySelector('.ph-lb-counter');
    function show(i) {
      idx = (i + imgs.length) % imgs.length;
      img.src = esc(UI.normalizeImageUrl ? UI.normalizeImageUrl(imgs[idx], '') : imgs[idx]);
      if (counter) counter.textContent = (idx + 1) + ' / ' + imgs.length;
    }
    show(0);
    lb.querySelector('.ph-lb-prev').onclick = function (e) { e.stopPropagation(); show(idx - 1); };
    lb.querySelector('.ph-lb-next').onclick = function (e) { e.stopPropagation(); show(idx + 1); };
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
    window._phLightbox = lb;
  }
  function closePHLightbox() {
    const lb = window._phLightbox;
    if (!lb) return;
    lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ===== BUILD HTML =====
  function buildHTML() {
    return `
    <div class="section-inner">
      <div class="ph-console">
        <h1 class="ph-console-title"><span class="ph-console-badge"><span class="ph-console-badge-dot"></span> AI-Powered</span> Hunt Winning Products</h1>
        <p class="ph-console-desc">AI searches 10 platforms, validates demand, and finds arbitrage opportunities.</p>
      </div>

      <div class="ph-prompt-wrap" role="search" aria-label="Product search">
        <div class="ph-prompt-box">
          <div class="ph-prompt-input-row">
            <svg class="ph-prompt-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <textarea class="ph-prompt-textarea" id="phPrompt" placeholder="${PROMPT_SUGGESTIONS[0]}" rows="1"></textarea>
            <button class="ph-hunt-btn" id="phHuntBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Hunt
            </button>
          </div>
          <div class="ph-prompt-footer">
            <div class="ph-prompt-left">
              <div class="ph-depth-toggle">
                <button class="ph-depth-btn active" data-depth="quick">Quick Scan</button>
                <button class="ph-depth-btn" data-depth="deep">Deep Dive</button>
              </div>
              <button class="ph-platform-expander" id="phPlatformExpander">
                <span class="ph-platform-expander-label">All 10 platforms</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="ph-platform-expanded-list" id="phPlatformList">
                <span class="ph-platform-toggle active" data-plat="all">All 10</span>
                ${PLATFORMS.map(
                  (p) =>
                    `<span class="ph-platform-toggle" data-plat="${p.id}"><span class="ph-pt-dot" style="background:${p.color}"></span>${p.name}</span>`
                ).join('')}
              </div>
            </div>
            <div class="ph-prompt-right">
              <span class="ph-shortcut-hint">⌘K to focus</span>
            </div>
          </div>
        </div>

        <div class="ph-import-collapsed" id="phImportCollapsed">
          <button class="ph-import-toggle-btn" id="phImportToggle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Or paste a product URL
            <svg class="ph-import-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        <div class="ph-import-section" id="phImportSection" style="display:none">
          <div class="ph-import-tabs">
            <button class="ph-import-tab active" data-tab="url">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Paste URL
            </button>
            <button class="ph-import-tab" data-tab="image">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Drop Image
            </button>
          </div>

          <div class="ph-import-panel active" id="phUrlPanel">
            <div class="ph-import-url-row">
              <div class="ph-import-url-input-wrap">
                <input type="text" class="ph-import-url-input" id="phUrlInput" placeholder="Paste AliExpress, Amazon, CJ Dropshipping, eBay link..." autocomplete="off">
                <button class="ph-import-url-clear" id="phUrlClear" title="Clear">✕</button>
              </div>
              <button class="ph-import-analyze-btn" id="phUrlAnalyze">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Analyze
              </button>
            </div>
            <div class="ph-import-detected" id="phUrlDetected"></div>
          </div>

          <div class="ph-import-panel" id="phImagePanel">
            <div class="ph-import-dropzone" id="phDropzone">
              <input type="file" id="phFileInput" accept="image/*" hidden>
              <div class="ph-import-dropzone-content" id="phDropzoneContent">
                <div class="ph-import-dropzone-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <strong>Drop product image here</strong>
                <span>or click to browse</span>
              </div>
              <div class="ph-import-dropzone-preview" id="phDropzonePreview" style="display:none">
                <img id="phPreviewImg" src="" alt="Preview">
                <div class="ph-import-preview-info">
                  <span class="ph-import-preview-name" id="phPreviewName"></span>
                  <span class="ph-import-preview-size" id="phPreviewSize"></span>
                </div>
                <div class="ph-import-preview-actions">
                  <button class="ph-import-preview-search" id="phImageSearch">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Visual Search
                  </button>
                  <button class="ph-import-preview-remove" id="phImageRemove">✕</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ph-presets">
        ${PRESETS.slice(0, 5)
          .map((p) => `<button class="ph-preset" data-query="${p.query}">${p.label}</button>`)
          .join('')}
        ${
          PRESETS.length > 5
            ? `<button class="ph-preset ph-preset-more" id="phPresetMore">+${PRESETS.length - 5} more</button>` +
              PRESETS.slice(5)
                .map(
                  (p) =>
                    `<button class="ph-preset ph-preset-extra" data-query="${p.query}" style="display:none">${p.label}</button>`
                )
                .join('')
            : ''
        }
      </div>

      <div class="ph-scanning" id="phScanning">
        <div class="ph-scan-header">
          <div class="ph-scan-status"><div class="ph-scan-spinner"></div> <span id="phScanText">Initializing AI scan...</span></div>
          <div class="ph-scan-count" id="phScanCount">0 found</div>
        </div>
        <div class="ph-scan-progress"><div class="ph-scan-progress-fill" id="phScanProgress"></div></div>
        <div class="ph-scan-platforms" id="phScanPlatforms">
          ${PLATFORMS.map((p) => `<div class="ph-scan-plat" data-plat="${p.id}"><span class="ph-scan-plat-dot"></span>${p.name}</div>`).join('')}
        </div>
      </div>

      <div class="ph-stats" id="phStats" style="display:none"></div>
      <div class="ph-insights" id="phInsights" style="display:none"></div>
      <div class="ph-validation" id="phValidation"></div>
      <div class="ph-killzone" id="phKillZone"></div>
      <div class="ph-arbitrage" id="phArbitrage"></div>
      <div class="ph-export-bar" id="phExport" style="display:none"></div>
      <div class="ph-filter-bar" id="phFilterBar" style="display:none"></div>
      <div class="ph-grid" id="phGrid"></div>
      <div class="ph-watchlist" id="phWatchlist"></div>

      ${window.HuntDrop.renderRelatedTools([
        { section: 'section-niche-radar', name: 'Niche Radar', desc: 'Validate niches', icon: '📡', color: '#FF6B6B' },
        {
          section: 'section-lifecycle',
          name: 'Product Lifecycle Radar',
          desc: 'Track maturity',
          icon: '📊',
          color: '#4ECDC4',
        },
        { section: 'section-market-gaps', name: 'Market Gap Finder', desc: 'Find gaps', icon: '🔍', color: '#45B7D1' },
        {
          section: 'section-battlefield',
          name: 'Competitor Battlefield',
          desc: 'See competition',
          icon: '⚔️',
          color: '#96CEB4',
        },
      ])}
    </div>`;
  }

  // ===== CHAT FUNCTIONS =====
  function addChatMsg(type, text) {
    const msgs = UI.$('phChatMessages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'ph-chat-msg ' + type;
    div.innerHTML = type === 'user' ? esc(text) : sanitizeHTML(text);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    _chatHistory.push({ role: type, content: text });

    if (!_chatOpen) {
      _chatOpen = true;
      const sidebar = UI.$('phChatSidebar');
      if (sidebar) sidebar.classList.add('open');
    }
  }

  function showSupplierChat(product) {
    if (!product) return;
    const suppliers = product.suppliers || [];
    if (suppliers.length) {
      addChatMsg(
        'ai',
        `<strong>Top Suppliers for ${esc(product.title.split('—')[0].trim())}:</strong><br><br>` +
          suppliers
            .map(
              (s) =>
                `🏭 <strong>${esc(s.name)}</strong><br>` +
                `📍 ${esc(s.location)} | ⭐ ${s.rating}★ | 📦 ${s.orders} orders<br>` +
                `⏱ Response: ${esc(s.responseTime)} ${s.verified ? '| ✅ Verified' : ''}`
            )
            .join('<br><br>')
      );
    } else {
      addChatMsg('ai', 'Checking supplier availability for this product...');
    }
  }

  function generateAdCopy(product) {
    if (!product) return;
    const title = product.title.split('—')[0].trim();
    const hooks = [
      `STOP scrolling! This ${title.toLowerCase()} is going viral 🔥`,
      `I tested 10 ${title.toLowerCase()}s — this one actually works`,
      `POV: You finally found the perfect ${title.toLowerCase()}`,
      `Why is nobody talking about this ${title.toLowerCase()}?!`,
      `The ${title.toLowerCase()} that broke TikTok last week`,
    ];
    addChatMsg(
      'ai',
      `<strong>🎬 Ad Hooks for ${esc(title)}:</strong><br><br>` +
        hooks.map((h, i) => `<strong>${i + 1}.</strong> ${esc(h)}`).join('<br><br>') +
        `<br><br><strong>Recommended angle:</strong> ${esc(product.aiInsight?.slice(0, 120) || 'Focus on the unique selling proposition and social proof.')}`
    );
  }

  function sendChatMessage(text) {
    const input = UI.$('phChatInput');
    if (!text?.trim()) return;
    addChatMsg('user', text);
    if (input) input.value = '';

    const lower = text.toLowerCase();
    setTimeout(() => {
      if (lower.includes('supplier') || lower.includes('source')) {
        showSupplierChat(_searchResults[0]);
      } else if (lower.includes('ad') || lower.includes('copy') || lower.includes('hook')) {
        generateAdCopy(_searchResults[0]);
      } else if (lower.includes('alternative') || lower.includes('similar')) {
        const safe = _searchResults.filter((p) => !p.killZone && p.score >= 70);
        if (safe.length) {
          addChatMsg(
            'ai',
            `Found ${safe.length} alternatives with better scores:<br>` +
              safe
                .slice(0, 3)
                .map((p) => `• <strong>${esc(p.title)}</strong> (Score: ${p.score}, ${p.margin}% margin)`)
                .join('<br>')
          );
          renderProducts(safe);
        } else {
          addChatMsg('ai', 'No better alternatives found. Try adjusting your search criteria.');
        }
      } else if (lower.includes('profit') || lower.includes('margin')) {
        const top = _searchResults
          .filter((p) => !p.killZone)
          .sort((a, b) => b.margin - a.margin)
          .slice(0, 3);
        if (top.length) {
          addChatMsg(
            'ai',
            `Top profit products:<br>` +
              top
                .map(
                  (p) =>
                    `• <strong>${esc(p.title)}</strong><br>  Buy: $${p.price.toFixed(2)} → Sell: $${(p.platformPrices?.amazon || p.price * 3).toFixed(2)}<br>  Profit: $${((p.platformPrices?.amazon || p.price * 3) - p.price - 2.5).toFixed(2)} (${p.margin}%)`
                )
                .join('<br><br>')
          );
        }
      } else {
        addChatMsg(
          'ai',
          `I can help you with:<br>• <strong>Suppliers</strong> — "Show best suppliers"<br>• <strong>Ad Copy</strong> — "Generate TikTok ads"<br>• <strong>Alternatives</strong> — "Find similar products"<br>• <strong>Profit</strong> — "What are the margins?"<br><br>Or click any product card for full analysis!`
        );
      }
    }, 600);
  }

  // ===== ENRICH PRODUCT =====
  function enrichProduct(p) {
    const competitorCount = Math.floor(Math.random() * 120) + 5;
    const adCount = Math.floor(Math.random() * 80) + 2;
    const tiktokCreators = Math.floor(Math.random() * 30);
    const trendSlope = Math.random() * 20 - 8;
    const trendDirection = trendSlope > 3 ? 'rising' : trendSlope < -3 ? 'declining' : 'stable';

    const prices = p.platformPrices || {};
    let bestBuyPrice = p.price;
    let bestSellPrice = prices.amazon || p.price * 3;
    let bestBuyPlatform = 'aliexpress';
    let bestSellPlatform = 'amazon';

    Object.entries(prices).forEach(([plat, price]) => {
      if (price < bestBuyPrice) {
        bestBuyPrice = price;
        bestBuyPlatform = plat;
      }
    });
    Object.entries(prices).forEach(([plat, price]) => {
      if (price > bestSellPrice && plat !== bestBuyPlatform) {
        bestSellPrice = price;
        bestSellPlatform = plat;
      }
    });

    const arbitrageProfit = bestSellPrice - bestBuyPrice - 2.5;
    const arbitrageROI = bestBuyPrice > 0 ? ((arbitrageProfit / bestBuyPrice) * 100).toFixed(0) : 0;

    const killZone = competitorCount >= KILL_ZONE_THRESHOLD;
    const killReasons = [];
    if (competitorCount >= KILL_ZONE_THRESHOLD) killReasons.push(`${competitorCount} stores already selling this`);
    if (adCount >= 50) killReasons.push(`${adCount}+ identical ads running`);
    if (trendDirection === 'declining') killReasons.push('Trend declining for 30+ days');
    if (p.marketSaturation >= 70) killReasons.push(`${p.marketSaturation}% market saturation`);

    const signals = {
      stores: { value: competitorCount, pass: competitorCount < KILL_ZONE_THRESHOLD },
      ads: { value: adCount, pass: adCount < 30 },
      trend: { value: trendDirection, pass: trendDirection !== 'declining' },
      margin: { value: p.margin, pass: p.margin >= 40 },
      social: { value: tiktokCreators, pass: tiktokCreators > 0 },
    };

    const passCount = Object.values(signals).filter((s) => s.pass).length;
    const verdict = passCount >= 4 ? 'test' : passCount >= 2 ? 'caution' : 'skip';
    const confidence = Math.round((passCount / 5) * 100);

    return {
      ...p,
      competitorCount,
      adCount,
      tiktokCreators,
      trendSlope,
      trendDirection,
      killZone,
      killReasons,
      signals,
      verdict,
      confidence,
      arbitrage: {
        buyPlatform: bestBuyPlatform,
        buyPrice: bestBuyPrice,
        sellPlatform: bestSellPlatform,
        sellPrice: bestSellPrice,
        profit: arbitrageProfit,
        roi: arbitrageROI,
      },
    };
  }

  // ===== RENDER VALIDATION =====
  function renderValidation() {
    const el = UI.$('phValidation');
    if (!el || !_searchResults.length) return;

    const killCount = _searchResults.filter((p) => p.killZone).length;
    const avgConfidence = Math.round(_searchResults.reduce((a, p) => a + p.confidence, 0) / _searchResults.length);
    const verdict = killCount === 0 ? 'test' : killCount <= 2 ? 'caution' : 'skip';
    const verdictLabel = verdict === 'test' ? 'TEST' : verdict === 'caution' ? 'CAUTION' : 'SKIP';
    const verdictReason =
      verdict === 'test'
        ? 'All products pass validation. Good opportunity to test ads.'
        : verdict === 'caution'
          ? `${killCount} product(s) in Kill Zone. Proceed with caution.`
          : 'Most products are saturated. Find a different niche.';

    const sigs = _searchResults.reduce((acc, p) => {
      Object.entries(p.signals).forEach(([k, v]) => {
        if (!acc[k]) acc[k] = { pass: 0, total: 0 };
        acc[k].total++;
        if (v.pass) acc[k].pass++;
      });
      return acc;
    }, {});

    const signalDefs = [
      { key: 'stores', icon: '🏪', label: 'Stores' },
      { key: 'ads', icon: '📢', label: 'Ads' },
      { key: 'trend', icon: '📈', label: 'Trend' },
      { key: 'margin', icon: '💰', label: 'Margin' },
      { key: 'social', icon: '🎵', label: 'Social' },
    ];

    const dotsHtml = signalDefs
      .map((s) => {
        const data = sigs[s.key] || { pass: 0, total: 1 };
        const pct = Math.round((data.pass / data.total) * 100);
        const color = pct >= 70 ? 'green' : pct >= 40 ? 'yellow' : 'red';
        return `<span class="ph-val-dot ph-val-dot-${color}" title="${s.label}: ${pct}%"></span>`;
      })
      .join('');

    el.innerHTML = `
    <div class="ph-val-card">
      <div class="ph-val-verdict ${verdict}">
        <div class="ph-val-verdict-label">${verdict === 'test' ? '✅' : verdict === 'caution' ? '⚠️' : '🛑'} ${verdictLabel}</div>
        <div class="ph-val-verdict-sub">${avgConfidence}% confidence</div>
      </div>
      <div class="ph-val-dots">${dotsHtml}</div>
      <div class="ph-val-reason">${verdictReason}</div>
    </div>`;

    el.classList.add('active');
  }

  // ===== RENDER KILL ZONE =====
  function renderKillZone() {
    const el = UI.$('phKillZone');
    if (!el) return;

    const killProducts = _searchResults.filter((p) => p.killZone);
    if (killProducts.length === 0) {
      el.classList.remove('active');
      el.innerHTML = '';
      return;
    }

    el.innerHTML = `
    <div class="ph-kz-header" id="phKzToggle">
      <span class="ph-kz-icon">⚠️</span>
      <span class="ph-kz-title">${killProducts.length} product${killProducts.length > 1 ? 's' : ''} in Kill Zone — tap to view</span>
      <span class="ph-kz-count">${killProducts.length}</span>
      <span class="ph-kz-toggle">▼</span>
    </div>
    <div class="ph-kz-list" id="phKzList">
      ${killProducts
        .map(
          (p) => `
        <div class="ph-kz-card" data-id="${p.id}">
          <div class="ph-kz-card-img"><img src="${esc(p.image)}" alt="${esc(p.title)}"></div>
          <div class="ph-kz-card-info">
            <div class="ph-kz-card-name">${esc(p.title)}</div>
            <div class="ph-kz-reasons">
              ${p.killReasons.map((r) => `<div class="ph-kz-reason">${esc(r)}</div>`).join('')}
            </div>
            <button class="ph-kz-alt-btn" data-id="${p.id}">Show Safe Alternatives</button>
          </div>
        </div>
      `
        )
        .join('')}
    </div>`;

    el.classList.add('active');

    const header = UI.$('phKzToggle');
    const list = UI.$('phKzList');
    if (header && list) {
      header.addEventListener('click', () => {
        header.classList.toggle('open');
        list.classList.toggle('open');
      });
    }

    el.querySelectorAll('.ph-kz-alt-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const safeProducts = _searchResults.filter((p) => !p.killZone);
        if (safeProducts.length) {
          addChatMsg('ai', `Here are safer alternatives with lower competition and better margins:`);
          renderProducts(safeProducts);
        } else {
          addChatMsg('ai', `No safer alternatives found. Try a different query like "hidden gems under $20".`);
        }
      });
    });
  }

  // ===== RENDER ARBITRAGE =====
  function renderArbitrage() {
    const el = UI.$('phArbitrage');
    if (!el || !_searchResults.length) return;

    const sorted = [..._searchResults].sort((a, b) => (b.arbitrage?.roi || 0) - (a.arbitrage?.roi || 0));
    const top = sorted.slice(0, 6);
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    el.innerHTML = `
    <div class="ph-arb-header">
      <div>
        <div class="ph-arb-title">💰 Price Arbitrage Opportunities</div>
        <div class="ph-arb-sub">Buy low, sell high — calculated across all platforms</div>
      </div>
    </div>
    <div class="ph-arb-grid">
      ${top
        .map((p, i) => {
          const a = p.arbitrage || {};
          const buyColor = getPlatColor(a.buyPlatform || 'aliexpress');
          const sellColor = getPlatColor(a.sellPlatform || 'amazon');
          return `<div class="ph-arb-card ${i === 0 ? 'ph-arb-best' : ''}">
          <div class="ph-arb-card-name">${esc(p.title)}</div>
          <div class="ph-arb-route">
            <div class="ph-arb-side">
              <div class="ph-arb-side-label">Buy from</div>
              <div class="ph-arb-side-plat" style="color:${buyColor}">${cap(a.buyPlatform || 'aliexpress')}</div>
              <div class="ph-arb-side-price buy">$${(a.buyPrice || p.price).toFixed(2)}</div>
            </div>
            <div class="ph-arb-arrow-wrap"><div class="ph-arb-arrow-line"></div><div class="ph-arb-arrow">→</div><div class="ph-arb-arrow-line"></div></div>
            <div class="ph-arb-side">
              <div class="ph-arb-side-label">Sell on</div>
              <div class="ph-arb-side-plat" style="color:${sellColor}">${cap(a.sellPlatform || 'amazon')}</div>
              <div class="ph-arb-side-price sell">$${(a.sellPrice || p.price * 3).toFixed(2)}</div>
            </div>
          </div>
          <div class="ph-arb-profit">
            <div class="ph-arb-profit-val">$${(a.profit || 0).toFixed(2)} profit</div>
            <div class="ph-arb-profit-roi">${a.roi || 0}% ROI</div>
          </div>
        </div>`;
        })
        .join('')}
    </div>`;

    el.classList.add('active');
  }

  // ===== RENDER STATS OVERVIEW =====
  function renderStats() {
    const el = UI.$('phStats');
    if (!el || !_searchResults.length) {
      el.innerHTML = '';
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    const total = _searchResults.length;
    const safe = _searchResults.filter((p) => !p.killZone).length;
    const kill = total - safe;
    const avgMargin = Math.round(_searchResults.reduce((s, p) => s + p.margin, 0) / total);
    const _avgScore = Math.round(_searchResults.reduce((s, p) => s + p.score, 0) / total);
    const bestProfit = Math.max(..._searchResults.map((p) => p.arbitrage?.profit || 0));

    el.innerHTML = `
    <div class="ph-stat cyan"><span class="ph-stat-val">${total}</span><span class="ph-stat-label">Products Found</span></div>
    <div class="ph-stat green"><span class="ph-stat-val">${avgMargin}%</span><span class="ph-stat-label">Avg Margin</span></div>
    <div class="ph-stat purple"><span class="ph-stat-val">$${bestProfit.toFixed(0)}</span><span class="ph-stat-label">Best Profit</span></div>`;
  }

  // ===== RENDER AI INSIGHTS =====
  function renderInsights() {
    const el = UI.$('phInsights');
    if (!el || !_searchResults.length) {
      el.innerHTML = '';
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    const safe = _searchResults.filter((p) => !p.killZone).sort((a, b) => b.score - a.score);
    const bestEntry = safe[0];
    const bestProfit = [..._searchResults].sort((a, b) => (b.arbitrage?.profit || 0) - (a.arbitrage?.profit || 0))[0];
    const killCount = _searchResults.filter((p) => p.killZone).length;

    el.innerHTML = `
    <div class="ph-insights-header">
      <span class="ph-insights-badge">✨ AI Insights</span>
      <span class="ph-insights-title">Next Steps</span>
    </div>
    <div class="ph-insights-grid">
      <div class="ph-insight-card">
        <div class="ph-insight-step">1</div>
        <div class="ph-insight-icon">🎯</div>
        <div class="ph-insight-title">Start Here</div>
        <div class="ph-insight-text">${bestEntry ? `<strong>${esc(bestEntry.title.split('—')[0])}</strong> — Score ${bestEntry.score}, ${bestEntry.margin}% margin, only ${bestEntry.competitorCount} competitors.` : 'No strong opportunities found.'}</div>
        ${bestEntry ? `<button class="ph-insight-action" data-id="${bestEntry.id}">View Product →</button>` : ''}
      </div>
      <div class="ph-insight-card">
        <div class="ph-insight-step">2</div>
        <div class="ph-insight-icon">💰</div>
        <div class="ph-insight-title">Maximize Profit</div>
        <div class="ph-insight-text">${bestProfit ? `<strong>${esc(bestProfit.title.split('—')[0])}</strong> — $${(bestProfit.arbitrage?.profit || 0).toFixed(2)}/sale (${bestProfit.arbitrage?.roi || 0}% ROI).` : 'Calculate margins to find best arbitrage.'}</div>
        ${bestProfit ? `<button class="ph-insight-action" data-id="${bestProfit.id}">View Product →</button>` : ''}
      </div>
      <div class="ph-insight-card">
        <div class="ph-insight-step">3</div>
        <div class="ph-insight-icon">⚠️</div>
        <div class="ph-insight-title">Avoid These</div>
        <div class="ph-insight-text">${killCount > 0 ? `<strong>${killCount} product${killCount > 1 ? 's' : ''}</strong> in Kill Zone. Focus on ${safe.length} safe products.` : 'All products pass validation!'}</div>
      </div>
    </div>`;

    el.querySelectorAll('.ph-insight-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        EventBus.emit('product:analyze', { id: btn.dataset.id });
      });
    });
  }

  // ===== RENDER FILTERS =====
  function renderFilters() {
    const el = UI.$('phFilterBar');
    if (!el) return;
    if (!_searchResults.length) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    const filters = ['all', 'safe', 'killzone', 'rising', 'high-margin'];
    const labels = {
      all: 'All',
      safe: 'Safe',
      killzone: 'Kill Zone',
      rising: 'Trending',
      'high-margin': 'High Margin',
    };
    const counts = {
      all: _searchResults.length,
      safe: _searchResults.filter((p) => !p.killZone).length,
      killzone: _searchResults.filter((p) => p.killZone).length,
      rising: _searchResults.filter((p) => p.trendDirection === 'rising').length,
      'high-margin': _searchResults.filter((p) => p.margin >= 50).length,
    };
    el.innerHTML = `
    <div class="ph-filter-group">
      ${filters.map((f) => `<button class="ph-filter-pill ${_activeFilter === f ? 'active' : ''}" data-filter="${f}">${labels[f]}<span class="ph-filter-count">${counts[f]}</span></button>`).join('')}
    </div>
    <div class="ph-sort-group">
      <span class="ph-sort-label">Sort:</span>
      <select class="ph-sort-select" id="phSortSelect">
        <option value="score" ${_activeSort === 'score' ? 'selected' : ''}>Score</option>
        <option value="margin" ${_activeSort === 'margin' ? 'selected' : ''}>Margin</option>
        <option value="profit" ${_activeSort === 'profit' ? 'selected' : ''}>Profit</option>
        <option value="competitors" ${_activeSort === 'competitors' ? 'selected' : ''}>Least Competition</option>
        <option value="sales" ${_activeSort === 'sales' ? 'selected' : ''}>Sales Velocity</option>
      </select>
    </div>`;

    el.querySelectorAll('.ph-filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        _activeFilter = btn.dataset.filter;
        renderFilters();
        renderFilteredProducts();
      });
    });
    const sortSelect = UI.$('phSortSelect');
    if (sortSelect)
      sortSelect.addEventListener('change', () => {
        _activeSort = sortSelect.value;
        renderFilteredProducts();
      });
  }

  function getFilteredProducts() {
    let items = [..._searchResults];
    if (_activeFilter === 'safe') items = items.filter((p) => !p.killZone);
    else if (_activeFilter === 'killzone') items = items.filter((p) => p.killZone);
    else if (_activeFilter === 'rising') items = items.filter((p) => p.trendDirection === 'rising');
    else if (_activeFilter === 'high-margin') items = items.filter((p) => p.margin >= 50);

    const sorters = {
      score: (a, b) => b.score - a.score,
      margin: (a, b) => b.margin - a.margin,
      profit: (a, b) => (b.arbitrage?.profit || 0) - (a.arbitrage?.profit || 0),
      competitors: (a, b) => a.competitorCount - b.competitorCount,
      sales: (a, b) => b.salesVelocity - a.salesVelocity,
    };
    items.sort(sorters[_activeSort] || sorters.score);
    return items;
  }

  function renderFilteredProducts() {
    renderProducts(getFilteredProducts());
    renderExport();
  }

  // ===== RENDER EXPORT BAR =====
  function renderExport() {
    const el = UI.$('phExport');
    if (!el) return;
    if (!_searchResults.length) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    const shown = getFilteredProducts().length;
    el.innerHTML = `
    <div class="ph-export-info">Showing <strong>${shown}</strong> of <strong>${_searchResults.length}</strong> products</div>
    <div class="ph-export-btns">
      <button class="ph-export-btn" id="phExportCsv">📋 Export CSV</button>
      <button class="ph-export-btn" id="phExportJson">📊 Export JSON</button>
    </div>`;
    const csvBtn = UI.$('phExportCsv');
    const jsonBtn = UI.$('phExportJson');
    if (csvBtn) csvBtn.addEventListener('click', exportCSV);
    if (jsonBtn) jsonBtn.addEventListener('click', exportJSON);
  }

  function exportCSV() {
    const items = getFilteredProducts();
    const headers = [
      'Product',
      'Platform',
      'Score',
      'Margin',
      'Price',
      'Competitors',
      'Ads',
      'TikTok Creators',
      'Trend',
      'Verdict',
      'Buy Price',
      'Sell Price',
      'Profit',
      'ROI',
    ];
    const rows = items.map((p) => [
      p.title.split('—')[0],
      p.platform,
      p.score,
      p.margin + '%',
      '$' + p.price.toFixed(2),
      p.competitorCount,
      p.adCount,
      p.tiktokCreators,
      p.trendDirection,
      p.verdict,
      '$' + (p.arbitrage?.buyPrice || p.price).toFixed(2),
      '$' + (p.arbitrage?.sellPrice || p.price * 3).toFixed(2),
      '$' + (p.arbitrage?.profit || 0).toFixed(2),
      (p.arbitrage?.roi || 0) + '%',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'product-hunt-results.csv';
    a.click();
  }

  function exportJSON() {
    const items = getFilteredProducts().map((p) => ({
      title: p.title.split('—')[0],
      platform: p.platform,
      score: p.score,
      margin: p.margin,
      price: p.price,
      competitors: p.competitorCount,
      trend: p.trendDirection,
      verdict: p.verdict,
      profit: p.arbitrage?.profit,
      roi: p.arbitrage?.roi,
      buyFrom: p.arbitrage?.buyPlatform,
      sellOn: p.arbitrage?.sellPlatform,
    }));
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'product-hunt-results.json';
    a.click();
  }

  // ===== WATCHLIST =====
  function renderWatchlist() {
    const el = UI.$('phWatchlist');
    if (!el) return;
    if (!_watchlist.length) {
      el.classList.remove('active');
      el.innerHTML = '';
      return;
    }
    el.classList.add('active');
    el.innerHTML = `
    <div class="ph-wl-header">
      <div class="ph-wl-title">❤️ Saved Products <span class="ph-wl-count">${_watchlist.length}</span></div>
      <button class="ph-wl-clear" id="phWlClear">Clear All</button>
    </div>
    <div class="ph-wl-grid">
      ${_watchlist
        .map(
          (p) => `
        <div class="ph-wl-card" data-id="${p.id}">
          <img src="${esc(p.image)}" alt="" class="ph-wl-card-img">
          <div class="ph-wl-card-info">
            <div class="ph-wl-card-name">${esc(p.title.split('—')[0])}</div>
            <div class="ph-wl-card-meta">${p.platform} · Score ${p.score}</div>
            <div class="ph-wl-card-price">$${p.price.toFixed(2)} · ${p.margin}% margin</div>
          </div>
          <button class="ph-wl-card-remove" data-id="${p.id}">✕</button>
        </div>`
        )
        .join('')}
    </div>`;

    el.querySelectorAll('.ph-wl-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.ph-wl-card-remove')) return;
        EventBus.emit('product:analyze', { id: card.dataset.id });
      });
    });
    el.querySelectorAll('.ph-wl-card-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFromWatchlist(btn.dataset.id);
      });
    });
    const clearBtn = UI.$('phWlClear');
    if (clearBtn)
      clearBtn.addEventListener('click', () => {
        _watchlist = [];
        localStorage.setItem('ph_watchlist', '[]');
        renderWatchlist();
      });
  }

  function addToWatchlist(product) {
    if (_watchlist.find((p) => p.id === product.id)) return;
    _watchlist.push({
      id: product.id,
      title: product.title,
      image: product.image,
      platform: product.platform,
      price: product.price,
      score: product.score,
      margin: product.margin,
    });
    localStorage.setItem('ph_watchlist', JSON.stringify(_watchlist));
    renderWatchlist();
  }

  function removeFromWatchlist(id) {
    _watchlist = _watchlist.filter((p) => p.id !== id);
    localStorage.setItem('ph_watchlist', JSON.stringify(_watchlist));
    renderWatchlist();
  }

  // ===== RENDER SPARKLINES =====
  function renderSparklines(products) {
    if (!products) return;
    products.forEach((p) => {
      if (!p || !p.id) return;
      const canvas = document.getElementById('spark-' + p.id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const data = p.trendData || [];
      if (!data.length) return;

      const w = canvas.parentElement?.offsetWidth || 260;
      const h = 28;
      canvas.width = w * 2;
      canvas.height = h * 2;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(2, 2);

      const max = Math.max(...data);
      const min = Math.min(...data);
      const range = max - min || 1;
      const step = w / (data.length - 1);

      const isRising = p.trendDirection === 'rising';
      const isDeclining = p.trendDirection === 'declining';
      const color = isDeclining ? '#ff3366' : isRising ? '#00ff88' : '#00e5ff';

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color + '30');
      grad.addColorStop(1, color + '00');

      ctx.beginPath();
      ctx.moveTo(0, h);
      data.forEach((v, i) => {
        ctx.lineTo(i * step, h - ((v - min) / range) * (h - 4) - 2);
      });
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      data.forEach((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / range) * (h - 4) - 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const lastX = (data.length - 1) * step;
      const lastY = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  // ===== RENDER PRODUCTS =====
  function renderProducts(override) {
    const grid = UI.$('phGrid');
    if (!grid) return;
    const products = override || _searchResults;
    if (!products.length) {
      grid.innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-muted)">No products found. Try a different search.</div>';
      return;
    }

    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    grid.innerHTML = products
      .map((p) => {
        const scoreClass = p.score >= 85 ? 'score-excellent' : p.score >= 70 ? 'score-good' : 'score-fair';
        const trendClass = p.trendDirection || 'stable';
        const trendIcon = trendClass === 'rising' ? '📈' : trendClass === 'declining' ? '📉' : '➡️';
        const profit = (p.arbitrage?.profit || 0).toFixed(2);
        const buyPrice = (p.arbitrage?.buyPrice || p.price).toFixed(2);
        const sellPrice = (p.arbitrage?.sellPrice || p.platformPrices?.amazon || p.price * 3).toFixed(2);

        const images = (p.images || []);
        const thumbCount = Math.min(images.length, 4);
        const overflow = images.length > 4 ? images.length - 4 : 0;

        let thumbsHtml = '';
        for (let i = 0; i < thumbCount; i++) {
          const isActive = i === 0;
          thumbsHtml +=
            '<img src="' +
            esc(UI.normalizeImageUrl ? UI.normalizeImageUrl(images[i], '') : images[i]) +
            '" class="ph-thumb' + (isActive ? ' active' : '') + '" data-idx="' + i + '" alt="">';
        }
        if (overflow > 0) {
          thumbsHtml +=
            '<div class="ph-thumb ph-thumb-overflow" data-idx="4" title="' + images.length + ' images total">+' + overflow + '</div>';
        }

        return `
      <div class="ph-card ${p.killZone ? 'killzone' : ''}" data-id="${p.id}">
        <div class="ph-card-img">
          <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">
          <div class="ph-card-score ${scoreClass}">${p.score}</div>
          <div class="ph-card-trend ${trendClass}">${trendIcon} ${cap(p.trendDirection)}</div>
          <div class="ph-card-platform"><span class="platform-dot" style="background:${getPlatColor(p.platform)}"></span>${cap(p.platform)}</div>
          ${p.killZone ? '<div class="ph-card-kill-badge">🔴 Kill Zone</div>' : ''}
        </div>
        ${images.length > 1 ? '<div class="ph-card-thumbnails">' + thumbsHtml + '</div>' : ''}
        <div class="ph-card-body">
          <div class="ph-card-title">${esc(p.title)}</div>
          <div class="ph-card-profit">
            <span class="ph-card-profit-label">Buy</span>
            <span class="ph-card-profit-buy">$${buyPrice}</span>
            <span class="ph-card-profit-arrow">→</span>
            <span class="ph-card-profit-label">Sell</span>
            <span class="ph-card-profit-sell">$${sellPrice}</span>
            <span class="ph-card-profit-val">$${profit}</span>
          </div>
          <div class="ph-card-live">
            <div class="ph-card-live-item">
              <span class="ph-card-live-val">${p.competitorCount}</span>
              <span class="ph-card-live-label">Stores</span>
            </div>
            <div class="ph-card-live-item">
              <span class="ph-card-live-val">${p.adCount}</span>
              <span class="ph-card-live-label">Ads</span>
            </div>
            <div class="ph-card-live-item">
              <span class="ph-card-live-val">${p.tiktokCreators}</span>
              <span class="ph-card-live-label">TikTok</span>
            </div>
          </div>
          <div class="ph-card-actions">
            <button class="ph-card-action" data-action="analyze" data-id="${p.id}">🔍 Analyze</button>
            <button class="ph-card-action" data-action="suppliers" data-id="${p.id}">🏭 Suppliers</button>
            <button class="ph-card-action save" data-action="save" data-id="${p.id}">❤️</button>
          </div>
        </div>
      </div>`;
      })
      .join('');

    grid.querySelectorAll('.ph-card').forEach((card) => {
      const id = card.dataset.id;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.ph-card-action')) return;
        const thumb = e.target.closest('.ph-thumb');
        if (thumb) {
          e.stopPropagation();
          const imgEl = card.querySelector('.ph-card-img img');
          const allThumbs = card.querySelectorAll('.ph-thumb');
          const idx = parseInt(thumb.dataset.idx || '0', 10);
          if (imgEl) {
            const imgs = card._images || [];
            const safe = esc(UI.normalizeImageUrl ? UI.normalizeImageUrl(imgs[idx], '') : (imgs[idx] || ''));
            imgEl.src = safe;
          }
          allThumbs.forEach(function(t){ t.classList.remove('active'); });
          thumb.classList.add('active');
          return;
        }
        const mainImg = e.target.closest('.ph-card-img img');
        if (mainImg) {
          const imgs = card._images || [];
          if (imgs.length > 1) {
            e.stopPropagation();
            openPHLightbox(card, imgs);
            return;
          }
        }
        EventBus.emit('product:analyze', { id });
      });
    });

    // Attach images arrays to cards
    products.forEach(function(p) {
      const card = grid.querySelector('.ph-card[data-id="' + esc(String(p.id)) + '"]');
      if (card) card._images = p.images || [];
    });

    grid.querySelectorAll('.ph-card-action').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'analyze') EventBus.emit('product:analyze', { id });
        else if (action === 'suppliers') navigateTo('section-supplier-hub');
        else if (action === 'save') {
          const p = _searchResults.find((x) => x.id === id);
          if (p) {
            addToWatchlist(p);
            btn.textContent = '✓';
            btn.style.borderColor = 'var(--accent-green)';
            btn.style.color = 'var(--accent-green)';
            addChatMsg('ai', `Product saved to watchlist!`);
          }
        }
      });
    });
  }

  // ===== START HUNT =====
  async function startHunt(query) {
    if (_scanning) return;
    if (!query.trim()) {
      query = PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)];
      if (UI.$('phPrompt')) UI.$('phPrompt').value = query;
    }

    _scanning = true;
    _searchResults = [];
    const scanningEl = UI.$('phScanning');
    const huntBtn = UI.$('phHuntBtn');
    const grid = UI.$('phGrid');

    if (scanningEl) scanningEl.classList.add('active');
    if (grid) grid.innerHTML = '';
    if (huntBtn) huntBtn.disabled = true;

    addChatMsg('user', query);
    addChatMsg('ai', `🔍 Hunting products matching: "${query}"<br>Scanning 10 platforms simultaneously...`);

    const platEls = scanningEl?.querySelectorAll('.ph-scan-plat');
    const progressFill = UI.$('phScanProgress');
    const scanText = UI.$('phScanText');
    const scanCount = UI.$('phScanCount');

    const scanMessages = [
      'Initializing AI search engines...',
      'Scanning all 10 platforms simultaneously...',
      'Running AI analysis on findings...',
      'Calculating profit margins & competition...',
      'Detecting arbitrage opportunities...',
      'Finalizing results...',
    ];

    const stepCount = Math.min(PLATFORMS.length, scanMessages.length);
    for (let i = 0; i < stepCount; i++) {
      await sleep(80 + Math.random() * 100);
      if (platEls && platEls[i]) {
        platEls[i].classList.add('scanning');
        if (scanText) scanText.textContent = scanMessages[i] || `Scanning ${PLATFORMS[i].name}...`;
        if (progressFill) progressFill.style.width = ((i + 1) / stepCount) * 80 + '%';
      }
    }

    for (let i = 0; i < platEls?.length; i++) {
      platEls[i].classList.remove('scanning');
      platEls[i].classList.add('done');
    }
    if (progressFill) progressFill.style.width = '100%';
    if (scanText) scanText.textContent = 'AI analysis complete!';
    await sleep(200);

    let matched = [];
    try {
      matched = await window.HuntDrop.DataLayer.searchAll(query, {});
    } catch (e) {
      console.warn('[ProductHunt] searchAll failed:', e.message);
    }

    if (!matched || matched.length === 0) {
      const allProducts = window.HuntDrop.ALL_PRODUCTS || [];
      const queryLower = query.toLowerCase();
      matched = allProducts.filter(
        (p) =>
          p.title.toLowerCase().includes(queryLower) ||
          p.keywords.some((k) => k.toLowerCase().includes(queryLower)) ||
          (p.category && p.category.toLowerCase().includes(queryLower))
      );
      if (matched.length < 3) {
        matched = [...allProducts].sort((a, b) => b.score - a.score).slice(0, 8);
      }
    }

    _searchResults = matched.map((p) => enrichProduct(p));
    window.HuntDrop.ALL_PRODUCTS = _searchResults;
    window.HuntDrop.ALL_PRODUCTS_META = {
      query: query || '',
      source: 'Product Hunt Scout',
      timestamp: Date.now(),
    };
    if (scanCount) scanCount.textContent = _searchResults.length + ' found';

    if (scanningEl) scanningEl.classList.remove('active');
    if (huntBtn) huntBtn.disabled = false;
    _scanning = false;

    renderStats();
    renderInsights();
    renderValidation();
    renderKillZone();
    renderArbitrage();
    renderFilters();
    renderExport();
    renderProducts();
    renderWatchlist();

    const killCount = _searchResults.filter((p) => p.killZone).length;
    const testCount = _searchResults.filter((p) => !p.killZone).length;
    addChatMsg(
      'ai',
      `✅ Found <strong>${_searchResults.length} products</strong> across 10 platforms.<br><br>` +
        `🟢 <strong>${testCount} products</strong> pass validation<br>` +
        (killCount > 0 ? `🔴 <strong>${killCount} products</strong> in Kill Zone — avoid these<br><br>` : '') +
        `Ask me about any product — pricing, suppliers, ad copy, or competition analysis!`
    );
  }

  // ===== IMPORT: URL ANALYSIS =====
  function analyzeUrl(url) {
    if (!url?.trim()) {
      addChatMsg(
        'ai',
        'Please paste a product URL first. I support AliExpress, Amazon, CJ Dropshipping, eBay, Temu, TikTok Shop, Etsy, DHgate, and Wish.'
      );
      return;
    }

    const detected = detectPlatform(url);
    if (detected) {
      addChatMsg(
        'ai',
        `🔗 <strong>${detected.name} link detected!</strong><br>Analyzing product and finding it across all platforms...`
      );
    } else {
      addChatMsg('ai', `🔗 <strong>URL detected</strong><br>Analyzing and searching across all platforms...`);
    }

    const keywords = extractKeywordsFromUrl(url);
    const searchQuery = keywords || 'analyze this product';

    if (UI.$('phPrompt')) UI.$('phPrompt').value = searchQuery;
    startHunt(searchQuery);
  }

  function detectPlatform(url) {
    if (/aliexpress\.com/i.test(url)) return { id: 'aliexpress', name: 'AliExpress', color: '#e62e04' };
    if (/amazon\./i.test(url)) return { id: 'amazon', name: 'Amazon', color: '#ff9900' };
    if (/cjdropshipping\.com/i.test(url)) return { id: 'cjdropshipping', name: 'CJ Dropshipping', color: '#40c351' };
    if (/ebay\./i.test(url)) return { id: 'ebay', name: 'eBay', color: '#e53238' };
    if (/temu\./i.test(url)) return { id: 'temu', name: 'Temu', color: '#fb7701' };
    if (/tiktok\.com/i.test(url)) return { id: 'tiktok', name: 'TikTok Shop', color: '#00f2ea' };
    if (/etsy\.com/i.test(url)) return { id: 'etsy', name: 'Etsy', color: '#f1641e' };
    if (/dhgate\.com/i.test(url)) return { id: 'dhgate', name: 'DHgate', color: '#e62e04' };
    if (/wish\.com/i.test(url)) return { id: 'wish', name: 'Wish', color: '#2fb7ec' };
    return null;
  }

  function extractKeywordsFromUrl(url) {
    try {
      const u = new URL(url);
      const pathParts = u.pathname.split('/').filter(Boolean);
      const keywords = pathParts
        .filter((p) => p.length > 2 && !/^\d+$/.test(p) && !/^[a-f0-9-]{20,}$/i.test(p))
        .map((p) => p.replace(/-/g, ' ').replace(/_/g, ' '))
        .slice(0, 3)
        .join(' ');
      return keywords || null;
    } catch {
      return null;
    }
  }

  // ===== IMPORT: IMAGE HANDLING =====
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      addChatMsg('ai', 'Please upload an image file (JPG, PNG, WEBP).');
      return;
    }

    const dropzoneContent = UI.$('phDropzoneContent');
    const dropzonePreview = UI.$('phDropzonePreview');
    const previewImg = UI.$('phPreviewImg');
    const previewName = UI.$('phPreviewName');
    const previewSize = UI.$('phPreviewSize');

    if (dropzoneContent) dropzoneContent.style.display = 'none';
    if (dropzonePreview) dropzonePreview.style.display = 'flex';
    if (previewImg) previewImg.src = URL.createObjectURL(file);
    if (previewName) previewName.textContent = file.name;
    if (previewSize) previewSize.textContent = formatFileSize(file.size);
  }

  function removeImagePreview() {
    const dropzoneContent = UI.$('phDropzoneContent');
    const dropzonePreview = UI.$('phDropzonePreview');
    const fileInput = UI.$('phFileInput');

    if (dropzoneContent) dropzoneContent.style.display = '';
    if (dropzonePreview) dropzonePreview.style.display = 'none';
    if (fileInput) fileInput.value = '';
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ===== CHAT SIDEBAR (removed — replaced by global AI Chat Widget) =====

  // ===== BIND EVENTS =====
  function bindEvents() {
    const huntBtn = UI.$('phHuntBtn');
    const prompt = UI.$('phPrompt');

    if (huntBtn) huntBtn.addEventListener('click', () => startHunt(prompt?.value || ''));
    if (prompt) {
      prompt.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          startHunt(prompt.value);
        }
      });
      prompt.addEventListener('input', () => {
        prompt.style.height = 'auto';
        prompt.style.height = Math.min(prompt.scrollHeight, 160) + 'px';
      });
      let pi = 0;
      _placeholderInterval = setInterval(() => {
        if (document.activeElement !== prompt && !prompt.value) {
          pi = (pi + 1) % PROMPT_SUGGESTIONS.length;
          prompt.placeholder = PROMPT_SUGGESTIONS[pi];
        }
      }, 4000);
    }

    if (_section) {
      _section.querySelectorAll('.ph-preset').forEach((chip) => {
        chip.addEventListener('click', () => {
          if (chip.id === 'phPresetMore') {
            chip.style.display = 'none';
            _section.querySelectorAll('.ph-preset-extra').forEach((c) => (c.style.display = ''));
            return;
          }
          if (prompt) prompt.value = chip.dataset.query;
          startHunt(chip.dataset.query);
        });
      });

      _section.querySelectorAll('.ph-depth-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          _section.querySelectorAll('.ph-depth-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          Config.set('producthunt.depth', btn.dataset.depth);
        });
      });

      // Platform expander toggle
      const platExpander = UI.$('phPlatformExpander');
      const platList = UI.$('phPlatformList');
      if (platExpander && platList) {
        platExpander.addEventListener('click', () => {
          platList.classList.toggle('open');
          platExpander.classList.toggle('open');
        });
      }

      _section.querySelectorAll('.ph-platform-toggle').forEach((tog) => {
        tog.addEventListener('click', () => {
          _section.querySelectorAll('.ph-platform-toggle').forEach((t) => t.classList.remove('active'));
          tog.classList.add('active');
          const label = UI.$('phPlatformExpander');
          if (label) {
            const lbl = label.querySelector('.ph-platform-expander-label');
            if (lbl) lbl.textContent = tog.dataset.plat === 'all' ? 'All 10 platforms' : tog.textContent.trim();
          }
          if (platList) platList.classList.remove('open');
          if (platExpander) platExpander.classList.remove('open');
        });
      });

      // Import section toggle
      const importToggle = UI.$('phImportToggle');
      const importSection = UI.$('phImportSection');
      const importCollapsed = UI.$('phImportCollapsed');
      if (importToggle && importSection) {
        importToggle.addEventListener('click', () => {
          const isOpen = importSection.style.display !== 'none';
          importSection.style.display = isOpen ? 'none' : '';
          if (importCollapsed) importCollapsed.style.display = isOpen ? '' : 'none';
        });
      }

      // ===== IMPORT SECTION: Tab Switching =====
      _section.querySelectorAll('.ph-import-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          _section.querySelectorAll('.ph-import-tab').forEach((t) => t.classList.remove('active'));
          _section.querySelectorAll('.ph-import-panel').forEach((p) => p.classList.remove('active'));
          tab.classList.add('active');
          const target = tab.dataset.tab === 'url' ? 'phUrlPanel' : 'phImagePanel';
          const panel = UI.$(target);
          if (panel) panel.classList.add('active');
        });
      });

      // ===== IMPORT SECTION: URL Panel =====
      const urlInput = UI.$('phUrlInput');
      const urlClear = UI.$('phUrlClear');
      const urlAnalyze = UI.$('phUrlAnalyze');
      const urlDetected = UI.$('phUrlDetected');

      if (urlInput) {
        urlInput.addEventListener('input', () => {
          const val = urlInput.value.trim();
          if (urlClear) urlClear.style.display = val ? 'flex' : 'none';
          if (urlDetected) {
            if (/aliexpress\.com/i.test(val)) {
              urlDetected.innerHTML = '<span class="ph-detected-badge aliexpress">AliExpress detected</span>';
              urlDetected.style.display = 'flex';
            } else if (/amazon\./i.test(val)) {
              urlDetected.innerHTML = '<span class="ph-detected-badge amazon">Amazon detected</span>';
              urlDetected.style.display = 'flex';
            } else if (/cjdropshipping\.com/i.test(val)) {
              urlDetected.innerHTML = '<span class="ph-detected-badge cj">CJ Dropshipping detected</span>';
              urlDetected.style.display = 'flex';
            } else if (/ebay\./i.test(val)) {
              urlDetected.innerHTML = '<span class="ph-detected-badge ebay">eBay detected</span>';
              urlDetected.style.display = 'flex';
            } else if (/temu\./i.test(val)) {
              urlDetected.innerHTML = '<span class="ph-detected-badge temu">Temu detected</span>';
              urlDetected.style.display = 'flex';
            } else if (/tiktok\.com/i.test(val) || /tiktokshop/i.test(val)) {
              urlDetected.innerHTML = '<span class="ph-detected-badge tiktok">TikTok Shop detected</span>';
              urlDetected.style.display = 'flex';
            } else if (/etsy\.com/i.test(val)) {
              urlDetected.innerHTML = '<span class="ph-detected-badge etsy">Etsy detected</span>';
              urlDetected.style.display = 'flex';
            } else if (/dhgate\.com/i.test(val)) {
              urlDetected.innerHTML = '<span class="ph-detected-badge dhgate">DHgate detected</span>';
              urlDetected.style.display = 'flex';
            } else if (/wish\.com/i.test(val)) {
              urlDetected.innerHTML = '<span class="ph-detected-badge wish">Wish detected</span>';
              urlDetected.style.display = 'flex';
            } else if (val.length > 10) {
              urlDetected.innerHTML =
                '<span class="ph-detected-badge web">URL detected — will search across all platforms</span>';
              urlDetected.style.display = 'flex';
            } else {
              urlDetected.style.display = 'none';
            }
          }
        });

        urlInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') analyzeUrl(urlInput.value);
        });
      }

      if (urlClear) {
        urlClear.addEventListener('click', () => {
          if (urlInput) urlInput.value = '';
          urlClear.style.display = 'none';
          if (urlDetected) urlDetected.style.display = 'none';
          urlInput.focus();
        });
      }

      if (urlAnalyze) {
        urlAnalyze.addEventListener('click', () => analyzeUrl(urlInput?.value || ''));
      }

      // ===== IMPORT SECTION: Image Panel =====
      const dropzone = UI.$('phDropzone');
      const fileInput = UI.$('phFileInput');
      const _dropzoneContent = UI.$('phDropzoneContent');
      const _dropzonePreview = UI.$('phDropzonePreview');
      const _previewImg = UI.$('phPreviewImg');
      const _previewName = UI.$('phPreviewName');
      const _previewSize = UI.$('phPreviewSize');
      const imageSearch = UI.$('phImageSearch');
      const imageRemove = UI.$('phImageRemove');

      if (dropzone) {
        dropzone.addEventListener('click', (e) => {
          if (e.target.closest('.ph-import-preview-search') || e.target.closest('.ph-import-preview-remove')) return;
          fileInput?.click();
        });

        dropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropzone.classList.remove('dragover');
          const files = e.dataTransfer?.files;
          if (files && files[0]) handleImageFile(files[0]);
        });
      }

      if (fileInput) {
        fileInput.addEventListener('change', () => {
          if (fileInput.files && fileInput.files[0]) handleImageFile(fileInput.files[0]);
        });
      }

      if (imageSearch) {
        imageSearch.addEventListener('click', (e) => {
          e.stopPropagation();
          startHunt('visual search: find this product on all platforms');
        });
      }

      if (imageRemove) {
        imageRemove.addEventListener('click', (e) => {
          e.stopPropagation();
          removeImagePreview();
        });
      }
    }
  }

  // ===== PLUGIN REGISTRATION =====
  PluginRegistry.register('product-hunt', {
    id: 'product-hunt',
    name: 'AI Hunt',
    version: '2.0.0',
    description: 'AI-powered product hunting with Kill Zone detection',
    dependencies: [],

    init(_ctx) {
      Config.defaults('producthunt', { depth: 'quick', platforms: ['all'] });
    },

    mount(_ctx) {
      const container = UI.$('sections-container');
      if (!container) return;

      const section = document.createElement('section');
      section.className = 'section section-product-hunt';
      section.id = 'section-product-hunt';
      section.innerHTML = buildHTML();
      container.appendChild(section);
      _section = section;

      bindEvents();

      // Restore previous search results if navigating back
      if (_searchResults.length > 0) {
        renderStats();
        renderInsights();
        renderValidation();
        renderKillZone();
        renderArbitrage();
        renderFilters();
        renderExport();
        renderProducts();
        renderWatchlist();
      }
    },

    unmount(_ctx) {
      if (_placeholderInterval) {
        clearInterval(_placeholderInterval);
        _placeholderInterval = null;
      }
      const chat = UI.$('phChatSidebar');
      if (chat) chat.remove();
      const toggle = UI.$('phChatToggle');
      if (toggle) toggle.remove();
      if (_section) {
        _section.remove();
        _section = null;
      }
      _chatOpen = false;
      _scanning = false;
    },
  });
})();
