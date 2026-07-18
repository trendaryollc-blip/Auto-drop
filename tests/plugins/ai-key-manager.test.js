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

  describe('New free-tier providers', () => {
    it('should define deepseek provider', () => {
      expect(km.providers.deepseek).toBeDefined();
      expect(km.providers.deepseek.name).toBe('DeepSeek');
      expect(km.providers.deepseek.tier).toBe('free');
      expect(km.providers.deepseek.models).toContain('deepseek-chat');
    });

    it('should define mistral provider', () => {
      expect(km.providers.mistral).toBeDefined();
      expect(km.providers.mistral.tier).toBe('free');
      expect(km.providers.mistral.models).toContain('mistral-small-latest');
    });

    it('should define cohere provider', () => {
      expect(km.providers.cohere).toBeDefined();
      expect(km.providers.cohere.tier).toBe('free');
    });

    it('should define together provider', () => {
      expect(km.providers.together).toBeDefined();
      expect(km.providers.together.tier).toBe('free');
    });

    it('should define huggingface provider', () => {
      expect(km.providers.huggingface).toBeDefined();
      expect(km.providers.huggingface.tier).toBe('free');
    });

    it('should define perplexity provider', () => {
      expect(km.providers.perplexity).toBeDefined();
      expect(km.providers.perplexity.tier).toBe('free');
    });

    it('should define fireworks provider', () => {
      expect(km.providers.fireworks).toBeDefined();
      expect(km.providers.fireworks.tier).toBe('free');
      expect(km.providers.fireworks.models.length).toBeGreaterThan(0);
    });

    it('should define openrouter provider', () => {
      expect(km.providers.openrouter).toBeDefined();
      expect(km.providers.openrouter.tier).toBe('free');
    });

    it('should define replicate provider', () => {
      expect(km.providers.replicate).toBeDefined();
      expect(km.providers.replicate.tier).toBe('free');
    });

    it('should define octoai provider', () => {
      expect(km.providers.octoai).toBeDefined();
      expect(km.providers.octoai.tier).toBe('free');
    });

    it('should define lepton provider', () => {
      expect(km.providers.lepton).toBeDefined();
      expect(km.providers.lepton.tier).toBe('free');
    });

    it('should return Bearer auth for new OpenAI-compatible providers', () => {
      ['deepseek', 'together', 'perplexity'].forEach(function(p) {
        const headers = km.getHeaders(p, 'test-key');
        expect(headers['Authorization']).toBe('Bearer test-key');
      });
    });

    it('should return Bearer auth for mistral and cohere', () => {
      ['mistral', 'cohere', 'huggingface'].forEach(function(p) {
        const headers = km.getHeaders(p, 'test-key');
        expect(headers['Authorization']).toBe('Bearer test-key');
      });
    });

    it('should return Bearer auth for new expanded providers', () => {
      ['fireworks', 'openrouter', 'octoai', 'lepton'].forEach(function(p) {
        const headers = km.getHeaders(p, 'test-key');
        expect(headers['Authorization']).toBe('Bearer test-key');
        expect(headers['Content-Type']).toBe('application/json');
      });
    });
  });

  describe('Per-Feature Key Assignment', () => {
    beforeEach(async () => {
      await HuntDrop.PluginRegistry.init('ai-key-manager');
      await km.saveKey('groq', 'gsk-default');
      await km.saveKey('deepseek', 'sk-deep');
      await km.saveKey('google', 'AI-google');
    });

    it('should define FEATURES with all consumers', () => {
      expect(km.FEATURES['ai-chat-service']).toBeDefined();
      expect(km.FEATURES['ad-studio']).toBeDefined();
      expect(km.FEATURES['ai-business-coach']).toBeDefined();
      expect(km.FEATURES['cb-intelligence-service']).toBeDefined();
    });

    it('init() should set default featureAssignments', async () => {
      const config = HuntDrop.Config.getAll('aiKeys');
      expect(config.featureAssignments).toBeDefined();
    });

    it('getFeatureProvider should return global provider when no assignment', () => {
      expect(km.getFeatureProvider('ad-studio')).toBe('groq');
    });

    it('setFeatureAssignment should save assignment', () => {
      km.setFeatureAssignment('ad-studio', 'deepseek');
      expect(km.getFeatureProvider('ad-studio')).toBe('deepseek');
    });

    it('getFeatureAssignments should return all assignments', () => {
      km.setFeatureAssignment('ad-studio', 'deepseek');
      km.setFeatureAssignment('ai-chat-service', 'google');
      const all = km.getFeatureAssignments();
      expect(all['ad-studio']).toBe('deepseek');
      expect(all['ai-chat-service']).toBe('google');
    });

    it('removeFeatureAssignment should clear assignment', () => {
      km.setFeatureAssignment('ad-studio', 'deepseek');
      km.removeFeatureAssignment('ad-studio');
      expect(km.getFeatureProvider('ad-studio')).toBe('groq');
    });

    it('getFeatureKey should return provider and key for assigned feature', async () => {
      km.setFeatureAssignment('ad-studio', 'deepseek');
      const result = await km.getFeatureKey('ad-studio');
      expect(result.provider).toBe('deepseek');
      expect(result.key).toBe('sk-deep');
    });

    it('getFeatureKey should fall back to global provider when unassigned', async () => {
      const result = await km.getFeatureKey('nonexistent-feature');
      expect(result.provider).toBe('groq');
      expect(result.key).toBe('gsk-default');
    });

    it('hasFeatureKey should check assigned provider key', () => {
      km.setFeatureAssignment('ad-studio', 'deepseek');
      expect(km.hasFeatureKey('ad-studio')).toBe(true);
    });

    it('hasFeatureKey should return false when no key for assigned provider', () => {
      km.setFeatureAssignment('ad-studio', 'anthropic');
      expect(km.hasFeatureKey('ad-studio')).toBe(false);
    });

    it('setFeatureAssignment with empty provider should remove assignment', () => {
      km.setFeatureAssignment('ad-studio', 'deepseek');
      km.setFeatureAssignment('ad-studio', null);
      expect(km.getFeatureProvider('ad-studio')).toBe('groq');
    });
  });
});