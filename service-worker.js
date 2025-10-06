const CACHE_NAME = 'bik-kassa-v1';
const urlsToCache = [
  'kassa.html',
  'stats.html',
  'index.html',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://sportality.cdn.s8y.se/team-logos/bik1_bik.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
