// /api/send-notification.js - النسخة النهائية
const admin = require('firebase-admin');

// تهيئة Firebase Admin SDK (مرة واحدة فقط)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        "type": "service_account",
        "project_id": process.env.FIREBASE_PROJECT_ID,
        "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        "client_email": process.env.FIREBASE_CLIENT_EMAIL
      })
    });
  } catch (error) {
    console.error('Firebase admin init error:', error);
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      token,          // FCM Token للسائق
      driverId,       // ID السائق
      rideId,         // ID الرحلة
      requestId,      // ID طلب الرحلة
      customerName,   // اسم العميل
      vehicleType,    // نوع المركبة
      amount,         // السعر
      distance        // المسافة
    } = req.body;

    // التحقق من البيانات الأساسية
    if (!token || !rideId || !requestId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    console.log(`📨 Sending notification to driver ${driverId} for ride ${rideId}`);

    // بناء رسالة FCM
    const message = {
      token: token,
      notification: {
        title: '🚖 طلب رحلة جديد - ترحال زونا',
        body: `${customerName || 'عميل'} يطلب ${getVehicleArabic(vehicleType)} - ${amount ? amount.toLocaleString() : ''} SDG`,
      },
      data: {
        type: 'ride_request',
        rideId: rideId.toString(),
        requestId: requestId.toString(),
        driverId: driverId || '',
        customerName: customerName || '',
        vehicleType: vehicleType || 'economy',
        amount: amount ? amount.toString() : '0',
        distance: distance || '0',
        timestamp: new Date().toISOString(),
        click_action: `https://${req.headers.host}/driver/accept-ride.html`,
        sound: 'default'
      },
      webpush: {
        fcmOptions: {
          link: `https://${req.headers.host}/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId}`
        },
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          vibrate: [200, 100, 200, 100, 200],
          requireInteraction: true,
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
        }
      },
      android: {
        priority: 'high'
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    // إرسال الإشعار عبر Firebase Admin
    const response = await admin.messaging().send(message);
    
    console.log('✅ Notification sent successfully:', response);
    
    return res.status(200).json({
      success: true,
      messageId: response,
      sentAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    
    // تحليل نوع الخطأ
    let errorType = 'unknown';
    if (error.code === 'messaging/invalid-registration-token') {
      errorType = 'invalid_token';
    } else if (error.code === 'messaging/registration-token-not-registered') {
      errorType = 'token_not_registered';
    }
    
    return res.status(500).json({
      success: false,
      error: error.message,
      errorType: errorType,
      code: error.code
    });
  }
}

function getVehicleArabic(type) {
  const types = {
    tuktuk: 'ركشة',
    economy: 'سيارة اقتصادية',
    comfort: 'سيارة متوسطة',
    vip: 'سيارة VIP'
  };
  return types[type] || 'رحلة';
}