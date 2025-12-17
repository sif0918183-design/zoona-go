const CACHE_NAME = 'tarhal-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// تثبيت وتخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// استراتيجية جلب البيانات: الإنترنت أولاً ثم الكاش
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
