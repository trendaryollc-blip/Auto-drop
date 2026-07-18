import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDocRef = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
};

function createMockCollection() {
  let storedData = [];
  let filters = [];
  let limitVal = null;

  const chain = {
    doc: vi.fn(() => mockDocRef),
    where: vi.fn(function (field, op, value) {
      filters.push({ field, op, value });
      return chain;
    }),
    limit: vi.fn(function (n) {
      limitVal = n;
      return chain;
    }),
    add: vi.fn().mockResolvedValue({ id: 'new-id' }),
    get: vi.fn(),
    count: vi.fn(),
  };

  chain._applyFilters = function (data) {
    let result = [...data];
    for (const f of filters) {
      result = result.filter(item => {
        const val = item[f.field];
        if (f.op === '==') return val === f.value;
        if (f.op === '>=') return val >= f.value;
        if (f.op === '<=') return val <= f.value;
        return true;
      });
    }
    if (limitVal !== null && result.length > limitVal) {
      result = result.slice(0, limitVal);
    }
    return result;
  };

  chain._reset = function () {
    filters = [];
    limitVal = null;
    storedData = [];
  };

  chain._setStoredData = function (data) {
    storedData = data;
  };

  chain.get.mockImplementation(function () {
    const filtered = chain._applyFilters(storedData);
    return Promise.resolve(filtered.map(item => ({ data: () => item, id: item.id || 'id' })));
  });

  chain.count.mockImplementation(function () {
    const filtered = chain._applyFilters(storedData);
    return Promise.resolve(filtered.length);
  });

  return chain;
}

const mockCollectionRef = createMockCollection();

vi.mock('../database/index.js', () => ({
  collection: vi.fn(() => mockCollectionRef),
}));

import Product from '../models/Product.js';

const SAMPLE_PRODUCTS = [
  { id: '1', title: 'Wireless Earbuds', platform: 'aliexpress', price: 15, score: 90, competition: 'low', margin: 45, salesVelocity: 200, keywords: ['audio', 'bluetooth'], category: 'Electronics' },
  { id: '2', title: 'Yoga Mat', platform: 'amazon', price: 25, score: 80, competition: 'medium', margin: 35, salesVelocity: 150, keywords: ['fitness', 'yoga'], category: 'Sports' },
  { id: '3', title: 'Phone Case', platform: 'aliexpress', price: 5, score: 95, competition: 'high', margin: 60, salesVelocity: 300, keywords: ['mobile', 'protection'], category: 'Electronics' },
  { id: '4', title: 'LED Strip Lights', platform: 'shopify', price: 12, score: 70, competition: 'low', margin: 55, salesVelocity: 100, keywords: ['lighting', 'decor'], category: 'Home' },
  { id: '5', title: 'Bluetooth Speaker', platform: 'amazon', price: 35, score: 85, competition: 'medium', margin: 40, salesVelocity: 180, keywords: ['audio', 'wireless'], category: 'Electronics' },
];

