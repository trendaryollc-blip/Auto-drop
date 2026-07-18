// ============================================================================
// PLUGIN: AI Chat Service — Multi-provider AI chat with full context
// ============================================================================
(function () {
  const { PluginRegistry } = window.HuntDrop;

  // ===== Rate Limiter (Token Bucket) =====
  const _rateLimiter = {
    _tokens: 10,
    _maxTokens: 10,
    _refillRate: 10000,
    _lastRefill: Date.now(),
    _consumed: 0,
    _windowMs: 60000,
    _windowStart: Date.now(),
    _maxPerWindow: 20,
    _queue: [],
    _processing: false,
    _checkRefill: function () {
      const now = Date.now();
      if (now - this._lastRefill >= this._refillRate) {
        this._tokens = this._maxTokens;
        this._lastRefill = now;
      }
      if (now - this._windowStart >= this._windowMs) {
        this._consumed = 0;
        this._windowStart = now;
      }
    },
    canProceed: function () {
      this._checkRefill();
      return this._tokens > 0 && this._consumed < this._maxPerWindow;
    },
    consume: function () {
      this._checkRefill();
      if (this._tokens > 0 && this._consumed < this._maxPerWindow) {
        this._tokens--;
        this._consumed++;
        return true;
      }
      return false;
    },
    getRetryMs: function () {
      this._checkRefill();
      if (this._consumed >= this._maxPerWindow) {
        return this._windowMs - (Date.now() - this._windowStart) + 100;
      }
      return this._refillRate - (Date.now() - this._lastRefill) + 100;
    },
  };

  const AIChatService = {
    id: 'ai-chat-service',
    name: 'AI Chat Service',
    version: '1.0.0',

    init(_ctx) {},

    mount(_ctx) {},

    unmount(_ctx) {},

    async sendMessage(userMessage, conversationHistory) {
      if (!_rateLimiter.consume()) {
        const retryMs = Math.ceil(_rateLimiter.getRetryMs() / 1000);
        return {
          success: false,
          response: 'Rate limit reached. Please wait ' + retryMs + 's before trying again.',
          error: 'rate_limited',
          retryAfter: retryMs,
        };
      }
      const featureKey = await window.HuntDrop.APIKeyManager.getFeatureKey('ai-chat-service');
      const provider = featureKey.provider;
      const key = featureKey.key;
      if (!key) {
        return this.fallbackResponse(userMessage);
      }
      const context = window.HuntDrop.AIContextBuilder.buildFullContext();
      const systemPrompt = this.buildSystemPrompt(context);
      const messages = this.buildMessages(systemPrompt, userMessage, conversationHistory);
      try {
        let response;
        switch (provider) {
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
      } catch (e) {
        console.error('[AIChat] API error:', e);
        return { success: false, response: this.fallbackResponse(userMessage), error: e.message };
      }
    },

    async searchAndRespond(userMessage, conversationHistory) {
      if (!_rateLimiter.consume()) {
        const retryMs = Math.ceil(_rateLimiter.getRetryMs() / 1000);
        return {
          success: false,
          response: 'Rate limit reached. Please wait ' + retryMs + 's before trying again.',
          error: 'rate_limited',
          retryAfter: retryMs,
        };
      }
      let webResults = null;
      const needsSearch = this.needsWebSearch(userMessage);
      if (needsSearch) {
        try {
          webResults = await window.HuntDrop.AIWebSearch.search(userMessage, 5);
        } catch (e) {
          console.warn('[AIChat] Web search failed:', e);
        }
      }
      const featureKey = await window.HuntDrop.APIKeyManager.getFeatureKey('ai-chat-service');
      const provider = featureKey.provider;
      const key = featureKey.key;
      if (!key) {
        return {
          success: true,
          response: this.fallbackResponse(userMessage),
          provider: 'fallback',
          webResults: webResults,
        };
      }
      const context = window.HuntDrop.AIContextBuilder.buildFullContext();
      if (webResults) context.webResults = webResults;
      const systemPrompt = this.buildSystemPrompt(context);
      const messages = this.buildMessages(systemPrompt, userMessage, conversationHistory);
      try {
        let response;
        switch (provider) {
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
      } catch (e) {
        console.error('[AIChat] API error:', e);
        return { success: false, response: this.fallbackResponse(userMessage), error: e.message };
      }
    },

    needsWebSearch(query) {
      const q = query.toLowerCase();
      const searchTriggers = [
        'price',
        'cost',
        'buy',
        'amazon',
        'ebay',
        'shopify',
        'tiktok',
        'trending',
        'viral',
        'competitor',
        'selling',
        'store',
        'market',
        'industry',
        'benchmark',
        'review',
        'rating',
        'compare',
        'alternative',
        'cheaper',
        'expensive',
        'deal',
        'coupon',
        'discount',
        '2025',
        '2026',
        'latest',
        'new',
        'current',
        'now',
        'today',
      ];
      return searchTriggers.some(function (t) {
        return q.indexOf(t) > -1;
      });
    },

    buildSystemPrompt(context) {
      let prompt = 'You are HuntDrop AI Coach — an expert dropshipping business advisor.\n\n';
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
      context.products.forEach(function (p) {
        prompt +=
          '- ' +
          p.title +
          ' (' +
          p.platform +
          ') Score:' +
          p.score +
          ' Margin:' +
          p.margin +
          '% Price:$' +
          p.price +
          ' Competition:' +
          p.competition +
          ' Risk:' +
          p.riskScore +
          '\n';
      });

      if (context.toolStates.profitCalculator.lastCalculation) {
        prompt += '\n## LAST PROFIT CALCULATION\n';
        const calc = context.toolStates.profitCalculator.lastCalculation;
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
      const messages = [{ role: 'system', content: systemPrompt }];
      if (history && history.length > 0) {
        const recent = history.slice(-10);
        recent.forEach(function (msg) {
          messages.push({ role: msg.role, content: msg.content });
        });
      }
      messages.push({ role: 'user', content: userMessage });
      return messages;
    },

    async callOpenAI(provider, key, messages) {
      const config = window.HuntDrop.APIKeyManager.providers[provider];
      const model = window.HuntDrop.APIKeyManager.getModel();
      const resp = await fetch(config.endpoint, {
        method: 'POST',
        headers: window.HuntDrop.APIKeyManager.getHeaders(provider, key),
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });
      if (!resp.ok) throw new Error('API returned ' + resp.status);
      const data = await resp.json();
      return data.choices[0].message.content;
    },

    async callAnthropic(provider, key, messages) {
      const config = window.HuntDrop.APIKeyManager.providers[provider];
      const model = window.HuntDrop.APIKeyManager.getModel();
      let systemMsg = '';
      const chatMsgs = [];
      messages.forEach(function (m) {
        if (m.role === 'system') systemMsg = m.content;
        else chatMsgs.push(m);
      });
      const resp = await fetch(config.endpoint, {
        method: 'POST',
        headers: window.HuntDrop.APIKeyManager.getHeaders(provider, key),
        body: JSON.stringify({
          model: model,
          system: systemMsg,
          messages: chatMsgs,
          max_tokens: 2000,
        }),
      });
      if (!resp.ok) throw new Error('API returned ' + resp.status);
      const data = await resp.json();
      return data.content[0].text;
    },

    async callGoogle(provider, key, messages) {
      const config = window.HuntDrop.APIKeyManager.providers[provider];
      const model = window.HuntDrop.APIKeyManager.getModel();
      // SECURITY: Use POST body for key instead of URL parameter where possible.
      // Google Generative Language API supports x-goog-api-key header as an alternative.
      // When proxy is available, use it instead.
      const proxyUrl = (window.HuntDrop && window.HuntDrop._apiProxy) || null;
      if (proxyUrl) {
        const resp = await fetch(proxyUrl + '/google/' + model + ':generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: key, contents: messages }),
        });
        if (!resp.ok) throw new Error('API returned ' + resp.status);
        const data = await resp.json();
        return data.candidates[0].content.parts[0].text;
      }
      // Fallback: key in URL (only for local development — avoid in production)
      console.warn(
        '[AIChat] SECURITY WARNING: Google API key exposed in URL parameter. Use window.HuntDrop._apiProxy for production.'
      );
      if (window.HuntDrop && window.HuntDrop.EventBus) {
        window.HuntDrop.EventBus.emit('plugin:error', {
          pluginId: 'ai-chat-service',
          error: new Error('Google API key sent as URL parameter — insecure'),
          phase: 'api-call',
        });
      }
      const url = config.endpoint + '/' + model + ':generateContent?key=' + key;
      const contents = [];
      messages.forEach(function (m) {
        if (m.role !== 'system') {
          contents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          });
        }
      });
      const systemMsg = messages.find(function (m) {
        return m.role === 'system';
      });
      if (systemMsg) {
        contents.unshift({ role: 'user', parts: [{ text: systemMsg.content }] });
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: contents }),
      });
      if (!resp.ok) throw new Error('API returned ' + resp.status);
      const data = await resp.json();
      return data.candidates[0].content.parts[0].text;
    },

    fallbackResponse(query) {
      const products = window.HuntDrop.ALL_PRODUCTS || [];
      const q = (query || '').toLowerCase();

      if (q.indexOf('sell') > -1 || q.indexOf('should i') > -1) {
        const product = products.sort(function (a, b) {
          return b.score - a.score;
        })[0];
        if (product) {
          const profit = this.estimateProfit(product);
          return (
            'Based on your catalog, I recommend: **' +
            product.title +
            '**\n\n' +
            '**Score:** ' +
            product.score +
            '/100\n' +
            '**Margin:** ' +
            product.margin +
            '%\n' +
            '**Competition:** ' +
            product.competition +
            '\n' +
            '**Est. Profit:** $' +
            profit.toFixed(2) +
            ' per unit\n\n' +
            '**Recommendation:** ' +
            (product.score >= 70 ? '✅ PROCEED' : '⚠️ PROCEED WITH CAUTION') +
            '\n\n' +
            'For detailed analysis, add your AI API key in Settings → AI Coach.'
          );
        }
        return 'No products loaded yet. Search for products first, then ask me about them.';
      }

      if (q.indexOf('budget') > -1 || q.indexOf('invest') > -1 || q.indexOf('money') > -1) {
        return (
          '**Budget Allocation Framework:**\n\n' +
          '- **40% Ads** — Facebook/TikTok testing\n' +
          '- **35% Inventory** — Samples + initial stock\n' +
          '- **15% Tools** — Store, domain, apps\n' +
          '- **10% Testing** — Experiments + emergencies\n\n' +
          'For personalized budget planning, add your AI API key in Settings.'
        );
      }

      if (q.indexOf('ad') > -1 || q.indexOf('convert') > -1) {
        return (
          '**Common Ad Issues:**\n\n' +
          '1. **Creative problem** (40%) — Hook not stopping the scroll\n' +
          '2. **Audience mismatch** (25%) — Targeting too broad\n' +
          '3. **Pricing issue** (20%) — Price too high vs value\n' +
          '4. **Landing page** (15%) — Slow, no trust signals\n\n' +
          'Fix: Test 3 ad variations at $10/day each. Kill losers after 3 days.'
        );
      }

      if (q.indexOf('today') > -1 || q.indexOf('action') > -1 || q.indexOf('plan') > -1) {
        return (
          "**Today's Action Plan:**\n\n" +
          '1. Check ad dashboard — pause any ad with CPA >$5\n' +
          '2. Reply to customer messages\n' +
          '3. Create 1 new ad creative\n' +
          '4. Research 2 new product ideas\n' +
          "5. Analyze yesterday's data\n\n" +
          'For a personalized plan, add your AI API key in Settings.'
        );
      }

      if (q.indexOf('health') > -1 || q.indexOf('system') > -1 || q.indexOf('issue') > -1) {
        const health = window.HuntDrop.AISystemHealth.getHealthSummary();
        return (
          '**System Health:** ' +
          health.score +
          '/100\n\n' +
          '- Products: ' +
          (window.HuntDrop.ALL_PRODUCTS || []).length +
          ' loaded\n' +
          '- Sections: ' +
          health.total +
          ' checked\n' +
          '- Passed: ' +
          health.passed +
          '/' +
          health.total +
          '\n' +
          (health.issues.length > 0 ? '- Issues: ' + health.issues.join(', ') : '- No critical issues') +
          '\n\n' +
          'For full system diagnostics, add your AI API key in Settings.'
        );
      }

      return (
        'I can help you with:\n\n' +
        '- **Product analysis** — "Should I sell this?"\n' +
        '- **Budget planning** — "I have $500, where to start?"\n' +
        '- **Ad diagnosis** — "My ad isn\'t converting"\n' +
        '- **Action plans** — "What should I do today?"\n' +
        '- **System health** — "Is everything working?"\n\n' +
        '**Tip:** Add your AI API key in Settings → AI Coach for full AI-powered responses with web search.'
      );
    },

    estimateProfit(product) {
      if (!product.platformPrices) return 0;
      const price = product.platformPrices.amazon || product.platformPrices.shopify || product.price * 2;
      return Math.round((price - product.price - 2.5 - (product.adSpendAvg || 3)) * 100) / 100;
    },
  };

  window.HuntDrop.AIChatService = AIChatService;
  PluginRegistry.register('ai-chat-service', AIChatService);
})();
