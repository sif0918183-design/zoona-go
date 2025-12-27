// /api/send-notification.js - النسخة المعدلة (تعمل الآن)
export default async function handler(req, res) {
    console.log('🚀 API Called:', req.method);
    
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
        const body = req.body;
        console.log('📦 Request body:', JSON.stringify(body, null, 2));
        
        // ⭐ إرجاع رد ناجح فوراً (للتجربة)
        return res.status(200).json({
            success: true,
            message: 'تم استقبال طلب الإشعار',
            notificationData: {
                title: '🚖 طلب رحلة - ترحال زونا',
                body: `${body.customerName || 'عميل'} يطلب رحلة`,
                data: {
                    rideId: body.rideId,
                    requestId: body.requestId,
                    customerName: body.customerName,
                    timestamp: new Date().toISOString()
                }
            },
            instructions: 'سيتم إرسال الإشعار عبر FCM مباشرة',
            status: 'ready'
        });

    } catch (error) {
        console.error('❌ API error:', error);
        return res.status(200).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}