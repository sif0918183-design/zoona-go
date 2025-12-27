// notification-manager.js - نظام إشعارات متقدم لتطبيق ترحال زونا
class TarhalNotificationManager {
  constructor() {
    this.permission = null;
    this.notificationEnabled = false;
    this.soundEnabled = false;
    this.vibrationEnabled = true;
    this.isInitialized = false;
    this.fcmToken = null;
    this.swRegistration = null;
    this.currentDriver = null;
    this.currentUser = null;
    this.isDriver = false;
    
    // تهيئة البيانات
    this.loadCurrentUserData();
  }

  // =========================
  // تهيئة النظام
  // =========================
  async initialize() {
    try {
      // التحقق من دعم المتصفح
      if (!('Notification' in window)) {
        console.log('❌ الإشعارات غير مدعومة في هذا المتصفح');
        return false;
      }

      // تسجيل Service Worker المناسب
      this.swRegistration = await this.getServiceWorkerRegistration();

      // تهيئة Firebase للمستخدمين المناسبين
      if (this.isDriver || this.shouldEnableNotifications()) {
        await this.initializeFirebase();
      }

      // تحميل التفضيلات
      this.loadPreferences();

      this.isInitialized = true;
      console.log('✅ نظام إشعارات ترحال جاهز');
      return true;

    } catch (error) {
      console.error('❌ خطأ في تهيئة نظام الإشعارات:', error);
      return false;
    }
  }

  // =========================
  // تحميل بيانات المستخدم
  // =========================
  loadCurrentUserData() {
    try {
      // محاولة جلب بيانات السائق
      const driverData = localStorage.getItem('tarhal_driver');
      if (driverData) {
        this.currentDriver = JSON.parse(driverData);
        this.isDriver = true;
        console.log(' تم التعرف على سائق:', this.currentDriver.full_name);
      }
      
      // محاولة جلب بيانات العميل
      const userData = localStorage.getItem('tarhal_customer');
      if (userData && !this.isDriver) {
        this.currentUser = JSON.parse(userData);
        console.log(' تم التعرف على عميل:', this.currentUser.full_name);
      }
    } catch (error) {
      console.warn('⚠️ خطأ في تحميل بيانات المستخدم:', error);
    }
  }

  // =========================
  // تحديد إذا كان يجب تفعيل الإشعارات
  // =========================
  shouldEnableNotifications() {
    // تفعيل الإشعارات للسائقين فقط
    if (this.isDriver) return true;
    
    // للعملاء، يمكن تفعيل حسب التفضيلات
    const prefs = JSON.parse(localStorage.getItem('tarhal_notification_prefs') || '{}');
    return prefs.notificationEnabled === true;
  }

