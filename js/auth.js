// نظام المصادقة المتكامل
class AuthSystem {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentUser = null;
        this.currentDriver = null;
        this.authChannel = null;
    }
    
    // تسجيل زبون جديد
    async registerCustomer(customerData) {
        try {
            // التحقق من عدم تكرار رقم الواتساب
            const { data: existingCustomer, error: checkError } = await this.supabase
                .from('customers')
                .select('id')
                .eq('phone', customerData.phone)
                .single();
            
            if (existingCustomer) {
                throw new Error('رقم الواتساب مسجل بالفعل!');
            }
            
            // إنشاء الحساب الجديد
            const { data: newCustomer, error: insertError } = await this.supabase
                .from('customers')
                .insert([{
                    full_name: customerData.fullName,
                    phone: customerData.phone,
                    phone2: customerData.phone2 || null,
                    password: customerData.password,
                    is_verified: false,
                    created_at: new Date()
                }])
                .select()
                .single();
            
            if (insertError) throw insertError;
            
            // حفظ في التخزين المحلي
            this.saveCustomerSession(newCustomer);
            
            return {
                success: true,
                customer: newCustomer,
                requiresVerification: true
            };
            
        } catch (error) {
            console.error('Register customer error:', error);
            throw error;
        }
    }
    
    // تسجيل دخول الزبون
    async loginCustomer(phone, password) {
        try {
            const { data: customer, error } = await this.supabase
                .from('customers')
                .select('*')
                .eq('phone', phone)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('رقم الواتساب غير مسجل');
                }
                throw error;
            }
            
            // التحقق من تفعيل الحساب
            if (!customer.is_verified) {
                throw new Error('لم تقم بتأكيد حسابك عبر رسالة واتساب للإدارة');
            }
            
            // التحقق من كلمة المرور
            if (customer.password !== password) {
                throw new Error('كلمة المرور غير صحيحة');
            }
            
            // تحديث آخر دخول
            await this.supabase
                .from('customers')
                .update({ last_login: new Date() })
                .eq('id', customer.id);
            
            // حفظ الجلسة
            this.saveCustomerSession(customer);
            
            return {
                success: true,
                customer: customer
            };
            
        } catch (error) {
            console.error('Login customer error:', error);
            throw error;
        }
    }
    
    // تسجيل دخول السائق
    async loginDriver(whatsappNumber, password) {
        try {
            const { data: driver, error } = await this.supabase
                .from('drivers')
                .select('*')
                .eq('whatsapp_number', whatsappNumber)
                .eq('is_active', true)
                .single();
            
            if (error || !driver) {
                throw new Error('رقم الواتساب غير مسجل أو الحساب غير مفعل');
            }
            
            // التحقق من كلمة المرور
            if (driver.password !== password) {
                throw new Error('كلمة المرور غير صحيحة');
            }
            
            // تحديث آخر دخول
            await this.supabase
                .from('drivers')
                .update({ 
                    last_login: new Date(),
                    status: 'OFFLINE' // إعادة تعيين الحالة
                })
                .eq('id', driver.id);
            
            // حفظ الجلسة
            this.saveDriverSession(driver);
            
            return {
                success: true,
                driver: driver
            };
            
        } catch (error) {
            console.error('Login driver error:', error);
            throw error;
        }
    }
    
    // تسجيل سائق جديد (بواسطة الموظفين)
    async registerDriver(driverData, staffId) {
        try {
            // التحقق من عدم تكرار رقم الواتساب
            const { data: existingDriver, error: checkError } = await this.supabase
                .from('drivers')
                .select('id')
                .eq('whatsapp_number', driverData.whatsappNumber)
                .single();
            
            if (existingDriver) {
                throw new Error('رقم الواتساب مسجل بالفعل!');
            }
            
            // التحقق من عدم تكرار رقم اللوحة
            if (driverData.carPlate) {
                const { data: existingPlate, error: plateError } = await this.supabase
                    .from('drivers')
                    .select('id')
                    .eq('car_plate', driverData.carPlate)
                    .single();
                
                if (existingPlate) {
                    throw new Error('رقم اللوحة مسجل مسبقاً!');
                }
            }
            
            // رفع صورة السيارة إذا وجدت
            let carImageUrl = null;
            if (driverData.carImage) {
                carImageUrl = await this.uploadCarImage(driverData.carImage, driverData.whatsappNumber);
            }
            
            // إنشاء حساب السائق
            const { data: newDriver, error: insertError } = await this.supabase
                .from('drivers')
                .insert([{
                    full_name: driverData.fullName,
                    whatsapp_number: driverData.whatsappNumber,
                    password: driverData.password,
                    car_model: driverData.carModel,
                    car_type: driverData.carType,
                    car_plate: driverData.carPlate,
                    car_color: driverData.carColor,
                    car_image: carImageUrl,
                    balance: driverData.balance || 15000,
                    status: 'OFFLINE',
                    is_active: true,
                    registered_by: staffId,
                    created_at: new Date()
                }])
                .select()
                .single();
            
            if (insertError) throw insertError;
            
            // تسجيل النشاط
            await this.logStaffActivity(staffId, 'register_driver', `تم تسجيل السائق ${driverData.fullName}`);
            
            return {
                success: true,
                driver: newDriver
            };
            
        } catch (error) {
            console.error('Register driver error:', error);
            throw error;
        }
    }
    
    // رفع صورة السيارة
    async uploadCarImage(file, driverPhone) {
        try {
            const fileName = `car_${driverPhone}_${Date.now()}_${file.name}`;
            
            const { data, error } = await this.supabase.storage
                .from('car-images')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) throw error;
            
            // الحصول على رابط عام للصورة
            const { data: { publicUrl } } = this.supabase.storage
                .from('car-images')
                .getPublicUrl(fileName);
            
            return publicUrl;
            
        } catch (error) {
            console.error('Upload car image error:', error);
            return null;
        }
    }
    
    // حفظ جلسة الزبون
    saveCustomerSession(customer) {
        this.currentUser = customer;
        localStorage.setItem('tarhal_customer', JSON.stringify(customer));
        localStorage.setItem('tarhal_user_type', 'customer');
        
        // إرسال حدث لتحديث التطبيق
        this.dispatchAuthChange('customer');
    }
    
    // حفظ جلسة السائق
    saveDriverSession(driver) {
        this.currentDriver = driver;
        localStorage.setItem('tarhal_driver', JSON.stringify(driver));
        localStorage.setItem('tarhal_user_type', 'driver');
        
        // إرسال حدث لتحديث التطبيق
        this.dispatchAuthChange('driver');
    }
    
    // تحميل الجلسة المحفوظة
    loadSavedSession() {
        const userType = localStorage.getItem('tarhal_user_type');
        
        if (userType === 'customer') {
            const savedCustomer = localStorage.getItem('tarhal_customer');
            if (savedCustomer) {
                this.currentUser = JSON.parse(savedCustomer);
                return { type: 'customer', user: this.currentUser };
            }
        } else if (userType === 'driver') {
            const savedDriver = localStorage.getItem('tarhal_driver');
            if (savedDriver) {
                this.currentDriver = JSON.parse(savedDriver);
                return { type: 'driver', user: this.currentDriver };
            }
        }
        
        return null;
    }
    
    // تسجيل الخروج
    logout() {
        const userType = localStorage.getItem('tarhal_user_type');
        
        if (userType === 'driver' && this.currentDriver) {
            // تحديث حالة السائق ليكون غير متصل
            this.supabase
                .from('drivers')
                .update({ status: 'OFFLINE' })
                .eq('id', this.currentDriver.id)
                .then(() => {
                    console.log('Driver status updated to OFFLINE');
                })
                .catch(error => {
                    console.error('Error updating driver status:', error);
                });
        }
        
        // مسح البيانات المحلية
        this.currentUser = null;
        this.currentDriver = null;
        localStorage.removeItem('tarhal_customer');
        localStorage.removeItem('tarhal_driver');
        localStorage.removeItem('tarhal_user_type');
        
        // إرسال حدث تسجيل الخروج
        this.dispatchAuthChange('logout');
        
        return true;
    }
    
    // التحقق من صلاحية الجلسة
    async validateSession() {
        const session = this.loadSavedSession();
        
        if (!session) {
            return { valid: false };
        }
        
        try {
            if (session.type === 'customer') {
                const { data: customer, error } = await this.supabase
                    .from('customers')
                    .select('is_verified')
                    .eq('id', session.user.id)
                    .single();
                
                if (error || !customer.is_verified) {
                    this.logout();
                    return { valid: false, reason: 'unverified' };
                }
                
                return { valid: true, type: 'customer', user: session.user };
                
            } else if (session.type === 'driver') {
                const { data: driver, error } = await this.supabase
                    .from('drivers')
                    .select('is_active')
                    .eq('id', session.user.id)
                    .single();
                
                if (error || !driver.is_active) {
                    this.logout();
                    return { valid: false, reason: 'inactive' };
                }
                
                return { valid: true, type: 'driver', user: session.user };
            }
            
        } catch (error) {
            console.error('Validate session error:', error);
            this.logout();
            return { valid: false, reason: 'error' };
        }
    }
    
    // تحديث بيانات المستخدم
    async updateProfile(userType, userId, updateData) {
        try {
            const table = userType === 'customer' ? 'customers' : 'drivers';
            
            const { data, error } = await this.supabase
                .from(table)
                .update(updateData)
                .eq('id', userId)
                .select()
                .single();
            
            if (error) throw error;
            
            // تحديث البيانات المحلية
            if (userType === 'customer') {
                this.currentUser = { ...this.currentUser, ...updateData };
                this.saveCustomerSession(this.currentUser);
            } else {
                this.currentDriver = { ...this.currentDriver, ...updateData };
                this.saveDriverSession(this.currentDriver);
            }
            
            return { success: true, data };
            
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    }
    
    // تغيير كلمة المرور
    async changePassword(userType, userId, currentPassword, newPassword) {
        try {
            const table = userType === 'customer' ? 'customers' : 'drivers';
            
            // التحقق من كلمة المرور الحالية
            const { data: user, error: fetchError } = await this.supabase
                .from(table)
                .select('password')
                .eq('id', userId)
                .single();
            
            if (fetchError) throw fetchError;
            
            if (user.password !== currentPassword) {
                throw new Error('كلمة المرور الحالية غير صحيحة');
            }
            
            // تحديث كلمة المرور
            const { error: updateError } = await this.supabase
                .from(table)
                .update({ password: newPassword })
                .eq('id', userId);
            
            if (updateError) throw updateError;
            
            return { success: true };
            
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }
    
    // استعادة كلمة المرور
    async resetPassword(userType, phone, newPassword) {
        try {
            const table = userType === 'customer' ? 'customers' : 'drivers';
            const phoneField = userType === 'customer' ? 'phone' : 'whatsapp_number';
            
            const { error } = await this.supabase
                .from(table)
                .update({ password: newPassword })
                .eq(phoneField, phone);
            
            if (error) throw error;
            
            return { success: true };
            
        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    }
    
    // إرسال رسالة تأكيد الواتساب
    sendVerificationWhatsApp(phone) {
        const adminNumber = "249XXXXXXXXX"; // ضع رقم واتساب الإدارة هنا
        const message = "تفعيل ترحال زونا";
        const whatsappUrl = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
        
        // تسجيل طلب التفعيل
        this.logVerificationRequest(phone);
        
        return true;
    }
    
    // تسجيل طلب التفعيل
    async logVerificationRequest(phone) {
        try {
            await this.supabase
                .from('verification_requests')
                .insert([{
                    phone: phone,
                    type: 'customer',
                    status: 'pending',
                    created_at: new Date()
                }]);
        } catch (error) {
            console.error('Log verification request error:', error);
        }
    }
    
    // تسجيل نشاط الموظف
    async logStaffActivity(staffId, action, details) {
        try {
            await this.supabase
                .from('staff_activity_logs')
                .insert([{
                    staff_id: staffId,
                    action: action,
                    details: details,
                    created_at: new Date()
                }]);
        } catch (error) {
            console.error('Log staff activity error:', error);
        }
    }
    
    // إرسال حدث تغيير حالة المصادقة
    dispatchAuthChange(type) {
        const event = new CustomEvent('auth-change', { 
            detail: { 
                type: type,
                user: type === 'customer' ? this.currentUser : 
                      type === 'driver' ? this.currentDriver : null
            } 
        });
        window.dispatchEvent(event);
    }
    
    // الاشتراك في تحديثات المصادقة
    subscribeToAuthChanges(callback) {
        if (this.authChannel) {
            this.supabase.removeChannel(this.authChannel);
        }
        
        this.authChannel = this.supabase
            .channel('auth-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'customers' 
                }, 
                (payload) => {
                    if (this.currentUser && payload.new.id === this.currentUser.id) {
                        callback('customer', payload.new);
                    }
                }
            )
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'drivers' 
                }, 
                (payload) => {
                    if (this.currentDriver && payload.new.id === this.currentDriver.id) {
                        callback('driver', payload.new);
                    }
                }
            )
            .subscribe();
        
        return this.authChannel;
    }
    
    // إلغاء الاشتراك في تحديثات المصادقة
    unsubscribeFromAuthChanges() {
        if (this.authChannel) {
            this.supabase.removeChannel(this.authChannel);
            this.authChannel = null;
        }
    }
    
    // التحقق من صلاحية كلمة مرور الموظفين
    async verifyStaffPasscode(passcode) {
        try {
            const { data: settings, error } = await this.supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'staff_passcode')
                .single();
            
            if (error) throw error;
            
            return settings && settings.value === passcode;
            
        } catch (error) {
            console.error('Verify staff passcode error:', error);
            return false;
        }
    }
    
    // تحديث كلمة مرور الموظفين
    async updateStaffPasscode(newPasscode) {
        try {
            const { error } = await this.supabase
                .from('system_settings')
                .upsert({ 
                    key: 'staff_passcode', 
                    value: newPasscode 
                }, { onConflict: 'key' });
            
            if (error) throw error;
            
            return true;
            
        } catch (error) {
            console.error('Update staff passcode error:', error);
            throw error;
        }
    }
    
    // مسح جميع الجلسات
    clearAllSessions() {
        this.currentUser = null;
        this.currentDriver = null;
        localStorage.clear();
        this.dispatchAuthChange('logout');
        
        return true;
    }
}

// إنشاء نسخة عامة للنظام
let authSystem = null;

function initAuthSystem(supabaseClient) {
    authSystem = new AuthSystem(supabaseClient);
    return authSystem;
}

// التحقق من تفعيل الحساب بشكل دوري
async function checkAccountVerification(userId, userType = 'customer') {
    if (!authSystem) return false;
    
    try {
        const table = userType === 'customer' ? 'customers' : 'drivers';
        const field = userType === 'customer' ? 'is_verified' : 'is_active';
        
        const { data: user, error } = await authSystem.supabase
            .from(table)
            .select(field)
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        return user[field];
        
    } catch (error) {
        console.error('Check account verification error:', error);
        return false;
    }
}

// طلب إذن الإشعارات
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('Notification permission:', permission);
        });
    }
}

// تصدير الدوال للاستخدام في الملفات الأخرى
export { 
    AuthSystem, 
    initAuthSystem, 
    authSystem, 
    checkAccountVerification,
    requestNotificationPermission 
};