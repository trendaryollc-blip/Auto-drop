/**
 * HuntDrop AI — Backend Server
 *
 * Express server with:
 * - CORS for frontend communication
 * - Helmet for security headers
 * - Request logging with timing
 * - Rate limiting per route group
 * - Database connection on startup
 * - RESTful API routes
 * - Global error handling
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/index.js';
import { connectDB, disconnectDB } from './database/index.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

const app = express();

// ===== Security & Parsing =====
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== Request Logging =====
app.use(requestLogger);

// ===== Health Check =====
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: '1.0.0',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      env: config.nodeEnv,
    },
  });
});

// ===== API Routes =====
app.use('/api', apiRoutes);

// ===== 404 & Error Handling =====
app.use(notFoundHandler);
app.use(errorHandler);

// ===== Start Server =====
async function start() {
  try {
    // Connect to database
    await connectDB();
    console.log('[Server] Database connected');

    // Start listening
    app.listen(config.port, () => {
      console.log(`[Server] HuntDrop API running on http://localhost:${config.port}`);
      console.log(`[Server] Environment: ${config.nodeEnv}`);
      console.log(`[Server] CORS origins: ${config.cors.origins.join(', ')}`);
      console.log(`[Server] API base: http://localhost:${config.port}/api`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

// ===== Graceful Shutdown =====
async function shutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Shutting down...`);
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ===== Start =====
start();

export default app;
