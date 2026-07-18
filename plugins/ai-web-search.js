// ============================================================================
// PLUGIN: AI Web Search — Configurable search providers
// ============================================================================
(function () {
  const { PluginRegistry, Config } = window.HuntDrop;

  const SEARCH_PROVIDERS = {
    tavily: {
      name: 'Tavily',
      endpoint: 'https://api.tavily.com/search',
      getKeyUrl: 'https://tavily.com',
      color: '#8b5cf6',
    },
    serper: {
      name: 'Serper (Google)',
      endpoint: 'https://api.serper.dev/search',
      getKeyUrl: 'https://serper.dev',
      color: '#4285f4',
    },
    brave: {
      name: 'Brave Search',
      endpoint: 'https://api.search.brave.com/res/v1/web/search',
      getKeyUrl: 'https://brave.com/search/api',
      color: '#fb542b',
    },
  };

  const AIWebSearch = {
    id: 'ai-web-search',
    name: 'AI Web Search',
    version: '1.0.0',
    providers: SEARCH_PROVIDERS,

    init(_ctx) {
      Config.defaults('webSearch', {
        provider: 'tavily',
        key: '',
      });
    },

    mount(_ctx) {},

    unmount(_ctx) {},

    getProvider() {
      return Config.get('webSearch.provider') || 'tavily';
    },

    setProvider(provider) {
      Config.set('webSearch.provider', provider);
    },

    getKey() {
      return Config.get('webSearch.key') || '';
    },

    setKey(key) {
      Config.set('webSearch.key', key);
    },

    hasKey() {
      return this.getKey().length > 5;
    },

    async search(query, numResults) {
      if (!this.hasKey()) return this.fallbackSearch(query);
      const provider = this.getProvider();
      const key = this.getKey();
      try {
        switch (provider) {
          case 'tavily':
            return await this.searchTavily(query, key, numResults);
          case 'serper':
            return await this.searchSerper(query, key, numResults);
          case 'brave':
            return await this.searchBrave(query, key, numResults);
          default:
            return this.fallbackSearch(query);
        }
      } catch (e) {
        console.warn('[WebSearch] Error:', e);
        return this.fallbackSearch(query);
      }
    },

    async searchTavily(query, key, numResults) {
      const resp = await fetch(SEARCH_PROVIDERS.tavily.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: key,
          query: query,
          search_depth: 'basic',
          max_results: numResults || 5,
          include_answer: true,
        }),
      });
      const data = await resp.json();
      return {
        answer: data.answer || '',
        results: (data.results || []).map(function (r) {
          return { title: r.title, url: r.url, content: r.content, score: r.score };
        }),
      };
    },

    async searchSerper(query, key, numResults) {
      const resp = await fetch(SEARCH_PROVIDERS.serper.endpoint, {
        method: 'POST',
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: numResults || 5 }),
      });
      const data = await resp.json();
      return {
        answer: '',
        results: (data.organic || []).map(function (r) {
          return { title: r.title, url: r.link, content: r.snippet, position: r.position };
        }),
      };
    },

    async searchBrave(query, key, numResults) {
      const resp = await fetch(
        SEARCH_PROVIDERS.brave.endpoint + '?q=' + encodeURIComponent(query) + '&count=' + (numResults || 5),
        {
          method: 'GET',
          headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': key },
        }
      );
      const data = await resp.json();
      return {
        answer: '',
        results: (data.web?.results || []).map(function (r) {
          return { title: r.title, url: r.url, content: r.description };
        }),
      };
    },

    fallbackSearch(_query) {
      return {
        answer: '',
        results: [],
        fallback: true,
        message: 'Web search not configured. Add API key in AI Settings.',
      };
    },

    async searchProductPrices(productName) {
      const queries = [productName + ' price buy online 2026', productName + ' Amazon eBay Shopify price'];
      let allResults = [];
      for (let i = 0; i < queries.length; i++) {
        const r = await this.search(queries[i], 3);
        if (r.results) allResults = allResults.concat(r.results);
      }
      return { query: productName, results: allResults.slice(0, 8) };
    },

    async searchProductTrends(productName) {
      return await this.search(productName + ' trending viral 2026 dropshipping', 5);
    },

    async searchCompetitors(productName) {
      return await this.search(productName + ' dropshipping stores selling competitors', 5);
    },

    async searchSupplierReviews(supplierName) {
      return await this.search(supplierName + ' review reliable supplier', 5);
    },

    async searchIndustryBenchmarks(niche) {
      return await this.search(niche + ' dropshipping benchmarks CTR CPA conversion rate 2026', 5);
    },

    formatResultsForAI(searchData) {
      if (!searchData || !searchData.results || searchData.results.length === 0) {
        return 'No web search results available.';
      }
      let output = 'WEB SEARCH RESULTS:\n';
      if (searchData.answer) output += 'Summary: ' + searchData.answer + '\n\n';
      searchData.results.forEach(function (r, i) {
        output += i + 1 + '. ' + r.title + '\n';
        output += '   URL: ' + r.url + '\n';
        output += '   Info: ' + r.content + '\n\n';
      });
      return output;
    },
  };

  window.HuntDrop.AIWebSearch = AIWebSearch;
  PluginRegistry.register('ai-web-search', AIWebSearch);
})();
