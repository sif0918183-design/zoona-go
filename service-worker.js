/* =====================================================
   Tarhal Service Worker – Stable Auto Update Version
   لا يكسر الإشعارات – لا يكسر PWA – يحدث تلقائيًا
===================================================== */

// 🔁 غيّر هذا الرقم عند أي تحديث كبير
const CACHE_VERSION = '2025-01-03';
const CACHE_NAME = `tarhal-cache-${CACHE_VERSION}`;

// ✅ ملفات آمنة للكاش فقط (بدون HTML أو JS)
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap'
];

/* =====================================================
   INSTALL
===================================================== */
self.addEventListener('install', (event) => {
  console.log('🟢 SW Install');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* =====================================================
   ACTIVATE
===================================================== */
self.addEventListener('activate', (event) => {
  console.log('🟢 SW Activate');

  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ حذف كاش قديم:', cache);
            return caches.delete(cache);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

/* =====================================================
   FETCH STRATEGY
===================================================== */
self.addEventListener('fetch', (event) => {

  if (event.request.method !== 'GET') return;

  // استثناء Firebase و WebSocket
  if (
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis') ||
    event.request.url.startsWith('ws')
  ) {
    return;
  }

  // 🟢 HTML دائمًا من الشبكة
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 🔵 باقي الملفات: Cache First
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchResponse => {
        if (!fetchResponse || fetchResponse.status !== 200) return fetchResponse;
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    })
  );
});

/* =====================================================
   PUSH NOTIFICATIONS
===================================================== */
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) data = event.data.json();

  const options = {
    body: data.body || 'طلب رحلة جديد',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'new-ride',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/accept-ride.html',
      rideId: data.rideId || Date.now(),
      sound: data.sound || 'default'
    },
    actions: [
      { action: 'accept', title: '✅ قبول' },
      { action: 'decline', title: '❌ رفض' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🚖 رحلة جديدة', options)
  );
});

/* =====================================================
   NOTIFICATION CLICK
===================================================== */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        if (clients.length) {
          const client = clients[0];
          client.focus();
          client.postMessage({
            type: 'RIDE_ACTION',
            action: event.action || 'open',
            rideId: data.rideId,
            url: data.url
          });
        } else {
          self.clients.openWindow(data.url);
        }
      })
  );
});

/* =====================================================
   MESSAGE HANDLER
===================================================== */
self.addEventListener('message', (event) => {

  switch (event.data?.type) {

    case 'TEST_PUSH':
      self.registration.showNotification('🧪 اختبار الإشعار', {
        body: 'الإشعارات تعمل بنجاح',
        icon: '/icons/icon-192x192.png'
      });
      break;

    case 'SYNC_DATA':
      syncRideData();
      break;

    case 'REGISTER_DRIVER':
      registerDriver(event.data.driverId);
      break;
  }
});

/* =====================================================
   BACKGROUND SYNC
===================================================== */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-rides') {
    event.waitUntil(syncRideData());
  }
});

/* =====================================================
   HELPERS
===================================================== */

async function syncRideData() {
  try {
    const res = await fetch('/api/sync-rides', { method: 'POST' });
    const data = await res.json();

    if (data.newRides?.length) {
      self.registration.showNotification('🚖 رحلات جديدة', {
        body: `لديك ${data.newRides.length} رحلة جديدة`,
        icon: '/icons/icon-192x192.png'
      });
    }
  } catch (e) {
    console.log('❌ خطأ المزامنة');
  }
}

function registerDriver(driverId) {
  const dbReq = indexedDB.open('TarhalDriversDB', 1);

  dbReq.onupgradeneeded = e => {
    e.target.result.createObjectStore('drivers', { keyPath: 'id' });
  };

  dbReq.onsuccess = e => {
    const db = e.target.result;
    const tx = db.transaction('drivers', 'readwrite');
    tx.objectStore('drivers').put({
      id: driverId,
      registeredAt: new Date()
    });
  };
}