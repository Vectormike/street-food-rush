import Phaser from 'phaser';
import { prepCustomer, type ShiftState } from '../core/state';
import { preloadCustomers, type Emotion } from './customer';
import { CustomerQueue } from './queue';
import { preloadStreet, Street } from './street';

const INK = 0x1d2433;
const CUSTOMER_HEIGHT = 250;
const COUNTER_LIP = 14;
const SCALLOP = 26;

export interface StandFrame {
  top: number;
  counter: number;
}

export interface StandGame {
  sync(state: ShiftState): void;
  align(frame: StandFrame | null): void;
  react(emotion: 'surprised' | 'disgusted'): void;
  destroy(): void;
}

export function mountStand(parent: HTMLElement, reducedMotion: boolean): StandGame {
  const scene = new StandScene(reducedMotion);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#fde3a7',
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene,
  });
  return {
    sync: (state) => scene.sync(state),
    align: (frame) => scene.align(frame),
    react: (emotion) => scene.react(emotion),
    destroy: () => game.destroy(true),
  };
}

interface Layout {
  width: number;
  height: number;
  cx: number;
  canopy: number;
  counter: number;
  customerScale: number;
}

class StandScene extends Phaser.Scene {
  private latest: ShiftState | null = null;
  private ready = false;
  private street?: Street;
  private front?: Phaser.GameObjects.Graphics;
  private bunting?: Phaser.GameObjects.Graphics;
  private sign?: Phaser.GameObjects.Text;
  private queue?: CustomerQueue;
  private frame: StandFrame | null = null;

  constructor(private reducedMotion: boolean) {
    super('stand');
  }

  sync(state: ShiftState): void {
    const previous = this.latest;
    this.latest = state;
    if (this.ready) this.queue?.sync(previous, state);
  }

  align(frame: StandFrame | null): void {
    const before = this.frame;
    const same =
      before && frame
        ? Math.abs(before.top - frame.top) < 1 && Math.abs(before.counter - frame.counter) < 1
        : before === frame;
    if (same) return;
    this.frame = frame;
    if (this.ready) this.relayout(this.scale.width, this.scale.height);
  }

  react(emotion: Emotion): void {
    if (this.latest) this.queue?.react(prepCustomer(this.latest)?.id, emotion);
  }

  preload(): void {
    preloadStreet(this);
    preloadCustomers(this);
  }

  create(): void {
    this.street = new Street(this, this.reducedMotion);
    this.queue = new CustomerQueue(this, this.reducedMotion);
    this.bunting = this.add.graphics().setDepth(0.8);
    this.front = this.add.graphics().setDepth(2);
    this.sign = this.add
      .text(0, 0, 'STREET FOOD RUSH', {
        fontFamily: 'system-ui, sans-serif',
        fontStyle: '900',
        fontSize: '18px',
        color: '#fde3a7',
      })
      .setOrigin(0.5)
      .setDepth(3);
    this.relayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (size: Phaser.Structs.Size) => this.relayout(size.width, size.height));
    this.ready = true;
    if (this.latest) this.queue.sync(null, this.latest);
  }

  private relayout(width: number, height: number): void {
    const counter = this.frame
      ? this.frame.counter - COUNTER_LIP
      : height * (height / width > 1.5 ? 0.54 : 0.6);
    const room = counter - (this.frame?.top ?? 0);
    const layout: Layout = {
      width,
      height,
      cx: width / 2,
      canopy: Math.min(height * 0.3, (this.frame?.top ?? height) - SCALLOP),
      counter,
      customerScale: Phaser.Math.Clamp(
        Math.min(height * 0.001, width / 560, room / CUSTOMER_HEIGHT),
        0.4,
        1,
      ),
    };
    this.street?.layout(width, layout.canopy, layout.counter);
    this.drawFront(layout);
    this.sign?.setPosition(layout.cx, layout.counter + 52);
    const scale = layout.customerScale;
    this.queue?.relayout({
      width,
      cx: layout.cx,
      y: layout.counter,
      scale,
      spacing: Math.min(width * 0.26, 140 * scale),
    });
  }

  private drawFront({ width, height, canopy, counter }: Layout): void {
    const g = this.front;
    if (!g) return;
    g.clear();
    const stripe = 44;
    for (let x = 0, index = 0; x < width + stripe; x += stripe, index += 1) {
      g.fillStyle(index % 2 === 0 ? 0xd94a3a : 0xfff3dc, 1);
      g.fillRect(x, 0, stripe, canopy);
      g.fillCircle(x + stripe / 2, canopy, stripe / 2);
    }
    this.drawBunting(width, canopy);
    g.fillStyle(0xb5703f, 1);
    g.fillRect(0, counter, width, 20);
    g.fillStyle(0x7a4428, 1);
    g.fillRect(0, counter + 20, width, height - counter - 20);
    g.lineStyle(3, INK, 1);
    g.lineBetween(0, counter, width, counter);
    g.lineStyle(2, 0x5f3420, 1);
    for (let x = 60; x < width; x += 90) g.lineBetween(x, counter + 20, x, height);
    g.fillStyle(0x5a301c, 1);
    g.lineStyle(3, INK, 1);
    g.fillRoundedRect(width / 2 - 110, counter + 34, 220, 36, 10);
    g.strokeRoundedRect(width / 2 - 110, counter + 34, 220, 36, 10);
  }

  private drawBunting(width: number, canopy: number): void {
    const g = this.bunting;
    if (!g) return;
    g.clear();
    g.lineStyle(3, INK, 0.9);
    g.beginPath();
    for (let x = 0; x <= width; x += 24) {
      const y = canopy + 34 + Math.sin((x / width) * Math.PI) * 18;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
    for (let x = 18, index = 0; x < width; x += 48, index += 1) {
      const y = canopy + 40 + Math.sin((x / width) * Math.PI) * 18;
      g.fillStyle([0xffe08a, 0x8fd18a, 0xff8a5b][index % 3], 1);
      g.fillCircle(x, y, 6);
    }
  }
}
