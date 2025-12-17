const CACHE_NAME = 'tarhal-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css', // استبدله بملف التصميم الخاص بك
  '/app.js'      // استبدله بملف الجافاسكريبت الخاص بك
];

// تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// جلب الملفات من الكاش عند انقطاع الإنترنت
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
