// ============================================================================
// TESTS: Search Edge Cases — Empty queries, special chars, filters, concurrency
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCoreWithPlugins, setupDashboardDOM, createSampleProduct, flushPromises } from './setup.js';

describe('Search Engine — Edge Cases', () => {
  let HuntDrop;

  beforeEach(() => {
    setupDashboardDOM();
    ({ HuntDrop } = loadCoreWithPlugins(['plugins/data-adapters.js', 'plugins/search-engine.js']));
  });

  describe('fuzzyMatch() — edge cases', () => {
    it('should match empty query against any text', () => {
      expect(HuntDrop.fuzzyMatch('hello world', '')).toBe(true);
    });

    it('should match empty text with empty query', () => {
      expect(HuntDrop.fuzzyMatch('', '')).toBe(true);
    });

    it('should not match non-empty query against empty text', () => {
      expect(HuntDrop.fuzzyMatch('', 'test')).toBe(false);
    });

    it('should handle single character query', () => {
      expect(HuntDrop.fuzzyMatch('hello', 'h')).toBe(true);
    });

    it('should handle single character text', () => {
      expect(HuntDrop.fuzzyMatch('a', 'a')).toBe(true);
      expect(HuntDrop.fuzzyMatch('a', 'b')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(HuntDrop.fuzzyMatch('HELLO WORLD', 'hello')).toBe(true);
      expect(HuntDrop.fuzzyMatch('hello world', 'HELLO')).toBe(true);
    });

    it('should handle special characters in query', () => {
      expect(HuntDrop.fuzzyMatch('price $10.00', '$10')).toBe(true);
      expect(HuntDrop.fuzzyMatch('item #123', '#123')).toBe(true);
    });

    it('should handle unicode characters', () => {
      expect(HuntDrop.fuzzyMatch('café latte', 'café')).toBe(true);
    });

    it('should handle very long text', () => {
      const longText = 'a'.repeat(10000) + 'target' + 'b'.repeat(10000);
      expect(HuntDrop.fuzzyMatch(longText, 'target')).toBe(true);
    });

    it('should handle very long query within tolerance', () => {
      const text = 'abcdefghij';
      expect(HuntDrop.fuzzyMatch(text, 'abcdefghij')).toBe(true);
    });

    it('should handle query with only whitespace (treated as part of query)', () => {
      expect(HuntDrop.fuzzyMatch('hello world', ' ')).toBe(true);
    });

    it('should handle consecutive typos within tolerance', () => {
      // "hello" -> "helo" (one deletion)
      expect(HuntDrop.fuzzyMatch('hello', 'helo')).toBe(true);
    });

    it('should reject too many consecutive misses', () => {
      expect(HuntDrop.fuzzyMatch('abc', 'axxxbxxxc')).toBe(false);
    });
  });

  describe('levenshtein() — edge cases', () => {
    it('should return 0 for identical empty strings', () => {
      expect(HuntDrop.levenshtein('', '')).toBe(0);
    });

    it('should return length of longer string when one is empty', () => {
      expect(HuntDrop.levenshtein('', 'abc')).toBe(3);
      expect(HuntDrop.levenshtein('abc', '')).toBe(3);
    });

    it('should handle single character substitution', () => {
      expect(HuntDrop.levenshtein('a', 'b')).toBe(1);
    });

    it('should handle transposition (2 edits minimum)', () => {
      expect(HuntDrop.levenshtein('ab', 'ba')).toBe(2);
    });

    it('should handle Unicode characters', () => {
      expect(HuntDrop.levenshtein('café', 'cafe')).toBe(1);
    });

    it('should be symmetric', () => {
      expect(HuntDrop.levenshtein('abc', 'xyz')).toBe(HuntDrop.levenshtein('xyz', 'abc'));
    });

    it('should handle very long strings', () => {
      const a = 'a'.repeat(100);
      const b = 'a'.repeat(99) + 'b';
      expect(HuntDrop.levenshtein(a, b)).toBe(1);
    });
  });

  describe('Search via EventBus — edge cases', () => {
    beforeEach(async () => {
      await HuntDrop.PluginRegistry.init('search-engine');
      await HuntDrop.PluginRegistry.mount('search-engine');
    });

    it('should return demo catalog for empty query in API-only mode (no connected platforms)', async () => {
      const resultsCb = vi.fn();
      HuntDrop.EventBus.on('search:results', resultsCb);
      await HuntDrop.EventBus.emit('search:query', { query: '', filters: {} });
      await flushPromises(50);
      expect(resultsCb).toHaveBeenCalled();
      const results = resultsCb.mock.calls[0][0].results;
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for nonsense query', async () => {
      const resultsCb = vi.fn();
      HuntDrop.EventBus.on('search:results', resultsCb);
      await HuntDrop.EventBus.emit('search:query', { query: 'xyzzyplugh12345', filters: {} });
      await flushPromises(50);
      const results = resultsCb.mock.calls[0][0].results;
      expect(results.length).toBe(0);
    });

    it('should handle concurrent searches without data corruption', async () => {
      const results1 = vi.fn();
      const results2 = vi.fn();
      HuntDrop.EventBus.on('search:results', results1);
      HuntDrop.EventBus.on('search:results', results2);

      await Promise.all([
        HuntDrop.EventBus.emit('search:query', { query: 'wireless', filters: {} }),
        HuntDrop.EventBus.emit('search:query', { query: 'pet', filters: {} }),
      ]);
      await flushPromises(50);

      expect(results1).toHaveBeenCalled();
      expect(results2).toHaveBeenCalled();
    });

    it('should handle search:query with missing filters', async () => {
      const resultsCb = vi.fn();
      HuntDrop.EventBus.on('search:results', resultsCb);
      await HuntDrop.EventBus.emit('search:query', { query: 'test' });
      await flushPromises(50);
      expect(resultsCb).toHaveBeenCalled();
    });

    it('should handle search:query with missing query', async () => {
      const resultsCb = vi.fn();
      HuntDrop.EventBus.on('search:results', resultsCb);
      await HuntDrop.EventBus.emit('search:query', {});
      await flushPromises(50);
      expect(resultsCb).toHaveBeenCalled();
    });

    it('should handle filter:changed with empty data', async () => {
      const resultsCb = vi.fn();
      HuntDrop.EventBus.on('search:results', resultsCb);
      await HuntDrop.EventBus.emit('filter:changed', {});
      await flushPromises(50);
      expect(resultsCb).toHaveBeenCalled();
    });

    it('should persist lastQuery in config when searching', async () => {
      await HuntDrop.EventBus.emit('search:query', { query: 'testquery', filters: {} });
      await flushPromises(50);
      expect(HuntDrop.Config.get('search.lastQuery')).toBe('testquery');
    });

    it('should use lastQuery for filter:changed when no query provided', async () => {
      HuntDrop.Config.set('search.lastQuery', 'storedquery');
      const resultsCb = vi.fn();
      HuntDrop.EventBus.on('search:results', resultsCb);
      await HuntDrop.EventBus.emit('filter:changed', { filters: {} });
      await flushPromises(50);
      expect(resultsCb).toHaveBeenCalled();
      const callArg = resultsCb.mock.calls[0][0];
      expect(callArg.query).toBe('storedquery');
    });
  });
});
