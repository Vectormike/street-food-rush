const BPM = 108;
const STEP = 60 / BPM / 4;
const STEPS_PER_BAR = 16;
const LOOKAHEAD = 0.12;

const CHORDS = [
  [60, 64, 67],
  [65, 69, 72],
  [67, 71, 74],
  [65, 69, 72],
];
const KICK = [0, 6, 12];
const CLAP = [4, 12];
const BELL = [0, 2, 4, 5, 7, 9, 11, 12, 14];
const BASS = [0, 3, 6, 10, 12];
const GUITAR = [0, 2, 3, 5, 6, 8, 10, 11, 13, 14];
const TALKING_DRUM = [10, 11, 14];

export class Groove {
  private readonly output: GainNode;
  private readonly noise: AudioBuffer;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;

  constructor(private readonly context: AudioContext) {
    this.output = context.createGain();
    this.output.gain.value = 0.12;
    this.output.connect(context.destination);
    this.noise = noiseBuffer(context);
  }

  start(): void {
    if (this.timer !== null) return;
    this.step = 0;
    this.nextTime = this.context.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 30);
  }

  stop(): void {
    if (this.timer === null) return;
    window.clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    while (this.nextTime < this.context.currentTime + LOOKAHEAD) {
      this.play(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step = (this.step + 1) % (STEPS_PER_BAR * CHORDS.length);
    }
  }

  private play(step: number, when: number): void {
    const beat = step % STEPS_PER_BAR;
    const bar = Math.floor(step / STEPS_PER_BAR);
    const chord = CHORDS[bar];
    if (KICK.includes(beat)) this.kick(when);
    if (CLAP.includes(beat)) this.hiss(when, 0.09, 1400, 0.22);
    this.hiss(when, 0.035, 7000, beat % 2 === 1 ? 0.09 : 0.04);
    if (BELL.includes(beat)) this.pluck(beat % 4 === 0 ? 1568 : 1175, when, 0.06, 'square', 0.025);
    if (BASS.includes(beat)) {
      const root = chord[0] - 24 + (beat === 10 ? 7 : 0);
      this.pluck(midi(root), when, STEP * 2.2, 'triangle', 0.32);
    }
    if (GUITAR.includes(beat)) {
      const note = chord[(beat + bar) % chord.length] + (beat > 8 ? 12 : 0);
      this.pluck(midi(note), when, 0.18, 'triangle', 0.07);
    }
    if (bar % 2 === 1 && TALKING_DRUM.includes(beat)) this.talkingDrum(when, beat === 14);
  }

  private kick(when: number): void {
    const oscillator = this.context.createOscillator();
    const gain = this.envelope(when, 0.5, 0.28);
    oscillator.frequency.setValueAtTime(130, when);
    oscillator.frequency.exponentialRampToValueAtTime(45, when + 0.18);
    oscillator.connect(gain);
    oscillator.start(when);
    oscillator.stop(when + 0.3);
  }

  private talkingDrum(when: number, falling: boolean): void {
    const oscillator = this.context.createOscillator();
    const gain = this.envelope(when, 0.22, 0.3);
    oscillator.frequency.setValueAtTime(falling ? 260 : 170, when);
    oscillator.frequency.exponentialRampToValueAtTime(falling ? 140 : 230, when + 0.22);
    oscillator.connect(gain);
    oscillator.start(when);
    oscillator.stop(when + 0.32);
  }

  private hiss(when: number, duration: number, frequency: number, level: number): void {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = frequency;
    source.connect(filter).connect(this.envelope(when, level, duration));
    source.start(when, Math.random() * 0.5, duration + 0.02);
  }

  private pluck(
    frequency: number,
    when: number,
    duration: number,
    type: OscillatorType,
    level: number,
  ): void {
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.connect(this.envelope(when, level, duration));
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  private envelope(when: number, level: number, duration: number): GainNode {
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(level, when + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    gain.connect(this.output);
    return gain;
  }
}

export function noiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  return buffer;
}

function midi(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}
