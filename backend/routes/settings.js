/**
 * Settings Routes
 *
 * GET    /api/settings      — get user settings (auth required)
 * PATCH  /api/settings      — update settings (auth required)
 * POST   /api/settings/reset — reset to defaults (auth required)
 */

import { Router } from 'express';
import { SettingsService } from '../services/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/settings
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const settings = await SettingsService.get(req.user.uid);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/settings
router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const settings = await SettingsService.update(req.user.uid, req.body);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// POST /api/settings/reset
router.post('/reset', requireAuth, async (req, res, next) => {
  try {
    const settings = await SettingsService.reset(req.user.uid);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

export default router;
