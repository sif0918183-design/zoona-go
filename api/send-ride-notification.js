// /api/send-ride-notification.js - النسخة النهائية
import admin from 'firebase-admin';

// 1. تهيئة Firebase مرة واحدة فقط
let isFirebaseInitialized = false;

function initializeFirebase() {
    if (isFirebaseInitialized) return;
    
    try {
        // استخدم متغيرات البيئة في Vercel
        const serviceAccount = {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
        };

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        isFirebaseInitialized = true;
        console.log('✅ Firebase Admin initialized');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        throw error;
    }
}

export default async function handler(req, res) {
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
            error: 'Method not allowed' 
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
        
        console.log('🚀 Received ride notification request:', {
            rideId,
            customerName,
            driverId,
            tokenLength: fcmToken?.length || 0
        });
        
        if (!fcmToken || fcmToken.length < 100) {
            return res.status(400).json({
                success: false,
                error: 'Invalid FCM token'
            });
        }
        
        // تهيئة Firebase
        initializeFirebase();
        
        // إعداد رسالة الإشعار
        const message = {
            notification: {
                title: '🚖 طلب رحلة جديد - ترحال زونا',
                body: `${customerName || 'عميل'} يطلب رحلة ${getVehicleTypeName(vehicleType)}`,
            },
            data: {
                rideId: rideId?.toString() || '',
                customerName: customerName || '',
                customerPhone: customerPhone || '',
                pickupLocation: pickupLocation || 'موقع الانطلاق',
                destination: destination || 'الوجهة',
                amount: amount?.toString() || '0',
                vehicleType: vehicleType || 'economy',
                driverId: driverId || '',
                timestamp: new Date().toISOString(),
                type: 'ride_request',
                action: 'accept_ride',
                click_action: 'ACCEPT_RIDE'
            },
            token: fcmToken,
            webpush: {
                fcmOptions: {
                    link: `https://zoona-go-eosin.vercel.app/driver/accept-ride.html?rideId=${rideId}`
                },
                headers: {
                    Urgency: 'high'
                }
            }
        };
        
        console.log('📤 Sending FCM message...');
        
        // إرسال الإشعار
        const response = await admin.messaging().send(message);
        
        console.log('✅ Notification sent successfully:', response);
        
        return res.status(200).json({
            success: true,
            message: 'تم إرسال الإشعار بنجاح',
            messageId: response,
            sentAt: new Date().toISOString(),
            details: {
                rideId,
                driverId,
                tokenPreview: fcmToken.substring(0, 30) + '...'
            }
        });
        
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        
        // إرجاع خطأ مع رسالة واضحة
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            errorCode: error.code,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
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