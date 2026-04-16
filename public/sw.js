const CACHE_NAME = 'plastitrack-v1';
const urlsToCache = [
  '/',
  '/css/style.css',
  '/js/main.js',
  '/login',
  '/register',
  '/carte'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});