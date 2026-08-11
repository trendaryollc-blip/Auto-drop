import { describe, it, expect } from 'vitest';
import { PlatformConnectors } from '../utils/platform-connectors.js';

describe('PlatformConnectors', () => {
  describe('trendaryo', () => {
    it('should normalize config', () => {
      const normalized = PlatformConnectors.trendaryo.normalize({ storeId: 's', apiKey: 'k' });
      expect(normalized).toEqual({ storeId: 's', apiKey: 'k' });
    });

    it('should validate connection', async () => {
      const result = await PlatformConnectors.trendaryo.test({ storeId: 's', apiKey: 'k' });
      expect(result).toEqual({ status: 'ok', message: 'Trendaryo connection valid' });
    });

    it('should fail validation for missing credentials', async () => {
      await expect(PlatformConnectors.trendaryo.test({ storeId: '', apiKey: '' })).rejects.toThrow('Trendaryo requires storeId and apiKey');
    });

    it('should push products', async () => {
      const result = await PlatformConnectors.trendaryo.push({ storeId: 's', apiKey: 'k' }, { products: [{ id: 'p1' }], status: 'active' });
      expect(result).toEqual({ status: 'ok', platform: 'trendaryo', pushed: 1, statusChanged: 'active' });
    });
  });

  describe('shopify', () => {
    it('should normalize config', () => {
      expect(PlatformConnectors.shopify.normalize({ shop: 'test.myshopify.com', accessToken: 'token' })).toEqual({ shop: 'test.myshopify.com', accessToken: 'token' });
    });

    it('should validate connection', async () => {
      expect(await PlatformConnectors.shopify.test({ shop: 'test.myshopify.com', accessToken: 'token' })).toEqual({ status: 'ok', message: 'Shopify API credentials look valid' });
    });

    it('should fail validation for missing access token', async () => {
      await expect(PlatformConnectors.shopify.test({ shop: 'test.myshopify.com' })).rejects.toThrow('Shopify requires shop and accessToken');
    });
  });

  describe('woocommerce', () => {
    it('should normalize config', () => {
      expect(PlatformConnectors.woocommerce.normalize({ storeUrl: 'https://shop.com', consumerKey: 'ck', consumerSecret: 'cs' })).toEqual({ storeUrl: 'https://shop.com', consumerKey: 'ck', consumerSecret: 'cs' });
    });

    it('should validate connection', async () => {
      expect(await PlatformConnectors.woocommerce.test({ storeUrl: 'https://shop.com', consumerKey: 'ck', consumerSecret: 'cs' })).toEqual({ status: 'ok', message: 'WooCommerce credentials look valid' });
    });

    it('should fail validation for missing secret', async () => {
      await expect(PlatformConnectors.woocommerce.test({ storeUrl: 'https://shop.com', consumerKey: 'ck' })).rejects.toThrow('WooCommerce requires storeUrl, consumerKey, and consumerSecret');
    });
  });

  describe('amazon', () => {
    it('should normalize config', () => {
      expect(PlatformConnectors.amazon.normalize({ merchantId: 'M1', accessKey: 'AK', secretKey: 'SK', marketplaceId: 'MK' })).toEqual({ merchantId: 'M1', accessKey: 'AK', secretKey: 'SK', marketplaceId: 'MK' });
    });

    it('should validate connection', async () => {
      expect(await PlatformConnectors.amazon.test({ merchantId: 'M1', accessKey: 'AK', secretKey: 'SK', marketplaceId: 'MK' })).toEqual({ status: 'ok', message: 'Amazon connector validated' });
    });

    it('should fail validation when missing marketplaceId', async () => {
      await expect(PlatformConnectors.amazon.test({ merchantId: 'M1', accessKey: 'AK', secretKey: 'SK' })).rejects.toThrow('Amazon requires merchantId, accessKey, secretKey, and marketplaceId');
    });
  });

  describe('tiktok', () => {
    it('should normalize config', () => {
      expect(PlatformConnectors.tiktok.normalize({ businessId: 'B1', accessToken: 'AT' })).toEqual({ businessId: 'B1', accessToken: 'AT' });
    });

    it('should validate connection', async () => {
      expect(await PlatformConnectors.tiktok.test({ businessId: 'B1', accessToken: 'AT' })).toEqual({ status: 'ok', message: 'TikTok Shop connection validated' });
    });

    it('should fail validation for missing businessId', async () => {
      await expect(PlatformConnectors.tiktok.test({ accessToken: 'AT' })).rejects.toThrow('TikTok requires businessId and accessToken');
    });
  });
});
