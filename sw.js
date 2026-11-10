/* LifeOS service worker: offline app shell (cache-first, refreshed in the background). Personal data is in IndexedDB, never here. */
const CACHE = 'lifeos-v2.0.0';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/profile.js', './js/core.js', './js/data.js', './js/figures.js', './js/ui.js', './js/scores.js', './js/app.js',
  './js/views/home.js', './js/views/plan.js', './js/views/fitness.js', './js/views/money.js', './js/views/study.js',
  './js/views/career.js', './js/views/work.js', './js/views/social.js', './js/views/goals.js', './js/views/more.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return hit || net;
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow('./'))));
});
