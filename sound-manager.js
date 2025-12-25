// sound-manager.js - نظام صوت متقدم لترحال زونا
class TarhalSoundManager {
    constructor() {
        this.initialized = false;
        this.enabled = false;
        this.volume = 0.7;
        this.audioContext = null;
        this.gainNode = null;
        this.sounds = new Map();
        this.lastInteractionTime = 0;
        
        // مكتبة الأصوات الأساسية
        this.soundLibrary = {
            'new_ride': 'https://assets.mixkit.co/sfx/preview/mixkit-retro-game-emergency-alarm-1000.mp3',
            'ride_accepted': 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
            'ride_declined': 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
            'notification': 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-up-alert-2354.mp3',
            'time_warning': 'https://assets.mixkit.co/sfx/preview/mixkit-fast-small-sweep-transition-166.mp3',
            'beep': 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3'
        };
        
        this.init();
    }
    
    async init() {
        try {
            // تحميل الإعدادات السابقة
            this.loadPreferences();
            
            // التحقق من وجود تفاعل سابق
            this.checkPreviousInteraction();
            
            // تهيئة النظام الصوتي
            await this.initializeAudioSystem();
            
            // تحميل الأصوات مسبقاً
            await this.preloadSounds();
            
            this.initialized = true;
            console.log('✅ نظام صوت ترحال جاهز');
            
        } catch (error) {
            console.warn('⚠️ نظام الصوت غير متوفر:', error);
            this.fallbackToHTML5Audio();
        }
    }
    
