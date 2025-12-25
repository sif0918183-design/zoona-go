// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBxQLDLqr4W3lApfYLPjSV5It7925a9Rr0",
  authDomain: "double-carport-476915-j7.firebaseapp.com",
  projectId: "double-carport-476915-j7",
  storageBucket: "double-carport-476915-j7.firebasestorage.app",
  messagingSenderId: "122641462099",
  appId: "1:122641462099:web:345b777a88757d3ef7e7a6"
});

const messaging = firebase.messaging();

// هذا يجعل الإشعار يظهر فوق كل التطبيقات
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || ' طلب رحلة';
  const notificationOptions = {
    body: payload.notification?.body || 'لديك طلب رحلة جديد',
    icon: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: {
      rideId: payload.data?.rideId,
      url: '/driver/accept-ride.html'
    }
  };
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});