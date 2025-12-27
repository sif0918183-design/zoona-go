// notification-manager.js - النسخة النهائية المعتمدة لترحال زونا
class TarhalNotificationManager {
  constructor() {
    this.permission = null;
    this.notificationEnabled = false;
    this.fcmToken = null;
    this.swRegistration = null;
    this.isDriver = false;
    this.currentDriver = null;
    this.vapidKey = "BE2_9m83w2cu_fxhqV4eUowZQT7E8nm-FZZMWqN5DByd-Naykp52nWwA9uuW_L9x_3rPPsMNZzctsZD8j5YyaZw";
    
    this.loadCurrentUserData();
  }

  // =========================
  // تهيئة النظام
  // =========================
  async initialize() {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.error('❌ الإشعارات غير مدعومة');
        return false;
      }

      // 1. تسجيل الـ Service Worker في المسار الرئيسي (مهم جداً للـ Scope)
      this.swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker جاهز');

      // 2. تحميل سكربتات Firebase إذا لم تكن موجودة
      await this.loadFirebaseScripts();

      // 3. تهيئة Firebase وطلب التوكن إذا كان سائقاً
      if (this.isDriver) {
        await this.setupMessaging();
      }

      return true;
    } catch (error) {
      console.error('❌ خطأ في التهيئة:', error);
      return false;
    }
  }

  loadCurrentUserData() {
    const driverData = localStorage.getItem('tarhal_driver');
    if (driverData) {
      this.currentDriver = JSON.parse(driverData);
      this.isDriver = true;
    }
  }

  async loadFirebaseScripts() {
    if (window.firebase && window.firebase.messaging) return;

    const scripts = [
      'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js'
    ];

    for (const src of scripts) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }

  // =========================
  // إعداد المراسلة والتوكن
  // =========================
  async setupMessaging() {
    try {
      const firebaseConfig = {
        apiKey: "AIzaSyBxQLDLqr4W3lApfYLPjSV5It7925a9Rr0",
        projectId: "double-carport-476915-j7",
        messagingSenderId: "122641462099",
        appId: "1:122641462099:web:345b777a88757d3ef7e7a6"
      };

      if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
      }

      const messaging = firebase.messaging();

      // طلب الإذن
      this.permission = await Notification.requestPermission();
      if (this.permission !== 'granted') {
        this.showToast('⚠️ يرجى تفعيل الإشعارات لاستقبال الطلبات', 'warning');
        return;
      }

      // الحصول على التوكن وربطه بالـ SW Registration
      this.fcmToken = await messaging.getToken({
        vapidKey: this.vapidKey,
        serviceWorkerRegistration: this.swRegistration
      });

      if (this.fcmToken) {
        console.log('🔑 FCM Token المولد:', this.fcmToken);
        localStorage.setItem('tarhal_fcm_token', this.fcmToken);
        
        // حفظ التوكن في Supabase
        await this.saveTokenToSupabase(this.fcmToken);
      }

      // الاستماع للرسائل في الواجهة
      messaging.onMessage((payload) => {
        console.log('📨 رسالة جديدة:', payload);
        this.showInAppNotification(payload);
      });

    } catch (error) {
      console.error('❌ خطأ في إعداد Firebase:', error);
    }
  }

  async saveTokenToSupabase(token) {
    try {
      const SB_URL = 'https://zsmlyiygjagmhnglrhoa.supabase.co';
      const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbWx5aXlnamFnbWhuZ2xyaG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NDc3NjMsImV4cCI6MjA4MTUyMzc2M30.QviVinAng-ILq0umvI5UZCFEvNpP3nI0kW_hSaXxNps';
      
      const response = await fetch(`${SB_URL}/rest/v1/driver_notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          driver_id: this.currentDriver.id,
          fcm_token: token,
          last_active: new Date().toISOString()
        })
      });

      if (response.ok) console.log('✅ تم تحديث التوكن في القاعدة');
    } catch (err) {
      console.error('❌ فشل حفظ التوكن:', err);
    }
  }

  // =========================
  // واجهة المستخدم (Toasts & Notifications)
  // =========================
  showInAppNotification(payload) {
    const title = payload.notification?.title || "طلب جديد";
    const body = payload.notification?.body || "";
    
    const div = document.createElement('div');
    div.className = 'fcm-in-app-alert';
    div.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: white; padding: 15px 25px; border-radius: 12px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.2); z-index: 10000;
      border-right: 5px solid #4f46e5; width: 90%; max-width: 400px;
    `;
    div.innerHTML = `<strong>${title}</strong><p>${body}</p>`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 6000);
  }

  showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: ${type === 'success' ? '#10b981' : '#f59e0b'};
      color: white; padding: 12px 24px; border-radius: 50px; z-index: 10001;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // دالة لإجبار المتصفح على تجديد التوكن في حال حدوث 404
  async resetToken() {
    if (this.swRegistration) {
      const messaging = firebase.messaging();
      await messaging.deleteToken();
      console.log('🗑️ تم مسح التوكن القديم');
      await this.setupMessaging();
    }
  }
}

// تشغيل النظام
window.notificationManager = new TarhalNotificationManager();
document.addEventListener('DOMContentLoaded', () => {
  window.notificationManager.initialize();
});
