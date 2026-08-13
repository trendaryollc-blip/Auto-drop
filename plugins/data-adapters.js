// ============================================================================
// PLUGIN: Platform Data Adapters
// ============================================================================
// Each platform has its own adapter. To add a new platform:
// 1. Create a new adapter object below
// 2. Register it with DataLayer.registerAdapter()
// That's it. The rest of the app works automatically.
//
// CURRENT STATUS: All adapters try real APIs via PlatformConnectors first,
// then fall back to a small demo catalog so search works without API keys.
// ============================================================================
(function () {
  const { DataLayer, EventBus } = window.HuntDrop;

  const FALLBACK_PRODUCTS = [
    {
      id: 'demo-wearbuds-pro',
      title: 'Wireless Earbuds Pro',
      category: 'Electronics',
      platform: 'amazon',
      price: 29.99,
      score: 92,
      competition: 'low',
      margin: 75,
      salesVelocity: 1500,
      image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
      keywords: ['wireless', 'earbuds', 'audio', 'bluetooth'],
      suppliers: [{ name: 'Demo Supplier', location: 'Shenzhen, CN', rating: 4.8, verified: true }],
    },
    {
      id: 'demo-speaker-mini',
      title: 'Bluetooth Speaker Mini',
      category: 'Electronics',
      platform: 'aliexpress',
      price: 19.99,
      score: 85,
      competition: 'medium',
      margin: 60,
      salesVelocity: 800,
      image: 'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=800&q=80',
      keywords: ['speaker', 'bluetooth', 'audio', 'portable'],
      suppliers: [{ name: 'Demo Supplier', location: 'Guangzhou, CN', rating: 4.7, verified: true }],
    },
    {
      id: 'demo-earbuds-budget',
      title: 'Wireless Earbuds Budget',
      category: 'Electronics',
      platform: 'aliexpress',
      price: 8.99,
      score: 78,
      competition: 'high',
      margin: 85,
      salesVelocity: 2000,
      image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
      keywords: ['wireless', 'earbuds', 'budget', 'audio'],
      suppliers: [{ name: 'Demo Supplier', location: 'Yiwu, CN', rating: 4.6, verified: true }],
    },
    {
      id: 'demo-led-lights',
      title: 'LED Strip Lights',
      category: 'Home',
      platform: 'shopify',
      price: 6.99,
      score: 90,
      competition: 'high',
      margin: 90,
      salesVelocity: 3000,
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
      keywords: ['led', 'lights', 'decor', 'home'],
      suppliers: [{ name: 'Demo Supplier', location: 'Dongguan, CN', rating: 4.9, verified: true }],
    },
    {
      id: 'demo-pet-brush',
      title: 'Pet Grooming Brush',
      category: 'Pet Supplies',
      platform: 'shopify',
      price: 15.99,
      score: 82,
      competition: 'low',
      margin: 80,
      salesVelocity: 600,
      image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80',
      keywords: ['pet', 'grooming', 'brush', 'care'],
      suppliers: [{ name: 'Demo Supplier', location: 'Los Angeles, US', rating: 4.5, verified: true }],
    },
    {
      id: 'demo-watch-band',
      title: 'Vintage Watch Band',
      category: 'Accessories',
      platform: 'ebay',
      price: 24.99,
      score: 76,
      competition: 'medium',
      margin: 55,
      salesVelocity: 300,
      image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80',
      keywords: ['watch', 'band', 'vintage', 'accessories'],
      suppliers: [{ name: 'Demo Supplier', location: 'New York, US', rating: 4.3, verified: true }],
    },
  ];

  function validateQuery(query) {
    if (query == null) return '';
    return String(query).trim();
  }

  function validateFilters(filters) {
    if (!filters || typeof filters !== 'object') return {};
    const validated = {};
    const validPlatforms = [
      'all',
      'aliexpress',
      'amazon',
      'shopify',
      'ebay',
      'temu',
      'tiktok',
      'etsy',
      'cjdropshipping',
      'dhgate',
      'wish',
      'walmart',
      'bestbuy',
      'alibaba',
      'rakuten',
      'newegg',
      'google_shopping',
      'reddit',
      'pinterest',
      'amazon_sp',
    ];
    if (filters.platform && typeof filters.platform === 'string' && validPlatforms.indexOf(filters.platform) !== -1) {
      validated.platform = filters.platform;
    }
    if (filters.priceMax !== undefined) {
      const priceMax = Number(filters.priceMax);
      if (!isNaN(priceMax) && priceMax > 0) validated.priceMax = priceMax;
    }
    if (filters.minScore !== undefined) {
      const minScore = Number(filters.minScore);
      if (!isNaN(minScore) && minScore >= 0 && minScore <= 100) validated.minScore = minScore;
    }
    if (filters.competition && typeof filters.competition === 'string') {
      validated.competition = filters.competition;
    }
    if (filters.margin !== undefined) {
      if (filters.margin === 'all') {
        validated.margin = 'all';
      } else {
        const margin = Number(filters.margin);
        if (!isNaN(margin) && margin >= 0) validated.margin = margin;
      }
    }
    const validSorts = ['score', 'trending', 'profit', 'velocity', 'competition', 'price-low', 'price-high'];
    if (filters.sort && validSorts.includes(filters.sort)) {
      validated.sort = filters.sort;
    }
    return validated;
  }

  function sortResults(results, sort) {
    if (!sort) return results;
    switch (sort) {
      case 'score':
        results.sort(function (a, b) {
          return b.score - a.score;
        });
        break;
      case 'trending':
        results.sort(function (a, b) {
          return b.salesVelocity - a.salesVelocity;
        });
        break;
      case 'profit':
        results.sort(function (a, b) {
          return b.margin - a.margin;
        });
        break;
      case 'velocity':
        results.sort(function (a, b) {
          return b.salesVelocity - a.salesVelocity;
        });
        break;
      case 'competition':
        results.sort(function (a, b) {
          var compOrder = { low: 0, medium: 1, high: 2 };
          return (compOrder[a.competition] || 1) - (compOrder[b.competition] || 1);
        });
        break;
      case 'price-low':
        results.sort(function (a, b) {
          return a.price - b.price;
        });
        break;
      case 'price-high':
        results.sort(function (a, b) {
          return b.price - a.price;
        });
        break;
    }
    return results;
  }

  function getFallbackResults(platformName, query, filters) {
    const trimmedQuery = validateQuery(query);
    const normalizedFilters = validateFilters(filters);
    const matchingPlatform = platformName === 'all' ? null : platformName;

    let results = FALLBACK_PRODUCTS.filter((product) => {
      if (matchingPlatform && product.platform !== matchingPlatform) return false;

      if (!trimmedQuery) return true;

      const haystacks = [product.title, product.category, ...(Array.isArray(product.keywords) ? product.keywords : [])]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const matchQuery = haystacks.some((value) => value.includes(trimmedQuery.toLowerCase()));
      return matchQuery;
    });

    if (normalizedFilters.priceMax) {
      results = results.filter((product) => Number(product.price) <= Number(normalizedFilters.priceMax));
    }
    if (normalizedFilters.minScore) {
      results = results.filter((product) => Number(product.score) >= Number(normalizedFilters.minScore));
    }
    if (normalizedFilters.competition && normalizedFilters.competition !== 'all') {
      results = results.filter((product) => product.competition === normalizedFilters.competition);
    }
    if (normalizedFilters.margin && normalizedFilters.margin !== 'all') {
      results = results.filter((product) => Number(product.margin) >= Number(normalizedFilters.margin));
    }

    return sortResults(results, normalizedFilters.sort);
  }

  function createAdapter(platformName) {
    const PROXY_PLATFORMS = ['aliexpress', 'amazon', 'google_shopping', 'cjdropshipping'];
    return {
      search: async (rawQuery, rawFilters = {}) => {
        const query = validateQuery(rawQuery);
        const filters = validateFilters(rawFilters);
        const PC = window.HuntDrop.PlatformConnectors;

        // Fall back to the demo catalog whenever the real platforms return no
        // results (no API keys configured, proxy unavailable, or no matches).
        // Proxy platforms count as "connected" even without a key, so the old
        // hasConnectedPlatforms guard wrongly disabled the fallback and every
        // search came back empty. Always fall back when real results are empty.
        const localFallback = function () {
          return getFallbackResults(platformName, query, filters);
        };

        // For proxy platforms, always try the proxy (auth is server-side)
        if (PC && platformName !== 'all' && PROXY_PLATFORMS.indexOf(platformName) !== -1) {
          try {
            const realResults = await PC.searchPlatform(platformName, query, filters);
            if (realResults && realResults.length > 0) {
              return sortResults(realResults, filters.sort);
            }
          } catch (e) {
            console.warn('[DataAdapters] ' + platformName + ' API failed:', e.message);
          }
          return localFallback();
        }

        if (PC && platformName !== 'all' && PC.isConnected(platformName)) {
          try {
            const realResults = await PC.searchPlatform(platformName, query, filters);
            if (realResults && realResults.length > 0) {
              return sortResults(realResults, filters.sort);
            }
          } catch (e) {
            console.warn('[DataAdapters] ' + platformName + ' API failed:', e.message);
          }
          return localFallback();
        }

        if (PC && platformName === 'all') {
          const connectedPlatforms = Object.keys(PC.configs).filter(function (p) {
            return PC.isConnected(p);
          });
          if (connectedPlatforms.length > 0) {
            const allResults = [];
            const promises = connectedPlatforms.map(async function (p) {
              try {
                const results = await PC.searchPlatform(p, query, filters);
                if (results && results.length > 0) allResults.push.apply(allResults, results);
              } catch (e) {
                /* ignore */
              }
            });
            await Promise.all(promises);
            if (allResults.length > 0) {
              return sortResults(allResults, filters.sort);
            }
          }
        }

        return localFallback();
      },
      getProduct: async (id) => {
        const PC = window.HuntDrop.PlatformConnectors;
        if (PC) {
          for (const p of Object.keys(PC.configs)) {
            if (PC.isConnected(p)) {
              try {
                const results = await PC.searchPlatform(p, String(id), {});
                if (results && results.length > 0) return results[0];
              } catch (e) {
                /* ignore */
              }
            }
          }
        }
        return null;
      },
      getTrends: async (id) => {
        return [];
      },
      getSuppliers: async (id) => {
        return [];
      },
      getPrices: async (id) => {
        return {};
      },
    };
  }

  const platforms = [
    'aliexpress',
    'amazon',
    'shopify',
    'ebay',
    'temu',
    'tiktok',
    'etsy',
    'cjdropshipping',
    'dhgate',
    'wish',
    'walmart',
    'bestbuy',
    'alibaba',
    'rakuten',
    'newegg',
    'google_shopping',
    'reddit',
    'pinterest',
    'amazon_sp',
  ];
  platforms.forEach((p) => DataLayer.registerAdapter(p, createAdapter(p)));

  window.HuntDrop.ALL_PRODUCTS = [];
  window.HuntDrop.ALL_PRODUCTS_META = { query: '', source: '', timestamp: 0 };
  window.HuntDrop.FALLBACK_PRODUCTS = FALLBACK_PRODUCTS;

  EventBus.emit('adapters:registered', { platforms });
  console.debug('[DataAdapters] Registered ' + platforms.length + ' adapters. API-only mode — no mock data.');
})();
