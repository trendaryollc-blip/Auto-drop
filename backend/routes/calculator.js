/**
 * Calculator Routes
 *
 * POST /api/calculator/calculate  — calculate profit (saves if authed)
 * POST /api/calculator/preview    — quick calculate without saving
 * GET  /api/calculator/history    — get calculation history (auth required)
 * DELETE /api/calculator/:id      — delete a calculation (auth required)
 */

import { Router } from 'express';
import { CalculatorService } from '../services/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// POST /api/calculator/calculate — calculate and save
router.post('/calculate', optionalAuth, validateBody({
  sellPrice: { type: 'number', required: true, min: 0.01 },
  cost: { type: 'number', required: true, min: 0 },
  shipping: { type: 'number', min: 0 },
  platformFeePercent: { type: 'number', min: 0, max: 100 },
  adSpend: { type: 'number', min: 0 },
  productName: { type: 'string', max: 200 },
}), async (req, res, next) => {
  try {
    const uid = req.user ? req.user.uid : null;
    const result = await CalculatorService.calculate(uid, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/calculator/preview — quick calculate without saving
router.post('/preview', validateBody({
  sellPrice: { type: 'number', required: true },
  cost: { type: 'number', required: true },
  shipping: { type: 'number' },
  platformFeePercent: { type: 'number' },
  adSpend: { type: 'number' },
}), async (req, res, next) => {
  try {
    const result = CalculatorService.quickCalculate(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/calculator/history
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await CalculatorService.getHistory(req.user.uid, limit);
    res.json({ success: true, data: history, total: history.length });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/calculator/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await CalculatorService.delete(req.user.uid, req.params.id);
    res.json({ success: true, message: 'Calculation deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
