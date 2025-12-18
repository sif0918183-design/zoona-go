// نظام إدارة الرحلات
class RideSystem {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentRide = null;
        this.rideTimer = null;
        this.rideTimeout = 40;
        this.searchingDrivers = [];
        this.currentDriverIndex = 0;
        
        // أسعار الفئات (SDG)
        this.VEHICLE_PRICES = {
            tuktuk: { base: 5000, perKm: 2000, icon: '🛺', name: 'ركشة' },
            economy: { base: 6000, perKm: 3000, icon: '🚘', name: 'اقتصادية' },
            comfort: { base: 7000, perKm: 3500, icon: '🚖', name: 'متوسطة' },
            vip: { base: 10000, perKm: 5000, icon: '🏎️', name: 'VIP' }
        };
    }
    
    // إنشاء رحلة جديدة
    async createRide(rideData) {
        try {
            const { data: ride, error } = await this.supabase
                .from('rides')
                .insert([{
                    ...rideData,
                    status: 'searching',
                    created_at: new Date()
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            this.currentRide = ride;
            return ride;
            
        } catch (error) {
            console.error('Create ride error:', error);
            throw error;
        }
    }
    
    // البحث عن سائقين قريبين
    async findNearbyDrivers(userLat, userLng, vehicleType, radiusMeters = 20000) {
        try {
            const { data: drivers, error } = await this.supabase.rpc(
                'search_nearby_drivers_by_type',
                {
                    user_lat: userLat,
                    user_lng: userLng,
                    radius_meters: radiusMeters,
                    car_type: vehicleType
                }
            );
            
            if (error) {
                // إذا لم تكن الدالة موجودة، استخدم استعلام بديل
                return await this.alternativeDriverSearch(userLat, userLng, vehicleType);
            }
            
            return drivers || [];
            
        } catch (error) {
            console.error('Find nearby drivers error:', error);
            return [];
        }
    }
    
    // بحث بديل عن السائقين
    async alternativeDriverSearch(userLat, userLng, vehicleType) {
        try {
            // جلب جميع السائقين النشطين من النوع المطلوب
            const { data: drivers, error } = await this.supabase
                .from('drivers')
                .select('*, driver_locations(lat, lng)')
                .eq('car_type', vehicleType)
                .eq('is_active', true)
                .eq('status', 'ONLINE');
            
            if (error) throw error;
            
            // تصفية السائقين حسب المسافة
            const nearbyDrivers = drivers.filter(driver => {
                if (!driver.driver_locations || driver.driver_locations.length === 0) {
                    return false;
                }
                
                const location = driver.driver_locations[0];
                const distance = this.calculateDistance(
                    userLat, userLng,
                    location.lat, location.lng
                );
                
                return distance <= 20; // ضمن 20 كم
            });
            
            // ترتيب حسب المسافة
            return nearbyDrivers.sort((a, b) => {
                const distA = this.calculateDistance(
                    userLat, userLng,
                    a.driver_locations[0].lat,
                    a.driver_locations[0].lng
                );
                const distB = this.calculateDistance(
                    userLat, userLng,
                    b.driver_locations[0].lat,
                    b.driver_locations[0].lng
                );
                return distA - distB;
            });
            
        } catch (error) {
            console.error('Alternative driver search error:', error);
            return [];
        }
    }
    
    // بدء البحث عن سائق
    async startDriverSearch(userLat, userLng, vehicleType, rideId) {
        this.currentRide = { id: rideId };
        this.searchingDrivers = await this.findNearbyDrivers(userLat, userLng, vehicleType);
        this.currentDriverIndex = 0;
        
        if (this.searchingDrivers.length === 0) {
            throw new Error('لا يوجد سائقين متاحين حالياً');
        }
        
        return this.searchingDrivers;
    }
    
    // البحث عن السائق التالي
    searchNextDriver() {
        if (this.currentDriverIndex >= this.searchingDrivers.length) {
            return null;
        }
        
        const driver = this.searchingDrivers[this.currentDriverIndex];
        this.currentDriverIndex++;
        
        return driver;
    }
    
    // قبول الرحلة من قبل السائق
    async acceptRide(rideId, driverId, driverName, driverPhone) {
        try {
            const { error } = await this.supabase
                .from('rides')
                .update({
                    driver_id: driverId,
                    driver_name: driverName,
                    driver_phone: driverPhone,
                    status: 'driver_accepted',
                    accepted_at: new Date()
                })
                .eq('id', rideId);
            
            if (error) throw error;
            
            // إلغاء البحث عن سائقين آخرين
            this.stopDriverSearch();
            
            return true;
            
        } catch (error) {
            console.error('Accept ride error:', error);
            throw error;
        }
    }
    
    // رفض الرحلة من قبل السائق
    async rejectRide(rideId) {
        try {
            await this.supabase
                .from('rides')
                .update({
                    status: 'driver_rejected',
                    rejected_at: new Date()
                })
                .eq('id', rideId);
                
        } catch (error) {
            console.error('Reject ride error:', error);
        }
    }
    
    // إلغاء البحث عن سائقين
    stopDriverSearch() {
        this.searchingDrivers = [];
        this.currentDriverIndex = 0;
        if (this.rideTimer) {
            clearInterval(this.rideTimer);
            this.rideTimer = null;
        }
    }
    
    // تحديث حالة الرحلة
    async updateRideStatus(rideId, status, additionalData = {}) {
        try {
            const updateData = {
                status: status,
                updated_at: new Date(),
                ...additionalData
            };
            
            const { error } = await this.supabase
                .from('rides')
                .update(updateData)
                .eq('id', rideId);
            
            if (error) throw error;
            
            return true;
            
        } catch (error) {
            console.error('Update ride status error:', error);
            throw error;
        }
    }
    
    // الحصول على تفاصيل الرحلة
    async getRideDetails(rideId) {
        try {
            const { data: ride, error } = await this.supabase
                .from('rides')
                .select('*, customers(full_name, phone), drivers(full_name, whatsapp_number, car_model)')
                .eq('id', rideId)
                .single();
            
            if (error) throw error;
            
            return ride;
            
        } catch (error) {
            console.error('Get ride details error:', error);
            throw error;
        }
    }
    
    // إلغاء الرحلة
    async cancelRide(rideId, cancelledBy, reason = '') {
        try {
            const { error } = await this.supabase
                .from('rides')
                .update({
                    status: 'cancelled',
                    cancelled_by: cancelledBy,
                    cancellation_reason: reason,
                    cancelled_at: new Date()
                })
                .eq('id', rideId);
            
            if (error) throw error;
            
            return true;
            
        } catch (error) {
            console.error('Cancel ride error:', error);
            throw error;
        }
    }
    
    // إنهاء الرحلة
    async completeRide(rideId) {
        try {
            // جلب بيانات الرحلة لحساب الأرباح
            const ride = await this.getRideDetails(rideId);
            
            if (!ride || ride.status !== 'in_progress') {
                throw new Error('الرحلة غير صالحة للإنهاء');
            }
            
            const serviceFee = ride.amount * 0.06;
            const driverEarnings = ride.amount - serviceFee;
            
            // تحديث رصيد السائق
            if (ride.driver_id) {
                const { error: driverError } = await this.supabase
                    .from('drivers')
                    .update({ 
                        balance: this.supabase.raw(`balance + ${driverEarnings}`)
                    })
                    .eq('id', ride.driver_id);
                
                if (driverError) throw driverError;
            }
            
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
    
    // حساب المسافة بين نقطتين
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // نصف قطر الأرض بالكيلومترات
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    // حساب سعر الرحلة
    calculatePrice(vehicleType, distanceKm) {
        const priceConfig = this.VEHICLE_PRICES[vehicleType];
        if (!priceConfig) {
            throw new Error('فئة السيارة غير معروفة');
        }
        
        const additionalKm = Math.max(0, distanceKm - 1);
        return priceConfig.base + (additionalKm * priceConfig.perKm);
    }
    
    // الحصول على اسم فئة السيارة
    getVehicleTypeName(type) {
        const config = this.VEHICLE_PRICES[type];
        return config ? config.name : type;
    }
    
    // الحصول على أيقونة فئة السيارة
    getVehicleTypeIcon(type) {
        const config = this.VEHICLE_PRICES[type];
        return config ? config.icon : '🚗';
    }
    
    // الاشتراك في تحديثات الرحلة
    subscribeToRideUpdates(rideId, callback) {
        const channel = this.supabase
            .channel(`ride-updates-${rideId}`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'rides',
                    filter: `id=eq.${rideId}`
                }, 
                (payload) => {
                    callback(payload.new);
                }
            )
            .subscribe();
        
        return channel;
    }
    
    // جلب تاريخ الرحلات للمستخدم
    async getUserRideHistory(userId, limit = 10, offset = 0) {
        try {
            const { data: rides, error } = await this.supabase
                .from('rides')
                .select('*, drivers(full_name, car_model)')
                .eq('customer_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (error) throw error;
            
            return rides || [];
            
        } catch (error) {
            console.error('Get user ride history error:', error);
            return [];
        }
    }
    
    // جلب رحلات السائق
    async getDriverRides(driverId, limit = 10, offset = 0) {
        try {
            const { data: rides, error } = await this.supabase
                .from('rides')
                .select('*, customers(full_name, phone)')
                .eq('driver_id', driverId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (error) throw error;
            
            return rides || [];
            
        } catch (error) {
            console.error('Get driver rides error:', error);
            return [];
        }
    }
    
    // تحميل إحصائيات الرحلات
    async getRideStats(userId, userType = 'customer') {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            let query;
            if (userType === 'customer') {
                query = this.supabase
                    .from('rides')
                    .select('amount, status, created_at')
                    .eq('customer_id', userId);
            } else {
                query = this.supabase
                    .from('rides')
                    .select('driver_earnings, amount, status, created_at')
                    .eq('driver_id', userId);
            }
            
            const { data: rides, error } = await query;
            
            if (error) throw error;
            
            const stats = {
                total: rides.length,
                completed: rides.filter(r => r.status === 'completed').length,
                cancelled: rides.filter(r => r.status === 'cancelled').length,
                today: rides.filter(r => new Date(r.created_at) >= today).length,
                thisWeek: rides.filter(r => new Date(r.created_at) >= lastWeek).length,
                thisMonth: rides.filter(r => new Date(r.created_at) >= lastMonth).length,
                totalAmount: rides.reduce((sum, ride) => sum + (ride.amount || 0), 0),
                totalEarnings: rides.reduce((sum, ride) => sum + (ride.driver_earnings || 0), 0)
            };
            
            return stats;
            
        } catch (error) {
            console.error('Get ride stats error:', error);
            return null;
        }
    }
}

// إنشاء نسخة عامة للنظام
let rideSystem = null;

function initRideSystem(supabaseClient) {
    rideSystem = new RideSystem(supabaseClient);
    return rideSystem;
}

// تصدير الدوال للاستخدام في الملفات الأخرى
export { RideSystem, initRideSystem, rideSystem };