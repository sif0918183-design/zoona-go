// sound-manager.js
// نظام صوت خفيف ومتوافق 100% مع Firebase وملفات ترحال

class TarhalSoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.volume = 0.2;

    // استرجاع حالة الصوت من التخزين
    if (localStorage.getItem('tarhal_sound_enabled') === '1') {
      this.enabled = true;
    }
  }

  /* ===============================
     التهيئة الأساسية
     =============================== */

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  enable() {
    this.init();

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.enabled = true;
    localStorage.setItem('tarhal_sound_enabled', '1');
  }

  /* ===============================
     🔁 طبقة التوافق (مهمة جدًا)
     =============================== */

  // مستخدمة في index.html سابقًا
  activateAudioImmediately() {
    this.enable();
  }

  // زر تشغيل / إيقاف الصوت
  toggle() {
    this.enabled = !this.enabled;

    localStorage.setItem(
      'tarhal_sound_enabled',
      this.enabled ? '1' : '0'
    );

    if (this.enabled) {
      this.enable();
      this.playSound('beep');
    }

    return this.enabled;
  }

  // الاسم القديم المستخدم في التطبيق
  playSound(name, options = {}) {
    this.play(name);
  }

  /* ===============================
     تشغيل الصوت (Oscillator)
     =============================== */

  play(type = 'beep') {
    if (!this.enabled) return;

    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // نغمات مخصصة لترحال
    const sounds = {
      new_ride: [900, 0.25],        // طلب رحلة جديد
      ride_accepted: [1200, 0.3],   // قبول الرحلة
      ride_declined: [250, 0.35],   // رفض الرحلة
      notification: [700, 0.15],    // إشعار عام
      time_warning: [450, 0.4],     // تنبيه وقت
      beep: [600, 0.1]              // تأكيد بسيط
    };

    const [freq, duration] = sounds[type] || sounds.beep;

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = this.volume;

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  /* ===============================
     أدوات مساعدة
     =============================== */

  setVolume(level) {
    // level من 0 إلى 100
    this.volume = Math.max(0, Math.min(1, level / 100));
  }

  isEnabled() {
    return this.enabled;
  }
}

/* ===============================
   إنشاء نسخة عالمية
   =============================== */

window.soundManager = new TarhalSoundManager();

/* ===============================
   تفعيل تلقائي بعد أول تفاعل
   (متوافق مع Chrome / Android)
   =============================== */

['click', 'touchstart', 'keydown'].forEach(event => {
  document.addEventListener(event, function activateSound() {
    if (window.soundManager && !window.soundManager.enabled) {
      window.soundManager.enable();
      window.soundManager.playSound('beep');
      console.log('🎵 تم تفعيل الصوت بتفاعل:', event);
    }
  }, { once: true });
});