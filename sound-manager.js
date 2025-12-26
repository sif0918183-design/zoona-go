// sound-manager.js
// Tarhal – Lightweight Sound Manager (Final)

class TarhalSoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('tarhal_sound_enabled') === '1';
    this.volume = 0.2;

    const savedVolume = localStorage.getItem('tarhal_sound_volume');
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
  }

  /* ===== Init & Enable ===== */

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

  /* ===== Compatibility Layer ===== */

  activateAudioImmediately() {
    this.enable();
  }

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

  playSound(type = 'beep', volumeOverride = null) {
    this.play(type, volumeOverride);
  }

  /* ===== Sound Engine ===== */

  play(type = 'beep', volumeOverride = null) {
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
    gain.gain.value = volumeOverride ?? this.volume;

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  /* ===== Helpers ===== */

  setVolume(level) {
    this.volume = Math.max(0, Math.min(1, level));
    localStorage.setItem('tarhal_sound_volume', this.volume);
  }

  isEnabled() {
    return this.enabled;
  }
}

/* ===== Global Instance ===== */

window.soundManager = new TarhalSoundManager();

/* ===== Enable After First Interaction (Once) ===== */

const activateOnce = () => {
  if (window.soundManager && !window.soundManager.enabled) {
    window.soundManager.enable();
    window.soundManager.playSound('beep');
    console.log('🎵 Tarhal sound enabled');
  }
};

['click', 'touchstart', 'keydown'].forEach(event => {
  document.addEventListener(event, activateOnce, { once: true });
});