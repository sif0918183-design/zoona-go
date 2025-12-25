// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// ✅ تهيئة Firebase بنفس الإعدادات
firebase.initializeApp({
  apiKey: "AIzaSyBxQLDLqr4W3lApfYLPjSV5It7925a9Rr0",
  authDomain: "double-carport-476915-j7.firebaseapp.com",
  projectId: "double-carport-476915-j7",
  storageBucket: "double-carport-476915-j7.firebasestorage.app",
  messagingSenderId: "122641462099",
  appId: "1:122641462099:web:345b777a88757d3ef7e7a6"
});

const messaging = firebase.messaging();

// ✅ 1. معالجة الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('📨 [Firebase SW] استقبال إشعار في الخلفية:', payload);
  
  // إشعار ترحال مخصص
  const notificationTitle = payload.notification?.title || '🚖 طلب رحلة - ترحال زونا';
  const notificationBody = payload.notification?.body || 'لديك طلب رحلة جديد';
  
  const notificationOptions = {
    body: notificationBody,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: `tarhal-ride-${payload.data?.rideId || 'new'}`,
    timestamp: Date.now(),
    data: {
      ...payload.data,
      // إضافة بيانات إضافية لتطبيق ترحال
      app: 'tarhal',
      type: 'ride_request',
      time: new Date().toISOString()
    },
    actions: [
      {
        action: 'accept',
        title: '✅ قبول الرحلة',
        icon: '/icons/accept.png'
      },
      {
        action: 'decline',
        title: '❌ رفض',
        icon: '/icons/decline.png'
      }
    ],
    silent: false
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ✅ 2. معالجة نقر الإشعار (خاص بـ ترحال)
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ [Firebase SW] نقر على إشعار ترحال:', event.notification.data);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const rideId = data.rideId;
  const requestId = data.requestId;
  
  // بناء رابط ترحال الخاص
  let url = '/driver/accept-ride.html';
  let params = [];
  
  if (rideId) params.push(`rideId=${rideId}`);
  if (requestId) params.push(`requestId=${requestId}`);
  if (params.length > 0) url += '?' + params.join('&');
  
  // إذا كان هناك إجراء (قبول/رفض)
  if (event.action === 'accept') {
    console.log('✅ قبول الرحلة من إشعار ترحال:', rideId);
    // يمكن إرسال طلب قبول للخادم
    self.clients.matchAll().then(clients => {
      if (clients && clients.length) {
        clients[0].postMessage({
          type: 'RIDE_ACCEPT',
          rideId: rideId,
          requestId: requestId
        });
      }
    });
  } 
  else if (event.action === 'decline') {
    console.log('❌ رفض الرحلة من إشعار ترحال:', rideId);
    self.clients.matchAll().then(clients => {
      if (clients && clients.length) {
        clients[0].postMessage({
          type: 'RIDE_DECLINE',
          rideId: rideId,
          requestId: requestId
        });
      }
    });
  }
  
  // فتح/تركيز نافذة التطبيق
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then((clientList) => {
      // البحث عن نافذة ترحال مفتوحة
      for (const client of clientList) {
        if (client.url.includes('tarhal') && 'focus' in client) {
          return client.focus().then(() => {
            // إرسال البيانات إلى الصفحة
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: data,
              action: event.action
            });
          });
        }
      }
      
      // إذا لم تكن هناك نافذة مفتوحة، افتح واحدة جديدة
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// ✅ 3. معالجة رسائل Firebase الأخرى
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('🔄 تغيير اشتراك Firebase');
  
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(subscription => {
        console.log('✅ تم تجديد اشتراك Firebase');
        
        // إرسال التوكن الجديد للخادم
        return fetch('/api/update-fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: subscription.toJSON(),
            oldToken: event.oldSubscription.toJSON()
          })
        });
      })
  );
});

// ✅ 4. معلومات التصحيح
console.log('✅ Firebase Messaging Service Worker for Tarhal is ready');