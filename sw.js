/* YucaPass 5.0 — caché limitada de archivos estáticos. No almacena sesiones ni respuestas de Supabase. */
const CACHE_NAME = 'yucapass-shell-v5.0.0';
const APP_SHELL = [
  './', './index.html', './manifest.webmanifest', './yucapass.css',
  './access.js', './analytics.js', './reservations.js', './storage.js',
  './supabase-client.js', './supabase-config.js', './data.js',
  './dashboards.js', './events.js', './pages.js', './main.js',
  './brand-mark.svg', './yucapass-emblem.png', './yucapass-logo.svg',
  './yucapass-icon-192.png', './yucapass-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('yucapass-shell-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === 'navigate';
  const isAppAsset = /\.(?:js|css|png|svg|webmanifest|ico)$/i.test(url.pathname);
  if (!isNavigation && !isAppAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (isNavigation) {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) await cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await cache.match('./index.html')) || Response.error();
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
