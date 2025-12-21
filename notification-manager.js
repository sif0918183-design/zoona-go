// notification-manager.js
class TarhalNotificationManager {
  constructor() {
    this.permission = null;
    this.notificationEnabled = false;
    this.soundEnabled = false;
    this.vibrationEnabled = true;
    this.isInitialized = false;
    this.fcmToken = null;
  }

  // ✅ تهيئة نظام الإشعارات
  async initialize() {
    try {
      // التحقق من دعم الإشعارات
      if (!('Notification' in window)) {
        console.log('❌ الإشعارات غير مدعومة في هذا المتصفح');
        return false;
      }

      // التحقق من دعم Service Worker
      if (!('serviceWorker' in navigator)) {
        console.log('❌ Service Worker غير مدعوم');
        return false;
      }

      // تسجيل Service Worker
      await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker مسجل بنجاح');

      // تسجيل Firebase Messaging
      await this.initializeFirebase();

      // تحميل التفضيلات
      this.loadPreferences();

      this.isInitialized = true;
      console.log('✅ نظام الإشعارات جاهز');
      
      return true;

    } catch (error) {
      console.error('❌ خطأ في تهيئة الإشعارات:', error);
      return false;
    }
  }

  // ✅ تهيئة Firebase
  async initializeFirebase() {
    try {
      const firebaseConfig = {
        apiKey: "AIzaSyBxQLDLqr4W3lApfYLPjSV5It7925a9Rr0",
        authDomain: "double-carport-476915-j7.firebasestorage.app",
        projectId: "double-carport-476915-j7",
        messagingSenderId: "122641462099",
        appId: "1:122641462099:web:345b777a88757d3ef7e7a6"
      };

      const firebaseApp = firebase.initializeApp(firebaseConfig);
      const messaging = firebase.messaging();

      // طلب إذن الإشعارات
      this.permission = await Notification.requestPermission();
      
      if (this.permission === 'granted') {
        // الحصول على FCM Token
        this.fcmToken = await messaging.getToken();
        console.log('✅ FCM Token:', this.fcmToken);
        
        // حفظ Token في السيرفر
        await this.saveTokenToServer(this.fcmToken);
        
        // الاستماع للإشعارات في الواجهة
        messaging.onMessage((payload) => {
          console.log('📨 إشعار في الواجهة:', payload);
          this.showInAppNotification(payload);
        });

        this.notificationEnabled = true;
      } else {
        console.log('❌ لم يتم منح إذن الإشعارات');
      }

    } catch (error) {
      console.log('❌ خطأ في Firebase:', error);
      // استمرار بدون Firebase
    }
  }

  // ✅ عرض نموذج تفعيل الإشعارات (مرة واحدة فقط)
  showActivationPrompt() {
    // التحقق إذا سبق التفاعل
    if (localStorage.getItem('tarhal_notifications_asked')) {
      return;
    }

    const prompt = document.createElement('div');
    prompt.id = 'notification-activation-prompt';
    prompt.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 99999;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: fadeIn 0.3s ease;
    `;

    prompt.innerHTML = `
      <div style="background: white; border-radius: 20px; padding: 30px; max-width: 400px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 20px;">🔔</div>
        <h3 style="color: #4f46e5; margin-bottom: 15px; font-weight: 700;">تفعيل الإشعارات</h3>
        <p style="color: #6b7280; margin-bottom: 25px; line-height: 1.6;">
          لاستقبال طلبات الرحلات حتى مع إغلاق التطبيق، يرجى تفعيل:
          <br><br>
          ✅ <strong>الإشعارات الفورية</strong><br>
          🔊 <strong>الأصوات والتنبيهات</strong><br>
          📳 <strong>الاهتزاز</strong>
        </p>
        <div style="display: flex; gap: 10px; flex-direction: column;">
          <button id="enable-all-btn" 
                  style="background: #4f46e5; color: white; border: none; 
                         padding: 16px; border-radius: 12px; 
                         font-size: 16px; font-weight: bold; cursor: pointer;">
            <ion-icon name="notifications"></ion-icon>
            تفعيل الكل (موصى به)
          </button>
          <button id="enable-notifications-btn" 
                  style="background: #e0e7ff; color: #4f46e5; border: 1px solid #4f46e5;
                         padding: 14px; border-radius: 12px; cursor: pointer;">
            <ion-icon name="notifications-outline"></ion-icon>
            تفعيل الإشعارات فقط
          </button>
          <button onclick="this.closest('#notification-activation-prompt').remove()" 
                  style="background: transparent; color: #6b7280; 
                         padding: 12px; border-radius: 12px; cursor: pointer;">
            تخطي الآن
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(prompt);

    // أحداث الأزرار
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

    // إظهار النموذج بعد 3 ثواني من فتح التطبيق
    setTimeout(() => {
      prompt.style.opacity = '1';
    }, 3000);
  }

