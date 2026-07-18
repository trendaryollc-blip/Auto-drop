/**
 * Analytics Routes
 *
 * POST /api/analytics/track      — track a single event (auth required)
 * POST /api/analytics/track/batch — track multiple events (auth required)
 * GET  /api/analytics/events     — get user events (auth required)
 * GET  /api/analytics/stats      — get user stats (auth required)
 */

import { Router } from 'express';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// POST /api/analytics/track
router.post('/track', requireAuth, validateBody({
  eventType: { type: 'string', required: true, max: 100 },
  data: { type: 'object' },
}), async (req, res, next) => {
  try {
    const { eventType, data } = req.body;
    const event = await AnalyticsEvent.track(req.user.uid, eventType, {
      ...data,
      userAgent: req.headers['user-agent'] || '',
    });
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
});

// POST /api/analytics/track/batch
router.post('/track/batch', requireAuth, validateBody({
  events: { type: 'array', required: true },
}), async (req, res, next) => {
  try {
    const { events } = req.body;
    const enriched = events.map(e => ({
      uid: req.user.uid,
      eventType: e.eventType,
      data: { ...e.data, userAgent: req.headers['user-agent'] || '' },
    }));
    const count = await AnalyticsEvent.trackBatch(enriched);
    res.json({ success: true, data: { tracked: count } });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/events
router.get('/events', requireAuth, async (req, res, next) => {
  try {
    const { eventType, limit, since } = req.query;
    const events = await AnalyticsEvent.getByUser(req.user.uid, {
      eventType,
      limit: limit ? Number(limit) : 50,
      since,
    });
    res.json({ success: true, data: events, total: events.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const stats = await AnalyticsEvent.getStats(req.user.uid);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

export default router;
