/**
 * Auth Routes
 *
 * POST /api/auth/register   — create account
 * POST /api/auth/login      — email/password login
 * POST /api/auth/oauth      — OAuth login (Google, GitHub)
 * GET  /api/auth/profile    — get current user profile
 * DELETE /api/auth/account  — delete account
 */

import { Router } from 'express';
import { AuthService } from '../services/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validateBody({
  email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: 'string', required: true, min: 6 },
  displayName: { type: 'string', max: 100 },
}), async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validateBody({
  email: { type: 'string', required: true },
  password: { type: 'string', required: true },
}), async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/oauth
router.post('/oauth', validateBody({
  provider: { type: 'string', required: true, enum: ['google', 'github', 'facebook'] },
  uid: { type: 'string', required: true },
  email: { type: 'string', required: true },
  displayName: { type: 'string' },
  photoURL: { type: 'string' },
}), async (req, res, next) => {
  try {
    const result = await AuthService.oauthLogin(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/profile
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const user = await AuthService.getProfile(req.user.uid);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/account
router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    await AuthService.deleteAccount(req.user.uid);
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
