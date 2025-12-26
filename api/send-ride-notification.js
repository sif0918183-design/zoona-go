// /api/send-ride-notification.js - النسخة المحدثة مع دعم الأزرار التفاعلية
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
            version: '2.0.0',
            features: ['interactive_notifications', 'accept_decline_buttons']
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
                driverId,
                requestId // ⭐⭐⭐ أضف هذا الحقل ⭐⭐⭐
            } = body;
            
            // التحقق من البيانات المطلوبة
            if (!fcmToken) {
                return res.status(400).json({
                    success: false,
                    error: 'FCM token مطلوب'
                });
            }
            
            if (!rideId && !requestId) {
                return res.status(400).json({
                    success: false,
                    error: 'rideId أو requestId مطلوب'
                });
            }
            
            // سجل البيانات للتحليل
            console.log('🔍 Data analysis:', {
                rideId,
                requestId,
                customerName,
                driverId,
                tokenLength: fcmToken?.length || 0,
                tokenPreview: fcmToken?.substring(0, 30) + '...'
            });
            
            // ⭐⭐⭐⭐ بناء payload الإشعار مع الأزرار التفاعلية ⭐⭐⭐⭐
            const notificationPayload = {
                success: true,
                message: 'تم بناء بيانات الإشعار بنجاح',
                notificationData: {
                    title: `🚖 طلب رحلة جديد - ترحال زونا`,
                    body: `${customerName || 'عميل'} يطلب رحلة ${getVehicleTypeName(vehicleType)} من ${pickupLocation || 'موقع الانطلاق'} إلى ${destination || 'الوجهة'}`,
                    
                    // ⭐⭐⭐⭐ البيانات الأساسية ⭐⭐⭐⭐
                    data: {
                        rideId: rideId || '',
                        requestId: requestId || rideId, // استخدم requestId إذا كان موجوداً
                        customerName: customerName || '',
                        customerPhone: customerPhone || '',
                        pickupLocation: pickupLocation || 'موقع الانطلاق',
                        destination: destination || 'الوجهة',
                        amount: amount || 0,
                        vehicleType: vehicleType || 'economy',
                        driverId: driverId || '',
                        timestamp: new Date().toISOString(),
                        type: 'ride_request',
                        action: 'accept_ride',
                        
                        // ⭐⭐⭐⭐ الميزات الجديدة ⭐⭐⭐⭐
                        // 1. الأزرار التفاعلية كـ JSON string
                        actions: JSON.stringify([
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
                        ]),
                        
                        // 2. رابط النقر الأساسي
                        click_action: `https://zoona-go-eosin.vercel.app/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId || rideId}`,
                        
                        // 3. روابط مباشرة للقبول والرفض
                        accept_url: `https://zoona-go-eosin.vercel.app/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId || rideId}&action=accept`,
                        decline_url: `https://zoona-go-eosin.vercel.app/driver/accept-ride.html?rideId=${rideId}&requestId=${requestId || rideId}&action=decline`,
                        
                        // 4. معلومات إضافية للعرض
                        urgency: 'high',
                        timeout: 40, // ثانية
                        requires_response: true
                    },
                    
                    // ⭐⭐⭐⭐ خيارات الإشعار ⭐⭐⭐⭐
                    notification: {
                        icon: '/icons/icon-192x192.png',
                        badge: '/icons/icon-72x72.png',
                        vibrate: [200, 100, 200, 100, 200],
                        requireInteraction: true,
                        silent: false,
                        tag: `ride-request-${rideId || requestId}`,
                        timestamp: Date.now()
                    },
                    
                    token: fcmToken
                },
                
                // ⭐⭐⭐⭐ تعليمات للتطبيق ⭐⭐⭐⭐
                instructions: {
                    web: 'استخدم window.firebase.messaging().send() مع البيانات أعلاه',
                    android: 'قم بتمرير data إلى نظام الإشعارات',
                    ios: 'استخدم UNNotificationAction للأزرار',
                    priority: 'high'
                },
                
                // ⭐⭐⭐⭐ معلومات الإرسال ⭐⭐⭐⭐
                metadata: {
                    sentAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 45000).toISOString(), // 45 ثانية
                    notificationId: `tarhal-${rideId || requestId}-${Date.now()}`,
                    version: '2.1.0'
                }
            };
            
            console.log('✅ Notification payload built successfully');
            console.log('🎯 Actions included:', notificationPayload.notificationData.data.actions);
            console.log('🔗 Accept URL:', notificationPayload.notificationData.data.accept_url);
            console.log('🔗 Decline URL:', notificationPayload.notificationData.data.decline_url);
            
            // إرجاع الرد النهائي
            return res.status(200).json(notificationPayload);
            
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
        'tuktuk': 'ركشة',
        'economy': 'اقتصادية',
        'comfort': 'متوسطة',
        'vip': 'VIP'
    };
    return names[type] || type || 'سيارة';
}