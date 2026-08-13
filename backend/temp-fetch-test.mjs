import express from 'express';
import request from 'supertest';
import imageRoutes from './routes/images.js';
import { vi } from 'vitest';

const app = express();
app.use('/api/images', imageRoutes);

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => 'image/png' },
  arrayBuffer: async () => Buffer.from([1,2,3,4]).buffer,
});

const res = await request(app)
  .get('/api/images/proxy')
  .query({ url: 'https://example.com/image.png', w: '600', q: '80', format: 'format' })
  .buffer(true);

console.log('status', res.status);
console.log('ct', res.headers['content-type']);
console.log('isBuffer', Buffer.isBuffer(res.body));
console.log('len', res.body && res.body.length);
console.log('body bytes', res.body && Array.from(res.body));
