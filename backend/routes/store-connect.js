/**
 * Store Connect API routes
 *
 * - GET /api/store-connect/status
 * - POST /api/store-connect/test
 * - POST /api/store-connect/push
 * - POST /api/store-connect/connect
 * - GET /api/store-connect/history
 * - DELETE /api/store-connect/history
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { StoreConnectService } from '../services/index.js';

const router = Router();

router.use(requireAuth);

router.get('/status', async (req, res, next) => {
  try {
    const connections = await StoreConnectService.getConnections(req.user.uid);
    res.json({ success: true, data: connections });
  } catch (err) {
    next(err);
  }
});

router.post('/connect', async (req, res, next) => {
  try {
    const { platform, config } = req.body;
    if (!platform || !config || typeof config !== 'object') {
      return res.status(400).json({ success: false, error: 'platform and config are required' });
    }
    const connection = await StoreConnectService.saveConnection(req.user.uid, platform, config);
    res.json({ success: true, data: connection });
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    const { platform, config } = req.body;
    if (!platform || !config || typeof config !== 'object') {
      return res.status(400).json({ success: false, error: 'platform and config are required' });
    }
    const result = await StoreConnectService.testConnection(platform, config);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    next(err);
  }
});

router.post('/push', async (req, res, next) => {
  try {
    const { platform, config, products, status } = req.body;
    if (!platform || !products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, error: 'platform and products are required' });
    }
    const result = await StoreConnectService.pushProducts(req.user.uid, platform, config, products, status);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    next(err);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const history = await StoreConnectService.getHistory(req.user.uid);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

router.delete('/history', async (req, res, next) => {
  try {
    await StoreConnectService.clearHistory(req.user.uid);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
