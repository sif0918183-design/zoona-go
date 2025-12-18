// نظام إدارة السائقين
class DriverSystem {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentDriver = null;
        this.isOnline = false;
        this.locationWatchId = null;
        this.currentRide = null;
        this.rideChannel = null;
        
        // رسوم الخدمة (6%)
        this.SERVICE_FEE_RATE = 0.06;
    }
    
    // تهيئة بيانات السائق
    async initDriver(driverId) {
        try {
            const { data: driver, error } = await this.supabase
                .from('drivers')
                .select('*')
                .eq('id', driverId)
                .single();
            
            if (error) throw error;
            
            this.currentDriver = driver;
            return driver;
            
        } catch (error) {
            console.error('Init driver error:', error);
            throw error;
        }
    }
    
    // تبديل حالة الاتصال
    async toggleOnlineStatus(isOnline) {
        try {
            if (!this.currentDriver) {
                throw new Error('لم يتم تحميل بيانات السائق');
            }
            
            this.isOnline = isOnline;
            const status = isOnline ? 'ONLINE' : 'OFFLINE';
            
            const { error } = await this.supabase
                .from('drivers')
                .update({ 
                    status: status,
                    last_online: new Date()
                })
                .eq('id', this.currentDriver.id);
            
            if (error) throw error;
            
            // تحديث الحالة المحلية
            this.currentDriver.status = status;
            
            // بدء أو إيقاف تتبع الموقع
            if (isOnline) {
                this.startLocationTracking();
                this.subscribeToRideRequests();
            } else {
                this.stopLocationTracking();
                this.unsubscribeFromRideRequests();
            }
            
            return true;
            
        } catch (error) {
            console.error('Toggle online status error:', error);
            throw error;
        }
    }
    
    // بدء تتبع الموقع
    startLocationTracking() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            return;
        }
        
        this.locationWatchId = navigator.geolocation.watchPosition(
            async (position) => {
                await this.updateDriverLocation(
                    position.coords.latitude,
                    position.coords.longitude
                );
            },
            (error) => {
                console.error('Geolocation error:', error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 15000
            }
        );
    }
    
    // إيقاف تتبع الموقع
    stopLocationTracking() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
        }
    }
    
    // تحديث موقع السائق
    async updateDriverLocation(lat, lng) {
        try {
            if (!this.currentDriver) return;
            
            const { error } = await this.supabase
                .from('driver_locations')
                .upsert({
                    driver_id: this.currentDriver.id,
                    lat: lat,
                    lng: lng,
                    car_type: this.currentDriver.car_type,
                    last_seen: new Date()
                }, { onConflict: 'driver_id' });
            
            if (error) throw error;
            
        } catch (error) {
            console.error('Update driver location error:', error);
        }
    }
    
    // الاشتراك في طلبات الرحلة
    subscribeToRideRequests() {
        if (!this.currentDriver || !this.isOnline) return;
        
        this.rideChannel = this.supabase
            .channel(`driver-requests-${this.currentDriver.id}`)
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'rides',
                    filter: `vehicle_type=eq.${this.currentDriver.car_type}`
                }, 
                async (payload) => {
                    // التحقق من أن الرحلة جديدة وليست للسائق نفسه
                    const ride = payload.new;
                    if (ride.status === 'searching' && ride.driver_id !== this.currentDriver.id) {
                        // التحقق من المسافة
                        const distance = await this.checkRideDistance(ride);
                        if (distance <= 20) { // ضمن 20 كم
                            this.handleIncomingRide(ride);
                        }
                    }
                }
            )
            .subscribe();
    }
    
    // إلغاء الاشتراك في طلبات الرحلة
    unsubscribeFromRideRequests() {
        if (this.rideChannel) {
            this.supabase.removeChannel(this.rideChannel);
            this.rideChannel = null;
        }
    }
    
    // التحقق من مسافة الرحلة
    async checkRideDistance(ride) {
        try {
            // جلب موقع السائق الحالي
            const { data: location, error } = await this.supabase
                .from('driver_locations')
                .select('lat, lng')
                .eq('driver_id', this.currentDriver.id)
                .single();
            
            if (error || !location) return Infinity;
            
            // حساب المسافة
            return this.calculateDistance(
                location.lat, location.lng,
                ride.pickup_lat, ride.pickup_lng
            );
            
        } catch (error) {
            console.error('Check ride distance error:', error);
            return Infinity;
        }
    }
    
    // التعامل مع طلب الرحلة الوارد
    handleIncomingRide(ride) {
        this.currentRide = ride;
        
        // تشغيل صوت التنبيه
        this.playNotificationSound();
        
        // إرسال إشعار دفع (إذا كان متاحاً)
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('طلب رحلة جديد!', {
                body: `فئة: ${this.getVehicleTypeName(ride.vehicle_type)} - المسافة: ${ride.distance_km}كم`,
                icon: '/icons/icon-192x192.png'
            });
        }
        
        // إرسال حدث للواجهة
        const event = new CustomEvent('incoming-ride', { detail: ride });
        window.dispatchEvent(event);
    }
    
    // قبول طلب الرحلة
    async acceptRide(rideId) {
        try {
            const { error } = await this.supabase
                .from('rides')
                .update({
                    driver_id: this.currentDriver.id,
                    driver_name: this.currentDriver.full_name,
                    driver_phone: this.currentDriver.whatsapp_number,
                    status: 'driver_accepted',
                    accepted_at: new Date()
                })
                .eq('id', rideId);
            
            if (error) throw error;
            
            // تحديث بيانات الرحلة الحالية
            this.currentRide = {
                ...this.currentRide,
                driver_id: this.currentDriver.id,
                status: 'driver_accepted'
            };
            
            return true;
            
        } catch (error) {
            console.error('Accept ride error:', error);
            throw error;
        }
    }
    
    // رفض طلب الرحلة
    async rejectRide(rideId) {
        try {
            const { error } = await this.supabase
                .from('rides')
                .update({
                    status: 'driver_rejected',
                    rejected_at: new Date()
                })
                .eq('id', rideId);
            
            if (error) throw error;
            
            // مسح بيانات الرحلة الحالية
            this.currentRide = null;
            
            return true;
            
        } catch (error) {
            console.error('Reject ride error:', error);
            throw error;
        }
    }
    
    // بدء الرحلة
    async startRide(rideId) {
        try {
            const { error } = await this.supabase
                .from('rides')
                .update({
                    status: 'in_progress',
                    started_at: new Date()
                })
                .eq('id', rideId);
            
            if (error) throw error;
            
            return true;
            
        } catch (error) {
            console.error('Start ride error:', error);
            throw error;
        }
    }
    
    // إنهاء الرحلة
    async completeRide(rideId) {
        try {
            // جلب بيانات الرحلة النهائية
            const { data: ride, error: fetchError } = await this.supabase
                .from('rides')
                .select('amount')
                .eq('id', rideId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // حساب الأرباح
            const serviceFee = ride.amount * this.SERVICE_FEE_RATE;
            const driverEarnings = ride.amount - serviceFee;
            
            // تحديث رصيد السائق
            const { error: driverError } = await this.supabase
                .from('drivers')
                .update({ 
                    balance: this.supabase.raw(`balance + ${driverEarnings}`)
                })
                .eq('id', this.currentDriver.id);
            
            if (driverError) throw driverError;
            
            // تحديث حالة الرحلة
            const { error: rideError } = await this.supabase
                .from('rides')
                .update({
                    status: 'completed',
                    completed_at: new Date(),
                    service_fee: serviceFee,
                    driver_earnings: driverEarnings
                })
                .eq('id', rideId);
            
            if (rideError) throw rideError;
            
            // تحديث بيانات السائق المحلية
            this.currentDriver.balance += driverEarnings;
            
            // مسح بيانات الرحلة الحالية
            this.currentRide = null;
            
            return {
                success: true,
                serviceFee,
                driverEarnings
            };
            
        } catch (error) {
            console.error('Complete ride error:', error);
            throw error;
        }
    }
    
    // إلغاء الرحلة
    async cancelRide(rideId, reason = '') {
        try {
            const { error } = await this.supabase
                .from('rides')
                .update({
                    status: 'cancelled',
                    cancelled_by: 'driver',
                    cancellation_reason: reason,
                    cancelled_at: new Date()
                })
                .eq('id', rideId);
            
            if (error) throw error;
            
            // مسح بيانات الرحلة الحالية
            this.currentRide = null;
            
            return true;
            
        } catch (error) {
            console.error('Cancel ride error:', error);
            throw error;
        }
    }
    
    // تحديث ملف السائق
    async updateDriverProfile(updateData) {
        try {
            const { data, error } = await this.supabase
                .from('drivers')
                .update(updateData)
                .eq('id', this.currentDriver.id)
                .select();
            
            if (error) throw error;
            
            // تحديث البيانات المحلية
            this.currentDriver = { ...this.currentDriver, ...updateData };
            
            return data[0];
            
        } catch (error) {
            console.error('Update driver profile error:', error);
            throw error;
        }
    }
    
    // جلب إحصائيات السائق
    async getDriverStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            // الرحلات المكتملة
            const { data: completedRides, error: ridesError } = await this.supabase
                .from('rides')
                .select('driver_earnings, created_at')
                .eq('driver_id', this.currentDriver.id)
                .eq('status', 'completed');
            
            if (ridesError) throw ridesError;
            
            // الرحلات اليومية
            const todayRides = completedRides.filter(r => new Date(r.created_at) >= today);
            const weekRides = completedRides.filter(r => new Date(r.created_at) >= lastWeek);
            const monthRides = completedRides.filter(r => new Date(r.created_at) >= lastMonth);
            
            // حساب الأرباح
            const totalEarnings = completedRides.reduce((sum, ride) => sum + (ride.driver_earnings || 0), 0);
            const todayEarnings = todayRides.reduce((sum, ride) => sum + (ride.driver_earnings || 0), 0);
            const weekEarnings = weekRides.reduce((sum, ride) => sum + (ride.driver_earnings || 0), 0);
            const monthEarnings = monthRides.reduce((sum, ride) => sum + (ride.driver_earnings || 0), 0);
            
            // متوسط الرحلة
            const averageRide = completedRides.length > 0 
                ? totalEarnings / completedRides.length 
                : 0;
            
            const stats = {
                totalRides: completedRides.length,
                totalEarnings,
                todayEarnings,
                weekEarnings,
                monthEarnings,
                averageRide: Math.round(averageRide),
                currentBalance: this.currentDriver.balance,
                rating: this.currentDriver.rating || 0,
                onlineHours: await this.calculateOnlineHours()
            };
            
            return stats;
            
        } catch (error) {
            console.error('Get driver stats error:', error);
            return null;
        }
    }
    
    // حساب ساعات العمل
    async calculateOnlineHours() {
        try {
            const { data: logs, error } = await this.supabase
                .from('driver_activity_logs')
                .select('action, created_at')
                .eq('driver_id', this.currentDriver.id)
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error || !logs) return 0;
            
            let totalHours = 0;
            let lastOnlineTime = null;
            
            // تحليل سجلات النشاط
            for (const log of logs) {
                if (log.action === 'ONLINE' && lastOnlineTime) {
                    const onlineTime = new Date(lastOnlineTime).getTime() - new Date(log.created_at).getTime();
                    totalHours += onlineTime / (1000 * 60 * 60);
                    lastOnlineTime = null;
                } else if (log.action === 'OFFLINE' && !lastOnlineTime) {
                    lastOnlineTime = log.created_at;
                }
            }
            
            return Math.round(totalHours);
            
        } catch (error) {
            console.error('Calculate online hours error:', error);
            return 0;
        }
    }
    
    // سحب الرصيد
    async withdrawBalance(amount, withdrawalMethod) {
        try {
            if (amount > this.currentDriver.balance) {
                throw new Error('الرصيد غير كافي');
            }
            
            if (amount < 10000) {
                throw new Error('الحد الأدنى للسحب هو 10,000 SDG');
            }
            
            const { error } = await this.supabase
                .from('withdrawals')
                .insert([{
                    driver_id: this.currentDriver.id,
                    amount: amount,
                    method: withdrawalMethod,
                    status: 'pending',
                    created_at: new Date()
                }]);
            
            if (error) throw error;
            
            // تخفيض الرصيد المحلي
            this.currentDriver.balance -= amount;
            
            return true;
            
        } catch (error) {
            console.error('Withdraw balance error:', error);
            throw error;
        }
    }
    
    // جلب تاريخ السحب
    async getWithdrawalHistory() {
        try {
            const { data: withdrawals, error } = await this.supabase
                .from('withdrawals')
                .select('*')
                .eq('driver_id', this.currentDriver.id)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            
            return withdrawals || [];
            
        } catch (error) {
            console.error('Get withdrawal history error:', error);
            return [];
        }
    }
    
    // جلب الرحلات النشطة
    async getActiveRides() {
        try {
            const { data: rides, error } = await this.supabase
                .from('rides')
                .select('*, customers(full_name, phone)')
                .eq('driver_id', this.currentDriver.id)
                .in('status', ['driver_accepted', 'driver_arrived', 'in_progress'])
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return rides || [];
            
        } catch (error) {
            console.error('Get active rides error:', error);
            return [];
        }
    }
    
    // طلب المساعدة/الطوارئ
    async requestEmergency(emergencyType, details = '') {
        try {
            const { error } = await this.supabase
                .from('emergency_requests')
                .insert([{
                    driver_id: this.currentDriver.id,
                    emergency_type: emergencyType,
                    details: details,
                    location_lat: await this.getCurrentLat(),
                    location_lng: await this.getCurrentLng(),
                    status: 'pending',
                    created_at: new Date()
                }]);
            
            if (error) throw error;
            
            return true;
            
        } catch (error) {
            console.error('Request emergency error:', error);
            throw error;
        }
    }
    
    // وظائف مساعدة
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    getVehicleTypeName(type) {
        const names = {
            tuktuk: 'ركشة',
            economy: 'اقتصادية',
            comfort: 'متوسطة',
            vip: 'VIP'
        };
        return names[type] || type;
    }
    
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log("Sound playback not supported");
        }
    }
    
    async getCurrentLat() {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve(position.coords.latitude),
                    () => resolve(null)
                );
            } else {
                resolve(null);
            }
        });
    }
    
    async getCurrentLng() {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve(position.coords.longitude),
                    () => resolve(null)
                );
            } else {
                resolve(null);
            }
        });
    }
    
    // تنظيف الموارد
    cleanup() {
        this.stopLocationTracking();
        this.unsubscribeFromRideRequests();
        this.currentDriver = null;
        this.currentRide = null;
    }
}

// إنشاء نسخة عامة للنظام
let driverSystem = null;

function initDriverSystem(supabaseClient) {
    driverSystem = new DriverSystem(supabaseClient);
    return driverSystem;
}

// طلب إذن الإشعارات
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// تصدير الدوال للاستخدام في الملفات الأخرى
export { DriverSystem, initDriverSystem, driverSystem, requestNotificationPermission };