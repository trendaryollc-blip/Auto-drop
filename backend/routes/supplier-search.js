/**
 * Supplier Search Route — Internet-connected supplier discovery
 *
 * Searches the web + e-commerce platforms for suppliers matching a product query.
 * Uses fallback chains: if one provider is down, tries the next.
 *
 * Flow: User query → Web search → AI parsing → Platform search → Merge + Rank → Return
 */

import { Router } from 'express';

const router = Router();

// ===== WEB SEARCH FALLBACK CHAIN =====
// Priority: Brave → Tavily → Serper → SerpAPI → error

const WEB_SEARCH_PROVIDERS = [
  {
    name: 'Brave',
    envKey: 'BRAVE_SEARCH_API_KEY',
    search: async (query, key) => {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;
      const resp = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': key,
        },
      });
      if (!resp.ok) throw new Error(`Brave returned ${resp.status}`);
      const data = await resp.json();
      return (data.web?.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.description,
      }));
    },
  },
  {
    name: 'Tavily',
    envKey: 'TAVILY_API_KEY',
    search: async (query, key) => {
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: key,
          query: query,
          search_depth: 'basic',
          max_results: 10,
        }),
      });
      if (!resp.ok) throw new Error(`Tavily returned ${resp.status}`);
      const data = await resp.json();
      return (data.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      }));
    },
  },
  {
    name: 'Serper',
    envKey: 'SERPER_API_KEY',
    search: async (query, key) => {
      const resp = await fetch('https://api.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 10 }),
      });
      if (!resp.ok) throw new Error(`Serper returned ${resp.status}`);
      const data = await resp.json();
      return (data.organic || []).map((r) => ({
        title: r.title,
        url: r.link,
        content: r.snippet,
      }));
    },
  },
  {
    name: 'SerpAPI',
    envKey: 'SERP_API_KEY',
    search: async (query, key) => {
      const params = new URLSearchParams({ q: query, api_key: key, num: '10', engine: 'google' });
      const resp = await fetch('https://serpapi.com/search.json?' + params.toString());
      if (!resp.ok) throw new Error(`SerpAPI returned ${resp.status}`);
      const data = await resp.json();
      return (data.organic_results || []).map((r) => ({
        title: r.title,
        url: r.link,
        content: r.snippet,
      }));
    },
  },
];

async function searchWeb(query) {
  for (const provider of WEB_SEARCH_PROVIDERS) {
    const key = process.env[provider.envKey];
    if (!key) continue;
    try {
      console.log(`[SupplierSearch] Trying web search: ${provider.name}`);
      const results = await provider.search(query, key);
      if (results && results.length > 0) {
        console.log(`[SupplierSearch] ${provider.name} returned ${results.length} results`);
        return { provider: provider.name, results };
      }
    } catch (e) {
      console.warn(`[SupplierSearch] ${provider.name} failed:`, e.message);
    }
  }
  return { provider: null, results: [] };
}

// ===== AI PARSING FALLBACK CHAIN =====
// Priority: Groq → OpenAI → Anthropic → Google → DeepSeek → Mistral → Cohere → Together → HuggingFace → Fireworks → OpenRouter → Replicate → HPC → regex

