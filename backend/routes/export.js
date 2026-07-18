/**
 * Export Routes
 *
 * GET /api/export/products     — export all products as JSON
 * GET /api/export/saved        — export saved products as JSON
 * GET /api/export/calculations — export calculation history as JSON
 * GET /api/export/all          — export all user data as JSON
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Product from '../models/Product.js';
import SavedProduct from '../models/SavedProduct.js';
import Calculation from '../models/Calculation.js';

const router = Router();

// GET /api/export/products — export all products (public)
router.get('/products', async (req, res, next) => {
  try {
    const products = await Product.getAll(500);
    res.setHeader('Content-Disposition', 'attachment; filename="huntdrop-products.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/saved — export saved products (auth required)
router.get('/saved', requireAuth, async (req, res, next) => {
  try {
    const saved = await SavedProduct.getByUser(req.user.uid);
    res.setHeader('Content-Disposition', 'attachment; filename="huntdrop-saved.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/calculations — export calculation history (auth required)
router.get('/calculations', requireAuth, async (req, res, next) => {
  try {
    const calcs = await Calculation.getByUser(req.user.uid, 500);
    res.setHeader('Content-Disposition', 'attachment; filename="huntdrop-calculations.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(calcs);
  } catch (err) {
    next(err);
  }
});

// GET /api/export/all — export everything (auth required)
router.get('/all', requireAuth, async (req, res, next) => {
  try {
    const [saved, calcs] = await Promise.all([
      SavedProduct.getByUser(req.user.uid),
      Calculation.getByUser(req.user.uid, 500),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: { uid: req.user.uid, email: req.user.email },
      savedProducts: saved,
      calculations: calcs,
    };

    res.setHeader('Content-Disposition', 'attachment; filename="huntdrop-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

export default router;
