// ============================================================================
// PLUGIN: AI Chat Service — Multi-provider AI chat with full context
// ============================================================================
(function(){
const {PluginRegistry,Config,UI} = window.HuntDrop;

const AIChatService = {
  id: 'ai-chat-service',
  name: 'AI Chat Service',
  version: '1.0.0',

  init(ctx) {},

  mount(ctx) {},

  unmount(ctx) {},

  async sendMessage(userMessage, conversationHistory) {
    var provider = window.HuntDrop.APIKeyManager.getProvider();
    var key = await window.HuntDrop.APIKeyManager.getKey(provider);
    if (!key) {
      return this.fallbackResponse(userMessage);
    }
    var context = window.HuntDrop.AIContextBuilder.buildFullContext();
    var systemPrompt = this.buildSystemPrompt(context);
    var messages = this.buildMessages(systemPrompt, userMessage, conversationHistory);
    try {
      var response;
      switch(provider) {
        case 'openai':
        case 'groq':
          response = await this.callOpenAI(provider, key, messages);
          break;
        case 'anthropic':
          response = await this.callAnthropic(provider, key, messages);
          break;
        case 'google':
          response = await this.callGoogle(provider, key, messages);
          break;
        default:
          response = this.fallbackResponse(userMessage);
      }
      return { success: true, response: response, provider: provider };
    } catch(e) {
      console.error('[AIChat] API error:', e);
      return { success: false, response: this.fallbackResponse(userMessage), error: e.message };
    }
  },

  async searchAndRespond(userMessage, conversationHistory) {
    var webResults = null;
    var needsSearch = this.needsWebSearch(userMessage);
    if (needsSearch) {
      try {
        webResults = await window.HuntDrop.AIWebSearch.search(userMessage, 5);
      } catch(e) {
        console.warn('[AIChat] Web search failed:', e);
      }
    }
    var provider = window.HuntDrop.APIKeyManager.getProvider();
    var key = await window.HuntDrop.APIKeyManager.getKey(provider);
    if (!key) {
      return { success: true, response: this.fallbackResponse(userMessage), provider: 'fallback', webResults: webResults };
    }
    var context = window.HuntDrop.AIContextBuilder.buildFullContext();
    if (webResults) context.webResults = webResults;
    var systemPrompt = this.buildSystemPrompt(context);
    var messages = this.buildMessages(systemPrompt, userMessage, conversationHistory);
    try {
      var response;
      switch(provider) {
        case 'openai':
        case 'groq':
          response = await this.callOpenAI(provider, key, messages);
          break;
        case 'anthropic':
          response = await this.callAnthropic(provider, key, messages);
          break;
        case 'google':
          response = await this.callGoogle(provider, key, messages);
          break;
        default:
          response = this.fallbackResponse(userMessage);
      }
      return { success: true, response: response, provider: provider, webResults: webResults };
    } catch(e) {
      console.error('[AIChat] API error:', e);
      return { success: false, response: this.fallbackResponse(userMessage), error: e.message };
    }
  },

  needsWebSearch(query) {
    var q = query.toLowerCase();
    var searchTriggers = ['price', 'cost', 'buy', 'amazon', 'ebay', 'shopify', 'tiktok', 'trending', 'viral', 'competitor', 'selling', 'store', 'market', 'industry', 'benchmark', 'review', 'rating', 'compare', 'alternative', 'cheaper', 'expensive', 'deal', 'coupon', 'discount', '2025', '2026', 'latest', 'new', 'current', 'now', 'today'];
    return searchTriggers.some(function(t) { return q.indexOf(t) > -1; });
  },

  buildSystemPrompt(context) {
    var prompt = 'You are HuntDrop AI Coach — an expert dropshipping business advisor.\n\n';
    prompt += '## YOUR ROLE\n';
    prompt += '- Strategic advisor for dropshipping businesses\n';
    prompt += '- Analyze products, suppliers, competition, and market trends\n';
    prompt += '- Give data-driven, actionable advice\n';
    prompt += '- Help users make informed business decisions\n';
    prompt += '- Detect and warn about potential issues\n\n';

    prompt += '## CURRENT APP STATE\n';
    prompt += 'User is on: ' + (context.userState.currentPage || 'dashboard') + '\n';
    prompt += 'Experience level: ' + (context.userState.experienceLevel || 'beginner') + '\n\n';

    prompt += '## PRODUCT CATALOG (' + context.products.length + ' products)\n';
    context.products.forEach(function(p) {
      prompt += '- ' + p.title + ' (' + p.platform + ') Score:' + p.score + ' Margin:' + p.margin + '% Price:$' + p.price + ' Competition:' + p.competition + ' Risk:' + p.riskScore + '\n';
    });

    if (context.toolStates.profitCalculator.lastCalculation) {
      prompt += '\n## LAST PROFIT CALCULATION\n';
      var calc = context.toolStates.profitCalculator.lastCalculation;
      prompt += JSON.stringify(calc) + '\n';
    }

    if (context.toolStates.storeHealth.lastScore) {
      prompt += '\n## STORE HEALTH\n';
      prompt += 'Score: ' + context.toolStates.storeHealth.lastScore + '/100\n';
    }

    prompt += '\n## SYSTEM HEALTH\n';
    prompt += 'Health Score: ' + context.systemHealth.score + '/100\n';
    if (context.systemHealth.issues.length > 0) {
      prompt += 'Issues: ' + context.systemHealth.issues.join('; ') + '\n';
    }
    if (context.systemHealth.warnings.length > 0) {
      prompt += 'Warnings: ' + context.systemHealth.warnings.join('; ') + '\n';
    }

    if (context.webResults) {
      prompt += '\n## WEB SEARCH RESULTS\n';
      prompt += window.HuntDrop.AIWebSearch.formatResultsForAI(context.webResults);
    }

    prompt += '\n## AVAILABLE TOOLS\n';
    prompt += 'product-grid, ai-analyst, profit-calculator, ad-studio, ad-budget-allocator, ';
    prompt += 'supplier-hub, supplier-intelligence, store-generator, store-health, niche-radar, ';
    prompt += 'product-hunt, market-gap-finder, competitor-battlefield, customer-persona, ';
    prompt += 'content-calendar, price-elasticity, profit-time-machine, business-simulator, ';
    prompt += 'bundle-intelligence, objection-handler, spy-center, ai-business-coach\n\n';

    prompt += '## RESPONSE RULES\n';
    prompt += '- Be concise and actionable (adapt length to question complexity)\n';
    prompt += '- Use actual numbers from the product data\n';
    prompt += '- Include risk assessment when evaluating products\n';
    prompt += '- Suggest specific next actions with tool names\n';
    prompt += '- Warn about any issues you detect\n';
    prompt += '- Use markdown formatting for readability\n';
    prompt += '- If web search results are available, incorporate them into your analysis\n';
    prompt += '- Always provide a clear recommendation (PROCEED / CAUTION / RECONSIDER)\n';

    return prompt;
  },

  buildMessages(systemPrompt, userMessage, history) {
    var messages = [{ role: 'system', content: systemPrompt }];
    if (history && history.length > 0) {
      var recent = history.slice(-10);
      recent.forEach(function(msg) {
        messages.push({ role: msg.role, content: msg.content });
      });
    }
    messages.push({ role: 'user', content: userMessage });
    return messages;
  },

  async callOpenAI(provider, key, messages) {
    var config = window.HuntDrop.APIKeyManager.providers[provider];
    var model = window.HuntDrop.APIKeyManager.getModel();
    var resp = await fetch(config.endpoint, {
      method: 'POST',
      headers: window.HuntDrop.APIKeyManager.getHeaders(provider, key),
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    if (!resp.ok) throw new Error('API returned ' + resp.status);
    var data = await resp.json();
    return data.choices[0].message.content;
  },

  async callAnthropic(provider, key, messages) {
    var config = window.HuntDrop.APIKeyManager.providers[provider];
    var model = window.HuntDrop.APIKeyManager.getModel();
    var systemMsg = '';
    var chatMsgs = [];
    messages.forEach(function(m) {
      if (m.role === 'system') systemMsg = m.content;
      else chatMsgs.push(m);
    });
    var resp = await fetch(config.endpoint, {
      method: 'POST',
      headers: window.HuntDrop.APIKeyManager.getHeaders(provider, key),
      body: JSON.stringify({
        model: model,
        system: systemMsg,
        messages: chatMsgs,
        max_tokens: 2000
      })
    });
    if (!resp.ok) throw new Error('API returned ' + resp.status);
    var data = await resp.json();
    return data.content[0].text;
  },

  async callGoogle(provider, key, messages) {
    var config = window.HuntDrop.APIKeyManager.providers[provider];
    var model = window.HuntDrop.APIKeyManager.getModel();
    var url = config.endpoint + '/' + model + ':generateContent?key=' + key;
    var contents = [];
    messages.forEach(function(m) {
      if (m.role !== 'system') {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        });
      }
    });
    var systemMsg = messages.find(function(m) { return m.role === 'system'; });
    if (systemMsg) {
      contents.unshift({ role: 'user', parts: [{ text: systemMsg.content }] });
    }
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: contents })
    });
    if (!resp.ok) throw new Error('API returned ' + resp.status);
    var data = await resp.json();
    return data.candidates[0].content.parts[0].text;
  },

  fallbackResponse(query) {
    var products = window.HuntDrop.ALL_PRODUCTS || [];
    var q = (query || '').toLowerCase();

    if (q.indexOf('sell') > -1 || q.indexOf('should i') > -1) {
      var product = products.sort(function(a, b) { return b.score - a.score; })[0];
      if (product) {
        var profit = this.estimateProfit(product);
        return 'Based on your catalog, I recommend: **' + product.title + '**\n\n' +
          '**Score:** ' + product.score + '/100\n' +
          '**Margin:** ' + product.margin + '%\n' +
          '**Competition:** ' + product.competition + '\n' +
          '**Est. Profit:** $' + profit.toFixed(2) + ' per unit\n\n' +
          '**Recommendation:** ' + (product.score >= 70 ? '✅ PROCEED' : '⚠️ PROCEED WITH CAUTION') + '\n\n' +
          'For detailed analysis, add your AI API key in Settings → AI Coach.';
      }
      return 'No products loaded yet. Search for products first, then ask me about them.';
    }

    if (q.indexOf('budget') > -1 || q.indexOf('invest') > -1 || q.indexOf('money') > -1) {
      return '**Budget Allocation Framework:**\n\n' +
        '- **40% Ads** — Facebook/TikTok testing\n' +
        '- **35% Inventory** — Samples + initial stock\n' +
        '- **15% Tools** — Store, domain, apps\n' +
        '- **10% Testing** — Experiments + emergencies\n\n' +
        'For personalized budget planning, add your AI API key in Settings.';
    }

    if (q.indexOf('ad') > -1 || q.indexOf('convert') > -1) {
      return '**Common Ad Issues:**\n\n' +
        '1. **Creative problem** (40%) — Hook not stopping the scroll\n' +
        '2. **Audience mismatch** (25%) — Targeting too broad\n' +
        '3. **Pricing issue** (20%) — Price too high vs value\n' +
        '4. **Landing page** (15%) — Slow, no trust signals\n\n' +
        'Fix: Test 3 ad variations at $10/day each. Kill losers after 3 days.';
    }

    if (q.indexOf('today') > -1 || q.indexOf('action') > -1 || q.indexOf('plan') > -1) {
      return '**Today\'s Action Plan:**\n\n' +
        '1. Check ad dashboard — pause any ad with CPA >$5\n' +
        '2. Reply to customer messages\n' +
        '3. Create 1 new ad creative\n' +
        '4. Research 2 new product ideas\n' +
        '5. Analyze yesterday\'s data\n\n' +
        'For a personalized plan, add your AI API key in Settings.';
    }

    if (q.indexOf('health') > -1 || q.indexOf('system') > -1 || q.indexOf('issue') > -1) {
      var health = window.HuntDrop.AISystemHealth.getHealthSummary();
      return '**System Health:** ' + health.score + '/100\n\n' +
        '- Products: ' + (window.HuntDrop.ALL_PRODUCTS || []).length + ' loaded\n' +
        '- Sections: ' + health.total + ' checked\n' +
        '- Passed: ' + health.passed + '/' + health.total + '\n' +
        (health.issues.length > 0 ? '- Issues: ' + health.issues.join(', ') : '- No critical issues') + '\n\n' +
        'For full system diagnostics, add your AI API key in Settings.';
    }

    return 'I can help you with:\n\n' +
      '- **Product analysis** — "Should I sell this?"\n' +
      '- **Budget planning** — "I have $500, where to start?"\n' +
      '- **Ad diagnosis** — "My ad isn\'t converting"\n' +
      '- **Action plans** — "What should I do today?"\n' +
      '- **System health** — "Is everything working?"\n\n' +
      '**Tip:** Add your AI API key in Settings → AI Coach for full AI-powered responses with web search.';
  },

  estimateProfit(product) {
    if (!product.platformPrices) return 0;
    var price = product.platformPrices.amazon || product.platformPrices.shopify || product.price * 2;
    return Math.round((price - product.price - 2.50 - (product.adSpendAvg || 3)) * 100) / 100;
  }
};

window.HuntDrop.AIChatService = AIChatService;
PluginRegistry.register('ai-chat-service', AIChatService);
})();