const SUPPLIER_SYSTEM_PROMPT = `You are a supplier data extraction engine. Given web search results about product suppliers, extract structured supplier information.

Return a JSON array of supplier objects. Each supplier MUST have these fields:
{
  "name": "Company/store name",
  "platform": "AliExpress|Alibaba|Amazon|CJ Dropshipping|DHgate|Temu|TikTok Shop|Etsy|Accio|Global Sources|Made-in-China|WholesaleCentral|IndiaMART|Independent|Other",
  "location": "Country or region",
  "rating": 4.5,           // 1-5 scale, estimate if not found
  "orders": 10000,          // Total orders, 0 if unknown
  "responseTime": "24h",    // Estimated response time
  "verified": true,         // Whether platform-verified
  "specialty": "Product category specialty",
  "shipTime": "7-15",       // Days range
  "shipCost": "$2-5",       // or "Free"
  "minOrder": "1 piece",    // Minimum order quantity
  "quality": 80,            // 0-100 score
  "communication": 75,      // 0-100 score
  "value": 85,              // 0-100 score
  "yearsActive": 3,         // Years in business
  "responseRate": 95,       // Percentage
  "fulfillmentRate": 98,    // Percentage
  "disputeRate": 1.2,       // Percentage
  "refundRate": "1.5%",     // String
  "topProducts": ["Product 1", "Product 2"]
}

Platform-specific rules:
- Accio: AI-powered sourcing engine by Alibaba International. Connected to Alibaba.com, 1688, Taobao, AliExpress. 1.5M+ suppliers, 1B+ products. Mark platform as "Accio".
- Global Sources: Hong Kong-based B2B marketplace. Verified suppliers, strong in electronics and manufacturing. Mark platform as "Global Sources".
- Made-in-China.com: Chinese supplier directory. Direct factory sourcing. Mark platform as "Made-in-China".
- WholesaleCentral: US wholesale directory since 1997. Domestic suppliers. Mark platform as "WholesaleCentral".
- IndiaMART: Indian B2B marketplace. Mark platform as "IndiaMART".

Rules:
- Extract ONLY from the provided web results — do not invent suppliers
- If a result mentions a supplier/platform, extract it
- Prioritize results from Accio, Global Sources, Made-in-China, WholesaleCentral, IndiaMART
- If metrics are not available, use reasonable estimates based on platform norms
- Return ONLY the JSON array, no explanation or markdown
- If no suppliers found, return empty array []`;

function buildAI_prompt(query, webResults) {
  let prompt = `Find suppliers for: "${query}"\n\n`;
  prompt += 'PLATFORMS TO LOOK FOR: Accio, Global Sources, Made-in-China, WholesaleCentral, IndiaMART, AliExpress, Alibaba, Amazon, CJ Dropshipping, DHgate, Temu\n\n';
  prompt += 'WEB SEARCH RESULTS:\n';
  webResults.forEach((r, i) => {
    prompt += `${i + 1}. ${r.title}\n   URL: ${r.url}\n   Info: ${r.content}\n\n`;
  });
  prompt += '\nExtract all suppliers mentioned. Prioritize Accio, Global Sources, Made-in-China results. Return JSON array.';
  return prompt;
}

const AI_PROVIDERS = [
  {
    name: 'Groq',
    envKey: 'GROQ_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      if (!resp.ok) throw new Error(`Groq returned ${resp.status}`);
      const data = await resp.json();
      return data.choices[0].message.content;
    },
  },
  {
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      if (!resp.ok) throw new Error(`OpenAI returned ${resp.status}`);
      const data = await resp.json();
      return data.choices[0].message.content;
    },
  },
  {
    name: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!resp.ok) throw new Error(`Anthropic returned ${resp.status}`);
      const data = await resp.json();
      return data.content[0].text;
    },
  },
  {
    name: 'Google AI',
    envKey: 'GOOGLE_AI_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
          }),
        }
      );
      if (!resp.ok) throw new Error(`Google AI returned ${resp.status}`);
      const data = await resp.json();
      return data.candidates[0].content.parts[0].text;
    },
  },
  {
    name: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      if (!resp.ok) throw new Error(`DeepSeek returned ${resp.status}`);
      const data = await resp.json();
      return data.choices[0].message.content;
    },
  },
  {
    name: 'Mistral',
    envKey: 'MISTRAL_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      if (!resp.ok) throw new Error(`Mistral returned ${resp.status}`);
      const data = await resp.json();
      return data.choices[0].message.content;
    },
  },
  {
    name: 'Cohere',
    envKey: 'COHERE_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch('https://api.cohere.com/v2/chat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'command-r',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!resp.ok) throw new Error(`Cohere returned ${resp.status}`);
      const data = await resp.json();
      return data.message.content[0].text;
    },
  },
  {
    name: 'Together',
    envKey: 'TOGETHER_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3-70b-chat-hf',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      if (!resp.ok) throw new Error(`Together returned ${resp.status}`);
      const data = await resp.json();
      return data.choices[0].message.content;
    },
  },
  {
    name: 'HuggingFace',
    envKey: 'HUGGINGFACE_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch(
        'https://api-inference.huggingface.co/models/meta-llama/Llama-3-70b-chat-hf',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: systemPrompt + '\n\n' + userPrompt,
            parameters: { max_new_tokens: 4000, temperature: 0.3 },
          }),
        }
      );
      if (!resp.ok) throw new Error(`HuggingFace returned ${resp.status}`);
      const data = await resp.json();
      return typeof data[0] === 'string' ? data[0] : data[0].generated_text;
    },
  },
  {
    name: 'Fireworks',
    envKey: 'FIREWORKS_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      if (!resp.ok) throw new Error(`Fireworks returned ${resp.status}`);
      const data = await resp.json();
      return data.choices[0].message.content;
    },
  },
  {
    name: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      if (!resp.ok) throw new Error(`OpenRouter returned ${resp.status}`);
      const data = await resp.json();
      return data.choices[0].message.content;
    },
  },
  {
    name: 'HPC',
    envKey: 'HPC_API_KEY',
    call: async (key, systemPrompt, userPrompt) => {
      const resp = await fetch('https://api.hpc-ai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'hpc-ai',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      if (!resp.ok) throw new Error(`HPC returned ${resp.status}`);
      const data = await resp.json();
      return data.choices[0].message.content;
    },
  },
];

