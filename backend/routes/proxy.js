/**
 * Platform Proxy Route — proxies requests to e-commerce platform APIs
 * bypassing CORS restrictions. API keys are stored server-side.
 */

import { Router } from 'express';

const router = Router();

// Platform API configurations (server-side only — keys never exposed to client)
const PLATFORMS = {
  aliexpress: {
    name: 'AliExpress',
    search: async (query, key) => {
      const params = new URLSearchParams({
        keywords: query,
        sortBy: 'booking30days',
        pageSize: '20',
        pageNo: '1',
        targetCurrency: 'USD',
        targetLanguage: 'EN',
        trackingId: key,
      });
      const resp = await fetch('https://api-sg.aliexpress.com/sync?' + params.toString());
      if (!resp.ok) throw new Error('AliExpress API error: ' + resp.status);
      const data = await resp.json();
      if (data.result && data.result.products) {
        return data.result.products.map((p) => ({
          id: 'ae_' + p.productId,
          title: p.productTitle || p.title || '',
          image: p.productImage || p.imageUrl || '',
          platform: 'aliexpress',
          price: parseFloat(p.productPrice || p.price || 0),
          originalPrice: parseFloat(p.originalPrice || p.price || 0),
          margin: 0,
          score: Math.floor(Math.random() * 30) + 60,
          badges: [],
          salesVelocity: parseInt(p.orders || p.booking30days || 0),
          competition: 'medium',
          demand: parseInt(p.orders || 0),
          rating: parseFloat(p.averageStar || p.rating || 0),
          reviews: parseInt(p.reviews || 0),
          orders: parseInt(p.orders || 0),
          shipFrom: p.shipFrom || 'China',
          category: p.productCategory || p.category || '',
          keywords: [],
          suppliers: [{ name: p.storeName || 'AliExpress Store', location: 'China', rating: parseFloat(p.storeRating || 4.5), orders: parseInt(p.storeOrders || 0), responseTime: '24h', verified: true }],
          platformPrices: { aliexpress: parseFloat(p.productPrice || p.price || 0) },
          trendData: Array.from({ length: 12 }, () => Math.floor(Math.random() * 50) + 30),
          seasonality: [60, 55, 70, 75, 80, 90, 95, 100, 85, 75, 80, 90],
          audience: { age: '18-45', gender: 'All', interests: [], countries: ['US', 'UK', 'CA', 'AU'] },
          riskScore: Math.floor(Math.random() * 30) + 10,
          marketSaturation: Math.floor(Math.random() * 40) + 30,
          adSpendAvg: Math.floor(Math.random() * 500) + 100,
          cpaAvg: Math.floor(Math.random() * 15) + 3,
          aiInsight: '',
        }));
      }
      return [];
    },
  },
  cjdropshipping: {
    name: 'CJ Dropshipping',
    search: async (query, key) => {
      const resp = await fetch('https://developers.cjdropshipping.com/api/product/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': key },
        body: JSON.stringify({ productNameEn: query, pageNum: 1, pageSize: 20 }),
      });
      if (!resp.ok) throw new Error('CJ API error: ' + resp.status);
      const data = await resp.json();
      if (data.code === 200 && data.data && data.data.list) {
        return data.data.list.map((p) => ({
          id: 'cj_' + p.pid,
          title: p.productNameEn || p.productName || '',
          image: p.productImage || '',
          platform: 'cjdropshipping',
          price: parseFloat(p.sellPrice || p.productPrice || 0),
          originalPrice: parseFloat(p.sellPrice || p.productPrice || 0),
          margin: 0,
          score: Math.floor(Math.random() * 25) + 60,
          badges: [],
          salesVelocity: 0,
          competition: 'low',
          demand: parseInt(p.orderQuantity || 0),
          rating: parseFloat(p.productRating || 4.5),
          reviews: 0,
          orders: parseInt(p.orderQuantity || 0),
          shipFrom: p.warehouse && p.warehouse[0] ? p.warehouse[0] : 'China',
          category: p.categoryName || '',
          keywords: [],
          suppliers: [{ name: 'CJ Dropshipping', location: 'Global', rating: 4.5, orders: 0, responseTime: '12h', verified: true }],
          platformPrices: { cjdropshipping: parseFloat(p.sellPrice || p.productPrice || 0) },
          trendData: Array.from({ length: 12 }, () => Math.floor(Math.random() * 50) + 30),
          seasonality: [60, 55, 70, 75, 80, 90, 95, 100, 85, 75, 80, 90],
          audience: { age: '18-45', gender: 'All', interests: [], countries: ['US', 'UK', 'CA', 'AU'] },
          riskScore: Math.floor(Math.random() * 25) + 10,
          marketSaturation: Math.floor(Math.random() * 35) + 25,
          adSpendAvg: Math.floor(Math.random() * 400) + 80,
          cpaAvg: Math.floor(Math.random() * 12) + 3,
          aiInsight: '',
        }));
      }
      return [];
    },
  },
  amazon: {
    name: 'Amazon',
    search: async (query, key) => {
      const resp = await fetch(
        'https://api.rainforestapi.com/request?api_key=' + encodeURIComponent(key) + '&type=search&amazon_domain=amazon.com&search_term=' + encodeURIComponent(query)
      );
      if (!resp.ok) throw new Error('Amazon API error: ' + resp.status);
      const data = await resp.json();
      if (data.search_results) {
        return data.search_results.slice(0, 20).map((p) => ({
          id: 'am_' + (p.asin || Math.random().toString(36).substr(2, 9)),
          title: p.title || '',
          image: p.image || '',
          platform: 'amazon',
          price: parseFloat(p.price && p.price.raw ? p.price.raw : p.price || 0),
          originalPrice: parseFloat(p.list_price && p.list_price.raw ? p.list_price.raw : p.price || 0),
          margin: 0,
          score: Math.floor(Math.random() * 30) + 60,
          badges: p.is_prime ? ['Prime'] : [],
          salesVelocity: 0,
          competition: 'high',
          demand: 0,
          rating: parseFloat(p.rating || 0),
          reviews: parseInt(p.reviews_total || 0),
          orders: 0,
          shipFrom: 'Amazon',
          category: p.category || '',
          keywords: [],
          suppliers: [{ name: p.brand || 'Amazon', location: 'US', rating: parseFloat(p.rating || 4.5), orders: 0, responseTime: '24h', verified: true }],
          platformPrices: { amazon: parseFloat(p.price && p.price.raw ? p.price.raw : p.price || 0) },
          trendData: Array.from({ length: 12 }, () => Math.floor(Math.random() * 50) + 30),
          seasonality: [60, 55, 70, 75, 80, 90, 95, 100, 85, 75, 80, 90],
          audience: { age: '18-65', gender: 'All', interests: [], countries: ['US'] },
          riskScore: Math.floor(Math.random() * 20) + 5,
          marketSaturation: Math.floor(Math.random() * 40) + 40,
          adSpendAvg: Math.floor(Math.random() * 800) + 200,
          cpaAvg: Math.floor(Math.random() * 20) + 5,
          aiInsight: '',
        }));
      }
      return [];
    },
  },
  google_shopping: {
    name: 'Google Shopping',
    search: async (query, key) => {
      const params = new URLSearchParams({ q: query, engine: 'google_shopping', api_key: key, num: '20' });
      const resp = await fetch('https://serpapi.com/search.json?' + params.toString());
      if (!resp.ok) throw new Error('Google Shopping API error: ' + resp.status);
      const data = await resp.json();
      if (data.shopping_results) {
        return data.shopping_results.slice(0, 20).map((p) => ({
          id: 'gs_' + (p.position || Math.random().toString(36).substr(2, 9)),
          title: p.title || '',
          image: p.thumbnail || '',
          platform: 'google_shopping',
          price: parseFloat(p.extracted_price || p.price_raw || 0),
          originalPrice: parseFloat(p.extracted_price || p.price_raw || 0),
          margin: 0,
          score: Math.floor(Math.random() * 20) + 70,
          badges: [],
          salesVelocity: 0,
          competition: 'high',
          demand: 0,
          rating: parseFloat(p.rating || 0),
          reviews: parseInt(p.reviews || 0),
          orders: 0,
          shipFrom: p.source || 'Multiple',
          category: '',
          keywords: [],
          suppliers: [{ name: p.source || 'Google Shopping', location: 'Global', rating: parseFloat(p.rating || 4.5), orders: 0, responseTime: '24h', verified: true }],
          platformPrices: { google_shopping: parseFloat(p.extracted_price || p.price_raw || 0) },
          trendData: Array.from({ length: 12 }, () => Math.floor(Math.random() * 50) + 30),
          seasonality: [60, 55, 70, 75, 80, 90, 95, 100, 85, 75, 80, 90],
          audience: { age: '18-65', gender: 'All', interests: [], countries: ['US', 'UK', 'CA', 'AU'] },
          riskScore: Math.floor(Math.random() * 20) + 5,
          marketSaturation: Math.floor(Math.random() * 40) + 35,
          adSpendAvg: Math.floor(Math.random() * 700) + 200,
          cpaAvg: Math.floor(Math.random() * 15) + 4,
          aiInsight: '',
        }));
      }
      return [];
    },
  },
};

