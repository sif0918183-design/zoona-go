const CACHE_NAME = 'tarhal-v1.0.3'; // زد الرقم عند تحديثات مستقبلية

const urlsToCache = [
  './',
  'index.html',
  'admin-login.html',
  'manifest.json',
  // المسارات نسبية لتجنب مشاكل النشر في مسارات فرعية
  'icons/icon-192x192.png',
  'icons/icon-384x384.png',
  'icons/icon-512x512.png'
];

// Install - خزّن الملفات الأساسية لكن لا تفشل لو مورد غير موجود
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const promises = urlsToCache.map(async url => {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (response && response.ok) {
            await cache.put(url, response.clone());
            console.log('Cached:', url);
          } else {
            console.warn('Resource not cached (not ok):', url, response && response.status);
          }
        } catch (err) {
          console.warn('Resource failed to fetch (skipped):', url, err);
        }
      });
      await Promise.all(promises);
    })
  );
  self.skipWaiting();
});

// Activate - حذف الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - استرجاع من الكاش أولاً ثم الشبكة، وتخزين آمن للملفات الناجحة فقط
self.addEventListener('fetch', event => {
  // تعامل فقط مع GET ومن نفس الأصل
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(async cachedResponse => {
      if (cachedResponse) return cachedResponse;

      try {
        const networkResponse = await fetch(event.request);
        // خزّن في الكاش فقط إذا كانت الاستجابة ناجحة وصالحة
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // إذا فشل الشبكة، وللطلبات الوثائقية أعد index.html
        if (event.request.destination === 'document' || event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      }
    })
  );
});
