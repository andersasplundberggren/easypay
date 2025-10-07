const CACHE_NAME = 'bik-kassa-v4';
const urlsToCache = [
  './',
  './index.html',
  './kassa.html',
  './stats.html',
  './lager.html',
  './manifest.json',
  // Pinna versioner:
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  // Om du verkligen använder qrcode-biblioteket lokalt – annars kan denna rad tas bort:
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://sportality.cdn.s8y.se/team-logos/bik1_bik.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(n => (n !== CACHE_NAME ? caches.delete(n) : null)))
    ).then(() => self.clients.claim())
  );
});

// Valfritt: navigation preload för snabbare förstabyte
self.addEventListener('activate', () => {
  if ('navigationPreload' in self.registration) {
    self.registration.navigationPreload.enable();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Navigationer: serve shell vid offline
  if (req.mode === 'navigate' && req.method === 'GET') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const net = await fetch(req);
        return net;
      } catch {
        // fallback till cachad startsida (eller stats/kassa om du vill)
        return caches.match('./index.html');
      }
    })());
    return;
  }

  // 2) Network First för Google Apps Script
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // 3) Network First för QR API
  if (url.hostname === 'api.qrserver.com') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 4) Cache First för övriga GET
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          // cacha bara “goda” svar
          if (!res || res.status !== 200 || res.type === 'error') return res;
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        }).catch(() => {
          // fallback för misslyckade fetch på HTML
          if (req.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      })
    );
  }
});