  // ✅ تفعيل كل الميزات
  async enableAllFeatures() {
    try {
      // 1. طلب إذن الإشعارات
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        this.notificationEnabled = true;
        
        // 2. تفعيل الصوت
        if (window.soundManager) {
          window.soundManager.enabled = true;
          await window.soundManager.play('notification', { volume: 0.3 });
        }
        
        // 3. تفعيل الاهتزاز
        this.vibrationEnabled = true;
        
        // 4. حفظ التفضيلات
        this.savePreferences();
        
        // 5. إشعار النجاح
        this.showToast('✅ تم تفعيل جميع الميزات بنجاح');
        
        return true;
      }
      
    } catch (error) {
      console.error('❌ خطأ في تفعيل الميزات:', error);
      this.showToast('⚠️ تعذر تفعيل بعض الميزات', 'error');
    }
  }

  // ✅ تفعيل الإشعارات فقط
  async enableNotificationsOnly() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        this.notificationEnabled = true;
        this.savePreferences();
        
        this.showToast('✅ تم تفعيل الإشعارات');
        
        return true;
      }
      
    } catch (error) {
      console.error('❌ خطأ في تفعيل الإشعارات:', error);
    }
  }

  // ✅ إرسال إشعار اختبار
  async sendTestNotification() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.notificationEnabled) {
      this.showActivationPrompt();
      return;
    }

    try {
      // إشعار محلي
      const notification = new Notification('🧪 اختبار ترحال زونا', {
        body: 'هذا إشعار اختبار للتأكد من عمل النظام',
        icon: 'icons/icon-192x192.png',
        badge: 'icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        requireInteraction: true,
        data: {
          url: '/',
          test: true,
          timestamp: Date.now()
        }
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // تشغيل صوت الاختبار
      if (window.soundManager && this.soundEnabled) {
        window.soundManager.play('notification', { volume: 0.5 });
      }

      // تشغيل الاهتزاز
      if (this.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      console.log('✅ إشعار اختبار مرسل');

    } catch (error) {
      console.error('❌ خطأ في إرسال الإشعار:', error);
    }
  }

  // ✅ إرسال إشعار رحلة للسائق
  async sendRideNotificationToDriver(driverId, rideData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const notificationData = {
      title: '🚖 طلب رحلة جديد',
      body: `من ${rideData.customerName} - ${rideData.distance} كم`,
      icon: 'icons/icon-192x192.png',
      badge: 'icons/icon-72x72.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: `ride-${rideData.id}`,
      requireInteraction: true,
      silent: false,
      data: {
        type: 'NEW_RIDE',
        rideId: rideData.id,
        customerName: rideData.customerName,
        customerPhone: rideData.customerPhone,
        pickupLocation: rideData.pickupLocation,
        destination: rideData.destination,
        distance: rideData.distance,
        price: rideData.price,
        vehicleType: rideData.vehicleType,
        url: `/accept-ride.html?rideId=${rideData.id}`,
        timestamp: Date.now(),
        expires: Date.now() + 45000 // 45 ثانية
      },
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
      ]
    };

    try {
      // 1. إرسال عبر Firebase (إذا كان متصلاً)
      if (this.fcmToken) {
        await this.sendFirebaseNotification(driverId, notificationData);
      }

      // 2. إرسال إشعار محلي
      if (this.notificationEnabled && Notification.permission === 'granted') {
        const notification = new Notification(notificationData.title, notificationData);
        
        notification.onclick = (event) => {
          event.preventDefault();
          window.location.href = notificationData.data.url;
        };
      }

      // 3. تشغيل الصوت
      if (window.soundManager && this.soundEnabled) {
        window.soundManager.play('new_ride', { volume: 0.8, loop: true });
      }

      // 4. الاهتزاز المتكرر
      if (this.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
      }

      console.log(`✅ إشعار رحلة مرسل للسائق ${driverId}`);

    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار الرحلة:', error);
      
      // طريقة احتياطية: تنبيه في الواجهة
      this.showInAppNotification({
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data
      });
    }
  }

  // ✅ إرسال إشعار عبر Firebase
  async sendFirebaseNotification(driverId, notificationData) {
    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': 'key=YOUR_SERVER_KEY',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: driverId, // أو topic: `driver_${driverId}`
          notification: {
            title: notificationData.title,
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            sound: 'default'
          },
          data: notificationData.data,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              vibrate: 'true',
              channel_id: 'tarhal_rides'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                category: 'NEW_RIDE'
              }
            }
          },
          webpush: {
            headers: {
              Urgency: 'high'
            },
            notification: {
              requireInteraction: true,
              vibrate: [200, 100, 200]
            }
          }
        })
      });

      return await response.json();

    } catch (error) {
      console.error('❌ خطأ في Firebase:', error);
      throw error;
    }
  }

  // ✅ عرض إشعار داخل التطبيق
  showInAppNotification(payload) {
    const notification = document.createElement('div');
    notification.className = 'in-app-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      left: 20px;
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: slideDown 0.3s ease;
      border-right: 4px solid #4f46e5;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 400px;
      margin: 0 auto;
    `;

    notification.innerHTML = `
      <div style="font-size: 24px;">🚖</div>
      <div style="flex: 1;">
        <strong style="display: block; color: #4f46e5; margin-bottom: 4px;">${payload.title}</strong>
        <div style="color: #6b7280; font-size: 14px;">${payload.body}</div>
      </div>
      <button onclick="this.closest('.in-app-notification').remove()" 
              style="background: transparent; border: none; color: #6b7280; cursor: pointer;">
        <ion-icon name="close" style="font-size: 20px;"></ion-icon>
      </button>
    `;

    document.body.appendChild(notification);

    // إضافة حدث النقر
    notification.onclick = () => {
      if (payload.data && payload.data.url) {
        window.location.href = payload.data.url;
      }
      notification.remove();
    };

    // الإزالة التلقائية
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // ✅ حفظ Token في السيرفر
  async saveTokenToServer(token) {
    try {
      const response = await fetch('/api/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          userId: window.currentDriver?.id || window.currentUser?.id,
          userType: window.currentDriver ? 'driver' : 'customer',
          timestamp: Date.now()
        })
      });

      return await response.json();

    } catch (error) {
      console.error('❌ خطأ في حفظ Token:', error);
    }
  }

  // ✅ تحميل التفضيلات
  loadPreferences() {
    try {
      const prefs = JSON.parse(localStorage.getItem('tarhal_notification_prefs')) || {};
      
      this.notificationEnabled = prefs.notificationEnabled !== false;
      this.soundEnabled = prefs.soundEnabled !== false;
      this.vibrationEnabled = prefs.vibrationEnabled !== false;
      
      console.log('⚙️ تفضيلات الإشعارات:', prefs);
      
    } catch (error) {
      console.error('❌ خطأ في تحميل التفضيلات:', error);
    }
  }

  // ✅ حفظ التفضيلات
  savePreferences() {
    const prefs = {
      notificationEnabled: this.notificationEnabled,
      soundEnabled: this.soundEnabled,
      vibrationEnabled: this.vibrationEnabled,
      updatedAt: Date.now()
    };
    
    localStorage.setItem('tarhal_notification_prefs', JSON.stringify(prefs));
  }

  // ✅ عرض رسالة toast
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      left: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4f46e5'};
      color: white;
      padding: 14px;
      border-radius: 12px;
      text-align: center;
      font-weight: 600;
      z-index: 10000;
      animation: slideUp 0.3s ease;
      max-width: 400px;
      margin: 0 auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ✅ تفعيل الاهتزاز
  vibrate(pattern = [200, 100, 200]) {
    if (this.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  // ✅ إرسال إشعار ركود للسائقين
  async sendRideExpiredNotification(rideId) {
    if (this.notificationEnabled) {
      const notification = new Notification('⏰ انتهى وقت الرحلة', {
        body: 'تم إلغاء الرحلة لانتهاء الوقت',
        icon: 'icons/icon-192x192.png',
        tag: `expired-${rideId}`
      });
    }
  }
}

// إنشاء نسخة عالمية
window.TarhalNotificationManager = TarhalNotificationManager;