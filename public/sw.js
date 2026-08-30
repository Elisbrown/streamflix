const CACHE_NAME = 'streamflix-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.png', '/largeIcon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'font')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      }).catch(() => request.mode === 'navigate' ? caches.match('/index.html') : Response.error());
    })
  );
});
