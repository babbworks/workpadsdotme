var CACHE = 'workpads-v16';
var ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/css/app-telegram.css',
  '/js/lib/fflate.js',
  '/js/lib/codec.js',
  '/js/services/StorageAdapter.js',
  '/js/services/ActivityService.js',
  '/js/services/RecordService.js',
  '/js/services/PersonalService.js',
  '/js/services/BlockRegistry.js',
  '/js/screens/list.js',
  '/js/screens/wizard.js',
  '/js/screens/view.js',
  '/js/screens/share.js',
  '/js/screens/management.js',
  '/js/screens/archive.js',
  '/js/screens/financial.js',
  '/js/screens/finance-overview.js',
  '/js/panels/WorkpadsPanel.js',
  '/js/panels/PersonalPanel.js',
  '/js/app.js',
  '/img/icon-192.svg',
  '/img/icon-512.svg',
  '/img/icon-192.png',
  '/img/icon-512.png',
  '/img/at-workpads.png',
  '/img/logo-w.png',
  '/p/index.html',
  '/p/customer.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  /* Only handle GET; skip cross-origin (Google Fonts etc) */
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      /* Navigation fallback: share-target and unknown app paths → serve cached index.html.
         /p/ receiver pages have their own HTML and must NOT be intercepted here. */
      if (e.request.mode === 'navigate' && !url.pathname.startsWith('/p')) {
        return caches.match('/index.html');
      }
      return fetch(e.request).then(function (response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        return response;
      });
    })
  );
});
