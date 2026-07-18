import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module before importing models
const mockDocRef = {
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockCollectionRef = {
  doc: vi.fn(() => mockDocRef),
  where: vi.fn(() => mockCollectionRef),
  limit: vi.fn(() => mockCollectionRef),
  add: vi.fn(),
  get: vi.fn(),
  count: vi.fn(),
};

vi.mock('../database/index.js', () => ({
  collection: vi.fn(() => mockCollectionRef),
}));

import User from '../models/User.js';

describe('User Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const userData = { uid: '123', email: 'test@test.com', displayName: 'Test' };
      mockDocRef.get.mockResolvedValue(userData);

      const result = await User.findById('123');
      expect(result).toEqual(userData);
      expect(mockCollectionRef.doc).toHaveBeenCalledWith('123');
    });

    it('should return null when not found', async () => {
      mockDocRef.get.mockResolvedValue(null);
      const result = await User.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const userData = { uid: '123', email: 'test@test.com' };
      mockCollectionRef.get.mockResolvedValue([{ id: '123', data: () => userData }]);

      const result = await User.findByEmail('test@test.com');
      expect(result).toEqual(userData);
    });

    it('should return null when not found', async () => {
      mockCollectionRef.get.mockResolvedValue([]);
      const result = await User.findByEmail('nobody@test.com');
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should create new user when not exists', async () => {
      mockDocRef.get.mockResolvedValue(null);
      mockDocRef.set.mockResolvedValue({ id: '123' });

      const result = await User.upsert({
        uid: '123',
        email: 'test@test.com',
        displayName: 'Test',
      });

      expect(mockDocRef.set).toHaveBeenCalled();
      expect(result.email).toBe('test@test.com');
    });

    it('should update existing user', async () => {
      const existing = { uid: '123', email: 'test@test.com', settings: {} };
      mockDocRef.get.mockResolvedValue(existing);
      mockDocRef.update.mockResolvedValue({});

      await User.upsert({ uid: '123', email: 'test@test.com' });
      expect(mockDocRef.update).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should merge settings', async () => {
      const existing = { uid: '123', settings: { theme: 'dark', currency: 'USD' } };
      mockDocRef.get.mockResolvedValue(existing);
      mockDocRef.update.mockResolvedValue({});

      await User.updateSettings('123', { theme: 'light' });
      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({ theme: 'light' }),
        })
      );
    });

    it('should throw if user not found', async () => {
      mockDocRef.get.mockResolvedValue(null);
      await expect(User.updateSettings('nonexistent', {})).rejects.toThrow('User not found');
    });
  });
});
