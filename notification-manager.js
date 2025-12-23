// notification-manager.js
class TarhalNotificationManager {
  constructor() {
    this.permission = null;
    this.notificationEnabled = false;
    this.soundEnabled = false;
    this.vibrationEnabled = true;
    this.isInitialized = false;
    this.fcmToken = null;
    this.swRegistration = null;
  }

  // =========================
  // تهيئة نظام الإشعارات
  // =========================
  async initialize() {
    try {
      if (!('Notification' in window)) {
        console.log('❌ الإشعارات غير مدعومة');
        return false;
      }

      if (!('serviceWorker' in navigator)) {
        console.log('❌ Service Worker غير مدعوم');
        return false;
      }

      // ✅ تسجيل Service Worker مرة واحدة فقط
      this.swRegistration = await this.getServiceWorkerRegistration();

      // تهيئة Firebase
      await this.initializeFirebase();

      // تحميل التفضيلات
      this.loadPreferences();

      this.isInitialized = true;
      console.log('✅ نظام الإشعارات جاهز');
      return true;

    } catch (error) {
      console.error('❌ خطأ في التهيئة:', error);
      return false;
    }
  }

  // =========================
  // الحصول على Service Worker
  // =========================
  async getServiceWorkerRegistration() {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/service-worker.js');
      if (registration) return registration;

      const reg = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready; // ✅ التأكد من جاهزية SW
      reg.update();
      console.log('✅ Service Worker جاهز');
      return reg;

    } catch (error) {
      console.error('❌ فشل تسجيل Service Worker:', error);
      throw error;
    }
  }

  // =========================
  // تهيئة Firebase
  // =========================
  async initializeFirebase() {
    try {
      if (!window.firebase || !firebase.messaging) {
        console.warn('⚠️ Firebase غير متوفر');
        return;
      }

      const firebaseConfig = {
        apiKey: "AIzaSyBxQLDLqr4W3lApfYLPjSV5It7925a9Rr0",
        authDomain: "double-carport-476915-j7.firebasestorage.app",
        projectId: "double-carport-476915-j7",
        messagingSenderId: "122641462099",
        appId: "1:122641462099:web:345b777a88757d3ef7a7"
      };

      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

      // ✅ التأكد من جاهزية Service Worker قبل استخدام messaging
      await navigator.serviceWorker.ready;

      const messaging = firebase.messaging();

      this.permission = await Notification.requestPermission();
      if (this.permission !== 'granted') {
        console.log('❌ لم يتم منح إذن الإشعارات');
        return;
      }

      // الحصول على FCM Token باستخدام Service Worker الجاهز
      this.fcmToken = await messaging.getToken({
        serviceWorkerRegistration: this.swRegistration
      });

      if (this.fcmToken) {
        console.log('✅ FCM Token:', this.fcmToken);
        await this.saveTokenToServer(this.fcmToken);
      }

      messaging.onMessage(payload => {
        console.log('📨 إشعار في الواجهة:', payload);
        this.showInAppNotification({
          title: payload.notification?.title,
          body: payload.notification?.body,
          data: payload.data || {}
        });
      });

      this.notificationEnabled = true;

    } catch (error) {
      console.error('❌ خطأ Firebase:', error);
    }
  }

  // =========================
  // نافذة تفعيل الإشعارات
  // =========================
  showActivationPrompt() {
    if (localStorage.getItem('tarhal_notifications_asked')) return;

    const prompt = document.createElement('div');
    prompt.id = 'notification-activation-prompt';
    prompt.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.8);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    prompt.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:30px;max-width:400px;text-align:center">
        <div style="font-size:48px">🔔</div>
        <h3 style="color:#4f46e5">تفعيل الإشعارات</h3>
        <p style="color:#6b7280">
          لاستقبال الطلبات حتى مع إغلاق التطبيق
        </p>
        <button id="enable-all-btn" style="width:100%;padding:15px;background:#4f46e5;color:#fff;border:none;border-radius:12px;margin-bottom:10px">
          تفعيل الكل
        </button>
        <button id="enable-notifications-btn" style="width:100%;padding:14px;border:1px solid #4f46e5;color:#4f46e5;border-radius:12px">
          الإشعارات فقط
        </button>
        <button id="skip-btn" style="margin-top:10px;background:none;border:none;color:#6b7280">
          تخطي
        </button>
      </div>
    `;

    document.body.appendChild(prompt);

    document.getElementById('enable-all-btn').onclick = async () => {
      await this.enableAllFeatures();
      prompt.remove();
      localStorage.setItem('tarhal_notifications_asked', 'true');
    };

    document.getElementById('enable-notifications-btn').onclick = async () => {
      await this.enableNotificationsOnly();
      prompt.remove();
      localStorage.setItem('tarhal_notifications_asked', 'true');
    };

    document.getElementById('skip-btn').onclick = () => prompt.remove();
  }

  // =========================
  // تفعيل كل الميزات
  // =========================
  async enableAllFeatures() {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    this.notificationEnabled = true;
    this.soundEnabled = true;
    this.vibrationEnabled = true;
    this.savePreferences();
    this.showToast('✅ تم التفعيل بنجاح');
  }

  async enableNotificationsOnly() {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    this.notificationEnabled = true;
    this.savePreferences();
    this.showToast('✅ تم تفعيل الإشعارات');
  }

  // =========================
  // إشعار داخل التطبيق
  // =========================
  showInAppNotification(payload) {
    if (!payload?.title) return;

    const n = document.createElement('div');
    n.style.cssText = `
      position:fixed;top:20px;left:20px;right:20px;
      background:#fff;padding:16px;border-radius:12px;
      box-shadow:0 10px 30px rgba(0,0,0,.2);
      z-index:9999
    `;

    n.innerHTML = `
      <strong style="color:#4f46e5">${payload.title}</strong>
      <div style="color:#6b7280">${payload.body || ''}</div>
    `;

    n.onclick = () => {
      if (payload.data?.url) location.href = payload.data.url;
      n.remove();
    };

    document.body.appendChild(n);
    setTimeout(() => n.remove(), 5000);
  }

  // =========================
  // حفظ التوكن
  // =========================
  async saveTokenToServer(token) {
    try {
      await fetch('/api/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, timestamp: Date.now() })
      });
    } catch (e) {
      console.error('❌ حفظ التوكن فشل', e);
    }
  }

  // =========================
  // التفضيلات
  // =========================
  loadPreferences() {
    const p = JSON.parse(localStorage.getItem('tarhal_notification_prefs')) || {};
    this.notificationEnabled = p.notificationEnabled !== false;
    this.soundEnabled = p.soundEnabled !== false;
    this.vibrationEnabled = p.vibrationEnabled !== false;
  }

  savePreferences() {
    localStorage.setItem('tarhal_notification_prefs', JSON.stringify({
      notificationEnabled: this.notificationEnabled,
      soundEnabled: this.soundEnabled,
      vibrationEnabled: this.vibrationEnabled,
      updatedAt: Date.now()
    }));
  }

  // =========================
  // Toast
  // =========================
  showToast(message) {
    const t = document.createElement('div');
    t.style.cssText = `
      position:fixed;bottom:20px;left:20px;right:20px;
      background:#10b981;color:#fff;padding:14px;
      border-radius:12px;text-align:center;z-index:10000
    `;
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
}

// نسخة عالمية
window.TarhalNotificationManager = TarhalNotificationManager;