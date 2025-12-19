const CACHE_NAME = 'tarhal-v1.0.4'; // تم تحديث الإصدار

const urlsToCache = [
  './',
  './index.html',
  './admin-login.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// Install - مع معالجة أفضل للأخطاء
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // محاولة إضافة جميع الموارد دون أن يفشل التثبيت
      try {
        await cache.addAll(urlsToCache);
        console.log('All resources cached successfully');
      } catch (error) {
        console.log('Some resources failed to cache:', error);
        // لا نرمي خطأ هنا حتى لا يفشل التثبيت
      }
    })()
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

// Fetch - استراتيجية Cache First مع fallback
self.addEventListener('fetch', event => {
  // تجاهل طلبات POST وغير GET
  if (event.request.method !== 'GET') return;
  
  // تجاهل الطلبات من مصادر خارجية
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    (async () => {
      // حاول أولاً الحصول من الكاش
      const cachedResponse = await caches.match(event.request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
      
      try {
        // إذا لم يكن في الكاش، جلب من الشبكة
        const networkResponse = await fetch(event.request);
        
        // تحقق من أن الرد صالح للتخزين المؤقت
        if (networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // إذا فشل الاتصال بالشبكة
        if (event.request.destination === 'document' || 
            event.request.mode === 'navigate') {
          // للصفحات، ارجع إلى index.html
          return caches.match('./index.html');
        }
        
        // للصور والملفات الأخرى، ارجع رد افتراضي
        return new Response('Network error occurred', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});

// Listen for messages
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});