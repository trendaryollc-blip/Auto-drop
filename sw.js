// ============================================================================
// SERVICE WORKER — Offline Support & Cache Strategy
// ============================================================================
// Strategy:
//   - Pre-cache ONLY core files (index.html, core.js, app.js, base CSS)
//   - Cache-on-first-use for plugins, non-core CSS, and other assets
//   - Network-first for API calls and external resources
//   - Versioned cache for easy busting on deploy
//   - LRU cache eviction to prevent unbounded cache growth
// ============================================================================

const CACHE_VERSION = 'v3';
const CACHE_NAME = 'huntdrop-' + CACHE_VERSION;
const MAX_CACHE_ITEMS = 100; // LRU limit to prevent unbounded cache growth

// Only core files that are needed on every page load
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/core.js',
  '/app.js',
  '/css/base.css',
  '/css/components.css',
  '/css/navigation.css',
  '/css/dashboard.css',
  '/css/responsive.css',
];

// Offline fallback page (inline HTML for when network is unavailable)
const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HuntDrop AI — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #06060c;
      color: #f0f0f8;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
    }
    .offline-container {
      max-width: 480px;
    }
    .offline-icon {
      font-size: 64px;
      margin-bottom: 24px;
      opacity: 0.8;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #00e5ff 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p {
      color: #8888a4;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 28px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, #00e5ff 0%, #a855f7 100%);
      color: #06060c;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .retry-btn:hover {
      transform: scale(1.03);
      box-shadow: 0 0 30px rgba(0, 229, 255, 0.2);
    }
    .offline-tips {
      margin-top: 32px;
      padding: 20px;
      background: #111119;
      border: 1px solid #2a2a3d;
      border-radius: 10px;
      text-align: left;
    }
    .offline-tips h3 {
      font-size: 13px;
      color: #00e5ff;
      margin-bottom: 10px;
    }
    .offline-tips ul {
      list-style: none;
      font-size: 12px;
      color: #8888a4;
    }
    .offline-tips li {
      padding: 4px 0;
    }
    .offline-tips li::before {
      content: '→ ';
      color: #00ff88;
    }
  </style>
</head>
<body>
  <div class="offline-container">
    <div class="offline-icon">📡</div>
    <h1>You're Offline</h1>
    <p>HuntDrop AI needs an internet connection to search products and access AI features. Check your connection and try again.</p>
    <button class="retry-btn" onclick="window.location.reload()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      Try Again
    </button>
    <div class="offline-tips">
      <h3>While you wait:</h3>
      <ul>
        <li>Check your Wi-Fi or mobile data connection</li>
        <li>Try moving closer to your router</li>
        <li>Disable any VPN or proxy temporarily</li>
        <li>The app will work again once you're back online</li>
      </ul>
    </div>
  </div>
</body>
</html>`;

// Install: pre-cache ONLY core files
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(CORE_ASSETS);
      })
      .then(function () {
        return self.skipWaiting();
      })
      .catch(function (err) {
        console.warn('[SW] Pre-cache failed for some core assets:', err);
        return self.skipWaiting();
      })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function (name) {
              return name !== CACHE_NAME;
            })
            .map(function (name) {
              return caches.delete(name);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// LRU Cache Eviction: Remove oldest entries when cache exceeds limit
async function evictOldCacheEntries(cache, maxItems) {
  try {
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      // Remove oldest entries (first in = first out)
      const entriesToRemove = keys.slice(0, keys.length - maxItems);
      await Promise.all(
        entriesToRemove.map(function (request) {
          return cache.delete(request);
        })
      );
    }
  } catch (err) {
    console.warn('[SW] Cache eviction failed:', err);
  }
}

// Fetch: network-first for APIs, cache-first for core, cache-on-first-use for others
self.addEventListener('fetch', function (event) {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Network-first for API calls and external resources
  if (
    url.hostname !== self.location.hostname ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache-first for same-origin requests (serves pre-cached + previously fetched)
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request)
        .then(function (response) {
          // Cache successful same-origin responses (cache-on-first-use)
          if (response.ok && url.origin === self.location.origin) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(async function (cache) {
              await cache.put(event.request, responseClone);
              // Enforce LRU cache limit
              await evictOldCacheEntries(cache, MAX_CACHE_ITEMS);
            });
          }
          return response;
        })
        .catch(function () {
          // Offline fallback: return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            // Return the offline page as a Response
            const offlineBytes = new TextEncoder().encode(OFFLINE_PAGE);
            return new Response(offlineBytes, {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': String(offlineBytes.length) },
            });
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