async function parseWithAI(query, webResults) {
  const userPrompt = buildAI_prompt(query, webResults);

  for (const provider of AI_PROVIDERS) {
    const key = process.env[provider.envKey];
    if (!key) continue;
    try {
      console.log(`[SupplierSearch] Trying AI: ${provider.name}`);
      const response = await provider.call(key, SUPPLIER_SYSTEM_PROMPT, userPrompt);
      const parsed = parseAIJsonResponse(response);
      if (parsed.length > 0) {
        console.log(`[SupplierSearch] ${provider.name} parsed ${parsed.length} suppliers`);
        return { provider: provider.name, suppliers: parsed };
      }
    } catch (e) {
      console.warn(`[SupplierSearch] ${provider.name} failed:`, e.message);
    }
  }

  // Final fallback: regex-based extraction
  console.log('[SupplierSearch] All AI providers failed, using regex extraction');
  return { provider: 'regex', suppliers: extractSuppliersViaRegex(webResults) };
}

function parseAIJsonResponse(response) {
  if (!response) return [];
  // Strip markdown code fences
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // Try to extract JSON array from response
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        return [];
      }
    }
    return [];
  }
}

function extractSuppliersViaRegex(webResults) {
  const suppliers = [];
  const seen = new Set();

  for (const result of webResults) {
    const text = `${result.title} ${result.content}`;

    // Look for platform mentions
    const platforms = [
      'AliExpress', 'Alibaba', 'Amazon', 'CJ Dropshipping', 'DHgate',
      'Temu', 'TikTok Shop', 'Etsy', 'Wish', 'Rakuten',
      'Accio', 'Global Sources', 'Made-in-China', 'WholesaleCentral',
      'IndiaMART', 'TradeIndia',
    ];

    for (const platform of platforms) {
      const regex = new RegExp(`([A-Z][a-zA-Z0-9\\s&]+)\\s*(?:on|via|through|at|from)\\s*${platform}`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 50 && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          suppliers.push({
            name,
            platform,
            location: 'Global',
            rating: 4.0 + Math.random() * 0.8,
            orders: Math.floor(Math.random() * 50000) + 1000,
            responseTime: '24h',
            verified: true,
            specialty: '',
            shipTime: '7-15',
            shipCost: '$2-5',
            minOrder: '1 piece',
            quality: 70 + Math.floor(Math.random() * 20),
            communication: 65 + Math.floor(Math.random() * 25),
            value: 70 + Math.floor(Math.random() * 25),
            yearsActive: 1 + Math.floor(Math.random() * 5),
            responseRate: 85 + Math.floor(Math.random() * 15),
            fulfillmentRate: 90 + Math.floor(Math.random() * 10),
            disputeRate: +(Math.random() * 3).toFixed(1),
            refundRate: (Math.random() * 3).toFixed(1) + '%',
            topProducts: [],
          });
        }
      }
    }

    // Also look for "supplier", "wholesaler", "distributor" mentions
    const supplierRegex = /([A-Z][a-zA-Z0-9\s&]{2,40})\s*(?:supplier|wholesaler|distributor|manufacturer|vendor)/gi;
    let sMatch;
    while ((sMatch = supplierRegex.exec(text)) !== null) {
      const name = sMatch[1].trim();
      if (name.length > 2 && name.length < 50 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        suppliers.push({
          name,
          platform: 'Other',
          location: 'Global',
          rating: 3.5 + Math.random() * 1.0,
          orders: Math.floor(Math.random() * 20000) + 500,
          responseTime: '24-48h',
          verified: false,
          specialty: '',
          shipTime: '10-20',
          shipCost: '$3-8',
          minOrder: '5-10 pieces',
          quality: 60 + Math.floor(Math.random() * 25),
          communication: 55 + Math.floor(Math.random() * 30),
          value: 60 + Math.floor(Math.random() * 30),
          yearsActive: 1 + Math.floor(Math.random() * 4),
          responseRate: 75 + Math.floor(Math.random() * 20),
          fulfillmentRate: 80 + Math.floor(Math.random() * 15),
          disputeRate: +(Math.random() * 4).toFixed(1),
          refundRate: (Math.random() * 4).toFixed(1) + '%',
          topProducts: [],
        });
      }
    }
  }

  return suppliers;
}

