const CACHE_NAME = 'rewire-cache-v17';
const STATIC_ASSETS = [
  './icon-192.png',
  './icon-512.png'
];
// index.html and manifest.json are NOT pre-cached / cache-first anymore.
// They're fetched network-first so name/config/code changes always reach
// the browser immediately instead of being served from a stale cache.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isNetworkFirst(url) {
  const path = new URL(url).pathname;
  return path.endsWith('/index.html') || path.endsWith('/manifest.json') || path.endsWith('/');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

  if (isNetworkFirst(event.request.url)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
