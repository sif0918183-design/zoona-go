// /api/send-ride-notification.js
// ✅ ملف إرسال إشعارات طلبات الركوب لتطبيق "ترحال"

// =================================================================
// 1️⃣ استيراد Firebase Admin SDK
// =================================================================
const admin = require('firebase-admin');

// =================================================================
// 2️⃣ تهيئة Firebase Admin بمفاتيحك الخاصة
// =================================================================
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      "type": "service_account",
      "project_id": "double-carport-476915-j7",
      "private_key_id": "bf8c60ada535c6ff7a8d7a77805c441458261835",
      "private_key": `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDH0zNYhNG7zcTp\nYkOhnWqVFb3xIQSzMC4gIrhr2UMT+exwh5frt6Y2QPbv7zB1GZptxalV6j1vbu01\nZOrxtbsDMACJkRxoDkTFW1ANp4SsXEYOt/plXIRcqqwJFvKL3Hk3Nj+k0Y+x1W3Y\n0CiECyOG7fbQp9K8dBxNs1BwjYcEThgTbEuYN0fPgrdUcs/jkAGIdineUDjd0Hwd\np6JuT1/Y22a0n3z0I2tnLOaATebCQfiFqMCcW/izullTiT50isqGWlKm9dyAhwrQ\n16rKhpKl9ia0OGZGDI94KRAj0/GfOUiLUhkeZCPa9w6JoCu4Yd9T3YCn67n7TtXE\noWgSnSEPAgMBAAECggEAN71RIEsEWhe+6r8PUIChn26OKjnknrs80pf8y5CyJltb\nudQI66axxYZ/m1QkNzXqHt65Ko8JjhDqOC+rXbssrGnybG0++EOqqUacYQKufonK\nvQZS4X1aKqMtE+gDxkG8ykrmm+oc5CU92/HMq3CT+2pbo758iTb2QjJXqN3BoNBM\n/qs/Fe+YOsiRtkCll4KlUsKWhy/3B15xCQDZj2+1KKXM9ph+oZfEDrTTF9JOen7G\nCuXabSdzNj22v2cb7sjif7+HzzlXfVRjNfQ0wZJVOEhHN8TD4NIYZj/ixo7H6BGZ\nH4xB5fCvxPB235nINLIMX2xEjkkt5icio4wkMab1mQKBgQD7oVsoPp9pEY0tBf6A\nz6hjsef6/UTwrZo30ZicomZnYSC9vCue7180ytzPYUCqbufjS7ZbCdz0/JiXRRBr\ngG70qvE2zDYD+/jIhFLv753y+RVgDMEK/w0+E0oG5K5/ritisD9Y4xWReL8hzoB3\nP510li32qUehp1zzbBfSfCQ0nQKBgQDLS4olj1uKS4Ks+12q0C4SMDxbIjXAfRlm\nUdRsc/avj1b83+XafQ1J/715rwRov3E1l+JxLl8/y5BtwM9Y/2JahLa8rOZC/emn\nKYDsy4ukhqQluVldor/WJLd5vtZfy4gToarIJ6ppW7tEaBnsl259ZrNHPuhDE4cc\nC5ALKjx+mwKBgGNZ7jgRobdGastgFoCdfQr/72w2G8Y7hSyM4QjXRj+DJf5EEaUL\nNjgN8OkgqPuiFoS0HCgN2OQR592yMy1+5FBOPjc4ogsora3eMTDzFxYcKshlwMKq\nuXvM+emG2S8ogZDRrfFWl+l8F1stwaNTxsOFmFhPtiypfBXQlAdTZKgxAoGBAMBN\nN2NqJRQ/c1//8s2GWV45JI6sYJ4xd9pS45anZx0QgR95B6tSiUSLVocJaClRllw0\nzS10yQLGo1s+fKTaBwZK7bSx9KpAF0pZtyvHKtO5zQImPwOU1NRTLP9L5ur80z6G\nuc7Vvpwk+pKtyoADiq+yezmUpw30JeUAhwQYstqrAoGBAJEFDylSWoVWLVyP8kvG\nA0eqk3NUitnbPNvEehFJ0aGJMvzErRqYlhHR8pUAN4oej9PPlhIeSpiatLmrujCb\n+B3y10Cmd3Jesa15u69Y4vqpdlljZA6xtSgCgYTqh75Jx9zCoJc6dPAh9qGGlE77\nDKOf019s1/UwEmUNEK1n34sa\n-----END PRIVATE KEY-----\n`.replace(/\\n/g, '\n'),
      "client_email": "zoona-sd@double-carport-476915-j7.iam.gserviceaccount.com",
      "client_id": "105841361568383013882",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/zoona-sd%40double-carport-476915-j7.iam.gserviceaccount.com",
      "universe_domain": "googleapis.com"
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully for Tarhal');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
}

