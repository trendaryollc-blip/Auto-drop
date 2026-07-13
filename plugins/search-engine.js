// ============================================================================
// PLUGIN: Search Engine — Fuzzy search with typo tolerance
// ============================================================================
(function(){
const {EventBus,Config,DataLayer,UI} = window.HuntDrop;

function fuzzyMatch(text, query) {
  text = text.toLowerCase();
  query = query.toLowerCase();
  if (text.indexOf(query) !== -1) return true;
  var tIdx = 0, qIdx = 0, misses = 0;
  var maxMisses = Math.floor(query.length * 0.3);
  while (tIdx < text.length && qIdx < query.length) {
    if (text[tIdx] === query[qIdx]) { qIdx++; tIdx++; misses = 0; }
    else { tIdx++; misses++; if (misses > maxMisses) return false; }
  }
  return qIdx === query.length;
}

function levenshtein(a, b) {
  var m = a.length, n = b.length;
  var dp = [];
  for (var i = 0; i <= m; i++) { dp[i] = [i]; }
  for (var j = 0; j <= n; j++) { dp[0][j] = j; }
  for (var i = 1; i <= m; i++) {
    for (var j = 1; j <= n; j++) {
      var cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

const SearchPlugin = {
  id: 'search-engine',
  name: 'Search Engine',
  version: '2.0.0',
  description: 'Fuzzy search with typo tolerance across all platforms',

  init(ctx) {
    Config.defaults('search', {
      platforms: ['aliexpress','amazon','shopify','ebay','temu','tiktok','etsy','cjdropshipping','dhgate','wish'],
      defaultPlatform: 'all',
      minScore: 0,
      sortBy: 'score'
    });
  },

  mount(ctx) {
    EventBus.on('search:query', async (data) => {
      const results = await DataLayer.searchAll(data.query, data.filters);
      EventBus.emit('search:results', { query: data.query, results, total: results.length });
    });

    EventBus.on('filter:changed', async (data) => {
      const query = Config.get('search.lastQuery', '');
      const results = await DataLayer.searchAll(query, data.filters);
      EventBus.emit('search:results', { query, results, total: results.length });
    });
  },

  unmount(ctx) {}
};

window.HuntDrop.fuzzyMatch = fuzzyMatch;
window.HuntDrop.levenshtein = levenshtein;
window.HuntDrop.PluginRegistry.register('search-engine', SearchPlugin);
})();
