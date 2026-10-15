import { Ambience } from './ambience';
import { Groove } from './music';

export type SoundName = 'ok' | 'bad' | 'done' | 'leave' | 'sizzle' | 'chop';

export class AudioBus {
  muted = false;
  private context: AudioContext | null = null;
  private groove: Groove | null = null;
  private ambience: Ambience | null = null;

  unlock(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.groove = new Groove(this.context);
      this.ambience = new Ambience(this.context);
    }
    if (!this.muted && this.context.state === 'suspended') void this.context.resume();
  }

  setBackground(on: boolean): void {
    for (const layer of [this.groove, this.ambience]) {
      if (on) layer?.start();
      else layer?.stop();
    }
  }

  async suspend(): Promise<void> {
    await this.context?.suspend();
  }

  async resume(): Promise<void> {
    if (!this.muted) await this.context?.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) void this.context?.suspend();
    else void this.context?.resume();
    return this.muted;
  }

  play(name: SoundName): void {
    if (this.muted || !this.context) return;
    const now = this.context.currentTime;
    if (name === 'sizzle') {
      this.ambience?.sizzle();
      return;
    }
    if (name === 'done') {
      this.tone(523, now, 0.08);
      this.tone(659, now + 0.08, 0.1);
      return;
    }
    if (name === 'chop') {
      this.tone(1_150, now, 0.035, 'triangle');
      return;
    }
    if (name === 'leave') {
      this.tone(320, now, 0.12, 'triangle');
      return;
    }
    this.tone(
      name === 'ok' ? 660 : 170,
      now,
      name === 'ok' ? 0.06 : 0.1,
      name === 'ok' ? 'sine' : 'square',
    );
  }

  private tone(
    frequency: number,
    when: number,
    duration: number,
    type: OscillatorType = 'sine',
  ): void {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.07, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }
}
