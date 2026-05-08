const CACHE_NAME = 'kost-v1';
const urlsToCache = [
  './',
  './index.html',
  './tictache.html',
  './station.html',
  './styles.css',
  './app.js',
  './assets/favicon.png',
  './assets/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
