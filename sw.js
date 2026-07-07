/* ContextVocab service worker — MVP
   HTML/ナビゲーションは network-first（オンライン時は常に最新を配信）、
   アイコン等の静的アセットは cache-first。オフラインでも起動可能。 */
const CACHE = 'ctxvocab-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Cross-origin (Tailwind CDN, fonts, analytics counter) passes straight through.
  if (url.origin !== self.location.origin) return;

  const isDoc = req.mode === 'navigate' || req.destination === 'document' ||
                url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isDoc) {
    // network-first: 最新HTMLを優先。失敗時のみキャッシュ（＝オフライン）
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // static assets: cache-first
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