// =================================================================
// 3️⃣ إعدادات JSONBin لتطبيق ترحال
// =================================================================
const TARHAL_BIN_ID = '66a1b2c3d4e5f67890123456'; // ⚠️ استبدل هذا بـ BIN_ID الجديد لتطبيق ترحال
const JSONBIN_KEY = '$2a$10$oHNml.lQOJitFfK0hyyT0.81SIcJolFR5be5uAAQ8IOiECZHAELTW'; // مفتاحك الرئيسي

// =================================================================
// 4️⃣ الدالة الرئيسية للتعامل مع الطلبات
// =================================================================
export default async function handler(req, res) {
  // ✅ تعيين رؤوس CORS للسماح بالطلبات من تطبيق ترحال
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // ✅ التعامل مع طلبات OPTIONS (لـ CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // ✅ التحقق من أن الطريقة POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'الطريقة غير مسموحة. استخدم POST فقط.' 
    });
  }

  // ✅ التحقق من وجود البيانات المطلوبة
  const { 
    rideId, 
    customerName, 
    pickupLocation, 
    destination, 
    amount, 
    vehicleType,
    driverCarType, // نوع سيارة السائق المطلوب (اختياري)
    customerPhone, // رقم هاتف العميل
    notes // ملاحظات إضافية
  } = req.body;

  if (!rideId || !customerName) {
    return res.status(400).json({ 
      success: false, 
      error: "بيانات الرحلة ناقصة. يرجى تقديم rideId و customerName." 
    });
  }

  try {
    console.log(`🚖 [ترحال] معالجة طلب رحلة جديد ID: ${rideId}`);
    
    // =================================================================
    // 5️⃣ جلب قائمة سائقين ترحال من JSONBin
    // =================================================================
    console.log('📋 جلب قائمة السائقين من JSONBin...');
    const getRes = await fetch(`https://api.jsonbin.io/v3/b/${TARHAL_BIN_ID}/latest`, {
      headers: { 
        'X-Master-Key': JSONBIN_KEY,
        'X-Bin-Meta': 'false',
        'Content-Type': 'application/json'
      }
    });

    if (!getRes.ok) {
      const errorText = await getRes.text();
      console.error(`❌ فشل جلب بيانات السائقين: ${getRes.status} - ${errorText}`);
      throw new Error(`فشل جلب بيانات السائقين: ${getRes.status}`);
    }

    const data = await getRes.json();
    const drivers = data.drivers || [];
    
    console.log(`✅ تم جلب ${drivers.length} سائق من قاعدة بيانات ترحال`);
    
    // =================================================================
    // 6️⃣ تصفية السائقين المناسبين
    // =================================================================
    console.log('🔍 تصفية السائقين المتاحين...');
    const eligibleDrivers = drivers.filter(driver => {
      // السائق يجب أن يكون متصلاً
      if (driver.isOnline !== true) {
        return false;
      }
      
      // إذا تم تحديد نوع سيارة، تأكد من توافقه
      if (driverCarType && driver.carType !== driverCarType) {
        return false;
      }
      
      // التأكد من وجود token صالح
      if (!driver.token || driver.token.length < 50) {
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ ${eligibleDrivers.length} سائق مؤهل من ${drivers.length} إجمالي`);
    
    if (eligibleDrivers.length === 0) {
      return res.status(404).json({
        success: false,
        error: "لا يوجد سائقين متاحين حالياً",
        availableDrivers: 0,
        suggestions: "حاول تغيير نوع المركبة أو الانتظار قليلاً"
      });
    }
    
    // =================================================================
    // 7️⃣ تحضير قائمة التوكنات للإرسال
    // =================================================================
    const tokens = eligibleDrivers.map(driver => driver.token).filter(t => t && t.length > 50);
    
    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: "لا توجد توكنات صالحة للإرسال"
      });
    }
    
    console.log(`📤 جاهز لإرسال الإشعار إلى ${tokens.length} سائق`);
    
    // =================================================================
    // 8️⃣ إعداد رسالة الإشعار الخاصة بترحال
    // =================================================================
    const notificationTitle = '🚖 طلب رحلة جديد - ترحال';
    const notificationBody = `${customerName} يطلب رحلة ${vehicleType ? `(${getVehicleTypeName(vehicleType)})` : ''} من "${pickupLocation || 'موقع غير محدد'}"`;
    
    if (destination) {
      notificationBody += ` إلى "${destination}"`;
    }
    
    if (amount) {
      notificationBody += ` - ${amount} SDG`;
    }
    
    const message = {
      notification: {
        title: notificationTitle,
        body: notificationBody.substring(0, 100) // تقصير النص إذا كان طويلاً
      },
      data: {
        rideId: rideId.toString(),
        customerName: customerName,
        customerPhone: customerPhone || '',
        pickupLocation: pickupLocation || 'موقع غير محدد',
        destination: destination || 'وجهة غير محددة',
        amount: amount || '0',
        vehicleType: vehicleType || 'economy',
        driverCarType: driverCarType || 'any',
        notes: notes || '',
        timestamp: new Date().toISOString(),
        app: 'tarhal',
        // ✅ بيانات للأزرار التفاعلية
        click_action: 'ACCEPT_RIDE',
        action_url: `/driver/accept-ride.html?rideId=${rideId}`,
        // ✅ بيانات إضافية للواجهة
        urgency: 'high',
        sound: 'default',
        badge_count: '1'
      },
      webpush: {
        fcmOptions: {
          link: `/driver/accept-ride.html?rideId=${rideId}`
        },
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          vibrate: [200, 100, 200, 100, 200], // نمط اهتزاز متميز
          requireInteraction: true, // يبقى حتى يقوم السائق بفعل
          tag: `tarhal-ride-${rideId}`, // لمنع التكرار
          timestamp: Date.now(),
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
        },
        headers: {
          Urgency: 'high' // ✅ لإعطاء أولوية عالية للإشعار
        }
      },
      // ✅ إرسال لجميع السائقين المؤهلين
      tokens: tokens
    };
    
    // =================================================================
    // 9️⃣ إرسال الإشعارات عبر FCM
    // =================================================================
    console.log('🚀 إرسال الإشعارات عبر Firebase Cloud Messaging...');
    const response = await admin.messaging().sendMulticast(message);
    
    // =================================================================
    // 🔟 تسجيل النتائج والإحصائيات
    // =================================================================
    const results = {
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalSent: tokens.length,
      rideId: rideId,
      sentAt: new Date().toISOString(),
      driversNotified: eligibleDrivers.length
    };
    
    // تسجيل التفاصيل إذا كان هناك فشل
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ فشل إرسال إلى token ${idx}:`, resp.error);
        }
      });
    }
    
    console.log(`✅ تم إرسال الإشعار بنجاح إلى ${response.successCount} من ${tokens.length} سائق`);
    
    // =================================================================
    // 1️⃣1️⃣ تحديث Bin ترحال بسجل الإرسال
    // =================================================================
    try {
      const historyUpdate = {
        ...data,
        notificationsHistory: [
          ...(data.notificationsHistory || []),
          {
            rideId,
            customerName,
            sentTo: tokens.length,
            successCount: response.successCount,
            amount: amount || 0,
            vehicleType: vehicleType || 'economy',
            timestamp: new Date().toISOString(),
            status: response.successCount > 0 ? 'sent' : 'failed'
          }
        ],
        stats: {
          totalNotifications: (data.stats?.totalNotifications || 0) + 1,
          successfulNotifications: (data.stats?.successfulNotifications || 0) + (response.successCount > 0 ? 1 : 0),
          lastNotification: new Date().toISOString()
        }
      };
      
      // حفظ تحديث التاريخ (غير متزامن - لا ننتظره)
      fetch(`https://api.jsonbin.io/v3/b/${TARHAL_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_KEY,
          'X-Bin-Name': 'ترحال زونا - سائقين وإشعارات'
        },
        body: JSON.stringify(historyUpdate)
      }).catch(err => console.error('⚠️ فشل تحديث سجل التاريخ:', err.message));
      
    } catch (historyError) {
      console.warn('⚠️ فشل تحديث سجل التاريخ:', historyError.message);
      // لا نوقف العملية إذا فشل تحديث التاريخ
    }
    
    // =================================================================
    // 1️⃣2️⃣ إرجاع النتيجة النهائية
    // =================================================================
    return res.status(200).json({
      success: true,
      message: `تم إرسال طلب الرحلة إلى ${response.successCount} سائق`,
      results: results,
      rideDetails: {
        rideId,
        customerName,
        pickupLocation,
        destination,
        amount,
        vehicleType
      },
      notificationPreview: {
        title: notificationTitle,
        body: notificationBody
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار:', error);
    
    // تحديد نوع الخطأ وإرجاع رسالة مناسبة
    let errorMessage = `فشل إرسال الإشعار: ${error.message}`;
    let statusCode = 500;
    
    if (error.message.includes('Firebase Admin initialization')) {
      errorMessage = 'خطأ في تهيئة Firebase. تأكد من صحة مفاتيح الخدمة.';
      statusCode = 500;
    } else if (error.message.includes('JSONBin')) {
      errorMessage = 'خطأ في الاتصال بقاعدة بيانات السائقين. تأكد من BIN_ID والمفتاح.';
      statusCode = 502;
    } else if (error.message.includes('permission') || error.message.includes('credential')) {
      errorMessage = 'خطأ في صلاحيات Firebase. تأكد من صلاحية مفتاح الخدمة.';
      statusCode = 403;
    }
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

// =================================================================
// 📝 دوال مساعدة
// =================================================================
function getVehicleTypeName(type) {
  const vehicleNames = {
    'tuktuk': 'توك توك',
    'economy': 'اقتصادية',
    'comfort': 'متوسطة',
    'vip': 'VIP',
    'driver': 'خاص بالسائقين',
    'staff': 'الموظفين'
  };
  return vehicleNames[type] || type;
}

// =================================================================
// 🔧 دالة مساعدة للتحقق من صحة التوكن
// =================================================================
function isValidFCMToken(token) {
  return token && 
         typeof token === 'string' && 
         token.length > 50 && 
         token.includes(':');
}

// =================================================================
// 📊 دالة لجلب إحصائيات الإشعارات (اختياري)
// =================================================================
export async function getNotificationStats() {
  try {
    const getRes = await fetch(`https://api.jsonbin.io/v3/b/${TARHAL_BIN_ID}/latest`, {
      headers: { 
        'X-Master-Key': JSONBIN_KEY,
        'X-Bin-Meta': 'false'
      }
    });
    
    if (getRes.ok) {
      const data = await getRes.json();
      return {
        totalDrivers: data.drivers?.length || 0,
        onlineDrivers: data.drivers?.filter(d => d.isOnline)?.length || 0,
        totalNotifications: data.stats?.totalNotifications || 0,
        lastNotification: data.stats?.lastNotification || 'لا توجد'
      };
    }
  } catch (error) {
    console.error('Error getting stats:', error);
  }
  return null;
}