// ===== PLATFORM SEARCH (existing backend proxy) =====

async function searchPlatforms(query) {
  const results = [];

  // Search AliExpress for supplier stores
  const aliKey = process.env.ALIEXPRESS_API_KEY;
  if (aliKey) {
    try {
      const params = new URLSearchParams({
        keywords: query,
        sortBy: 'booking30days',
        pageSize: '10',
        pageNo: '1',
        targetCurrency: 'USD',
        targetLanguage: 'EN',
        trackingId: aliKey,
      });
      const resp = await fetch('https://api-sg.aliexpress.com/sync?' + params.toString());
      if (resp.ok) {
        const data = await resp.json();
        if (data.result && data.result.products) {
          const storeMap = {};
          for (const p of data.result.products) {
            const storeName = p.storeName || 'AliExpress Store';
            if (!storeMap[storeName]) {
              storeMap[storeName] = {
                name: storeName,
                platform: 'AliExpress',
                location: p.shipFrom || 'China',
                rating: parseFloat(p.storeRating || 4.5),
                orders: parseInt(p.storeOrders || 0),
                responseTime: '24h',
                verified: true,
                specialty: p.productCategory || '',
                shipTime: '7-20',
                shipCost: 'Free',
                minOrder: '1 piece',
                quality: 75,
                communication: 70,
                value: 80,
                yearsActive: 2,
                responseRate: 90,
                fulfillmentRate: 95,
                disputeRate: 1.5,
                refundRate: '1.5%',
                topProducts: [],
                _orderCount: parseInt(p.orders || 0),
              };
            }
            storeMap[storeName]._orderCount += parseInt(p.orders || 0);
            if (storeMap[storeName].topProducts.length < 5) {
              storeMap[storeName].topProducts.push(p.productTitle?.substring(0, 40) || '');
            }
          }
          results.push(...Object.values(storeMap));
        }
      }
    } catch (e) {
      console.warn('[SupplierSearch] AliExpress search failed:', e.message);
    }
  }

  // Search CJ Dropshipping
  const cjKey = process.env.CJ_API_KEY;
  if (cjKey) {
    try {
      const resp = await fetch('https://developers.cjdropshipping.com/api/product/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': cjKey },
        body: JSON.stringify({ productNameEn: query, pageNum: 1, pageSize: 10 }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.code === 200 && data.data && data.data.list) {
          results.push({
            name: 'CJ Dropshipping',
            platform: 'CJ Dropshipping',
            location: 'Global',
            rating: 4.5,
            orders: data.data.total || 0,
            responseTime: '12h',
            verified: true,
            specialty: query,
            shipTime: '5-12',
            shipCost: '$2-5',
            minOrder: '1 piece',
            quality: 80,
            communication: 85,
            value: 75,
            yearsActive: 5,
            responseRate: 95,
            fulfillmentRate: 97,
            disputeRate: 0.8,
            refundRate: '0.8%',
            topProducts: data.data.list.slice(0, 5).map((p) => p.productNameEn?.substring(0, 40) || ''),
          });
        }
      }
    } catch (e) {
      console.warn('[SupplierSearch] CJ search failed:', e.message);
    }
  }

  return results;
}

