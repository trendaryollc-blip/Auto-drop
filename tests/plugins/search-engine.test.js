// ============================================================================
// TESTS: plugins/search-engine.js — Fuzzy search with typo tolerance
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugin, createSampleProduct } from '../setup.js';

describe('search-engine plugin', () => {
  let HuntDrop;

  beforeEach(() => {
    ({ HuntDrop } = loadCoreWithPlugin('plugins/search-engine.js'));
  });

  describe('fuzzyMatch()', () => {
    it('should return true for exact substring match', () => {
      expect(HuntDrop.fuzzyMatch('wireless earbuds', 'wireless')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(HuntDrop.fuzzyMatch('Wireless Earbuds', 'WIRELESS')).toBe(true);
    });

    it('should match with minor typos', () => {
      expect(HuntDrop.fuzzyMatch('wireless earbuds', 'wireles')).toBe(true);
    });

    it('should match with characters in sequence (subsequence match)', () => {
      // Use a subsequence that fits within the 30% miss tolerance
      expect(HuntDrop.fuzzyMatch('wireless earbuds', 'wreless')).toBe(true);
    });

    it('should return false for completely different text', () => {
      expect(HuntDrop.fuzzyMatch('wireless earbuds', 'xyzabc')).toBe(false);
    });

    it('should return false when too many misses', () => {
      expect(HuntDrop.fuzzyMatch('abc', 'axxxxxxxxxbxxxxxxxxxc')).toBe(false);
    });

    it('should handle empty query', () => {
      expect(HuntDrop.fuzzyMatch('anything', '')).toBe(true);
    });

    it('should handle query longer than text', () => {
      expect(HuntDrop.fuzzyMatch('ab', 'abcdef')).toBe(false);
    });
  });

  describe('levenshtein()', () => {
    it('should return 0 for identical strings', () => {
      expect(HuntDrop.levenshtein('hello', 'hello')).toBe(0);
    });

    it('should return length for empty vs non-empty', () => {
      expect(HuntDrop.levenshtein('', 'hello')).toBe(5);
      expect(HuntDrop.levenshtein('hello', '')).toBe(5);
    });

    it('should return 1 for single character difference', () => {
      expect(HuntDrop.levenshtein('cat', 'bat')).toBe(1);
    });

    it('should return correct distance for insertion', () => {
      expect(HuntDrop.levenshtein('cat', 'cats')).toBe(1);
    });

    it('should return correct distance for deletion', () => {
      expect(HuntDrop.levenshtein('cats', 'cat')).toBe(1);
    });

    it('should return correct distance for multiple edits', () => {
      expect(HuntDrop.levenshtein('kitten', 'sitting')).toBe(3);
    });
  });

  describe('Plugin registration', () => {
    it('should register with PluginRegistry', () => {
      expect(HuntDrop.PluginRegistry.get('search-engine')).toBeDefined();
      expect(HuntDrop.PluginRegistry.get('search-engine').name).toBe('Search Engine');
    });

    it('should expose fuzzyMatch and levenshtein on HuntDrop', () => {
      expect(typeof HuntDrop.fuzzyMatch).toBe('function');
      expect(typeof HuntDrop.levenshtein).toBe('function');
    });
  });

  describe('Plugin init', () => {
    it('should set search config defaults on init', async () => {
      await HuntDrop.PluginRegistry.init('search-engine');
      const searchConfig = HuntDrop.Config.getAll('search');
      expect(searchConfig.platforms).toBeDefined();
      expect(searchConfig.defaultPlatform).toBe('all');
      expect(searchConfig.minScore).toBe(0);
      expect(searchConfig.sortBy).toBe('score');
    });
  });

  describe('Plugin mount — event handling', () => {
    it('should handle search:query event and emit search:results', async () => {
      // Register a mock adapter so searchAll works
      HuntDrop.DataLayer.registerAdapter('all', {
        search: async () => [createSampleProduct()],
      });

      await HuntDrop.PluginRegistry.init('search-engine');
      await HuntDrop.PluginRegistry.mount('search-engine');

      const resultsCb = vi.fn();
      HuntDrop.EventBus.on('search:results', resultsCb);

      await HuntDrop.EventBus.emit('search:query', { query: 'test', filters: {} });

      expect(resultsCb).toHaveBeenCalledWith(expect.objectContaining({
        query: 'test',
        total: 1,
      }));
    });

    it('should handle filter:changed event and emit search:results', async () => {
      HuntDrop.DataLayer.registerAdapter('all', {
        search: async () => [createSampleProduct()],
      });

      await HuntDrop.PluginRegistry.init('search-engine');
      await HuntDrop.PluginRegistry.mount('search-engine');

      const resultsCb = vi.fn();
      HuntDrop.EventBus.on('search:results', resultsCb);

      await HuntDrop.EventBus.emit('filter:changed', { filters: {} });

      expect(resultsCb).toHaveBeenCalled();
    });
  });
});