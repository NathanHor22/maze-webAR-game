export type GameSound = 'start' | 'collect' | 'unlock' | 'checkpoint' | 'hit' | 'win' | 'lose';

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

interface Note {
  readonly frequency: number;
  readonly offset: number;
  readonly duration: number;
  readonly volume: number;
  readonly type?: OscillatorType;
}

const SOUND_NOTES: Readonly<Record<GameSound, readonly Note[]>> = {
  start: [
    { frequency: 220, offset: 0, duration: 0.07, volume: 0.035, type: 'square' },
    { frequency: 440, offset: 0.075, duration: 0.1, volume: 0.04, type: 'triangle' },
  ],
  collect: [
    { frequency: 659, offset: 0, duration: 0.08, volume: 0.045, type: 'sine' },
    { frequency: 988, offset: 0.055, duration: 0.12, volume: 0.035, type: 'sine' },
  ],
  unlock: [
    { frequency: 330, offset: 0, duration: 0.12, volume: 0.035, type: 'triangle' },
    { frequency: 494, offset: 0.1, duration: 0.12, volume: 0.04, type: 'triangle' },
    { frequency: 740, offset: 0.2, duration: 0.2, volume: 0.045, type: 'triangle' },
  ],
  checkpoint: [
    { frequency: 523, offset: 0, duration: 0.08, volume: 0.03, type: 'sine' },
    { frequency: 784, offset: 0.07, duration: 0.15, volume: 0.04, type: 'sine' },
  ],
  hit: [
    { frequency: 150, offset: 0, duration: 0.17, volume: 0.055, type: 'sawtooth' },
    { frequency: 90, offset: 0.09, duration: 0.24, volume: 0.045, type: 'square' },
  ],
  win: [
    { frequency: 523, offset: 0, duration: 0.14, volume: 0.04, type: 'triangle' },
    { frequency: 659, offset: 0.11, duration: 0.14, volume: 0.04, type: 'triangle' },
    { frequency: 784, offset: 0.22, duration: 0.14, volume: 0.045, type: 'triangle' },
    { frequency: 1047, offset: 0.34, duration: 0.35, volume: 0.045, type: 'sine' },
  ],
  lose: [
    { frequency: 294, offset: 0, duration: 0.2, volume: 0.04, type: 'triangle' },
    { frequency: 220, offset: 0.17, duration: 0.25, volume: 0.04, type: 'triangle' },
    { frequency: 147, offset: 0.38, duration: 0.4, volume: 0.045, type: 'sawtooth' },
  ],
};

/** Tiny synthesized sound bank; no network requests or audio files required. */
export class GameAudio {
  private context: AudioContext | null = null;
  private enabled: boolean;

  public constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) void this.unlock();
  }

  /** Call from a pointer/key event if the browser requires an explicit audio gesture. */
  public async unlock(): Promise<void> {
    const context = this.getContext();
    if (context?.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        // Audio is enhancement-only. A denied resume must never stop gameplay.
      }
    }
  }

  public play(sound: GameSound): void {
    if (!this.enabled) return;
    const context = this.getContext();
    if (context === null) return;
    if (context.state === 'suspended') void context.resume().catch(() => undefined);

    const start = context.currentTime + 0.005;
    for (const note of SOUND_NOTES[sound]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + note.offset;
      const noteEnd = noteStart + note.duration;

      oscillator.type = note.type ?? 'sine';
      oscillator.frequency.setValueAtTime(note.frequency, noteStart);
      oscillator.frequency.exponentialRampToValueAtTime(note.frequency * 0.94, noteEnd);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(note.volume, noteStart + Math.min(0.018, note.duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.01);
    }
  }

  public dispose(): void {
    if (this.context !== null) {
      void this.context.close().catch(() => undefined);
      this.context = null;
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (this.context !== null) return this.context;
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext
      ?? (window as WebkitAudioWindow).webkitAudioContext;
    if (AudioContextClass === undefined) return null;
    this.context = new AudioContextClass();
    return this.context;
  }
}
