/**
 * Search Routes
 *
 * GET /api/search — search products with filters
 *
 * This is the main search endpoint used by the frontend.
 * Mirrors the DataLayer.searchAll() interface from core.js.
 */

import { Router } from 'express';
import { ProductService } from '../services/index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/search?q=&platform=&priceMax=&minScore=&competition=&margin=&sort=&limit=
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      q: query,
      platform,
      priceMax,
      minScore,
      competition,
      margin,
      sort,
      limit,
    } = req.query;

    const result = await ProductService.search({
      query: query || '',
      platform,
      priceMax: priceMax ? Number(priceMax) : undefined,
      minScore: minScore ? Number(minScore) : undefined,
      competition,
      margin: margin ? Number(margin) : undefined,
      sort,
      limit: limit ? Number(limit) : undefined,
      uid: req.user ? req.user.uid : null,
    });

    res.json({
      success: true,
      data: result.results,
      total: result.total,
      query: query || '',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
