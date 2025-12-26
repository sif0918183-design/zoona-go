// /api/send-ride-notification.js - النسخة المبسطة
export default async function handler(req, res) {
  console.log('🚀 استقبال طلب إشعار رحلة');
  
  // تمكين CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'الطريقة غير مسموحة' 
    });
  }
  
  try {
    const { 
      rideId, 
      customerName, 
      customerPhone,
      pickupLocation, 
      destination, 
      amount, 
      vehicleType,
      fcmToken,
      driverId
    } = req.body;
    
    console.log('📦 بيانات الطلب:', {
      rideId,
      customerName,
      driverId,
      fcmToken: fcmToken ? `${fcmToken.substring(0, 30)}...` : 'غير متوفر'
    });
    
    // بدلاً من Firebase، استخدم إشعارات المتصفح
    // هذا حل مؤقت للاختبار
    
    const notificationPayload = {
      notification: {
        title: '🚖 طلب رحلة جديد',
        body: `${customerName} يطلب رحلة ${vehicleType || ''}`,
        icon: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: `tarhal-ride-${rideId}`,
        data: {
          rideId,
          customerName,
          customerPhone,
          pickupLocation,
          destination,
          amount,
          vehicleType,
          driverId,
          action: 'ride_request',
          timestamp: new Date().toISOString()
        }
      }
    };
    
    console.log('✅ تم معالجة الطلب بنجاح');
    
    return res.status(200).json({
      success: true,
      message: 'تم إرسال طلب الإشعار',
      notification: notificationPayload,
      details: {
        rideId,
        driverId,
        sentAt: new Date().toISOString(),
        method: 'web_notification_fallback'
      }
    });
    
  } catch (error) {
    console.error('❌ خطأ في API:', error);
    
    return res.status(200).json({
      success: false,
      error: error.message,
      fallback: true,
      message: 'سيتم استخدام النظام البديل'
    });
  }
}