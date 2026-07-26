// ============================================================================
// PLUGIN: Platform Data Adapters
// ============================================================================
// Each platform has its own adapter. To add a new platform:
// 1. Create a new adapter object below
// 2. Register it with DataLayer.registerAdapter()
// That's it. The rest of the app works automatically.
//
// CURRENT STATUS: All adapters use real APIs via PlatformConnectors.
// No mock data — only real results from connected platforms.
// ============================================================================
(function () {
  const { DataLayer, EventBus } = window.HuntDrop;

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

  function createAdapter(platformName) {
    const PROXY_PLATFORMS = ['aliexpress', 'amazon', 'google_shopping', 'cjdropshipping'];
    return {
      search: async (rawQuery, rawFilters = {}) => {
        const query = validateQuery(rawQuery);
        const filters = validateFilters(rawFilters);
        const PC = window.HuntDrop.PlatformConnectors;

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
          return [];
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
          return [];
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
            return sortResults(allResults, filters.sort);
          }
        }

        return [];
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

  EventBus.emit('adapters:registered', { platforms });
  console.debug('[DataAdapters] Registered ' + platforms.length + ' adapters. API-only mode — no mock data.');
})();
