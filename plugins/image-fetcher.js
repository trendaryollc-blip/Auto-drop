// ============================================================================
// PLUGIN: Image Fetcher — Fetches real product images from web search
// ============================================================================
(function () {
  const { EventBus, PluginRegistry, Config } = window.HuntDrop;

  const imageCache = {};
  let isFetching = false;

  function getBestImages(images) {
    if (!images || images.length === 0) return [];
    var out = [];
    for (var i = 0; i < images.length; i++) {
      var url = images[i].url || images[i];
      if (
        typeof url === 'string' &&
        url.match(/^https?:\/\//) &&
        !url.includes('placeholder') &&
        !url.includes('via.placeholder')
      ) {
        out.push(url);
      }
    }
    return out;
  }

  async function fetchImagesForProduct(product) {
    if (!product || !product.title) return [];
    var cacheKey = product.title.toLowerCase().trim();
    if (imageCache[cacheKey]) return imageCache[cacheKey];

    var webSearch = window.HuntDrop.AIWebSearch;
    if (!webSearch || !webSearch.hasKey()) return [];

    try {
      var result = await webSearch.searchProductImages(product.title, 6);
      var imgUrls = getBestImages(result ? result.images : []);
      if (imgUrls.length > 0) {
        imageCache[cacheKey] = imgUrls;
        return imgUrls;
      }
    } catch (e) {
      console.warn('[ImageFetcher] Error for:', product.title, e);
    }
    return [];
  }

  async function fetchImagesForResults(products) {
    if (!products || products.length === 0 || isFetching) return;
    isFetching = true;

    var batchSize = 5;
    var updated = {};

    for (var i = 0; i < products.length; i += batchSize) {
      var batch = products.slice(i, i + batchSize);
      var promises = batch.map(async function (p) {
        var imgUrls = await fetchImagesForProduct(p);
        if (imgUrls.length > 0) {
          p.images = imgUrls;
          p.image = imgUrls[0];
          updated[p.id] = imgUrls;
        }
      });
      await Promise.allSettled(promises);
    }

    isFetching = false;

    if (Object.keys(updated).length > 0) {
      EventBus.emit('images:fetched', { updated: updated });
    }
  }

  const ImageFetcherPlugin = {
    id: 'image-fetcher',
    name: 'Image Fetcher',
    version: '1.0.0',
    description: 'Fetches real product images from web search providers',

    init(_ctx) {
      Config.defaults('imageFetcher', { enabled: true, autoFetch: true });
    },

    mount(_ctx) {
      var self = this;
      EventBus.on('search:results', function (data) {
        if (!Config.get('imageFetcher.autoFetch')) return;
        if (!data || !data.results || data.results.length === 0) return;
        setTimeout(function () {
          fetchImagesForResults(data.results);
        }, 500);
      });
    },

    unmount(_ctx) {},

    async fetchForProduct(product) {
      return await fetchImagesForProduct(product);
    },

    getCachedImages() {
      return Object.assign({}, imageCache);
    },

    clearCache() {
      Object.keys(imageCache).forEach(function (k) {
        delete imageCache[k];
      });
    },
  };

  window.HuntDrop.ImageFetcher = ImageFetcherPlugin;
  PluginRegistry.register('image-fetcher', ImageFetcherPlugin);
})();