    loadPreferences() {
        try {
            const saved = localStorage.getItem('tarhal_sound_prefs');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.enabled = prefs.enabled !== false;
                this.volume = prefs.volume || 0.7;
                
                // التحقق إذا كان الصوت مفعلاً سابقاً
                if (prefs.activated === true) {
                    this.enabled = true;
                }
            }
        } catch (e) {
            console.log('⚙️ لا توجد إعدادات صوت سابقة');
        }
    }
    
    savePreferences() {
        const prefs = {
            enabled: this.enabled,
            volume: this.volume,
            activated: this.enabled,
            lastUpdated: new Date().toISOString()
        };
        
        try {
            localStorage.setItem('tarhal_sound_prefs', JSON.stringify(prefs));
        } catch (e) {
            console.log('❌ تعذر حفظ إعدادات الصوت');
        }
    }
    
    checkPreviousInteraction() {
        // التحقق من وجود تفاعل سابق مع الصفحة
        const lastInteraction = localStorage.getItem('tarhal_user_interaction');
        if (lastInteraction) {
            this.lastInteractionTime = parseInt(lastInteraction);
            const hoursSinceInteraction = (Date.now() - this.lastInteractionTime) / (1000 * 60 * 60);
            
            // إذا كان التفاعل خلال آخر 24 ساعة، نسمح بالصوت
            if (hoursSinceInteraction < 24) {
                this.enabled = true;
            }
        }
    }
    
    async initializeAudioSystem() {
        // محاولة استخدام AudioContext الحديث
        if (window.AudioContext || window.webkitAudioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.gainNode = this.audioContext.createGain();
                this.gainNode.connect(this.audioContext.destination);
                this.gainNode.gain.value = this.volume;
                
                console.log('🎵 AudioContext جاهز');
                return true;
                
            } catch (error) {
                console.log('❌ AudioContext غير مدعوم، استخدام HTML5 Audio');
                return this.fallbackToHTML5Audio();
            }
        }
        
        return this.fallbackToHTML5Audio();
    }
    
    fallbackToHTML5Audio() {
        console.log('🔄 استخدام نظام الصوت الاحتياطي (HTML5)');
        this.enabled = true;
        return true;
    }
    
    async preloadSounds() {
        // في نظام HTML5 Audio، لا نحتاج لتحميل مسبق
        // سنقوم بتحميل الأصوات عند الحاجة
        console.log('⚡ الأصوات ستُحمّل عند الحاجة');
    }
    
    // ✅ الدالة الرئيسية لتشغيل الصوت
    async play(soundName, options = {}) {
        if (!this.initialized) {
            await this.init();
        }
        
        // إذا كان الصوت معطلاً ولم يتم تفعيله
        if (!this.enabled) {
            const canEnable = await this.checkIfCanEnable();
            if (!canEnable) {
                return false;
            }
        }
        
        const config = {
            volume: options.volume || this.volume,
            loop: options.loop || false,
            ...options
        };
        
        try {
            // محاولة استخدام AudioContext أولاً
            if (this.audioContext && this.audioContext.state !== 'closed') {
                return await this.playWithAudioContext(soundName, config);
            } else {
                // استخدام HTML5 Audio كاحتياطي
                return await this.playWithHTML5Audio(soundName, config);
            }
            
        } catch (error) {
            console.error('❌ خطأ في تشغيل الصوت:', error);
            return false;
        }
    }
    
    async playWithAudioContext(soundName, config) {
        if (!this.sounds.has(soundName)) {
            await this.loadSound(soundName);
        }
        
        const buffer = this.sounds.get(soundName);
        if (!buffer) return false;
        
        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = buffer;
            source.loop = config.loop;
            
            gainNode.gain.value = config.volume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();
            
            if (!config.loop) {
                source.stop(this.audioContext.currentTime + buffer.duration);
            }
            
            console.log(`🎵 تشغيل الصوت: ${soundName}`);
            return true;
            
        } catch (error) {
            console.log('❌ تعذر استخدام AudioContext:', error);
            return await this.playWithHTML5Audio(soundName, config);
        }
    }
    
    async playWithHTML5Audio(soundName, config) {
        const url = this.soundLibrary[soundName];
        if (!url) return false;
        
        try {
            const audio = new Audio(url);
            audio.volume = config.volume;
            audio.loop = config.loop;
            
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                await playPromise;
                console.log(`🔊 تشغيل الصوت: ${soundName}`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.log(`❌ تعذر تشغيل ${soundName}:`, error.name);
            
            // إذا كان الخطأ بسبب سياسة المستخدم، نحاول طريقة أخرى
            if (error.name === 'NotAllowedError') {
                return await this.attemptSilentActivation();
            }
            
            return false;
        }
    }
    
    async loadSound(soundName) {
        const url = this.soundLibrary[soundName];
        if (!url) return;
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds.set(soundName, audioBuffer);
            
        } catch (error) {
            console.warn(`⚠️ تعذر تحميل الصوت ${soundName}:`, error);
        }
    }
    
    // ✅ محاولة تفعيل الصوت بشكل صامت
    async attemptSilentActivation() {
        try {
            // تشغيل صوت صامت جداً
            const silentAudio = new Audio();
            silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
            silentAudio.volume = 0.001;
// بعد سطر 250 في sound-manager.js أضف:
activateAudioImmediately() {
  // تشغيل صوت صامت عند تحميل الصفحة
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  gainNode.gain.value = 0.001; // صوت خفي جداً
  oscillator.frequency.value = 1; // تردد منخفض جداً
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.001);
}
            
            await silentAudio.play();
            silentAudio.pause();
            
            console.log('✅ تم تفعيل النظام الصوتي بصمت');
            this.enabled = true;
            this.savePreferences();
            
            return true;
            
        } catch (error) {
            console.log('❌ تعذر التفعيل الصامت:', error);
            return false;
        }
    }
    
    // ✅ التحقق مما إذا كان يمكن تفعيل الصوت
    async checkIfCanEnable() {
        // إذا كان هناك تفاعل سابق، يمكن تفعيل الصوت
        if (this.lastInteractionTime > 0) {
            const canEnable = await this.requestAudioPermission();
            if (canEnable) {
                this.enabled = true;
                this.savePreferences();
                return true;
            }
        }
        
        // إذا لم يكن هناك تفاعل، عرض واجهة التفعيل
        return await this.showEnablePrompt();
    }
    
    async requestAudioPermission() {
        try {
            // محاولة تشغيل صوت اختبار
            const testAudio = new Audio();
            testAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
            testAudio.volume = 0.001;
            
            await testAudio.play();
            testAudio.pause();
            
            return true;
            
        } catch (error) {
            console.log('🔇 يحتاج تفعيل يدوي:', error.name);
            return false;
        }
    }
    
    // ✅ عرض واجهة تفعيل الصوت (مرة واحدة فقط)
    async showEnablePrompt() {
        // التحقق إذا سبق طلب التفعيل
        if (localStorage.getItem('tarhal_sound_prompt_shown')) {
            return false;
        }
        
        return new Promise((resolve) => {
            const prompt = document.createElement('div');
            prompt.id = 'tarhal-sound-prompt';
            prompt.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.8);
                z-index: 99999;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Tajawal', sans-serif;
                animation: fadeIn 0.3s ease;
            `;
            
            prompt.innerHTML = `
                <div style="background: white; border-radius: 20px; padding: 30px; max-width: 400px; width: 90%; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔊</div>
                    <h3 style="color: #4f46e5; margin-bottom: 15px; font-weight: 700;">تفعيل الأصوات</h3>
                    <p style="color: #6b7280; margin-bottom: 25px; line-height: 1.6;">
                        لتلقي إشعارات الرحلات الجديدة وتنبيهات الوقت بشكل كامل، يرجى تفعيل الأصوات.
                        <br><br>
                        <strong>مطلوب مرة واحدة فقط!</strong>
                    </p>
                    <div style="display: flex; gap: 10px; flex-direction: column;">
                        <button id="enable-sound-btn" 
                                style="background: #4f46e5; color: white; border: none; 
                                       padding: 16px; border-radius: 12px; 
                                       font-size: 16px; font-weight: bold; cursor: pointer;">
                            <ion-icon name="volume-high"></ion-icon>
                            تفعيل الأصوات الآن
                        </button>
                        <button id="skip-sound-btn" 
                                style="background: transparent; color: #6b7280; border: 1px solid #e5e7eb;
                                       padding: 14px; border-radius: 12px; cursor: pointer;">
                            تخطي الآن
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(prompt);
            
            // حفظ أن النموذج ظهر
            localStorage.setItem('tarhal_sound_prompt_shown', 'true');
            
            // إضافة أنماط CSS
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            // معالجة الأحداث
            document.getElementById('enable-sound-btn').onclick = async () => {
                const success = await this.enableSounds();
                prompt.remove();
                resolve(success);
            };
            
            document.getElementById('skip-sound-btn').onclick = () => {
                prompt.remove();
                resolve(false);
            };
            
            // إزالة تلقائية بعد 30 ثانية
            setTimeout(() => {
                if (prompt.parentNode) {
                    prompt.remove();
                    resolve(false);
                }
            }, 30000);
        });
    }
    
    // ✅ تفعيل الأصوات بشكل كامل
    async enableSounds() {
        try {
            // 1. تشغيل صوت اختبار
            await this.playTestSound();
            
            // 2. تفعيل النظام
            this.enabled = true;
            this.savePreferences();
            
            // 3. تسجيل تفاعل المستخدم
            this.recordUserInteraction();
            
            // 4. عرض رسالة نجاح
            this.showToast('✅ تم تفعيل الأصوات بنجاح');
            
            console.log('🎉 الأصوات مفعلة الآن');
            return true;
            
        } catch (error) {
            console.error('❌ فشل تفعيل الصوت:', error);
            this.showToast('⚠️ تعذر تفعيل الصوت. جرب متصفحاً آخر', 'error');
            return false;
        }
    }
    
    async playTestSound() {
        try {
            // تشغيل صوت اختبار قصير
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
            audio.volume = 0.3;
            
            await audio.play();
            setTimeout(() => audio.pause(), 300);
            
        } catch (error) {
            console.log('⚠️ تعذر تشغيل صوت الاختبار:', error);
        }
    }
    
    recordUserInteraction() {
        // تسجيل وقت تفاعل المستخدم
        localStorage.setItem('tarhal_user_interaction', Date.now().toString());
        this.lastInteractionTime = Date.now();
    }
    
    // ✅ تفعيل/تعطيل الصوت
    toggle() {
        this.enabled = !this.enabled;
        this.savePreferences();
        
        // تشغيل صوت تجريبي إذا تم التفعيل
        if (this.enabled) {
            this.play('beep', { volume: 0.2 });
        }
        
        // عرض إشعار
        this.showToast(this.enabled ? '🔊 تم تفعيل الصوت' : '🔇 تم إيقاف الصوت');
        
        return this.enabled;
    }
    
    // ✅ ضبط مستوى الصوت
    setVolume(level) {
        const volume = Math.max(0, Math.min(1, level / 100));
        this.volume = volume;
        
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
        
        this.savePreferences();
        
        // اختبار الصوت إذا كان مفعلاً
        if (this.enabled && volume > 0) {
            this.play('beep', { volume: volume * 0.3 });
        }
    }
    
    getVolume() {
        return this.volume;
    }
    
    // ✅ عرض رسائل Toast
    showToast(message, type = 'info') {
        // التحقق من وجود toast سابقة
        const existingToast = document.querySelector('.sound-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'sound-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            left: 20px;
            background: ${type === 'error' ? '#ef4444' : '#4f46e5'};
            color: white;
            padding: 14px;
            border-radius: 12px;
            text-align: center;
            font-weight: 600;
            z-index: 100000;
            animation: toastSlide 0.3s ease;
            max-width: 400px;
            margin: 0 auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            font-family: 'Tajawal', sans-serif;
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // إضافة أنماط الحركة
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes toastSlide {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // ✅ دالة مساعدة للاستخدام السريع
    playSound(soundName, options = {}) {
        return this.play(soundName, options);
    }
    
    // ✅ تفعيل النظام عند أول تفاعل
    activateOnFirstInteraction() {
        // إضافة مستمعين لأحداث التفاعل
        const interactionEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
        
        const activateOnce = () => {
            if (!this.enabled && !localStorage.getItem('tarhal_sound_activated')) {
                this.recordUserInteraction();
                this.enabled = true;
                this.savePreferences();
                localStorage.setItem('tarhal_sound_activated', 'true');
                
                // إزالة المستمعين بعد التفعيل
                interactionEvents.forEach(event => {
                    document.removeEventListener(event, activateOnce);
                });
                
                console.log('🎯 النظام الصوتي مفعل بعد أول تفاعل');
            }
        };
        
        // إضافة مستمعين للأحداث
        interactionEvents.forEach(event => {
            document.addEventListener(event, activateOnce, { once: true });
        });
    }
}

// إنشاء نسخة عالمية
window.TarhalSoundManager = TarhalSoundManager;

// تهيئة تلقائية عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // إنشاء النظام الصوتي
    window.soundManager = new TarhalSoundManager();
    
    // تفعيل عند أول تفاعل
    setTimeout(() => {
        window.soundManager.activateOnFirstInteraction();
    }, 1000);
    
    console.log('🎵 نظام صوت ترحال محمّل وجاهز');
});

// تصدير للاستخدام في وحدات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TarhalSoundManager };
}