// ===== MERGE + RANK =====

function mergeSuppliers(webSuppliers, platformSuppliers) {
  const seen = new Map();

  // Platform suppliers take priority (more accurate data)
  for (const s of platformSuppliers) {
    const key = s.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, s);
    }
  }

  // Add web suppliers (skip duplicates)
  for (const s of webSuppliers) {
    const key = s.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, s);
    }
  }

  // Calculate reliability score and sort
  const merged = Array.from(seen.values());
  for (const s of merged) {
    s._reliabilityScore = computeReliabilityScore(s);
  }
  merged.sort((a, b) => b._reliabilityScore - a._reliabilityScore);

  return merged;
}

function computeReliabilityScore(s) {
  let score = 0;
  score += (s.rating || 0) * 10; // max 50
  score += Math.min(s.quality || 0, 100) * 0.2; // max 20
  score += Math.min(s.communication || 0, 100) * 0.15; // max 15
  score += Math.min(s.value || 0, 100) * 0.15; // max 15
  if (s.verified) score += 5;
  if (s.yearsActive > 2) score += 3;
  if (s.responseRate > 90) score += 2;
  return Math.round(score);
}

// ===== ROUTE =====

/**
 * POST /api/suppliers/search
 * Body: { query: string }
 * Returns: { suppliers: Supplier[], webProvider: string, aiProvider: string, total: number }
 */
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    console.log(`[SupplierSearch] Searching for: "${query}"`);

    // Stage 1: Multi-source web search (main query + platform-specific)
    const searchQueries = [
      { label: 'general', query: `${query} wholesale supplier dropshipping manufacturer` },
      { label: 'accio', query: `site:accio.com ${query} supplier` },
      { label: 'globalsources', query: `site:globalsources.com ${query} supplier manufacturer` },
      { label: 'madeinchina', query: `site:made-in-china.com ${query} supplier manufacturer` },
      { label: 'wholesale', query: `site:wholesalecentral.com ${query} wholesale supplier` },
      { label: 'indiamart', query: `site:indiamart.com ${query} supplier manufacturer` },
    ];

    const allWebResults = [];
    const searchedPlatforms = [];

    // Run general search first (most important)
    const generalResults = await searchWeb(searchQueries[0].query);
    if (generalResults.results.length > 0) {
      allWebResults.push(...generalResults.results);
      searchedPlatforms.push(generalResults.provider || 'Web');
    }

    // Run platform-specific searches in parallel (non-blocking, best-effort)
    const platformSearches = searchQueries.slice(1).map(async (sq) => {
      const results = await searchWeb(sq.query);
      if (results.results.length > 0) {
        return { label: sq.label, results: results.results };
      }
      return null;
    });

    const platformResults = await Promise.allSettled(platformSearches);
    for (const pr of platformResults) {
      if (pr.status === 'fulfilled' && pr.value) {
        allWebResults.push(...pr.value.results);
        searchedPlatforms.push(pr.value.label);
      }
    }

    console.log(`[SupplierSearch] Web results: ${allWebResults.length} total, platforms searched: ${searchedPlatforms.join(', ')}`);

    // Stage 2: AI parsing of web results
    let webSuppliers = [];
    let aiProvider = 'none';
    if (allWebResults.length > 0) {
      const aiResult = await parseWithAI(query, allWebResults);
      webSuppliers = aiResult.suppliers;
      aiProvider = aiResult.provider;
    }

    // Stage 3: Platform search (AliExpress, CJ)
    const platformSuppliers = await searchPlatforms(query);

    // Stage 4: Merge + rank
    const allSuppliers = mergeSuppliers(webSuppliers, platformSuppliers);

    console.log(
      `[SupplierSearch] Found ${allSuppliers.length} suppliers (web: ${webSuppliers.length}, platform: ${platformSuppliers.length})`
    );

    return res.json({
      suppliers: allSuppliers,
      query,
      webProvider: generalResults.provider,
      aiProvider,
      searchedPlatforms,
      platformCount: platformSuppliers.length,
      total: allSuppliers.length,
    });
  } catch (e) {
    console.error('[SupplierSearch] Error:', e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

export default router;
