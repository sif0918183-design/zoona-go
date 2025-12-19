const CACHE_NAME = 'tarhal-v1.0.2'; // قم بزيادة الرقم عند كل تحديث كبير

const urlsToCache = [
  '/',
  '/index.html',
  '/admin-login.html',
  '/manifest.json',
  // تم حذف service-worker.js من هنا لضمان التحديث السلس
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Install - تخزين الملفات الأساسية فقط
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching shell assets');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate - تنظيف الكاش القديم
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

// Fetch - استراتيجية ذكية
self.addEventListener('fetch', event => {
  // تجاهل الطلبات من خارج الموقع (مثل إحصائيات جوجل)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(response => {
      // إذا وجد في الكاش ارجعه، وإلا اطلبه من الشبكة
      return response || fetch(event.request).then(fetchResponse => {
        // لا تقم بتخزين طلبات الـ API أو الصفحات الديناميكية هنا إلا بحذر
        return caches.open(CACHE_NAME).then(cache => {
          // تخزين نسخة من الملف الجديد في الكاش للمرة القادمة
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    }).catch(() => {
      // إذا انقطع الإنترنت تماماً والملف غير موجود
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});