// Map env var names to platform keys
const ENV_KEY_MAP = {
  aliexpress: 'ALIEXPRESS_API_KEY',
  cjdropshipping: 'CJ_API_KEY',
  amazon: 'RAINFOREST_API_KEY',
  google_shopping: 'SERP_API_KEY',
};

/**
 * POST /api/platform/search
 * Body: { platform: string, query: string, filters?: object }
 * Returns: { results: Product[], platform: string, total: number }
 */
router.post('/search', async (req, res) => {
  try {
    const { platform, query, filters } = req.body;

    if (!platform || !query) {
      return res.status(400).json({ error: 'platform and query are required' });
    }

    // Handle "all" — search all configured platforms
    if (platform === 'all') {
      const allResults = [];
      const searches = Object.keys(PLATFORMS).map(async (p) => {
        const envKey = ENV_KEY_MAP[p];
        const key = envKey ? process.env[envKey] : null;
        if (!key) return;
        try {
          const results = await PLATFORMS[p].search(query, key);
          allResults.push(...results);
        } catch (e) {
          console.warn(`[PlatformProxy] ${p} search failed:`, e.message);
        }
      });
      await Promise.allSettled(searches);
      return res.json({ results: allResults, platform: 'all', total: allResults.length });
    }

    // Single platform search
    const platformConfig = PLATFORMS[platform];
    if (!platformConfig) {
      return res.status(400).json({ error: 'Unknown platform: ' + platform });
    }

    const envKey = ENV_KEY_MAP[platform];
    const key = envKey ? process.env[envKey] : null;
    if (!key) {
      return res.status(400).json({ error: 'No API key configured for ' + platform });
    }

    const results = await platformConfig.search(query, key);
    return res.json({ results, platform, total: results.length });
  } catch (e) {
    console.error('[PlatformProxy] Error:', e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

/**
 * GET /api/platform/status
 * Returns which platforms have API keys configured
 */
router.get('/status', (req, res) => {
  const status = {};
  Object.keys(ENV_KEY_MAP).forEach((platform) => {
    const envKey = ENV_KEY_MAP[platform];
    status[platform] = {
      name: PLATFORMS[platform].name,
      configured: !!process.env[envKey],
    };
  });
  res.json(status);
});

export default router;
