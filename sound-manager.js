class TarhalSoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.volume = 0.2;

    // تفعيل تلقائي من التخزين
    if (localStorage.getItem('tarhal_sound_enabled') === '1') {
      this.enabled = true;
    }
  }

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

  // ⚠️ نفس الاسم القديم (للتوافق)
  playSound(name, options = {}) {
    this.play(name);
  }

  play(type = 'beep') {
    if (!this.enabled) return;

    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const sounds = {
      new_ride: [900, 0.25],
      ride_accepted: [1200, 0.3],
      ride_declined: [250, 0.35],
      notification: [700, 0.15],
      time_warning: [450, 0.4],
      beep: [600, 0.1]
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
}

// جعلها عالمية كما في تطبيقك
window.soundManager = new TarhalSoundManager();