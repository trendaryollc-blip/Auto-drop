import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import imageRoutes from '../routes/images.js';

function createApp() {
  const app = express();
  app.use('/api/images', imageRoutes);
  return app;
}

describe('Image proxy routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    vi.restoreAllMocks();
  });

  it('should reject requests without url query', async () => {
    const res = await request(app).get('/api/images/proxy');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('url query parameter is required');
  });

  it('should reject unsafe localhost urls', async () => {
    const res = await request(app).get('/api/images/proxy').query({ url: 'http://localhost/test.png' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid or unsafe image URL');
  });

  it('should proxy a safe remote image URL', async () => {
    const imageBuffer = Buffer.from([1, 2, 3, 4]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength),
    });

    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url: 'https://example.com/image.png', w: '600', q: '80', format: 'format' })
      .buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body).toEqual(imageBuffer);
    expect(global.fetch).toHaveBeenCalled();
  });
});
