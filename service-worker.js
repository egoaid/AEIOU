// AEIOU Vocal Synthesizer — Service Worker
// Provides basic offline support so the app can still open (and be played)
// without a network connection, e.g. at a party with no wifi.
//
// Strategy: stale-while-revalidate. Every request is served from cache
// immediately if available (so it works offline / loads instantly), while a
// fresh copy is fetched in the background to keep the cache up to date for
// next time. Bump CACHE_NAME whenever core assets change so old caches are
// cleared out on the next visit.

const CACHE_NAME = 'aeiou-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-16.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((err) => console.warn('AEIOU SW: precache failed', err))
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

self.addEventListener('fetch', (event) => {
  // Only handle simple GET requests; let everything else (e.g. MIDI file
  // <input> reads, which aren't network fetches anyway) pass through.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // don't intercept cross-origin requests

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // offline: fall back to whatever we have cached

      return cached || network;
    })
  );
});
