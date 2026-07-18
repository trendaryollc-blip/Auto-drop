// ============================================================================
// PLUGIN: Platform Data Adapters
// ============================================================================
// Each platform has its own adapter. To add a new platform:
// 1. Create a new adapter object below
// 2. Register it with DataLayer.registerAdapter()
// That's it. The rest of the app works automatically.
//
// CURRENT STATUS: All adapters use mock data loaded on-demand from mock-products.json.
// To integrate real APIs, replace the search() method in each adapter with
// actual fetch() calls to the platform's API. Example:
//
//   search: async (query, filters) => {
//     const resp = await fetch(`https://api.example.com/search?q=${query}`);
//     const data = await resp.json();
//     return data.products.map(normalizeProduct);
//   }
//
// The normalizeProduct() helper below converts any product object to the
// standard HuntDrop product shape expected by the UI.
// ============================================================================
(function () {
  const { DataLayer, EventBus } = window.HuntDrop;

  let _productsCache = null;
  // FIX #1: Use a proper promise lock to prevent race conditions
  let _productsLoadingPromise = null;
  // FIX #14: Reduce timeout to 10 seconds for better UX
  const LOAD_TIMEOUT = 10000; // 10 second timeout for product loading
  const MAX_RETRIES = 3;

  function loadProducts() {
    // Return cached products if available
    if (_productsCache) return Promise.resolve(_productsCache);

    // FIX #1: Return existing loading promise to prevent race condition
    if (_productsLoadingPromise) return _productsLoadingPromise;

    // If products were already loaded inline (mock-products.js), use them directly
    function getInlineProducts() {
      return window.HuntDrop.ALL_PRODUCTS || [];
    }

    function attemptLoad(attempt) {
      return new Promise(function (resolve) {
        let isResolved = false;
        const safeResolve = function (data) {
          if (isResolved) return;
          isResolved = true;
          _productsCache = data;
          if (!window.HuntDrop.ALL_PRODUCTS || window.HuntDrop.ALL_PRODUCTS.length === 0) {
            window.HuntDrop.ALL_PRODUCTS = data;
          }
          resolve(data);
        };

        var timeoutId = setTimeout(function () {
          if (attempt < MAX_RETRIES) {
            console.warn('[DataAdapters] Load attempt ' + attempt + ' timed out, retrying...');
            clearTimeout(timeoutId);
            attemptLoad(attempt + 1).then(safeResolve);
          } else {
            console.error(
              '[DataAdapters] Load timeout after ' +
                LOAD_TIMEOUT / 1000 +
                's x' +
                MAX_RETRIES +
                ' - falling back to inline products'
            );
            const inline = getInlineProducts();
            if (inline.length > 0) {
              console.log('[DataAdapters] Using ' + inline.length + ' inline products from mock-products.js');
            }
            safeResolve(inline);
            EventBus.emit('adapters:load-failed', { reason: 'timeout', timeoutMs: LOAD_TIMEOUT, attempts: attempt });
          }
        }, LOAD_TIMEOUT);

        // Check if inline products are already available — skip fetch
        const inline = getInlineProducts();
        if (inline.length > 0) {
          clearTimeout(timeoutId);
          isResolved = true;
          _productsCache = inline;
          console.log('[DataAdapters] Using ' + inline.length + ' inline products (fetch skipped)');
          EventBus.emit('adapters:loaded', { count: inline.length });
          resolve(inline);
          return;
        }

        fetch('mock-products.json')
          .then(function (resp) {
            clearTimeout(timeoutId);
            if (!resp.ok) throw new Error('Failed to load mock products: HTTP ' + resp.status);
            return resp.json();
          })
          .then(function (data) {
            const products = Array.isArray(data) ? data : [];
            console.log('[DataAdapters] Loaded ' + products.length + ' products from mock-products.json');
            EventBus.emit('adapters:loaded', { count: products.length });
            safeResolve(products);
          })
          .catch(function (e) {
            clearTimeout(timeoutId);
            if (attempt < MAX_RETRIES) {
              console.warn('[DataAdapters] Attempt ' + attempt + ' failed: ' + e.message + ', retrying...');
              attemptLoad(attempt + 1).then(safeResolve);
            } else {
              console.error('[DataAdapters] Failed to load mock products after ' + MAX_RETRIES + ' attempts:', e);
              const fallback = getInlineProducts();
              if (fallback.length > 0) {
                console.log('[DataAdapters] Using ' + fallback.length + ' inline products as fallback');
              }
              EventBus.emit('adapters:load-failed', { reason: 'fetch-error', error: e.message, attempts: attempt });
              safeResolve(fallback);
            }
          });
      });
    }

    // FIX #1: Create loading promise and store it immediately
    _productsLoadingPromise = attemptLoad(1);

    return _productsLoadingPromise;
  }

  function getAllProducts() {
    return _productsCache || window.HuntDrop.ALL_PRODUCTS || [];
  }

  // ===== FIX #5: Input Validation Helpers =====
  function validateQuery(query) {
    if (query == null) return '';
    return String(query).trim();
  }

  function validateFilters(filters) {
    if (!filters || typeof filters !== 'object') return {};

    const validated = {};

    // Validate platform against known platforms
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
    ];
    if (filters.platform && typeof filters.platform === 'string' && validPlatforms.indexOf(filters.platform) !== -1) {
      validated.platform = filters.platform;
    }

    // Validate priceMax - must be a positive number
    if (filters.priceMax !== undefined) {
      const priceMax = Number(filters.priceMax);
      if (!isNaN(priceMax) && priceMax > 0) {
        validated.priceMax = priceMax;
      }
    }

    // Validate minScore - must be a number between 0 and 100
    if (filters.minScore !== undefined) {
      const minScore = Number(filters.minScore);
      if (!isNaN(minScore) && minScore >= 0 && minScore <= 100) {
        validated.minScore = minScore;
      }
    }

    // Validate competition - must be a valid string
    if (filters.competition && typeof filters.competition === 'string') {
      validated.competition = filters.competition;
    }

    // Validate margin - must be a positive number or 'all'
    if (filters.margin !== undefined) {
      if (filters.margin === 'all') {
        validated.margin = 'all';
      } else {
        const margin = Number(filters.margin);
        if (!isNaN(margin) && margin >= 0) {
          validated.margin = margin;
        }
      }
    }

    // Validate sort - must be a valid sort option
    const validSorts = ['score', 'trending', 'profit', 'velocity', 'competition', 'price-low', 'price-high'];
    if (filters.sort && validSorts.includes(filters.sort)) {
      validated.sort = filters.sort;
    }

    return validated;
  }

  // ===== Mock Search (local filter/fuzzy) =====
  function mockSearch(allProducts, platformName, query, filters) {
    const fuzzy = window.HuntDrop.fuzzyMatch;
    const results = allProducts.filter((p) => {
      if (platformName !== 'all' && p.platform !== platformName) return false;
      if (query) {
        const q = query.toLowerCase();
        let match =
          p.title.toLowerCase().indexOf(q) !== -1 ||
          (p.keywords &&
            p.keywords.some(function (k) {
              return k && k.toLowerCase().indexOf(q) !== -1;
            })) ||
          (p.category && p.category.toLowerCase().indexOf(q) !== -1);
        if (!match && fuzzy) {
          match =
            fuzzy(p.title, query) ||
            (p.keywords &&
              p.keywords.some(function (k) {
                return k && fuzzy(k, query);
              })) ||
            (p.category && fuzzy(p.category, query));
        }
        if (!match) return false;
      }
      if (filters) {
        if (filters.platform && filters.platform !== 'all' && p.platform !== filters.platform) return false;
        if (filters.priceMax && p.price > filters.priceMax) return false;
        if (filters.minScore && p.score < filters.minScore) return false;
        if (filters.competition && filters.competition !== 'all' && p.competition !== filters.competition) return false;
        if (filters.margin && filters.margin !== 'all' && p.margin < Number(filters.margin)) return false;
      }
      return true;
    });
    if (filters && filters.sort) {
      switch (filters.sort) {
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
            const compOrder = { low: 0, medium: 1, high: 2 };
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
    }
    return results;
  }

  // ===== Generic Search Adapter (real API + mock fallback) =====
  function createAdapter(platformName) {
    return {
      search: async (rawQuery, rawFilters = {}) => {
        // FIX #5: Validate inputs
        const query = validateQuery(rawQuery);
        const filters = validateFilters(rawFilters);

        const PC = window.HuntDrop.PlatformConnectors;

        // Try real API first if platform has a configured key
        if (PC && platformName !== 'all' && PC.isConnected(platformName)) {
          try {
            const realResults = await PC.searchPlatform(platformName, query, filters);
            if (realResults && realResults.length > 0) {
              console.debug('[DataAdapters] ' + platformName + ': returned ' + realResults.length + ' real results');
              return realResults;
            }
          } catch (e) {
            console.warn('[DataAdapters] ' + platformName + ' API failed, falling back to mock:', e.message);
          }
        }

        // For 'all' platform, try real APIs for each connected platform in parallel
        if (PC && platformName === 'all') {
          const connectedPlatforms = Object.keys(PC.configs).filter(function (p) {
            return PC.isConnected(p);
          });
          if (connectedPlatforms.length > 0) {
            const realResultsAll = [];
            const promises = connectedPlatforms.map(async function (p) {
              try {
                const results = await PC.searchPlatform(p, query, filters);
                if (results && results.length > 0) realResultsAll.push.apply(realResultsAll, results);
              } catch (e) {
                /* ignore */
              }
            });
            await Promise.all(promises);

            // Also add mock results for platforms without keys
            await loadProducts();
            const mockResults = mockSearch(getAllProducts(), 'all', query, filters);
            const merged = realResultsAll.concat(mockResults);

            if (merged.length > 0) {
              // Sort merged results
              if (filters && filters.sort) {
                switch (filters.sort) {
                  case 'score':
                    merged.sort(function (a, b) {
                      return b.score - a.score;
                    });
                    break;
                  case 'trending':
                    merged.sort(function (a, b) {
                      return b.salesVelocity - a.salesVelocity;
                    });
                    break;
                  case 'profit':
                    merged.sort(function (a, b) {
                      return b.margin - a.margin;
                    });
                    break;
                  case 'velocity':
                    merged.sort(function (a, b) {
                      return b.salesVelocity - a.salesVelocity;
                    });
                    break;
                  case 'competition':
                    merged.sort(function (a, b) {
                      const compOrder = { low: 0, medium: 1, high: 2 };
                      return (compOrder[a.competition] || 1) - (compOrder[b.competition] || 1);
                    });
                    break;
                  case 'price-low':
                    merged.sort(function (a, b) {
                      return a.price - b.price;
                    });
                    break;
                  case 'price-high':
                    merged.sort(function (a, b) {
                      return b.price - a.price;
                    });
                    break;
                }
              }
              console.debug(
                '[DataAdapters] Merged search: ' +
                  realResultsAll.length +
                  ' real + ' +
                  mockResults.length +
                  ' mock = ' +
                  merged.length +
                  ' total'
              );
              return merged;
            }
          }
        }

        // Fallback: mock data
        await loadProducts();
        return mockSearch(getAllProducts(), platformName, query, filters);
      },
      getProduct: async (id) => {
        await loadProducts();
        const p = getAllProducts().find(function (x) {
          return x.id === id;
        });
        return p || null;
      },
      getTrends: async (id) => {
        await loadProducts();
        const p = getAllProducts().find(function (x) {
          return x.id === id;
        });
        return p ? p.trendData || [] : [];
      },
      getSuppliers: async (id) => {
        await loadProducts();
        const p = getAllProducts().find(function (x) {
          return x.id === id;
        });
        return p ? p.suppliers || [] : [];
      },
      getPrices: async (id) => {
        await loadProducts();
        const p = getAllProducts().find(function (x) {
          return x.id === id;
        });
        return p ? p.platformPrices || {} : {};
      },
    };
  }

  // ===== Register Adapters for Each Platform (skip 'all' — searchAll aggregates automatically) =====
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
  ];
  platforms.forEach((p) => DataLayer.registerAdapter(p, createAdapter(p)));

  // ===== Initialize empty — products load on first search =====
  window.HuntDrop.ALL_PRODUCTS = window.HuntDrop.ALL_PRODUCTS || [];

  EventBus.emit('adapters:registered', { platforms });
  console.debug('[DataAdapters] Registered ' + platforms.length + ' adapters. Products will load on first search.');
})();
