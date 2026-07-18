// ============================================================================
// PLUGIN: Ad Creative Studio v2.0 — Full AI-Powered Ad Generation Suite
// 15 Features: Copy, Platforms, Hooks, Compliance, Variations, UGC, A/B Tests,
// Retargeting, Fatigue, Swipe Library, ROAS, Audience, Briefs, Seasonal, LP
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
    };

    // ============================================================================
    // TAB DEFINITIONS
    // ============================================================================
    const TABS = [
      { id: 'copy', label: '\uD83E\uDDE0 Ad Copy' },
      { id: 'platforms', label: '\uD83C\uDFAF Multi-Platform' },
      { id: 'hooks', label: '\uD83D\uDD25 Hooks' },
      { id: 'compliance', label: '\u2705 Compliance' },
      { id: 'variations', label: '\uD83E\uDDEA Variations' },
      { id: 'ugc', label: '\uD83C\uDFAC UGC Scripts' },
      { id: 'abtest', label: '\uD83D\uDCCA A/B Tests' },
      { id: 'retarget', label: '\uD83D\uDD04 Retargeting' },
      { id: 'fatigue', label: '\uD83D\uDCA1 Fatigue' },
      { id: 'swipe', label: '\uD83C\uDFC6 Swipe Library' },
      { id: 'roas', label: '\uD83D\uDCC8 ROAS' },
      { id: 'audience', label: '\uD83C\uDFAF Audience' },
      { id: 'briefs', label: '\uD83D\uDCF1 Creative Briefs' },
      { id: 'seasonal', label: '\u23F0 Seasonal' },
      { id: 'lp', label: '\uD83D\uDCCB LP Matcher' },
    ];

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
        TABS.forEach(function (t) {
          tabsHtml += '<button class="ads-tab" data-tab="' + t.id + '">' + t.label + '</button>';
        });

        return (
          '<div class="section-inner">' +
          '<div class="ads-hero"><div class="ads-hero-content">' +
          '<div class="ads-hero-badge"><span class="dot"></span> Ad Creative Studio v2.0</div>' +
          '<h1 class="ads-hero-title">AI-Powered <span class="highlight">Ad Creatives</span></h1>' +
          '<p class="ads-hero-desc">Generate high-converting ad copy, hooks, scripts, and campaign strategies using proven frameworks and AI.</p>' +
          '</div><div class="ads-hero-stats">' +
          '<div class="ads-stat"><div class="ads-stat-num">15</div><div class="ads-stat-label">AI Tools</div></div>' +
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
              result = await this.generateFeature('adCopy', product);
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

      showResults: function (html) {
        try {
          const el = this.section ? this.section.querySelector('#adsResults') : null;
          if (el) el.innerHTML = html || '';
        } catch {
          /* ignored */
        }
      },
    };

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
