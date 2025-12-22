// service-worker.js
const CACHE_NAME = 'tarhal-v2';
const CACHE_FILES = [
  '/',
  '/index.html',
  '/accept-ride.html',
  '/manifest.json',
  'icons/icon-384x384.png',
  'icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap'
];

// ✅ تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker: تثبيت');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: تخزين الملفات في الكاش');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// ✅ تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: تفعيل');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Service Worker: حذف الكاش القديم', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ✅ اعتراض الطلبات
self.addEventListener('fetch', (event) => {
  // استثناء طلبات Firebase وWebSocket
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.startsWith('ws:') ||
      event.request.url.startsWith('wss:')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
  );
});

// ✅ نظام الإشعارات المتقدم
self.addEventListener('push', function(event) {
  console.log('🔔 Service Worker: استقبال إشعار Push');
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }
  
  const options = {
    body: data.body || 'طلب رحلة جديد! اضغط للتفاصيل',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'new-ride',
    renotify: true,
    actions: [
      {
        action: 'accept',
        title: '✅ قبول',
        icon: 'icons/accept.png'
      },
      {
        action: 'decline',
        title: '❌ رفض',
        icon: 'icons/decline.png'
      }
    ],
    data: {
      url: data.url || '/accept-ride.html',
      rideId: data.rideId || Date.now(),
      sound: data.sound || 'new_ride',
      vibration: true
    },
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || '🚖 طلب رحلة جديد',
      options
    ).then(() => {
      // ✅ تشغيل الصوت حتى لو التطبيق مغلق
      if (data.sound === 'urgent') {
        playBackgroundSound();
      }
    })
  );
});

// ✅ التعامل مع نقر الإشعار
self.addEventListener('notificationclick', function(event) {
  console.log('👆 Service Worker: نقر على الإشعار');
  
  event.notification.close();

  const data = event.notification.data;
  
  // تنفيذ الإجراء المحدد
  if (event.action === 'accept') {
    console.log('✅ تم قبول الرحلة من الإشعار');
    // إرسال استجابة القبول للسيرفر
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'RIDE_ACTION',
          action: 'accept',
          rideId: data.rideId
        });
      });
    });
  } else if (event.action === 'decline') {
    console.log('❌ تم رفض الرحلة من الإشعار');
    // إرسال استجابة الرفض للسيرفر
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'RIDE_ACTION',
          action: 'decline',
          rideId: data.rideId
        });
      });
    });
  } else {
    // فتح التطبيق عند النقر العادي
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          if (clients.length > 0) {
            const client = clients[0];
            client.focus();
            client.postMessage({
              type: 'NAVIGATE',
              url: data.url || '/accept-ride.html',
              rideId: data.rideId
            });
          } else {
            self.clients.openWindow(data.url || '/accept-ride.html');
          }
        })
    );
  }
});

// ✅ التعامل مع إغلاق الإشعار
self.addEventListener('notificationclose', function(event) {
  console.log('❎ Service Worker: تم إغلاق الإشعار');
  
  const data = event.notification.data;
  
  // إذا تم إغلاق الإشعار بدون رد، نحسبها رفض تلقائي
  setTimeout(() => {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'RIDE_TIMEOUT',
          rideId: data.rideId,
          action: 'auto_decline'
        });
      });
    });
  }, 5000); // 5 ثواني بعد الإغلاق
});

// ✅ دالة تشغيل صوت في الخلفية
function playBackgroundSound() {
  self.clients.matchAll().then(clients => {
    if (clients.length > 0) {
      // التطبيق مفتوح، استخدم نظام الصوت العادي
      clients.forEach(client => {
        client.postMessage({
          type: 'PLAY_SOUND',
          sound: 'urgent_notification'
        });
      });
    } else {
      // التطبيق مغلق، حاول تشغيل صوت باستخدام AudioContext
      playSilentAudio();
    }
  });
}

// ✅ دالة تشغيل صوت صامت لتفعيل الصوت
function playSilentAudio() {
  try {
    // هذا يضمن تفعيل الصوت للمرة الأولى
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    audio.volume = 0.001;
    audio.play().then(() => {
      console.log('✅ تم تفعيل الصوت في الخلفية');
      audio.pause();
    });
  } catch (error) {
    console.log('❌ تعذر تشغيل الصوت في الخلفية:', error);
  }
}

// ✅ استقبال الرسائل من الصفحة الرئيسية
self.addEventListener('message', function(event) {
  console.log('📨 Service Worker: استقبال رسالة', event.data);
  
  switch (event.data.type) {
    case 'REGISTER_DRIVER':
      // تسجيل السائق للإشعارات
      registerDriverForNotifications(event.data.driverId);
      break;
      
    case 'SEND_NOTIFICATION':
      // إرسال إشعار يدوي
      self.registration.showNotification(event.data.title, event.data.options);
      break;
      
    case 'TEST_PUSH':
      // اختبار إرسال إشعار
      testPushNotification();
      break;
      
    case 'SYNC_DATA':
      // مزامنة البيانات في الخلفية
      syncRideData();
      break;
  }
});

// ✅ مزامنة البيانات في الخلفية
async function syncRideData() {
  try {
    const response = await fetch('/api/sync-rides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lastSync: Date.now() - 3600000 }) // آخر ساعة
    });
    
    const data = await response.json();
    
    // إذا كانت هناك رحلات جديدة، أرسل إشعار
    if (data.newRides && data.newRides.length > 0) {
      self.registration.showNotification('🚖 رحلات جديدة', {
        body: `لديك ${data.newRides.length} رحلة جديدة`,
        icon: 'icons/icon-192x192.png',
        tag: 'new-rides-sync'
      });
    }
    
  } catch (error) {
    console.log('❌ خطأ في المزامنة:', error);
  }
}

// ✅ تسجيل السائق للإشعارات
function registerDriverForNotifications(driverId) {
  // هنا ستقوم بإرسال driverId لسيرفر الإشعارات
  console.log(`✅ تسجيل السائق ${driverId} للإشعارات`);
  
  // تخزين في IndexedDB
  const dbRequest = indexedDB.open('TarhalDriversDB', 1);
  
  dbRequest.onupgradeneeded = function(event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('drivers')) {
      db.createObjectStore('drivers', { keyPath: 'id' });
    }
  };
  
  dbRequest.onsuccess = function(event) {
    const db = event.target.result;
    const transaction = db.transaction(['drivers'], 'readwrite');
    const store = transaction.objectStore('drivers');
    
    store.put({
      id: driverId,
      registeredAt: new Date(),
      active: true
    });
  };
}

// ✅ اختبار إرسال إشعار
function testPushNotification() {
  self.registration.showNotification('🧪 اختبار الإشعارات', {
    body: 'هذا إشعار اختبار من Service Worker',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'test-notification',
    data: {
      url: '/',
      test: true
    }
  });
}

// ✅ مزامنة دورية كل 15 دقيقة
self.addEventListener('sync', function(event) {
  console.log('🔄 Service Worker: مزامنة في الخلفية', event.tag);
  
  if (event.tag === 'sync-rides') {
    event.waitUntil(syncRideData());
  }
});

// ✅ عند استقبال رسالة من Firebase Cloud Messaging
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('🔄 Service Worker: تغيير في اشتراك Push');
  
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(function(subscription) {
        // إرسال الاشتراك الجديد للسيرفر
        return fetch('/api/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription.endpoint,
            newEndpoint: subscription.endpoint
          })
        });
      })
  );
});