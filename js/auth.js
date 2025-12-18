// وظائف مصادقة الزبائن
async function loginCustomer() {
    const phone = document.getElementById('customer-login-phone').value.trim();
    const password = document.getElementById('customer-login-password').value;

    if (!phone || !password) {
        showNotification('الرجاء إدخال رقم الواتساب وكلمة المرور', 'error');
        return;
    }

    try {
        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                showNotification('رقم الواتساب غير مسجل', 'error');
            } else {
                throw error;
            }
            return;
        }

        // التحقق من تفعيل الحساب
        if (!customer.is_verified) {
            showNotification('لم تقم بتأكيد حسابك عبر رسالة واتساب للإدارة', 'error');
            return;
        }

        // التحقق من كلمة المرور
        if (customer.password !== password) {
            showNotification('كلمة المرور غير صحيحة', 'error');
            return;
        }

        // حفظ بيانات المستخدم
        currentUser = customer;
        localStorage.setItem('tarhal_customer', JSON.stringify(customer));
        showNotification('مرحباً مرة أخرى!', 'success');
        
        // التوجيه إلى الصفحة الرئيسية
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showNotification('حدث خطأ في تسجيل الدخول', 'error');
    }
}

// تسجيل زبون جديد
async function handleRegister() {
    const fullname = document.getElementById('fullname').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const phone2 = document.getElementById('phone2').value.trim();
    const password = document.getElementById('password').value;

    if (!fullname || !phone || !password) {
        showNotification('الرجاء ملء البيانات الأساسية (الاسم، رقم الواتساب، كلمة المرور)', 'error');
        return;
    }

    // التحقق من صحة رقم الواتساب
    if (phone.length < 10) {
        showNotification('رقم الواتساب يجب أن يكون صحيحاً', 'error');
        return;
    }

    try {
        // التحقق من عدم تكرار رقم الواتساب
        const { data: existingCustomer, error: checkError } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', phone)
            .single();

        if (existingCustomer) {
            showNotification('رقم الواتساب مسجل بالفعل!', 'error');
            return;
        }

        // حفظ البيانات في قاعدة البيانات
        const { data, error } = await supabase
            .from('customers')
            .insert([{
                full_name: fullname,
                phone: phone,
                phone2: phone2 || null,
                password: password,
                is_verified: false,
                created_at: new Date()
            }])
            .select();

        if (error) throw error;

        // إظهار رسالة النجاح
        document.getElementById('registration-form').style.opacity = "0.5";
        document.getElementById('btn-register').disabled = true;
        document.getElementById('verification-section').classList.remove('hidden');
        
        // حفظ رقم الهاتف للاستخدام لاحقاً
        localStorage.setItem('pending_verification_phone', phone);
        
        showNotification('تم حفظ بياناتك بنجاح!', 'success');

    } catch (error) {
        console.error('Registration error:', error);
        showNotification('حدث خطأ في التسجيل: ' + (error.message || 'بيانات غير مكتملة'), 'error');
    }
}

// إرسال رسالة واتساب للتأكيد
function sendWhatsAppMessage() {
    const phone = document.getElementById('phone').value;
    const savedPhone = localStorage.getItem('pending_verification_phone');
    const adminNumber = "249XXXXXXXXX"; // ضع رقم واتساب الإدارة هنا
    const message = "تفعيل ترحال زونا";
    
    // استخدام الرقم المحفوظ إذا كان موجوداً
    const phoneToUse = savedPhone || phone;
    
    if (!phoneToUse) {
        showNotification('لم يتم العثور على رقم الواتساب', 'error');
        return;
    }
    
    // رابط الواتساب لفتح المحادثة وإرسال الرسالة تلقائياً
    const whatsappUrl = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    
    // إظهار رسالة توضيحية
    showNotification('برجاء إرسال رسالة التأكيد إلى واتساب الإدارة', 'info');
    
    // حذف الرقم المحفوظ
    localStorage.removeItem('pending_verification_phone');
}

// مصادقة السائقين
async function loginDriver() {
    const phone = document.getElementById('driver-login-phone').value.trim();
    const password = document.getElementById('driver-login-password').value;

    if (!phone || !password) {
        showNotification('الرجاء إدخال رقم الواتساب وكلمة المرور', 'error');
        return;
    }

    try {
        const { data: driver, error } = await supabase
            .from('drivers')
            .select('*')
            .eq('whatsapp_number', phone)
            .eq('is_active', true)
            .single();

        if (error || !driver) {
            showNotification('رقم الواتساب غير مسجل أو الحساب غير مفعل', 'error');
            return;
        }

        if (driver.password !== password) {
            showNotification('كلمة المرور غير صحيحة', 'error');
            return;
        }

        currentDriver = driver;
        localStorage.setItem('tarhal_driver', JSON.stringify(driver));
        showNotification('مرحباً مرة أخرى!', 'success');
        
        setTimeout(() => {
            window.location.href = 'driver-dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Driver login error:', error);
        showNotification('حدث خطأ في الدخول', 'error');
    }
}