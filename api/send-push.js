// /api/send-push.js
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  console.log('📤 API send-push called');

  // ===== CORS =====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, rideId, requestId, customerName, vehicleType } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Missing FCM token' });
    }

    console.log('📦 Data received:', {
      token: token.substring(0, 30) + '...',
      rideId,
      requestId
    });

    // ===== 1️⃣ قراءة Service Account من Vercel =====
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT
    );

    // ===== 2️⃣ إنشاء OAuth Access Token =====
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const accessToken = await auth.getAccessToken();

    // ===== 3️⃣ إرسال الإشعار عبر FCM v1 =====
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: token,

            notification: {
              title: '🚖 طلب رحلة جديد - ترحال زونا',
              body: `${customerName || 'عميل'} يطلب ${getVehicleArabic(vehicleType)}`,
            },

            webpush: {
              notification: {
                icon: '/icons/icon-192x192.png',
                requireInteraction: true,
              },
              fcm_options: {
                link: `https://zoona-go-eosin.vercel.app/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId}`,
              },
            },

            data: {
              rideId: String(rideId || ''),
              requestId: String(requestId || ''),
              type: 'ride_request',
              timestamp: new Date().toISOString(),
            },
          },
        }),
      }
    );

    const result = await fcmResponse.json();
    console.log('📨 FCM Response:', result);

    if (fcmResponse.ok) {
      return res.status(200).json({
        success: true,
        message: 'تم إرسال الإشعار بنجاح',
        fcmResponse: result,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'فشل إرسال الإشعار',
        details: result,
      });
    }

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// ===== تحويل نوع المركبة =====
function getVehicleArabic(type) {
  const types = {
    tuktuk: 'ركشة',
    economy: 'سيارة اقتصادية',
    comfort: 'سيارة متوسطة',
    vip: 'سيارة VIP',
  };
  return types[type] || 'رحلة';
}