describe('Product Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionRef._reset();
    mockCollectionRef._setStoredData(SAMPLE_PRODUCTS);
  });

  describe('upsert', () => {
    it('should create new product when not exists', async () => {
      mockDocRef.get.mockResolvedValue(null);

      const result = await Product.upsert({
        id: '1',
        title: 'Test Product',
        platform: 'aliexpress',
        price: 29.99,
      });

      expect(mockDocRef.set).toHaveBeenCalled();
      expect(result.id).toBe('1');
      expect(result.title).toBe('Test Product');
      expect(result.platform).toBe('aliexpress');
      expect(result.price).toBe(29.99);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should update existing product', async () => {
      mockDocRef.get.mockResolvedValue({ id: '1', title: 'Old Product' });

      const result = await Product.upsert({
        id: '1',
        title: 'Updated Product',
      });

      expect(mockDocRef.update).toHaveBeenCalled();
      expect(result.title).toBe('Updated Product');
      expect(result.updatedAt).toBeDefined();
    });

    it('should fill defaults for missing fields', async () => {
      mockDocRef.get.mockResolvedValue(null);

      const result = await Product.upsert({ id: '2' });

      expect(result.title).toBe('');
      expect(result.image).toBe('');
      expect(result.platform).toBe('');
      expect(result.price).toBe(0);
      expect(result.score).toBe(0);
      expect(result.badges).toEqual([]);
      expect(result.competition).toBe('medium');
      expect(result.audience).toEqual({ age: '', gender: '', interests: [], countries: [] });
    });

    it('should convert id to string', async () => {
      mockDocRef.get.mockResolvedValue(null);

      const result = await Product.upsert({ id: 123, title: 'Numeric ID' });

      expect(mockCollectionRef.doc).toHaveBeenCalledWith('123');
      expect(result.id).toBe('123');
    });

    it('should preserve provided fields', async () => {
      mockDocRef.get.mockResolvedValue(null);

      const result = await Product.upsert({
        id: '3',
        title: 'Full Product',
        image: 'http://img.jpg',
        platform: 'amazon',
        price: 49.99,
        originalPrice: 59.99,
        margin: 25,
        score: 92,
        badges: ['Trending'],
        salesVelocity: 150,
        competition: 'low',
        demand: 85,
        rating: 4.7,
        reviews: 340,
        orders: '1200',
        shipFrom: 'China',
        category: 'Electronics',
        keywords: ['earbuds', 'wireless'],
        suppliers: [{ name: 'Supplier A' }],
        platformPrices: { aliexpress: 29.99, amazon: 49.99 },
        trendData: [10, 20, 30],
        seasonality: [5, 10, 15],
        audience: { age: '18-34', gender: 'all', interests: ['tech'], countries: ['US'] },
        riskScore: 15,
        marketSaturation: 40,
        adSpendAvg: 5.5,
        cpaAvg: 8.2,
        aiInsight: 'Good product',
      });

      expect(result.title).toBe('Full Product');
      expect(result.image).toBe('http://img.jpg');
      expect(result.platform).toBe('amazon');
      expect(result.price).toBe(49.99);
      expect(result.keywords).toEqual(['earbuds', 'wireless']);
      expect(result.trendData).toEqual([10, 20, 30]);
      expect(result.aiInsight).toBe('Good product');
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      const product = { id: '1', title: 'Test' };
      mockDocRef.get.mockResolvedValue(product);

      const result = await Product.findById('1');
      expect(result).toEqual(product);
      expect(mockCollectionRef.doc).toHaveBeenCalledWith('1');
    });

    it('should return null when not found', async () => {
      mockDocRef.get.mockResolvedValue(null);
      const result = await Product.findById('999');
      expect(result).toBeNull();
    });

    it('should convert numeric id to string', async () => {
      mockDocRef.get.mockResolvedValue({ id: '42' });
      await Product.findById(42);
      expect(mockCollectionRef.doc).toHaveBeenCalledWith('42');
    });
  });

  describe('getAll', () => {
    it('should return all products', async () => {
      const result = await Product.getAll();
      expect(result).toHaveLength(5);
      expect(result[0].title).toBe('Wireless Earbuds');
    });

    it('should respect limit parameter', async () => {
      await Product.getAll(3);
      expect(mockCollectionRef.limit).toHaveBeenCalledWith(3);
    });

    it('should default to limit 200', async () => {
      await Product.getAll();
      expect(mockCollectionRef.limit).toHaveBeenCalledWith(200);
    });

    it('should return empty array when no products', async () => {
      mockCollectionRef._setStoredData([]);
      const result = await Product.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete product by id', async () => {
      await Product.delete('1');
      expect(mockDocRef.delete).toHaveBeenCalled();
      expect(mockCollectionRef.doc).toHaveBeenCalledWith('1');
    });

    it('should convert numeric id to string', async () => {
      await Product.delete(42);
      expect(mockCollectionRef.doc).toHaveBeenCalledWith('42');
    });
  });

  describe('count', () => {
    it('should return total count', async () => {
      const result = await Product.count();
      expect(result).toBe(5);
    });
  });

  describe('search', () => {
    it('should return all products with no filters', async () => {
      const results = await Product.search();
      expect(results).toHaveLength(5);
    });

    it('should filter by query text in title', async () => {
      const results = await Product.search({ query: 'earbuds' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Wireless Earbuds');
    });

    it('should filter by query text in keywords', async () => {
      const results = await Product.search({ query: 'bluetooth' });
      expect(results).toHaveLength(2);
    });

    it('should filter by query text in category', async () => {
      const results = await Product.search({ query: 'sports' });
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Sports');
    });

    it('should be case insensitive for query', async () => {
      const results = await Product.search({ query: 'WIRELESS' });
      expect(results).toHaveLength(2);
    });

    it('should filter by platform (DB-level)', async () => {
      const results = await Product.search({ platform: 'amazon' });
      expect(results).toHaveLength(2);
      results.forEach(p => expect(p.platform).toBe('amazon'));
    });

    it('should not filter when platform is "all"', async () => {
      const results = await Product.search({ platform: 'all' });
      expect(results).toHaveLength(5);
    });

    it('should filter by priceMax (client-side)', async () => {
      const results = await Product.search({ priceMax: 15 });
      expect(results).toHaveLength(3);
      results.forEach(p => expect(p.price).toBeLessThanOrEqual(15));
    });

    it('should filter by minScore (DB-level)', async () => {
      const results = await Product.search({ minScore: 85 });
      expect(results).toHaveLength(3);
      results.forEach(p => expect(p.score).toBeGreaterThanOrEqual(85));
    });

    it('should filter by competition (client-side)', async () => {
      const results = await Product.search({ competition: 'low' });
      expect(results).toHaveLength(2);
      results.forEach(p => expect(p.competition).toBe('low'));
    });

    it('should not filter when competition is "all"', async () => {
      const results = await Product.search({ competition: 'all' });
      expect(results).toHaveLength(5);
    });

    it('should filter by margin (client-side)', async () => {
      const results = await Product.search({ margin: 50 });
      expect(results).toHaveLength(2);
      results.forEach(p => expect(p.margin).toBeGreaterThanOrEqual(50));
    });

    it('should combine multiple filters', async () => {
      const results = await Product.search({ platform: 'aliexpress', priceMax: 15 });
      expect(results).toHaveLength(2);
      results.forEach(p => {
        expect(p.platform).toBe('aliexpress');
        expect(p.price).toBeLessThanOrEqual(15);
      });
    });

    it('should sort by score descending', async () => {
      const results = await Product.search({ sort: 'score' });
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });

    it('should sort by trending (salesVelocity) descending', async () => {
      const results = await Product.search({ sort: 'trending' });
      expect(results[0].salesVelocity).toBeGreaterThanOrEqual(results[1].salesVelocity);
    });

    it('should sort by profit (margin) descending', async () => {
      const results = await Product.search({ sort: 'profit' });
      expect(results[0].margin).toBeGreaterThanOrEqual(results[1].margin);
    });

    it('should sort by velocity descending', async () => {
      const results = await Product.search({ sort: 'velocity' });
      expect(results[0].salesVelocity).toBeGreaterThanOrEqual(results[1].salesVelocity);
    });

    it('should sort by competition (low before high)', async () => {
      const results = await Product.search({ sort: 'competition' });
      const order = { low: 0, medium: 1, high: 2 };
      for (let i = 1; i < results.length; i++) {
        const prev = order[results[i - 1].competition] || 1;
        const curr = order[results[i].competition] || 1;
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('should sort by price-low ascending', async () => {
      const results = await Product.search({ sort: 'price-low' });
      expect(results[0].price).toBeLessThanOrEqual(results[1].price);
    });

    it('should sort by price-high descending', async () => {
      const results = await Product.search({ sort: 'price-high' });
      expect(results[0].price).toBeGreaterThanOrEqual(results[1].price);
    });

    it('should apply limit (DB-level)', async () => {
      const results = await Product.search({ limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should handle empty query string', async () => {
      const results = await Product.search({ query: '' });
      expect(results).toHaveLength(5);
    });

    it('should handle query with no matches', async () => {
      const results = await Product.search({ query: 'zzznotfound' });
      expect(results).toHaveLength(0);
    });
  });
});
