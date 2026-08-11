// ============================================================================
// PLUGIN: Image Fetcher — Fetches real product images from web search
// ============================================================================
(function () {
  const { EventBus, PluginRegistry, Config } = window.HuntDrop;

  const imageCache = {};
  let isFetching = false;

  function enhanceImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    try {
      const u = new URL(url);
      const host = u.hostname || '';
      // Provider-specific rules
      if (host.includes('images.unsplash.com')) {
        u.searchParams.set('w', '1400');
        u.searchParams.set('q', '85');
        u.searchParams.set('auto', 'format');
        u.searchParams.set('fit', 'crop');
        return u.toString();
      }
      if (host.includes('cdn.shopify.com') || host.includes('shopifycloud.com')) {
        // Shopify images support _{width}x{height} in path or ?width= param
        if (u.searchParams.has('width')) u.searchParams.set('width', '1400');
        if (u.pathname.match(/_\d+x\d+(?=\.)/)) {
          u.pathname = u.pathname.replace(/_(\d+)x(\d+)(?=\.)/, '_1400x1400');
        }
        return u.toString();
      }
      if (host.includes('alicdn.com') || host.includes('alicdn') || host.includes('alicdn.net')) {
        // AliExpress CDN uses size markers like _200x200; strip to try to fetch original
        u.pathname = u.pathname.replace(/_(\d+)x(\d+)(?=\.)/, '');
        return u.toString();
      }
      if (host.includes('amazon') || host.includes('images-amazon')) {
        // Amazon image URLs often contain _SX###_ or AC_SX; try to request larger
        let p = u.pathname;
        p = p.replace(/_SX\d+_/i, '_SX1200_');
        p = p.replace(/_AC_SX\d+_/, '_AC_SX1200_');
        u.pathname = p;
        return u.toString();
      }
      // If provider supports width param, request a larger width
      if (u.searchParams.has('w')) {
        u.searchParams.set('w', '1200');
        u.searchParams.set('q', '85');
        u.searchParams.set('auto', 'format');
        return u.toString();
      }
      // If the URL has common CDN size query like "size=..." or "s=...", bump it
      if (u.searchParams.has('size')) u.searchParams.set('size', '1200');
      if (u.searchParams.has('s')) u.searchParams.set('s', '1200');
      return u.toString();
    } catch (e) {
      // Fallback string-based heuristics
      let s = url;
      s = s.replace(/thumbnail/gi, '');
      s = s.replace(/_thumb/gi, '');
      s = s.replace(/-thumb/gi, '');
      // Remove small size suffixes like -200x200, _200x200
      s = s.replace(/([-_])\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}$)/i, '');
      // Try to replace common small markers
      s = s.replace(/([._-])?small([._-])?/gi, '');
      return s;
    }
  }

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
        try {
          out.push(enhanceImageUrl(url));
        } catch (e) {
          out.push(url);
        }
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
          // Store enhanced candidates and pick the first as main image
          var enhanced = imgUrls.map(function (u) {
            try {
              return enhanceImageUrl(u);
            } catch (e) {
              return u;
            }
          });
          p.images = enhanced;
          p.image = enhanced[0];
          updated[p.id] = enhanced;
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
