const CACHE_NAME = 'bik-kassa-v3';
const urlsToCache = [
  '/',
  '/kassa.html',
  '/stats.html',
  '/index.html',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://sportality.cdn.s8y.se/team-logos/bik1_bik.svg'
];

// Install event - cacha filer
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - rensa gamla cachar
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network First för API, Cache First för statiska filer
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Network First för Google Apps Script API
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Network First för QR Server API (för fallback)
  if (url.hostname === 'api.qrserver.com') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Cache First för statiska resurser
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Cacha endast GET requests och giltiga responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          
          // Cacha inte POST/PUT/DELETE requests
          if (event.request.method !== 'GET') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        }).catch(error => {
          console.log('Fetch failed:', error);
          // Returnera en fallback-sida om det finns
          return caches.match('/index.html');
        });
      })
  );
});
