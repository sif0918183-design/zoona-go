// service-worker.js - مُحدث ومتوافق مع التطبيق الجديد
const CACHE_NAME = 'tarhal-v3';
const ASSETS = [
  // الصفحات الرئيسية
  '/',
  '/index.html',
  '/home.html',
  '/driver-dashboard.html',
  '/ride-request.html',
  '/admin-panel.html',
  
  // الملفات الأساسية
  '/manifest.json',
  
  // الأنماط
  '/css/main.css',
  
  // ملفات JavaScript
  '/js/auth.js',
  '/js/map.js',
  '/js/ride.js',
  '/js/driver.js',
  '/js/notifications.js',
  
  // الأيقونات
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  
  // صفحة عدم الاتصال
  '/offline.html'
];

// تثبيت Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(ASSETS).catch(error => {
          console.error('[Service Worker] Cache addAll error:', error);
        });
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// تفعيل Service Worker وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// استراتيجية جلب البيانات: الإنترنت أولاً مع fallback للكاش
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // استثناء الاتصالات الخارجية والطلبات غير GET
  if (event.request.method !== 'GET') return;
  
  // استثناء الواجهات البرمجية وملفات الخرائط
  if (requestUrl.href.includes('supabase.co') || 
      requestUrl.href.includes('unpkg.com') ||
      requestUrl.href.includes('cdn.jsdelivr.net') ||
      requestUrl.href.includes('leafletjs.com') ||
      requestUrl.href.includes('openstreetmap.org') ||
      requestUrl.href.includes('nominatim.openstreetmap.org') ||
      requestUrl.href.includes('googleapis.com')) {
    return fetch(event.request);
  }
  
  // استراتيجية Stale-While-Revalidate للصفحات الرئيسية
  if (event.request.mode === 'navigate' || 
      requestUrl.pathname.endsWith('.html')) {
    event.respondWith(
      fetchFromNetworkOrCache(event.request)
        .catch(() => offlineFallback(event.request))
    );
    return;
  }
  
  // استراتيجية Cache First للملفات الثابتة
  if (requestUrl.pathname.endsWith('.css') ||
      requestUrl.pathname.endsWith('.js') ||
      requestUrl.pathname.endsWith('.png') ||
      requestUrl.pathname.endsWith('.jpg') ||
      requestUrl.pathname.endsWith('.json')) {
    event.respondWith(
      cacheFirst(event.request)
    );
    return;
  }
  
  // استراتيجية Network First للطلبات الأخرى
  event.respondWith(
    networkFirst(event.request)
  );
});

// استراتيجية: الشبكة أولاً مع fallback للكاش
async function fetchFromNetworkOrCache(request) {
  try {
    // محاولة الشبكة أولاً
    const networkResponse = await fetch(request);
    
    // تخزين في الكاش إذا نجحت
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // fallback إلى الكاش
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// استراتيجية: الكاش أولاً
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // تحديث الكاش في الخلفية
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Network error', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// استراتيجية: الشبكة أولاً
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// تحديث الكاش في الخلفية
async function updateCacheInBackground(request) {
  if (self.controller && self.controller.state === 'activated') {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response);
      }
    } catch (error) {
      // تحديث الكاش فشل، لا بأس
    }
  }
}

