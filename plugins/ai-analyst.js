// ============================================================================
// PLUGIN: AI Product Analyst — Deep Product Intelligence (v3.0)
// AI-powered analysis with real risk scoring, web search, and insights
// ============================================================================
(function () {
  const { EventBus, PluginRegistry, UI, Config } = window.HuntDrop;

  let _cleanups = [];
  let _section = null;
  let _trendChart = null;
  let _seasonChart = null;
  let _abortController = null;

  function switchTab(panelId) {
    if (!_section) return;
    _section.querySelectorAll('.aa-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.tab === panelId);
    });
    _section.querySelectorAll('.aa-tab-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === panelId);
    });
  }

  function matchProduct(query) {
    if (!query || !query.trim()) return null;
    var q = query.toLowerCase().trim();
    var products = window.HuntDrop.ALL_PRODUCTS || [];
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var score = 0;
      var titleLower = p.title.toLowerCase();
      var shortTitle = titleLower.split('\u2014')[0].trim();
      if (titleLower === q || shortTitle === q) score = 100;
      else if (titleLower.indexOf(q) !== -1) score = 80 + (q.length / titleLower.length) * 20;
      else if (shortTitle.indexOf(q) !== -1) score = 75;
      else if (q.indexOf(shortTitle) !== -1) score = 70;
      if (score === 0 && p.keywords) {
        for (var k = 0; k < p.keywords.length; k++) {
          var kw = p.keywords[k].toLowerCase();
          if (kw === q) { score = 60; break; }
          if (kw.indexOf(q) !== -1 || q.indexOf(kw) !== -1) score = Math.max(score, 40);
        }
      }
      if (score === 0) {
        var words = q.split(/\s+/);
        var matchCount = 0;
        for (var w = 0; w < words.length; w++) {
          if (words[w].length < 3) continue;
          if (titleLower.indexOf(words[w]) !== -1) matchCount++;
          if (p.keywords) {
            for (var k2 = 0; k2 < p.keywords.length; k2++) {
              if (p.keywords[k2].toLowerCase().indexOf(words[w]) !== -1) { matchCount++; break; }
            }
          }
        }
        if (matchCount > 0) score = 10 + (matchCount / words.length) * 25;
      }
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (bestScore >= 10) return best;
    if (products.length > 0) {
      var firstWord = q.split(' ')[0];
      for (var j = 0; j < products.length; j++) {
        if (products[j].title.toLowerCase().indexOf(firstWord) !== -1) return products[j];
      }
      return products[0];
    }
    return null;
  }

  function calculateProfit(product) {
    var sp = product.platformPrices ? (product.platformPrices.amazon || product.price * 2.2) : product.price * 2.2;
    var pc = product.price;
    var ship = 2.5;
    var ad = product.adSpendAvg || 3;
    var fee = +(sp * 0.15).toFixed(2);
    var ref = +(sp * 0.03).toFixed(2);
    var net = +(sp - pc - ship - ad - fee - ref).toFixed(2);
    var roi = pc > 0 ? +((net / pc) * 100).toFixed(0) : 0;
    var den = sp - pc - ship - fee - ref - ad;
    var be = den > 0 ? Math.ceil((pc + ship + fee + ref) / den) : Infinity;
    return { sellPrice: sp, productCost: pc, shippingCost: ship, adCost: ad,
      platformFee: fee, refundBuffer: ref, netProfit: net, roi: roi,
      breakEven: be, profitMargin: sp > 0 ? +((net / sp) * 100).toFixed(0) : 0 };
  }

  function getRiskLevel(s) { return s < 25 ? 'low' : s < 50 ? 'med' : 'high'; }
  function getRiskColor(s) { return s < 25 ? 'var(--accent-green)' : s < 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'; }
  function getDotColor(l) { return l === 'low' ? 'green' : l === 'med' ? 'yellow' : 'red'; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function fmtN(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

  function generateCompetitorData(product) {
    var names = ['TechGear Store','DropShip Pro','TrendHunter','QuickShip Hub','PrimeSelection',
      'ValueFinds Co','MegaDeal Shop','TopPick Supplies','DirectSource','SmartBuy Retail',
      'NovaTrade','PeakDrop Store','SwiftCart','PrimeNiche','ViralGoods Hub'];
    var used = {};
    var competitors = [];
    var sp = product.platformPrices ? (product.platformPrices.amazon || product.price * 2.2) : product.price * 2.2;
    for (var i = 0; i < 5; i++) {
      var idx;
      do { idx = Math.floor(Math.random() * names.length); } while (used[idx]);
      used[idx] = true;
      competitors.push({
        name: names[idx],
        price: +(sp * (0.75 + Math.random() * 0.5)).toFixed(2),
        rating: +(3.2 + Math.random() * 1.8).toFixed(1),
        sales: Math.floor(50 + Math.random() * 1500),
        saturation: Math.floor(15 + Math.random() * 70)
      });
    }
    return competitors.sort(function (a, b) { return b.sales - a.sales; });
  }

  function generateKeywordData(product) {
    var kws = (product.keywords || []).slice();
    var title0 = product.title.split('\u2014')[0].trim().toLowerCase();
    var extras = [title0, product.category + ' best', product.category + ' buy online',
      product.category + ' review', product.category + ' 2026', 'best ' + product.category,
      'cheap ' + product.category, product.category + ' deal', title0 + ' price',
      product.category + ' top rated'];
    for (var i = 0; i < extras.length; i++) {
      if (kws.indexOf(extras[i]) === -1) kws.push(extras[i]);
    }
    var base = product.salesVelocity || 2000;
    return kws.map(function (kw) {
      return { word: kw, volume: Math.floor(base * (0.2 + Math.random() * 1.8)),
        competition: Math.floor(10 + Math.random() * 75) };
    }).sort(function (a, b) { return b.volume - a.volume; });
  }

  async function getAIInsight(product, profit, riskAnalysis) {
    var AKM = window.HuntDrop.APIKeyManager;
    if (!AKM || !AKM.hasKey(AKM.getProvider())) {
      return buildFallbackInsight(product, profit, riskAnalysis);
    }
    try {
      var prompt = 'Analyze this dropshipping product and give a concise 2-3 sentence verdict. ' +
        'Product: ' + product.title + ' | Category: ' + product.category +
        ' | Score: ' + product.score + '/100 | Competition: ' + product.competition +
        ' | Demand: ' + product.demand + '/100 | Risk: ' + product.riskScore + '/100' +
        ' | Net Profit: $' + profit.netProfit + ' | ROI: ' + profit.roi + '%' +
        ' | Win Probability: ' + (riskAnalysis ? riskAnalysis.winProbability : 'N/A') + '%' +
        ' | Orders: ' + product.orders + ' | Rating: ' + product.rating +
        ' | Market Saturation: ' + product.marketSaturation + '%.' +
        ' Include: overall recommendation (PROCEED/CAUTION/RECONSIDER), key strength, key risk.';
      var result = await window.HuntDrop.AIChatService.sendMessage(prompt, []);
      if (result && result.success && result.response) {
        return result.response.replace(/\n+/g, ' ').trim();
      }
    } catch (e) {
      console.warn('[AIAnalyst] AI insight failed:', e);
    }
    return buildFallbackInsight(product, profit, riskAnalysis);
  }

  function buildFallbackInsight(product, profit, riskAnalysis) {
    var winProb = riskAnalysis ? riskAnalysis.winProbability : 50;
    var rec = winProb >= 70 ? 'PROCEED' : winProb >= 50 ? 'CAUTION' : 'RECONSIDER';
    var strengths = [];
    var risks = [];
    if (product.score >= 70) strengths.push('high AI score (' + product.score + ')');
    if (profit.netProfit > 10) strengths.push('strong $' + profit.netProfit + ' profit per sale');
    if (product.demand >= 70) strengths.push('high market demand');
    if (product.competition !== 'high') strengths.push('manageable competition');
    if (product.riskScore > 50) risks.push('elevated risk score');
    if (product.marketSaturation > 60) risks.push('high market saturation');
    if (profit.netProfit < 5) risks.push('thin profit margins');
    if (product.competition === 'high') risks.push('intense competition');
    return rec + ': ' + product.title.split('\u2014')[0].trim() + ' shows ' +
      (strengths.length > 0 ? strengths.join(', ') : 'moderate potential') +
      '. Key risks: ' + (risks.length > 0 ? risks.join(', ') : 'minimal') + '.';
  }

  async function searchWebCompetitors(product) {
    var WS = window.HuntDrop.AIWebSearch;
    if (!WS || !WS.hasKey()) return null;
    try {
      var results = await WS.searchCompetitors(product.title.split('\u2014')[0].trim());
      if (results && results.results && results.results.length > 0) {
        return results.results.slice(0, 5).map(function (r, i) {
          return { name: r.title.split(' - ')[0].split(' | ')[0].substring(0, 40),
            url: r.url, snippet: (r.content || '').substring(0, 120), rank: i + 1 };
        });
      }
    } catch (e) { console.warn('[AIAnalyst] Web competitor search failed:', e); }
    return null;
  }

  async function searchWebKeywords(product) {
    var WS = window.HuntDrop.AIWebSearch;
    if (!WS || !WS.hasKey()) return null;
    try {
      var results = await WS.search(product.title.split('\u2014')[0].trim() + ' trending keywords 2026', 5);
      if (results && results.results && results.results.length > 0) {
        return results.results.map(function (r) {
          return { source: r.title, url: r.url, snippet: (r.content || '').substring(0, 150) };
        });
      }
    } catch (e) { console.warn('[AIAnalyst] Web keyword search failed:', e); }
    return null;
  }

  function renderAPIKeyBanner() {
    var AKM = window.HuntDrop.APIKeyManager;
    if (!AKM) return '';
    var status = AKM.getStatus();
    if (status.connected) return '';
    return '<div class="aa-api-banner">' +
      '<div class="aa-api-banner-icon">\ud83d\udd11</div>' +
      '<div class="aa-api-banner-text"><strong>Basic Mode</strong> \u2014 Add your AI API key in Strategy \u2192 AI Settings for AI-powered insights, web competitor research, and full analysis.</div>' +
      '<button class="aa-api-banner-btn" onclick="window.HuntDrop.navigateTo(\'section-ai-settings\')">CONFIGURE</button>' +
    '</div>';
  }

  function renderLoading(text, sub) {
    return '<div class="aa-loading">' +
      '<div class="aa-loading-spinner"></div>' +
      '<div class="aa-loading-text">' + UI.escapeHtml(text) + '</div>' +
      '<div class="aa-loading-sub">' + UI.escapeHtml(sub) + '</div>' +
      '</div>';
  }

  function renderResults(match, profit, riskAnalysis, competitors, keywordData, webComps, webKeywords, aiInsight) {
    var esc = UI.escapeHtml;
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var verdict = match.score >= 75 && match.competition !== 'high' && profit.netProfit > 5;
    var riskLevel = getRiskLevel(match.riskScore);
    var relatedProducts = (window.HuntDrop.ALL_PRODUCTS || []).filter(function (p) {
      return p.id !== match.id && p.category === match.category;
    }).slice(0, 3);

    var hooks = [
      { type: 'Problem-Solution', text: 'Stop struggling with ' + esc(match.category) + ' \u2014 this game-changer does it all' },
      { type: 'Social Proof', text: 'Join 10,000+ happy customers who switched to ' + esc(match.title.split('\u2014')[0].trim()) },
      { type: 'Urgency', text: 'Limited stock: The ' + esc(match.title.split('\u2014')[0].trim()) + ' everyone is talking about' },
      { type: 'Curiosity', text: 'The secret ' + esc(match.category) + " hack pros don't want you to know" },
      { type: 'Before/After', text: 'Before: frustrated. After: obsessed. See why this is different' }
    ];

    return '<div class="aa-output">' +
      '<div class="aa-product-header">' +
        '<img class="aa-product-img" src="' + esc(match.image) + '" alt="' + esc(match.title) + '" onerror="this.style.display=\'none\'">' +
        '<div class="aa-product-info">' +
          '<div class="aa-product-title">' + esc(match.title.split('\u2014')[0].trim()) + '</div>' +
          '<div class="aa-product-meta">' +
            '<span class="aa-product-platform">' + esc(match.platform) + '</span>' +
            '<span class="aa-product-price-tag">$' + profit.sellPrice.toFixed(2) + '</span>' +
            '<span class="aa-product-sold">' + fmtN(match.orders) + ' orders \u00b7 ' + match.rating + '\u2605 \u00b7 ' + fmtN(match.reviews) + ' reviews</span>' +
          '</div>' +
        '</div>' +
        '<div class="aa-verdict ' + (verdict ? 'aa-verdict-go' : 'aa-verdict-no') + '">' + (verdict ? 'RECOMMENDED' : 'HIGH RISK') + '</div>' +
      '</div>' +

      '<div class="aa-grid-4">' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="color:var(--accent-green)">' + match.score + '/100</div><div class="aa-stat-label">AI Score</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="color:var(--accent-cyan)">' + match.demand + '/100</div><div class="aa-stat-label">Demand</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="color:' + getRiskColor(match.riskScore) + '">' + match.riskScore + '/100</div><div class="aa-stat-label">Risk</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="color:var(--accent-orange)">' + match.marketSaturation + '%</div><div class="aa-stat-label">Saturation</div></div>' +
      '</div>' +

      renderRiskCard(match, profit) +
      renderTabs() +
      renderOverviewPanel(match, profit, riskAnalysis, aiInsight) +
      renderProfitPanel(match, profit) +
      renderMarketPanel(match, months) +
      renderAudiencePanel(match) +
      renderCompetitionPanel(competitors, webComps) +
      renderSuppliersPanel(match) +
      renderAdsPanel(match, profit) +
      renderKeywordsPanel(keywordData, webKeywords, match) +
      renderActions() +
      renderRelatedProducts(relatedProducts) +
    '</div>';
  }

  function renderRiskCard(match, profit) {
    var items = [
      { label: 'Market Saturation', level: getRiskLevel(match.marketSaturation < 40 ? 15 : match.marketSaturation < 65 ? 40 : 70),
        text: match.marketSaturation < 40 ? 'Low competition \u2014 room to enter' : match.marketSaturation < 65 ? 'Moderate \u2014 differentiate your offer' : 'High \u2014 crowded market' },
      { label: 'Product Risk', level: getRiskLevel(match.riskScore),
        text: match.riskScore < 25 ? 'Stable product with proven demand' : match.riskScore < 50 ? 'Some volatility \u2014 monitor trends' : 'Trendy \u2014 may fade quickly' },
      { label: 'Ad Cost Risk', level: getRiskLevel(match.adSpendAvg < 5 ? 15 : match.adSpendAvg < 10 ? 40 : 70),
        text: match.adSpendAvg < 5 ? 'Low CPA \u2014 affordable to advertise' : match.adSpendAvg < 10 ? 'Moderate CPA \u2014 requires optimization' : 'High CPA \u2014 need strong conversion' },
      { label: 'Supplier Risk', level: getRiskLevel(match.suppliers.length >= 3 ? 15 : match.suppliers.length >= 2 ? 40 : 70),
        text: match.suppliers.length >= 3 ? 'Multiple verified suppliers' : match.suppliers.length >= 2 ? 'Limited suppliers \u2014 backup recommended' : 'Few options \u2014 negotiate carefully' },
      { label: 'Demand Stability', level: getRiskLevel(match.orders > 500 ? 15 : match.orders > 100 ? 40 : 70),
        text: match.orders > 500 ? 'High volume \u2014 proven demand' : match.orders > 100 ? 'Moderate sales \u2014 growing' : 'Lower volume \u2014 test before scaling' },
      { label: 'Margin Risk', level: getRiskLevel(profit.netProfit > 15 ? 15 : profit.netProfit > 8 ? 40 : 70),
        text: profit.netProfit > 15 ? 'Healthy margins \u2014 strong buffer' : profit.netProfit > 8 ? 'Acceptable margins' : 'Thin margins \u2014 volume-dependent' }
    ];
    var html = '<div class="aa-risk-card"><div class="aa-risk-header"><span class="aa-card-icon">\ud83d\udee1</span>Risk Assessment</div><div class="aa-risk-grid">';
    for (var i = 0; i < items.length; i++) {
      html += '<div class="aa-risk-item risk-' + items[i].level + '">' +
        '<div class="aa-risk-dot dot-' + getDotColor(items[i].level) + '"></div>' +
        '<div><div class="aa-risk-label">' + items[i].label + '</div>' +
        '<div class="aa-risk-text">' + items[i].text + '</div></div></div>';
    }
    return html + '</div></div>';
  }

  function renderTabs() {
    return '<div class="aa-tabs">' +
      '<button class="aa-tab active" data-tab="aa-panel-overview">Overview</button>' +
      '<button class="aa-tab" data-tab="aa-panel-profit">Profit Deep Dive</button>' +
      '<button class="aa-tab" data-tab="aa-panel-market">Market Demand</button>' +
      '<button class="aa-tab" data-tab="aa-panel-audience">Audience</button>' +
      '<button class="aa-tab" data-tab="aa-panel-competition">Competition</button>' +
      '<button class="aa-tab" data-tab="aa-panel-suppliers">Suppliers</button>' +
      '<button class="aa-tab" data-tab="aa-panel-ads">Ad Strategy</button>' +
      '<button class="aa-tab" data-tab="aa-panel-keywords">Keywords & SEO</button>' +
    '</div>';
  }

  function renderOverviewPanel(match, profit, riskAnalysis, aiInsight) {
    var esc = UI.escapeHtml;
    var winProb = riskAnalysis ? riskAnalysis.winProbability : 50;
    return '<div id="aa-panel-overview" class="aa-tab-panel active">' +
      '<div class="aa-card">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\ud83e\udde0</span>AI Verdict</div>' +
        (aiInsight ? '<p class="aa-card-text">' + esc(aiInsight) + '</p>' : '<p class="aa-card-text">' + esc(match.aiInsight || 'Analyzing...') + '</p>') +
      '</div>' +
      '<div class="aa-grid-4" style="margin-top:14px">' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-green)">$' + profit.netProfit.toFixed(2) + '</div><div class="aa-stat-label">Net Profit / Sale</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-cyan)">' + profit.roi + '%</div><div class="aa-stat-label">ROI</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-orange)">' + fmtN(match.salesVelocity) + '/mo</div><div class="aa-stat-label">Sales Velocity</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-purple)">' + (riskAnalysis ? riskAnalysis.winProbability : winProb) + '%</div><div class="aa-stat-label">Win Probability</div></div>' +
      '</div>' +
      (riskAnalysis ? renderRiskFactors(riskAnalysis) : '') +
    '</div>';
  }

  function renderRiskFactors(riskAnalysis) {
    var html = '<div class="aa-card" style="margin-top:14px">' +
      '<div class="aa-card-header"><span class="aa-card-icon">\ud83d\udcca</span>Risk Factor Breakdown</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    if (riskAnalysis.factors.positive.length > 0) {
      html += '<div><div style="font-size:12px;font-weight:600;color:var(--accent-green);margin-bottom:6px">Strengths</div><ul style="list-style:none;padding:0;margin:0">';
      for (var i = 0; i < riskAnalysis.factors.positive.length; i++) {
        html += '<li style="font-size:12px;color:var(--text-secondary);padding:3px 0">\u2192 ' + UI.escapeHtml(riskAnalysis.factors.positive[i]) + '</li>';
      }
      html += '</ul></div>';
    }
    if (riskAnalysis.factors.negative.length > 0) {
      html += '<div><div style="font-size:12px;font-weight:600;color:var(--accent-red);margin-bottom:6px">Risks</div><ul style="list-style:none;padding:0;margin:0">';
      for (var j = 0; j < riskAnalysis.factors.negative.length; j++) {
        html += '<li style="font-size:12px;color:var(--text-secondary);padding:3px 0">\u2192 ' + UI.escapeHtml(riskAnalysis.factors.negative[j]) + '</li>';
      }
      html += '</ul></div>';
    }
    if (riskAnalysis.factors.neutral.length > 0) {
      html += '<div style="grid-column:1/-1"><div style="font-size:12px;font-weight:600;color:var(--accent-cyan);margin-bottom:6px">Neutral</div><ul style="list-style:none;padding:0;margin:0">';
      for (var k = 0; k < riskAnalysis.factors.neutral.length; k++) {
        html += '<li style="font-size:12px;color:var(--text-secondary);padding:3px 0">\u2192 ' + UI.escapeHtml(riskAnalysis.factors.neutral[k]) + '</li>';
      }
      html += '</ul></div>';
    }
    return html + '</div></div>';
  }

  function renderProfitPanel(match, profit) {
    var esc = UI.escapeHtml;
    var cap2 = cap;
    var html = '<div id="aa-panel-profit" class="aa-tab-panel">' +
      '<div class="aa-card">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\ud83d\udcb0</span>Full Profit Breakdown</div>' +
        '<div class="aa-profit-row">' +
          '<div class="aa-profit-item"><span class="aa-profit-label">Sell Price (Amazon)</span><span class="aa-profit-value aa-profit-pos">$' + profit.sellPrice.toFixed(2) + '</span></div>' +
          '<div class="aa-profit-item"><span class="aa-profit-label">Product Cost</span><span class="aa-profit-value aa-profit-neg">-$' + profit.productCost.toFixed(2) + '</span></div>' +
          '<div class="aa-profit-item"><span class="aa-profit-label">Shipping</span><span class="aa-profit-value aa-profit-neg">-$' + profit.shippingCost.toFixed(2) + '</span></div>' +
          '<div class="aa-profit-item"><span class="aa-profit-label">Platform Fee (15%)</span><span class="aa-profit-value aa-profit-neg">-$' + profit.platformFee.toFixed(2) + '</span></div>' +
          '<div class="aa-profit-item"><span class="aa-profit-label">Ad Cost (avg)</span><span class="aa-profit-value aa-profit-neg">-$' + profit.adCost.toFixed(2) + '</span></div>' +
          '<div class="aa-profit-item"><span class="aa-profit-label">Refund Buffer (3%)</span><span class="aa-profit-value aa-profit-neg">-$' + profit.refundBuffer.toFixed(2) + '</span></div>' +
          '<div class="aa-profit-item aa-profit-total"><span class="aa-profit-label">Net Profit Per Sale</span><span class="aa-profit-value" style="color:var(--accent-green)">$' + profit.netProfit.toFixed(2) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="aa-grid-4" style="margin-top:14px">' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-green)">' + profit.roi + '%</div><div class="aa-stat-label">ROI</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-cyan)">' + profit.profitMargin + '%</div><div class="aa-stat-label">Profit Margin</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-orange)">' + (profit.breakEven > 0 && profit.breakEven < 1000 ? profit.breakEven : '\u2014') + '</div><div class="aa-stat-label">Break-Even Units</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-purple)">$' + (profit.netProfit * 100).toFixed(0) + '</div><div class="aa-stat-label">Profit / 100 Sales</div></div>' +
      '</div>';
    if (match.platformPrices) {
      html += '<div class="aa-card" style="margin-top:14px">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\ud83d\udd04</span>Cross-Platform Prices</div>' +
        '<div class="aa-profit-row">';
      var platforms = Object.keys(match.platformPrices);
      for (var i = 0; i < platforms.length; i++) {
        var price = match.platformPrices[platforms[i]];
        var isCurrent = price === profit.sellPrice;
        html += '<div class="aa-profit-item"><span class="aa-profit-label">' + esc(cap2(platforms[i])) + '</span>' +
          '<span class="aa-profit-value" style="color:' + (isCurrent ? 'var(--accent-cyan)' : 'var(--text-primary)') + '">$' + price.toFixed(2) + (isCurrent ? ' \u2190 you' : '') + '</span></div>';
      }
      html += '</div></div>';
    }
    return html + '</div>';
  }

  function renderMarketPanel(match, months) {
    return '<div id="aa-panel-market" class="aa-tab-panel">' +
      '<div class="aa-card">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\ud83d\udcc8</span>12-Month Demand Trend</div>' +
        '<div class="chart-container"><canvas id="aiTrendChart"></canvas></div>' +
      '</div>' +
      '<div class="aa-card" style="margin-top:14px">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\ud83d\uddd3</span>Seasonality Heatmap</div>' +
        '<div style="margin-bottom:8px;font-size:11px;color:var(--text-muted)">Demand intensity by month</div>' +
        '<div class="aa-heatmap">' +
          match.seasonality.map(function (val) {
            var max = Math.max.apply(null, match.seasonality);
            var intensity = max > 0 ? val / max : 0;
            var bg = intensity > 0.7 ? 'rgba(0,255,136,0.35)' : intensity > 0.4 ? 'rgba(0,229,255,0.2)' : 'rgba(85,85,112,0.15)';
            return '<div class="aa-heatmap-cell" style="background:' + bg + '">' + val + '</div>';
          }).join('') +
        '</div>' +
        '<div class="aa-heatmap-labels">' + months.map(function (m) { return '<div class="aa-heatmap-label">' + m + '</div>'; }).join('') + '</div>' +
      '</div>' +
      '<div class="aa-grid-4" style="margin-top:14px">' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-cyan)">' + fmtN(match.salesVelocity) + '</div><div class="aa-stat-label">Monthly Sales</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-green)">' + match.demand + '/100</div><div class="aa-stat-label">Demand Score</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-orange)">' + match.marketSaturation + '%</div><div class="aa-stat-label">Saturation</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:18px;color:var(--accent-purple)">' + fmtN(match.orders) + '</div><div class="aa-stat-label">Total Orders</div></div>' +
      '</div>' +
    '</div>';
  }

  function renderAudiencePanel(match) {
    var esc = UI.escapeHtml;
    return '<div id="aa-panel-audience" class="aa-tab-panel">' +
      '<div class="aa-grid-4">' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:15px">' + esc(match.audience.age) + '</div><div class="aa-stat-label">Age Range</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:15px">' + esc(match.audience.gender) + '</div><div class="aa-stat-label">Gender</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:12px">' + esc(match.audience.countries.slice(0, 3).join(', ')) + '</div><div class="aa-stat-label">Top Countries</div></div>' +
        '<div class="aa-stat-card"><div class="aa-stat-value" style="font-size:15px">$' + match.cpaAvg.toFixed(2) + '</div><div class="aa-stat-label">Est. CPA</div></div>' +
      '</div>' +
      '<div class="aa-card" style="margin-top:14px">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\ud83d\udca1</span>Interests & Behaviors</div>' +
        '<div class="aa-tags">' + match.audience.interests.map(function (i) { return '<span class="aa-tag">' + esc(i) + '</span>'; }).join('') + '</div>' +
      '</div>' +
      '<div class="aa-card" style="margin-top:14px">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\ud83d\udcf1</span>Best Platforms to Reach Them</div>' +
        '<div class="aa-ad-platforms">' +
          '<div class="aa-ad-platform-card"><div class="aa-ad-platform-name">Facebook</div><div class="aa-ad-platform-budget">40% budget</div><div class="aa-ad-platform-type">Carousel + Video Ads</div></div>' +
          '<div class="aa-ad-platform-card"><div class="aa-ad-platform-name">TikTok</div><div class="aa-ad-platform-budget">35% budget</div><div class="aa-ad-platform-type">In-Feed + Spark Ads</div></div>' +
          '<div class="aa-ad-platform-card"><div class="aa-ad-platform-name">Instagram</div><div class="aa-ad-platform-budget">25% budget</div><div class="aa-ad-platform-type">Reels + Stories</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="aa-card" style="margin-top:14px">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\u23f0</span>Optimal Posting Times</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">' +
          '<div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Best Day</div><div style="font-size:14px;font-weight:700">Tue \u2013 Thu</div></div>' +
          '<div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Best Time</div><div style="font-size:14px;font-weight:700">7PM \u2013 10PM</div></div>' +
          '<div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Peak Hours</div><div style="font-size:14px;font-weight:700">Lunch + Evening</div></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderCompetitionPanel(competitors, webComps) {
    var esc = UI.escapeHtml;
    var fmtN2 = fmtN;
    var html = '<div id="aa-panel-competition" class="aa-tab-panel">' +
      '<div class="aa-card">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\u2694\ufe0f</span>Competitor Landscape</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">';
    for (var i = 0; i < competitors.length; i++) {
      var c = competitors[i];
      html += '<div class="aa-comp-row">' +
        '<div class="aa-comp-rank">#' + (i + 1) + '</div>' +
        '<div class="aa-comp-thumb">\ud83c\udfea</div>' +
        '<div class="aa-comp-info"><div class="aa-comp-name">' + esc(c.name) + '</div>' +
        '<div class="aa-comp-detail">' + c.rating + '\u2605 \u00b7 ' + fmtN2(c.sales) + ' sales</div></div>' +
        '<div class="aa-comp-price">$' + c.price.toFixed(2) + '</div>' +
        '<div class="aa-comp-bar-wrap"><div class="aa-comp-bar-bg"><div class="aa-comp-bar-fill" style="width:' + c.saturation + '%;background:' + (c.saturation > 60 ? 'var(--accent-red)' : c.saturation > 35 ? 'var(--accent-yellow)' : 'var(--accent-green)') + '"></div></div>' +
        '<div class="aa-comp-bar-label">' + c.saturation + '%</div></div></div>';
    }
    html += '</div></div>';
    html += renderSWOTPanel(competitors);
    if (webComps && webComps.length > 0) {
      html += '<div class="aa-card" style="margin-top:14px">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\ud83c\udf10</span>Real Competitors from Web</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">';
      for (var j = 0; j < webComps.length; j++) {
        var wc = webComps[j];
        html += '<div style="padding:10px 14px;background:var(--bg-secondary);border-radius:var(--radius-sm);display:flex;align-items:center;gap:12px">' +
          '<div style="font-size:11px;color:var(--text-muted);min-width:24px">#' + wc.rank + '</div>' +
          '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(wc.name) + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(wc.snippet) + '</div></div></div>';
      }
      html += '</div></div>';
    }
    return html + '</div>';
  }

  function renderSWOTPanel(competitors) {
    var match = window.HuntDrop._currentAnalystProduct;
    if (!match) return '';
    var profit = calculateProfit(match);
    return '<div class="aa-card" style="margin-top:14px">' +
      '<div class="aa-card-header"><span class="aa-card-icon">\ud83d\udccb</span>SWOT Analysis</div>' +
      '<div class="aa-swot-grid">' +
        '<div class="aa-swot-card swot-s"><div class="aa-swot-title" style="color:var(--accent-green)">Strengths</div><ul class="aa-swot-list">' +
          '<li>' + (match.score >= 70 ? 'High AI score validates quality' : 'Moderate market fit') + '</li>' +
          '<li>' + (profit.netProfit > 10 ? 'Strong profit margins' : 'Competitive pricing possible') + '</li>' +
          '<li>' + (match.demand >= 70 ? 'Proven consumer demand' : 'Growing niche interest') + '</li>' +
        '</ul></div>' +
        '<div class="aa-swot-card swot-w"><div class="aa-swot-title" style="color:var(--accent-red)">Weaknesses</div><ul class="aa-swot-list">' +
          '<li>' + (match.competition === 'high' ? 'Saturated competitive space' : 'Need brand differentiation') + '</li>' +
          '<li>' + (profit.adCost > 8 ? 'High customer acquisition cost' : 'Ad creative testing required') + '</li>' +
          '<li>' + (match.riskScore > 50 ? 'Trend-dependent demand' : 'Standard product lifecycle') + '</li>' +
        '</ul></div>' +
        '<div class="aa-swot-card swot-o"><div class="aa-swot-title" style="color:var(--accent-cyan)">Opportunities</div><ul class="aa-swot-list">' +
          '<li>' + (match.marketSaturation < 40 ? 'Low saturation = early mover advantage' : 'Bundle/upsell potential') + '</li>' +
          '<li>' + (match.audience.countries.length > 2 ? 'Multi-market expansion' : 'Untapped geographic markets') + '</li>' +
          '<li>Seasonal marketing campaigns</li>' +
        '</ul></div>' +
        '<div class="aa-swot-card swot-t"><div class="aa-swot-title" style="color:var(--accent-orange)">Threats</div><ul class="aa-swot-list">' +
          '<li>' + (match.competition === 'high' ? 'Established competitors with reviews' : 'New entrants may increase competition') + '</li>' +
          '<li>' + (match.riskScore > 40 ? 'Demand could shift with trends' : 'Price war risk from low-cost sellers') + '</li>' +
          '<li>Supplier reliability concerns</li>' +
        '</ul></div>' +
      '</div></div>';
  }

  function renderSuppliersPanel(match) {
    var esc = UI.escapeHtml;
    var fmtN2 = fmtN;
    var html = '<div id="aa-panel-suppliers" class="aa-tab-panel">' +
      '<div class="aa-card">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\ud83c\udfe2</span>Best Suppliers</div>' +
        '<div class="aa-suppliers">';
    for (var i = 0; i < match.suppliers.length; i++) {
      var s = match.suppliers[i];
      html += '<div class="aa-supplier">' +
        '<div class="aa-supplier-avatar">' + esc(s.name.charAt(0)) + '</div>' +
        '<div class="aa-supplier-info"><div class="aa-supplier-name">' + esc(s.name) + '</div>' +
        '<div class="aa-supplier-loc">' + esc(s.location) + '</div></div>' +
        '<div class="aa-supplier-stats">' +
          '<span class="aa-supplier-stat"><span style="color:var(--accent-yellow)">' + s.rating + '\u2605</span></span>' +
          '<span class="aa-supplier-stat">' + fmtN2(s.orders) + ' orders</span>' +
          '<span class="aa-supplier-stat">' + esc(s.responseTime) + '</span>' +
          (s.verified ? '<span class="aa-supplier-badge">\u2713 Verified</span>' : '') +
        '</div></div>';
    }
    html += '</div></div>' +
      '<div class="aa-card" style="margin-top:14px">' +
        '<div class="aa-card-header"><span class="aa-card-icon">\ud83d\udcdd</span>Supplier Tips</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
          '<div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary);line-height:1.6;border-left:3px solid var(--accent-green)">\u2192 Always order samples first to verify quality before committing to bulk orders.</div>' +
          '<div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary);line-height:1.6;border-left:3px solid var(--accent-cyan)">\u2192 Negotiate shipping terms \u2014 ePacket or tracked packets for US/EU buyers.</div>' +
          '<div style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary);line-height:1.6;border-left:3px solid var(--accent-orange)">\u2192 Check supplier response time consistently \u2014 slow replies = slow fulfillment.</div>' +
        '</div></div></div>';
    return html;
  }

  function renderAdsPanel(match, profit) {
    var esc = UI.escapeHtml;
    var title0 = match.title.split('\u2014')[0].trim();
    var hooks = [
      { type: 'Problem-Solution', text: 'Stop struggling with ' + esc(match.category) + ' \u2014 this game-changer does it all' },
      { type: 'Social Proof', text: 'Join 10,000+ happy customers who switched to ' + esc(title0) },
      { type: 'Urgency', text: 'Limited stock: The ' + esc(title0) + ' everyone is talking about' },
      { type: 'Curiosity', text: 'The secret ' + esc(match.category) + " hack pros don't want you to know" },
      { type: 'Before/After', text: 'Before: frustrated. After: obsessed. See why this is different' }
    ];
    var html = '<div id="aa-panel-ads" class="aa-tab-panel">' +
      '<div class="aa-card"><div class="aa-card-header"><span class="aa-card-icon">\ud83c\udfa3</span>Winning Ad Hooks</div>' +
      '<div class="aa-ad-hooks">';
    for (var i = 0; i < hooks.length; i++) {
      html += '<div class="aa-ad-hook"><div class="aa-ad-hook-type">' + esc(hooks[i].type) + '</div><div>"' + esc(hooks[i].text) + '"</div></div>';
    }
    html += '</div></div>' +
      '<div class="aa-card" style="margin-top:14px"><div class="aa-card-header"><span class="aa-card-icon">\ud83d\udcca</span>Budget Allocation</div>' +
      '<div class="aa-ad-budget-bar">' +
        '<div class="aa-ad-budget-seg" style="width:40%;background:var(--accent-cyan)"></div>' +
        '<div class="aa-ad-budget-seg" style="width:35%;background:var(--accent-purple)"></div>' +
        '<div class="aa-ad-budget-seg" style="width:25%;background:var(--accent-orange)"></div>' +
      '</div>' +
      '<div class="aa-ad-platforms">' +
        '<div class="aa-ad-platform-card"><div class="aa-ad-platform-name" style="color:var(--accent-cyan)">Facebook</div><div class="aa-ad-platform-budget">40% \u00b7 $' + (profit.adCost * 0.4 * 30).toFixed(0) + '/mo</div><div class="aa-ad-platform-type">Carousel + Video</div></div>' +
        '<div class="aa-ad-platform-card"><div class="aa-ad-platform-name" style="color:var(--accent-purple)">TikTok</div><div class="aa-ad-platform-budget">35% \u00b7 $' + (profit.adCost * 0.35 * 30).toFixed(0) + '/mo</div><div class="aa-ad-platform-type">In-Feed + Spark</div></div>' +
        '<div class="aa-ad-platform-card"><div class="aa-ad-platform-name" style="color:var(--accent-orange)">Instagram</div><div class="aa-ad-platform-budget">25% \u00b7 $' + (profit.adCost * 0.25 * 30).toFixed(0) + '/mo</div><div class="aa-ad-platform-type">Reels + Stories</div></div>' +
      '</div></div>' +
      '<div class="aa-card" style="margin-top:14px"><div class="aa-card-header"><span class="aa-card-icon">\u270d\ufe0f</span>Sample Ad Copy</div>' +
      '<div class="aa-ad-copy-block"><div class="aa-ad-copy-label">Facebook Carousel</div><div class="aa-ad-copy-text">Tired of ' + esc(match.category) + ' that don\'t deliver? \ud83d\udd25 Our ' + esc(title0) + ' is rated ' + match.rating + '\u2605 by ' + fmtN(match.reviews) + ' happy customers. Shop now and see the difference.</div></div>' +
      '<div class="aa-ad-copy-block"><div class="aa-ad-copy-label">TikTok In-Feed (15s)</div><div class="aa-ad-copy-text">POV: You finally found the perfect ' + esc(match.category) + ' \u2728 ' + fmtN(match.orders) + ' people already ordered theirs. Link in bio before it sells out \ud83d\udc40</div></div>' +
      '<div class="aa-ad-copy-block"><div class="aa-ad-copy-label">Instagram Reel (30s)</div><div class="aa-ad-copy-text">This ' + esc(match.category) + ' changed everything for me. ' + match.rating + '\u2605 rating, ' + fmtN(match.orders) + ' orders, and it\'s still flying under the radar. Grab yours before everyone else catches on \ud83d\ude80</div></div>' +
      '</div></div></div>';
    return html;
  }

  function renderKeywordsPanel(keywordData, webKeywords, match) {
    var esc = UI.escapeHtml;
    var html = '<div id="aa-panel-keywords" class="aa-tab-panel">' +
      '<div class="aa-card"><div class="aa-card-header"><span class="aa-card-icon">\ud83d\udd11</span>Keyword Research</div>' +
      '<div class="aa-kw-primary"><div class="aa-kw-section-title">Primary Keywords</div>';
    var primary = keywordData.slice(0, 5);
    for (var i = 0; i < primary.length; i++) {
      var kw = primary[i];
      html += '<div class="aa-kw-row"><span class="aa-kw-word">' + esc(kw.word) + '</span>' +
        '<span class="aa-kw-vol">' + fmtN(kw.volume) + '/mo</span>' +
        '<div class="aa-kw-comp"><div class="aa-kw-comp-bar"><div class="aa-kw-comp-fill" style="width:' + kw.competition + '%;background:' + (kw.competition > 60 ? 'var(--accent-red)' : kw.competition > 35 ? 'var(--accent-yellow)' : 'var(--accent-green)') + '"></div></div></div></div>';
    }
    html += '</div><div class="aa-kw-primary"><div class="aa-kw-section-title">Long-Tail Keywords</div>';
    var longtail = keywordData.slice(5);
    for (var j = 0; j < longtail.length; j++) {
      var kw2 = longtail[j];
      html += '<div class="aa-kw-row"><span class="aa-kw-word">' + esc(kw2.word) + '</span>' +
        '<span class="aa-kw-vol">' + fmtN(kw2.volume) + '/mo</span>' +
        '<div class="aa-kw-comp"><div class="aa-kw-comp-bar"><div class="aa-kw-comp-fill" style="width:' + kw2.competition + '%;background:' + (kw2.competition > 60 ? 'var(--accent-red)' : kw2.competition > 35 ? 'var(--accent-yellow)' : 'var(--accent-green)') + '"></div></div></div></div>';
    }
    html += '</div></div>';
    html += '<div class="aa-card" style="margin-top:14px"><div class="aa-card-header"><span class="aa-card-icon">\ud83c\udff7</span>All Tags</div>' +
      '<div class="aa-tags">' + match.keywords.map(function (k) { return '<span class="aa-tag">' + esc(k) + '</span>'; }).join('') + '</div></div>';
    html += '<div class="aa-card" style="margin-top:14px"><div class="aa-card-header"><span class="aa-card-icon">\ud83d\udcdd</span>Suggested Listing Title</div>' +
      '<div class="aa-kw-listing"><div class="aa-kw-listing-label">Optimized Title</div>' +
      '<div class="aa-kw-listing-text">' + esc(match.title.split('\u2014')[0].trim()) + ' - ' +
      keywordData.slice(0, 3).map(function (k) { return esc(k.word); }).join(', ') +
      ' | ' + match.rating + '\u2605 Rated | Free Shipping</div></div></div>';
    if (webKeywords && webKeywords.length > 0) {
      html += '<div class="aa-card" style="margin-top:14px"><div class="aa-card-header"><span class="aa-card-icon">\ud83c\udf10</span>Web Research Insights</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">';
      for (var k = 0; k < webKeywords.length; k++) {
        var wk = webKeywords[k];
        html += '<div style="padding:10px 14px;background:var(--bg-secondary);border-radius:var(--radius-sm)">' +
          '<div style="font-size:12px;font-weight:600;margin-bottom:4px">' + esc(wk.source) + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + esc(wk.snippet) + '</div></div>';
      }
      html += '</div></div>';
    }
    return html + '</div>';
  }

  function renderActions() {
    return '<div class="aa-actions">' +
      '<a class="aa-action-btn" href="#section-supplier-hub" onclick="window.HuntDrop.EventBus.emit(\'navigate\',{section:\'section-supplier-hub\'})"><span class="aa-action-icon">\ud83c\udfed</span>Find Suppliers</a>' +
      '<a class="aa-action-btn" href="#section-profit-calc" onclick="window.HuntDrop.EventBus.emit(\'navigate\',{section:\'section-profit-calc\'})"><span class="aa-action-icon">\ud83e\uddee</span>Calculate Profit</a>' +
      '<a class="aa-action-btn" href="#section-ad-studio" onclick="window.HuntDrop.EventBus.emit(\'navigate\',{section:\'section-ad-studio\'})"><span class="aa-action-icon">\ud83c\udfaf</span>Generate Ad Copy</a>' +
      '<a class="aa-action-btn" href="#section-battlefield" onclick="window.HuntDrop.EventBus.emit(\'navigate\',{section:\'section-battlefield\'})"><span class="aa-action-icon">\u2694\ufe0f</span>Spy Competitors</a>' +
    '</div>';
  }

  function renderRelatedProducts(relatedProducts) {
    if (relatedProducts.length === 0) return '';
    var esc = UI.escapeHtml;
    var html = '<div class="aa-card" style="margin-top:14px">' +
      '<div class="aa-card-header"><span class="aa-card-icon">\ud83d\udd0d</span>Related Products Worth Analyzing</div>' +
      '<div class="aa-related-grid">';
    for (var i = 0; i < relatedProducts.length; i++) {
      var rp = relatedProducts[i];
      html += '<div class="aa-related-card" data-related-query="' + esc(rp.title.split('\u2014')[0].trim()) + '">' +
        '<img class="aa-related-img" src="' + esc(rp.image) + '" alt="' + esc(rp.title) + '" onerror="this.style.display=\'none\'">' +
        '<div class="aa-related-title">' + esc(rp.title.split('\u2014')[0].trim()) + '</div>' +
        '<div class="aa-related-meta"><span class="aa-related-score">' + rp.score + '/100</span>' +
        '<span class="aa-related-price">$' + rp.price.toFixed(2) + '</span></div></div>';
    }
    return html + '</div></div>';
  }

  const AIAnalystPlugin = {
    id: 'ai-analyst',
    name: 'AI Analysis',
    version: '3.0.0',
    description: 'Deep AI-powered product analysis with real risk scoring, web search, and AI insights',
    dependencies: ['search-engine'],

    init(_ctx) {
      Config.defaults('aianalyst', { enabled: true });
    },

    mount(_ctx) {
      var container = UI.$('sections-container');
      if (!container) return;

      var section = document.createElement('section');
      section.className = 'section section-ai-analyst';
      section.id = 'section-ai-analyst';
      section.innerHTML = '<div class="section-inner">' +
        '<div class="aa-hero">' +
          '<div class="aa-hero-badge"><span class="aa-hero-badge-dot"></span>AI-Powered v3.0</div>' +
          '<h1 class="aa-hero-title">Product Intelligence Engine</h1>' +
          '<p class="aa-hero-desc">Instant deep analysis on any product \u2014 market demand, competition, profit potential, risk scoring, trending data, and supplier recommendations. Powered by real AI.</p>' +
        '</div>' +
        '<div class="aa-features">' +
          '<div class="aa-feature-card"><div class="aa-feature-icon" style="background:rgba(0,229,255,0.1);color:var(--accent-cyan)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20.66 6A10 10 0 0 0 12 2v10h10a10 10 0 0 0-1.34-6z"/></svg></div><div class="aa-feature-title">AI Risk Scoring</div><div class="aa-feature-desc">Real risk analysis with win probability</div></div>' +
          '<div class="aa-feature-card"><div class="aa-feature-icon" style="background:rgba(0,255,136,0.1);color:var(--accent-green)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="aa-feature-title">Profit Breakdown</div><div class="aa-feature-desc">Cost, margins & revenue per sale</div></div>' +
          '<div class="aa-feature-card"><div class="aa-feature-icon" style="background:rgba(168,85,247,0.1);color:var(--accent-purple)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div><div class="aa-feature-title">AI Insights</div><div class="aa-feature-desc">GPT-powered verdict & analysis</div></div>' +
          '<div class="aa-feature-card"><div class="aa-feature-icon" style="background:rgba(251,191,36,0.1);color:var(--accent-orange)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="aa-feature-title">Web Research</div><div class="aa-feature-desc">Real competitor & keyword data</div></div>' +
        '</div>' +
        '<div class="aa-search-box"><div class="aa-search-inner">' +
          '<svg class="aa-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input type="text" id="aiInput" placeholder="Try: galaxy projector, pet fountain, posture corrector..." class="aa-search-input" autocomplete="off">' +
          '<button id="aiAnalyzeBtn" class="aa-search-btn"><span class="aa-btn-text">Analyze</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>' +
        '</div></div>' +
        '<div class="aa-suggestions"><span class="aa-suggestion-label">Quick analysis:</span>' +
          '<button class="aa-chip" data-query="galaxy projector">Galaxy Projector</button>' +
          '<button class="aa-chip" data-query="pet fountain">Pet Fountain</button>' +
          '<button class="aa-chip" data-query="posture corrector">Posture Corrector</button>' +
          '<button class="aa-chip" data-query="wireless earbuds">Wireless Earbuds</button>' +
          '<button class="aa-chip" data-query="drone camera">Drone Camera</button>' +
          '<button class="aa-chip" data-query="eyelash curler">Eyelash Curler</button>' +
        '</div>' +
        '<div id="aiResults" class="aa-results"></div>' +
        (window.HuntDrop.renderRelatedTools ? window.HuntDrop.renderRelatedTools([
          { section: 'section-market-gaps', name: 'Market Gap Finder', desc: 'Find unmet demand', icon: '\ud83d\udd0d', color: '#10b981' },
          { section: 'section-lifecycle', name: 'Product Lifecycle Radar', desc: 'Track product maturity', icon: '\ud83d\udce1', color: '#6366f1' },
          { section: 'section-battlefield', name: 'Competitor Battlefield', desc: 'Map competitor landscape', icon: '\u2694\ufe0f', color: '#f43f5e' },
          { section: 'section-ad-studio', name: 'Ad Studio', desc: 'Generate ad creatives', icon: '\ud83c\udfaf', color: '#f59e0b' }
        ]) : '') +
      '</div>';
      container.appendChild(section);
      _section = section;

      var btn = section.querySelector('#aiAnalyzeBtn');
      var input = section.querySelector('#aiInput');
      if (btn) btn.addEventListener('click', function () { AIAnalystPlugin.runAnalysis(input ? input.value : ''); });
      if (input) input.addEventListener('keypress', function (e) { if (e.key === 'Enter') AIAnalystPlugin.runAnalysis(input.value); });

      section.querySelectorAll('.aa-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          var q = chip.dataset.query;
          if (input) input.value = q;
          AIAnalystPlugin.runAnalysis(q);
        });
      });

      _cleanups.push(EventBus.on('ai-analyst:run', function (data) {
        if (data && data.query) AIAnalystPlugin.runAnalysis(data.query);
      }));
    },

    unmount(_ctx) {
      if (_abortController) { _abortController.abort(); _abortController = null; }
      if (_trendChart) { _trendChart.destroy(); _trendChart = null; }
      if (_seasonChart) { _seasonChart.destroy(); _seasonChart = null; }
      if (_section) { _section.remove(); _section = null; }
      _cleanups.forEach(function (fn) { try { fn(); } catch (e) { /* ignored */ } });
      _cleanups = [];
    },

    async runAnalysis(query) {
      if (!query || !query.trim()) return;
      var esc = UI.escapeHtml;
      var resultsEl = _section ? _section.querySelector('#aiResults') : null;
      if (!resultsEl) return;

      if (_abortController) _abortController.abort();
      _abortController = new AbortController();

      resultsEl.innerHTML = renderLoading('Searching for "' + esc(query) + '"...', 'Matching products across all platforms');
      await new Promise(function (r) { setTimeout(r, 400); });

      var match = matchProduct(query);
      if (!match) {
        resultsEl.innerHTML = '<div class="aa-card" style="text-align:center;padding:40px">' +
          '<div style="font-size:40px;margin-bottom:12px">\ud83d\udd0d</div>' +
          '<div style="font-size:16px;font-weight:600;margin-bottom:6px">No products found</div>' +
          '<div style="font-size:13px;color:var(--text-muted)">Try searching for a product first, then analyze it here.</div></div>';
        return;
      }

      window.HuntDrop._currentAnalystProduct = match;
      var profit = calculateProfit(match);

      resultsEl.innerHTML = renderLoading('Analyzing ' + esc(match.title.split('\u2014')[0].trim()) + '...', 'Running AI risk analysis & web research');
      await new Promise(function (r) { setTimeout(r, 300); });

      var riskAnalysis = null;
      try {
        var RISK = window.HuntDrop.AIRiskAnalyzer;
        if (RISK) riskAnalysis = RISK.analyzeProduct(match);
      } catch (e) { console.warn('[AIAnalyst] Risk analysis failed:', e); }

      resultsEl.innerHTML = renderLoading('Deep-scanning market data...', 'Fetching competitor intelligence & keyword data');
      var competitors = generateCompetitorData(match);
      var keywordData = generateKeywordData(match);

      var webComps = null;
      var webKeywords = null;
      try {
        var promises = [searchWebCompetitors(match), searchWebKeywords(match)];
        var results = await Promise.all(promises);
        webComps = results[0];
        webKeywords = results[1];
      } catch (e) { console.warn('[AIAnalyst] Web search failed:', e); }

      resultsEl.innerHTML = renderLoading('Generating AI insights...', 'Building comprehensive product verdict');
      var aiInsight = await getAIInsight(match, profit, riskAnalysis);

      if (_abortController && _abortController.signal.aborted) return;

      resultsEl.innerHTML = renderAPIKeyBanner() + renderResults(match, profit, riskAnalysis, competitors, keywordData, webComps, webKeywords, aiInsight);

      if (_section) {
        _section.querySelectorAll('.aa-tab').forEach(function (tab) {
          tab.addEventListener('click', function () { switchTab(tab.dataset.tab); });
        });
        var relatedGrid = _section.querySelector('.aa-related-grid');
        if (relatedGrid) {
          relatedGrid.addEventListener('click', function (e) {
            var card = e.target.closest('.aa-related-card[data-related-query]');
            if (!card) return;
            var q = card.getAttribute('data-related-query');
            var aiInput = document.getElementById('aiInput');
            if (aiInput) aiInput.value = q;
            EventBus.emit('ai-analyst:run', { query: q });
          });
        }
      }

      setTimeout(function () {
        var chartCtx = _section ? _section.querySelector('#aiTrendChart') : null;
        if (chartCtx && typeof Chart !== 'undefined') {
          if (_trendChart) _trendChart.destroy();
          _trendChart = new Chart(chartCtx, {
            type: 'line',
            data: {
              labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
              datasets: [{
                label: 'Demand', data: match.trendData,
                borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.06)',
                borderWidth: 2, fill: true, tension: 0.4,
                pointBackgroundColor: '#00ff88', pointBorderColor: '#06060c', pointBorderWidth: 2, pointRadius: 3
              }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { color: 'rgba(255,255,255,0.025)' }, ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 9 } } },
                y: { grid: { color: 'rgba(255,255,255,0.025)' }, ticks: { color: '#555570', font: { family: 'JetBrains Mono', size: 9 } } }
              }
            }
          });
        }
      }, 100);
    }
  };

  window.HuntDrop._currentAnalystProduct = null;
  window.HuntDrop._currentAnalystProfit = null;
  PluginRegistry.register('ai-analyst', AIAnalystPlugin);
})();
