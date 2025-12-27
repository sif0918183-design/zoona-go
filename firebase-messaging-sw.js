// firebase-messaging-sw.js - النسخة المحسنة
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

// معالج الإشعارات الرئيسي
messaging.onBackgroundMessage(async (payload) => {
  console.log('📨 [SW] استقبال إشعار FCM:', payload);
  
  const data = payload.data || {};
  const notification = payload.notification || {};
  
  const notificationTitle = notification.title || data.title || '🚖 طلب رحلة - ترحال زونا';
  const notificationBody = notification.body || data.body || 'لديك طلب رحلة جديد';
  
  const options = {
    body: notificationBody,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: `tarhal-${data.rideId || Date.now()}`,
    data: {
      ...data,
      notificationId: `tarhal-${Date.now()}`,
      timestamp: new Date().toISOString()
    },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    silent: false,
    // أزرار تفاعلية
    actions: data.actions ? JSON.parse(data.actions) : [
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

  console.log('🎯 عرض إشعار FCM:', options);
  
  try {
    await self.registration.showNotification(notificationTitle, options);
    console.log('✅ تم عرض الإشعار بنجاح');
  } catch (error) {
    console.error('❌ فشل عرض الإشعار:', error);
  }
});

// معالج نقر الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ نقر على إشعار:', event.notification.data);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  const rideId = data.rideId;
  const requestId = data.requestId;
  
  let url = '/driver/dashboard.html';
  
  if (rideId && requestId) {
    url = `/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId}`;
    
    if (action === 'accept') {
      url += '&action=accept';
    } else if (action === 'decline') {
      url += '&action=decline';
    }
  }
  
  console.log('🔗 الانتقال إلى:', url);
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // البحث عن نافذة مفتوحة
        for (const client of clientList) {
          if (client.url.includes('tarhal') && 'focus' in client) {
            console.log('🎯 تركيز النافذة الموجودة');
            
            // إرسال رسالة للتطبيق الرئيسي
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: data,
              action: action,
              timestamp: new Date().toISOString()
            });
            
            return client.focus().then(() => {
              if (!client.url.includes(url)) {
                return client.navigate(url);
              }
            });
          }
        }
        
        // فتح نافذة جديدة
        console.log('🆕 فتح نافذة جديدة:', url);
        return self.clients.openWindow(url);
      })
  );
  
  // إرسال رد السائق إذا كان هناك إجراء
  if (action && requestId) {
    event.waitUntil(
      sendDriverResponseToServer(requestId, action)
    );
  }
});

// دالة مساعدة لإرسال رد السائق
async function sendDriverResponseToServer(requestId, response) {
  try {
    const responseData = {
      requestId: requestId,
      response: response,
      respondedAt: new Date().toISOString()
    };
    
    // إرسال إلى Supabase مباشرة عبر REST API
    const supabaseUrl = 'https://zsmlyiygjagmhnglrhoa.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbWx5aXlnamFnbWhuZ2xyaG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NDc3NjMsImV4cCI6MjA4MTUyMzc2M30.QviVinAng-ILq0umvI5UZCFEvNpP3nI0kW_hSaXxNps';
    
    const fetchResponse = await fetch(`${supabaseUrl}/rest/v1/ride_requests?id=eq.${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        driver_response: response,
        status: response === 'accept' ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
    
    console.log(`📤 تم إرسال رد السائق: ${response}`, fetchResponse.status);
  } catch (error) {
    console.error('❌ فشل إرسال رد السائق:', error);
  }
}

console.log('✅ Firebase Messaging Service Worker جاهز للإشعارات التفاعلية');