// fallback عندما يكون التطبيق غير متصل
async function offlineFallback(request) {
  // التحقق إذا كان طلب صفحة
  if (request.mode === 'navigate') {
    // محاولة جلب الصفحة من الكاش
    const cachedPage = await caches.match(request);
    if (cachedPage) {
      return cachedPage;
    }
    
    // عرض صفحة عدم الاتصال المخصصة
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    // إنشاء صفحة عدم اتصال ديناميكية
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>غير متصل - ترحال السودان</title>
          <style>
              body {
                  font-family: 'Tajawal', sans-serif;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  margin: 0;
                  padding: 40px 20px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  text-align: center;
                  color: white;
              }
              .container {
                  background: rgba(255, 255, 255, 0.95);
                  padding: 40px;
                  border-radius: 20px;
                  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                  max-width: 500px;
                  width: 90%;
                  color: #333;
              }
              h1 {
                  color: #4f46e5;
                  margin-bottom: 20px;
              }
              button {
                  background: #4f46e5;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 8px;
                  font-family: 'Tajawal', sans-serif;
                  font-size: 16px;
                  cursor: pointer;
                  margin: 5px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div style="font-size: 64px;">📶</div>
              <h1>غير متصل بالإنترنت</h1>
              <p>يبدو أنك غير متصل بالإنترنت. بعض الميزات قد لا تعمل.</p>
              <button onclick="window.location.reload()">إعادة تحميل</button>
              <button onclick="window.history.back()">العودة</button>
          </div>
      </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
  
  return new Response('No internet connection', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

// دعم الإشعارات الدفعية
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error('Push message parsing error:', error);
    data = {
      title: 'ترحال السودان',
      body: event.data.text() || 'إشعار جديد'
    };
  }
  
  const options = {
    body: data.body || 'طلب رحلة جديد!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'tarhal-notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || true,
    actions: data.actions || [
      {
        action: 'accept',
        title: '✅ قبول',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'decline',
        title: '❌ رفض',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'ترحال السودان', options)
      .catch(error => {
        console.error('Show notification error:', error);
      })
  );
});

// التعامل مع نقرات الإشعارات
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event.action);
  
  event.notification.close();
  
  let urlToOpen = '/';
  
  // تحديد الصفحة بناءً على نوع الإشعار
  if (event.notification.data && event.notification.data.rideId) {
    urlToOpen = event.notification.data.driver ? 
      `/driver-dashboard.html?ride=${event.notification.data.rideId}` :
      `/home.html?ride=${event.notification.data.rideId}`;
  }
  
  if (event.action === 'accept') {
    // قبول الرحلة
    urlToOpen = `/driver-dashboard.html?action=accept&ride=${event.notification.data.rideId || ''}`;
    
    // إرسال قبول الرحلة عبر Broadcast Channel
    if ('BroadcastChannel' in self) {
      const channel = new BroadcastChannel('ride-actions');
      channel.postMessage({
        action: 'accept',
        rideId: event.notification.data.rideId
      });
    }
    
  } else if (event.action === 'decline') {
    // رفض الرحلة
    if ('BroadcastChannel' in self) {
      const channel = new BroadcastChannel('ride-actions');
      channel.postMessage({
        action: 'decline',
        rideId: event.notification.data.rideId
      });
    }
  }
  
  // فتح/تركيز النافذة
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // البحث عن نافذة مفتوحة
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // فتح نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// التعامل مع إغلاق الإشعارات
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification.tag);
  
  // يمكنك إضافة منطق إضافي هنا
  // مثلاً: تسجيل إحصائيات الإشعارات المغلقة
});

// مزامنة الخلفية
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-rides') {
    event.waitUntil(syncPendingRides());
  } else if (event.tag === 'sync-location') {
    event.waitUntil(syncDriverLocation());
  }
});

// مزامنة الرحلات المعلقة
async function syncPendingRides() {
  console.log('[Service Worker] Syncing pending rides...');
  
  try {
    // هنا يمكنك إضافة منطق مزامنة الرحلات المعلقة
    // مثلاً: إرسال طلبات رحلات فاشلة أو تحديث الحالات
    
    return Promise.resolve();
  } catch (error) {
    console.error('[Service Worker] Sync error:', error);
    return Promise.reject(error);
  }
}

// مزامنة موقع السائق
async function syncDriverLocation() {
  console.log('[Service Worker] Syncing driver location...');
  
  try {
    // هنا يمكنك إضافة منطق مزامنة موقع السائق
    return Promise.resolve();
  } catch (error) {
    console.error('[Service Worker] Location sync error:', error);
    return Promise.reject(error);
  }
}

// استلام الرسائل من الصفحة الرئيسية
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_ASSETS') {
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(event.data.urls))
      .then(() => {
        event.ports[0].postMessage({ success: true });
      })
      .catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
  }
});

// وظيفة مساعدة: التحقق من الاتصال
async function checkConnection() {
  try {
    const response = await fetch('/', { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// إعداد periodic sync (إذا كان مدعوماً)
if ('periodicSync' in self.registration) {
  const TAGS = ['update-cache', 'sync-data'];
  
  TAGS.forEach(tag => {
    self.registration.periodicSync.register(tag, {
      minInterval: 24 * 60 * 60 * 1000 // 24 ساعة
    }).catch(error => {
      console.log(`Periodic sync registration failed for ${tag}:`, error);
    });
  });
}