// /api/send-push.js - نسخة مبسطة تعمل فوراً
export default async function handler(req, res) {
  // تمكين CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Tarhal Push API - WORKING',
      status: 'ready'
    });
  }

  try {
    const { token, rideId, requestId, customerName, vehicleType, amount } = req.body;
    
    console.log('📤 API Called with:', { token, rideId, requestId });

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'FCM token required' 
      });
    }

    // ⭐ إرسال مباشر عبر fetch إلى Firebase FCM
    const FIREBASE_SERVER_KEY = "AAAAI3FJ8Ws:APA91bFvOFhIe0efvVHCrUDlnPL5uzamwZWmhXFLX5Mf7sbjiPF1eqE5_RrqCtT1cAqvIr3iuYrUEoN1zz3-EJVxP59qqTNd-d8VGpBrGBYAM_U2ib1FvNI";
    
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: '🚖 طلب رحلة - ترحال زونا',
          body: `${customerName || 'عميل'} - ${getVehicleArabic(vehicleType)}`,
          icon: '/icons/icon-192x192.png',
          click_action: `https://zoona-go-eosin.vercel.app/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId}`
        },
        data: {
          rideId: rideId,
          requestId: requestId,
          type: 'ride_request',
          timestamp: new Date().toISOString()
        },
        webpush: {
          fcmOptions: {
            link: `https://zoona-go-eosin.vercel.app/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId}`
          }
        }
      })
    });

    const result = await fcmResponse.json();
    
    if (result.success === 1 || result.message_id) {
      console.log('✅ FCM sent successfully:', result);
      return res.status(200).json({
        success: true,
        messageId: result.message_id || result.results?.[0]?.message_id,
        sentAt: new Date().toISOString()
      });
    } else {
      console.error('❌ FCM error:', result);
      return res.status(500).json({
        success: false,
        error: result.error || 'FCM failed',
        details: result
      });
    }

  } catch (error) {
    console.error('❌ API error:', error);
    return res.status(200).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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