// sound-manager.js - نظام صوت دائم لترحال
class TarhalSoundManager {
    constructor() {
        this.initialized = false;
        this.enabled = false;
        this.audioContext = null;
        this.gainNode = null;
        this.sounds = new Map();
        
        // أصوات النظام الأساسية
        this.soundLibrary = {
            'new_ride': 'https://assets.mixkit.co/sfx/preview/mixkit-retro-game-emergency-alarm-1000.mp3',
            'ride_accepted': 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
            'ride_declined': 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
            'notification': 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-up-alert-2354.mp3',
            'time_warning': 'https://assets.mixkit.co/sfx/preview/mixkit-fast-small-sweep-transition-166.mp3'
        };
        
        this.init();
    }
    
    async init() {
        try {
            // تهيئة Audio Context (الأحدث والأفضل)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.gainNode.gain.value = 0.7; // مستوى الصوت الافتراضي
            
            // تحميل الأصوات مسبقاً
            await this.preloadSounds();
            
            // محاولة تفعيل تلقائي
            await this.attemptAutoEnable();
            
            this.initialized = true;
            console.log('✅ نظام صوت ترحال جاهز');
            
        } catch (error) {
            console.warn('⚠️ AudioContext غير مدعوم:', error);
            this.fallbackToHTML5Audio();
        }
    }
    
    fallbackToHTML5Audio() {
        // نظام احتياطي باستخدام Audio العادي
        console.log('🔄 استخدام نظام الصوت الاحتياطي');
        this.playSound = this.playHTML5Sound;
        this.enabled = true;
        this.initialized = true;
    }
    
    async preloadSounds() {
        for (const [name, url] of Object.entries(this.soundLibrary)) {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.sounds.set(name, audioBuffer);
            } catch (error) {
                console.warn(`تعذر تحميل الصوت ${name}:`, error);
            }
        }
    }
    
    async attemptAutoEnable() {
        // 1. محاولة تفعيل عبر تشغيل صامت
        try {
            const oscillator = this.audioContext.createOscillator();
            oscillator.connect(this.gainNode);
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.001);
            
            // 2. بدء Audio Context إذا كان معلقاً
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.enabled = true;
            return true;
            
        } catch (error) {
            console.log('🔇 يحتاج تفعيل يدوي');
            return false;
        }
    }
    
    async play(soundName, options = {}) {
        if (!this.enabled || !this.initialized) {
            await this.showEnablePrompt();
            return false;
        }
        
        const config = {
            volume: options.volume || 0.7,
            loop: options.loop || false,
            ...options
        };
        
        try {
            if (this.audioContext && this.sounds.has(soundName)) {
                // استخدام AudioContext للمحترفين
                return this.playBufferSound(soundName, config);
            } else {
                // استخدام HTML5 Audio كاحتياطي
                return this.playHTML5Sound(soundName, config);
            }
        } catch (error) {
            console.error('❌ خطأ في تشغيل الصوت:', error);
            return false;
        }
    }
    
    playBufferSound(soundName, config) {
        const buffer = this.sounds.get(soundName);
        if (!buffer) return false;
        
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
        
        return true;
    }
    
    playHTML5Sound(soundName, config) {
        const url = this.soundLibrary[soundName];
        if (!url) return false;
        
        const audio = new Audio(url);
        audio.volume = config.volume;
        audio.loop = config.loop;
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('❌ تعذر تشغيل الصوت:', error);
                this.showEnablePrompt();
            });
        }
        
        return true;
    }
    
    async showEnablePrompt() {
        // عرض واجهة تفعيل الصوت
        if (document.getElementById('sound-enable-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'sound-enable-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 99999;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Tajawal;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 30px; max-width: 400px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px;">🔊</div>
                <h3 style="color: #4f46e5; margin-bottom: 15px;">تفعيل الأصوات</h3>
                <p style="color: #666; margin-bottom: 25px; line-height: 1.6;">
                    لم تفعل الأصوات بعد. الأصوات ضرورية لتلقي إشعارات الرحلات الجديدة.
                </p>
                <button id="enable-sound-btn" 
                        style="background: #4f46e5; color: white; border: none; 
                               padding: 15px 30px; border-radius: 12px; 
                               font-size: 16px; font-weight: bold; cursor: pointer;
                               width: 100%; margin-bottom: 15px;">
                    تفعيل الأصوات الآن
                </button>
                <button onclick="this.closest('#sound-enable-modal').remove()" 
                        style="background: transparent; color: #666; border: 1px solid #ddd;
                               padding: 12px 25px; border-radius: 12px; cursor: pointer;">
                    تخطي الآن
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // حدث التفعيل
        document.getElementById('enable-sound-btn').onclick = async () => {
            await this.enableSounds();
            modal.remove();
        };
    }
    
    async enableSounds() {
        try {
            // 1. تفعيل Audio Context
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // 2. تشغيل صوت اختبار
            await this.play('notification', { volume: 0.3 });
            
            // 3. حفظ التفضيل في localStorage
            localStorage.setItem('tarhal_sound_enabled', 'true');
            this.enabled = true;
            
            // 4. إشعار النجاح
            this.showToast('✅ تم تفعيل الأصوات بنجاح');
            
            return true;
            
        } catch (error) {
            console.error('❌ فشل تفعيل الصوت:', error);
            this.showToast('⚠️ تعذر تفعيل الصوت. جرب متصفحاً آخر', 'error');
            return false;
        }
    }
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            left: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 15px;
            border-radius: 12px;
            text-align: center;
            font-weight: bold;
            z-index: 100000;
            animation: toastSlide 0.3s ease;
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // وظائف مساعدة
    setVolume(level) {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, level));
        }
        localStorage.setItem('tarhal_sound_volume', level.toString());
    }
    
    getVolume() {
        return localStorage.getItem('tarhal_sound_volume') || 0.7;
    }
    
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('tarhal_sound_enabled', this.enabled.toString());
        
        if (this.enabled) {
            this.play('notification', { volume: 0.2 });
        }
        
        return this.enabled;
    }
}

// إنشاء نسخة عالمية
window.TarhalSoundManager = TarhalSoundManager;