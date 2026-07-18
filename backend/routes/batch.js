/**
 * Batch Routes
 *
 * POST /api/products/batch/save    — save multiple products
 * POST /api/products/batch/unsave  — unsave multiple products
 * POST /api/products/batch/check   — check save status for multiple products
 */

import { Router } from 'express';
import { ProductService } from '../services/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// POST /api/products/batch/save
router.post('/save', requireAuth, validateBody({
  productIds: { type: 'array', required: true },
}), async (req, res, next) => {
  try {
    const { productIds } = req.body;
    const results = [];
    for (const id of productIds) {
      try {
        const saved = await ProductService.save(req.user.uid, id);
        results.push({ id, success: true, data: saved });
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }
    const saved = results.filter(r => r.success);
    res.json({ success: true, data: saved, total: saved.length, failed: results.length - saved.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/products/batch/unsave
router.post('/unsave', requireAuth, validateBody({
  productIds: { type: 'array', required: true },
}), async (req, res, next) => {
  try {
    const { productIds } = req.body;
    for (const id of productIds) {
      await ProductService.unsave(req.user.uid, id).catch(() => {});
    }
    res.json({ success: true, message: `Unsaved ${productIds.length} products` });
  } catch (err) {
    next(err);
  }
});

// POST /api/products/batch/check
router.post('/check', requireAuth, validateBody({
  productIds: { type: 'array', required: true },
}), async (req, res, next) => {
  try {
    const { productIds } = req.body;
    const status = {};
    for (const id of productIds) {
      status[id] = await ProductService.isSaved(req.user.uid, id);
    }
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

export default router;
