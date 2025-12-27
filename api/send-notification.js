// ملف api/send-notification.js على Vercel (مجاني)
export default async function handler(req, res) {
    const { rideId, customerName } = req.body;
    
    // 1. احفظ في Supabase
    await tarhalDB.from('rides').insert(...);
    
    // 2. أرسل إشعارات للسائقين
    const response = await sendNotificationsToDrivers(rideId);
    
    res.json({ success: true });
}