/**
 * Platform connectors for Store Connect.
 * Each connector is a thin adapter that validates config and simulates or delegates API calls.
 * Replace the simulated flows with real API integration later.
 */

export const PlatformConnectors = {
  trendaryo: {
    normalize(config) {
      return {
        storeId: config.storeId || '',
        apiKey: config.apiKey || '',
      };
    },
    async test(config) {
      if (!config.storeId || !config.apiKey) {
        const err = new Error('Trendaryo requires storeId and apiKey');
        err.status = 400;
        throw err;
      }
      return { status: 'ok', message: 'Trendaryo connection valid' };
    },
    async push(config, { products, status }) {
      return {
        status: 'ok',
        platform: 'trendaryo',
        pushed: products.length,
        statusChanged: status,
      };
    },
  },
  shopify: {
    normalize(config) {
      return {
        shop: config.shop || '',
        accessToken: config.accessToken || '',
      };
    },
    async test(config) {
      if (!config.shop || !config.accessToken) {
        const err = new Error('Shopify requires shop and accessToken');
        err.status = 400;
        throw err;
      }
      return { status: 'ok', message: 'Shopify API credentials look valid' };
    },
    async push(config, { products, status }) {
      return {
        status: 'ok',
        platform: 'shopify',
        pushed: products.length,
        statusChanged: status,
      };
    },
  },
  woocommerce: {
    normalize(config) {
      return {
        storeUrl: config.storeUrl || '',
        consumerKey: config.consumerKey || '',
        consumerSecret: config.consumerSecret || '',
      };
    },
    async test(config) {
      if (!config.storeUrl || !config.consumerKey || !config.consumerSecret) {
        const err = new Error('WooCommerce requires storeUrl, consumerKey, and consumerSecret');
        err.status = 400;
        throw err;
      }
      return { status: 'ok', message: 'WooCommerce credentials look valid' };
    },
    async push(config, { products, status }) {
      return {
        status: 'ok',
        platform: 'woocommerce',
        pushed: products.length,
        statusChanged: status,
      };
    },
  },
  amazon: {
    normalize(config) {
      return {
        merchantId: config.merchantId || '',
        accessKey: config.accessKey || '',
        secretKey: config.secretKey || '',
        marketplaceId: config.marketplaceId || '',
      };
    },
    async test(config) {
      if (!config.merchantId || !config.accessKey || !config.secretKey || !config.marketplaceId) {
        const err = new Error('Amazon requires merchantId, accessKey, secretKey, and marketplaceId');
        err.status = 400;
        throw err;
      }
      return { status: 'ok', message: 'Amazon connector validated' };
    },
    async push(config, { products, status }) {
      return {
        status: 'ok',
        platform: 'amazon',
        pushed: products.length,
        statusChanged: status,
      };
    },
  },
  tiktok: {
    normalize(config) {
      return {
        businessId: config.businessId || '',
        accessToken: config.accessToken || '',
      };
    },
    async test(config) {
      if (!config.businessId || !config.accessToken) {
        const err = new Error('TikTok requires businessId and accessToken');
        err.status = 400;
        throw err;
      }
      return { status: 'ok', message: 'TikTok Shop connection validated' };
    },
    async push(config, { products, status }) {
      return {
        status: 'ok',
        platform: 'tiktok',
        pushed: products.length,
        statusChanged: status,
      };
    },
  },
};
