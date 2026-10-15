import { noiseBuffer } from './music';

const EVENT_MS = 500;

export class Ambience {
  private readonly output: GainNode;
  private readonly noise: AudioBuffer;
  private sources: AudioScheduledSourceNode[] = [];
  private chatter: GainNode[] = [];
  private timer: number | null = null;

  constructor(private readonly context: AudioContext) {
    this.output = context.createGain();
    this.output.gain.value = 0.6;
    this.output.connect(context.destination);
    this.noise = noiseBuffer(context);
  }

  start(): void {
    if (this.timer !== null) return;
    this.chatter = [420, 900, 1700].map((frequency) => this.crowdBand(frequency));
    this.hum();
    this.timer = window.setInterval(() => this.events(), EVENT_MS);
  }

  stop(): void {
    if (this.timer === null) return;
    window.clearInterval(this.timer);
    this.timer = null;
    for (const source of this.sources) source.stop();
    this.sources = [];
    this.chatter = [];
  }

  sizzle(): void {
    const now = this.context.currentTime;
    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2600;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    const source = this.noiseSource();
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(now, Math.random() * 0.5, 1);
    for (let pop = 0; pop < 7; pop += 1) this.crackle(now + Math.random() * 0.8);
  }

  private crowdBand(frequency: number): GainNode {
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1.2;
    const gain = this.context.createGain();
    gain.gain.value = 0.02;
    const source = this.noiseSource();
    source.loop = true;
    source.connect(filter).connect(gain).connect(this.output);
    source.start();
    this.sources.push(source);
    return gain;
  }

  private hum(): void {
    const oscillator = this.context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 100;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const gain = this.context.createGain();
    gain.gain.value = 0.018;
    oscillator.connect(filter).connect(gain).connect(this.output);
    oscillator.start();
    this.sources.push(oscillator);
  }

  private events(): void {
    if (this.context.state !== 'running') return;
    const now = this.context.currentTime;
    for (const band of this.chatter) {
      band.gain.setTargetAtTime(0.01 + Math.random() * 0.035, now, 0.12);
    }
    const roll = Math.random();
    if (roll < 0.06) this.horn(now);
    else if (roll < 0.1) this.okada(now);
    else if (roll < 0.12) this.bell(now);
  }

  private horn(when: number): void {
    const blasts = Math.random() < 0.5 ? [0.12, 0.4] : [0.5];
    let start = when;
    for (const length of blasts) {
      for (const frequency of [392, 466]) {
        this.voice('square', frequency, start, length, 0.035, 1400);
      }
      start += length + 0.08;
    }
  }

  private okada(when: number): void {
    const oscillator = this.context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(70, when);
    oscillator.frequency.linearRampToValueAtTime(115, when + 1.2);
    oscillator.frequency.linearRampToValueAtTime(85, when + 2.4);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.05, when + 1.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 2.4);
    const pan = this.context.createStereoPanner();
    const side = Math.random() < 0.5 ? -1 : 1;
    pan.pan.setValueAtTime(side, when);
    pan.pan.linearRampToValueAtTime(-side, when + 2.4);
    oscillator.connect(filter).connect(gain).connect(pan).connect(this.output);
    oscillator.start(when);
    oscillator.stop(when + 2.5);
  }

  private bell(when: number): void {
    for (let ring = 0; ring < 3; ring += 1) {
      this.voice('sine', 2093, when + ring * 0.16, 0.3, 0.02, 8000);
      this.voice('sine', 3136, when + ring * 0.16, 0.18, 0.008, 8000);
    }
  }

  private crackle(when: number): void {
    const source = this.noiseSource();
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.12, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
    source.connect(gain).connect(this.context.destination);
    source.start(when, Math.random() * 0.5, 0.04);
  }

  private voice(
    type: OscillatorType,
    frequency: number,
    when: number,
    duration: number,
    level: number,
    cutoff: number,
  ): void {
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(level, when + 0.01);
    gain.gain.setValueAtTime(level, when + duration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(filter).connect(gain).connect(this.output);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  private noiseSource(): AudioBufferSourceNode {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    return source;
  }
}
