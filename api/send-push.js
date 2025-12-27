// /api/send-push.js - أبسط نسخة تعمل
export default async function handler(req, res) {
  console.log('📤 API send-push called');
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, rideId, requestId, customerName, vehicleType } = req.body;
    
    console.log('📦 Data received:', { 
      token: token ? token.substring(0, 30) + '...' : 'MISSING',
      rideId, 
      requestId 
    });

    // ⭐⭐ **هنا سر الإصلاح** ⭐⭐
    // 1. FCM Server Key من Firebase Console
    const FCM_SERVER_KEY = "AAAAI3FJ8Ws:APA91bFvOFhIe0efvVHCrUDlnPL5uzamwZWmhXFLX5Mf7sbjiPF1eqE5_RrqCtT1cAqvIr3iuYrUEoN1zz3-EJVxP59qqTNd-d8VGpBrGBYAM_U2ib1FvNI";
    
    // 2. إرسال مباشر إلى FCM
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: '🚖 طلب رحلة جديد - ترحال زونا',
          body: `${customerName || 'عميل'} يطلب ${getVehicleArabic(vehicleType)}`,
          icon: '/icons/icon-192x192.png',
          click_action: `https://zoona-go-eosin.vercel.app/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId}`
        },
        data: {
          rideId: rideId,
          requestId: requestId,
          type: 'ride_request',
          timestamp: new Date().toISOString(),
          priority: 'high'
        }
      })
    });

    const result = await fcmResponse.json();
    console.log('📨 FCM Response:', result);

    if (result.success === 1 || result.message_id) {
      return res.status(200).json({
        success: true,
        message: 'تم إرسال الإشعار',
        messageId: result.message_id,
        sentAt: new Date().toISOString()
      });
    } else {
      return res.status(200).json({
        success: false,
        error: 'فشل إرسال FCM',
        details: result
      });
    }

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(200).json({
      success: false,
      error: error.message
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