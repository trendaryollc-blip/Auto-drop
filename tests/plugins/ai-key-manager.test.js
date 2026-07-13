// ============================================================================
// TESTS: plugins/ai-key-manager.js — API key storage, verification, provider config
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugin } from '../setup.js';

describe('ai-key-manager plugin', () => {
  let HuntDrop;
  let km;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugin('plugins/ai-key-manager.js'));
    km = HuntDrop.APIKeyManager;
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(HuntDrop.PluginRegistry.get('ai-key-manager')).toBeDefined();
    });

    it('should expose APIKeyManager on HuntDrop', () => {
      expect(km).toBeDefined();
      expect(km.id).toBe('ai-key-manager');
    });

    it('should define providers for openai, anthropic, google, groq', () => {
      expect(km.providers.openai).toBeDefined();
      expect(km.providers.anthropic).toBeDefined();
      expect(km.providers.google).toBeDefined();
      expect(km.providers.groq).toBeDefined();
    });

    it('should have correct provider configs', () => {
      expect(km.providers.openai.name).toBe('OpenAI');
      expect(km.providers.openai.endpoint).toContain('openai.com');
      expect(km.providers.openai.models.length).toBeGreaterThan(0);
      expect(km.providers.groq.name).toContain('Groq');
    });
  });

  describe('init()', () => {
    it('should set aiKeys config defaults', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      const config = HuntDrop.Config.getAll('aiKeys');
      expect(config.provider).toBe('groq');
      expect(config.model).toBe('llama3-70b-8192');
      expect(config.keys).toEqual({});
    });
  });

  describe('getProvider() / getModel()', () => {
    it('should return default provider (groq)', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      expect(km.getProvider()).toBe('groq');
    });

    it('should return default model', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      expect(km.getModel()).toBe('llama3-70b-8192');
    });
  });

  describe('setProvider() / setModel()', () => {
    it('should set provider', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      km.setProvider('openai');
      expect(km.getProvider()).toBe('openai');
    });

    it('should update model when switching to provider with different models', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      km.setModel('custom-model');
      km.setProvider('anthropic');
      // Model should be reset to first anthropic model since current isn't valid
      expect(km.getModel()).toBe(km.providers.anthropic.models[0]);
    });

    it('should set model', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      km.setModel('gpt-4o');
      expect(km.getModel()).toBe('gpt-4o');
    });
  });

  describe('saveKey() / getKey()', () => {
    it('should save and retrieve a key', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      await km.saveKey('openai', 'sk-test-key-123');
      const retrieved = await km.getKey('openai');
      expect(retrieved).toBe('sk-test-key-123');
    });

    it('should return null for non-existent key', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      const retrieved = await km.getKey('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should encrypt the key (not store in plaintext)', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      await km.saveKey('groq', 'gsk-secret-key');
      const keys = HuntDrop.Config.get('aiKeys.keys');
      // The stored value should not be the plaintext
      expect(keys.groq).not.toBe('gsk-secret-key');
    });
  });

  describe('removeKey()', () => {
    it('should remove a stored key', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      await km.saveKey('openai', 'sk-test');
      km.removeKey('openai');
      expect(await km.getKey('openai')).toBeNull();
    });
  });

  describe('hasKey()', () => {
    it('should return false when no key exists', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      expect(km.hasKey('openai')).toBe(false);
    });

    it('should return true when key exists', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      await km.saveKey('openai', 'sk-test');
      expect(km.hasKey('openai')).toBe(true);
    });

    it('should use current provider when no argument given', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      km.setProvider('groq');
      await km.saveKey('groq', 'gsk-test');
      expect(km.hasKey()).toBe(true);
    });
  });

  describe('getHeaders()', () => {
    it('should return Bearer auth for openai', () => {
      const headers = km.getHeaders('openai', 'sk-test');
      expect(headers['Authorization']).toBe('Bearer sk-test');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should return Bearer auth for groq', () => {
      const headers = km.getHeaders('groq', 'gsk-test');
      expect(headers['Authorization']).toBe('Bearer gsk-test');
    });

    it('should return x-api-key for anthropic', () => {
      const headers = km.getHeaders('anthropic', 'sk-ant-test');
      expect(headers['x-api-key']).toBe('sk-ant-test');
      expect(headers['anthropic-version']).toBe('2023-06-01');
    });

    it('should return basic headers for google', () => {
      const headers = km.getHeaders('google', 'AItest');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should return default headers for unknown provider', () => {
      const headers = km.getHeaders('unknown', 'key');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('verifyKey()', () => {
    it('should return false for unknown provider', async () => {
      const result = await km.verifyKey('unknown', 'key');
      expect(result).toBe(false);
    });

    it('should return false when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const result = await km.verifyKey('openai', 'sk-test');
      expect(result).toBe(false);
    });

    it('should return true when fetch succeeds (openai)', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      const result = await km.verifyKey('openai', 'sk-test');
      expect(result).toBe(true);
    });

    it('should return true when fetch succeeds (google)', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      const result = await km.verifyKey('google', 'AItest');
      expect(result).toBe(true);
    });
  });

  describe('getStatus()', () => {
    it('should return status object with provider info', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      const status = km.getStatus();
      expect(status.provider).toBeDefined();
      expect(status.providerName).toBeDefined();
      expect(status.hasKey).toBe(false);
      expect(status.model).toBeDefined();
      expect(status.connected).toBe(false);
      expect(status.color).toBeDefined();
    });

    it('should report connected when key exists', async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      await km.saveKey('groq', 'gsk-test');
      const status = km.getStatus();
      expect(status.hasKey).toBe(true);
      expect(status.connected).toBe(true);
    });
  });
});