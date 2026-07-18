import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/User.js', () => ({
  default: {
    upsert: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../models/SearchHistory.js', () => ({
  default: {
    getRecent: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock('../models/SavedProduct.js', () => ({
  default: {
    countByUser: vi.fn(),
  },
}));

vi.mock('../models/Calculation.js', () => ({
  default: {
    countByUser: vi.fn(),
  },
}));

vi.mock('../middleware/auth.js', () => ({
  signToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../utils/helpers.js', () => ({
  isValidEmail: vi.fn((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  sanitize: vi.fn((str) => typeof str === 'string' ? str.replace(/<[^>]*>/g, '').trim() : ''),
}));

import AuthService from '../services/AuthService.js';
import User from '../models/User.js';
import SearchHistory from '../models/SearchHistory.js';
import SavedProduct from '../models/SavedProduct.js';
import Calculation from '../models/Calculation.js';
import { signToken } from '../middleware/auth.js';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      User.findByEmail.mockResolvedValue(null);
      User.upsert.mockResolvedValue({ uid: 'new-uid', email: 'new@test.com' });

      const result = await AuthService.register({
        email: 'new@test.com',
        password: 'password123',
        displayName: 'Test User',
      });

      expect(result.user).toBeDefined();
      expect(result.token).toBe('mock-token');
      expect(User.findByEmail).toHaveBeenCalledWith('new@test.com');
      expect(User.upsert).toHaveBeenCalled();
      expect(signToken).toHaveBeenCalled();
    });

    it('should throw BadRequestError on invalid email', async () => {
      await expect(
        AuthService.register({ email: 'invalid', password: 'password123' })
      ).rejects.toThrow('Invalid email');
    });

    it('should throw BadRequestError on empty email', async () => {
      await expect(
        AuthService.register({ email: '', password: 'password123' })
      ).rejects.toThrow('Invalid email');
    });

    it('should throw BadRequestError on short password', async () => {
      await expect(
        AuthService.register({ email: 'test@test.com', password: '123' })
      ).rejects.toThrow('Password must be at least 6 characters');
    });

    it('should throw BadRequestError on empty password', async () => {
      await expect(
        AuthService.register({ email: 'test@test.com', password: '' })
      ).rejects.toThrow('Password must be at least 6 characters');
    });

    it('should throw ConflictError if user already exists', async () => {
      User.findByEmail.mockResolvedValue({ uid: 'existing', email: 'existing@test.com' });

      await expect(
        AuthService.register({ email: 'existing@test.com', password: 'password123' })
      ).rejects.toThrow('already exists');
    });

    it('should default displayName to email prefix', async () => {
      User.findByEmail.mockResolvedValue(null);
      User.upsert.mockResolvedValue({ uid: 'new-uid' });

      await AuthService.register({ email: 'john@test.com', password: 'password123' });

      expect(User.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'john' })
      );
    });
  });

  describe('login', () => {
    it('should login existing user', async () => {
      const user = { uid: 'user1', email: 'test@test.com' };
      User.findByEmail.mockResolvedValue(user);

      const result = await AuthService.login({ email: 'test@test.com', password: 'pass123' });

      expect(result.user).toEqual(user);
      expect(result.token).toBe('mock-token');
      expect(signToken).toHaveBeenCalledWith({ uid: 'user1', email: 'test@test.com' });
    });

    it('should throw BadRequestError on missing email', async () => {
      await expect(
        AuthService.login({ password: 'pass123' })
      ).rejects.toThrow('Email and password are required');
    });

    it('should throw BadRequestError on missing password', async () => {
      await expect(
        AuthService.login({ email: 'test@test.com' })
      ).rejects.toThrow('Email and password are required');
    });

    it('should throw UnauthorizedError on non-existent user', async () => {
      User.findByEmail.mockResolvedValue(null);

      await expect(
        AuthService.login({ email: 'nobody@test.com', password: 'pass123' })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('oauthLogin', () => {
    it('should login with OAuth provider', async () => {
      const user = { uid: 'oauth-uid', email: 'oauth@test.com' };
      User.upsert.mockResolvedValue(user);

      const result = await AuthService.oauthLogin({
        provider: 'google',
        uid: 'oauth-uid',
        email: 'oauth@test.com',
        displayName: 'OAuth User',
        photoURL: 'http://photo.jpg',
      });

      expect(result.user).toEqual(user);
      expect(result.token).toBe('mock-token');
      expect(User.upsert).toHaveBeenCalledWith({
        uid: 'oauth-uid',
        email: 'oauth@test.com',
        displayName: 'OAuth User',
        photoURL: 'http://photo.jpg',
        provider: 'google',
      });
    });

    it('should default provider to google', async () => {
      User.upsert.mockResolvedValue({ uid: 'uid' });

      await AuthService.oauthLogin({
        uid: 'uid',
        email: 'test@test.com',
      });

      expect(User.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' })
      );
    });

    it('should throw BadRequestError on missing uid', async () => {
      await expect(
        AuthService.oauthLogin({ email: 'test@test.com' })
      ).rejects.toThrow('UID and email are required');
    });

    it('should throw BadRequestError on missing email', async () => {
      await expect(
        AuthService.oauthLogin({ uid: 'uid' })
      ).rejects.toThrow('UID and email are required');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const user = { uid: 'user1', email: 'test@test.com' };
      User.findById.mockResolvedValue(user);

      const result = await AuthService.getProfile('user1');
      expect(result).toEqual(user);
      expect(User.findById).toHaveBeenCalledWith('user1');
    });

    it('should throw NotFoundError when user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(AuthService.getProfile('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats', async () => {
      SavedProduct.countByUser.mockResolvedValue(5);
      Calculation.countByUser.mockResolvedValue(10);
      SearchHistory.getRecent.mockResolvedValue([{ query: 'earbuds' }]);

      const result = await AuthService.getDashboardStats('user1');

      expect(result.savedProducts).toBe(5);
      expect(result.calculations).toBe(10);
      expect(result.recentSearches).toEqual([{ query: 'earbuds' }]);
      expect(SavedProduct.countByUser).toHaveBeenCalledWith('user1');
      expect(Calculation.countByUser).toHaveBeenCalledWith('user1');
      expect(SearchHistory.getRecent).toHaveBeenCalledWith('user1', 5);
    });
  });

  describe('deleteAccount', () => {
    it('should delete user and search history', async () => {
      User.delete.mockResolvedValue({});
      SearchHistory.clearAll.mockResolvedValue({});

      await AuthService.deleteAccount('user1');

      expect(User.delete).toHaveBeenCalledWith('user1');
      expect(SearchHistory.clearAll).toHaveBeenCalledWith('user1');
    });
  });
});
