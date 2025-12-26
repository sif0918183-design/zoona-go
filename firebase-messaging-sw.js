// firebase-messaging-sw.js - النسخة التفاعلية
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// تهيئة Firebase
firebase.initializeApp({
  apiKey: "AIzaSyBxQLDLqr4W3lApfYLPjSV5It7925a9Rr0",
  authDomain: "double-carport-476915-j7.firebaseapp.com",
  projectId: "double-carport-476915-j7",
  storageBucket: "double-carport-476915-j7.firebasestorage.app",
  messagingSenderId: "122641462099",
  appId: "1:122641462099:web:345b777a88757d3ef7e7a6"
});

const messaging = firebase.messaging();

// إعدادات الإشعار
const NOTIFICATION_OPTIONS = {
  icon: '/icons/icon-192x192.png',
  badge: '/icons/icon-72x72.png',
  vibrate: [200, 100, 200, 100, 200],
  requireInteraction: true,
  silent: false
};

// 1. معالجة الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('📨 [SW] استقبال إشعار في الخلفية:', payload);
  
  const { data, notification } = payload;
  
  const notificationTitle = notification?.title || data?.title || '🚖 طلب رحلة - ترحال زونا';
  const notificationBody = notification?.body || data?.body || 'لديك طلب رحلة جديد';
  
  const notificationId = `tarhal-${data?.rideId || Date.now()}`;
  
  const options = {
    ...NOTIFICATION_OPTIONS,
    body: notificationBody,
    tag: notificationId,
    timestamp: Date.now(),
    data: {
      ...data,
      notificationId,
      app: 'tarhal',
      type: 'ride_request',
      time: new Date().toISOString()
    },
    // ⭐⭐⭐ أزرار تفاعلية ⭐⭐⭐
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
    ]
  };
  
  console.log('🎯 عرض إشعار تفاعلي:', options);
  
  return self.registration.showNotification(notificationTitle, options);
});

// 2. معالجة نقر الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ [SW] نقر على إشعار:', event.notification.data);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const rideId = data.rideId;
  const requestId = data.requestId;
  const action = event.action;
  
  console.log('🔘 الإجراء المختار:', action);
  
  let url = '/index.html';
  let focus = true;
  
  // بناء الرابط بناءً على الإجراء
  if (rideId) {
    if (action === 'accept') {
      url = `/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId}&action=accept`;
      console.log('✅ قبول الرحلة:', rideId);
    } else if (action === 'decline') {
      url = `/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId}&action=decline`;
      console.log('❌ رفض الرحلة:', rideId);
    } else {
      url = `/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId}`;
    }
  }
  
  // إرسال رسالة إلى التطبيق
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // البحث عن نافذة مفتوحة
      for (const client of clientList) {
        if (client.url.includes('zoona') && 'focus' in client) {
          console.log('🎯 تركيز النافذة الموجودة');
          
          // إرسال بيانات الإشعار
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data,
            action: action,
            timestamp: new Date().toISOString()
          });
          
          return client.focus().then(() => {
            // الانتقال إلى الرابط
            if (client.url !== url) {
              return client.navigate(url);
            }
          });
        }
      }
      
      // إذا لم تكن هناك نافذة مفتوحة، افتح واحدة جديدة
      console.log('🆕 فتح نافذة جديدة:', url);
      return self.clients.openWindow(url);
    })
  );
  
  // إرسال رد السائق إلى الخادم
  if (action === 'accept' || action === 'decline') {
    sendDriverResponseToServer(requestId, action);
  }
});

// 3. إرسال رد السائق إلى الخادم
function sendDriverResponseToServer(requestId, response) {
  console.log(`📤 إرسال رد السائق: ${requestId} -> ${response}`);
  
  // استخدم fetch لإرسال الرد
  fetch(`https://zoona-go-eosin.vercel.app/api/driver-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requestId: requestId,
      response: response,
      timestamp: new Date().toISOString()
    })
  }).catch(error => {
    console.error('❌ فشل إرسال رد السائق:', error);
  });
}

// 4. معالجة إغلاق الإشعار
self.addEventListener('notificationclose', (event) => {
  console.log('📭 إغلاق الإشعار:', event.notification.data);
});

console.log('✅ Firebase Messaging Service Worker for Tarhal (Interactive) is ready');