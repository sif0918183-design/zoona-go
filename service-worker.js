const CACHE_NAME = 'tarhal-v2';
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
  self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// استراتيجية جلب البيانات: الإنترنت أولاً ثم الكاش
self.addEventListener('fetch', (event) => {
  // استثناء اتصالات Supabase وخرائط Leaflet
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('unpkg.com') ||
      event.request.url.includes('cdn.jsdelivr.net') ||
      event.request.url.includes('leafletjs.com') ||
      event.request.url.includes('openstreetmap.org')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // تخزين الاستجابة الجديدة في الكاش
        if (event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // استرجاع من الكاش في حالة فشل الاتصال
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // عرض صفحة عدم الاتصال
            return caches.match('/index.html');
          });
      })
  );
});

// دعم الإشعارات الدفعية
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'طلب رحلة جديد!',
    icon: 'https://cdn-icons-png.flaticon.com/512/3097/3097139.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3097/3097139.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'accept',
        title: 'قبول الرحلة'
      },
      {
        action: 'decline',
        title: 'رفض'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'ترحال السودان', options)
  );
});

// التعامل مع ضغطات الإشعارات
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'accept') {
    // إرسال قبول الرحلة
    event.waitUntil(
      clients.matchAll({type: 'window'}).then((windowClients) => {
        for (let client of windowClients) {
          if (client.url.includes('/') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/?action=accept_ride');
        }
      })
    );
  } else if (event.action === 'decline') {
    // إرسال رفض الرحلة
    console.log('Ride declined');
  } else {
    // فتح التطبيق
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});