/**
 * Product Routes
 *
 * GET    /api/products           — list all products
 * GET    /api/products/:id       — get single product
 * GET    /api/products/:id/trends     — get trend data
 * GET    /api/products/:id/suppliers  — get suppliers
 * GET    /api/products/:id/prices     — get platform prices
 * POST   /api/products/:id/save   — save product (auth required)
 * DELETE /api/products/:id/save   — unsave product (auth required)
 * GET    /api/products/saved      — list saved products (auth required)
 */

import { Router } from 'express';
import { ProductService } from '../services/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/products — list all products
router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const products = await ProductService.getAll(limit);
    res.json({ success: true, data: products, total: products.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/saved — list saved products (auth required)
router.get('/saved', requireAuth, async (req, res, next) => {
  try {
    const saved = await ProductService.getSaved(req.user.uid);
    res.json({ success: true, data: saved, total: saved.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id — get single product
router.get('/:id', async (req, res, next) => {
  try {
    const product = await ProductService.getById(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/trends
router.get('/:id/trends', async (req, res, next) => {
  try {
    const trends = await ProductService.getTrends(req.params.id);
    res.json({ success: true, data: trends });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/suppliers
router.get('/:id/suppliers', async (req, res, next) => {
  try {
    const suppliers = await ProductService.getSuppliers(req.params.id);
    res.json({ success: true, data: suppliers });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/prices
router.get('/:id/prices', async (req, res, next) => {
  try {
    const prices = await ProductService.getPrices(req.params.id);
    res.json({ success: true, data: prices });
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:id/save — save product
router.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const saved = await ProductService.save(req.user.uid, req.params.id);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id/save — unsave product
router.delete('/:id/save', requireAuth, async (req, res, next) => {
  try {
    await ProductService.unsave(req.user.uid, req.params.id);
    res.json({ success: true, message: 'Product unsaved' });
  } catch (err) {
    next(err);
  }
});

export default router;
