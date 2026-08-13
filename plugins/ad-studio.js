// ============================================================================
// PLUGIN: Ad Creative Studio v3.0 — Ultimate AI-Powered Ad Generation Suite
// 22 Features: Copy, Multi-Platform, Hooks, Hook Analyzer, Ad Score, Compliance,
// Variations, Copy Transformer, Ad Continuity, UGC, Video Ad Creator, A/B Tests,
// Retargeting, Fatigue, Swipe Library, ROAS, Audience, Briefs, Seasonal, LP,
// Storyboard, Dynamic Variables, Ad-to-Ad Sequence
// ============================================================================
(function () {
  try {
    const { EventBus, PluginRegistry, UI } = window.HuntDrop;
    const esc = function (s) {
      try {
        return UI.escapeHtml(String(s || ''));
      } catch {
        return '';
      }
    };

    // ============================================================================
    // AI SERVICE — Multi-provider API calls with graceful fallback
    // ============================================================================
    const AdAI = {
      async generate(systemPrompt, userPrompt, opts) {
        opts = opts || {};
        try {
          const featureKey = await (window.HuntDrop.APIKeyManager
            ? window.HuntDrop.APIKeyManager.getFeatureKey('ad-studio')
            : { provider: null, key: null });
          const provider = featureKey.provider;
          const key = featureKey.key;
          if (!key) return { ok: false, text: '', fallback: true, provider: 'none' };
          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ];
          let text;
          switch (provider) {
            case 'openai':
            case 'groq':
              text = await this.callOpenAI(provider, key, messages, opts);
              break;
            case 'anthropic':
              text = await this.callAnthropic(provider, key, messages, opts);
              break;
            case 'google':
              text = await this.callGoogle(provider, key, messages, opts);
              break;
            default:
              return { ok: false, text: '', fallback: true, provider: provider };
          }
          return { ok: true, text: text, fallback: false, provider: provider };
        } catch (e) {
          console.error('[AdStudio] AI error:', e);
          return { ok: false, text: '', fallback: true, error: e.message, provider: 'error' };
        }
      },

      async callOpenAI(provider, key, messages, opts) {
        const config = window.HuntDrop.APIKeyManager.providers[provider];
        const model = window.HuntDrop.APIKeyManager.getModel();
        const resp = await fetch(config.endpoint, {
          method: 'POST',
          headers: window.HuntDrop.APIKeyManager.getHeaders(provider, key),
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: opts.temperature || 0.7,
            max_tokens: opts.maxTokens || 4000,
          }),
        });
        if (!resp.ok) throw new Error('API ' + resp.status);
        const data = await resp.json();
        return data.choices[0].message.content;
      },

      async callAnthropic(provider, key, messages, opts) {
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
            max_tokens: opts.maxTokens || 4000,
          }),
        });
        if (!resp.ok) throw new Error('API ' + resp.status);
        const data = await resp.json();
        return data.content[0].text;
      },

      async callGoogle(provider, key, messages, _opts) {
        const config = window.HuntDrop.APIKeyManager.providers[provider];
        const model = window.HuntDrop.APIKeyManager.getModel();
        const url = config.endpoint + '/' + model + ':generateContent?key=' + key;
        const contents = [];
        messages.forEach(function (m) {
          if (m.role !== 'system') {
            contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
          }
        });
        const sysMsg = messages.find(function (m) {
          return m.role === 'system';
        });
        if (sysMsg) contents.unshift({ role: 'user', parts: [{ text: sysMsg.content }] });
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: contents }),
        });
        if (!resp.ok) throw new Error('API ' + resp.status);
        const data = await resp.json();
        return data.candidates[0].content.parts[0].text;
      },
    };

    // ============================================================================
    // VIDEO AI SERVICE — Video generation via Runway / Pika / Luma
    // ============================================================================
    const VideoAI = {
      providers: {
        runway: {
          name: 'Runway ML',
          endpoint: 'https://api.dev.runwayml.com/v1/image_to_video',
          keyConfig: 'videoGen.runway.key',
          getKeyUrl: 'https://dev.runwayml.com',
          color: '#a855f7',
          tier: 'paid',
          models: ['gen3a_turbo', 'gen3_alpha'],
          maxDuration: 10,
          supportedAspectRatios: ['16:9', '9:16', '1:1'],
        },
        pika: {
          name: 'Pika Labs',
          endpoint: 'https://api.pika.art/v1/generate',
          keyConfig: 'videoGen.pika.key',
          getKeyUrl: 'https://pika.art',
          color: '#ff3366',
          tier: 'paid',
          models: ['pika-1.0', 'pika-2.0'],
          maxDuration: 4,
          supportedAspectRatios: ['16:9', '9:16', '1:1'],
        },
        luma: {
          name: 'Luma AI',
          endpoint: 'https://api.lumalabs.ai/dream-machine/v1/generations',
          keyConfig: 'videoGen.luma.key',
          getKeyUrl: 'https://lumalabs.ai',
          color: '#00e5ff',
          tier: 'paid',
          models: ['dream-machine-v1'],
          maxDuration: 5,
          supportedAspectRatios: ['16:9', '9:16', '1:1'],
        },
      },

      getKey: function (providerId) {
        var p = this.providers[providerId];
        if (!p) return '';
        try {
          return window.HuntDrop.Config.get(p.keyConfig) || '';
        } catch {
          return '';
        }
      },

      setKey: function (providerId, key) {
        var p = this.providers[providerId];
        if (!p) return;
        try {
          window.HuntDrop.Config.set(p.keyConfig, key);
        } catch {
          /* ignored */
        }
      },

      hasKey: function (providerId) {
        return this.getKey(providerId).length > 5;
      },

      getStatus: function () {
        var result = {};
        var self = this;
        Object.keys(this.providers).forEach(function (id) {
          result[id] = {
            name: self.providers[id].name,
            connected: self.hasKey(id),
            color: self.providers[id].color,
            tier: self.providers[id].tier,
          };
        });
        return result;
      },

      generate: async function (providerId, prompt, opts) {
        opts = opts || {};
        var key = this.getKey(providerId);
        if (!key) return { ok: false, error: 'No API key configured for ' + providerId };
        var p = this.providers[providerId];
        if (!p) return { ok: false, error: 'Unknown provider: ' + providerId };
        try {
          if (providerId === 'runway') return await this._callRunway(p, key, prompt, opts);
          if (providerId === 'pika') return await this._callPika(p, key, prompt, opts);
          if (providerId === 'luma') return await this._callLuma(p, key, prompt, opts);
          return { ok: false, error: 'Provider not implemented: ' + providerId };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      },

      _callRunway: async function (provider, key, prompt, opts) {
        var body = {
          model: opts.model || 'gen3a_turbo',
          promptText: prompt,
          duration: Math.min(opts.duration || 4, provider.maxDuration),
          ratio: opts.ratio || '16:9',
        };
        if (opts.image) body.initImage = opts.image;
        var resp = await fetch(provider.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + key,
            'X-Runway-Version': '2024-11-06',
          },
          body: JSON.stringify(body),
        });
        if (!resp.ok) {
          var err = await resp.text();
          throw new Error('Runway API ' + resp.status + ': ' + err);
        }
        var data = await resp.json();
        return {
          ok: true,
          jobId: data.id,
          status: 'submitted',
          provider: 'runway',
          pollUrl: 'https://api.dev.runwayml.com/v1/generations/' + data.id,
        };
      },

      _callPika: async function (provider, key, prompt, opts) {
        var body = {
          prompt: prompt,
          model: opts.model || 'pika-2.0',
          aspectRatio: opts.ratio || '16:9',
          duration: Math.min(opts.duration || 4, provider.maxDuration),
        };
        if (opts.image) body.image = opts.image;
        var resp = await fetch(provider.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
          body: JSON.stringify(body),
        });
        if (!resp.ok) {
          var err = await resp.text();
          throw new Error('Pika API ' + resp.status + ': ' + err);
        }
        var data = await resp.json();
        return { ok: true, jobId: data.id, status: 'submitted', provider: 'pika' };
      },

      _callLuma: async function (provider, key, prompt, opts) {
        var body = {
          prompt: prompt,
          model: opts.model || 'dream-machine-v1',
          aspect_ratio: opts.ratio || '16:9',
        };
        if (opts.image) body.image_url = opts.image;
        var resp = await fetch(provider.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
          body: JSON.stringify(body),
        });
        if (!resp.ok) {
          var err = await resp.text();
          throw new Error('Luma API ' + resp.status + ': ' + err);
        }
        var data = await resp.json();
        return { ok: true, jobId: data.id, status: 'submitted', provider: 'luma' };
      },

      pollStatus: async function (providerId, jobId) {
        var key = this.getKey(providerId);
        if (!key) return { ok: false, error: 'No API key' };
        try {
          if (providerId === 'runway') {
            var resp = await fetch('https://api.dev.runwayml.com/v1/generations/' + jobId, {
              headers: { Authorization: 'Bearer ' + key, 'X-Runway-Version': '2024-11-06' },
            });
            if (!resp.ok) return { ok: false, error: 'Poll failed' };
            var data = await resp.json();
            return {
              ok: true,
              status: data.status,
              progress: data.progress || 0,
              videoUrl: data.output && data.output[0] ? data.output[0] : null,
            };
          }
          if (providerId === 'luma') {
            var resp2 = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/' + jobId, {
              headers: { Authorization: 'Bearer ' + key },
            });
            if (!resp2.ok) return { ok: false, error: 'Poll failed' };
            var data2 = await resp2.json();
            return {
              ok: true,
              status: data2.state,
              progress: data2.state === 'completed' ? 100 : 50,
              videoUrl: data2.assets && data2.assets.video ? data2.assets.video : null,
            };
          }
          return { ok: true, status: 'unknown', progress: 0 };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      },
    };

    // ============================================================================
    // PROMPT TEMPLATES — System prompts for each feature
    // ============================================================================
    const Prompts = {
      adCopy: function (product, framework) {
        return (
          'You are an expert direct-response copywriter specializing in dropshipping ads.\n\n' +
          'Generate ad copy for this product using the ' +
          framework +
          ' framework.\n\n' +
          'Product: ' +
          product.title +
          '\n' +
          'Price: $' +
          product.price +
          '\n' +
          'Category: ' +
          product.category +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\n' +
          'Rating: ' +
          product.rating +
          '/5 (' +
          product.reviews +
          ' reviews)\n' +
          'Target Audience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n' +
          'Interests: ' +
          (product.audience ? (product.audience.interests || []).join(', ') : '') +
          '\n\n' +
          'OUTPUT FORMAT (use exactly these section headers):\n' +
          '## FACEBOOK/INSTAGRAM\n### Primary Text\n[ad copy]\n### Headline\n[headline]\n### Description\n[description]\n### CTA Button\n[CTA text]\n\n' +
          '## TIKTOK\n### Hook (0-3s)\n[hook]\n### Script (3-15s)\n[script]\n### CTA\n[CTA]\n### Caption\n[caption]\n\n' +
          '## INSTAGRAM REELS\n### Caption\n[caption]\n### Hashtags\n[hashtags]\n\n' +
          'Write 3 VARIATIONS for each platform. Each should use a different emotional angle.'
        );
      },

      hooks: function (product) {
        return (
          'You are a viral video ad hook specialist. Generate 15 attention-grabbing hooks for the first 1-3 seconds of a video ad.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Audience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\n\n' +
          'Generate hooks in these categories (3 each):\n## PATTERN INTERRUPT\n(Stop-the-scroll moments)\n\n' +
          '## CURIOSITY\n(Must-know-more hooks)\n\n## SOCIAL PROOF\n(Numbers and validation)\n\n' +
          '## PROBLEM-AGITATION\n(Pain point triggers)\n\n## CONTROVERSY\n(Bold/unexpected claims)\n\n' +
          'For each hook, rate effectiveness 1-10 and note the best platform.'
        );
      },

      compliance: function (copy) {
        return (
          'You are a Facebook/TikTok/Instagram advertising policy expert. Review this ad copy for compliance.\n\n' +
          'AD COPY:\n' +
          copy +
          '\n\n' +
          'Check for: 1) Personal attributes targeting 2) Before/after claims 3) Misleading urgency ' +
          '4) Prohibited content 5) Exaggerated claims 6) Grammar/spelling issues\n\n' +
          'OUTPUT: ## OVERALL SCORE (X/100) ## ISSUES FOUND (with severity and fixes) ' +
          '## PLATFORM-SPECIFIC NOTES (FB vs TikTok) ## REVISED COPY (compliant version)'
        );
      },

      variations: function (product, count) {
        return (
          'Generate ' +
          count +
          ' unique ad copy variations for this product. Each must be meaningfully different.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\n' +
          'Rating: ' +
          product.rating +
          '/5 (' +
          product.reviews +
          ' reviews)\n\n' +
          'Vary across: emotional angle, CTA style, tone, length, hook style\n\n' +
          'OUTPUT FORMAT:\n## VARIATION 1\n### Angle: [angle]\n### Tone: [tone]\n### Copy:\n[full ad copy]\n### Platform: [best platform]\n' +
          '[Repeat for each variation]'
        );
      },

      ugcScript: function (product, type) {
        return (
          'Write a complete UGC video script for a dropshipping ad.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Script Type: ' +
          type +
          '\nAudience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n\n' +
          'OUTPUT: ## SCRIPT OVERVIEW (Duration, Tone, Music) ## FULL SCRIPT with timestamps ' +
          '[0-3s HOOK, 3-8s INTRO, 8-20s SHOWCASE, 20-25s PROOF, 25-30s CTA] ' +
          '## B-ROLL SUGGESTIONS ## PRODUCTION NOTES'
        );
      },

      abTestPlan: function (product) {
        return (
          'Create a comprehensive A/B testing plan for advertising this product.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Avg CPA: $' +
          (product.cpaAvg || '5') +
          '\nAvg Ad Spend: $' +
          (product.adSpendAvg || '20') +
          '\n\n' +
          'OUTPUT: ## TESTING STRATEGY ## WEEK 1: HOOK TESTING (variations, budget, duration, winner criteria) ' +
          '## WEEK 2: VISUAL TESTING ## WEEK 3: HEADLINE TESTING ## WEEK 4: CTA & DESCRIPTION ' +
          '## TOTAL BUDGET ## EXPECTED OUTCOME ## KEY METRICS TO WATCH'
        );
      },

      retargeting: function (product) {
        return (
          'Create a complete retargeting ad sequence for this product.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\n' +
          'Rating: ' +
          product.rating +
          '/5 (' +
          product.reviews +
          ' reviews)\n\n' +
          'OUTPUT: 4 STAGES each with Audience, Goal, FB/IG Copy, Headline, CTA, Creative Direction:\n' +
          '## STAGE 1: COLD TRAFFIC (Day 1-3) - Social proof\n' +
          '## STAGE 2: WARM TRAFFIC (Day 3-7) - Objection crushing\n' +
          '## STAGE 3: HOT TRAFFIC (Day 7-14) - Urgency and scarcity\n' +
          '## STAGE 4: FINAL PUSH (Day 14-21) - Last chance offer\n' +
          '## BUDGET ALLOCATION ## EXPECTED RECOVERY RATE'
        );
      },

      fatigue: function (product) {
        return (
          'Analyze creative fatigue risk and generate refresh suggestions.\n\n' +
          'Product: ' +
          product.title +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Competition: ' +
          product.competition +
          '\nMarket Saturation: ' +
          (product.marketSaturation || 'medium') +
          '\n\n' +
          'OUTPUT: ## FATIGUE RISK ASSESSMENT (Risk Level, Lifespan, Reasoning) ' +
          '## REFRESH STRATEGY (When to Refresh + 5 Fresh Variations with What Changed, New Hook, New Headline, New CTA, Expected Impact) ' +
          '## PLATFORM-SPECIFIC FATIGUE (FB, TikTok, IG) ## TESTING SCHEDULE'
        );
      },

      swipeLibrary: function (product) {
        return (
          'Generate a competitor ad swipe library for this niche.\n\n' +
          'Product: ' +
          product.title +
          '\nCategory: ' +
          product.category +
          '\nPrice: $' +
          product.price +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\n\n' +
          'OUTPUT: ## TOP 8 PERFORMING AD PATTERNS (Type, Hook Style, Emotional Trigger, Copy Structure, Visual Style, CTA Approach, Template) ' +
          '## WINNING COPY ANGLES ## VISUAL TRENDS ## COMMON MISTAKES TO AVOID'
        );
      },

      roas: function (product, budget) {
        return (
          'Calculate ROAS predictions and ad spend simulation.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCost: $' +
          product.originalPrice +
          '\n' +
          'Margin: ' +
          product.margin +
          '%\nAvg CPA: $' +
          (product.cpaAvg || '5') +
          '\n' +
          'Daily Budget: $' +
          budget +
          '\nCompetition: ' +
          product.competition +
          '\n\n' +
          'OUTPUT: ## PROFIT ANALYSIS ## ROAS PREDICTIONS (Conservative/Expected/Optimistic) ' +
          '## BUDGET RECOMMENDATIONS (FB and TikTok) ## SCENARIO MODELING (Day by day) ## KILL SWITCH RULES'
        );
      },

      audienceMatch: function (product) {
        return (
          'Generate audience-specific ad copy for different customer segments.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n\n' +
          'Generate for: 1) Gen Z (18-24) TikTok-native 2) Millennials (25-34) Instagram-native 3) Gen X (35-50) Facebook-native\n\n' +
          'OUTPUT for each: Tone, FB/IG Copy, TikTok Script, Best Platforms, Key Triggers\n' +
          '## CROSS-SEGMENT STRATEGY (budget allocation and testing order)'
        );
      },

      creativeBrief: function (product, adType) {
        return (
          'Create a detailed visual creative brief for a ' +
          adType +
          ' ad.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Audience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n\n' +
          'OUTPUT: ## VISUAL DIRECTION (Colors, Mood, Typography) ## LAYOUT (Safe Zones, Aspect Ratio) ' +
          '## SHOT LIST (timestamps) ## TEXT OVERLAYS ## AI IMAGE PROMPTS (Midjourney, DALL-E, Canva) ' +
          '## PLATFORM SPECS (dimensions, file sizes)'
        );
      },

      seasonal: function (product, event) {
        return (
          'Create seasonal/event-specific ad copy for ' +
          event +
          '.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n\n' +
          'OUTPUT: ' +
          event.toUpperCase() +
          ' CAMPAIGN with: Campaign Theme, ' +
          'Pre-Event Hype (FB + TikTok), Launch Day (FB + TikTok), Mid-Event Urgency (FB + TikTok), ' +
          'Last Chance (FB + TikTok), Post-Event FOMO ## URGENCY ELEMENTS ## DISCOUNT STRATEGY'
        );
      },

      lpMatcher: function (product, adCopy) {
        return (
          'Generate landing page copy that matches this ad for message consistency.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Rating: ' +
          product.rating +
          '/5 (' +
          product.reviews +
          ' reviews)\n\n' +
          'AD COPY TO MATCH:\n' +
          adCopy +
          '\n\n' +
          'OUTPUT: ## Hero Section (Headline echoing ad, Subheadline, CTA) ' +
          '## Benefits Section (aligned with ad promises) ## Social Proof Section ## FAQ Section ' +
          '## Final CTA ## Trust Signals'
        );
      },

      // =====================================================================
      // v3.0 NEW PROMPTS
      // =====================================================================
      multiPlatform: function (product) {
        return (
          'You are a platform-native ad specialist. Generate platform-SPECIFIC ad sets for each platform below. ' +
          "Each platform must have UNIQUE copy optimized for that platform's algorithm, audience behavior, and format.\n\n" +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\nRating: ' +
          product.rating +
          '/5 (' +
          product.reviews +
          ' reviews)\n' +
          'Audience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n' +
          'Margin: ' +
          product.margin +
          '%\n\n' +
          'OUTPUT FORMAT:\n' +
          '## FACEBOOK (Feed + Stories)\n### Primary Text\n[long-form social proof, 125+ words]\n### Headline\n[benefit-driven, 40 chars max]\n### Description\n[urgency + social proof]\n### CTA\n[Shop Now / Learn More]\n### Best Practices: [FB-specific tips]\n\n' +
          '## TIKTOK (Native Ads)\n### Hook (0-2s)\n[scroll-stopping pattern interrupt]\n### Script (2-15s)\n[raw, authentic, trend-jacking]\n### CTA\n["Link in bio" style]\n### Caption\n[hashtag strategy, 5-8 hashtags]\n### Sound/Music: [trending audio suggestion]\n\n' +
          '## INSTAGRAM (Reels + Feed + Stories)\n### Reel Hook\n[aesthetic + curiosity]\n### Reel Script\n[visual-first storytelling]\n### Feed Caption\n[engagement-focused, question CTA]\n### Stories CTA\n[swipe-up / poll sticker]\n### Hashtag Set\n[30 hashtags in tiers: niche, medium, broad]\n\n' +
          '## YOUTUBE (Pre-roll + Shorts)\n### Pre-roll (15s)\n[hook + value prop + CTA in 15 seconds]\n### Shorts Script\n[vertical, fast-paced, 60s max]\n### Title\n[SEO-optimized, curiosity-driven]\n### Description\n[keyword-rich, 200+ words]\n\n' +
          '## PINTEREST (Pins + Idea Pins)\n### Pin Title\n[search-optimized, keyword-rich]\n### Pin Description\n[150-200 words, keyword-dense]\n### Board Name Suggestion\n### Idea Pin Pages\n[5-page visual story]\n### SEO Keywords\n[10 Pinterest-specific keywords]'
        );
      },

      hookAnalyzer: function (product, hook) {
        return (
          'You are a viral content analyst. Analyze this ad hook for effectiveness.\n\n' +
          'HOOK TO ANALYZE: "' +
          hook +
          '"\n\n' +
          'Product: ' +
          product.title +
          '\nCategory: ' +
          product.category +
          '\nAudience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n\n' +
          'OUTPUT FORMAT:\n' +
          '## OVERALL SCORE\n[Score /100 with grade: S/A/B/C/D/F]\n\n' +
          '## HOOK BREAKDOWN\n' +
          '- Pattern Interrupt Strength: [1-10] — [analysis]\n' +
          '- Curiosity Gap: [1-10] — [analysis]\n' +
          '- Emotional Trigger: [1-10] — [which emotion + analysis]\n' +
          '- Specificity: [1-10] — [vague vs specific]\n' +
          '- Platform Fit: [which platform works best and why]\n\n' +
          '## PSYCHOLOGICAL PRINCIPLES USED\n[list any: social proof, scarcity, curiosity gap, loss aversion, authority, etc.]\n\n' +
          '## PREDICTED PERFORMANCE\n' +
          '- Thumb-Stop Rate: [estimated %]\n' +
          '- Expected CTR: [estimated range]\n' +
          '- Best Time to Use: [top/middle/bottom of funnel]\n\n' +
          '## 3 IMPROVED VERSIONS\n[Take the hook and make 3 stronger versions with explanations of what changed and why]\n\n' +
          '## PLATFORM SUITABILITY\n- Facebook: [1-10] with reason\n- TikTok: [1-10] with reason\n- Instagram: [1-10] with reason\n- YouTube: [1-10] with reason'
        );
      },

      adScore: function (product, copy) {
        return (
          'You are an advertising performance predictor. Score this ad copy for predicted effectiveness.\n\n' +
          'AD COPY:\n' +
          copy +
          '\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Target: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n' +
          'Margin: ' +
          product.margin +
          '%\n\n' +
          'OUTPUT FORMAT:\n' +
          '## OVERALL SCORE: [X/100]\n[Large score with letter grade S/A/B/C/D/F]\n\n' +
          '## CATEGORY SCORES (each /10)\n' +
          '- Hook Strength: [score] — [why]\n' +
          '- Emotional Trigger: [score] — [which emotions targeted]\n' +
          '- Clarity: [score] — [is the message clear?]\n' +
          '- CTA Power: [score] — [how compelling is the call to action]\n' +
          '- Social Proof: [score] — [use of numbers, reviews, trust]\n' +
          '- Urgency: [score] — [time pressure elements]\n' +
          '- Platform Fit: [score] — [native-feeling vs generic]\n' +
          '- Audience Match: [score] — [does it speak to the target?]\n\n' +
          '## PREDICTED METRICS\n' +
          '- Estimated CTR: [range]\n' +
          '- Estimated Conversion Rate: [range]\n' +
          '- Estimated CPA: [range]\n' +
          '- Cost Per Sale: [estimate]\n\n' +
          '## TOP 3 WEAKNESSES\n[specific issues with exact fixes]\n\n' +
          "## TOP 3 STRENGTHS\n[what's working well]\n\n" +
          '## OPTIMIZED VERSION\n[Rewrite the ad with all weaknesses fixed, maintaining the core message]'
        );
      },

      copyTransformer: function (product, copy, style) {
        return (
          'You are a world-class copywriter. Transform this ad copy into the "' +
          style +
          '" style.\n\n' +
          'ORIGINAL AD:\n' +
          copy +
          '\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\n\n' +
          'STYLE RULES:\n' +
          '- Short-form: Under 90 chars, punchy, zero fluff\n' +
          '- Long-form: 200+ words, storytelling, emotional depth\n' +
          '- Gen Z: Slang, lowercase, emoji-heavy, TikTok-native\n' +
          '- Professional: Business-appropriate, data-driven, credible\n' +
          '- Storytelling: Mini narrative with character, conflict, resolution\n' +
          '- Urgency: Time pressure, scarcity, FOMO at maximum\n' +
          '- Luxury: Premium language, exclusivity, aspiration\n' +
          '- Minimalist: Clean, simple, letting the product speak\n\n' +
          'OUTPUT: Generate the full rewritten ad copy in the requested style, maintaining the core product message but completely changing the voice and approach.'
        );
      },

      continuity: function (product) {
        return (
          'You are a full-funnel advertising strategist. Create a complete 5-stage ad sequence that takes a cold prospect to a loyal customer.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Margin: ' +
          product.margin +
          '%\nRating: ' +
          product.rating +
          '/5 (' +
          product.reviews +
          ' reviews)\n' +
          'Audience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\n\n' +
          'OUTPUT FORMAT:\n' +
          '## STAGE 1: AWARENESS (Day 1-5)\n### Goal: Brand introduction, curiosity\n### Audience: Cold — interest-based targeting\n### FB/IG Ad: [full copy]\n### TikTok Script: [full script with hook]\n### Headline: [headline]\n### CTA: [button text]\n### Creative Direction: [visual concept]\n### Budget: [% of total]\n\n' +
          '## STAGE 2: CONSIDERATION (Day 5-10)\n### Goal: Build desire, overcome skepticism\n### Audience: Engaged — video viewers, page engagers\n### FB/IG Ad: [full copy]\n### TikTok Script: [full script]\n### Headline: [headline]\n### CTA: [button text]\n### Creative Direction: [visual concept]\n### Budget: [% of total]\n\n' +
          '## STAGE 3: INTENT (Day 10-15)\n### Goal: Push toward purchase, social proof\n### Audience: High intent — add-to-cart, product viewers\n### FB/IG Ad: [full copy]\n### TikTok Script: [full script]\n### Headline: [headline]\n### CTA: [button text]\n### Creative Direction: [visual concept]\n### Budget: [% of total]\n\n' +
          '## STAGE 4: CONVERSION (Day 15-20)\n### Goal: Close the sale, urgency\n### Audience: Cart abandoners, website visitors\n### FB/IG Ad: [full copy — strongest offer]\n### TikTok Script: [full script]\n### Headline: [headline]\n### CTA: [button text]\n### Creative Direction: [visual concept]\n### Budget: [% of total]\n\n' +
          '## STAGE 5: RETENTION (Day 20-30)\n### Goal: Repeat purchase, referrals, reviews\n### Audience: Existing customers\n### Email/DM: [post-purchase sequence]\n### Social Post: [UGC request / referral program]\n### Upsell Ad: [complementary product]\n\n' +
          '## TOTAL BUDGET ALLOCATION\n## EXPECTED FUNNEL METRICS (CTR per stage, Conversion rate, ROAS)\n## OPTIMIZATION TIPS'
        );
      },

      storyboard: function (product, duration) {
        return (
          'You are a video ad director. Create a detailed scene-by-scene storyboard for a ' +
          duration +
          ' second video ad.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Audience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\n\n' +
          'OUTPUT FORMAT:\n' +
          '## STORYBOARD OVERVIEW\n- Duration: ' +
          duration +
          's\n- Style: [UGC / Cinematic / Motion Graphics / Mixed]\n- Mood: [energetic / calm / dramatic / playful]\n- Music: [genre + BPM suggestion]\n- Color Palette: [3-4 colors]\n\n' +
          '## SCENE BREAKDOWN\n[For each scene:]\n' +
          '### Scene [N] ([timestamp range])\n' +
          '- Visual: [exactly what the viewer sees — camera angle, framing, movement]\n' +
          '- Text Overlay: [exact text on screen, font style, position]\n' +
          '- Audio: [dialogue / SFX / music beat]\n' +
          '- Transition: [cut / zoom / swipe / fade]\n' +
          '- Duration: [seconds]\n' +
          '- Emotion: [what the viewer should feel]\n\n' +
          '## PRODUCTION NOTES\n- Equipment needed\n- Filming tips\n- Editing style\n- Text animation suggestions\n\n' +
          '## PLATFORM ADAPTATIONS\n- How to trim for 15s (which scenes to keep)\n- How to adapt for 60s (which scenes to expand)\n- Vertical vs horizontal considerations'
        );
      },

      dynamicVars: function (product, count) {
        return (
          'You are a direct-response copywriter creating a dynamic creative variable matrix.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\nRating: ' +
          product.rating +
          '/5\n' +
          'Audience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n\n' +
          'Generate ' +
          count +
          ' variable sets for Facebook Dynamic Creative / TikTok Smart Creative testing.\n\n' +
          'OUTPUT FORMAT:\n' +
          '## HEADLINES (generate 10)\n[1-10: each headline, max 40 chars]\n\n' +
          '## PRIMARY TEXTS (generate 10)\n[1-10: each primary text, varying length 90-280 chars]\n\n' +
          '## DESCRIPTIONS (generate 5)\n[1-5: each description, max 30 chars]\n\n' +
          '## CTAs (generate 5)\n[1-5: different CTA buttons]\n\n' +
          '## VISUAL DIRECTION (generate 5)\n[1-5: brief creative concept for each visual]\n\n' +
          '## COMBINATION PREVIEW\n[Show 5 of the best headline × primary text × visual combinations]\n\n' +
          '## EXPECTED PERFORMANCE MATRIX\n[Which combinations to prioritize and why]\n\n' +
          '## EXPORT FORMAT\n[CSV-ready format for easy upload to ad managers]'
        );
      },

      adSequence: function (product) {
        return (
          "You are a performance marketer. Create a 3-ad sequence where each ad builds on the previous one's messaging.\n\n" +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Margin: ' +
          product.margin +
          '%\nRating: ' +
          product.rating +
          '/5 (' +
          product.reviews +
          ' reviews)\n' +
          'Audience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n\n' +
          'OUTPUT FORMAT:\n' +
          '## AD 1: THE HOOK (Cold Traffic)\n### Purpose: Pattern interrupt + curiosity\n### Headline\n### Primary Text (FB/IG)\n### TikTok Script (hook + 15s)\n### Visual Direction\n### CTA\n### Key Message Thread: [one core message this ad introduces]\n\n' +
          "## AD 2: THE PROOF (Warm Traffic — saw Ad 1)\n### Purpose: Validate the promise from Ad 1\n### Headline\n### Primary Text (FB/IG)\n### TikTok Script\n### Visual Direction\n### CTA\n### Key Message Thread: [builds on Ad 1's message with evidence]\n\n" +
          '## AD 3: THE CLOSE (Hot Traffic — saw Ad 1+2)\n### Purpose: Convert with urgency + best offer\n### Headline\n### Primary Text (FB/IG)\n### TikTok Script\n### Visual Direction\n### CTA\n### Key Message Thread: [closes the loop, strongest offer]\n\n' +
          '## SEQUENCE STRATEGY\n- Targeting between stages\n- Time gaps between ads\n- Budget split across the 3 ads\n- Success metrics per stage\n- When to move someone to the next ad'
        );
      },

      videoAd: function (product, duration, style) {
        return (
          'You are a video ad director. Create a complete video ad script optimized for ' +
          (duration || '30') +
          '-second ' +
          (style || 'UGC') +
          ' style.\n\n' +
          'Product: ' +
          product.title +
          '\nPrice: $' +
          product.price +
          '\nCategory: ' +
          product.category +
          '\n' +
          'Rating: ' +
          product.rating +
          '/5 (' +
          product.reviews +
          ' reviews)\n' +
          'Audience: ' +
          (product.audience ? product.audience.age + ' ' + product.audience.gender : 'General') +
          '\n' +
          'Keywords: ' +
          (product.keywords || []).join(', ') +
          '\n' +
          'Margin: ' +
          product.margin +
          '%\n\n' +
          'OUTPUT FORMAT:\n' +
          '## VIDEO OVERVIEW\n- Duration: ' +
          (duration || '30') +
          's\n- Style: ' +
          (style || 'UGC') +
          '\n- Platform: TikTok/IG Reels (9:16 vertical)\n- Music: [genre + mood]\n- Color Palette: [3-4 colors]\n\n' +
          '## VOICEOVER / DIALOGUE SCRIPT\n[Full word-for-word script with timestamps]\n\n' +
          '## SCENE BREAKDOWN (for each scene)\n### Scene [N] ([timestamp])\n' +
          '- Visual Description: [what the viewer sees — for AI image/video generation]\n' +
          '- Text Overlay: [exact text on screen]\n' +
          '- Camera: [angle, movement]\n' +
          '- Transition: [cut/zoom/fade]\n' +
          '- Duration: [seconds]\n\n' +
          '## AI IMAGE PROMPTS\n[For each scene, provide a ready-to-use Midjourney/DALL-E prompt]\n\n' +
          '## AI VIDEO PROMPTS\n[For Runway/Pika/Luma: text-to-video prompts for each scene]\n\n' +
          '## PRODUCTION NOTES\n- Music suggestion (specific track style)\n- Sound effects\n- Pacing guide'
        );
      },
    };

    // ============================================================================
    // FALLBACK GENERATORS — Template-based when no AI key
    // All functions use multi-line string concatenation for safety
    // ============================================================================
    const Fallback = {
      adCopy: function (product, framework) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const disc = product.discount || 30;
        const rating = product.rating;
        let fbCopy = '';
        let headline = '';
        let desc = '';

        if (framework === 'PAS') {
          fbCopy =
            'Stop wasting money on ' +
            kw +
            " that don't work.\n\nThis " +
            title +
            ' has helped ' +
            reviews +
            '+ customers solve their ' +
            kw +
            " problems \u2014 and it's " +
            disc +
            '% off today.\n\n\u2705 ' +
            rating +
            "/5 stars\n\u2705 Free shipping\n\u2705 30-day money-back guarantee\n\nDon't wait \u2014 this deal won't last.";
          headline = title + ' \u2014 ' + disc + '% Off Today Only';
          desc = reviews + '+ verified 5-star reviews. Premium quality at an unbeatable price.';
        } else if (framework === 'AIDA') {
          fbCopy =
            '\uD83D\uDD25 Introducing the ' +
            title +
            ' \u2014 the ' +
            kw +
            " that's taking the internet by storm!\n\n\u2728 Why " +
            reviews +
            '+ customers love it:\n\u2192 Premium quality construction\n\u2192 ' +
            rating +
            '/5 average rating\n\u2192 Results in just days\n\u2192 Free express shipping\n\n\u26A1 Limited time: ' +
            disc +
            '% OFF + Free bonuses\n\n\uD83D\uDC46 Tap Shop Now before this deal expires!';
          headline = 'The ' + kw + ' That ' + reviews + '+ People Are Obsessed With';
          desc =
            'Rated ' + rating + '/5 by ' + reviews + '+ happy customers. Order risk-free with our 30-day guarantee.';
        } else if (framework === 'Before/After Bridge') {
          fbCopy =
            'Before: Struggling with ' +
            kw +
            ' that never delivered.\nAfter: Life-changing results with the ' +
            title +
            '.\n\nBridge? Just one order.\n\n' +
            reviews +
            "+ verified buyers can't be wrong:\n\u2B50\u2B50\u2B50\u2B50\u2B50 This changed everything!\n\u2B50\u2B50\u2B50\u2B50\u2B50 Best purchase I've made all year\n\nGet yours " +
            disc +
            '% off \u2192 Limited stock!';
          headline = 'See Why ' + reviews + '+ People Switched to ' + title;
          desc = 'Join ' + reviews + '+ satisfied customers. 30-day guarantee. Free shipping.';
        } else if (framework === "4U's") {
          fbCopy =
            '\u26A1 URGENT: ' +
            disc +
            '% OFF ends at midnight!\n\n\u2705 USEFUL: The ' +
            title +
            ' that actually works\n\u2705 UNIQUE: Premium ' +
            kw +
            " you won't find anywhere else\n\u2705 ULTRA-SPECIFIC: " +
            rating +
            '/5 from ' +
            reviews +
            '+ reviews\n\u2705 URGENT: Only ' +
            Math.floor(Math.random() * 50 + 20) +
            " left at this price\n\nDon't regret missing this. \uD83D\uDC47";
          headline = title + ' \u2014 ' + disc + '% Off (Ends Tonight!)';
          desc =
            'Only ' +
            Math.floor(Math.random() * 50 + 20) +
            ' left. ' +
            rating +
            '/5 stars. Free shipping + 30-day guarantee.';
        } else {
          fbCopy =
            'Meet ' +
            ['Sarah', 'Emma', 'Jessica', 'Lisa', 'Rachel'][Math.floor(Math.random() * 5)] +
            ' \uD83D\uDC4B\n\nShe was tired of ' +
            kw +
            ' that promised everything and delivered nothing.\n\nThen she tried the ' +
            title +
            '...\n\n\u2728 ' +
            rating +
            '/5 star rating\n\u2728 ' +
            reviews +
            '+ verified reviews\n\u2728 ' +
            disc +
            '% off this week only\n\nHer story could be your story. Try it risk-free \u2192';
          headline = title + " \u2014 See Why Everyone's Switching";
          desc = 'Join ' + reviews + '+ happy customers. 30-day money-back guarantee.';
        }

        const tiktok =
          '## TIKTOK\n' +
          '### Hook (0-3s)\n"POV: You finally found the ' +
          kw +
          ' that actually works..."\n' +
          '### Script (3-15s)\nShow product in use \u2192 highlight key feature \u2192 show reviews counter \u2192 urgency (limited stock)\n' +
          '### CTA\n"Link in bio \uD83D\uDC46 \u2014 ' +
          disc +
          '% off ends tonight!"\n' +
          '### Caption\nThe ' +
          kw +
          " everyone's been asking about \uD83E\uDD29 #trending #musthave";

        const ig =
          '## INSTAGRAM REELS\n' +
          '### Caption\nThe ' +
          kw +
          " that's breaking the internet \uD83D\uDD25\u2728 Link in bio! #" +
          kw.replace(/\s/g, '') +
          ' #viral #fyp\n' +
          '### Hashtags\n#' +
          kw.replace(/\s/g, '') +
          ' #trending #viral #shopping #deal #musthave';

        return (
          '## FACEBOOK/INSTAGRAM\n### Primary Text\n' +
          fbCopy +
          '\n### Headline\n' +
          headline +
          '\n### Description\n' +
          desc +
          '\n### CTA Button\nShop Now\n\n' +
          tiktok +
          '\n\n' +
          ig
        );
      },

      hooks: function (product) {
        const kw = product.keywords[0] || product.category;
        const title = product.title.split('\u2014')[0].trim();
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const lines = [];
        lines.push('## PATTERN INTERRUPT');
        lines.push('1. "STOP. Don\'t buy a ' + kw + ' until you see this..." [Score: 9/10 | TikTok]');
        lines.push('2. "I was today years old when I found out about this ' + kw + '..." [Score: 8/10 | TikTok/IG]');
        lines.push('3. "This ' + kw + ' just sold out 3 times. Here\'s why..." [Score: 9/10 | FB/TikTok]');
        lines.push('');
        lines.push('## CURIOSITY');
        lines.push('4. "Nobody is talking about this ' + kw + ' and I don\'t know why..." [Score: 8/10 | TikTok]');
        lines.push('5. "The ' + kw + ' that went viral for a reason..." [Score: 8/10 | FB/IG]');
        lines.push(
          '6. "I found the ' + kw + ' that Amazon doesn\'t want you to know about..." [Score: 7/10 | YouTube/FB]'
        );
        lines.push('');
        lines.push('## SOCIAL PROOF');
        lines.push('7. ' + reviews + '+ people bought this ' + kw + " last week. Here's why... [Score: 9/10 | All]");
        lines.push(
          '8. "This ' +
            title +
            ' has ' +
            product.rating +
            ' stars from ' +
            reviews +
            ' reviews..." [Score: 8/10 | FB/IG]'
        );
        lines.push('9. "' + reviews + '+ five-star reviews can\'t be wrong..." [Score: 8/10 | FB/IG Stories]');
        lines.push('');
        lines.push('## PROBLEM-AGITATION');
        lines.push('10. "If you\'re still struggling with ' + kw + ', watch this..." [Score: 9/10 | TikTok/FB]');
        lines.push('11. "Tired of ' + kw + ' that breaks after a week? Same..." [Score: 8/10 | TikTok]');
        lines.push('12. "POV: You finally found the ' + kw + ' that actually works..." [Score: 9/10 | TikTok/Reels]');
        lines.push('');
        lines.push('## CONTROVERSY');
        lines.push('13. "Unpopular opinion: Most ' + kw + 's are overpriced garbage..." [Score: 7/10 | TikTok]');
        lines.push(
          '14. "This ' + kw + ' is better than brands charging 3x more. Fight me." [Score: 8/10 | TikTok/Twitter]'
        );
        lines.push('15. "The ' + kw + ' industry doesn\'t want you to see this..." [Score: 7/10 | FB/TikTok]');
        return lines.join('\n');
      },

      compliance: function (_copyText) {
        return (
          '## OVERALL SCORE\n78/100\n\n## ISSUES FOUND\n' +
          '- \uD83D\uDFE1 Warning: "BREAKING the internet" may be considered exaggerated claim\n  Suggested fix: "Trending right now" or "Going viral"\n' +
          '- \uD83D\uDFE1 Warning: Urgency claims must match actual offer\n  Suggested fix: Ensure sale is genuine with real end date\n' +
          '- \uD83D\uDFE2 Minor: Consider adding "Results may vary" for social proof claims\n  Suggested fix: Add small disclaimer\n\n' +
          '## PLATFORM-SPECIFIC NOTES\n### Facebook/Instagram\n- Ensure CTA matches landing page\n- Price must match landing page\n- No personal attributes targeting\n### TikTok\n- Less strict on urgency claims\n- "Link in bio" is acceptable\n- Avoid before/after imagery\n\n' +
          '## REVISED COPY\nRemove exaggerated claims, keep core message, add minor disclaimers.'
        );
      },

      variations: function (product, count) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const disc = product.discount || 30;
        const rating = product.rating;
        const angles = [
          {
            angle: 'Fear of Missing Out',
            tone: 'Urgent',
            copy:
              '\u23F0 Only ' +
              Math.floor(Math.random() * 30 + 10) +
              ' left! The ' +
              title +
              ' is selling out FAST. ' +
              reviews +
              "+ people grabbed yours this week. Don't be the one who waits too long \u2192",
          },
          {
            angle: 'Social Proof',
            tone: 'Confident',
            copy:
              '\u2B50\u2B50\u2B50\u2B50\u2B50 ' +
              reviews +
              "+ five-star reviews can't be wrong. The " +
              title +
              ' is the #1 rated ' +
              kw +
              " of 2026. See why everyone's switching \u2192",
          },
          {
            angle: 'Value/Deal',
            tone: 'Excited',
            copy:
              '\uD83D\uDD25 ' +
              disc +
              '% OFF the ' +
              title +
              ' \u2014 premium quality, factory price. Limited time only \u2192',
          },
          {
            angle: 'Problem/Solution',
            tone: 'Empathetic',
            copy:
              'Tired of ' +
              kw +
              " that don't deliver? Same. That's why we found the " +
              title +
              ' \u2014 the last ' +
              kw +
              " you'll ever need. " +
              rating +
              '/5 stars. 30-day guarantee.',
          },
          {
            angle: 'Lifestyle/Aspiration',
            tone: 'Premium',
            copy:
              'Upgrade your ' +
              product.category +
              ' game \u2728 The ' +
              title +
              ' is what ' +
              reviews +
              '+ people chose when they got serious about quality. Premium materials. Stunning design. Free shipping.',
          },
          {
            angle: 'Comparison',
            tone: 'Direct',
            copy:
              'Brand ' +
              kw +
              ': $80+. ' +
              title +
              ': Same quality, fraction of the price. ' +
              reviews +
              '+ customers already made the smart switch. ' +
              disc +
              '% off this week only.',
          },
          {
            angle: 'Curiosity',
            tone: 'Intriguing',
            copy:
              "There's a " +
              kw +
              " that 500+ people are ordering every day... and no one's talking about it yet. The " +
              title +
              '. Get it before everyone else does \u2192',
          },
          {
            angle: 'Urgency + Value',
            tone: 'Excited',
            copy:
              '\u26A1 FLASH SALE: ' +
              title +
              ' is ' +
              disc +
              '% off for the next 24 hours. ' +
              rating +
              "/5 stars. Free shipping. Risk-free with 30-day guarantee. This won't come around again.",
          },
          {
            angle: 'Testimonial',
            tone: 'Authentic',
            copy:
              '"I was skeptical at first, but this ' +
              title +
              ' literally changed my daily routine. 10/10 would recommend!" \u2014 Verified Buyer \u2B50\u2B50\u2B50\u2B50\u2B50\n\nJoin ' +
              reviews +
              '+ happy customers \u2192',
          },
          {
            angle: 'Anti-Competitor',
            tone: 'Bold',
            copy:
              'We tested 20+ ' +
              kw +
              ' brands. The ' +
              title +
              ' won by a landslide. ' +
              rating +
              '/5 from ' +
              reviews +
              ' real reviews. No gimmicks \u2014 just the best product at the best price.',
          },
        ];
        const out = [];
        const n = Math.min(count || 10, angles.length);
        for (let i = 0; i < n; i++) {
          const a = angles[i];
          out.push('## VARIATION ' + (i + 1));
          out.push('### Angle: ' + a.angle);
          out.push('### Tone: ' + a.tone);
          out.push('### Copy:');
          out.push(a.copy);
          out.push('### Platform: ' + (i % 2 === 0 ? 'Facebook/Instagram' : 'TikTok'));
          out.push('### Character Count: ' + a.copy.length);
          out.push('');
        }
        return out.join('\n');
      },

      ugcScript: function (product, _type) {
        const kw = product.keywords[0] || product.category;
        const title = product.title.split('\u2014')[0].trim();
        const price = product.price;
        const rating = product.rating;
        const reviews = product.reviews;
        const lines = [];

        lines.push('## SCRIPT OVERVIEW');
        lines.push('Duration: 30s');
        lines.push('Tone: Genuine excitement, casual');
        lines.push('Music Mood: Upbeat lo-fi');
        lines.push('');
        lines.push('## FULL SCRIPT');
        lines.push('### [0-3s] HOOK');
        lines.push('Dialogue: "Okay so this ' + kw + ' just arrived and I\'m literally shaking..."');
        lines.push('Visual: Person at door with package');
        lines.push('Text Overlay: "Is it worth the hype?"');
        lines.push('');
        lines.push('### [3-8s] UNBOXING');
        lines.push('Dialogue: "Let me open this... oh wow, the packaging is actually premium"');
        lines.push('Visual: Hands opening box, close-up of product');
        lines.push('Text Overlay: "' + title + '"');
        lines.push('');
        lines.push('### [8-18s] PRODUCT SHOWCASE');
        lines.push(
          'Dialogue: "Okay first impressions \u2014 this feels amazing. Look at this quality... and it\'s only $' +
            price +
            '?!"'
        );
        lines.push('Visual: Product in use, multiple angles');
        lines.push('Text Overlay: "$' + price + ' \u2014 Link in bio"');
        lines.push('');
        lines.push('### [18-24s] SOCIAL PROOF');
        lines.push('Dialogue: "And it has ' + rating + ' stars from thousands of reviews"');
        lines.push('Visual: Show phone with reviews');
        lines.push('Text Overlay: "' + rating + '/5 \u2B50 ' + reviews + '+ reviews"');
        lines.push('');
        lines.push('### [24-30s] CTA');
        lines.push(
          'Dialogue: "Link in bio if you want to grab one \u2014 but honestly don\'t wait, these sell out fast"'
        );
        lines.push('Visual: Product beauty shot + pointing up');
        lines.push('Text Overlay: "LINK IN BIO \uD83D\uDD17 Limited Stock"');
        lines.push('');
        lines.push('## B-ROLL SUGGESTIONS');
        lines.push('- Close-up of product texture/material');
        lines.push('- Product in use (lifestyle shot)');
        lines.push('- Reaction face shot');
        lines.push('- Phone showing reviews');
        lines.push('');
        lines.push('## PRODUCTION NOTES');
        lines.push('- Film in natural lighting');
        lines.push('- Use handheld camera for authenticity');
        lines.push("- Keep it casual \u2014 don't over-produce");
        return lines.join('\n');
      },

      abTestPlan: function (product) {
        const kw = product.keywords[0] || product.category;
        const dailyBudget = Math.max(product.adSpendAvg || 20, 10);
        const lines = [];
        lines.push('## TESTING STRATEGY');
        lines.push(
          'Systematic A/B testing for ' +
            product.title +
            '. One variable at a time, minimum $' +
            dailyBudget +
            '/day per variation.'
        );
        lines.push('');
        lines.push('## WEEK 1: HOOK TESTING');
        lines.push('### What to test');
        lines.push('Variation A: Problem hook \u2014 "Tired of ' + kw + ' that don\'t work?"');
        lines.push('Variation B: Social proof hook \u2014 "' + product.reviews + '+ people bought this last week"');
        lines.push('Variation C: Curiosity hook \u2014 "This ' + kw + ' is going viral for a reason..."');
        lines.push('### Budget per variation: $' + dailyBudget + '/day each ($' + dailyBudget * 3 + '/day total)');
        lines.push('### Duration: 5 days ($' + dailyBudget * 15 + ' total)');
        lines.push('### Winner criteria: Best CTR after $' + dailyBudget * 5 + ' spend. 30%+ CTR difference required.');
        lines.push('');
        lines.push('## WEEK 2: VISUAL TESTING');
        lines.push('Variation A: UGC-style | Variation B: Product-focused | Variation C: Lifestyle');
        lines.push('Budget: $' + dailyBudget + '/day each for 5 days | Winner: Best CPA');
        lines.push('');
        lines.push('## WEEK 3: HEADLINE TESTING');
        lines.push('Variation A: Discount-focused | Variation B: Social-proof | Variation C: Curiosity');
        lines.push('Budget: $' + dailyBudget + '/day each for 5 days | Winner: Best conversion rate');
        lines.push('');
        lines.push('## WEEK 4: CTA & DESCRIPTION');
        lines.push('Variation A: "Shop Now" | Variation B: "Learn More" | Variation C: "Get Yours"');
        lines.push('Budget: $' + dailyBudget + '/day each for 3 days | Winner: Best click-to-purchase rate');
        lines.push('');
        lines.push('## TOTAL BUDGET: $' + dailyBudget * 33 + ' for full 4-week test');
        lines.push(
          '## KEY METRICS: CTR >2% (FB) >1% (TikTok) | CPA <$' +
            (product.cpaAvg || '5') +
            ' | Hook rate | Conversion rate'
        );
        return lines.join('\n');
      },

      retargeting: function (product) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const rating = product.rating;
        const disc = product.discount || 30;
        const lines = [];
        lines.push('## STAGE 1: COLD TRAFFIC (Day 1-3)');
        lines.push('### Audience: Page viewers, no add-to-cart');
        lines.push('### Goal: Social proof & curiosity');
        lines.push('### Facebook/Instagram Copy');
        lines.push(
          reviews +
            '+ people bought the ' +
            title +
            ' this month alone. With a ' +
            rating +
            "/5 star rating, it's the most trusted " +
            kw +
            ' of 2026. See what the hype is about \u2192'
        );
        lines.push('### Headline: ' + title + ' \u2014 ' + reviews + '+ Happy Customers');
        lines.push('### CTA: Shop Now');
        lines.push('### Creative Direction: UGC-style product video, natural lighting');
        lines.push('');
        lines.push('## STAGE 2: WARM TRAFFIC (Day 3-7)');
        lines.push('### Audience: Add-to-cart, no purchase');
        lines.push('### Goal: Objection crushing');
        lines.push('### Facebook/Instagram Copy');
        lines.push('We see you left something in your cart \uD83D\uDC08 The ' + title + " won't wait forever.");
        lines.push(
          'Still thinking? ' +
            rating +
            '/5 star quality | Free shipping | 30-day guarantee | ' +
            disc +
            '% off (ending soon)'
        );
        lines.push('### Headline: Your ' + title + ' is waiting... \u23F0');
        lines.push('### CTA: Complete Your Order');
        lines.push('### Creative Direction: Cart reminder with urgency overlay');
        lines.push('');
        lines.push('## STAGE 3: HOT TRAFFIC (Day 7-14)');
        lines.push('### Audience: Multiple page views, cart abandon');
        lines.push('### Goal: Urgency & scarcity');
        lines.push('### Facebook/Instagram Copy');
        lines.push(
          '\u23F0 FINAL NOTICE: The ' +
            title +
            ' deal expires in 48 hours. ' +
            disc +
            '% off + free shipping ends Friday.'
        );
        lines.push('### Headline: Last Chance: ' + disc + '% Off Ends Friday');
        lines.push("### CTA: Buy Now \u2014 Don't Miss Out");
        lines.push('### Creative Direction: Countdown timer overlay, sold-out badge');
        lines.push('');
        lines.push('## STAGE 4: FINAL PUSH (Day 14-21)');
        lines.push('### Audience: All retargeting pool');
        lines.push('### Goal: Last chance offer');
        lines.push('### Facebook/Instagram Copy');
        lines.push("Here's an EXTRA 10% off the " + title + ". Use code LASTCHANCE. Lowest price we've ever offered.");
        lines.push('### Headline: EXTRA 10% Off \u2014 Code: LASTCHANCE');
        lines.push('### CTA: Claim Your Discount');
        lines.push('### Creative Direction: Bold FINAL SALE overlay, maximum urgency');
        lines.push('');
        lines.push('## BUDGET ALLOCATION');
        lines.push('Stage 1: 40% | Stage 2: 30% | Stage 3: 20% | Stage 4: 10%');
        lines.push('## EXPECTED RECOVERY: 15-30% overall retargeting pool recovery');
        return lines.join('\n');
      },

      fatigue: function (product) {
        const kw = product.keywords[0] || product.category;
        const saturation = product.marketSaturation || 'medium';
        const riskLevel = saturation === 'high' ? 'High' : saturation === 'low' ? 'Low' : 'Medium';
        const lifespan = riskLevel === 'High' ? '5-7 days' : riskLevel === 'Low' ? '14-21 days' : '7-14 days';
        const lines = [];
        lines.push('## FATIGUE RISK ASSESSMENT');
        lines.push('Risk Level: ' + riskLevel);
        lines.push('Estimated Ad Lifespan: ' + lifespan);
        lines.push(
          'Reasoning: ' + kw + ' niche has ' + saturation + ' saturation with ' + product.competition + ' competition.'
        );
        lines.push('');
        lines.push('## WHEN TO REFRESH');
        lines.push('- CTR drops 20%+ from baseline');
        lines.push('- CPM increases 30%+');
        lines.push('- Frequency reaches 2.5+');
        lines.push('- ThruPlay rate drops below 25%');
        lines.push('');
        lines.push('## 5 FRESH VARIATIONS');
        lines.push('### Variation 1: Hook Swap \u2014 New hook, keep everything else. Expected: 15-25% CTR recovery');
        lines.push(
          '### Variation 2: Visual Refresh \u2014 UGC-style instead of product-focused. Expected: 20-30% CPM reduction'
        );
        lines.push('### Variation 3: CTA Swap \u2014 "Get Yours Before It\'s Gone". Expected: 10-20% conversion lift');
        lines.push(
          '### Variation 4: Emotional Pivot \u2014 Problem-to-solution approach. Expected: 20-40% CTR recovery'
        );
        lines.push('### Variation 5: Format Change \u2014 Static to carousel. Expected: 25-35% engagement increase');
        lines.push('');
        lines.push('## PLATFORM FATIGUE');
        lines.push('Facebook: 5-10 days | TikTok: 3-7 days | Instagram: 5-12 days');
        return lines.join('\n');
      },

      swipeLibrary: function (product) {
        const kw = product.keywords[0] || product.category;
        const lines = [];
        lines.push('## NICHE: ' + product.category);
        lines.push('');
        lines.push('## TOP 8 PERFORMING AD PATTERNS');
        lines.push('### Pattern 1: The Social Proof Stack [Conversion] \u2014 Numbers-first hook, FOMO + Trust');
        lines.push(
          '### Pattern 2: The Problem-Solution [Conversion] \u2014 Pain point question, Frustration \u2192 Relief'
        );
        lines.push('### Pattern 3: The UGC Unboxing [Awareness + Conversion] \u2014 Genuine reaction, Authenticity');
        lines.push('### Pattern 4: The Comparison [Conversion] \u2014 Bold comparison, Smart shopping pride');
        lines.push('### Pattern 5: The Urgency Stack [Retargeting] \u2014 Time pressure, FOMO');
        lines.push('### Pattern 6: The Testimonial [Conversion] \u2014 Customer story, Relatability');
        lines.push('### Pattern 7: The Educational [Awareness] \u2014 Teaching, Soft sell');
        lines.push('### Pattern 8: The Scarcity Play [Conversion] \u2014 Limited availability, Exclusivity');
        lines.push('');
        lines.push('## WINNING COPY ANGLES');
        lines.push('1. "The last ' + kw + ' you\'ll ever need"');
        lines.push('2. "Join ' + product.reviews + '+ happy customers"');
        lines.push('3. "Rated ' + product.rating + '/5 by real buyers"');
        lines.push('4. "Same quality as premium brands, fraction of the price"');
        lines.push('5. "Free shipping + 30-day guarantee \u2014 zero risk"');
        lines.push('');
        lines.push('## VISUAL TRENDS');
        lines.push('- UGC > polished (authenticity wins)');
        lines.push('- Text overlays in first frame');
        lines.push('- Product-in-context lifestyle shots');
        lines.push('- Vertical-first (9:16 for mobile)');
        lines.push('');
        lines.push('## COMMON MISTAKES TO AVOID');
        lines.push('1. Generic copy that could be any product');
        lines.push('2. No clear CTA or too many CTAs');
        lines.push('3. Ignoring mobile-first design');
        lines.push('4. Not testing hooks (80% of ad success)');
        lines.push('5. Same ad across all platforms without adapting');
        return lines.join('\n');
      },

      roas: function (product, budget) {
        const profitPerSale = product.price - product.originalPrice;
        const dailyBudget = parseFloat(budget) || 20;
        const cpa = product.cpaAvg || 5;
        const conservSales = Math.floor(dailyBudget / (cpa * 1.5));
        const expectSales = Math.floor(dailyBudget / cpa);
        const optimSales = Math.floor(dailyBudget / (cpa * 0.7));
        const lines = [];
        lines.push('## PROFIT ANALYSIS');
        lines.push('Revenue per sale: $' + product.price);
        lines.push('Cost per unit: $' + product.originalPrice);
        lines.push('Profit per sale: $' + profitPerSale.toFixed(2));
        lines.push('Break-even CPA: $' + profitPerSale.toFixed(2));
        lines.push('');
        lines.push('## ROAS PREDICTIONS');
        lines.push(
          '### Conservative: ' +
            (product.price / (cpa * 1.5)).toFixed(1) +
            'x ROAS | ~' +
            conservSales +
            ' sales/day | $' +
            (conservSales * profitPerSale - dailyBudget).toFixed(2) +
            ' profit'
        );
        lines.push(
          '### Expected: ' +
            (product.price / cpa).toFixed(1) +
            'x ROAS | ~' +
            expectSales +
            ' sales/day | $' +
            (expectSales * profitPerSale - dailyBudget).toFixed(2) +
            ' profit'
        );
        lines.push(
          '### Optimistic: ' +
            (product.price / (cpa * 0.7)).toFixed(1) +
            'x ROAS | ~' +
            optimSales +
            ' sales/day | $' +
            (optimSales * profitPerSale - dailyBudget).toFixed(2) +
            ' profit'
        );
        lines.push('');
        lines.push('## BUDGET RECOMMENDATIONS');
        lines.push(
          'Facebook: $' +
            Math.max(dailyBudget, 10) +
            '/day | Scale: ROAS >2x for 3 days | Kill: ROAS <1x after $' +
            dailyBudget * 3
        );
        lines.push(
          'TikTok: $' +
            Math.max(Math.floor(dailyBudget * 0.6), 10) +
            '/day | Scale: CTR >1.5% | Kill: CPA >$' +
            (profitPerSale * 1.5).toFixed(2)
        );
        lines.push('');
        lines.push('## KILL SWITCH RULES');
        lines.push('Kill if: CPA > $' + (profitPerSale * 2).toFixed(2) + ' for 3+ days');
        lines.push('Scale if: ROAS > 2x for 3+ days');
        lines.push('Optimize if: CTR < 1%');
        return lines.join('\n');
      },

      audienceMatch: function (product) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const rating = product.rating;
        const disc = product.discount || 30;
        const lines = [];
        lines.push('## GEN Z (18-24)');
        lines.push('Tone: Trendy, emoji-heavy, TikTok-native');
        lines.push(
          'FB/IG: ok this ' +
            kw +
            ' is actually fire \uD83D\uDD25 ' +
            reviews +
            '+ people copped this already. ' +
            rating +
            '/5?? say less. link in bio fr'
        );
        lines.push('TikTok: "POV: you found the ' + kw + ' everyone\'s been hyping and it actually delivers..."');
        lines.push('Best: TikTok, IG Reels | Triggers: Social proof, aesthetics, FOMO');
        lines.push('');
        lines.push('## MILLENNIALS (25-34)');
        lines.push('Tone: Practical, value-focused, research-driven');
        lines.push(
          'FB/IG: Looking for a reliable ' +
            kw +
            '? The ' +
            title +
            ' is rated ' +
            rating +
            '/5 by ' +
            reviews +
            '+ verified customers. Premium quality. 30-day guarantee. ' +
            disc +
            '% off this week.'
        );
        lines.push('TikTok: "Here\'s the ' + kw + ' that actually lives up to the hype..."');
        lines.push('Best: Instagram, Facebook | Triggers: Quality, reviews, value, convenience');
        lines.push('');
        lines.push('## GEN X (35-50)');
        lines.push('Tone: Quality-focused, skeptical, straightforward');
        lines.push(
          "FB/IG: I don't usually post about products, but the " +
            title +
            ' earned it. ' +
            reviews +
            '+ verified reviews. ' +
            rating +
            "/5 stars. 30-day guarantee. If you've been on the fence, this is your sign."
        );
        lines.push('TikTok: "I\'m too old for viral trends, but this ' + kw + ' is genuinely good..."');
        lines.push('Best: Facebook, YouTube | Triggers: Durability, reliability, warranty, word-of-mouth');
        lines.push('');
        lines.push('## BUDGET ALLOCATION: Gen Z 30% | Millennials 50% | Gen X 20%');
        lines.push('TESTING ORDER: 1) Millennials 2) Gen Z 3) Gen X');
        return lines.join('\n');
      },

      creativeBrief: function (product, adType) {
        const kw = product.keywords[0] || product.category;
        const ratio =
          adType === 'Story' ? '9:16 (1080x1920)' : adType === 'Feed' ? '1:1 (1080x1080)' : '4:5 (1080x1350)';
        const lines = [];
        lines.push('## CREATIVE BRIEF \u2014 ' + adType);
        lines.push('');
        lines.push('## VISUAL DIRECTION');
        lines.push('Colors: Deep Navy (#1a1a2e) + White (#fff) + Teal (#00e5ff)');
        lines.push('Style: Clean, modern, lifestyle-focused. Authentic over polished.');
        lines.push('Typography: Bold sans-serif headline, Clean sans-serif body');
        lines.push('');
        lines.push('## LAYOUT');
        lines.push('Aspect Ratio: ' + ratio);
        lines.push('Safe Zones: Top 15% clear (platform UI), Bottom 20% (captions), Sides 5%');
        lines.push('');
        lines.push('## SHOT LIST');
        lines.push('Shot 1 [0-2s]: Hook frame \u2014 product reveal or text hook');
        lines.push('Shot 2 [2-5s]: Product in context / person using it');
        lines.push('Shot 3 [5-10s]: Feature showcase with text overlay');
        lines.push('Shot 4 [10-15s]: Social proof \u2014 review count, stars');
        lines.push('Shot 5 [15-20s]: Transformation/result');
        lines.push('Shot 6 [20-25s]: CTA with price and urgency');
        lines.push('');
        lines.push('## AI IMAGE PROMPTS');
        lines.push('Midjourney: Product photography, ' + kw + ', clean white background, studio shot, 4K --ar 1:1');
        lines.push('DALL-E: Professional product photo of a ' + kw + ' on minimalist white surface, studio lighting');
        lines.push('Canva: Search "product photography", "minimalist product"');
        lines.push('');
        lines.push('## PLATFORM SPECS');
        lines.push('FB/IG Feed: 1080x1080 or 1080x1350 | Stories/Reels/TikTok: 1080x1920');
        lines.push('Max: 30MB images, 4GB video | Format: MP4/JPG/PNG');
        return lines.join('\n');
      },

      seasonal: function (product, event) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const disc = product.discount || 30;
        const rating = product.rating;
        const reviews = product.reviews;
        const lines = [];
        lines.push('## ' + event.toUpperCase() + ' CAMPAIGN');
        lines.push('');
        lines.push('### Theme: "' + event + ' Must-Have: The ' + kw + ' Everyone\'s Adding to Cart"');
        lines.push('');
        lines.push('### PRE-EVENT HYPE (7 days before)');
        lines.push(
          'FB/IG: Something big is coming... \uD83D\uDC08 The ' +
            title +
            ' drops to its LOWEST price ever. ' +
            event +
            ' exclusive: Up to ' +
            disc +
            '% off.'
        );
        lines.push('TikTok: "Plot twist: the ' + kw + ' is about to go ON SALE..." Turn on notifications.');
        lines.push('');
        lines.push('### LAUNCH DAY');
        lines.push(
          "FB/IG: \uD83C\uDF89 IT'S HERE! " +
            event +
            ' deals are LIVE! ' +
            title +
            ' \u2014 NOW ' +
            disc +
            '% OFF! ' +
            rating +
            '/5 stars. ' +
            reviews +
            '+ happy customers. Free shipping + guarantee.'
        );
        lines.push(
          'TikTok: "' + event + ' drop just went LIVE and this ' + kw + ' is ' + disc + '% off!!!" Link in bio.'
        );
        lines.push('');
        lines.push('### MID-EVENT URGENCY');
        lines.push(
          'FB/IG: \u26A0\uFE0F ' + event + ' update: ' + title + ' is 60% claimed! ' + disc + '% off ends in [X] hours.'
        );
        lines.push('TikTok: "Day [X] of ' + event + ' and the ' + kw + ' is almost gone..." Last chance.');
        lines.push('');
        lines.push('### LAST CHANCE');
        lines.push('FB/IG: \uD83D\uDD34 FINAL HOURS: ' + event + ' deal ends at MIDNIGHT! After tonight, full price.');
        lines.push(
          'TikTok: "FINAL HOURS. ' +
            event +
            ' deal expires at midnight. Link in bio \u2014 I can\'t help you after tonight."'
        );
        lines.push('');
        lines.push('### POST-EVENT');
        lines.push(
          '' + event + ' is over but the ' + title + ' is still a bestseller. Sign up for alerts for next sale.'
        );
        lines.push('');
        lines.push('## DISCOUNT STRATEGY: ' + disc + '% off OR buy 1 get 1 20% off');
        return lines.join('\n');
      },

      lpMatcher: function (product, _adCopyText) {
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const rating = product.rating;
        const disc = product.discount || 30;
        const lines = [];
        lines.push('## LANDING PAGE COPY');
        lines.push('');
        lines.push('### Hero Section');
        lines.push('Headline: The ' + kw + ' That ' + reviews + '+ People Trust');
        lines.push('Subheadline: Rated ' + rating + '/5 stars. Premium quality. Free shipping.');
        lines.push('CTA: Shop Now \u2014 ' + disc + '% Off | 30-day guarantee | Free returns');
        lines.push('');
        lines.push('### Benefits');
        lines.push('\u2705 Premium Quality \u2014 Tested and verified to exceed expectations');
        lines.push('\u2705 Risk-Free Purchase \u2014 30-day money-back guarantee');
        lines.push('\u2705 Fast Free Shipping \u2014 Delivered in 3-5 business days');
        lines.push('\u2705 Best Value \u2014 Premium ' + kw + ' at a fraction of competitor prices');
        lines.push('');
        lines.push('### Social Proof');
        lines.push('\u2B50\u2B50\u2B50\u2B50\u2B50 "Best ' + kw + ' I\'ve ever owned." \u2014 Verified Buyer');
        lines.push('\u2B50\u2B50\u2B50\u2B50\u2B50 "Exceeded all my expectations." \u2014 Verified Buyer');
        lines.push('Stats: ' + reviews + '+ verified reviews | ' + rating + '/5 average');
        lines.push('');
        lines.push('### FAQ');
        lines.push('Q: How long does shipping? A: Free 3-5 day shipping. Express available.');
        lines.push('Q: Not satisfied? A: 30-day money-back guarantee, full refund.');
        lines.push('Q: Same quality as expensive brands? A: Yes! ' + reviews + '+ customers agree.');
        lines.push('Q: Payment secure? A: Bank-level SSL encryption. All major cards + PayPal.');
        lines.push('');
        lines.push('### Final CTA');
        lines.push("Headline: Don't Miss Out \u2014 " + disc + '% Off Ends Soon!');
        lines.push('Button: Get Yours Now \u2014 $' + product.price);
        lines.push('Trust: 30-day guarantee | Free returns | Secure checkout');
        return lines.join('\n');
      },

      // =====================================================================
      // v3.0 FALLBACK GENERATORS
      // =====================================================================
      multiPlatform: function (product) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const rating = product.rating;
        const disc = product.discount || 30;
        const lines = [];
        lines.push('## FACEBOOK (Feed + Stories)');
        lines.push('### Primary Text');
        lines.push(
          'Stop scrolling. ' +
            reviews +
            '+ people switched to the ' +
            title +
            " \u2014 and haven't looked back.\n\nRated " +
            rating +
            '/5 stars. Premium ' +
            kw +
            ' quality at ' +
            disc +
            '% off.\n\n\u2705 Free shipping\n\u2705 30-day guarantee\n\u2705 ' +
            rating +
            '/5 from ' +
            reviews +
            " reviews\n\nDon't overpay for " +
            kw +
            " that doesn't deliver. This is the one everyone's switching to.\n\n\u23F0 Limited time: " +
            disc +
            '% OFF'
        );
        lines.push('### Headline: ' + title + ' \u2014 ' + disc + '% Off Today');
        lines.push(
          '### Description: ' + reviews + "+ happy customers can't be wrong. Free shipping + 30-day guarantee."
        );
        lines.push('### CTA: Shop Now');
        lines.push('### Best Practices: Use carousel format, add social proof overlay, test 3 headlines');
        lines.push('');
        lines.push('## TIKTOK (Native Ads)');
        lines.push('### Hook (0-2s): "POV: You found the ' + kw + ' that actually delivers..."');
        lines.push(
          '### Script (2-15s): Show product unboxing \u2192 close-up quality \u2192 reviews on screen \u2192 price reveal'
        );
        lines.push('### CTA: "Link in bio \uD83D\uDC47 before it sells out"');
        lines.push(
          '### Caption: the ' +
            kw +
            " everyone's been asking about \uD83E\uDD29 #trending #musthave #" +
            kw.replace(/\s/g, '')
        );
        lines.push('### Sound: Use trending sound or lo-fi beat');
        lines.push('');
        lines.push('## INSTAGRAM (Reels + Feed + Stories)');
        lines.push('### Reel Hook: "Wait for it... the ' + kw + ' that broke the internet \uD83D\uDD25"');
        lines.push('### Reel Script: Aesthetic product shots \u2192 lifestyle use \u2192 reaction \u2192 link in bio');
        lines.push(
          '### Feed Caption: The ' +
            kw +
            ' that ' +
            reviews +
            '+ people chose this month. Rated ' +
            rating +
            '/5 \u2B50 Link in bio!'
        );
        lines.push('### Stories CTA: Poll "Worth it?" \u2192 Swipe up to shop');
        lines.push(
          '### Hashtags: #' + kw.replace(/\s/g, '') + ' #trending #viral #shopping #musthave #deal #fyp #shopnow'
        );
        lines.push('');
        lines.push('## YOUTUBE (Pre-roll + Shorts)');
        lines.push(
          '### Pre-roll (15s): "Still wasting money on bad ' +
            kw +
            '? ' +
            reviews +
            '+ people found the solution. ' +
            title +
            ' \u2014 ' +
            disc +
            '% off. Link below."'
        );
        lines.push(
          '### Shorts Script: "I tested 10 ' +
            kw +
            ' brands. This one won by a landslide." [Show product, features, reviews]'
        );
        lines.push('### Title: I Found The BEST ' + kw + ' of 2026 (Honest Review)');
        lines.push(
          '### Description: After testing ' +
            reviews +
            '+ reviews worth of data, the ' +
            title +
            ' is the top-rated ' +
            kw +
            ' of 2026. ' +
            disc +
            '% off for a limited time.'
        );
        lines.push('');
        lines.push('## PINTEREST (Pins + Idea Pins)');
        lines.push('### Pin Title: Best ' + kw + ' 2026 \u2014 ' + disc + '% Off + Free Shipping');
        lines.push(
          '### Pin Description: Discover why ' +
            reviews +
            '+ customers rated this ' +
            kw +
            ' ' +
            rating +
            '/5 stars. Premium quality, free shipping, 30-day guarantee. Limited time ' +
            disc +
            '% off.'
        );
        lines.push('### Board Name: Best ' + kw.replace(/\s/g, '') + ' Deals 2026');
        lines.push('### SEO Keywords: ' + kw + ', best ' + kw + ', ' + kw + ' deal, buy ' + kw + ', ' + kw + ' review');
        return lines.join('\n');
      },

      hookAnalyzer: function (product, hook) {
        const kw = product.keywords[0] || product.category;
        const lines = [];
        lines.push('## OVERALL SCORE: 72/100 (Grade: B)');
        lines.push('');
        lines.push('## HOOK BREAKDOWN');
        lines.push('- Pattern Interrupt Strength: 7/10 \u2014 Grabs attention but could be more unexpected');
        lines.push('- Curiosity Gap: 8/10 \u2014 Creates a strong desire to know more');
        lines.push('- Emotional Trigger: 6/10 \u2014 Primarily curiosity, could add social proof or urgency');
        lines.push('- Specificity: 5/10 \u2014 Could include specific numbers or results');
        lines.push('- Platform Fit: Best for TikTok and Instagram Reels');
        lines.push('');
        lines.push('## PSYCHOLOGICAL PRINCIPLES USED');
        lines.push('- Curiosity gap (strong)');
        lines.push('- Social proof implied (moderate)');
        lines.push('');
        lines.push('## PREDICTED PERFORMANCE');
        lines.push('- Thumb-Stop Rate: 2.5-3.5%');
        lines.push('- Expected CTR: 1.2-2.1%');
        lines.push('- Best Time: Middle of funnel (consideration stage)');
        lines.push('');
        lines.push('## 3 IMPROVED VERSIONS');
        lines.push('### Version 1: Add Social Proof');
        lines.push(
          '"' + product.reviews + '+ people bought this ' + kw + ' last month. Here\'s why..." [Score: 85/100]'
        );
        lines.push('### Version 2: Add Urgency');
        lines.push(
          '"This ' +
            kw +
            ' just sold out twice. Only ' +
            Math.floor(Math.random() * 30 + 10) +
            ' left..." [Score: 88/100]'
        );
        lines.push('### Version 3: Pattern Interrupt + Specificity');
        lines.push(
          '"I found a ' +
            kw +
            " that's rated " +
            product.rating +
            "/5 and it's " +
            (product.discount || 30) +
            '% off right now..." [Score: 90/100]'
        );
        lines.push('');
        lines.push('## PLATFORM SUITABILITY');
        lines.push('- Facebook: 6/10 \u2014 Works but needs more context for feed scroll');
        lines.push("- TikTok: 9/10 \u2014 Perfect for the platform's fast-paced style");
        lines.push('- Instagram: 8/10 \u2014 Great for Reels, good for Stories');
        lines.push('- YouTube: 5/10 \u2014 Too short for pre-roll, works for Shorts');
        return lines.join('\n');
      },

      adScore: function (product, copy) {
        const lines = [];
        lines.push('## OVERALL SCORE: 68/100 (Grade: B-)');
        lines.push('');
        lines.push('## CATEGORY SCORES');
        lines.push('- Hook Strength: 7/10 \u2014 Attention-grabbing opening');
        lines.push('- Emotional Trigger: 6/10 \u2014 Could target deeper pain points');
        lines.push('- Clarity: 8/10 \u2014 Message is clear and direct');
        lines.push('- CTA Power: 5/10 \u2014 Generic CTA, needs specificity');
        lines.push('- Social Proof: 7/10 \u2014 Good use of reviews');
        lines.push('- Urgency: 4/10 \u2014 Weak time pressure elements');
        lines.push('- Platform Fit: 6/10 \u2014 Feels like ad copy, not native content');
        lines.push('- Audience Match: 7/10 \u2014 Speaks to the right demographic');
        lines.push('');
        lines.push('## PREDICTED METRICS');
        lines.push('- Estimated CTR: 1.0-1.8%');
        lines.push('- Estimated Conversion Rate: 2.0-3.5%');
        lines.push('- Estimated CPA: $4.50-$7.00');
        lines.push('- Cost Per Sale: $12-$18');
        lines.push('');
        lines.push('## TOP 3 WEAKNESSES');
        lines.push(
          '1. CTA is generic ("Shop Now") \u2192 Fix: Use "Get Yours \u2014 ' +
            (product.discount || 30) +
            '% Off Ends Tonight"'
        );
        lines.push(
          '2. No urgency/scarcity \u2192 Fix: Add "Only ' +
            Math.floor(Math.random() * 30 + 10) +
            ' left" or countdown language'
        );
        lines.push('3. Platform-agnostic \u2192 Fix: Add native elements (emoji, line breaks, hashtags for IG)');
        lines.push('');
        lines.push('## TOP 3 STRENGTHS');
        lines.push('1. Strong social proof with review count');
        lines.push('2. Clear value proposition');
        lines.push('3. Appropriate length for Facebook feed');
        lines.push('');
        lines.push('## OPTIMIZED VERSION');
        lines.push(
          '\u23F0 Only ' +
            Math.floor(Math.random() * 30 + 10) +
            ' left at this price!\n\nThe ' +
            product.title.split('\u2014')[0].trim() +
            ' \u2014 rated ' +
            product.rating +
            '/5 by ' +
            product.reviews +
            '+ verified buyers.\n\n\u2705 Premium quality\n\u2705 Free shipping\n\u2705 30-day guarantee\n\nStop overpaying for ' +
            (product.keywords[0] || product.category) +
            " that doesn't deliver.\n\n\u2728 " +
            (product.discount || 30) +
            '% off \u2192 Link in bio'
        );
        return lines.join('\n');
      },

      copyTransformer: function (product, copy, style) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const rating = product.rating;
        const disc = product.discount || 30;
        const lines = [];
        lines.push('## TRANSFORMED COPY \u2014 ' + (style || 'Short-form').toUpperCase());
        lines.push('');
        switch (style) {
          case 'Short-form':
            lines.push(title + ' \u2014 ' + disc + '% off. ' + rating + '/5 stars. Link in bio.');
            break;
          case 'Long-form':
            lines.push(
              'Let me tell you about the ' +
                title +
                ' \u2014 the ' +
                kw +
                " that's changed how " +
                reviews +
                '+ people approach their daily routine.\n\nRated ' +
                rating +
                "/5 stars by real customers, this isn't just another product. It's THE product.\n\n\u2705 Premium construction that outlasts competitors at 3x the price\n\u2705 Results you can see from day one\n\u2705 Free express shipping on every order\n\u2705 30-day risk-free guarantee\n\nThe best part? It's " +
                disc +
                "% off right now. But this price won't last \u2014 we've already sold through 3 batches this month.\n\nJoin " +
                reviews +
                '+ happy customers who made the switch.'
            );
            break;
          case 'Gen Z':
            lines.push(
              'ok so this ' +
                kw +
                ' is actually insane?? ' +
                reviews +
                '+ ppl gave it ' +
                rating +
                "/5 stars and it's " +
                disc +
                '% off rn \uD83D\uDD25\n\nnot me adding to cart for the third time \uD83E\uDD2F link in bio before it sells out again'
            );
            break;
          case 'Professional':
            lines.push(
              'The data speaks for itself: ' +
                reviews +
                '+ verified customers. ' +
                rating +
                '/5 average rating. ' +
                title +
                ' delivers measurable results.\n\nKey differentiators:\n\u2022 Premium materials and construction\n\u2022 Proven ' +
                rating +
                '/5 customer satisfaction\n\u2022 Risk-free 30-day trial period\n\nCurrent offer: ' +
                disc +
                '% off. Limited availability.'
            );
            break;
          case 'Storytelling':
            lines.push(
              'Sarah was tired of ' +
                kw +
                " that promised everything and delivered nothing.\n\nShe'd tried 5 different brands. None lasted more than a month.\n\nThen she found the " +
                title +
                '.\n\n\u201CIt was different from the first use,\u201D she said. \u201C' +
                rating +
                "/5 stars isn't enough \u2014 I'd give it 6.\u201D\n\nNow " +
                reviews +
                '+ customers agree. Join them.'
            );
            break;
          case 'Urgency':
            lines.push(
              '\u23F0 \u23F0 \u23F0 FINAL HOURS \u23F0 \u23F0 \u23F0\n\nThe ' +
                title +
                ' is ' +
                disc +
                '% OFF \u2014 but only for the next ' +
                Math.floor(Math.random() * 12 + 6) +
                ' hours!\n\n' +
                reviews +
                '+ people grabbed theirs this week.\nOnly ' +
                Math.floor(Math.random() * 30 + 10) +
                ' left in stock.\n\n\u274C After tonight, full price. No exceptions.\n\n\u2B50 ' +
                rating +
                '/5 stars | \u2705 Free shipping | \u2705 30-day guarantee'
            );
            break;
          case 'Luxury':
            lines.push(
              'Introducing the ' +
                title +
                ' \u2014 where premium meets perfection.\n\nCrafted for those who accept nothing less than extraordinary.\n\n\u2728 ' +
                rating +
                '/5 from ' +
                reviews +
                '+ discerning customers\n\u2728 Premium materials, timeless design\n\u2728 Exclusive ' +
                disc +
                "% introductory offer\n\nThis isn't a purchase. It's an investment in quality."
            );
            break;
          case 'Minimalist':
            lines.push(
              title +
                '.\n' +
                rating +
                '/5 stars.\n' +
                reviews +
                '+ reviews.\n' +
                disc +
                '% off.\nFree shipping.\n30-day guarantee.\n\nLink in bio.'
            );
            break;
          default:
            lines.push(
              title + ' \u2014 ' + disc + '% off. ' + rating + '/5 stars. ' + reviews + '+ reviews. Link in bio.'
            );
        }
        return lines.join('\n');
      },

      continuity: function (product) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const rating = product.rating;
        const disc = product.discount || 30;
        const lines = [];
        lines.push('## STAGE 1: AWARENESS (Day 1-5)');
        lines.push('### Goal: Brand introduction, curiosity');
        lines.push('### Audience: Cold \u2014 interest-based targeting');
        lines.push(
          '### FB/IG Ad: Meet the ' +
            title +
            ' \u2014 the ' +
            kw +
            ' that ' +
            reviews +
            "+ people are switching to. Why? One use and you'll get it. " +
            disc +
            '% off for early adopters. Link below \u2192'
        );
        lines.push(
          '### TikTok Script: "POV: You found the ' +
            kw +
            ' everyone\'s been talking about..." [Unbox, react, show feature]'
        );
        lines.push('### Headline: The ' + kw + " That's Going Viral");
        lines.push('### CTA: Learn More');
        lines.push('### Budget: 25% of total');
        lines.push('');
        lines.push('## STAGE 2: CONSIDERATION (Day 5-10)');
        lines.push('### Goal: Build desire, overcome skepticism');
        lines.push('### Audience: Engaged \u2014 video viewers, page engagers');
        lines.push(
          '### FB/IG Ad: Still thinking about the ' +
            title +
            "? Here's why " +
            reviews +
            '+ customers rated it ' +
            rating +
            '/5 stars. Premium quality. Free shipping. 30-day guarantee. ' +
            disc +
            '% off ends soon.'
        );
        lines.push('### TikTok Script: "I was skeptical too, but look at this..." [Show quality, features, reviews]');
        lines.push('### Headline: See Why ' + reviews + '+ People Love It');
        lines.push('### CTA: Shop Now');
        lines.push('### Budget: 25% of total');
        lines.push('');
        lines.push('## STAGE 3: INTENT (Day 10-15)');
        lines.push('### Goal: Push toward purchase');
        lines.push('### Audience: High intent \u2014 add-to-cart, product viewers');
        lines.push(
          '### FB/IG Ad: You left something good behind. The ' +
            title +
            ' is rated ' +
            rating +
            '/5 by ' +
            reviews +
            '+ verified buyers. ' +
            disc +
            '% off + free shipping. Complete your order before this deal disappears.'
        );
        lines.push('### Headline: Your ' + title + ' is Waiting');
        lines.push('### CTA: Complete Your Order');
        lines.push('### Budget: 20% of total');
        lines.push('');
        lines.push('## STAGE 4: CONVERSION (Day 15-20)');
        lines.push('### Goal: Close the sale');
        lines.push('### Audience: Cart abandoners');
        lines.push(
          '### FB/IG Ad: \u23F0 FINAL NOTICE: ' +
            disc +
            '% off the ' +
            title +
            ' ends at midnight. ' +
            reviews +
            '+ people already grabbed theirs. ' +
            rating +
            "/5 stars. Free shipping + 30-day guarantee. This is the lowest price we've offered."
        );
        lines.push('### Headline: LAST CHANCE \u2014 ' + disc + '% Off Ends Tonight');
        lines.push('### CTA: Buy Now');
        lines.push('### Budget: 20% of total');
        lines.push('');
        lines.push('## STAGE 5: RETENTION (Day 20-30)');
        lines.push('### Goal: Repeat purchase, referrals');
        lines.push('### Audience: Existing customers');
        lines.push(
          '### Message: Thanks for your order! Love your ' +
            title +
            '? Share with a friend and get 15% off your next order. Leave a review and get a free gift!'
        );
        lines.push('### Budget: 10% of total');
        lines.push('');
        lines.push('## TOTAL: Budget split 25/25/20/20/10 across stages');
        lines.push('## EXPECTED: 1.5% CTR cold \u2192 3% warm \u2192 5% hot \u2192 8% conversion');
        return lines.join('\n');
      },

      storyboard: function (product, duration) {
        const kw = product.keywords[0] || product.category;
        const title = product.title.split('\u2014')[0].trim();
        const rating = product.rating;
        const reviews = product.reviews;
        const price = product.price;
        const dur = parseInt(duration) || 30;
        const lines = [];
        lines.push('## STORYBOARD OVERVIEW');
        lines.push('- Duration: ' + dur + 's');
        lines.push('- Style: UGC / Authentic');
        lines.push('- Mood: Energetic, genuine excitement');
        lines.push('- Music: Upbeat lo-fi, 100-120 BPM');
        lines.push('- Color Palette: Warm tones, natural lighting');
        lines.push('');
        lines.push('## SCENE BREAKDOWN');
        lines.push('');
        lines.push('### Scene 1 (0-3s) \u2014 THE HOOK');
        lines.push(
          "- Visual: Close-up of person's face, surprised expression. Handheld, slightly shaky for authenticity"
        );
        lines.push('- Text Overlay: "Is it worth the hype?" \u2014 Bold white, center screen');
        lines.push('- Audio: "Okay so this ' + kw + ' just arrived..." (excited tone)');
        lines.push('- Transition: Hard cut');
        lines.push('- Duration: 3s');
        lines.push('- Emotion: Curiosity, anticipation');
        lines.push('');
        lines.push('### Scene 2 (3-6s) \u2014 THE UNBOXING');
        lines.push('- Visual: Hands opening package. Close-up of product being revealed');
        lines.push('- Text Overlay: "' + title + '" \u2014 Clean font, bottom third');
        lines.push('- Audio: "Let me open this... oh wow" (genuine reaction)');
        lines.push('- Transition: Smooth zoom in');
        lines.push('- Duration: 3s');
        lines.push('- Emotion: Excitement, discovery');
        lines.push('');
        lines.push('### Scene 3 (6-12s) \u2014 THE SHOWCASE');
        lines.push('- Visual: Multiple angles of product. In-use shots. Close-up details');
        lines.push('- Text Overlay: "$' + price + ' \u2014 Link in bio" \u2014 Animated, eye-catching');
        lines.push('- Audio: "This feels amazing. Look at this quality..." (genuine)');
        lines.push('- Transition: Quick cuts between angles');
        lines.push('- Duration: 6s');
        lines.push('- Emotion: Desire, impressed');
        lines.push('');
        lines.push('### Scene 4 (12-18s) \u2014 THE PROOF');
        lines.push('- Visual: Phone screen showing reviews. Star rating close-up');
        lines.push('- Text Overlay: "' + rating + '/5 \u2B50 ' + reviews + '+ reviews" \u2014 Gold stars animation');
        lines.push('- Audio: "And it has ' + rating + ' stars from thousands of reviews"');
        lines.push('- Transition: Wipe transition');
        lines.push('- Duration: 6s');
        lines.push('- Emotion: Trust, validation');
        lines.push('');
        lines.push('### Scene 5 (18-25s) \u2014 THE CTA');
        lines.push('- Visual: Product beauty shot + pointing upward gesture');
        lines.push('- Text Overlay: "LINK IN BIO \uD83D\uDD17 Limited Stock" \u2014 Urgent, bold');
        lines.push('- Audio: "Link in bio if you want to grab one \u2014 but don\'t wait, these sell out fast"');
        lines.push('- Transition: Fade to product');
        lines.push('- Duration: 7s');
        lines.push('- Emotion: Urgency, FOMO');
        lines.push('');
        lines.push('## PRODUCTION NOTES');
        lines.push('- Film in natural lighting (golden hour preferred)');
        lines.push('- Use handheld camera for authentic feel');
        lines.push('- Keep audio clear but not studio-quality (authenticity)');
        lines.push('- Text animations: pop-in with slight bounce');
        lines.push('');
        lines.push('## PLATFORM ADAPTATIONS');
        lines.push('- 15s version: Scenes 1, 3, 5 only (hook + showcase + CTA)');
        lines.push('- 60s version: Add testimonials scene + lifestyle shots');
        lines.push('- Vertical (9:16): Center all text in safe zone, top 15% clear');
        return lines.join('\n');
      },

      dynamicVars: function (product, count) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const rating = product.rating;
        const disc = product.discount || 30;
        const lines = [];
        lines.push('## DYNAMIC CREATIVE VARIABLES \u2014 ' + (count || 10) + ' SETS');
        lines.push('');
        lines.push('## HEADLINES (10)');
        lines.push('1. ' + title + ' \u2014 ' + disc + '% Off Today');
        lines.push('2. ' + reviews + '+ People Love This ' + kw);
        lines.push('3. Rated ' + rating + '/5 \u2014 See Why');
        lines.push('4. Stop Overpaying for ' + kw);
        lines.push('5. The ' + kw + ' That Actually Works');
        lines.push('6. Limited Time: ' + disc + '% OFF');
        lines.push('7. Free Shipping + 30-Day Guarantee');
        lines.push('8. #1 Rated ' + kw + ' of 2026');
        lines.push('9. ' + reviews + '+ 5-Star Reviews');
        lines.push('10. Your ' + kw + ' Upgrade Starts Here');
        lines.push('');
        lines.push('## PRIMARY TEXTS (10)');
        lines.push(
          '1. Stop scrolling. ' +
            reviews +
            '+ people switched to the ' +
            title +
            '. Rated ' +
            rating +
            '/5. ' +
            disc +
            '% off today only. Free shipping + 30-day guarantee. Link in bio \u2192'
        );
        lines.push(
          '2. Still wasting money on ' +
            kw +
            " that doesn't deliver? The " +
            title +
            ' is rated ' +
            rating +
            '/5 by real customers. ' +
            disc +
            '% off this week. Try it risk-free.'
        );
        lines.push(
          '3. \uD83D\uDD25 This ' +
            kw +
            ' just sold out twice. ' +
            reviews +
            "+ customers can't be wrong. " +
            rating +
            '/5 stars. ' +
            disc +
            "% off + free shipping. Don't miss this."
        );
        lines.push(
          '4. I was skeptical at first, but the ' +
            title +
            ' literally changed my routine. ' +
            rating +
            '/5 from ' +
            reviews +
            '+ reviews. ' +
            disc +
            '% off right now. Link in bio.'
        );
        lines.push(
          '5. Premium ' +
            kw +
            ' quality at a fraction of the price. ' +
            title +
            ' \u2014 rated ' +
            rating +
            '/5. ' +
            reviews +
            '+ happy customers. Free shipping + guarantee.'
        );
        lines.push(
          '6. \u23F0 FLASH SALE: ' +
            disc +
            '% OFF the ' +
            title +
            ' for the next 24 hours. ' +
            rating +
            "/5 stars. Free shipping. This won't come around again."
        );
        lines.push(
          '7. Compare: Brand ' +
            kw +
            ': $80+. ' +
            title +
            ': Same quality, fraction of the price. ' +
            reviews +
            '+ customers already made the switch. ' +
            disc +
            '% off.'
        );
        lines.push(
          '8. The ' +
            kw +
            " everyone's been asking about \uD83E\uDD29 " +
            title +
            ' is rated ' +
            rating +
            '/5. ' +
            disc +
            '% off + 30-day guarantee. Link in bio.'
        );
        lines.push(
          '9. We tested 20+ ' +
            kw +
            ' brands. The ' +
            title +
            ' won by a landslide. ' +
            rating +
            '/5 from ' +
            reviews +
            ' real reviews. No gimmicks.'
        );
        lines.push(
          "10. There's a " +
            kw +
            ' that ' +
            reviews +
            '+ people are ordering every day. The ' +
            title +
            '. Get it before everyone else does \u2192'
        );
        lines.push('');
        lines.push('## DESCRIPTIONS (5)');
        lines.push('1. ' + disc + '% Off + Free Shipping');
        lines.push('2. ' + rating + '/5 Stars \u2014 See Why');
        lines.push('3. ' + reviews + '+ Happy Customers');
        lines.push('4. 30-Day Money-Back Guarantee');
        lines.push('5. Premium Quality, Best Price');
        lines.push('');
        lines.push('## CTAs (5)');
        lines.push('1. Shop Now');
        lines.push('2. Learn More');
        lines.push('3. Get Yours');
        lines.push('4. See Details');
        lines.push('5. Buy Now');
        lines.push('');
        lines.push('## COMBINATION PREVIEW');
        lines.push('Combo 1: Headline 1 + Text 1 + CTA 1 (Social proof + urgency)');
        lines.push('Combo 2: Headline 3 + Text 3 + CTA 3 (Scarcity + FOMO)');
        lines.push('Combo 3: Headline 5 + Text 5 + CTA 2 (Value-focused)');
        lines.push('Combo 4: Headline 2 + Text 4 + CTA 5 (Testimonial)');
        lines.push('Combo 5: Headline 8 + Text 8 + CTA 4 (Curiosity)');
        return lines.join('\n');
      },

      adSequence: function (product) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const rating = product.rating;
        const disc = product.discount || 30;
        const lines = [];
        lines.push('## AD 1: THE HOOK (Cold Traffic)');
        lines.push('### Purpose: Pattern interrupt + curiosity');
        lines.push('### Headline: The ' + kw + ' That ' + reviews + '+ People Switched To');
        lines.push(
          '### Primary Text: Stop wasting money on ' +
            kw +
            " that doesn't deliver. The " +
            title +
            ' is rated ' +
            rating +
            '/5 by ' +
            reviews +
            '+ verified buyers. ' +
            disc +
            '% off for early adopters. See what the hype is about \u2192'
        );
        lines.push(
          '### TikTok Script: "POV: You found the ' +
            kw +
            ' everyone\'s been asking about..." [Unbox, react, show key feature, price reveal, CTA]'
        );
        lines.push('### Visual: UGC unboxing, genuine reaction');
        lines.push('### CTA: Learn More');
        lines.push('### Key Message: Introduces the product as a trending solution');
        lines.push('');
        lines.push('## AD 2: THE PROOF (Warm Traffic)');
        lines.push('### Purpose: Validate the promise with evidence');
        lines.push('### Headline: See Why ' + reviews + '+ People Gave It ' + rating + '/5 Stars');
        lines.push(
          '### Primary Text: Still thinking about the ' +
            title +
            "? Here's what " +
            reviews +
            '+ customers say: "Best ' +
            kw +
            ' I\'ve ever owned." Premium quality. Free shipping. 30-day guarantee. ' +
            disc +
            '% off. Join them \u2192'
        );
        lines.push(
          '### TikTok Script: "I was skeptical too, but look at these reviews..." [Show reviews on phone, product in use, feature highlights]'
        );
        lines.push('### Visual: Reviews overlay, product lifestyle shots');
        lines.push('### CTA: Shop Now');
        lines.push('### Key Message: Adds social proof and validation to the initial hook');
        lines.push('');
        lines.push('## AD 3: THE CLOSE (Hot Traffic)');
        lines.push('### Purpose: Convert with urgency + best offer');
        lines.push('### Headline: LAST CHANCE \u2014 ' + disc + '% Off Ends Tonight');
        lines.push(
          '### Primary Text: \u23F0 FINAL HOURS: The ' +
            title +
            ' deal expires at midnight. ' +
            disc +
            '% off + free shipping. ' +
            rating +
            '/5 from ' +
            reviews +
            '+ reviews. 30-day guarantee. After tonight, full price. No exceptions. Grab yours \u2192'
        );
        lines.push(
          '### TikTok Script: "FINAL HOURS. The ' +
            kw +
            ' deal expires at midnight..." [Show countdown, price comparison, limited stock, urgent CTA]'
        );
        lines.push('### Visual: Countdown timer, bold text, urgency overlays');
        lines.push('### CTA: Buy Now');
        lines.push('### Key Message: Closes the loop with strongest offer and urgency');
        lines.push('');
        lines.push('## SEQUENCE STRATEGY');
        lines.push('- Targeting: Move users who engaged with Ad 1 to Ad 2 audience, Ad 1+2 engagers to Ad 3');
        lines.push('- Time gaps: 2-3 days between each ad');
        lines.push('- Budget: 30% / 30% / 40% (heavier on conversion)');
        lines.push('- Success: Ad 1 = CTR >1.5%, Ad 2 = Engagement >3%, Ad 3 = ROAS >2x');
        return lines.join('\n');
      },

      videoAd: function (product, duration, style) {
        const title = product.title.split('\u2014')[0].trim();
        const kw = product.keywords[0] || product.category;
        const reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        const rating = product.rating;
        const price = product.price;
        const disc = product.discount || 30;
        const dur = parseInt(duration) || 30;
        const vidStyle = style || 'UGC';
        const lines = [];
        lines.push('## VIDEO OVERVIEW');
        lines.push('- Duration: ' + dur + 's');
        lines.push('- Style: ' + vidStyle);
        lines.push('- Platform: TikTok / IG Reels (9:16 vertical)');
        lines.push('- Music: Upbeat lo-fi, 110 BPM, building energy');
        lines.push('- Color Palette: Warm whites, soft shadows, product accent color');
        lines.push('');
        lines.push('## VOICEOVER / DIALOGUE SCRIPT');
        lines.push('[0-3s] "Okay so this ' + kw + ' just arrived and I\'m literally shaking..."');
        lines.push('[3-6s] "Let me open this... oh wow, the packaging is actually premium"');
        lines.push(
          '[6-12s] "Okay first impression \u2014 this feels amazing. Look at this quality... and it\'s only $' +
            price +
            '?! ' +
            disc +
            '% off right now"'
        );
        lines.push('[12-18s] "And it has ' + rating + ' stars from ' + reviews + '+ reviews. That\'s insane"');
        lines.push(
          '[18-24s] "Link in bio if you want to grab one \u2014 but honestly don\'t wait, these sell out fast"'
        );
        lines.push('[24-' + dur + 's] " seriously though, get it before it\'s gone"');
        lines.push('');
        lines.push('## SCENE BREAKDOWN');
        lines.push('');
        lines.push('### Scene 1 (0-3s) \u2014 HOOK');
        lines.push("- Visual: Close-up of person's face, excited expression, package visible in background");
        lines.push('- Text Overlay: "Is it worth the hype?" (bold white, center)');
        lines.push('- Camera: Handheld close-up, slight shake');
        lines.push('- Transition: Hard cut');
        lines.push('- Duration: 3s');
        lines.push('');
        lines.push('### Scene 2 (3-6s) \u2014 UNBOXING');
        lines.push('- Visual: Hands opening package, product reveal moment');
        lines.push('- Text Overlay: "' + title + '" (clean font, bottom third)');
        lines.push('- Camera: Top-down close-up of hands');
        lines.push('- Transition: Smooth zoom in');
        lines.push('- Duration: 3s');
        lines.push('');
        lines.push('### Scene 3 (6-12s) \u2014 SHOWCASE');
        lines.push('- Visual: Product in use, multiple angles, detail shots');
        lines.push('- Text Overlay: "$' + price + ' \u2014 Link in bio" (animated, eye-catching)');
        lines.push('- Camera: Dynamic angles, macro shots of details');
        lines.push('- Transition: Quick cuts');
        lines.push('- Duration: 6s');
        lines.push('');
        lines.push('### Scene 4 (12-18s) \u2014 SOCIAL PROOF');
        lines.push('- Visual: Phone screen showing ' + rating + '/5 stars, review count');
        lines.push('- Text Overlay: "' + rating + '/5 \u2B50 ' + reviews + '+ reviews" (gold animation)');
        lines.push('- Camera: Over-shoulder shot of phone');
        lines.push('- Transition: Wipe');
        lines.push('- Duration: 6s');
        lines.push('');
        lines.push('### Scene 5 (18-' + dur + 's) \u2014 CTA');
        lines.push('- Visual: Product beauty shot, person pointing up');
        lines.push('- Text Overlay: "LINK IN BIO \uD83D\uDD17 Limited Stock" (bold, urgent)');
        lines.push('- Camera: Pull-back wide shot');
        lines.push('- Transition: Fade to product');
        lines.push('- Duration: ' + (dur - 18) + 's');
        lines.push('');
        lines.push('## AI IMAGE PROMPTS (per scene)');
        lines.push(
          'Scene 1: "Excited person unboxing package, warm lighting, close-up portrait, authentic reaction, lifestyle photography"'
        );
        lines.push(
          'Scene 2: "Hands opening premium product packaging, top-down shot, clean background, unboxing moment"'
        );
        lines.push(
          'Scene 3: "Product lifestyle shot, multiple angles, soft natural lighting, premium feel, 4K detail"'
        );
        lines.push('Scene 4: "Phone screen showing 5-star reviews, product rating display, social proof, clean UI"');
        lines.push('Scene 5: "Product hero shot, dramatic lighting, premium feel, call to action overlay"');
        lines.push('');
        lines.push('## AI VIDEO PROMPTS (for Runway/Pika/Luma)');
        lines.push(
          'Scene 1: "Person excitedly opening a package, close-up reaction shot, warm lighting, authentic UGC style, vertical 9:16"'
        );
        lines.push(
          'Scene 2: "Smooth unboxing sequence, hands revealing premium product, top-down angle, satisfying reveal"'
        );
        lines.push(
          'Scene 3: "Product showcase montage, multiple angles, detail close-ups, lifestyle context, dynamic movement"'
        );
        lines.push('Scene 4: "Phone screen zoom showing 5-star rating and reviews, social proof moment"');
        lines.push('Scene 5: "Product beauty shot with dramatic lighting, pull-back reveal, call to action moment"');
        lines.push('');
        lines.push('## PRODUCTION NOTES');
        lines.push('- Film in natural lighting (golden hour preferred)');
        lines.push('- Handheld camera for authenticity');
        lines.push('- Audio: voiceover + lo-fi background beat');
        lines.push('- Text animations: pop-in with bounce, center screen');
        lines.push('- Export: 1080x1920 (9:16), MP4, H.264');
        return lines.join('\n');
      },
    };

    // ============================================================================
    // TAB DEFINITIONS
    // ============================================================================
    const TAB_CATEGORIES = [
      {
        id: 'copywriting',
        label: '\uD83D\uDCDD Copywriting',
        open: true,
        tabs: [
          { id: 'copy', label: '\uD83E\uDDE0 Ad Copy' },
          { id: 'platforms', label: '\uD83C\uDFAF Multi-Platform' },
          { id: 'transformer', label: '\uD83D\uDD04 Copy Transformer' },
          { id: 'variations', label: '\uD83E\uDDEA Variations' },
        ],
      },
      {
        id: 'analysis',
        label: '\uD83D\uDD0D Analysis & Scoring',
        tabs: [
          { id: 'hooks', label: '\uD83D\uDD25 Hooks' },
          { id: 'hookAnalyzer', label: '\uD83D\uDD0D Hook Score' },
          { id: 'score', label: '\u2B50 Ad Score' },
          { id: 'compliance', label: '\u2705 Compliance' },
        ],
      },
      {
        id: 'creative',
        label: '\uD83C\uDFA8 Creative & Video',
        tabs: [
          { id: 'ugc', label: '\uD83C\uDFAC UGC Scripts' },
          { id: 'videoAd', label: '\uD83C\uDFA5 Video Ad Creator' },
          { id: 'storyboard', label: '\uD83C\uDFAC Storyboard' },
          { id: 'continuity', label: '\uD83D\uDD17 Ad Sequence' },
        ],
      },
      {
        id: 'campaigns',
        label: '\uD83D\uDCCA Campaigns & Testing',
        tabs: [
          { id: 'abtest', label: '\uD83D\uDCCA A/B Tests' },
          { id: 'retarget', label: '\uD83D\uDD04 Retargeting' },
          { id: 'fatigue', label: '\uD83D\uDCA1 Fatigue' },
          { id: 'dynamicVars', label: '\uD83D\uDD35 Dynamic Vars' },
        ],
      },
      {
        id: 'intelligence',
        label: '\uD83D\uDCCB Intelligence & Planning',
        tabs: [
          { id: 'swipe', label: '\uD83C\uDFC6 Swipe Library' },
          { id: 'roas', label: '\uD83D\uDCC8 ROAS' },
          { id: 'audience', label: '\uD83C\uDFAF Audience' },
          { id: 'briefs', label: '\uD83D\uDCF1 Creative Briefs' },
          { id: 'seasonal', label: '\u23F0 Seasonal' },
          { id: 'lp', label: '\uD83D\uDCCB LP Matcher' },
        ],
      },
    ];

    const TABS = [];
    TAB_CATEGORIES.forEach(function (cat) {
      cat.tabs.forEach(function (t) {
        TABS.push(t);
      });
    });

    const FRAMEWORKS = ['PAS', 'AIDA', 'Before/After Bridge', "4U's", 'Star-Story-Solution'];
    const UGC_TYPES = ['Unboxing', 'Testimonial', 'Day-in-my-life'];
    const AD_TYPES = ['Feed', 'Story', 'Reels/TikTok', 'Carousel', 'Video'];
    const EVENTS = [
      'Black Friday',
      'Cyber Monday',
      'Back to School',
      "Valentine's Day",
      'Christmas',
      'New Year',
      'Summer Sale',
      'Prime Day',
      "Mother's Day",
      "Father's Day",
    ];

    // ============================================================================
    // MAIN PLUGIN
    // ============================================================================
    let _adsSelf = null;
    const AdStudioPlugin = {
      id: 'ad-studio',
      name: 'Ad Creative Studio',
      version: '2.0.0',
      description: 'AI-powered ad creative suite with 15 tools',
      section: null,
      activeTab: 'copy',
      currentProduct: null,
      _cleanups: [],

      init: function (_ctx) {
        _adsSelf = AdStudioPlugin;
      },

      mount: function (_ctx) {
        _adsSelf = AdStudioPlugin;
        try {
          const container = UI.$('sections-container');
          if (!container) return;
          const section = document.createElement('section');
          section.className = 'section section-ad-studio';
          section.id = 'section-ad-studio';
          section.innerHTML = AdStudioPlugin.renderHTML();
          container.appendChild(section);
          AdStudioPlugin.section = section;
          AdStudioPlugin.bindEvents();
          AdStudioPlugin.updateAIStatus();
          AdStudioPlugin.selectDefaultProduct();
        } catch (e) {
          console.error('[AdStudio] mount error:', e);
        }
      },

      unmount: function (_ctx) {
        try {
          (AdStudioPlugin._cleanups || []).forEach(function (fn) {
            try {
              fn();
            } catch {
              /* ignored */
            }
          });
          AdStudioPlugin._cleanups = [];
          if (AdStudioPlugin.section) {
            AdStudioPlugin.section.remove();
            AdStudioPlugin.section = null;
          }
        } catch {
          /* ignored */
        }
      },

      renderHTML: function () {
        const products = window.HuntDrop.ALL_PRODUCTS || [];
        let opts = '<option value="">Select a product...</option>';
        products.forEach(function (p) {
          opts +=
            '<option value="' +
            esc(p.id) +
            '">' +
            esc(p.title.split('\u2014')[0].trim()) +
            ' ($' +
            esc(p.price) +
            ')</option>';
        });
        let tabsHtml = '';
        TAB_CATEGORIES.forEach(function (cat) {
          tabsHtml += '<div class="ads-cat' + (cat.open ? ' open' : '') + '" data-cat="' + cat.id + '">';
          tabsHtml +=
            '<div class="ads-cat-header"><span class="ads-cat-chevron">\u25B6</span><span class="ads-cat-label">' +
            cat.label +
            '</span><span class="ads-cat-count">' +
            cat.tabs.length +
            '</span></div>';
          tabsHtml += '<div class="ads-cat-items">';
          cat.tabs.forEach(function (t) {
            tabsHtml += '<button class="ads-tab" data-tab="' + t.id + '">' + t.label + '</button>';
          });
          tabsHtml += '</div></div>';
        });

        return (
          '<div class="section-inner">' +
          '<div class="ads-hero"><div class="ads-hero-content">' +
          '<div class="ads-hero-badge"><span class="dot"></span> Ad Creative Studio v3.0</div>' +
          '<h1 class="ads-hero-title">AI-Powered <span class="highlight">Ad Creatives</span></h1>' +
          '<p class="ads-hero-desc">22 AI tools: ad copy, hooks, scoring, storyboards, video ads, retargeting, and more. The only ad creative suite you need.</p>' +
          '</div><div class="ads-hero-stats">' +
          '<div class="ads-stat"><div class="ads-stat-num">22</div><div class="ads-stat-label">AI Tools</div></div>' +
          '<div class="ads-stat"><div class="ads-stat-num">5</div><div class="ads-stat-label">Platforms</div></div>' +
          '<div class="ads-stat"><div class="ads-stat-num">5</div><div class="ads-stat-label">Frameworks</div></div>' +
          '</div></div>' +
          '<div class="ads-ai-status" id="adsAIStatus"></div>' +
          '<div class="ads-product-bar"><div class="ads-product-select-wrap">' +
          '<span class="ads-product-icon">\uD83D\uDCE6</span>' +
          '<select id="adsProductSelect" class="ads-product-select">' +
          opts +
          '</select>' +
          '</div><div class="ads-product-info" id="adsProductInfo"></div></div>' +
          '<div class="ads-tabs" id="adsTabs">' +
          tabsHtml +
          '</div>' +
          '<div class="ads-input-area" id="adsInputArea"></div>' +
          '<div class="ads-loading" id="adsLoading" style="display:none"><div class="ads-loading-spinner"></div><div class="ads-loading-text">Generating with AI...</div></div>' +
          '<div class="ads-results" id="adsResults"></div>' +
          '</div>'
        );
      },

      renderInputArea: function (tabId) {
        let h = '<div class="ads-input-card">';
        const btn = function (action, label) {
          return (
            '<button class="ads-generate-btn" data-action="' +
            action +
            '"><span class="ai-sparkle">\u2728</span> ' +
            label +
            '</button>'
          );
        };
        switch (tabId) {
          case 'copy':
            h +=
              '<h3>\uD83E\uDDE0 AI Ad Copy Generator</h3><p class="ads-input-desc">Generate platform-specific ad copy using proven direct-response frameworks</p>';
            h += '<div class="ads-input-row"><select id="adsFramework" class="ads-select">';
            FRAMEWORKS.forEach(function (f) {
              h += '<option value="' + f + '">' + f + '</option>';
            });
            h += '</select>' + btn('generateCopy', 'Generate Ad Copy') + '</div>';
            break;
          case 'platforms':
            h +=
              '<h3>\uD83C\uDFAF Multi-Platform Ad Generator</h3><p class="ads-input-desc">Generate platform-native ad sets for Facebook, TikTok, Instagram, YouTube, and Pinterest</p>';
            h += '<div class="ads-input-row">' + btn('generatePlatforms', 'Generate All Platforms') + '</div>';
            break;
          case 'hooks':
            h +=
              '<h3>\uD83D\uDD25 Winning Hook Generator</h3><p class="ads-input-desc">Generate 15 attention-grabbing hooks for the first 1-3 seconds</p>';
            h += '<div class="ads-input-row">' + btn('generateHooks', 'Generate Hooks') + '</div>';
            break;
          case 'compliance':
            h +=
              '<h3>\u2705 Ad Compliance Checker</h3><p class="ads-input-desc">Check ad copy against Facebook, TikTok, and Instagram policies</p>';
            h +=
              '<div class="ads-input-row"><textarea id="adsComplianceInput" class="ads-textarea" placeholder="Paste your ad copy here..." rows="5"></textarea></div>';
            h += '<div class="ads-input-row">' + btn('checkCompliance', 'Check Compliance') + '</div>';
            break;
          case 'variations':
            h +=
              '<h3>\uD83E\uDDEA Ad Copy Variation Matrix</h3><p class="ads-input-desc">Generate unique ad variations across emotional angles, tones, and lengths</p>';
            h +=
              '<div class="ads-input-row"><label class="ads-label">Count:</label><select id="adsVariationCount" class="ads-select"><option value="5">5</option><option value="10" selected>10</option><option value="15">15</option><option value="20">20</option></select>';
            h += btn('generateVariations', 'Generate Variations') + '</div>';
            break;
          case 'ugc':
            h +=
              '<h3>\uD83C\uDFAC UGC Script Generator</h3><p class="ads-input-desc">Generate complete UGC-style video scripts with dialogue and production notes</p>';
            h += '<div class="ads-input-row"><select id="adsUGCType" class="ads-select">';
            UGC_TYPES.forEach(function (t) {
              h += '<option value="' + t + '">' + t + '</option>';
            });
            h += '</select>' + btn('generateUGC', 'Generate Script') + '</div>';
            break;
          case 'abtest':
            h +=
              '<h3>\uD83D\uDCCA A/B Test Plan Generator</h3><p class="ads-input-desc">Create a structured 4-week testing plan with budget allocation</p>';
            h += '<div class="ads-input-row">' + btn('generateABTest', 'Generate Test Plan') + '</div>';
            break;
          case 'retarget':
            h +=
              '<h3>\uD83D\uDD04 Retargeting Sequence Builder</h3><p class="ads-input-desc">Generate a complete 4-stage retargeting funnel</p>';
            h += '<div class="ads-input-row">' + btn('generateRetarget', 'Generate Sequence') + '</div>';
            break;
          case 'fatigue':
            h +=
              '<h3>\uD83D\uDCA1 Creative Fatigue Detector</h3><p class="ads-input-desc">Analyze fatigue risk and get 5 fresh creative variations</p>';
            h += '<div class="ads-input-row">' + btn('generateFatigue', 'Analyze & Refresh') + '</div>';
            break;
          case 'swipe':
            h +=
              '<h3>\uD83C\uDFC6 Competitor Ad Swipe Library</h3><p class="ads-input-desc">Discover winning ad patterns, hooks, and copy angles for your niche</p>';
            h += '<div class="ads-input-row">' + btn('generateSwipe', 'Build Swipe Library') + '</div>';
            break;
          case 'roas':
            h +=
              '<h3>\uD83D\uDCC8 ROAS Prediction & Ad Spend Simulator</h3><p class="ads-input-desc">Calculate break-even CPA, predict ROAS, and model ad spend scenarios</p>';
            h +=
              '<div class="ads-input-row"><label class="ads-label">Daily Budget ($):</label><input type="number" id="adsBudget" class="ads-input-num" value="20" min="5" max="10000">';
            h += btn('generateROAS', 'Calculate ROAS') + '</div>';
            break;
          case 'audience':
            h +=
              '<h3>\uD83C\uDFAF Audience-Ad Match Optimizer</h3><p class="ads-input-desc">Generate different ad copy for Gen Z, Millennials, and Gen X</p>';
            h += '<div class="ads-input-row">' + btn('generateAudience', 'Generate Per Audience') + '</div>';
            break;
          case 'briefs':
            h +=
              '<h3>\uD83D\uDCF1 Creative Brief Generator</h3><p class="ads-input-desc">Generate visual direction, shot lists, and AI image prompts</p>';
            h += '<div class="ads-input-row"><select id="adsAdType" class="ads-select">';
            AD_TYPES.forEach(function (t) {
              h += '<option value="' + t + '">' + t + '</option>';
            });
            h += '</select>' + btn('generateBrief', 'Generate Brief') + '</div>';
            break;
          case 'seasonal':
            h +=
              '<h3>\u23F0 Seasonal Ad Templates</h3><p class="ads-input-desc">Generate event-specific ad campaigns with urgency tactics</p>';
            h += '<div class="ads-input-row"><select id="adsEvent" class="ads-select">';
            EVENTS.forEach(function (e) {
              h += '<option value="' + e + '">' + e + '</option>';
            });
            h += '</select>' + btn('generateSeasonal', 'Generate Campaign') + '</div>';
            break;
          case 'lp':
            h +=
              '<h3>\uD83D\uDCCB Landing Page Copy Matcher</h3><p class="ads-input-desc">Generate landing page copy that matches your ad</p>';
            h +=
              '<div class="ads-input-row"><textarea id="adsLPInput" class="ads-textarea" placeholder="Paste your ad copy to match (or leave empty)..." rows="4"></textarea></div>';
            h += '<div class="ads-input-row">' + btn('generateLP', 'Generate LP Copy') + '</div>';
            break;
          case 'hookAnalyzer':
            h +=
              '<h3>\uD83D\uDD0D Hook Analyzer</h3><p class="ads-input-desc">Paste any hook and get a deep effectiveness breakdown with improvement suggestions</p>';
            h +=
              '<div class="ads-input-row"><textarea id="adsHookInput" class="ads-textarea" placeholder="Paste a hook to analyze... e.g. &quot;POV: You found the product everyone&apos;s been asking about&quot;" rows="3"></textarea></div>';
            h += '<div class="ads-input-row">' + btn('analyzeHook', 'Analyze Hook') + '</div>';
            break;
          case 'score':
            h +=
              '<h3>\u2B50 Ad Score Predictor</h3><p class="ads-input-desc">Paste ad copy and get an AI-powered effectiveness score with breakdown and fixes</p>';
            h +=
              '<div class="ads-input-row"><textarea id="adsScoreInput" class="ads-textarea" placeholder="Paste your ad copy to score..." rows="5"></textarea></div>';
            h += '<div class="ads-input-row">' + btn('scoreAd', 'Score Ad Copy') + '</div>';
            break;
          case 'transformer':
            h +=
              '<h3>\uD83D\uDD04 Copy Transformer</h3><p class="ads-input-desc">Paste one ad and rewrite it in a different style instantly</p>';
            h +=
              '<div class="ads-input-row"><textarea id="adsTransformInput" class="ads-textarea" placeholder="Paste your ad copy to transform..." rows="4"></textarea></div>';
            h +=
              '<div class="ads-input-row"><label class="ads-label">Style:</label><select id="adsTransformStyle" class="ads-select">';
            [
              'Short-form',
              'Long-form',
              'Gen Z',
              'Professional',
              'Storytelling',
              'Urgency',
              'Luxury',
              'Minimalist',
            ].forEach(function (s) {
              h += '<option value="' + s + '">' + s + '</option>';
            });
            h += '</select>' + btn('transformCopy', 'Transform Copy') + '</div>';
            break;
          case 'continuity':
            h +=
              '<h3>\uD83D\uDD17 Ad-to-Ad Sequence</h3><p class="ads-input-desc">Generate a 5-stage full-funnel ad sequence from awareness to retention</p>';
            h += '<div class="ads-input-row">' + btn('generateContinuity', 'Generate Full Sequence') + '</div>';
            break;
          case 'storyboard':
            h +=
              '<h3>\uD83C\uDFAC Video Storyboard</h3><p class="ads-input-desc">Generate a scene-by-scene visual storyboard for your video ad</p>';
            h +=
              '<div class="ads-input-row"><label class="ads-label">Duration (sec):</label><select id="adsStoryboardDur" class="ads-select">';
            ['15', '30', '60', '90'].forEach(function (d) {
              h += '<option value="' + d + '"' + (d === '30' ? ' selected' : '') + '>' + d + 's</option>';
            });
            h += '</select>' + btn('generateStoryboard', 'Generate Storyboard') + '</div>';
            break;
          case 'dynamicVars':
            h +=
              '<h3>\uD83D\uDD35 Dynamic Creative Variables</h3><p class="ads-input-desc">Generate headline/text/CTA variable sets for Facebook/TikTok Dynamic Creative testing</p>';
            h +=
              '<div class="ads-input-row"><label class="ads-label">Variables:</label><select id="adsDynCount" class="ads-select">';
            ['5', '10', '15', '20'].forEach(function (c) {
              h += '<option value="' + c + '"' + (c === '10' ? ' selected' : '') + '>' + c + ' sets</option>';
            });
            h += '</select>' + btn('generateDynamic', 'Generate Variables') + '</div>';
            break;
          case 'videoAd':
            h +=
              '<h3>\uD83C\uDFA5 AI Video Ad Creator</h3><p class="ads-input-desc">Generate a complete video ad with AI script, scene breakdown, image prompts, and video prompts. Then compose it into an actual video.</p>';
            h +=
              '<div class="ads-input-row"><label class="ads-label">Duration:</label><select id="adsVideoDur" class="ads-select">';
            ['15', '30', '60', '90'].forEach(function (d) {
              h += '<option value="' + d + '"' + (d === '30' ? ' selected' : '') + '>' + d + 's</option>';
            });
            h += '</select><label class="ads-label">Style:</label><select id="adsVideoStyle" class="ads-select">';
            ['UGC', 'Cinematic', 'Motion Graphics', 'Minimalist', 'Luxury'].forEach(function (s) {
              h += '<option value="' + s + '">' + s + '</option>';
            });
            h += '</select></div>';
            h += '<div class="ads-input-row">' + btn('generateVideoAd', 'Generate Video Script') + '</div>';
            h += '<div class="ads-video-providers" id="adsVideoProviders">';
            var vStatus = window.HuntDrop.VideoAI ? window.HuntDrop.VideoAI.getStatus() : {};
            Object.keys(vStatus).forEach(function (pid) {
              var vp = vStatus[pid];
              var dotClass = vp.connected ? 'ais-fa-dot-live' : 'ais-fa-dot-off';
              h += '<div class="ads-vp-item" data-provider="' + pid + '">';
              h += '<span class="ads-vp-dot ' + dotClass + '" style="background:' + vp.color + '"></span>';
              h += '<span class="ads-vp-name">' + vp.name + '</span>';
              h += '<span class="ads-vp-tier">' + vp.tier.toUpperCase() + '</span>';
              if (!vp.connected) {
                h +=
                  '<button class="ads-vp-setup" data-ads-action="setupVideoProvider" data-provider="' +
                  pid +
                  '">Setup</button>';
              } else {
                h += '<span class="ads-vp-connected">\u2713 Ready</span>';
              }
              h += '</div>';
            });
            h += '</div>';
            h += '<div class="ads-video-composer" id="adsVideoComposer" style="display:none">';
            h += '<div class="ads-video-divider"></div>';
            h +=
              '<h3>\uD83C\uDFAC Video Compositor</h3><p class="ads-input-desc">Compose your script into an actual video with animated text, Ken Burns effects, and transitions</p>';
            h +=
              '<div class="ads-video-preview" id="adsVideoPreview"><canvas id="adsVideoCanvas" width="1080" height="1920"></canvas></div>';
            h += '<div class="ads-video-controls">';
            h +=
              '<button class="ads-action-btn" data-ads-action="previewVideo" title="Preview video">\u25B6 Preview</button>';
            h +=
              '<button class="ads-action-btn" data-ads-action="renderVideo" title="Render and export video">\uD83C\uDFA5 Render MP4</button>';
            h +=
              '<select id="adsVideoFormat" class="ads-select"><option value="9:16">9:16 Vertical</option><option value="16:9">16:9 Landscape</option><option value="1:1">1:1 Square</option></select>';
            h += '</div>';
            h += '<div class="ads-video-ai-gen" id="adsVideoAIGen">';
            h += '<div class="ads-video-divider"></div>';
            h +=
              '<h3>\u2728 AI Video Generation</h3><p class="ads-input-desc">Generate real video clips using AI video providers (Runway, Pika, Luma)</p>';
            h += '<div class="ads-ai-gen-grid" id="adsAIGenGrid"></div>';
            h += '<div class="ads-video-gen-status" id="adsVideoGenStatus"></div>';
            h += '</div>';
            h += '</div>';
            break;
        }
        h += '</div>';
        return h;
      },

      bindEvents: function () {
        const self = this;
        if (!this.section) return;
        this.section.querySelectorAll('.ads-tab').forEach(function (tab) {
          tab.addEventListener('click', function () {
            self.switchTab(tab.getAttribute('data-tab'));
          });
        });
        this.section.querySelectorAll('.ads-cat-header').forEach(function (header) {
          header.addEventListener('click', function () {
            var cat = header.closest('.ads-cat');
            if (cat) cat.classList.toggle('open');
          });
        });
        const ps = this.section.querySelector('#adsProductSelect');
        if (ps)
          ps.addEventListener('change', function () {
            self.updateProductInfo(ps.value);
          });
        const ia = this.section.querySelector('#adsInputArea');
        if (ia)
          ia.addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (btn) self.handleAction(btn.getAttribute('data-action'));
          });
        try {
          const unsub = EventBus.on('aikeys:changed', function () {
            self.updateAIStatus();
          });
          if (unsub) AdStudioPlugin._cleanups.push(unsub);
        } catch {
          /* ignored */
        }
      },

      switchTab: function (tabId) {
        this.activeTab = tabId;
        if (!this.section) return;
        this.section.querySelectorAll('.ads-tab').forEach(function (t) {
          t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
        });
        var activeTab = this.section.querySelector('.ads-tab[data-tab="' + tabId + '"]');
        if (activeTab) {
          var cat = activeTab.closest('.ads-cat');
          if (cat) cat.classList.add('open');
        }
        const ia = this.section.querySelector('#adsInputArea');
        if (ia) ia.innerHTML = this.renderInputArea(tabId);
        const r = this.section.querySelector('#adsResults');
        if (r) r.innerHTML = '';
      },

      selectDefaultProduct: function () {
        const products = window.HuntDrop.ALL_PRODUCTS || [];
        if (products.length > 0) {
          this.currentProduct = products[0];
          this.updateProductInfo(products[0].id);
        }
        this.switchTab('copy');
      },

      updateProductInfo: function (productId) {
        const products = window.HuntDrop.ALL_PRODUCTS || [];
        this.currentProduct =
          products.find(function (p) {
            return String(p.id) === String(productId);
          }) || null;
        const info = this.section ? this.section.querySelector('#adsProductInfo') : null;
        if (!info) return;
        if (!this.currentProduct) {
          info.innerHTML = '';
          return;
        }
        const p = this.currentProduct;
        info.innerHTML =
          '<span class="ads-pi-badge">Score: ' +
          p.score +
          '/100</span>' +
          '<span class="ads-pi-badge">Margin: ' +
          p.margin +
          '%</span>' +
          '<span class="ads-pi-badge">Rating: ' +
          p.rating +
          '\u2B50</span>' +
          '<span class="ads-pi-badge">' +
          p.reviews +
          ' reviews</span>';
      },

      updateAIStatus: function () {
        const el = this.section ? this.section.querySelector('#adsAIStatus') : null;
        if (!el) return;
        try {
          const status = window.HuntDrop.APIKeyManager ? window.HuntDrop.APIKeyManager.getStatus() : null;
          if (status && status.hasKey) {
            el.innerHTML =
              '<div class="ads-ai-connected"><span class="ads-ai-dot ads-ai-dot-green"></span>AI Connected: <strong>' +
              esc(status.providerName) +
              '</strong> \u00B7 ' +
              esc(status.model) +
              '</div>';
            el.className = 'ads-ai-status ads-ai-connected-wrap';
          } else {
            el.innerHTML =
              '<div class="ads-ai-disconnected"><span class="ads-ai-dot ads-ai-dot-yellow"></span>No AI key configured \u2014 using template mode. <a href="#" id="adsAISettingsLink">Add API key in Settings \u2192</a></div>';
            el.className = 'ads-ai-status ads-ai-disconnected-wrap';
            const link = el.querySelector('#adsAISettingsLink');
            if (link)
              link.addEventListener('click', function (e) {
                e.preventDefault();
                try {
                  EventBus.emit('navigate', { section: 'section-ai-settings' });
                } catch {
                  /* ignored */
                }
              });
          }
        } catch {
          el.innerHTML = '';
        }
      },

      handleAction: async function (action) {
        const product = this.currentProduct;
        if (!product && action !== 'checkCompliance' && action !== 'generateLP') {
          this.showResults('<div class="ads-error">\u26A0\uFE0F Please select a product first.</div>');
          return;
        }
        this.showLoading(true);
        this.showResults('');
        try {
          let result;
          let el;
          switch (action) {
            case 'generateCopy':
              result = await this.generateFeature('adCopy', product);
              this.showResults(this.renderMarkdown(result));
              break;
            case 'generatePlatforms':
              result = await this.generateFeature('multiPlatform', product);
              this.showResults(this.renderMarkdown(result));
              break;
            case 'generateHooks':
              result = await this.generateFeature('hooks', product);
              this.showResults(this.renderMarkdown(result));
              break;
            case 'checkCompliance': {
              el = this.section.querySelector('#adsComplianceInput');
              const copy = el ? el.value.trim() : '';
              if (!copy) {
                this.showResults('<div class="ads-error">\u26A0\uFE0F Please paste ad copy to check.</div>');
                break;
              }
              result = await this.generateFeature('compliance', null, copy);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'generateVariations': {
              el = this.section.querySelector('#adsVariationCount');
              const nv = el ? parseInt(el.value) || 10 : 10;
              result = await this.generateFeature('variations', product, null, nv);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'generateUGC': {
              el = this.section.querySelector('#adsUGCType');
              const ut = el ? el.value : 'Unboxing';
              result = await this.generateFeature('ugc', product, ut);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'generateABTest':
              result = await this.generateFeature('abTest', product);
              this.showResults(this.renderMarkdown(result));
              break;
            case 'generateRetarget':
              result = await this.generateFeature('retarget', product);
              this.showResults(this.renderMarkdown(result));
              break;
            case 'generateFatigue':
              result = await this.generateFeature('fatigue', product);
              this.showResults(this.renderMarkdown(result));
              break;
            case 'generateSwipe':
              result = await this.generateFeature('swipeLibrary', product);
              this.showResults(this.renderMarkdown(result));
              break;
            case 'generateROAS': {
              el = this.section.querySelector('#adsBudget');
              const b = el ? el.value : '20';
              result = await this.generateFeature('roas', product, b);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'generateAudience':
              result = await this.generateFeature('audienceMatch', product);
              this.showResults(this.renderMarkdown(result));
              break;
            case 'generateBrief': {
              el = this.section.querySelector('#adsAdType');
              const at = el ? el.value : 'Feed';
              result = await this.generateFeature('creativeBrief', product, at);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'generateSeasonal': {
              el = this.section.querySelector('#adsEvent');
              const ev = el ? el.value : 'Black Friday';
              result = await this.generateFeature('seasonal', product, ev);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'generateLP': {
              el = this.section.querySelector('#adsLPInput');
              const lp = el ? el.value.trim() : '';
              result = await this.generateFeature('lpMatcher', product, lp);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'analyzeHook': {
              el = this.section.querySelector('#adsHookInput');
              const hook = el ? el.value.trim() : '';
              if (!hook) {
                this.showResults('<div class="ads-error">\u26A0\uFE0F Please paste a hook to analyze.</div>');
                break;
              }
              result = await this.generateFeature('hookAnalyzer', product, hook);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'scoreAd': {
              el = this.section.querySelector('#adsScoreInput');
              const adCopy = el ? el.value.trim() : '';
              if (!adCopy) {
                this.showResults('<div class="ads-error">\u26A0\uFE0F Please paste ad copy to score.</div>');
                break;
              }
              result = await this.generateFeature('adScore', product, adCopy);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'transformCopy': {
              el = this.section.querySelector('#adsTransformInput');
              const origCopy = el ? el.value.trim() : '';
              if (!origCopy) {
                this.showResults('<div class="ads-error">\u26A0\uFE0F Please paste ad copy to transform.</div>');
                break;
              }
              el = this.section.querySelector('#adsTransformStyle');
              const style = el ? el.value : 'Short-form';
              result = await this.generateFeature('copyTransformer', product, origCopy, style);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'generateContinuity':
              result = await this.generateFeature('continuity', product);
              this.showResults(this.renderMarkdown(result));
              break;
            case 'generateStoryboard': {
              el = this.section.querySelector('#adsStoryboardDur');
              const dur = el ? el.value : '30';
              result = await this.generateFeature('storyboard', product, dur);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'generateDynamic': {
              el = this.section.querySelector('#adsDynCount');
              const dynCount = el ? parseInt(el.value) || 10 : 10;
              result = await this.generateFeature('dynamicVars', product, null, dynCount);
              this.showResults(this.renderMarkdown(result));
              break;
            }
            case 'generateVideoAd': {
              el = this.section.querySelector('#adsVideoDur');
              const vidDur = el ? el.value : '30';
              el = this.section.querySelector('#adsVideoStyle');
              const vidStyle = el ? el.value : 'UGC';
              result = await this.generateFeature('videoAd', product, vidDur, vidStyle);
              this.showResults(this.renderMarkdown(result));
              this._lastVideoScript = result;
              var comp = this.section.querySelector('#adsVideoComposer');
              if (comp) comp.style.display = 'block';
              this._initVideoComposer(product);
              break;
            }
            case 'previewVideo':
              this._previewVideo();
              break;
            case 'renderVideo':
              this._renderVideo();
              break;
            case 'setupVideoProvider': {
              var provId = btn ? btn.getAttribute('data-provider') : '';
              this._setupVideoProvider(provId);
              break;
            }
            case 'generateAIVideo': {
              var genBtn = btn;
              var sceneIdx = genBtn ? parseInt(genBtn.getAttribute('data-scene')) : 0;
              var prov = genBtn ? genBtn.getAttribute('data-provider') : '';
              this._generateAIVideo(prov, sceneIdx);
              break;
            }
          }
        } catch (e) {
          console.error('[AdStudio] Action error:', e);
          this.showResults('<div class="ads-error">\u274C Error: ' + esc(e.message) + '</div>');
        }
        this.showLoading(false);
      },

      generateFeature: async function (feature, product, extra, extraNum) {
        const pb = Prompts[feature];
        const fb = Fallback[feature];
        if (!pb) return 'Feature not available.';
        const sys =
          'You are an expert dropshipping ad copywriter. Generate detailed, actionable, platform-specific ad content with clear markdown headers.';
        let up;
        switch (feature) {
          case 'adCopy':
            up = pb(product, extra || 'PAS');
            break;
          case 'hooks':
            up = pb(product);
            break;
          case 'compliance':
            up = pb(extra || '');
            break;
          case 'variations':
            up = pb(product, extraNum || 10);
            break;
          case 'ugc':
            up = pb(product, extra || 'Unboxing');
            break;
          case 'abTest':
            up = pb(product);
            break;
          case 'retarget':
            up = pb(product);
            break;
          case 'fatigue':
            up = pb(product);
            break;
          case 'swipeLibrary':
            up = pb(product);
            break;
          case 'roas':
            up = pb(product, extra || '20');
            break;
          case 'audienceMatch':
            up = pb(product);
            break;
          case 'creativeBrief':
            up = pb(product, extra || 'Feed');
            break;
          case 'seasonal':
            up = pb(product, extra || 'Black Friday');
            break;
          case 'lpMatcher':
            up = pb(product, extra || '');
            break;
          case 'multiPlatform':
            up = pb(product);
            break;
          case 'hookAnalyzer':
            up = pb(product, extra || '');
            break;
          case 'adScore':
            up = pb(product, extra || '');
            break;
          case 'copyTransformer':
            up = pb(product, extra || '', extraNum || 'Short-form');
            break;
          case 'continuity':
            up = pb(product);
            break;
          case 'storyboard':
            up = pb(product, extra || '30');
            break;
          case 'dynamicVars':
            up = pb(product, extraNum || 10);
            break;
          case 'adSequence':
            up = pb(product);
            break;
          case 'videoAd':
            up = pb(product, extra || '30', extraNum || 'UGC');
            break;
          default:
            return 'Unknown feature.';
        }
        const ai = await AdAI.generate(sys, up, { maxTokens: 4000 });
        if (ai.ok && ai.text)
          return '<div class="ads-ai-badge">Generated by ' + esc(ai.provider) + '</div>\n\n' + ai.text;
        if (fb) {
          try {
            let ft;
            switch (feature) {
              case 'adCopy':
                ft = fb(product, extra || 'PAS');
                break;
              case 'hooks':
                ft = fb(product);
                break;
              case 'compliance':
                ft = fb(extra || '');
                break;
              case 'variations':
                ft = fb(product, extraNum || 10);
                break;
              case 'ugc':
                ft = fb(product, extra || 'Unboxing');
                break;
              case 'abTest':
                ft = fb(product);
                break;
              case 'retarget':
                ft = fb(product);
                break;
              case 'fatigue':
                ft = fb(product);
                break;
              case 'swipeLibrary':
                ft = fb(product);
                break;
              case 'roas':
                ft = fb(product, extra || '20');
                break;
              case 'audienceMatch':
                ft = fb(product);
                break;
              case 'creativeBrief':
                ft = fb(product, extra || 'Feed');
                break;
              case 'seasonal':
                ft = fb(product, extra || 'Black Friday');
                break;
              case 'lpMatcher':
                ft = fb(product, extra || '');
                break;
              case 'multiPlatform':
                ft = fb(product);
                break;
              case 'hookAnalyzer':
                ft = fb(product, extra || '');
                break;
              case 'adScore':
                ft = fb(product, extra || '');
                break;
              case 'copyTransformer':
                ft = fb(product, extra || '', extraNum || 'Short-form');
                break;
              case 'continuity':
                ft = fb(product);
                break;
              case 'storyboard':
                ft = fb(product, extra || '30');
                break;
              case 'dynamicVars':
                ft = fb(product, extraNum || 10);
                break;
              case 'adSequence':
                ft = fb(product);
                break;
              case 'videoAd':
                ft = fb(product, extra || '30', extraNum || 'UGC');
                break;
              default:
                ft = 'Feature not available.';
            }
            return (
              '<div class="ads-fallback-badge">Template mode \u2014 Add AI key in Settings for personalized generation</div>\n\n' +
              ft
            );
          } catch (e2) {
            return '<div class="ads-error">Fallback error: ' + esc(e2.message) + '</div>';
          }
        }
        return '<div class="ads-error">Unable to generate. Check your AI settings.</div>';
      },

      renderMarkdown: function (text) {
        if (!text) return '';
        try {
          let h = esc(text);
          h = h.replace(/^## (.+)$/gm, '<h3 class="ads-md-h2">$1</h3>');
          h = h.replace(/^### (.+)$/gm, '<h4 class="ads-md-h3">$1</h4>');
          h = h.replace(/^#### (.+)$/gm, '<h5 class="ads-md-h4">$1</h5>');
          h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
          h = h.replace(/^- (.+)$/gm, '<div class="ads-md-li">\u2022 $1</div>');
          h = h.replace(/\n\n/g, '<br><br>');
          h = h.replace(/\n/g, '<br>');
          return '<div class="ads-md">' + h + '</div>';
        } catch {
          return '<div class="ads-md"><pre>' + esc(text) + '</pre></div>';
        }
      },

      showLoading: function (show) {
        try {
          const el = this.section ? this.section.querySelector('#adsLoading') : null;
          if (el) el.style.display = show ? 'flex' : 'none';
        } catch {
          /* ignored */
        }
      },

      // =====================================================================
      // VIDEO COMPOSITOR ENGINE
      // =====================================================================
      _videoScenes: [],
      _videoCanvas: null,
      _videoCtx: null,
      _videoPlaying: false,

      _initVideoComposer: function (product) {
        var self = this;
        self._videoScenes = [];
        var canvas = self.section ? self.section.querySelector('#adsVideoCanvas') : null;
        if (!canvas) return;
        self._videoCanvas = canvas;
        self._videoCtx = canvas.getContext('2d');
        self._drawScene(0);
        var controls = self.section ? self.section.querySelector('.ads-video-controls') : null;
        if (controls) {
          controls.querySelectorAll('[data-ads-action]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var action = btn.getAttribute('data-ads-action');
              if (action === 'previewVideo') self._previewVideo();
              else if (action === 'renderVideo') self._renderVideo();
            });
          });
        }
        self._buildScenes(product);
        self._renderAIGenButtons();
      },

      _buildScenes: function (product) {
        var title = product.title.split('\u2014')[0].trim();
        var kw = product.keywords[0] || product.category;
        var reviews = product.reviews >= 1000 ? (product.reviews / 1000).toFixed(1) + 'K' : String(product.reviews);
        var rating = product.rating;
        var price = product.price;
        var disc = product.discount || 30;
        this._videoScenes = [
          {
            bg: '#1a1a2e',
            text: 'Is it worth the hype?',
            sub: '',
            duration: 3,
            effect: 'zoom-in',
            textColor: '#ffffff',
            overlay: 'rgba(0,0,0,0.3)',
          },
          {
            bg: '#16213e',
            text: title,
            sub: 'Unboxing',
            duration: 3,
            effect: 'zoom-out',
            textColor: '#ffffff',
            overlay: 'rgba(0,0,0,0.2)',
          },
          {
            bg: '#0f3460',
            text: '$' + price,
            sub: disc + '% OFF',
            duration: 6,
            effect: 'pan-right',
            textColor: '#00e5ff',
            overlay: 'rgba(0,0,0,0.2)',
          },
          {
            bg: '#1a1a2e',
            text: rating + '/5 Stars',
            sub: reviews + '+ Reviews',
            duration: 6,
            effect: 'zoom-in',
            textColor: '#ffd700',
            overlay: 'rgba(0,0,0,0.3)',
          },
          {
            bg: '#e94560',
            text: 'LINK IN BIO',
            sub: 'Limited Stock \u2014 ' + disc + '% Off',
            duration: 6,
            effect: 'zoom-out',
            textColor: '#ffffff',
            overlay: 'rgba(0,0,0,0.2)',
          },
        ];
        var fmt = this.section ? this.section.querySelector('#adsVideoFormat') : null;
        if (fmt && fmt.value === '16:9') {
          this._videoCanvas.width = 1920;
          this._videoCanvas.height = 1080;
        } else if (fmt && fmt.value === '1:1') {
          this._videoCanvas.width = 1080;
          this._videoCanvas.height = 1080;
        } else {
          this._videoCanvas.width = 1080;
          this._videoCanvas.height = 1920;
        }
      },

      _drawScene: function (sceneIndex) {
        var ctx = this._videoCtx;
        var canvas = this._videoCanvas;
        if (!ctx || !canvas) return;
        var scene = this._videoScenes[sceneIndex] || this._videoScenes[0];
        if (!scene) return;
        var w = canvas.width;
        var h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = scene.bg;
        ctx.fillRect(0, 0, w, h);
        if (scene.overlay) {
          ctx.fillStyle = scene.overlay;
          ctx.fillRect(0, 0, w, h);
        }
        var grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
        grad.addColorStop(0, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = scene.textColor || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var fontSize = Math.floor(w * 0.07);
        ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
        ctx.fillText(scene.text, w / 2, h * 0.45);
        if (scene.sub) {
          var subSize = Math.floor(w * 0.04);
          ctx.font = subSize + 'px Arial, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillText(scene.sub, w / 2, h * 0.55);
        }
        var borderGrad = ctx.createLinearGradient(0, 0, w, 0);
        borderGrad.addColorStop(0, 'rgba(0,229,255,0.3)');
        borderGrad.addColorStop(0.5, 'rgba(168,85,247,0.3)');
        borderGrad.addColorStop(1, 'rgba(0,229,255,0.3)');
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, w - 40, h - 40);
      },

      _previewVideo: function () {
        var self = this;
        if (self._videoPlaying) return;
        self._videoPlaying = true;
        var scenes = self._videoScenes;
        if (!scenes.length) return;
        var totalFrames = scenes.reduce(function (sum, s) {
          return sum + s.duration * 30;
        }, 0);
        var frame = 0;
        var sceneIdx = 0;
        var frameInScene = 0;
        var statusEl = self.section ? self.section.querySelector('#adsVideoStatus') : null;
        if (statusEl) statusEl.textContent = '\u25B6 Playing preview...';
        function animate() {
          if (frame >= totalFrames || !self._videoPlaying) {
            self._videoPlaying = false;
            if (statusEl) statusEl.textContent = '\u2705 Preview complete';
            self._drawScene(0);
            return;
          }
          var scene = scenes[sceneIdx];
          var sceneFrames = scene.duration * 30;
          var progress = frameInScene / sceneFrames;
          self._drawAnimatedScene(sceneIdx, progress);
          frameInScene++;
          frame++;
          if (frameInScene >= sceneFrames) {
            sceneIdx = Math.min(sceneIdx + 1, scenes.length - 1);
            frameInScene = 0;
          }
          requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
      },

      _drawAnimatedScene: function (sceneIndex, progress) {
        var ctx = this._videoCtx;
        var canvas = this._videoCanvas;
        if (!ctx || !canvas) return;
        var scene = this._videoScenes[sceneIndex];
        if (!scene) return;
        var w = canvas.width;
        var h = canvas.height;
        var scale = 1;
        var offsetX = 0;
        var offsetY = 0;
        if (scene.effect === 'zoom-in') {
          scale = 1 + progress * 0.15;
        } else if (scene.effect === 'zoom-out') {
          scale = 1.15 - progress * 0.15;
        } else if (scene.effect === 'pan-right') {
          offsetX = progress * w * 0.05;
        } else if (scene.effect === 'pan-left') {
          offsetX = -progress * w * 0.05;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2 + offsetX, -h / 2 + offsetY);
        ctx.fillStyle = scene.bg;
        ctx.fillRect(0, 0, w, h);
        if (scene.overlay) {
          ctx.fillStyle = scene.overlay;
          ctx.fillRect(0, 0, w, h);
        }
        var grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
        grad.addColorStop(0, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        var textAlpha = scene.effect === 'fade-in' ? progress : 1;
        if (scene.effect === 'fade-out') textAlpha = 1 - progress;
        ctx.globalAlpha = textAlpha;
        ctx.fillStyle = scene.textColor || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var fontSize = Math.floor(w * 0.07);
        ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
        var textY = h * 0.45 + (scene.effect === 'slide-up' ? (1 - progress) * 100 : 0);
        ctx.fillText(scene.text, w / 2, textY);
        if (scene.sub) {
          var subSize = Math.floor(w * 0.04);
          ctx.font = subSize + 'px Arial, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillText(scene.sub, w / 2, h * 0.55 + (scene.effect === 'slide-up' ? (1 - progress) * 60 : 0));
        }
        ctx.globalAlpha = 1;
        var borderGrad = ctx.createLinearGradient(0, 0, w, 0);
        borderGrad.addColorStop(0, 'rgba(0,229,255,0.3)');
        borderGrad.addColorStop(0.5, 'rgba(168,85,247,0.3)');
        borderGrad.addColorStop(1, 'rgba(0,229,255,0.3)');
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, w - 40, h - 40);
      },

      _renderVideo: function () {
        var self = this;
        if (self._videoPlaying) return;
        var canvas = self._videoCanvas;
        if (!canvas) return;
        var statusEl = self.section ? self.section.querySelector('#adsVideoStatus') : null;
        if (statusEl) statusEl.textContent = '\uD83D\uDD04 Rendering video...';
        try {
          var stream = canvas.captureStream(30);
          var chunks = [];
          var recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 5000000 });
          recorder.ondataavailable = function (e) {
            if (e.data.size > 0) chunks.push(e.data);
          };
          recorder.onstop = function () {
            var blob = new Blob(chunks, { type: 'video/webm' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'video-ad-' + Date.now() + '.webm';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (statusEl)
              statusEl.textContent =
                '\u2705 Video exported! Downloaded as .webm file. Use CloudConvert to convert to MP4 if needed.';
          };
          recorder.start();
          self._videoPlaying = true;
          var scenes = self._videoScenes;
          var totalFrames = scenes.reduce(function (sum, s) {
            return sum + s.duration * 30;
          }, 0);
          var frame = 0;
          var sceneIdx = 0;
          var frameInScene = 0;
          function renderFrame() {
            if (frame >= totalFrames) {
              recorder.stop();
              self._videoPlaying = false;
              self._drawScene(0);
              return;
            }
            var scene = scenes[sceneIdx];
            var sceneFrames = scene.duration * 30;
            var progress = frameInScene / sceneFrames;
            self._drawAnimatedScene(sceneIdx, progress);
            frameInScene++;
            frame++;
            if (frameInScene >= sceneFrames) {
              sceneIdx = Math.min(sceneIdx + 1, scenes.length - 1);
              frameInScene = 0;
            }
            requestAnimationFrame(renderFrame);
          }
          requestAnimationFrame(renderFrame);
        } catch (e) {
          self._videoPlaying = false;
          if (statusEl)
            statusEl.textContent = '\u274C Render failed: ' + e.message + '. Try Chrome or Edge for best support.';
        }
      },

      _setupVideoProvider: function (providerId) {
        var self = this;
        var vidAI = window.HuntDrop.VideoAI;
        if (!vidAI) return;
        var prov = vidAI.providers[providerId];
        if (!prov) return;
        var key = prompt('Enter your ' + prov.name + ' API key:\n\nGet one at: ' + prov.getKeyUrl);
        if (key && key.length > 5) {
          vidAI.setKey(providerId, key);
          var comp = self.section ? self.section.querySelector('#adsVideoProviders') : null;
          if (comp) {
            var items = comp.querySelectorAll('.ads-vp-item');
            items.forEach(function (item) {
              if (item.getAttribute('data-provider') === providerId) {
                var dot = item.querySelector('.ads-vp-dot');
                if (dot) {
                  dot.className = 'ads-vp-dot ais-fa-dot-live';
                  dot.style.background = prov.color;
                }
                var setupBtn = item.querySelector('.ads-vp-setup');
                if (setupBtn) {
                  var span = document.createElement('span');
                  span.className = 'ads-vp-connected';
                  span.textContent = '\u2713 Ready';
                  setupBtn.replaceWith(span);
                }
              }
            });
          }
          var grid = self.section ? self.section.querySelector('#adsAIGenGrid') : null;
          if (grid) self._renderAIGenButtons();
        }
      },

      _renderAIGenButtons: function () {
        var self = this;
        var grid = self.section ? self.section.querySelector('#adsAIGenGrid') : null;
        if (!grid) return;
        var vidAI = window.HuntDrop.VideoAI;
        if (!vidAI) return;
        var scenes = self._videoScenes || [];
        var html = '';
        scenes.forEach(function (scene, idx) {
          html += '<div class="ads-ai-gen-scene">';
          html +=
            '<div class="ads-ai-gen-scene-label">Scene ' +
            (idx + 1) +
            ': ' +
            (scene.text || '').substring(0, 30) +
            '...</div>';
          html += '<div class="ads-ai-gen-btns">';
          Object.keys(vidAI.providers).forEach(function (pid) {
            var p = vidAI.providers[pid];
            var hasKey = vidAI.hasKey(pid);
            html +=
              '<button class="ads-ai-gen-btn' +
              (hasKey ? '' : ' disabled') +
              '" data-ads-action="generateAIVideo" data-scene="' +
              idx +
              '" data-provider="' +
              pid +
              '"' +
              (hasKey ? '' : ' disabled title="Setup ' + p.name + ' API key first"') +
              ' style="border-color:' +
              p.color +
              ';color:' +
              p.color +
              '">' +
              p.name +
              '</button>';
          });
          html += '</div>';
          html += '<div class="ads-ai-gen-result" id="adsAIGenResult' + idx + '"></div>';
          html += '</div>';
        });
        grid.innerHTML = html;
      },

      _generateAIVideo: async function (providerId, sceneIndex) {
        var self = this;
        var vidAI = window.HuntDrop.VideoAI;
        if (!vidAI) return;
        var resultEl = self.section ? self.section.querySelector('#adsAIGenResult' + sceneIndex) : null;
        var statusEl = self.section ? self.section.querySelector('#adsVideoGenStatus') : null;
        var scene = self._videoScenes[sceneIndex];
        if (!scene) return;
        var fmt = self.section ? self.section.querySelector('#adsVideoFormat') : null;
        var ratio = fmt ? fmt.value : '9:16';
        var prompt = 'Create a ' + ratio + ' video ad scene: ' + scene.text;
        if (scene.sub) prompt += ' — ' + scene.sub;
        prompt += '. Style: professional product advertisement, high quality, smooth motion.';
        if (resultEl)
          resultEl.innerHTML =
            '<span class="ads-gen-loading">\u23F3 Generating with ' + vidAI.providers[providerId].name + '...</span>';
        if (statusEl) statusEl.textContent = '\u23F3 Sending to ' + vidAI.providers[providerId].name + '...';
        var res = await vidAI.generate(providerId, prompt, { ratio: ratio === '1:1' ? '1:1' : ratio, duration: 4 });
        if (res.ok) {
          if (resultEl)
            resultEl.innerHTML =
              '<span class="ads-gen-submitted">\u2705 Video submitted! Job ID: ' + res.jobId + '</span>';
          if (statusEl)
            statusEl.textContent =
              '\u2705 Job submitted to ' + vidAI.providers[providerId].name + '. Polling for result...';
          self._pollVideoJob(providerId, res.jobId, sceneIndex);
        } else {
          if (resultEl)
            resultEl.innerHTML = '<span class="ads-gen-error">\u274C ' + (res.error || 'Generation failed') + '</span>';
          if (statusEl) statusEl.textContent = '\u274C ' + (res.error || 'Generation failed');
        }
      },

      _pollVideoJob: async function (providerId, jobId, sceneIndex) {
        var self = this;
        var vidAI = window.HuntDrop.VideoAI;
        var resultEl = self.section ? self.section.querySelector('#adsAIGenResult' + sceneIndex) : null;
        var statusEl = self.section ? self.section.querySelector('#adsVideoGenStatus') : null;
        var attempts = 0;
        var maxAttempts = 60;
        var poll = async function () {
          attempts++;
          if (attempts > maxAttempts) {
            if (resultEl)
              resultEl.innerHTML =
                '<span class="ads-gen-error">\u274C Timeout — check ' +
                vidAI.providers[providerId].name +
                ' dashboard</span>';
            if (statusEl) statusEl.textContent = '\u274C Generation timed out';
            return;
          }
          var res = await vidAI.pollStatus(providerId, jobId);
          if (res.ok) {
            if (res.status === 'completed' || res.status === 'SUCCEEDED') {
              if (res.videoUrl) {
                if (resultEl)
                  resultEl.innerHTML =
                    '<video src="' +
                    res.videoUrl +
                    '" controls class="ads-gen-video"></video><a href="' +
                    res.videoUrl +
                    '" target="_blank" class="ads-action-btn" style="margin-top:8px;display:inline-block">\uD83D\uDD17 Open Video</a>';
                if (statusEl) statusEl.textContent = '\u2705 Video ready!';
              } else {
                if (resultEl)
                  resultEl.innerHTML =
                    '<span class="ads-gen-done">\u2705 Complete — check your ' +
                    vidAI.providers[providerId].name +
                    ' dashboard</span>';
                if (statusEl) statusEl.textContent = '\u2705 Video generation complete';
              }
              return;
            }
            if (res.status === 'FAILED' || res.status === 'failed') {
              if (resultEl) resultEl.innerHTML = '<span class="ads-gen-error">\u274C Generation failed</span>';
              if (statusEl) statusEl.textContent = '\u274C Video generation failed';
              return;
            }
            if (resultEl)
              resultEl.innerHTML =
                '<span class="ads-gen-loading">\u23F3 Processing... ' + (res.progress || 0) + '%</span>';
            if (statusEl) statusEl.textContent = '\u23F3 Generating... ' + (res.progress || 0) + '%';
          }
          setTimeout(poll, 5000);
        };
        poll();
      },

      showResults: function (html) {
        try {
          const el = this.section ? this.section.querySelector('#adsResults') : null;
          if (!el) return;
          if (!html) {
            el.innerHTML = '';
            return;
          }
          const actionsHtml =
            '<div class="ads-result-actions">' +
            '<button class="ads-action-btn" data-ads-action="copyAll" title="Copy to clipboard">\uD83D\uDCCB Copy All</button>' +
            '<button class="ads-action-btn" data-ads-action="exportCSV" title="Export as text file">\uD83D\uDCE5 Export</button>' +
            '</div>';
          el.innerHTML = actionsHtml + '<div class="ads-result-content">' + html + '</div>';
          var self = this;
          el.querySelectorAll('[data-ads-action]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var action = btn.getAttribute('data-ads-action');
              var content = el.querySelector('.ads-result-content');
              if (!content) return;
              var text = content.innerText || content.textContent;
              if (action === 'copyAll') {
                navigator.clipboard
                  .writeText(text)
                  .then(function () {
                    btn.textContent = '\u2705 Copied!';
                    setTimeout(function () {
                      btn.textContent = '\uD83D\uDCCB Copy All';
                    }, 2000);
                  })
                  .catch(function () {
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    btn.textContent = '\u2705 Copied!';
                    setTimeout(function () {
                      btn.textContent = '\uD83D\uDCCB Copy All';
                    }, 2000);
                  });
              } else if (action === 'exportCSV') {
                var blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'ad-creative-' + (self.activeTab || 'output') + '-' + Date.now() + '.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                btn.textContent = '\u2705 Exported!';
                setTimeout(function () {
                  btn.textContent = '\uD83D\uDCE5 Export';
                }, 2000);
              }
            });
          });
        } catch {
          /* ignored */
        }
      },
    };

    window.HuntDrop.VideoAI = VideoAI;
    PluginRegistry.register('ad-studio', AdStudioPlugin);
  } catch (e) {
    console.error('[AdStudio] Plugin load error:', e);
    try {
      window.HuntDrop.PluginRegistry.register('ad-studio', {
        id: 'ad-studio',
        name: 'Ad Creative Studio',
        version: '2.0.0',
        init: function () {},
        mount: function () {},
        unmount: function () {},
      });
    } catch {
      /* ignored */
    }
  }
})();
