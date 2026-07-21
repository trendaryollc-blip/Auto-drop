/**
 * Seed Script — Import products into Firestore
 *
 * Usage:
 *   cd backend && npm run seed
 *
 * Reads products from a JSON file and writes each product to the
 * "products" collection in Firestore.
 *
 * Requires FIREBASE_* env vars in backend/.env
 * Provide a products JSON file path as argument, or use --stdin for pipe input.
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { connectDB, disconnectDB, collection } from './database/index.js';

async function seed() {
  console.log('[Seed] Starting product seed...');

  let products;
  const filePath = process.argv[2];

  if (filePath) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      products = JSON.parse(raw);
      console.log(`[Seed] Loaded ${products.length} products from ${filePath}`);
    } catch (err) {
      console.error('[Seed] Failed to read file:', err.message);
      process.exit(1);
    }
  } else {
    console.error('[Seed] No product file provided. Usage: node seed.js <path-to-products.json>');
    process.exit(1);
  }

  try {
    await connectDB();
    console.log('[Seed] Connected to Firestore');
  } catch (err) {
    console.error('[Seed] Failed to connect to Firestore:', err.message);
    console.error('[Seed] Make sure FIREBASE_* env vars are configured in .env');
    process.exit(1);
  }

  let success = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const id = String(product.id);
      const docRef = collection('products').doc(id);
      const now = new Date().toISOString();

      const doc = {
        id,
        title: product.title || '',
        image: product.image || '',
        platform: product.platform || '',
        price: product.price || 0,
        originalPrice: product.originalPrice || 0,
        margin: product.margin || 0,
        score: product.score || 0,
        badges: product.badges || [],
        salesVelocity: product.salesVelocity || 0,
        competition: product.competition || 'medium',
        demand: product.demand || 0,
        rating: product.rating || 0,
        reviews: product.reviews || 0,
        orders: product.orders || '0',
        shipFrom: product.shipFrom || '',
        category: product.category || '',
        keywords: product.keywords || [],
        suppliers: product.suppliers || [],
        platformPrices: product.platformPrices || {},
        trendData: product.trendData || [],
        seasonality: product.seasonality || [],
        audience: product.audience || { age: '', gender: '', interests: [], countries: [] },
        riskScore: product.riskScore || 0,
        marketSaturation: product.marketSaturation || 0,
        adSpendAvg: product.adSpendAvg || 0,
        cpaAvg: product.cpaAvg || 0,
        aiInsight: product.aiInsight || '',
        createdAt: now,
        updatedAt: now,
      };

      await docRef.set(doc);
      success++;
      process.stdout.write(`\r[Seed] Progress: ${success + failed}/${products.length}`);
    } catch (err) {
      failed++;
      console.error(`\n[Seed] Failed product "${product.title}":`, err.message);
    }
  }

  console.log(`\n[Seed] Done. Success: ${success}, Failed: ${failed}`);

  await disconnectDB();
  process.exit(0);
}

seed();