  // =========================
  // الحصول على Service Worker المناسب
  // =========================
  async getServiceWorkerRegistration() {
    try {
      // محاولة استخدام Firebase SW أولاً
      let registration = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');
      
      if (!registration) {
        // البحث عن أي SW نشط
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          registration = registrations[0];
        }
      }
      
      if (!registration) {
        // تسجيل جديد باستخدام Firebase SW
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/firebase-cloud-messaging-push-scope'
        });
      }
      
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker جاهز');
      return registration;

    } catch (error) {
      console.error('❌ فشل تسجيل Service Worker:', error);
      
      // محاولة تسجيل بديل
      try {
        const fallbackRegistration = await navigator.serviceWorker.register('/service-worker.js');
        await navigator.serviceWorker.ready;
        console.log('✅ تم تسجيل Service Worker بديل');
        return fallbackRegistration;
      } catch (fallbackError) {
        console.error('❌ فشل جميع محاولات تسجيل Service Worker');
        throw fallbackError;
      }
    }
  }

  // =========================
  // تهيئة Firebase
  // =========================
  async initializeFirebase() {
    try {
      // التحقق من وجود Firebase
      if (!window.firebase || !firebase.messaging) {
        console.warn('⚠️ Firebase غير متوفر، جارٍ تحميله...');
        await this.loadFirebaseScripts();
      }

      const firebaseConfig = {
        apiKey: "AIzaSyBxQLDLqr4W3lApfYLPjSV5It7925a9Rr0",
        authDomain: "double-carport-476915-j7.firebaseapp.com",
        projectId: "double-carport-476915-j7",
        storageBucket: "double-carport-476915-j7.firebasestorage.app",
        messagingSenderId: "122641462099",
        appId: "1:122641462099:web:345b777a88757d3ef7e7a6"
      };

      // تهيئة Firebase إذا لم يكن مهيئاً
      if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
      }

      const messaging = firebase.messaging();

      // طلب الإذن
      this.permission = await Notification.requestPermission();
      if (this.permission !== 'granted') {
        console.log('❌ لم يتم منح إذن الإشعارات');
        this.notificationEnabled = false;
        return;
      }

      // الحصول على FCM Token
      // استبدل هذا:
// استخدم مفتاح VAPID الفعلي من Firebase
this.fcmToken = await messaging.getToken({
  vapidKey: "BE2_9m83w2cu_fxhqV4eUowZQT7E8nm-FZZMWqN5DByd-Naykp52nWwA9uuW_L9x_3rPPsMNZzctsZD8j5YyaZw", // ⬅️ ضع مفتاح VAPID الحقيقي هنا
  serviceWorkerRegistration: this.swRegistration
}).catch(error => {
  console.error('❌ فشل الحصول على FCM Token:', error);
  
  // استخدام بديل: إنشاء معرف فريد محلي
  if (!localStorage.getItem('tarhal_device_id')) {
    const deviceId = 'tarhal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('tarhal_device_id', deviceId);
  }
  
  return localStorage.getItem('tarhal_device_id');
});
   // ⭐⭐⭐⭐⭐ هنا أضف اختبار التوكن ⭐⭐⭐⭐⭐
        console.log(' FCM Token:', this.fcmToken);
        
        // تحقق من طول التوكن
        if (this.fcmToken && this.fcmToken.length > 100) {
            console.log('✅ التوكن صالح الطول:', this.fcmToken.length);
        } else {
            console.log('❌ التوكن قصير جداً أو غير صالح');
            
            // معلومات تفصيلية عن التوكن
            if (this.fcmToken) {
                console.log(' معلومات التوكن:');
                console.log('- النوع:', typeof this.fcmToken);
                console.log('- الطول:', this.fcmToken.length);
                console.log('- أول 50 حرف:', this.fcmToken.substring(0, 50));
                console.log('- يحتوي على ":"', this.fcmToken.includes(':'));
                console.log('- يبدأ بـ "f"', this.fcmToken.startsWith('f'));
            }
        }
        // ⭐⭐⭐⭐⭐ نهاية الاختبار ⭐⭐⭐⭐⭐

      if (this.fcmToken) {
        console.log('✅ FCM Token:', this.fcmToken.substring(0, 50) + '...');
        
        // حفظ التوكن في Supabase إذا كان سائقاً
        if (this.isDriver && this.currentDriver) {
          await this.saveDriverTokenToDatabase(this.fcmToken);
        }
        
        // حفظ في localStorage كنسخة احتياطية
        localStorage.setItem('tarhal_fcm_token', this.fcmToken);
      }

      // معالجة الرسائل في الواجهة
      messaging.onMessage(payload => {
        console.log(' إشعار في الواجهة:', payload);
        this.handleIncomingNotification(payload);
      });

      this.notificationEnabled = true;
      console.log('✅ Firebase مهيأ للإشعارات');

    } catch (error) {
      console.error('❌ خطأ في تهيئة Firebase:', error);
      
      // إذا فشل Firebase، نستخدم إشعارات المتصفح الأساسية
      if (this.permission === 'granted') {
        this.notificationEnabled = true;
        console.log('✅ تم تفعيل إشعارات المتصفح الأساسية');
      }
    }
  }

  // =========================
  // تحميل سكريبتات Firebase
  // =========================
  async loadFirebaseScripts() {
    return new Promise((resolve, reject) => {
      // تحقق إذا كان Firebase محملاً بالفعل
      if (window.firebase) {
        resolve();
        return;
      }

      const firebaseAppScript = document.createElement('script');
      firebaseAppScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
      firebaseAppScript.onload = () => {
        const firebaseMessagingScript = document.createElement('script');
        firebaseMessagingScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js';
        firebaseMessagingScript.onload = resolve;
        firebaseMessagingScript.onerror = reject;
        document.head.appendChild(firebaseMessagingScript);
      };
      firebaseAppScript.onerror = reject;
      document.head.appendChild(firebaseAppScript);
    });
  }

  // =========================
  // حفظ توكن السائق في قاعدة البيانات
  // =========================
  async saveDriverTokenToDatabase(token) {
    try {
      // استخدام Supabase
      const SB_URL = 'https://zsmlyiygjagmhnglrhoa.supabase.co';
      const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbWx5aXlnamFnbWhuZ2xyaG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NDc3NjMsImV4cCI6MjA4MTUyMzc2M30.QviVinAng-ILq0umvI5UZCFEvNpP3nI0kW_hSaXxNps';
      
      const supabase = window.supabase.createClient(SB_URL, SB_KEY);
      
      const { error } = await supabase
        .from('driver_notifications')
        .upsert({
          driver_id: this.currentDriver.id,
          fcm_token: token,
          notification_enabled: true,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'driver_id' });

      if (error) throw error;
      
      console.log('✅ تم حفظ توكن السائق في قاعدة البيانات');
      return true;

    } catch (error) {
      console.error('❌ فشل حفظ توكن السائق:', error);
      
      // محاولة الحفظ في JSONBin كنسخة احتياطية
      try {
        await this.saveTokenToJSONBin(token);
      } catch (jsonbinError) {
        console.error('❌ فشل الحفظ في JSONBin أيضاً');
      }
      
      return false;
    }
  }

  // =========================
  // حفظ التوكن في JSONBin (نسخة احتياطية)
  // =========================
  async saveTokenToJSONBin(token) {
    try {
      const TARHAL_BIN_ID = '69470e32ae596e708fa76869';
      const JSONBIN_KEY = '$2a$10$.o4BAbiMjGS4tEZUVokTsufL18lsFyO30xIOXO8wT4dP/sqGN/61e';

      const data = {
        token: token,
        userId: this.currentDriver?.id || this.currentUser?.id || null,
        userType: this.isDriver ? 'driver' : 'customer',
        timestamp: new Date().toISOString(),
        app: 'tarhal'
      };

      const response = await fetch(`https://api.jsonbin.io/v3/b/${TARHAL_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_KEY
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('فشل حفظ التوكن في JSONBin');

      console.log('✅ FCM Token محفوظ في JSONBin');
      return await response.json();

    } catch (error) {
      console.error('❌ خطأ في حفظ التوكن في JSONBin:', error);
      throw error;
    }
  }

  // =========================
  // معالجة الإشعارات الواردة
  // =========================
  handleIncomingNotification(payload) {
    const data = payload.data || payload.notification?.data || {};
    const title = payload.notification?.title || data.title || 'ترحال زونا';
    const body = payload.notification?.body || data.body || 'إشعار جديد';
    
    // عرض إشعار في التطبيق
    this.showInAppNotification({
      title: title,
      body: body,
      data: data
    });

    // تشغيل الصوت إذا كان مفعلاً
    if (this.soundEnabled && window.soundManager) {
      window.soundManager.play('notification');
    }

    // اهتزاز إذا كان مفعلاً
    if (this.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  // =========================
  // نافذة تفعيل الإشعارات
  // =========================
  showActivationPrompt() {
    // التحقق إذا سبق طلب التفعيل
    if (localStorage.getItem('tarhal_notifications_asked')) return;

    // للسائقين فقط
    if (!this.isDriver) return;

    const prompt = document.createElement('div');
    prompt.id = 'notification-activation-prompt';
    prompt.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.4s ease;
    `;

    prompt.innerHTML = `
      <div style="background: white; border-radius: 20px; padding: 30px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        <div style="font-size: 64px; margin-bottom: 20px; color: #4f46e5;"></div>
        <h3 style="color: #4f46e5; margin-bottom: 15px; font-weight: 800; font-size: 22px;">تفعيل إشعارات الرحلات</h3>
        <p style="color: #6b7280; margin-bottom: 25px; line-height: 1.6; font-size: 16px;">
          لاستقبال طلبات الركوب حتى مع إغلاق التطبيق وتلقي التنبيهات الفورية، يرجى تفعيل الإشعارات.
          <br><br>
          <strong style="color: #059669;">مطلوب لجميع السائقين!</strong>
        </p>
        <div style="display: flex; gap: 10px; flex-direction: column;">
          <button id="enable-all-btn" style="
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: white;
            border: none;
            padding: 18px;
            border-radius: 14px;
            font-size: 17px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          ">
            <ion-icon name="notifications"></ion-icon>
            تفعيل كل الإشعارات
          </button>
          <button id="skip-btn" style="
            background: transparent;
            color: #6b7280;
            border: 2px solid #e5e7eb;
            padding: 16px;
            border-radius: 14px;
            cursor: pointer;
            font-weight: 600;
          ">
            تخطي الآن
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(prompt);

    // إضافة أنماط CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // معالجة الأحداث
    document.getElementById('enable-all-btn').onclick = async () => {
      await this.enableAllFeatures();
      prompt.remove();
      localStorage.setItem('tarhal_notifications_asked', 'true');
      this.showToast('✅ تم تفعيل جميع الإشعارات بنجاح');
    };

    document.getElementById('skip-btn').onclick = () => {
      prompt.remove();
      localStorage.setItem('tarhal_notifications_asked', 'true');
      this.showToast('⚠️ يمكنك تفعيل الإشعارات لاحقاً من الإعدادات');
    };

    // إزالة تلقائية بعد 45 ثانية
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.remove();
        localStorage.setItem('tarhal_notifications_asked', 'true');
      }
    }, 45000);
  }

  // =========================
  // تفعيل جميع الميزات
  // =========================
  async enableAllFeatures() {
    try {
      // 1. طلب إذن الإشعارات
      this.permission = await Notification.requestPermission();
      
      if (this.permission !== 'granted') {
        this.showToast('❌ لم يتم منح إذن الإشعارات', 'error');
        return false;
      }

      // 2. تهيئة Firebase
      await this.initializeFirebase();

      // 3. تفعيل الصوت
      this.soundEnabled = true;
      
      // 4. تفعيل الاهتزاز
      this.vibrationEnabled = true;
      
      // 5. حفظ التفضيلات
      this.savePreferences();

      this.notificationEnabled = true;
      
      this.showToast(' تم تفعيل النظام بالكامل بنجاح');
      return true;

    } catch (error) {
      console.error('❌ خطأ في تفعيل الميزات:', error);
      this.showToast('⚠️ حدث خطأ أثناء التفعيل', 'error');
      return false;
    }
  }

  // =========================
  // إشعار داخل التطبيق
  // =========================
  showInAppNotification(payload) {
    if (!payload?.title) return;

    // إزالة أي إشعارات قديمة
    const oldNotifications = document.querySelectorAll('.tarhal-in-app-notification');
    oldNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'tarhal-in-app-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      background: white;
      padding: 18px;
      border-radius: 16px;
      box-shadow: 0 15px 40px rgba(0,0,0,0.2);
      z-index: 9999;
      border-right: 5px solid #4f46e5;
      animation: slideDown 0.4s ease;
      max-width: 400px;
      margin: 0 auto;
      cursor: pointer;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div style="
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
        ">
          
        </div>
        <div style="flex: 1;">
          <strong style="color: #1f2937; font-size: 16px; display: block; margin-bottom: 5px;">${payload.title}</strong>
          <div style="color: #6b7280; font-size: 14px;">${payload.body || ''}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 20px;
          cursor: pointer;
          padding: 5px;
        ">
          ×
        </button>
      </div>
    `;

    // النقر على الإشعار
    notification.onclick = () => {
      if (payload.data?.url) {
        window.location.href = payload.data.url;
      }
      notification.remove();
    };

    document.body.appendChild(notification);

    // إضافة أنماط CSS
    if (!document.querySelector('#inapp-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'inapp-notification-styles';
      style.textContent = `
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // إزالة تلقائية بعد 8 ثواني
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => notification.remove(), 300);
      }
    }, 8000);
  }

  // =========================
  // إرسال إشعار اختبار
  // =========================
  async sendTestNotification() {
    if (!this.isInitialized) {
      this.showToast('⚠️ النظام غير مهيأ', 'warning');
      return false;
    }

    try {
      // إشعار داخل التطبيق
      this.showInAppNotification({
        title: ' اختبار الإشعارات',
        body: 'نظام الإشعارات يعمل بشكل ممتاز!',
        data: {
          type: 'test',
          time: new Date().toISOString()
        }
      });

      // إذا كان الصوت مفعلاً
      if (this.soundEnabled && window.soundManager) {
        window.soundManager.play('notification');
      }

      this.showToast('✅ تم إرسال إشعار اختبار بنجاح');
      return true;

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار الاختبار:', error);
      this.showToast('❌ فشل إرسال الإشعار', 'error');
      return false;
    }
  }

  // =========================
  // إشعارات خاصة بالسائقين
  // =========================
  async sendDriverNotification(driverId, payload) {
    if (!this.isDriver || !this.fcmToken) return false;

    try {
      const response = await fetch('/api/send-driver-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driverId,
          token: this.fcmToken,
          payload: payload
        })
      });

      return response.ok;
    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار للسائق:', error);
      return false;
    }
  }

  // =========================
  // إدارة التفضيلات
  // =========================
  loadPreferences() {
    try {
      const prefs = JSON.parse(localStorage.getItem('tarhal_notification_prefs') || '{}');
      
      this.notificationEnabled = prefs.notificationEnabled !== false;
      this.soundEnabled = prefs.soundEnabled !== false;
      this.vibrationEnabled = prefs.vibrationEnabled !== false;
      
      console.log('⚙️ تم تحميل تفضيلات الإشعارات:', prefs);
    } catch (error) {
      console.warn('⚠️ خطأ في تحميل التفضيلات:', error);
    }
  }

  savePreferences() {
    const prefs = {
      notificationEnabled: this.notificationEnabled,
      soundEnabled: this.soundEnabled,
      vibrationEnabled: this.vibrationEnabled,
      lastUpdated: new Date().toISOString()
    };

    try {
      localStorage.setItem('tarhal_notification_prefs', JSON.stringify(prefs));
      console.log(' تم حفظ تفضيلات الإشعارات');
    } catch (error) {
      console.error('❌ خطأ في حفظ التفضيلات:', error);
    }
  }

  // =========================
  // إشعارات Toast
  // =========================
  showToast(message, type = 'success') {
    // إزالة أي Toast قديمة
    const oldToast = document.querySelector('.tarhal-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'tarhal-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
      color: white;
      padding: 16px;
      border-radius: 14px;
      text-align: center;
      font-weight: 700;
      z-index: 10000;
      animation: toastSlide 0.4s ease;
      max-width: 400px;
      margin: 0 auto;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      font-family: 'Tajawal', sans-serif;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    `;

    let icon = '✅';
    if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `${icon} ${message}`;
    document.body.appendChild(toast);

    // إضافة أنماط الحركة
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes toastSlide {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // إزالة تلقائية
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // =========================
  // تفعيل خاص للسائقين
  // =========================
  async setupDriverNotifications() {
    if (!this.isDriver) {
      this.showToast('⚠️ هذه الميزة للسائقين فقط', 'warning');
      return false;
    }

    try {
      const result = await this.enableAllFeatures();
      
      if (result) {
        this.showToast(' تم تفعيل إشعارات السائق بنجاح');
        
        // إخفاء زر التفعيل
        const btn = document.getElementById('driver-notification-activation');
        if (btn) btn.style.display = 'none';
      }
      
      return result;
    } catch (error) {
      console.error('❌ خطأ في تفعيل إشعارات السائق:', error);
      this.showToast('❌ فشل تفعيل إشعارات السائق', 'error');
      return false;
    }
  }
}

// نسخة عالمية
window.TarhalNotificationManager = TarhalNotificationManager;

// تهيئة تلقائية عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
  // انتظار تحميل الصفحة بالكامل
  setTimeout(async () => {
    try {
      // إنشاء مدير الإشعارات
      window.notificationManager = new TarhalNotificationManager();
      
      // تهيئة النظام
      await window.notificationManager.initialize();
      
      // عرض نافذة التفعيل إذا كان سائقاً ولم يتم السؤال من قبل
      if (window.notificationManager.isDriver && 
          !localStorage.getItem('tarhal_notifications_asked')) {
        setTimeout(() => {
          window.notificationManager.showActivationPrompt();
        }, 3000);
      }
      
      console.log(' نظام إشعارات ترحال محمّل وجاهز');
      
    } catch (error) {
      console.error('❌ فشل تحميل نظام الإشعارات:', error);
    }
  }, 1000);
});
// إضافة هذه الدالة لتحسين نظام التسجيل
async function registerDriverForPushNotifications(driverId) {
    try {
        // 1. طلب إذن الإشعارات
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            console.log('❌ لم يتم منح إذن الإشعارات');
            return null;
        }

        // 2. الحصول على Service Worker المناسب
        const registration = await navigator.serviceWorker.ready;
        
        // 3. الحصول على FCM Token باستخدام VAPID Key الصحيح
        const messaging = firebase.messaging();
        const token = await messaging.getToken({
            vapidKey: "BE2_9m83w2cu_fxhqV4eUowZQT7E8nm-FZZMWqN5DByd-Naykp52nWwA9uuW_L9x_3rPPsMNZzctsZD8j5YyaZw",
            serviceWorkerRegistration: registration
        });

        if (!token) {
            throw new Error('Failed to get FCM token');
        }

        console.log(`✅ تم الحصول على FCM Token: ${token.substring(0, 50)}...`);

        // 4. حفظ التوكن في Supabase
        const { error } = await supabase
            .from('driver_notifications')
            .upsert({
                driver_id: driverId,
                fcm_token: token,
                notification_enabled: true,
                vapid_key_used: "BE2_9m83w2cu_fxhqV4eUowZQT7E8nm-FZZMWqN5DByd-Naykp52nWwA9uuW_L9x_3rPPsMNZzctsZD8j5YyaZw",
                registered_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'driver_id' });

        if (error) throw error;

        console.log(`✅ تم تسجيل السائق ${driverId} للإشعارات`);
        return token;

    } catch (error) {
        console.error('❌ خطأ في تسجيل الإشعارات:', error);
        
        // محاولة استخدام التوكن القديم إذا كان موجوداً
        const { data: existingToken } = await supabase
            .from('driver_notifications')
            .select('fcm_token')
            .eq('driver_id', driverId)
            .single();
            
        return existingToken?.fcm_token || null;
    }
}
// تصدير للاستخدام في وحدات أخرى
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TarhalNotificationManager };
}