// ============================================================================
// PLUGIN: Search Engine — Fuzzy search with typo tolerance
// ============================================================================
(function () {
  const { EventBus, Config, DataLayer } = window.HuntDrop;
  let _cleanups = [];

  function fuzzyMatch(text, query) {
    text = text.toLowerCase();
    query = query.toLowerCase();
    if (text.indexOf(query) !== -1) return true;
    let tIdx = 0,
      qIdx = 0,
      misses = 0;
    const maxMisses = Math.floor(query.length * 0.3);
    while (tIdx < text.length && qIdx < query.length) {
      if (text[tIdx] === query[qIdx]) {
        qIdx++;
        tIdx++;
        misses = 0;
      } else {
        tIdx++;
        misses++;
        if (misses > maxMisses) return false;
      }
    }
    return qIdx === query.length;
  }

  function levenshtein(a, b) {
    const m = a.length,
      n = b.length;
    const dp = [];
    for (let i = 0; i <= m; i++) {
      dp[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }

  const SearchPlugin = {
    id: 'search-engine',
    name: 'Search Engine',
    version: '2.0.0',
    description: 'Fuzzy search with typo tolerance across all platforms',

    init(_ctx) {
      Config.defaults('search', {
        platforms: [
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
        ],
        defaultPlatform: 'all',
        minScore: 0,
        sortBy: 'score',
      });
    },

    mount(_ctx) {
      const c = [];
      c.push(
        EventBus.on('search:query', async (data) => {
          const query = data.query || '';
          const filters = data.filters || {};
          if (query) Config.set('search.lastQuery', query);
          const results = await DataLayer.searchAll(query, filters);
          EventBus.emit('search:results', { query, results, total: results.length, filters });
        })
      );

      c.push(
        EventBus.on('filter:changed', async (data) => {
          const query = data && data.query !== undefined ? data.query : Config.get('search.lastQuery', '');
          const filters = data.filters || {};
          const results = await DataLayer.searchAll(query, filters);
          EventBus.emit('search:results', { query, results, total: results.length, filters });
        })
      );
      _cleanups = c;
    },

    unmount(_ctx) {
      (_cleanups || []).forEach(function (fn) {
        try {
          fn();
        } catch (e) {
          /* ignored */
        }
      });
      _cleanups = [];
    },
  };

  window.HuntDrop.fuzzyMatch = fuzzyMatch;
  window.HuntDrop.levenshtein = levenshtein;
  window.HuntDrop.PluginRegistry.register('search-engine', SearchPlugin);
})();
