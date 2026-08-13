// ============================================================================
// PLUGIN: Supplier Hub v3.0 — Mission Control Supplier Intelligence
// Upgrades: Velocity Engine, Deep Sourcing, Fulfillment Test, Profit Integrator,
//           Negotiation Bot, Watchlist, DNA Profile
// ============================================================================
(function () {
  'use strict';
  const { PluginRegistry, UI, EventBus, Config, Logger } = window.HuntDrop;
  const esc = (s) => UI.escapeHtml(String(s || ''));

  // ===== CONFIG DEFAULTS =====
  try {
    Config.defaults('supplierHub', {
      velocityScoring: true,
      deepSearchEnabled: false,
      watchlistEnabled: true,
      targetCountry: 'US',
      negotiationEnabled: true,
      shippingIntelEnabled: true,
    });
  } catch (_) {}

  // ===== BACKEND URL =====
  const BACKEND_URL =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? '/api'
      : window.HuntDrop.BACKEND_URL ||
        (window.HuntDrop._proxyUrl
          ? window.HuntDrop._proxyUrl.replace(/\/api\/platform\/?$/, '/api')
          : 'https://backend-psi-five-60.vercel.app/api');

  // ===== STATE =====
  let _section = null;
  let _suppliers = [];
  let _searching = false;
  let _activeFilter = 'all';
  let _currentQuery = '';
  let _velocityData = {};
  let _shippingData = {};

  // ===== LOCALSTORAGE KEYS =====
  const LS_CHECKLIST = 'huntdrop_supplier_checklist';
  const LS_WATCHLIST = 'huntdrop_watchlist';
  const LS_COUNTRY = 'huntdrop_target_country';
  const LS_NEGOTIATIONS = 'huntdrop_negotiations';

  let _targetCountry = localStorage.getItem(LS_COUNTRY) || 'US';

  // ===== UTILITIES =====
  function _formatMoney(n) {
    return '$' + (n || 0).toFixed(2);
  }
  function _parseNum(v) {
    return parseInt(String(v).replace(/[^0-9]/g, '')) || 0;
  }
  function _debounce(fn, ms) {
    let t;
    return function () {
      const a = arguments,
        c = this;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(c, a);
      }, ms);
    };
  }
  function _lsGet(key, def) {
    try {
      return JSON.parse(localStorage.getItem(key)) || def;
    } catch (_) {
      return def;
    }
  }
  function _lsSet(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (_) {}
  }
  function _toast(msg, type) {
    if (UI.toast) UI.toast(msg, type || 'info');
  }

  // ========================================================================
  // MODULE 1: SCORING ENGINE
  // ========================================================================

  function computeVelocityScore(s) {
    if (!s) return 0;
    const v = s.velocityData || {};
    let score = 0;
    const g30 = v.salesGrowth30d || 0;
    if (g30 > 20) score += 25;
    else if (g30 > 10) score += 15;
    else if (g30 > 0) score += 5;
    if (v.ratingTrend === 'up') score += 15;
    else if (v.ratingTrend === 'stable') score += 5;
    if ((v.newProducts30d || 0) > 5) score += 10;
    else if ((v.newProducts30d || 0) > 2) score += 5;
    if (v.responseTimeTrend === 'faster') score += 10;
    else if (v.responseTimeTrend === 'stable') score += 3;
    return Math.min(score, 60);
  }

  function computeScore(s) {
    if (!s) return 0;
    const q = s.quality || 0;
    const c = s.communication || 0;
    const v = s.value || 0;
    const base = Math.round(q * 0.3 + c * 0.3 + v * 0.4);
    const velBonus = computeVelocityScore(s);
    const boosted = base + Math.round((base * velBonus) / 600);
    return Math.min(boosted, 100);
  }

  function getRiskLevel(s) {
    if (!s) return { level: 'LOW', color: 'var(--sh-aurora)', pct: 0 };
    let risk = 0;
    if (!s.verified) risk += 30;
    if ((s.rating || 5) < 4.5) risk += 15;
    if ((s.disputeRate || 0) > 1.5) risk += 20;
    if ((s.responseRate || 100) < 90) risk += 15;
    const o = _parseNum(s.orders);
    if (o > 0 && o < 50000) risk += 10;
    if (risk > 40) return { level: 'HIGH', color: 'var(--sh-solar)', pct: risk };
    if (risk > 20) return { level: 'MEDIUM', color: '#FFD700', pct: risk };
    return { level: 'LOW', color: 'var(--sh-aurora)', pct: risk };
  }

  function getGrade(score) {
    if (score >= 90) return { grade: 'A+', color: 'var(--sh-aurora)' };
    if (score >= 80) return { grade: 'A', color: 'var(--sh-aurora)' };
    if (score >= 70) return { grade: 'B+', color: 'var(--sh-nebula)' };
    if (score >= 60) return { grade: 'B', color: 'var(--sh-nebula)' };
    if (score >= 50) return { grade: 'C', color: '#FFD700' };
    return { grade: 'D', color: 'var(--sh-solar)' };
  }

  function getVelocityBadge(s) {
    const vs = computeVelocityScore(s);
    if (vs >= 45) return { text: 'Rising Star', cls: 'rising', icon: '\uD83D\uDE80' };
    if (vs >= 30) return { text: 'Growing', cls: 'growing', icon: '\uD83D\uDCC8' };
    if (vs >= 15) return { text: 'Fast', cls: 'fast', icon: '\u26A1' };
    return null;
  }

  // ========================================================================
  // MODULE 2: SHIPPING INTELLIGENCE
  // ========================================================================

  const _shipCache = new Map();
  const SHIP_CACHE_TTL = 14400000;

  const CUSTOMS_DELAYS = {
    US: { min: 1, max: 3 },
    UK: { min: 1, max: 2 },
    AU: { min: 2, max: 5 },
    DE: { min: 0, max: 2 },
    FR: { min: 1, max: 2 },
    CA: { min: 1, max: 3 },
    JP: { min: 1, max: 3 },
    BR: { min: 3, max: 7 },
    IN: { min: 2, max: 5 },
    default: { min: 2, max: 7 },
  };

  function getCustomsDelay(country) {
    return CUSTOMS_DELAYS[country] || CUSTOMS_DELAYS.default;
  }

  function calculateShipConfidence(s, country) {
    const orders = _parseNum(s.orders);
    const byCountry = (s.ordersByCountry && s.ordersByCountry[country]) || 0;
    const total = orders + byCountry;
    if (byCountry > 1000 || total > 10000) return 0.95;
    if (byCountry > 500 || total > 5000) return 0.85;
    if (byCountry > 100 || total > 1000) return 0.7;
    return 0.5;
  }

  async function getRealDeliveryTime(supplier, country) {
    const key = (supplier.id || supplier.name) + '-' + country;
    const cached = _shipCache.get(key);
    if (cached && Date.now() - cached.ts < SHIP_CACHE_TTL) return cached.data;

    const shipTime = supplier.shipTime || '7-14';
    const parts = shipTime.split('-').map(Number);
    const baseMin = parts[0] || 7;
    const baseMax = parts[1] || 14;
    const customs = getCustomsDelay(country);
    const bestCase = baseMin + customs.min;
    const worstCase = baseMax + customs.max;
    const confidence = calculateShipConfidence(supplier, country);
    const result = {
      bestCase,
      worstCase,
      average: Math.round((bestCase + worstCase) / 2),
      confidence,
      supplierClaim: shipTime,
    };
    _shipCache.set(key, { data: result, ts: Date.now() });
    return result;
  }

  // ========================================================================
  // MODULE 3: PROFIT INTEGRATOR
  // ========================================================================

  function calculateProfitPotential(supplier, productName) {
    const cost = parseFloat(supplier.price) || 0;
    let marketPrice = 0;
    let lowestCompetitor = 0;

    try {
      const spyPlugin = PluginRegistry.get('spy-center');
      if (spyPlugin && spyPlugin.getMarketPrice) {
        const mp = spyPlugin.getMarketPrice(productName);
        if (mp) marketPrice = mp;
      }
    } catch (_) {}
    try {
      const mgPlugin = PluginRegistry.get('market-gap-finder');
      if (mgPlugin && mgPlugin.getCompetitorPrices) {
        const cp = mgPlugin.getCompetitorPrices(productName);
        if (cp && cp.length) lowestCompetitor = Math.min(...cp.map(Number).filter(Boolean));
      }
    } catch (_) {}

    if (!marketPrice && cost > 0) marketPrice = cost * 3.5;
    if (!lowestCompetitor) lowestCompetitor = marketPrice * 0.85;

    const shipping = parseFloat(String(supplier.shipCost).replace(/[^0-9.]/g, '')) || 0;
    const profitAtAvg = marketPrice - cost - shipping;
    const profitAtLowest = lowestCompetitor - cost - shipping;
    const marginAtAvg = marketPrice > 0 ? (profitAtAvg / marketPrice) * 100 : 0;
    const hiddenCosts = profitAtAvg * 0.15;
    const netProfit = profitAtAvg - hiddenCosts;

    return {
      supplierCost: cost,
      marketPrice,
      lowestCompetitor,
      profitAtAvg: Math.max(profitAtAvg, 0),
      profitAtLowest: Math.max(profitAtLowest, 0),
      marginAtAvg: Math.max(marginAtAvg, 0),
      netProfit: Math.max(netProfit, 0),
      isViable: netProfit > 5,
    };
  }

  // ========================================================================
  // MODULE 4: WATCHLIST
  // ========================================================================

  function getWatchlist() {
    return _lsGet(LS_WATCHLIST, []);
  }
  function setWatchlist(wl) {
    _lsSet(LS_WATCHLIST, wl);
  }
  function isWatched(id) {
    return getWatchlist().some(function (w) {
      return w.supplierId === id;
    });
  }

  function toggleWatch(supplier) {
    const wl = getWatchlist();
    const idx = wl.findIndex(function (w) {
      return w.supplierId === supplier.name;
    });
    if (idx >= 0) {
      wl.splice(idx, 1);
      _toast('Removed from watchlist', 'info');
    } else {
      wl.push({
        supplierId: supplier.name,
        platform: supplier.platform,
        addedAt: Date.now(),
        lastData: { price: supplier.price, rating: supplier.rating, orders: supplier.orders },
      });
      _toast('Added to watchlist', 'success');
    }
    setWatchlist(wl);
    renderWatchlist();
    updateCardsWatchState();
  }

  function updateCardsWatchState() {
    if (!_section) return;
    _section.querySelectorAll('.sh-card-watch-btn').forEach(function (btn) {
      const name = btn.dataset.supplier;
      if (isWatched(name)) {
        btn.classList.add('watching');
        btn.textContent = 'Watching';
      } else {
        btn.classList.remove('watching');
        btn.textContent = 'Watch';
      }
    });
  }

  // ========================================================================
  // MODULE 5: NEGOTIATION BOT
  // ========================================================================

  var NEGO_STATUSES = {
    PENDING: 'pending',
    REPLIED: 'replied',
    COUNTERED: 'countered',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
  };
  var NEGO_STATUS_LABELS = {
    pending: 'Awaiting Reply',
    replied: 'Supplier Replied',
    countered: 'Counter-Offer Sent',
    accepted: 'Deal Accepted',
    rejected: 'Declined',
  };
  var NEGO_STATUS_COLORS = {
    pending: '#FFD700',
    replied: 'var(--sh-nebula)',
    countered: 'var(--sh-cosmic)',
    accepted: 'var(--sh-aurora)',
    rejected: 'var(--sh-solar)',
  };

  function getNegotiations() {
    return _lsGet(LS_NEGOTIATIONS, []);
  }
  function setNegotiations(n) {
    _lsSet(LS_NEGOTIATIONS, n);
  }

  function getActiveNego(supplierName) {
    return (
      getNegotiations().find(function (n) {
        return n.supplierId === supplierName;
      }) || null
    );
  }

  function getNegoTemplate(type, supplier, product) {
    var qty = 100;
    var name = supplier.name || 'Supplier';
    var price = supplier.price || 'N/A';
    var prod = product || (supplier.topProducts && supplier.topProducts[0]) || 'your product';
    if (type === 'firstContact') {
      return (
        'Hi ' +
        name +
        ",\n\nI'm interested in ordering " +
        qty +
        ' units of ' +
        prod +
        ' per month.\n\nYour current price is ' +
        price +
        ". Could you offer a better price for consistent monthly orders?\n\nI'm also looking for:\n- Faster shipping options\n- Private labeling possibilities\n\nLooking forward to your response!"
      );
    }
    if (type === 'followUp') {
      return (
        'Hi ' +
        name +
        ",\n\nFollowing up on our previous conversation. I'm ready to place a test order this week if we can agree on pricing.\n\nCan you do a better rate for " +
        qty +
        ' units monthly?\n\nThanks!'
      );
    }
    if (type === 'bulkPricing') {
      return (
        'Hi ' +
        name +
        ",\n\nI'd like to discuss bulk pricing for " +
        prod +
        ".\n\nI'm looking at ordering:\n- 100 units/month for the first 3 months\n- 250+ units/month after that\n\nWhat kind of discount can you offer for this volume? My target is around $" +
        (parseFloat(String(price).replace(/[^0-9.]/g, '')) * 0.7 || 'X.XX') +
        ' per unit.\n\nBest regards!'
      );
    }
    if (type === 'shippingNegotiate') {
      return (
        'Hi ' +
        name +
        ',\n\nYour product ' +
        prod +
        ' looks great, but the shipping time of ' +
        (supplier.shipTime || 'N/A') +
        ' days is a concern for my customers.\n\nCan you offer:\n1. expedited shipping at a reasonable cost?\n2. a shipping discount for bulk orders?\n3. ship from a local warehouse (US/EU) if available?\n\nWhat options do you have?'
      );
    }
    if (type === 'privateLabel') {
      return (
        'Hi ' +
        name +
        ",\n\nI'm interested in private labeling " +
        prod +
        " with my brand.\n\nCould you provide:\n- MOQ for custom branding?\n- Cost per unit with my logo/packaging?\n- Sample lead time?\n\nI'm looking to build a long-term partnership. Looking forward to your reply!"
      );
    }
    return '';
  }

  function extractPriceOffers(text) {
    if (!text) return [];
    var matches = text.match(/\$[\d,.]+/g);
    return matches
      ? matches
          .map(function (m) {
            return parseFloat(m.replace(/[$,]/g, ''));
          })
          .filter(Boolean)
      : [];
  }

  function getBestOffer(nego) {
    if (!nego || !nego.messages) return null;
    var offers = [];
    nego.messages.forEach(function (m) {
      if (m.from === 'supplier') {
        var prices = extractPriceOffers(m.text);
        prices.forEach(function (p) {
          offers.push({ price: p, ts: m.ts });
        });
      }
    });
    return offers.length ? offers[offers.length - 1] : null;
  }

  function simulateSupplierReply(userText, supplier) {
    var price = parseFloat(String(supplier.price || '20').replace(/[^0-9.]/g, ''));
    var lowerText = userText.toLowerCase();
    var isCounter = lowerText.match(/\$[\d,.]+/) || lowerText.includes('counter') || lowerText.includes('target');
    var isBulk =
      lowerText.includes('bulk') ||
      lowerText.includes('quantity') ||
      lowerText.includes('100') ||
      lowerText.includes('250');
    var isShipping = lowerText.includes('shipping') || lowerText.includes('delivery');
    var isPrivateLabel =
      lowerText.includes('private label') || lowerText.includes('brand') || lowerText.includes('logo');
    var isFollowUp = lowerText.includes('following up') || lowerText.includes('follow up');

    if (isPrivateLabel) {
      return 'Thanks for your interest in private labeling! For custom branding:\n- MOQ: 500 units\n- Additional $1.50/unit for custom packaging\n- Sample with your logo: $50 (reimbursed on first order)\n- Lead time: 7-10 days for samples, 15-20 for bulk\n\nShall I send you our branding catalog?';
    }
    if (isShipping) {
      return (
        'Good question! We offer:\n1. Standard: ' +
        (supplier.shipTime || '7-14') +
        ' days (free over $500)\n2. Express: 3-5 days (+$3.50/unit)\n3. Local warehouse (US): 2-4 days (+$2.00/unit)\n\nFor orders over 200 units, express shipping is discounted to $2.00/unit. Would any of these work for you?'
      );
    }
    if (isBulk) {
      var bulkPrice = (price * 0.82).toFixed(2);
      var bulkPrice2 = (price * 0.75).toFixed(2);
      return (
        "We can definitely discuss bulk pricing! Here's what we offer:\n- 100 units: $" +
        bulkPrice +
        '/unit (18% off)\n- 250 units: $' +
        bulkPrice2 +
        "/unit (25% off)\n- 500+ units: Let's schedule a call to discuss custom pricing\n\nThese rates include free standard shipping. Interested in any tier?"
      );
    }
    if (isFollowUp) {
      return "Thanks for following up! I've checked with our pricing team. We can offer:\n- 15% off for 100 units/month\n- Free shipping for first 3 months\n- Dedicated account manager\n\nWould you like to proceed with a test order?";
    }
    if (isCounter) {
      var counterPrice = (price * 0.88).toFixed(2);
      return (
        'I appreciate your offer. The best I can do is $' +
        counterPrice +
        '/unit. This includes:\n- Quality inspection\n- Individual packaging\n- Tracking number\n\nThis is a special price for committed partners. Shall we proceed?'
      );
    }
    return "Thanks for your interest! We can discuss better pricing for bulk orders. Please let us know your target quantity and preferred terms. We're flexible for long-term partnerships.";
  }

  // ========================================================================
  // MODULE 6: DEEP SOURCING
  // ========================================================================

  async function deepSearchSuppliers(query) {
    try {
      const resp = await fetch(BACKEND_URL + '/suppliers/deep-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query }),
      });
      if (!resp.ok) throw new Error('Deep search failed');
      const data = await resp.json();
      return data.suppliers || [];
    } catch (e) {
      Logger.warn('Deep search unavailable', e, 'SupplierHub');
      return [];
    }
  }

  // ========================================================================
  // MODULE 7: DNA PROFILE GENERATOR
  // ========================================================================

  function generateSupplierDNA(supplier) {
    const score = computeScore(supplier);
    const risk = getRiskLevel(supplier);
    const grade = getGrade(score);
    const velocity = computeVelocityScore(supplier);
    return {
      identity: {
        name: supplier.name,
        platform: supplier.platform,
        location: supplier.location,
        specialty: supplier.specialty || 'General',
        yearsActive: supplier.yearsActive || 0,
        verified: supplier.verified,
        color: supplier.color || '#667eea',
      },
      performance: {
        score: score,
        grade: grade,
        risk: risk,
        velocity: velocity,
        quality: supplier.quality || 0,
        communication: supplier.communication || 0,
        value: supplier.value || 0,
        responseRate: supplier.responseRate || 0,
        fulfillmentRate: supplier.fulfillmentRate || 0,
        disputeRate: supplier.disputeRate || 0,
        rating: supplier.rating || 0,
        velocityData: supplier.velocityData || {},
      },
      products: {
        topProducts: supplier.topProducts || [],
        count: (supplier.topProducts || []).length,
        categories: supplier.specialty ? [supplier.specialty] : [],
      },
      shipping: {
        shipTime: supplier.shipTime || 'N/A',
        shipCost: supplier.shipCost || 'N/A',
        minOrder: supplier.minOrder || 'N/A',
        paymentTerms: supplier.paymentTerms || 'N/A',
      },
      market: {
        priceTier: (supplier.value || 50) >= 70 ? 'budget' : (supplier.value || 50) >= 40 ? 'mid' : 'premium',
        orders: _parseNum(supplier.orders),
        yearsActive: supplier.yearsActive || 0,
      },
      risks: {
        verified: supplier.verified,
        disputeRate: supplier.disputeRate || 0,
        responseRate: supplier.responseRate || 100,
        refundRate: supplier.refundRate || 0,
      },
      capabilities: {
        sampleAvailable: supplier.sampleAvailable || false,
        customPackaging: supplier.customPackaging || false,
        dropshipSupport: supplier.dropshipSupport || false,
      },
    };
  }

  // ========================================================================
  // MODULE 8: CHECKLIST (localStorage persistence)
  // ========================================================================

  function getCheckedItems() {
    return _lsGet(LS_CHECKLIST, {});
  }
  function setCheckedItem(id, checked) {
    const items = getCheckedItems();
    if (checked) items[id] = true;
    else delete items[id];
    _lsSet(LS_CHECKLIST, items);
    updateChecklistProgress();
  }
  function updateChecklistProgress() {
    if (!_section) return;
    var el = _section.querySelector('#shCheckProgress');
    var cnt = _section.querySelector('#shCheckCount');
    if (!el || !cnt) return;
    var done = Object.keys(getCheckedItems()).length;
    var total = 10;
    el.style.width = Math.round((done / total) * 100) + '%';
    cnt.textContent = done + '/' + total;
  }

  // ========================================================================
  // UI RENDERERS
  // ========================================================================

  // --- Search Hero ---
  function renderHero() {
    return (
      '<div class="sh-hero">' +
      '<div class="sh-hero-badge"><span class="sh-hero-badge-dot"></span>Supplier Intelligence</div>' +
      '<div class="sh-hero-top">' +
      '<div class="sh-hero-title">Supplier Intelligence Hub</div>' +
      '<p class="sh-hero-sub">Search the web for suppliers \u2014 AI analysis, velocity scoring, profit calculation & more</p>' +
      '</div>' +
      '<div class="sh-search-bar" id="shSearchBar">' +
      '<div class="sh-search-icon">\uD83D\uDD0D</div>' +
      '<input type="text" id="shSearchInput" class="sh-search-input" placeholder="Search suppliers by name, product, or keyword..." aria-label="Search for suppliers" />' +
      '<div class="sh-search-divider"></div>' +
      '<button class="sh-search-action-btn" id="shPasteLinkBtn" title="Paste a product link">\uD83D\uDD17</button>' +
      '<button class="sh-search-action-btn" id="shImageSearchBtn" title="Search by image (drag, paste, or upload)">\uD83D\uDCF7</button>' +
      '<button id="shSearchBtn" class="sh-search-btn">Find Suppliers</button>' +
      '</div>' +
      '<div class="sh-search-dropzone" id="shDropzone" style="display:none">' +
      '<div class="sh-dropzone-content">' +
      '<div class="sh-dropzone-icon">\uD83D\uDDB8\uFE0F</div>' +
      '<div class="sh-dropzone-text">Drop an image here or paste a URL</div>' +
      '<input type="file" id="shImageFileInput" accept="image/*" style="display:none" />' +
      '<button class="sh-dropzone-btn" id="shDropzoneUpload">Upload Image</button>' +
      '</div></div>' +
      '<div class="sh-link-input-wrap" id="shLinkInputWrap" style="display:none">' +
      '<input type="url" id="shLinkInput" class="sh-link-input" placeholder="Paste a product URL (AliExpress, Amazon, etc.)..." />' +
      '<button class="sh-link-go-btn" id="shLinkGoBtn">Search</button>' +
      '<button class="sh-link-close-btn" id="shLinkCloseBtn">\u2715</button>' +
      '</div>' +
      '<div class="sh-deep-toggle">' +
      '<label><input type="checkbox" id="shDeepToggle" /> Deep Sourcing (1688 + Taobao)</label>' +
      '<span class="sh-deep-tooltip">Search Chinese domestic platforms for factory-direct pricing</span>' +
      '</div>' +
      '<div id="shSearchStatus" class="sh-search-status"></div>' +
      '</div>'
    );
  }

  // --- Command Center ---
  function renderCommandCenter(suppliers) {
    if (!suppliers.length) return '';
    var verified = suppliers.filter(function (s) {
      return s.verified;
    }).length;
    var avgRating = (
      suppliers.reduce(function (a, s) {
        return a + (s.rating || 0);
      }, 0) / suppliers.length
    ).toFixed(1);
    var totalOrders = suppliers.reduce(function (a, s) {
      return a + _parseNum(s.orders);
    }, 0);
    var avgProducts = Math.round(
      suppliers.reduce(function (a, s) {
        return a + (s.topProducts || []).length;
      }, 0) / suppliers.length
    );
    var risingStars = suppliers.filter(function (s) {
      return computeVelocityScore(s) >= 45;
    }).length;

    return (
      '<div class="sh-command-center">' +
      '<div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(79,140,255,0.12);color:var(--sh-nebula)">\uD83C\uDFED</div><div class="sh-stat-info"><div class="sh-stat-value">' +
      suppliers.length +
      '</div><div class="sh-stat-label">Suppliers Found</div></div></div>' +
      '<div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(0,245,160,0.12);color:var(--sh-aurora)">\u2705</div><div class="sh-stat-info"><div class="sh-stat-value">' +
      verified +
      '</div><div class="sh-stat-label">Verified</div></div></div>' +
      '<div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(255,215,0,0.12);color:#FFD700">\u2B50</div><div class="sh-stat-info"><div class="sh-stat-value">' +
      avgRating +
      '\u2605</div><div class="sh-stat-label">Avg Rating</div></div></div>' +
      '<div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(168,85,247,0.12);color:var(--sh-cosmic)">\uD83D\uDCE6</div><div class="sh-stat-info"><div class="sh-stat-value">' +
      (totalOrders / 1000).toFixed(0) +
      'K</div><div class="sh-stat-label">Total Orders</div></div></div>' +
      '<div class="sh-stat-card"><div class="sh-stat-icon" style="background:rgba(0,245,160,0.12);color:var(--sh-aurora)">\uD83D\uDE80</div><div class="sh-stat-info"><div class="sh-stat-value">' +
      risingStars +
      '</div><div class="sh-stat-label">Rising Stars</div></div></div>' +
      '</div>'
    );
  }

  // --- Filters ---
  function renderFilters() {
    return (
      '<div class="sh-filters" id="shFilters">' +
      '<button class="sh-filter-pill active" data-sf="all">All</button>' +
      '<button class="sh-filter-pill" data-sf="verified">\u2705 Verified</button>' +
      '<button class="sh-filter-pill" data-sf="fast">\u26A1 Fast Ship</button>' +
      '<button class="sh-filter-pill" data-sf="rated">\u2B50 Top Rated</button>' +
      '<button class="sh-filter-pill" data-sf="rising">\uD83D\uDE80 Rising Stars</button>' +
      '<button class="sh-filter-pill" data-sf="profit">\uD83D\uDCB0 Best Profit</button>' +
      '<div class="sh-filter-divider"></div>' +
      '<button class="sh-filter-pill platform" data-sf="aliexpress">AliExpress</button>' +
      '<button class="sh-filter-pill platform" data-sf="amazon">Amazon</button>' +
      '<button class="sh-filter-pill platform" data-sf="cj">CJ Drop</button>' +
      '<button class="sh-filter-pill platform" data-sf="alibaba">Alibaba</button>' +
      '<button class="sh-filter-pill platform" data-sf="temu">Temu</button>' +
      '</div>'
    );
  }

  function bindFilters() {
    if (!_section) return;
    _section.querySelectorAll('.sh-filter-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _section.querySelectorAll('.sh-filter-pill').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        _activeFilter = btn.dataset.sf;
        applyFilters();
      });
    });
  }

  function applyFilters() {
    if (!_section) return;
    var grid = _section.querySelector('#shGrid');
    if (!grid) return;
    var cards = grid.querySelectorAll('.sh-supplier-card');
    cards.forEach(function (card) {
      var show = _activeFilter === 'all';
      if (!show) {
        var f = _activeFilter;
        if (f === 'verified') show = card.dataset.verified === 'true';
        else if (f === 'fast') show = (card.dataset.response || '').indexOf('1h') > -1;
        else if (f === 'rated') show = parseFloat(card.dataset.rating) >= 4.8;
        else if (f === 'rising') show = parseInt(card.dataset.velocity || '0') >= 45;
        else if (f === 'profit') show = card.dataset.viable === 'true';
        else show = (card.dataset.platform || '').toLowerCase().indexOf(f) !== -1;
      }
      card.style.display = show ? '' : 'none';
    });
  }

  // --- Supplier Cards ---
  function renderCards(suppliers) {
    var grid = _section ? _section.querySelector('#shGrid') : null;
    if (!grid) return;
    if (!suppliers.length) {
      grid.innerHTML =
        '<div class="sh-empty"><div class="sh-empty-icon">\uD83D\uDD0D</div>Use the search bar above to find suppliers</div>';
      return;
    }
    grid.innerHTML = suppliers
      .map(function (s, i) {
        try {
          var score = computeScore(s);
          var risk = getRiskLevel(s);
          var grade = getGrade(score);
          var vel = getVelocityBadge(s);
          var name = s.name || 'Unknown';
          var platform = s.platform || 'Unknown';
          var color = s.color || '#667eea';
          var profit = calculateProfitPotential(s);
          var watched = isWatched(name);

          return (
            '<div class="sh-supplier-card" tabindex="0" role="button" aria-label="View ' +
            esc(name) +
            ' details" data-idx="' +
            i +
            '" data-verified="' +
            s.verified +
            '" data-response="' +
            esc(s.responseTime || '') +
            '" data-rating="' +
            (s.rating || 0) +
            '" data-platform="' +
            esc(platform) +
            '" data-velocity="' +
            computeVelocityScore(s) +
            '" data-viable="' +
            profit.isViable +
            '">' +
            (vel ? '<div class="sh-velocity-badge ' + vel.cls + '">' + vel.icon + ' ' + vel.text + '</div>' : '') +
            '<div class="sh-card-header">' +
            '<div class="sh-card-avatar" style="background:' +
            esc(color) +
            '22;color:' +
            esc(color) +
            '">' +
            esc(name.charAt(0)) +
            '</div>' +
            '<div><div class="sh-card-name">' +
            esc(name) +
            '</div><div class="sh-card-platform">' +
            esc(platform) +
            ' \u2022 ' +
            esc(s.location || '') +
            '</div></div>' +
            '<div class="sh-card-grade" style="background:' +
            esc(grade.color) +
            '18;color:' +
            esc(grade.color) +
            '">' +
            esc(grade.grade) +
            '</div>' +
            '</div>' +
            '<div class="sh-card-stats">' +
            '<div class="sh-card-stat"><span class="sh-card-stat-val" style="color:#FFD700">' +
            esc(s.rating || 0) +
            '\u2605</span><span class="sh-card-stat-lbl">Rating</span></div>' +
            '<div class="sh-card-stat"><span class="sh-card-stat-val">' +
            esc(s.orders || 0) +
            '</span><span class="sh-card-stat-lbl">Orders</span></div>' +
            '<div class="sh-card-stat"><span class="sh-card-stat-val">' +
            esc(s.responseTime || 'N/A') +
            '</span><span class="sh-card-stat-lbl">Response</span></div>' +
            '<div class="sh-card-stat"><span class="sh-card-stat-val">' +
            (s.topProducts ? s.topProducts.length : 0) +
            '</span><span class="sh-card-stat-lbl">Products</span></div>' +
            '</div>' +
            (profit.netProfit > 0
              ? '<div class="sh-card-profit"><span class="sh-card-profit-val">' +
                _formatMoney(profit.netProfit) +
                '</span><span class="sh-card-profit-margin">' +
                Math.round(profit.marginAtAvg) +
                '% margin</span><span class="sh-card-profit-viable ' +
                (profit.isViable ? 'yes' : 'no') +
                '">' +
                (profit.isViable ? 'Viable' : 'Low') +
                '</span></div>'
              : '') +
            '<div class="sh-card-score-bar"><div class="sh-card-score-fill" style="width:' +
            score +
            '%;background:' +
            (score >= 90 ? 'var(--sh-aurora)' : score >= 80 ? 'var(--sh-nebula)' : '#FFD700') +
            '"></div></div>' +
            '<div class="sh-card-score-text">' +
            score +
            '/100</div>' +
            '<div class="sh-card-footer">' +
            (s.verified ? '<span class="sh-card-verified">\u2713 Verified</span>' : '') +
            '<span class="sh-card-risk" style="color:' +
            esc(risk.color) +
            '">' +
            esc(risk.level) +
            ' RISK</span>' +
            '<div class="sh-card-actions">' +
            '<button class="sh-card-action sh-card-watch-btn" data-supplier="' +
            esc(name) +
            '">' +
            (watched ? 'Watching' : 'Watch') +
            '</button>' +
            '<button class="sh-card-action sh-card-detail-btn" data-idx="' +
            i +
            '">Details</button>' +
            '</div>' +
            '</div>' +
            '</div>'
          );
        } catch (err) {
          console.warn('[SupplierHub] Card render error:', err);
          return '';
        }
      })
      .join('');

    grid.querySelectorAll('.sh-supplier-card').forEach(function (card) {
      var handler = function () {
        var idx = parseInt(card.dataset.idx);
        if (_suppliers[idx]) showDetail(_suppliers[idx]);
      };
      card.addEventListener('click', function (e) {
        if (e.target.closest('.sh-card-action')) return;
        handler();
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });

    grid.querySelectorAll('.sh-card-watch-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var s = _suppliers.find(function (x) {
          return x.name === btn.dataset.supplier;
        });
        if (s) toggleWatch(s);
      });
    });

    grid.querySelectorAll('.sh-card-detail-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.dataset.idx);
        if (_suppliers[idx]) showDetail(_suppliers[idx]);
      });
    });
  }

  // --- Comparison Matrix ---
  function renderComparison(suppliers) {
    var wrap = _section ? _section.querySelector('#shCompWrap') : null;
    if (!wrap || !suppliers.length) {
      if (wrap) wrap.innerHTML = '';
      return;
    }
    var sorted = suppliers
      .slice()
      .sort(function (a, b) {
        return computeScore(b) - computeScore(a);
      })
      .slice(0, 8);
    var bestProfit = 0;
    sorted.forEach(function (s) {
      var p = calculateProfitPotential(s);
      if (p.netProfit > bestProfit) bestProfit = p.netProfit;
    });
    var bestScore = computeScore(sorted[0] || {});

    var html =
      '<table class="sh-table"><thead><tr>' +
      '<th>Supplier</th><th>Platform</th><th>Grade</th><th>Score</th>' +
      '<th>Rating</th><th>Ship Time</th><th>Response</th><th>Velo</th><th>Risk</th><th>\uD83D\uDCB0 Profit</th>' +
      '</tr></thead><tbody>';

    sorted.forEach(function (s) {
      var score = computeScore(s);
      var grade = getGrade(score);
      var risk = getRiskLevel(s);
      var profit = calculateProfitPotential(s);
      var isWinner = score === bestScore;
      var name = s.name || 'Unknown';
      var color = s.color || '#667eea';
      var vd = s.velocityData || {};
      var trendArrow = vd.ratingTrend === 'up' ? '\u2191' : vd.ratingTrend === 'down' ? '\u2193' : '\u2192';
      var trendColor =
        vd.ratingTrend === 'up' ? 'var(--sh-aurora)' : vd.ratingTrend === 'down' ? 'var(--sh-solar)' : '#888';

      html +=
        '<tr class="' +
        (isWinner ? 'sh-winner' : '') +
        '" data-name="' +
        esc(name) +
        '">' +
        '<td><div class="sh-tbl-name"><div class="sh-tbl-avatar" style="background:' +
        esc(color) +
        '22;color:' +
        esc(color) +
        '">' +
        esc(name.charAt(0)) +
        '</div>' +
        esc(name) +
        '</div></td>' +
        '<td>' +
        esc(s.platform || '') +
        '</td>' +
        '<td><span class="sh-tbl-grade" style="background:' +
        esc(grade.color) +
        '18;color:' +
        esc(grade.color) +
        '">' +
        esc(grade.grade) +
        '</span></td>' +
        '<td style="color:' +
        esc(grade.color) +
        ';font-weight:700">' +
        score +
        '</td>' +
        '<td>\u2605 ' +
        esc(s.rating || 0) +
        '</td>' +
        '<td>' +
        esc(s.shipTime || 'N/A') +
        '</td>' +
        '<td>' +
        esc(s.responseTime || 'N/A') +
        '</td>' +
        '<td style="color:' +
        trendColor +
        ';font-weight:700">' +
        trendArrow +
        ' ' +
        (vd.salesGrowth30d || 0) +
        '%</td>' +
        '<td><span class="sh-tbl-risk" style="background:' +
        esc(risk.color) +
        '18;color:' +
        esc(risk.color) +
        '">' +
        esc(risk.level) +
        '</span></td>' +
        '<td class="sh-tbl-profit" style="color:' +
        (profit.isViable ? 'var(--sh-aurora)' : 'var(--sh-text-dim)') +
        '">' +
        _formatMoney(profit.netProfit) +
        '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    html +=
      '<div class="sh-winner-banner"><span class="sh-winner-icon">\uD83C\uDFC6</span><strong>' +
      esc(sorted[0] ? sorted[0].name : '') +
      '</strong> is your best match! (' +
      bestScore +
      '/100)</div>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('tr[data-name]').forEach(function (row) {
      row.addEventListener('click', function () {
        var s = _suppliers.find(function (x) {
          return x.name === row.dataset.name;
        });
        if (s) showDetail(s);
      });
    });
  }

  // --- Score Breakdown ---
  function renderScores(suppliers) {
    var grid = _section ? _section.querySelector('#shScoresGrid') : null;
    if (!grid || !suppliers.length) {
      if (grid) grid.innerHTML = '';
      return;
    }
    var top6 = suppliers
      .slice()
      .sort(function (a, b) {
        return computeScore(b) - computeScore(a);
      })
      .slice(0, 6);
    grid.innerHTML = top6
      .map(function (s) {
        var score = computeScore(s);
        var name = s.name || 'Unknown';
        var color = s.color || '#667eea';
        return (
          '<div class="sh-score-card" data-name="' +
          esc(name) +
          '">' +
          '<div class="sh-score-header">' +
          '<div class="sh-score-avatar" style="background:' +
          esc(color) +
          '22;color:' +
          esc(color) +
          '">' +
          esc(name.charAt(0)) +
          '</div>' +
          '<div><div class="sh-score-name">' +
          esc(name) +
          '</div><div class="sh-score-platform">' +
          esc(s.platform || '') +
          '</div></div>' +
          '<div class="sh-score-total">' +
          score +
          '</div></div>' +
          '<div class="sh-score-bars">' +
          '<div class="sh-score-row"><span>Quality</span><div class="sh-bar"><div class="sh-bar-fill" style="width:' +
          (s.quality || 0) +
          '%;background:var(--sh-aurora)"></div></div><span>' +
          (s.quality || 0) +
          '</span></div>' +
          '<div class="sh-score-row"><span>Communication</span><div class="sh-bar"><div class="sh-bar-fill" style="width:' +
          (s.communication || 0) +
          '%;background:var(--sh-nebula)"></div></div><span>' +
          (s.communication || 0) +
          '</span></div>' +
          '<div class="sh-score-row"><span>Value</span><div class="sh-bar"><div class="sh-bar-fill" style="width:' +
          (s.value || 0) +
          '%;background:var(--sh-cosmic)"></div></div><span>' +
          (s.value || 0) +
          '</span></div>' +
          '</div></div>'
        );
      })
      .join('');

    grid.querySelectorAll('.sh-score-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var s = _suppliers.find(function (x) {
          return x.name === card.dataset.name;
        });
        if (s) showDetail(s);
      });
    });
  }

  // --- Shipping Analytics ---
  function renderShipping(suppliers) {
    var grid = _section ? _section.querySelector('#shShipGrid') : null;
    if (!grid || !suppliers.length) {
      if (grid) grid.innerHTML = '';
      return;
    }
    var platforms = {};
    suppliers.forEach(function (s) {
      var p = s.platform || 'Other';
      if (!platforms[p]) platforms[p] = { times: [], costs: [], count: 0, icon: '\uD83C\uDFE2' };
      if (s.shipTime) {
        var parts = s.shipTime.split('-');
        if (parts.length === 2) platforms[p].times.push((parseInt(parts[0]) + parseInt(parts[1])) / 2);
      }
      if (s.shipCost && s.shipCost !== 'Free') {
        var c = String(s.shipCost).replace('$', '').split('-');
        if (c.length === 2) platforms[p].costs.push((parseFloat(c[0]) + parseFloat(c[1])) / 2);
      }
      platforms[p].count++;
    });

    var icons = {
      AliExpress: '\uD83C\uDF10',
      Amazon: '\uD83D\uDCE6',
      'CJ Dropshipping': '\uD83D\uDE9A',
      Alibaba: '\uD83C\uDFEA',
      Temu: '\uD83D\uDCB0',
      DHgate: '\uD83C\uDFEA',
      Etsy: '\uD83C\uDFA8',
    };

    grid.innerHTML = Object.keys(platforms)
      .map(function (name) {
        var p = platforms[name];
        var avgTime = p.times.length
          ? Math.round(
              p.times.reduce(function (a, b) {
                return a + b;
              }, 0) / p.times.length
            )
          : '?';
        var avgCost = p.costs.length
          ? '$' +
            (
              p.costs.reduce(function (a, b) {
                return a + b;
              }, 0) / p.costs.length
            ).toFixed(2)
          : 'Free';
        return (
          '<div class="sh-ship-card" data-platform="' +
          esc(name) +
          '">' +
          '<div class="sh-ship-icon">' +
          (icons[name] || '\uD83C\uDFE2') +
          '</div>' +
          '<div class="sh-ship-name">' +
          esc(name) +
          '</div>' +
          '<div class="sh-ship-stats">' +
          '<div class="sh-ship-stat"><span class="sh-ship-stat-label">Avg Ship</span><span class="sh-ship-stat-value">' +
          avgTime +
          ' days</span></div>' +
          '<div class="sh-ship-stat"><span class="sh-ship-stat-label">Avg Cost</span><span class="sh-ship-stat-value">' +
          avgCost +
          '</span></div>' +
          '<div class="sh-ship-stat"><span class="sh-ship-stat-label">Suppliers</span><span class="sh-ship-stat-value">' +
          p.count +
          '</span></div>' +
          '</div></div>'
        );
      })
      .join('');

    grid.querySelectorAll('.sh-ship-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var platform = card.dataset.platform;
        _activeFilter = platform.toLowerCase().replace(/[^a-z]/g, '');
        _section.querySelectorAll('.sh-filter-pill').forEach(function (b) {
          b.classList.remove('active');
        });
        applyFilters();
      });
    });
  }

  // --- Verification Checklist ---
  function renderChecklist() {
    var el = _section ? _section.querySelector('#shChecklist') : null;
    if (!el) return;
    var checked = getCheckedItems();
    var items = [
      {
        id: 'verify-license',
        icon: '\uD83D\uDD0D',
        title: 'Verify Business License',
        desc: 'Confirm valid business registration and import/export licenses',
        priority: 'Critical',
      },
      {
        id: 'request-samples',
        icon: '\uD83D\uDCCB',
        title: 'Request Product Samples',
        desc: 'Always order 2-3 samples before bulk orders',
        priority: 'Critical',
      },
      {
        id: 'test-response',
        icon: '\uD83D\uDCAC',
        title: 'Test Response Time',
        desc: 'Send inquiries at different hours to verify',
        priority: 'High',
      },
      {
        id: 'check-orders',
        icon: '\uD83D\uDCCA',
        title: 'Check Order History',
        desc: 'Look for consistent volume over 6+ months',
        priority: 'High',
      },
      {
        id: 'review-return',
        icon: '\uD83D\uDD04',
        title: 'Review Return Policy',
        desc: 'Understand refund terms and dispute process',
        priority: 'High',
      },
      {
        id: 'verify-photos',
        icon: '\uD83D\uDCF7',
        title: 'Verify Product Photos',
        desc: 'Request actual photos, not stock images',
        priority: 'Medium',
      },
      {
        id: 'compare-pricing',
        icon: '\uD83C\uDFF7\uFE0F',
        title: 'Compare Unit Pricing',
        desc: 'Get quotes for different quantities',
        priority: 'Medium',
      },
      {
        id: 'confirm-shipping',
        icon: '\uD83D\uDE9A',
        title: 'Confirm Shipping Methods',
        desc: 'Verify carriers, tracking, and insurance',
        priority: 'Medium',
      },
      {
        id: 'read-reviews',
        icon: '\uD83D\uDCDD',
        title: 'Read Sample Reviews',
        desc: 'Check reviews from other dropshippers',
        priority: 'Low',
      },
      {
        id: 'negotiate-terms',
        icon: '\uD83E\uDD1D',
        title: 'Negotiate Terms',
        desc: 'Discuss payment terms and exclusivity',
        priority: 'Low',
      },
    ];
    var done = Object.keys(checked).length;
    var total = items.length;
    var pct = Math.round((done / total) * 100);
    var priColors = {
      Critical: 'var(--sh-solar)',
      High: '#FFD700',
      Medium: 'var(--sh-nebula)',
      Low: 'var(--sh-text-dim)',
    };

    el.innerHTML =
      '<div class="sh-check-progress"><div class="sh-check-progress-bar"><div class="sh-check-progress-fill" id="shCheckProgress" style="width:' +
      pct +
      '%"></div></div><span class="sh-check-progress-label">Verification</span><span class="sh-check-progress-count" id="shCheckCount">' +
      done +
      '/' +
      total +
      '</span></div>' +
      items
        .map(function (i) {
          return (
            '<div class="sh-check-item' +
            (checked[i.id] ? ' done' : '') +
            '" data-id="' +
            i.id +
            '">' +
            '<div class="sh-check-box">' +
            (checked[i.id] ? '\u2713' : '') +
            '</div>' +
            '<div class="sh-check-icon">' +
            i.icon +
            '</div>' +
            '<div class="sh-check-info"><div class="sh-check-title">' +
            i.title +
            '</div><div class="sh-check-desc">' +
            i.desc +
            '</div></div>' +
            '<div class="sh-check-priority" style="color:' +
            priColors[i.priority] +
            '">' +
            i.priority +
            '</div></div>'
          );
        })
        .join('');

    el.querySelectorAll('.sh-check-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var id = item.dataset.id;
        var isChecked = item.classList.toggle('done');
        var box = item.querySelector('.sh-check-box');
        box.textContent = isChecked ? '\u2713' : '';
        setCheckedItem(id, isChecked);
      });
    });
  }

  // --- Top Picks ---
  function renderPicks(suppliers) {
    var grid = _section ? _section.querySelector('#shPicksGrid') : null;
    if (!grid || !suppliers.length) {
      if (grid) grid.innerHTML = '';
      return;
    }

    var fastest = suppliers.slice().sort(function (a, b) {
      return parseInt((a.shipTime || '10').split('-')[0]) - parseInt((b.shipTime || '10').split('-')[0]);
    })[0];
    var bestValue = suppliers.slice().sort(function (a, b) {
      return (b.value || 0) - (a.value || 0);
    })[0];
    var topRated = suppliers.slice().sort(function (a, b) {
      return (b.rating || 0) - (a.rating || 0);
    })[0];
    var mostOrders = suppliers.slice().sort(function (a, b) {
      return _parseNum(b.orders) - _parseNum(a.orders);
    })[0];
    var lowestRisk = suppliers.slice().sort(function (a, b) {
      return (a.disputeRate || 5) - (b.disputeRate || 5);
    })[0];
    var bestBeginner =
      suppliers.find(function (s) {
        return s.verified && String(s.minOrder || '').indexOf('1') >= 0;
      }) || topRated;
    var bestProfit = suppliers.slice().sort(function (a, b) {
      return calculateProfitPotential(b).netProfit - calculateProfitPotential(a).netProfit;
    })[0];

    var picks = [
      {
        use: '\uD83D\uDE80 Fastest Shipping',
        s: fastest,
        reason: (fastest ? fastest.shipTime : '?') + ' day delivery',
        color: 'var(--sh-aurora)',
      },
      {
        use: '\uD83D\uDCB0 Best Value',
        s: bestValue,
        reason: 'Score: ' + (bestValue ? bestValue.value : 0) + '/100',
        color: 'var(--sh-nebula)',
      },
      {
        use: '\u2B50 Highest Rated',
        s: topRated,
        reason: (topRated ? topRated.rating : 0) + '\u2605 with ' + (topRated ? topRated.orders : 0) + ' orders',
        color: '#FFD700',
      },
      {
        use: '\uD83D\uDCE6 Most Orders',
        s: mostOrders,
        reason: (mostOrders ? mostOrders.orders : 0) + ' total orders',
        color: 'var(--sh-cosmic)',
      },
      {
        use: '\uD83D\uDEE1\uFE0F Lowest Risk',
        s: lowestRisk,
        reason: (lowestRisk ? lowestRisk.disputeRate : 0) + '% dispute rate',
        color: 'var(--sh-aurora)',
      },
      {
        use: '\uD83C\uDFAF Best Profit',
        s: bestProfit,
        reason: _formatMoney(bestProfit ? calculateProfitPotential(bestProfit).netProfit : 0) + '/unit net',
        color: 'var(--sh-aurora)',
      },
    ].filter(function (p) {
      return p.s;
    });

    grid.innerHTML = picks
      .map(function (p) {
        return (
          '<div class="sh-pick-card" style="border-left-color:' +
          p.color +
          '" data-name="' +
          esc(p.s.name) +
          '">' +
          '<div class="sh-pick-use">' +
          p.use +
          '</div>' +
          '<div class="sh-pick-supplier">' +
          esc(p.s.name) +
          '</div>' +
          '<div class="sh-pick-platform">' +
          esc(p.s.platform || '') +
          '</div>' +
          '<div class="sh-pick-reason">' +
          esc(p.reason) +
          '</div></div>'
        );
      })
      .join('');

    grid.querySelectorAll('.sh-pick-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var s = _suppliers.find(function (x) {
          return x.name === card.dataset.name;
        });
        if (s) showDetail(s);
      });
    });
  }

  // --- Risk Radar ---
  function renderRiskRadar(suppliers) {
    var el = _section ? _section.querySelector('#shRiskGrid') : null;
    if (!el) return;
    var risks = suppliers.filter(function (s) {
      return getRiskLevel(s).level !== 'LOW';
    });
    if (!risks.length) {
      el.innerHTML =
        '<div class="sh-no-risk"><span style="font-size:28px">\uD83C\uDF89</span><div>All suppliers are healthy \u2014 no alerts</div></div>';
      return;
    }
    el.innerHTML = risks
      .map(function (s) {
        var risk = getRiskLevel(s);
        var reasons = [];
        if (!s.verified) reasons.push('Not verified');
        if ((s.rating || 5) < 4.5) reasons.push('Low rating');
        if ((s.disputeRate || 0) > 1.5) reasons.push('High disputes');
        if ((s.responseRate || 100) < 90) reasons.push('Slow response');
        var name = s.name || 'Unknown';
        var color = s.color || '#667eea';
        return (
          '<div class="sh-risk-card" style="border-left-color:' +
          esc(risk.color) +
          '" data-name="' +
          esc(name) +
          '">' +
          '<div class="sh-risk-header"><div class="sh-risk-avatar" style="background:' +
          esc(risk.color) +
          '22;color:' +
          esc(risk.color) +
          '">' +
          esc(name.charAt(0)) +
          '</div>' +
          '<div><div class="sh-risk-name">' +
          esc(name) +
          '</div><div class="sh-risk-platform">' +
          esc(s.platform || '') +
          '</div></div>' +
          '<div class="sh-risk-badge" style="background:' +
          esc(risk.color) +
          '18;color:' +
          esc(risk.color) +
          ';border-color:' +
          esc(risk.color) +
          '44">' +
          esc(risk.level) +
          ' RISK</div></div>' +
          '<div class="sh-risk-reasons">' +
          reasons
            .map(function (r) {
              return '<span class="sh-risk-reason">\u26A0 ' + esc(r) + '</span>';
            })
            .join('') +
          '</div>' +
          '<div class="sh-risk-view">View Details \u2192</div></div>'
        );
      })
      .join('');

    el.querySelectorAll('.sh-risk-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var s = _suppliers.find(function (x) {
          return x.name === card.dataset.name;
        });
        if (s) showDetail(s);
      });
    });
  }

  // --- Backup Network ---
  function renderBackups(suppliers) {
    var el = _section ? _section.querySelector('#shBackupGrid') : null;
    if (!el || !suppliers.length) {
      if (el) el.innerHTML = '';
      return;
    }
    var sorted = suppliers.slice().sort(function (a, b) {
      return computeScore(b) - computeScore(a);
    });
    var pairs = [];
    for (var i = 0; i < Math.min(sorted.length - 1, 5); i++) {
      pairs.push({
        primary: sorted[i],
        backup: sorted[i + 1],
        score: Math.max(60, 95 - i * 7),
        reason: sorted[i + 1] ? 'Similar specialty, score ' + computeScore(sorted[i + 1]) : 'Backup available',
      });
    }
    el.innerHTML = pairs
      .map(function (p) {
        return (
          '<div class="sh-backup-card" data-name="' +
          esc(p.primary.name) +
          '">' +
          '<div class="sh-backup-category">' +
          esc(p.primary.specialty || p.primary.platform || 'Category') +
          '</div>' +
          '<div class="sh-backup-flow">' +
          '<div class="sh-backup-box primary"><div class="sh-backup-label">Primary</div><div class="sh-backup-name">' +
          esc(p.primary.name) +
          '</div></div>' +
          '<div class="sh-backup-arrow">\u2192</div>' +
          '<div class="sh-backup-box alt"><div class="sh-backup-label">Backup</div><div class="sh-backup-name">' +
          esc(p.backup ? p.backup.name : 'N/A') +
          '</div></div>' +
          '</div>' +
          '<div class="sh-backup-reason">' +
          esc(p.reason) +
          '</div>' +
          '<div class="sh-backup-score">Match: <strong>' +
          p.score +
          '%</strong></div></div>'
        );
      })
      .join('');

    el.querySelectorAll('.sh-backup-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var s = _suppliers.find(function (x) {
          return x.name === card.dataset.name;
        });
        if (s) showDetail(s);
      });
    });
  }

  // --- Watchlist Panel ---
  function renderWatchlist() {
    var el = _section ? _section.querySelector('#shWatchlist') : null;
    if (!el) return;
    var wl = getWatchlist();
    if (!wl.length) {
      el.innerHTML =
        '<div class="sh-watchlist-panel"><div class="sh-watchlist-title">Your Watchlist <span class="sh-watchlist-count">0</span></div><div class="sh-watch-empty">Click "Watch" on any supplier to track price & stock changes</div></div>';
      return;
    }
    el.innerHTML =
      '<div class="sh-watchlist-panel"><div class="sh-watchlist-title">Your Watchlist <span class="sh-watchlist-count">' +
      wl.length +
      '</span></div>' +
      '<div class="sh-watchlist-grid">' +
      wl
        .map(function (w) {
          return (
            '<div class="sh-watch-card" data-id="' +
            esc(w.supplierId) +
            '">' +
            '<div class="sh-watch-header">' +
            '<div class="sh-watch-avatar" style="background:rgba(79,140,255,0.12);color:var(--sh-nebula)">' +
            esc(w.supplierId.charAt(0)) +
            '</div>' +
            '<div class="sh-watch-name">' +
            esc(w.supplierId) +
            '</div>' +
            '<button class="sh-watch-remove" data-id="' +
            esc(w.supplierId) +
            '">\u2715</button></div>' +
            '<div class="sh-watch-changes">' +
            '<div class="sh-watch-change"><span class="stable">\u2014</span> Price: ' +
            (w.lastData ? _formatMoney(parseFloat(w.lastData.price)) : 'N/A') +
            '</div>' +
            '<div class="sh-watch-change"><span class="stable">\u2014</span> Rating: ' +
            (w.lastData ? (w.lastData.rating || 0) + '\u2605' : 'N/A') +
            '</div>' +
            '</div>' +
            '<div class="sh-watch-time">Added ' +
            new Date(w.addedAt).toLocaleDateString() +
            '</div></div>'
          );
        })
        .join('') +
      '</div></div>';

    el.querySelectorAll('.sh-watch-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        var wl2 = getWatchlist().filter(function (w) {
          return w.supplierId !== id;
        });
        setWatchlist(wl2);
        renderWatchlist();
        updateCardsWatchState();
        _toast('Removed from watchlist', 'info');
      });
    });
  }

  // ========================================================================
  // DETAIL MODAL (with tabs)
  // ========================================================================

  function showDetail(supplier) {
    if (!supplier) return;
    var panel = document.getElementById('shDetailPanel');
    if (!panel) return;

    var score = computeScore(supplier);
    var risk = getRiskLevel(supplier);
    var grade = getGrade(score);
    var vel = computeVelocityScore(supplier);
    var velBadge = getVelocityBadge(supplier);
    var profit = calculateProfitPotential(supplier);
    var dna = generateSupplierDNA(supplier);
    var name = supplier.name || 'Unknown';
    var color = supplier.color || '#667eea';
    var watched = isWatched(name);

    var html =
      '<div class="sh-detail-overlay" id="shDetailOverlay"></div>' +
      '<div class="sh-detail-content">' +
      '<div class="sh-detail-topbar"><button class="sh-detail-back" id="shDetailCloseBtn">\u2190 Back to Suppliers</button>' +
      '<button class="sh-detail-close" id="shDetailCloseBtnX" aria-label="Close">\u2715</button></div>' +
      // Hero
      '<div class="sh-detail-hero">' +
      '<div class="sh-detail-avatar" style="background:' +
      esc(color) +
      '22;color:' +
      esc(color) +
      ';border:2px solid ' +
      esc(color) +
      '">' +
      esc(name.charAt(0)) +
      '</div>' +
      '<div class="sh-detail-hero-info">' +
      '<div class="sh-detail-name">' +
      esc(name) +
      '</div>' +
      '<div class="sh-detail-meta">' +
      esc(supplier.platform || '') +
      ' \u2022 ' +
      esc(supplier.location || '') +
      ' \u2022 ' +
      esc(supplier.specialty || 'General') +
      '</div>' +
      '<div class="sh-detail-badges">' +
      '<span class="sh-detail-badge" style="background:' +
      esc(grade.color) +
      '18;color:' +
      esc(grade.color) +
      '">Grade ' +
      esc(grade.grade) +
      '</span>' +
      '<span class="sh-detail-badge" style="background:rgba(255,215,0,0.12);color:#FFD700">' +
      esc(supplier.rating || 0) +
      '\u2605</span>' +
      '<span class="sh-detail-badge" style="background:' +
      esc(risk.color) +
      '18;color:' +
      esc(risk.color) +
      '">' +
      esc(risk.level) +
      ' RISK</span>' +
      (supplier.verified
        ? '<span class="sh-detail-badge" style="background:rgba(0,245,160,0.12);color:var(--sh-aurora)">\u2713 Verified</span>'
        : '') +
      (velBadge
        ? '<span class="sh-detail-badge" style="background:rgba(0,245,160,0.12);color:var(--sh-aurora)">' +
          velBadge.icon +
          ' ' +
          velBadge.text +
          '</span>'
        : '') +
      '</div></div>' +
      '<div class="sh-detail-score-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/><circle cx="50" cy="50" r="42" fill="none" stroke="' +
      (score >= 90 ? 'var(--sh-aurora)' : score >= 80 ? 'var(--sh-nebula)' : '#FFD700') +
      '" stroke-width="6" stroke-dasharray="264" stroke-dashoffset="' +
      (264 - (264 * score) / 100) +
      '" stroke-linecap="round" transform="rotate(-90 50 50)" style="transition:stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)"/></svg><div class="sh-detail-score-val">' +
      score +
      '</div></div>' +
      '</div>' +
      // Tabs
      '<div class="sh-detail-tabs">' +
      '<button class="sh-detail-tab active" data-tab="overview">Overview</button>' +
      '<button class="sh-detail-tab" data-tab="performance">Performance</button>' +
      '<button class="sh-detail-tab" data-tab="shipping">Shipping</button>' +
      '<button class="sh-detail-tab" data-tab="profit">Profit</button>' +
      '<button class="sh-detail-tab" data-tab="products">Products</button>' +
      '</div>' +
      // Body
      '<div class="sh-detail-body" id="shDetailBody">' +
      renderDetailTab('overview', supplier, dna, profit, vel) +
      '</div>' +
      // Actions
      '<div style="padding:0 40px 40px;max-width:1200px;margin:0 auto">' +
      '<div class="sh-detail-actions">' +
      '<button class="sh-detail-action-btn primary" onclick="window.HuntDrop.navigateTo(\'section-profit-lab\')">\uD83D\uDCB0 Calculate Profit</button>' +
      '<button class="sh-detail-action-btn" onclick="window.HuntDrop.navigateTo(\'section-ad-studio\')">\uD83C\uDFAC Create Ads</button>' +
      '<button class="sh-detail-action-btn" id="shNegoBtn">\uD83E\uDD1D Negotiate Price</button>' +
      '</div></div>' +
      '</div>';

    panel.innerHTML = html;
    panel.classList.add('sh-detail-open');
    panel.scrollTop = 0;
    document.body.style.overflow = 'hidden';

    // Tab switching
    panel.querySelectorAll('.sh-detail-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        panel.querySelectorAll('.sh-detail-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        var body = panel.querySelector('#shDetailBody');
        if (body) body.innerHTML = renderDetailTab(tab.dataset.tab, supplier, dna, profit, vel);
      });
    });

    // Close
    var closeDetail = function () {
      panel.classList.remove('sh-detail-open');
      panel.innerHTML = '';
      document.body.style.overflow = '';
    };
    var closeBtn = panel.querySelector('#shDetailCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeDetail);
    var closeX = panel.querySelector('#shDetailCloseBtnX');
    if (closeX) closeX.addEventListener('click', closeDetail);
    var onEsc = function (e) {
      if (e.key === 'Escape') {
        closeDetail();
        document.removeEventListener('keydown', onEsc);
      }
    };
    document.addEventListener('keydown', onEsc);

    // Negotiate
    var negoBtn = panel.querySelector('#shNegoBtn');
    if (negoBtn)
      negoBtn.addEventListener('click', function () {
        showNegotiationModal(supplier);
      });
  }

  function renderDetailTab(tab, supplier, dna, profit, vel) {
    if (tab === 'overview') {
      return (
        '<div class="sh-detail-card"><h4>\uD83D\uDCCA Key Metrics</h4><div class="sh-detail-metrics">' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Total Orders</span><span class="sh-detail-m-val">' +
        esc(supplier.orders || 0) +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Products</span><span class="sh-detail-m-val">' +
        (supplier.topProducts ? supplier.topProducts.length : 0) +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Response Time</span><span class="sh-detail-m-val">' +
        esc(supplier.responseTime || 'N/A') +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Response Rate</span><span class="sh-detail-m-val">' +
        esc(supplier.responseRate || 0) +
        '%</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Fulfillment</span><span class="sh-detail-m-val">' +
        esc(supplier.fulfillmentRate || 0) +
        '%</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Dispute Rate</span><span class="sh-detail-m-val" style="color:' +
        ((supplier.disputeRate || 0) < 1 ? 'var(--sh-aurora)' : 'var(--sh-solar)') +
        '">' +
        esc(supplier.disputeRate || 0) +
        '%</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Years Active</span><span class="sh-detail-m-val">' +
        esc(supplier.yearsActive || 'N/A') +
        ' years</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Velocity Score</span><span class="sh-detail-m-val">' +
        vel +
        '/60</span></div>' +
        '</div></div>' +
        '<div class="sh-detail-card"><h4>\u2705 Capabilities</h4><div class="sh-detail-metrics">' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Verified</span><span class="sh-detail-m-val">' +
        (supplier.verified ? '\u2713 Yes' : '\u2717 No') +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Samples</span><span class="sh-detail-m-val">' +
        (supplier.sampleAvailable ? '\u2713 Available' : '\u2717 No') +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Custom Packaging</span><span class="sh-detail-m-val">' +
        (supplier.customPackaging ? '\u2713 Yes' : '\u2717 No') +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Dropship Support</span><span class="sh-detail-m-val">' +
        (supplier.dropshipSupport ? '\u2713 Yes' : '\u2717 No') +
        '</span></div>' +
        '</div></div>' +
        (function () {
          var nego = getActiveNego(supplier.name);
          if (!nego) return '';
          var negoStatus = nego.status || 'pending';
          var color = NEGO_STATUS_COLORS[negoStatus] || '#FFD700';
          var label = NEGO_STATUS_LABELS[negoStatus] || negoStatus;
          var bo = getBestOffer(nego);
          var msgCount = nego.messages ? nego.messages.length : 0;
          return (
            '<div class="sh-detail-card sh-nego-summary-card"><h4>\uD83E\uDD1D Negotiation Status</h4>' +
            '<div class="sh-nego-summary-row">' +
            '<span class="sh-nego-status-badge" style="background:' +
            color +
            '22;color:' +
            color +
            ';border:1px solid ' +
            color +
            '44">' +
            label +
            '</span>' +
            '<span class="sh-nego-summary-msgs">' +
            msgCount +
            ' messages</span>' +
            '</div>' +
            (bo
              ? '<div class="sh-nego-summary-offer">Best offer: <strong>$' +
                bo.price.toFixed(2) +
                '</strong>/unit</div>'
              : '') +
            '<button class="sh-nego-summary-btn" onclick="document.querySelector(\'.sh-nego-modal\') ? null : document.querySelector(\'#shNegoBtn\').click()">View Negotiation \u2192</button>' +
            '</div>'
          );
        })()
      );
    }
    if (tab === 'performance') {
      var vd = supplier.velocityData || {};
      return (
        '<div class="sh-detail-card"><h4>\uD83C\uDFAF Score Breakdown</h4><div class="sh-detail-bars">' +
        '<div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Quality</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:' +
        (supplier.quality || 0) +
        '%;background:var(--sh-aurora)"></div></div><span class="sh-detail-bar-val">' +
        (supplier.quality || 0) +
        '</span></div>' +
        '<div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Communication</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:' +
        (supplier.communication || 0) +
        '%;background:var(--sh-nebula)"></div></div><span class="sh-detail-bar-val">' +
        (supplier.communication || 0) +
        '</span></div>' +
        '<div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Value</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:' +
        (supplier.value || 0) +
        '%;background:var(--sh-cosmic)"></div></div><span class="sh-detail-bar-val">' +
        (supplier.value || 0) +
        '</span></div>' +
        '<div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Response Rate</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:' +
        (supplier.responseRate || 0) +
        '%;background:#FFD700"></div></div><span class="sh-detail-bar-val">' +
        (supplier.responseRate || 0) +
        '%</span></div>' +
        '<div class="sh-detail-bar-row"><span class="sh-detail-bar-label">Fulfillment</span><div class="sh-detail-bar-track"><div class="sh-detail-bar-fill" style="width:' +
        (supplier.fulfillmentRate || 0) +
        '%;background:var(--sh-aurora)"></div></div><span class="sh-detail-bar-val">' +
        (supplier.fulfillmentRate || 0) +
        '%</span></div>' +
        '</div></div>' +
        '<div class="sh-detail-card"><h4>\uD83D\uDCC8 Velocity Trends</h4><div class="sh-trend-list">' +
        '<div class="sh-trend-item"><span class="sh-trend-arrow ' +
        ((vd.salesGrowth30d || 0) > 0 ? 'up' : 'down') +
        '">' +
        ((vd.salesGrowth30d || 0) > 0 ? '\u2191' : '\u2193') +
        '</span>Sales Growth (30d): ' +
        (vd.salesGrowth30d || 0) +
        '%</div>' +
        '<div class="sh-trend-item"><span class="sh-trend-arrow ' +
        (vd.ratingTrend === 'up' ? 'up' : vd.ratingTrend === 'down' ? 'down' : 'stable') +
        '">' +
        (vd.ratingTrend === 'up' ? '\u2191' : vd.ratingTrend === 'down' ? '\u2193' : '\u2192') +
        '</span>Rating Trend: ' +
        (vd.ratingTrend || 'stable') +
        '</div>' +
        '<div class="sh-trend-item"><span class="sh-trend-arrow up">\u2191</span>New Products (30d): ' +
        (vd.newProducts30d || 0) +
        '</div>' +
        '<div class="sh-trend-item"><span class="sh-trend-arrow ' +
        (vd.responseTimeTrend === 'faster' ? 'up' : 'stable') +
        '">' +
        (vd.responseTimeTrend === 'faster' ? '\u2191' : '\u2192') +
        '</span>Response Time: ' +
        (vd.responseTimeTrend || 'stable') +
        '</div>' +
        '</div></div>'
      );
    }
    if (tab === 'shipping') {
      var country = _lsGet(LS_COUNTRY, 'US');
      var si = supplier.shippingIntel || {};
      var bestCase = si.bestCase || '~7-10';
      var worstCase = si.worstCase || '~14-21';
      var customsInfo = si.customsDelay || getCustomsDelay(country).min + '-' + getCustomsDelay(country).max + ' days';
      var confidence = si.confidence ? Math.round(si.confidence * 100) : null;
      var recommendation = si.recommendation || null;
      var carriers = si.carriers || [];
      var carrierHtml = carriers.length
        ? '<div class="sh-ship-compare" style="margin-top:10px"><div class="sh-ship-compare-row sh-ship-compare-header"><span class="sh-ship-compare-label"><strong>Carrier</strong></span><span class="sh-ship-compare-val"><strong>Days</strong></span><span class="sh-ship-compare-val"><strong>Cost</strong></span></div>' +
          carriers
            .map(function (c) {
              return (
                '<div class="sh-ship-compare-row"><span class="sh-ship-compare-label">' +
                esc(c.name) +
                '</span><span class="sh-ship-compare-val">' +
                esc(c.days) +
                '</span><span class="sh-ship-compare-val">' +
                esc(c.cost) +
                '</span></div>'
              );
            })
            .join('') +
          '</div>'
        : '';
      var confBadge =
        confidence !== null
          ? '<span class="sh-badge" style="background:' +
            (confidence >= 85 ? 'var(--sh-aurora)' : confidence >= 70 ? '#FFD700' : 'var(--sh-solar)') +
            ';color:#000;margin-left:8px">' +
            confidence +
            '% confidence</span>'
          : '';
      var recBadge = recommendation
        ? '<span class="sh-badge" style="background:' +
          (recommendation === 'Reliable'
            ? 'var(--sh-aurora)'
            : recommendation === 'Moderate'
              ? '#FFD700'
              : 'var(--sh-solar)') +
          ';color:#000;margin-left:8px">' +
          esc(recommendation) +
          '</span>'
        : '';
      return (
        '<div class="sh-detail-card"><h4>\uD83D\uDE9A Shipping Info</h4><div class="sh-detail-metrics">' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Ship Time</span><span class="sh-detail-m-val">' +
        esc(supplier.shipTime || 'N/A') +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Ship Cost</span><span class="sh-detail-m-val">' +
        esc(supplier.shipCost || 'N/A') +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Min Order</span><span class="sh-detail-m-val">' +
        esc(supplier.minOrder || 'N/A') +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Payment Terms</span><span class="sh-detail-m-val">' +
        esc(supplier.paymentTerms || 'N/A') +
        '</span></div>' +
        '</div></div>' +
        '<div class="sh-detail-card"><h4>\uD83D\uDCCA Estimated vs Reality (to ' +
        esc(country) +
        ')' +
        confBadge +
        recBadge +
        '</h4><div class="sh-ship-compare">' +
        '<div class="sh-ship-compare-row"><span class="sh-ship-compare-label">Supplier Claims</span><span class="sh-ship-compare-val">' +
        esc(supplier.shipTime || 'N/A') +
        ' days</span></div>' +
        '<div class="sh-ship-compare-row"><span class="sh-ship-compare-label">Realistic Best</span><span class="sh-ship-compare-val" style="color:var(--sh-aurora)">~' +
        bestCase +
        ' days</span></div>' +
        '<div class="sh-ship-compare-row"><span class="sh-ship-compare-label">Realistic Worst</span><span class="sh-ship-compare-val" style="color:var(--sh-solar)">~' +
        worstCase +
        ' days</span></div>' +
        '<div class="sh-ship-compare-row"><span class="sh-ship-compare-label">Customs Delay</span><span class="sh-ship-compare-val">' +
        esc(customsInfo) +
        '</span></div>' +
        '</div>' +
        carrierHtml +
        '</div>'
      );
    }
    if (tab === 'profit') {
      return (
        '<div class="sh-detail-card"><h4>\uD83D\uDCB0 Profit Potential</h4><div class="sh-detail-metrics">' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Supplier Cost</span><span class="sh-detail-m-val">' +
        _formatMoney(profit.supplierCost) +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Market Price</span><span class="sh-detail-m-val">' +
        _formatMoney(profit.marketPrice) +
        '</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Net Profit</span><span class="sh-detail-m-val" style="color:var(--sh-aurora)">' +
        _formatMoney(profit.netProfit) +
        '/unit</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Margin</span><span class="sh-detail-m-val">' +
        Math.round(profit.marginAtAvg) +
        '%</span></div>' +
        '<div class="sh-detail-m"><span class="sh-detail-m-label">Viability</span><span class="sh-detail-m-val" style="color:' +
        (profit.isViable ? 'var(--sh-aurora)' : 'var(--sh-solar)') +
        '">' +
        (profit.isViable ? '\u2705 Viable' : '\u26A0\uFE0F Low Margin') +
        '</span></div>' +
        '</div></div>'
      );
    }
    if (tab === 'products') {
      var products = supplier.topProducts || [];
      return (
        '<div class="sh-detail-card"><h4>\uD83C\uDFC6 Top Products</h4><div class="sh-detail-products">' +
        (products.length
          ? products
              .map(function (p) {
                return '<span class="sh-detail-product-chip" data-product="' + esc(p) + '">' + esc(p) + '</span>';
              })
              .join('')
          : '<span style="color:var(--sh-text-dim)">No products listed</span>') +
        '</div></div>'
      );
    }
    return '';
  }

  // ========================================================================
  // NEGOTIATION MODAL
  // ========================================================================

  function renderNegoStatusBadge(status) {
    var color = NEGO_STATUS_COLORS[status] || '#FFD700';
    var label = NEGO_STATUS_LABELS[status] || status;
    return (
      '<span class="sh-nego-status-badge" style="background:' +
      color +
      '22;color:' +
      color +
      ';border:1px solid ' +
      color +
      '44">' +
      label +
      '</span>'
    );
  }

  function renderNegoTimeline(nego) {
    if (!nego || !nego.messages.length) return '';
    var html = '<div class="sh-nego-timeline">';
    nego.messages.forEach(function (m, i) {
      var isUser = m.from === 'user';
      var ts = m.ts ? new Date(m.ts) : null;
      var timeStr = ts
        ? ts.toLocaleDateString() + ' ' + ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      var offers = extractPriceOffers(m.text);
      var offerTag = offers.length
        ? '<span class="sh-nego-offer-tag">$' + offers[offers.length - 1].toFixed(2) + '</span>'
        : '';
      html +=
        '<div class="sh-nego-timeline-item ' +
        (isUser ? 'user' : 'supplier') +
        '">' +
        '<div class="sh-nego-timeline-dot"></div>' +
        '<div class="sh-nego-timeline-content">' +
        '<div class="sh-nego-timeline-header">' +
        '<span class="sh-nego-timeline-sender">' +
        (isUser ? 'You' : nego.supplierId || 'Supplier') +
        '</span>' +
        '<span class="sh-nego-timeline-time">' +
        timeStr +
        '</span>' +
        '</div>' +
        '<div class="sh-nego-timeline-text">' +
        esc(m.text) +
        '</div>' +
        offerTag +
        (isUser && m.text.toLowerCase().includes('counter')
          ? '<span class="sh-nego-offer-tag" style="background:var(--sh-cosmic);color:#fff">Counter-Offer</span>'
          : '') +
        '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function showNegotiationModal(supplier) {
    var existing = document.querySelector('.sh-nego-modal');
    if (existing) existing.remove();

    var negos = getNegotiations();
    var negoIdx = negos.findIndex(function (n) {
      return n.supplierId === supplier.name;
    });
    var nego = negoIdx >= 0 ? negos[negoIdx] : null;
    var messages = nego ? nego.messages : [];
    var status = nego ? nego.status || NEGO_STATUSES.PENDING : NEGO_STATUSES.PENDING;
    var lastOffer = getBestOffer(nego);
    var currentPrice = parseFloat(String(supplier.price || '0').replace(/[^0-9.]/g, '')) || 0;

    var modal = document.createElement('div');
    modal.className = 'sh-nego-modal';

    var statusHtml = renderNegoStatusBadge(status);
    var lastOfferHtml = lastOffer
      ? '<div class="sh-nego-last-offer">Last offer: <strong>$' +
        lastOffer.price.toFixed(2) +
        '</strong>' +
        (currentPrice > 0
          ? ' <span class="sh-nego-savings">(' +
            Math.round((1 - lastOffer.price / currentPrice) * 100) +
            '% off original)</span>'
          : '') +
        '</div>'
      : '';

    var templates = [
      { id: 'shNegoTpl1', label: '\uD83D\uDCAC First Contact', type: 'firstContact' },
      { id: 'shNegoTpl2', label: '\uD83D\uDD04 Follow Up', type: 'followUp' },
      { id: 'shNegoTpl3', label: '\uD83D\uDCCA Bulk Pricing', type: 'bulkPricing' },
      { id: 'shNegoTpl4', label: '\uD83D\uDE9A Shipping', type: 'shippingNegotiate' },
      { id: 'shNegoTpl5', label: '\uD83C\uDFF7\uFE0F Private Label', type: 'privateLabel' },
    ];
    var tplHtml = templates
      .map(function (t) {
        return '<button class="sh-nego-tpl-btn" id="' + t.id + '">' + t.label + '</button>';
      })
      .join('');

    var counterOfferHtml =
      '<div class="sh-nego-counter-wrap" id="shNegoCounterWrap" style="display:none">' +
      '<div class="sh-nego-counter-label">Send Counter-Offer</div>' +
      '<div class="sh-nego-counter-row">' +
      '<span class="sh-nego-counter-prefix">$</span>' +
      '<input type="number" id="shNegoCounterInput" class="sh-nego-counter-input" step="0.01" min="0" placeholder="Your target price" />' +
      '<button id="shNegoCounterSend" class="sh-nego-counter-send">Send Counter</button>' +
      '</div></div>';

    var dealActionsHtml =
      '<div class="sh-nego-deal-actions" id="shNegoDealActions" style="display:none">' +
      '<button class="sh-nego-deal-btn accept" id="shNegoAccept">\u2705 Accept Deal</button>' +
      '<button class="sh-nego-deal-btn reject" id="shNegoReject">\u274C Reject</button>' +
      '</div>';

    modal.innerHTML =
      '<div class="sh-nego-content">' +
      '<div class="sh-nego-header">' +
      '<div class="sh-nego-title">\uD83E\uDD1D Negotiate with ' +
      esc(supplier.name) +
      '</div>' +
      '<div class="sh-nego-header-meta">' +
      statusHtml +
      lastOfferHtml +
      '</div>' +
      '<button class="sh-nego-close" id="shNegoCloseBtn">\u2715</button>' +
      '</div>' +
      '<div class="sh-nego-templates" id="shNegoTemplates">' +
      tplHtml +
      '</div>' +
      '<div class="sh-nego-messages" id="shNegoMessages">' +
      (messages.length
        ? renderNegoTimeline(nego)
        : '<div class="sh-nego-empty">Choose a template above or type a message to start negotiating</div>') +
      '</div>' +
      counterOfferHtml +
      dealActionsHtml +
      '<div class="sh-nego-input-wrap">' +
      '<input type="text" id="shNegoInput" class="sh-nego-input" placeholder="Type your message..." />' +
      '<button id="shNegoSend" class="sh-nego-send">Send</button>' +
      '</div>' +
      '<div class="sh-nego-footer">' +
      '<button class="sh-nego-footer-btn" id="shNegoShowCounter">\uD83D\uDD04 Counter-Offer</button>' +
      '<button class="sh-nego-footer-btn" id="shNegoClear">\uD83D\uDDD1\uFE0F Clear Chat</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(modal);

    var msgArea = modal.querySelector('#shNegoMessages');
    var negoInput = modal.querySelector('#shNegoInput');
    var counterWrap = modal.querySelector('#shNegoCounterWrap');
    var dealActions = modal.querySelector('#shNegoDealActions');

    function updateStatus(newStatus) {
      status = newStatus;
      if (nego) {
        nego.status = newStatus;
        nego.updatedAt = Date.now();
        negos[negoIdx >= 0 ? negoIdx : negos.length - 1] = nego;
        setNegotiations(negos);
      }
      var badge = modal.querySelector('.sh-nego-status-badge');
      if (badge) {
        var color = NEGO_STATUS_COLORS[newStatus] || '#FFD700';
        var label = NEGO_STATUS_LABELS[newStatus] || newStatus;
        badge.style.background = color + '22';
        badge.style.color = color;
        badge.style.borderColor = color + '44';
        badge.textContent = label;
      }
    }

    function refreshMessages() {
      var refreshed = getNegotiations();
      var r = refreshed.find(function (n) {
        return n.supplierId === supplier.name;
      });
      if (r) {
        msgArea.innerHTML = renderNegoTimeline(r);
        var bo = getBestOffer(r);
        var loEl = modal.querySelector('.sh-nego-last-offer');
        if (bo && loEl) {
          loEl.innerHTML =
            'Last offer: <strong>$' +
            bo.price.toFixed(2) +
            '</strong>' +
            (currentPrice > 0
              ? ' <span class="sh-nego-savings">(' +
                Math.round((1 - bo.price / currentPrice) * 100) +
                '% off original)</span>'
              : '');
        }
        if (bo && r.status !== NEGO_STATUSES.ACCEPTED && r.status !== NEGO_STATUSES.REJECTED) {
          dealActions.style.display = 'flex';
        }
      }
      msgArea.scrollTop = msgArea.scrollHeight;
    }

    function sendMsg(text) {
      if (!text.trim()) return;
      if (msgArea.querySelector('.sh-nego-empty')) msgArea.innerHTML = '';

      if (!nego) {
        nego = {
          supplierId: supplier.name,
          product: (supplier.topProducts && supplier.topProducts[0]) || '',
          platform: supplier.platform,
          status: NEGO_STATUSES.PENDING,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        negos.push(nego);
        negoIdx = negos.length - 1;
      }

      nego.messages.push({ from: 'user', text: text, ts: Date.now() });
      nego.updatedAt = Date.now();
      setNegotiations(negos);
      negoIdx = negos.findIndex(function (n) {
        return n.supplierId === supplier.name;
      });

      var offerInText = extractPriceOffers(text);
      if (offerInText.length) {
        updateStatus(NEGO_STATUSES.COUNTERED);
      }

      refreshMessages();
      negoInput.value = '';
      counterWrap.style.display = 'none';

      setTimeout(
        function () {
          var reply = simulateSupplierReply(text, supplier);
          nego.messages.push({ from: 'supplier', text: reply, ts: Date.now() });
          nego.updatedAt = Date.now();
          setNegotiations(negos);
          updateStatus(NEGO_STATUSES.REPLIED);
          refreshMessages();
        },
        1200 + Math.random() * 1800
      );
    }

    function sendCounterOffer() {
      var priceInput = modal.querySelector('#shNegoCounterInput');
      var val = parseFloat(priceInput.value);
      if (!val || val <= 0) {
        _toast('Enter a valid price', 'error');
        return;
      }
      sendMsg('I can do $' + val.toFixed(2) + ' per unit. Would that work for you?');
      priceInput.value = '';
    }

    function acceptDeal() {
      if (!nego) return;
      nego.status = NEGO_STATUSES.ACCEPTED;
      nego.resolvedAt = Date.now();
      nego.messages.push({
        from: 'system',
        text: '\u2705 Deal accepted at $' + (lastOffer ? lastOffer.price.toFixed(2) : 'N/A') + '/unit',
        ts: Date.now(),
      });
      setNegotiations(negos);
      updateStatus(NEGO_STATUSES.ACCEPTED);
      dealActions.style.display = 'none';
      refreshMessages();
      _toast('Deal accepted! Great negotiation!', 'success');
    }

    function rejectDeal() {
      if (!nego) return;
      nego.status = NEGO_STATUSES.REJECTED;
      nego.resolvedAt = Date.now();
      nego.messages.push({ from: 'system', text: '\u274C Negotiation ended — deal rejected', ts: Date.now() });
      setNegotiations(negos);
      updateStatus(NEGO_STATUSES.REJECTED);
      dealActions.style.display = 'none';
      refreshMessages();
      _toast('Negotiation ended', 'info');
    }

    modal.querySelector('#shNegoSend').addEventListener('click', function () {
      sendMsg(negoInput.value);
    });
    negoInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendMsg(negoInput.value);
    });

    templates.forEach(function (t) {
      var btn = modal.querySelector('#' + t.id);
      if (btn)
        btn.addEventListener('click', function () {
          sendMsg(getNegoTemplate(t.type, supplier));
        });
    });

    modal.querySelector('#shNegoShowCounter').addEventListener('click', function () {
      counterWrap.style.display = counterWrap.style.display === 'none' ? 'block' : 'none';
    });
    modal.querySelector('#shNegoCounterSend').addEventListener('click', sendCounterOffer);
    modal.querySelector('#shNegoCounterInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendCounterOffer();
    });
    modal.querySelector('#shNegoAccept').addEventListener('click', acceptDeal);
    modal.querySelector('#shNegoReject').addEventListener('click', rejectDeal);

    modal.querySelector('#shNegoClear').addEventListener('click', function () {
      if (nego) {
        nego.messages = [];
        nego.status = NEGO_STATUSES.PENDING;
        setNegotiations(negos);
        status = NEGO_STATUSES.PENDING;
      }
      msgArea.innerHTML =
        '<div class="sh-nego-empty">Choose a template above or type a message to start negotiating</div>';
      updateStatus(NEGO_STATUSES.PENDING);
      dealActions.style.display = 'none';
      counterWrap.style.display = 'none';
      _toast('Chat cleared', 'info');
    });

    modal.querySelector('#shNegoCloseBtn').addEventListener('click', function () {
      modal.remove();
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });

    if (lastOffer && status !== NEGO_STATUSES.ACCEPTED && status !== NEGO_STATUSES.REJECTED) {
      dealActions.style.display = 'flex';
    }
  }

  // ========================================================================
  // SEARCH ENGINE
  // ========================================================================

  async function searchSuppliers(query) {
    if (_searching) return;
    _searching = true;
    _currentQuery = query;
    _velocityData = {};
    _shippingData = {};

    var statusEl = _section ? _section.querySelector('#shSearchStatus') : null;
    var searchBtn = _section ? _section.querySelector('#shSearchBtn') : null;
    var searchInput = _section ? _section.querySelector('#shSearchInput') : null;
    var deepToggle = _section ? _section.querySelector('#shDeepToggle') : null;

    if (searchBtn) searchBtn.disabled = true;
    if (searchInput) searchInput.disabled = true;
    if (statusEl)
      statusEl.innerHTML = '<span class="sh-search-spinner"></span> Searching web + platforms for suppliers...';

    try {
      var doDeep = deepToggle ? deepToggle.checked : false;
      var resp = await fetch(BACKEND_URL + '/suppliers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, deepSearch: doDeep }),
      });
      if (!resp.ok) {
        var err = await resp.json().catch(function () {
          return { error: 'Search failed' };
        });
        throw new Error(err.error || 'Search failed');
      }
      var data = await resp.json();
      _suppliers = data.suppliers || [];

      // Render initial results immediately
      renderAll();
      var webLabel = data.webProvider ? 'Web: ' + data.webProvider : 'Web: none';
      var aiLabel = data.aiProvider ? 'AI: ' + data.aiProvider : 'AI: regex';
      if (statusEl) {
        statusEl.innerHTML =
          '<span class="sh-search-spinner"></span> Found ' +
          _suppliers.length +
          ' suppliers. Enriching with velocity & shipping data...';
      }

      // Fetch velocity data in background
      fetchVelocityData(_suppliers).catch(function () {});

      // Fetch shipping intel in background
      fetchShippingIntel(_suppliers).catch(function () {});

      // Deep search if enabled
      if (doDeep) {
        var deepResults = await deepSearchSuppliers(query);
        if (deepResults.length) {
          deepResults.forEach(function (ds) {
            var existing = _suppliers.find(function (s) {
              return s.name === ds.name;
            });
            if (!existing) {
              ds._isDeep = true;
              _suppliers.push(ds);
            }
          });
          renderAll();
        }
      }

      if (statusEl) {
        statusEl.innerHTML =
          'Found <strong>' +
          _suppliers.length +
          '</strong> suppliers for "' +
          esc(query) +
          '" \u2014 ' +
          webLabel +
          ', ' +
          aiLabel;
      }
    } catch (e) {
      console.error('[SupplierHub] Search error:', e);
      if (statusEl)
        statusEl.innerHTML = '<span class="sh-search-error">Error: ' + esc(String(e.message || e)) + '</span>';
    } finally {
      _searching = false;
      if (searchBtn) searchBtn.disabled = false;
      if (searchInput) searchInput.disabled = false;
    }
  }

  async function fetchVelocityData(suppliers) {
    if (!suppliers || suppliers.length === 0) return;
    try {
      var resp = await fetch(BACKEND_URL + '/suppliers/velocity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suppliers: suppliers.map(function (s) {
            return {
              name: s.name,
              platform: s.platform,
              rating: s.rating,
              orders: s.orders,
              responseTime: s.responseTime,
            };
          }),
        }),
      });
      if (!resp.ok) return;
      var data = await resp.json();
      if (data.velocityData) {
        _velocityData = data.velocityData;
        _suppliers.forEach(function (s) {
          if (_velocityData[s.name]) {
            s.velocityData = _velocityData[s.name];
          }
        });
        renderCards(_suppliers);
        renderComparison(_suppliers);
      }
    } catch (e) {
      console.warn('[SupplierHub] Velocity fetch failed, using local fallback:', e.message);
    }
  }

  async function fetchShippingIntel(suppliers) {
    if (!suppliers || suppliers.length === 0) return;
    var targetCountry = _targetCountry || 'US';
    try {
      var resp = await fetch(BACKEND_URL + '/suppliers/shipping-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suppliers: suppliers.map(function (s) {
            return {
              name: s.name,
              shipTime: s.shipTime,
              shipCost: s.shipCost,
              location: s.location,
              platform: s.platform,
              fulfillmentRate: s.fulfillmentRate,
              disputeRate: s.disputeRate,
              verified: s.verified,
            };
          }),
          country: targetCountry,
        }),
      });
      if (!resp.ok) return;
      var data = await resp.json();
      if (data.shippingData) {
        _shippingData = data.shippingData;
        _suppliers.forEach(function (s) {
          if (_shippingData[s.name]) {
            s.shippingIntel = _shippingData[s.name];
          }
        });
        renderCards(_suppliers);
        renderComparison(_suppliers);
      }
    } catch (e) {
      console.warn('[SupplierHub] Shipping intel fetch failed, using local fallback:', e.message);
    }
  }

  function renderAll() {
    renderCards(_suppliers);
    renderComparison(_suppliers);
    renderScores(_suppliers);
    renderShipping(_suppliers);
    renderPicks(_suppliers);
    renderRiskRadar(_suppliers);
    renderBackups(_suppliers);

    var sections = ['shCompWrap', 'shScoresGrid', 'shShipGrid', 'shPicksGrid', 'shRiskGrid', 'shBackupGrid'];
    sections.forEach(function (id) {
      var el = _section ? _section.querySelector('#' + id) : null;
      if (el && el.closest('.sh-section')) {
        el.closest('.sh-section').style.display = _suppliers.length ? '' : 'none';
      }
    });
    var cmdEl = _section ? _section.querySelector('#shCommandCenter') : null;
    if (cmdEl) cmdEl.innerHTML = renderCommandCenter(_suppliers);
  }

  function bindSearch() {
    if (!_section) return;
    var btn = _section.querySelector('#shSearchBtn');
    var input = _section.querySelector('#shSearchInput');
    var searchBar = _section.querySelector('#shSearchBar');
    var dropzone = _section.querySelector('#shDropzone');
    var linkWrap = _section.querySelector('#shLinkInputWrap');
    var linkInput = _section.querySelector('#shLinkInput');
    var linkGoBtn = _section.querySelector('#shLinkGoBtn');
    var linkCloseBtn = _section.querySelector('#shLinkCloseBtn');
    var pasteLinkBtn = _section.querySelector('#shPasteLinkBtn');
    var imageSearchBtn = _section.querySelector('#shImageSearchBtn');
    var fileInput = _section.querySelector('#shImageFileInput');
    var dropzoneUpload = _section.querySelector('#shDropzoneUpload');

    if (!btn || !input) return;

    var doSearch = function () {
      var q = input.value.trim();
      if (q && q.length >= 2) searchSuppliers(q);
    };

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doSearch();
    });

    // Link search toggle
    if (pasteLinkBtn && linkWrap) {
      pasteLinkBtn.addEventListener('click', function () {
        var visible = linkWrap.style.display !== 'none';
        linkWrap.style.display = visible ? 'none' : 'flex';
        if (!visible && linkInput) linkInput.focus();
      });
    }

    if (linkCloseBtn && linkWrap) {
      linkCloseBtn.addEventListener('click', function () {
        linkWrap.style.display = 'none';
        if (linkInput) linkInput.value = '';
      });
    }

    if (linkGoBtn && linkInput) {
      var doLinkSearch = function () {
        var url = linkInput.value.trim();
        if (!url) return;
        var hostname = '';
        try {
          hostname = new URL(url).hostname;
        } catch (_) {
          hostname = url;
        }
        var query = hostname.replace(/^www\./, '').replace(/\.(com|net|org|io|co).*$/, '');
        input.value = query + ' supplier';
        linkWrap.style.display = 'none';
        searchSuppliers(query + ' supplier');
        linkInput.value = '';
      };
      linkGoBtn.addEventListener('click', doLinkSearch);
      linkInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doLinkSearch();
      });
    }

    // Image search toggle
    if (imageSearchBtn && dropzone) {
      imageSearchBtn.addEventListener('click', function () {
        var visible = dropzone.style.display !== 'none';
        dropzone.style.display = visible ? 'none' : 'block';
      });
    }

    if (dropzoneUpload && fileInput) {
      dropzoneUpload.addEventListener('click', function () {
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (file) handleImageSearch(file);
      });
    }

    // Drag & drop on hero
    if (searchBar) {
      searchBar.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) {
          dropzone.style.display = 'block';
          dropzone.classList.add('dragover');
        }
      });
      searchBar.addEventListener('dragleave', function (e) {
        e.preventDefault();
        if (dropzone) dropzone.classList.remove('dragover');
      });
      searchBar.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) dropzone.classList.remove('dragover');
        var files = e.dataTransfer.files;
        if (files.length && files[0].type.startsWith('image/')) {
          handleImageSearch(files[0]);
        }
      });
    }

    // Paste handler for images
    document.addEventListener('paste', function (e) {
      if (!_section || !_section.querySelector('#shSearchInput')) return;
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          var file = items[i].getAsFile();
          if (file) handleImageSearch(file);
          return;
        }
      }
    });

    function handleImageSearch(file) {
      var statusEl = _section ? _section.querySelector('#shSearchStatus') : null;
      if (statusEl)
        statusEl.innerHTML = '<span class="sh-search-spinner"></span> Analyzing image: ' + esc(file.name) + '...';
      var reader = new FileReader();
      reader.onload = function (ev) {
        input.value = 'Products similar to uploaded image';
        searchSuppliers('products similar to uploaded image');
      };
      reader.readAsDataURL(file);
    }
  }

  // ========================================================================
  // PLUGIN DEFINITION
  // ========================================================================

  var SupplierHubPlugin = {
    id: 'supplier-hub',
    name: 'Find Suppliers',
    version: '3.0.0',
    description:
      'Complete supplier intelligence — velocity scoring, deep sourcing, profit calculation, negotiation, watchlist & DNA profiles',

    init: function (_ctx) {},

    mount: function (_ctx) {
      var container = UI.$('sections-container');
      if (!container) return;

      var section = document.createElement('section');
      section.className = 'section section-suppliers-v3';
      section.id = 'section-supplier-hub';

      section.innerHTML =
        '<div class="section-inner">' +
        '<div class="section-header">' +
        '<h2 class="section-title">Supplier Intelligence Hub</h2>' +
        '<p class="section-desc">Search the internet for suppliers \u2014 AI analysis, velocity scoring, profit calculation, negotiation & more</p>' +
        '</div>' +
        renderHero() +
        '<div id="shCommandCenter"></div>' +
        renderFilters() +
        '<div id="shActiveChips" class="sh-active-chips"></div>' +
        '<div class="sh-galaxy" id="shGrid"><div class="sh-empty"><div class="sh-empty-icon">\uD83D\uDD0D</div>Use the search bar above to find suppliers</div></div>' +
        '<div class="sh-section" id="shCompSection"><h3 class="sh-section-title">\uD83D\uDCCA Comparison Matrix</h3><p class="sh-section-sub">Side-by-side comparison of top suppliers</p><div class="sh-table-wrap" id="shCompWrap"></div></div>' +
        '<div class="sh-section" id="shScoresSection"><h3 class="sh-section-title">\uD83C\uDFAF Score Breakdown</h3><p class="sh-section-sub">Detailed performance metrics</p><div class="sh-scores-grid" id="shScoresGrid"></div></div>' +
        '<div class="sh-section" id="shShipSection"><h3 class="sh-section-title">\uD83D\uDE9A Shipping & Logistics</h3><p class="sh-section-sub">Average shipping times and costs by platform</p><div class="sh-shipping-grid" id="shShipGrid"></div></div>' +
        '<div class="sh-section"><h3 class="sh-section-title">\u2705 Verification Checklist</h3><p class="sh-section-sub">Essential checks before committing to any supplier</p><div class="sh-checklist" id="shChecklist"></div></div>' +
        '<div class="sh-section" id="shPicksSection"><h3 class="sh-section-title">\uD83C\uDFC6 Top Picks by Use Case</h3><p class="sh-section-sub">Best supplier recommendations</p><div class="sh-picks-grid" id="shPicksGrid"></div></div>' +
        '<div class="sh-section" id="shRiskSection"><h3 class="sh-section-title">\u26A0\uFE0F Risk Radar</h3><p class="sh-section-sub">Suppliers that need attention</p><div class="sh-risk-grid" id="shRiskGrid"></div></div>' +
        '<div class="sh-section" id="shBackupSection"><h3 class="sh-section-title">\uD83D\uDEE1\uFE0F Backup Network</h3><p class="sh-section-sub">Always have a plan B</p><div class="sh-backup-grid" id="shBackupGrid"></div></div>' +
        '<div id="shWatchlist"></div>' +
        '</div>';

      container.appendChild(section);
      _section = section;

      // Create detail panel at body level to escape section stacking context
      var detailPanel = document.createElement('div');
      detailPanel.className = 'sh-detail-panel';
      detailPanel.id = 'shDetailPanel';
      document.body.appendChild(detailPanel);

      bindSearch();
      bindFilters();
      renderChecklist();
      renderWatchlist();

      EventBus.on('filter:changed', function (data) {
        if (data && data.query) {
          var input = _section ? _section.querySelector('#shSearchInput') : null;
          if (input) input.value = data.query;
          searchSuppliers(data.query);
        }
      });
    },

    unmount: function (_ctx) {
      var el = UI.$('section-supplier-hub');
      if (el) el.remove();
      var panel = document.getElementById('shDetailPanel');
      if (panel) panel.remove();
      _section = null;
      _suppliers = [];
    },
  };

  PluginRegistry.register('supplier-hub', SupplierHubPlugin);
})();
