import { SoundTheme } from '../types';

class SoundService {
  private ctx: AudioContext | null = null;
  private currentTheme: SoundTheme = 'clicky';
  private volume: number = 0.25;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setTheme(theme: SoundTheme) {
    this.currentTheme = theme;
  }

  getTheme(): SoundTheme {
    return this.currentTheme;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  playKey(isError: boolean = false, isSpace: boolean = false) {
    if (this.currentTheme === 'off') return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (isError) {
        // Dull error buzz / thud
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
        gain.gain.setValueAtTime(this.volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        return;
      }

      switch (this.currentTheme) {
        case 'clicky': {
          // Cherry MX Blue style - high crisp click + bump
          const pitch = isSpace ? 800 : 1200 + (Math.random() * 300 - 150);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(pitch, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.035);

          // Click noise burst
          gain.gain.setValueAtTime(this.volume * 0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.035);
          break;
        }

        case 'thock': {
          // Lubricated deep linear switch (Holy Panda / Ink Black)
          const baseFreq = isSpace ? 180 : 260 + (Math.random() * 40 - 20);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq, now);
          osc.frequency.exponentialRampToValueAtTime(70, now + 0.06);

          gain.gain.setValueAtTime(this.volume * 0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }

        case 'tactile': {
          // Cherry Brown / tactile bump
          const bumpFreq = isSpace ? 350 : 500 + (Math.random() * 60 - 30);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(bumpFreq, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

          gain.gain.setValueAtTime(this.volume * 0.45, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        case 'typewriter': {
          // Old typewriter mechanical impact
          const freq = isSpace ? 600 : 900 + (Math.random() * 100);
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

          gain.gain.setValueAtTime(this.volume * 0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        default:
          break;
      }
    } catch {
      // Audio context may be restricted before user gesture
    }
  }
}

export const soundService = new SoundService();
