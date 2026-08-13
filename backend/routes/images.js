/**
 * Image Proxy Route — fetches remote images through the backend and applies
 * lightweight provider-specific optimization hints.
 */

import { Router } from 'express';

const router = Router();

const PRIVATE_HOST_PATTERN = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|10(?:\.\d{1,3}){3}|172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})$/i;

function isSafeExternalUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    if (PRIVATE_HOST_PATTERN.test(hostname)) return false;
    if (hostname.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

function optimizeUrl(target, options = {}) {
  try {
    const url = new URL(target);
    const host = url.hostname.toLowerCase();
    const width = options.w || options.width;
    const quality = options.quality || options.q;
    const format = options.format;

    if (host.includes('images.unsplash.com')) {
      if (width) url.searchParams.set('w', String(width));
      url.searchParams.set('auto', format || 'format');
      url.searchParams.set('fit', 'crop');
      if (quality) url.searchParams.set('q', String(quality));
      return url.toString();
    }

    if (host.includes('cdn.shopify.com') || host.includes('shopifycloud.com')) {
      if (width) {
        url.searchParams.set('width', String(width));
      }
      if (quality) {
        url.searchParams.set('quality', String(quality));
      }
      if (format) {
        url.searchParams.set('format', format);
      }
      if (url.pathname.match(/_\d+x\d+(?=\.)/)) {
        url.pathname = url.pathname.replace(/_(\d+)x(\d+)(?=\.)/, `_${width || 1200}x${width || 1200}`);
      }
      return url.toString();
    }

    if (host.includes('alicdn.com') || host.includes('alicdn') || host.includes('alicdn.net')) {
      url.pathname = url.pathname.replace(/_(\d+)x(\d+)(?=\.)/, '');
      if (width) url.searchParams.set('x', String(width));
      return url.toString();
    }

    if (host.includes('images-amazon.com') || host.includes('amazon.')) {
      if (width) {
        url.pathname = url.pathname.replace(/_SX\d+_/i, `_SX${width}_`);
        url.pathname = url.pathname.replace(/_AC_SX\d+_/i, `_AC_SX${width}_`);
      }
      return url.toString();
    }

    if (host.includes('googleusercontent.com')) {
      if (width) {
        url.pathname = url.pathname.replace(/=s\d+$/, `=s${width}`);
      }
      return url.toString();
    }

    if (width && url.searchParams.has('w')) {
      url.searchParams.set('w', String(width));
    }
    if (quality && url.searchParams.has('q')) {
      url.searchParams.set('q', String(quality));
    }
    if (format) {
      url.searchParams.set('auto', format);
    }
    return url.toString();
  } catch {
    return target;
  }
}

router.get('/proxy', async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ error: 'url query parameter is required' });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(rawUrl);
  } catch {
    targetUrl = rawUrl;
  }

  if (!isSafeExternalUrl(targetUrl)) {
    return res.status(400).json({ error: 'Invalid or unsafe image URL' });
  }

  const optimizedUrl = optimizeUrl(targetUrl, {
    w: req.query.w,
    h: req.query.h,
    q: req.query.q || req.query.quality,
    format: req.query.format,
  });

  try {
    const response = await fetch(optimizedUrl, {
      headers: {
        Accept: 'image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch remote image' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers?.get('content-type') || 'application/octet-stream';
    const imageData = Buffer.from(new Uint8Array(arrayBuffer));
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.status(200).send(imageData);
  } catch (error) {
    console.error('[ImageProxy] Error fetching', optimizedUrl, error?.message || error);
    return res.status(500).json({ error: 'Unable to proxy image request' });
  }
});

export default router;
