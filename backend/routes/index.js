/**
 * Route Index — aggregates all route modules.
 */

import { Router } from 'express';
import authRoutes from './auth.js';
import productRoutes from './products.js';
import calculatorRoutes from './calculator.js';
import searchRoutes from './search.js';
import settingsRoutes from './settings.js';
import analyticsRoutes from './analytics.js';
import batchRoutes from './batch.js';
import exportRoutes from './export.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Apply rate limits per route group
router.use('/auth', rateLimit('auth'), authRoutes);
router.use('/products', rateLimit('products'), productRoutes);
router.use('/calculator', rateLimit('calculator'), calculatorRoutes);
router.use('/search', rateLimit('search'), searchRoutes);
router.use('/settings', rateLimit('default'), settingsRoutes);
router.use('/analytics', rateLimit('analytics'), analyticsRoutes);
router.use('/products/batch', rateLimit('products'), batchRoutes);
router.use('/export', rateLimit('export'), exportRoutes);

export default router;
