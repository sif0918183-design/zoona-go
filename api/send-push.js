// /api/send-push.js - نسخة تعمل مباشرة مع FCM v1 بدون مكتبات خارجية
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
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT غير موجود في متغيرات البيئة');

    // ===== 2️⃣ إنشاء JWT يدوي للحصول على Access Token =====
    const jwtHeader = {
      alg: "RS256",
      typ: "JWT"
    };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const jwtClaim = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: serviceAccount.token_uri,
      exp,
      iat
    };

    // تحويل إلى Base64Url
    function base64UrlEncode(obj) {
      return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    }

    const header64 = base64UrlEncode(jwtHeader);
    const claim64 = base64UrlEncode(jwtClaim);
    const unsignedToken = `${header64}.${claim64}`;

    const crypto = require('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsignedToken);
    const signature = sign.sign(serviceAccount.private_key, 'base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const jwt = `${unsignedToken}.${signature}`;

    // ===== 3️⃣ طلب Access Token =====
    const tokenResp = await fetch(serviceAccount.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) throw new Error('فشل الحصول على Access Token');

    // ===== 4️⃣ إرسال الإشعار عبر FCM v1 =====
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
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