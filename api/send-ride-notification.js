// /api/send-ride-notification.js - النسخة المبسطة الآمنة
export default async function handler(req, res) {
    console.log('🚀 API Called:', req.method, req.url);
    
    // تمكين CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // معالجة OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        console.log('✅ Preflight request handled');
        return res.status(200).end();
    }
    
    // معالجة GET (لاختبار أن API يعمل)
    if (req.method === 'GET') {
        console.log('📊 GET request - API is alive');
        return res.status(200).json({
            success: true,
            message: 'ترحال زونا - API للإشعارات',
            status: 'active',
            timestamp: new Date().toISOString(),
            version: '2.0.0'
        });
    }
    
    // معالجة POST (الإرسال الفعلي)
    if (req.method === 'POST') {
        try {
            console.log('📨 POST request received');
            
            // تحليل البيانات
            const body = req.body;
            console.log('📦 Request body:', JSON.stringify(body, null, 2));
            
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
            } = body;
            
            // التحقق من البيانات المطلوبة
            if (!fcmToken) {
                return res.status(400).json({
                    success: false,
                    error: 'FCM token مطلوب'
                });
            }
            
            // سجل البيانات للتحليل
            console.log('🔍 Data analysis:', {
                rideId,
                customerName,
                driverId,
                tokenLength: fcmToken?.length || 0,
                tokenPreview: fcmToken?.substring(0, 30) + '...'
            });
            
            // ⭐⭐⭐⭐ هنا جرب الإرسال المباشر بدون Firebase Admin ⭐⭐⭐⭐
            
            // الخيار 1: استخدام Firebase SDK من العميل (نرسل رداً للتطبيق ليرسل هو)
            if (fcmToken && fcmToken.length > 100) {
                console.log('✅ Token looks valid, returning success response');
                
                // إرجاع نجاح مع تعليمات للتطبيق
                return res.status(200).json({
                    success: true,
                    message: 'طلب الإشعار مستلم، سيتم الإرسال من التطبيق',
                    notificationData: {
                        title: '🚖 طلب رحلة جديد - ترحال زونا',
                        body: `${customerName || 'عميل'} يطلب رحلة ${getVehicleTypeName(vehicleType)}`,
                        data: {
                            rideId: rideId || '',
                            customerName: customerName || '',
                            customerPhone: customerPhone || '',
                            pickupLocation: pickupLocation || 'موقع الانطلاق',
                            destination: destination || 'الوجهة',
                            amount: amount || 0,
                            vehicleType: vehicleType || 'economy',
                            driverId: driverId || '',
                            timestamp: new Date().toISOString(),
                            type: 'ride_request',
                            action: 'accept_ride'
                        },
                        token: fcmToken
                    },
                    instructions: 'استخدم window.firebase.messaging().send()',
                    sentAt: new Date().toISOString()
                });
            } else {
                console.log('⚠️ Token may be invalid');
                return res.status(200).json({
                    success: false,
                    error: 'Token غير صالح',
                    tokenLength: fcmToken?.length,
                    fallback: true
                });
            }
            
        } catch (error) {
            console.error('❌ Error in API:', error);
            
            return res.status(200).json({
                success: false,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // أي طريقة أخرى
    return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['GET', 'POST', 'OPTIONS']
    });
}

// دالة مساعدة
function getVehicleTypeName(type) {
    const names = {
        'tuktuk': 'توك توك',
        'economy': 'اقتصادية',
        'comfort': 'متوسطة',
        'vip': 'VIP'
    };
    return names[type] || type || 'سيارة';
}