import Phaser from 'phaser';
import cast0 from '../assets/customer-0.webp';
import cast1 from '../assets/customer-1.webp';
import cast2 from '../assets/customer-2.webp';
import cast3 from '../assets/customer-3.webp';
import cast4 from '../assets/customer-4.webp';
import cast5 from '../assets/customer-5.webp';
import cast6 from '../assets/customer-6.webp';
import cast7 from '../assets/customer-7.webp';
import type { Customer } from '../core/state';
import { MEAL_SHEET, mealIndex } from '../ui/art';
import { LINES } from './lines';

export const EMOTIONS = [
  'hungry',
  'happy',
  'thinking',
  'impatient',
  'pleading',
  'angry',
  'surprised',
  'disgusted',
  'excited',
  'delighted',
  'laughing',
  'sad',
] as const;
export type Emotion = (typeof EMOTIONS)[number];

const CAST = [cast0, cast1, cast2, cast3, cast4, cast5, cast6, cast7];
const MEALS = 'meals';
const BUBBLE = 76;
const FRAME = 256;
const INK = 0x1d2433;
const POSES = 2;
const TEMPERS: Emotion[][] = [
  ['hungry', 'happy', 'thinking', 'impatient', 'pleading', 'angry'],
  ['happy', 'happy', 'thinking', 'thinking', 'pleading', 'sad'],
  ['hungry', 'impatient', 'impatient', 'angry', 'angry', 'angry'],
  ['hungry', 'thinking', 'pleading', 'pleading', 'sad', 'angry'],
];
const BANDS = [0.85, 0.65, 0.5, 0.35, 0.2];
const BOUNCE: Emotion[] = ['happy', 'excited', 'delighted', 'laughing'];
const SHAKE: Emotion[] = ['angry', 'disgusted', 'surprised'];
const LEAN: Emotion[] = ['thinking', 'impatient', 'pleading', 'sad'];
let lastCast = -1;

export function preloadCustomers(scene: Phaser.Scene): void {
  CAST.forEach((url, index) => {
    scene.load.spritesheet(castKey(index), url, { frameWidth: FRAME, frameHeight: FRAME });
  });
  scene.load.spritesheet(MEALS, MEAL_SHEET.url, {
    frameWidth: MEAL_SHEET.frame,
    frameHeight: MEAL_SHEET.frame,
  });
}

function emotionFor(customer: Customer, temper: Emotion[]): Emotion {
  if (customer.cooking) return 'excited';
  const ratio = customer.remainingMs / customer.patienceMs;
  const band = BANDS.findIndex((limit) => ratio > limit);
  return temper[band === -1 ? BANDS.length : band];
}

export class CustomerSprite {
  readonly container: Phaser.GameObjects.Container;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Graphics;
  private readonly speech: Phaser.GameObjects.Container;
  private readonly speechBox: Phaser.GameObjects.Graphics;
  private readonly speechText: Phaser.GameObjects.Text;
  private readonly texture: string;
  private readonly temper = Phaser.Math.RND.pick(TEMPERS);
  private gesture?: Phaser.Tweens.Tween;
  private emotion: Emotion | null = null;
  private heldUntil = 0;
  private speechTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    customer: Customer,
    scale: number,
    private readonly reducedMotion: boolean,
  ) {
    this.texture = castKey(pickCast());
    this.portrait = scene.add.image(0, 0, this.texture, 0).setOrigin(0.5, 1);
    const top = -FRAME * 0.98;
    this.bubble = scene.add.graphics();
    drawDishBubble(this.bubble, 96, top);
    const dish = scene.add
      .image(96 + BUBBLE / 2, top + BUBBLE / 2, MEALS, mealIndex(customer.recipeId))
      .setScale((BUBBLE - 10) / MEAL_SHEET.frame);
    this.speechBox = scene.add.graphics();
    this.speechText = scene.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontStyle: '800',
        fontSize: '15px',
        color: '#1d2433',
        align: 'center',
        wordWrap: { width: 150 },
      })
      .setOrigin(0.5);
    this.speech = scene.add
      .container(-118, top + 24, [this.speechBox, this.speechText])
      .setVisible(false);
    this.container = scene.add.container(0, 0, [this.portrait, this.bubble, dish, this.speech]);
    this.container.setScale(scale);
    this.update(customer);
  }

  update(customer: Customer): void {
    if (this.scene.time.now < this.heldUntil) return;
    this.show(emotionFor(customer, this.temper));
  }

  react(emotion: Emotion, holdMs: number): void {
    this.heldUntil = this.scene.time.now + holdMs;
    this.show(emotion);
  }

  destroy(): void {
    this.speechTimer?.remove();
    this.gesture?.remove();
    this.container.destroy(true);
  }

  private show(emotion: Emotion): void {
    if (emotion === this.emotion) return;
    this.emotion = emotion;
    const pose = Phaser.Math.RND.between(0, POSES - 1);
    this.portrait.setFrame(EMOTIONS.indexOf(emotion) + pose * EMOTIONS.length);
    this.say(Phaser.Math.RND.pick(LINES[emotion]));
    this.gesturing(emotion);
  }

  private gesturing(emotion: Emotion): void {
    this.gesture?.remove();
    this.portrait.setPosition(0, 0).setAngle(0);
    if (this.reducedMotion) return;
    const target = { targets: this.portrait, yoyo: true, ease: 'Sine.InOut' };
    if (BOUNCE.includes(emotion)) {
      this.gesture = this.scene.tweens.add({ ...target, y: -16, duration: 150, repeat: 2 });
    } else if (SHAKE.includes(emotion)) {
      this.gesture = this.scene.tweens.add({ ...target, x: 7, duration: 60, repeat: 3 });
    } else if (LEAN.includes(emotion)) {
      const angle = Phaser.Math.RND.pick([-4, 4]);
      this.gesture = this.scene.tweens.add({ ...target, angle, duration: 500 });
    }
  }

  private say(line: string): void {
    this.speechText.setText(line);
    const width = this.speechText.width + 24;
    const height = this.speechText.height + 16;
    this.speechText.setY(height / 2);
    this.speechBox.clear();
    this.speechBox.fillStyle(0xfffaf3, 1).lineStyle(3, INK, 1);
    this.speechBox.fillRoundedRect(-width / 2, 0, width, height, 14);
    this.speechBox.strokeRoundedRect(-width / 2, 0, width, height, 14);
    this.speechBox.fillTriangle(
      width / 2 - 26,
      height - 2,
      width / 2 - 8,
      height - 2,
      width / 2 - 4,
      height + 14,
    );
    this.speech.setVisible(true);
    this.speechTimer?.remove();
    this.speechTimer = this.scene.time.delayedCall(1800, () => this.speech.setVisible(false));
  }
}

function castKey(index: number): string {
  return `customer-${index}`;
}

function pickCast(): number {
  const others = CAST.map((_, index) => index).filter((index) => index !== lastCast);
  lastCast = Phaser.Math.RND.pick(others);
  return lastCast;
}

function drawDishBubble(bubble: Phaser.GameObjects.Graphics, x: number, y: number): void {
  bubble.fillStyle(0xfffaf3, 1);
  bubble.lineStyle(4, INK, 1);
  bubble.fillRoundedRect(x, y, BUBBLE, BUBBLE, 22);
  bubble.strokeRoundedRect(x, y, BUBBLE, BUBBLE, 22);
  bubble.fillTriangle(x + 6, y + BUBBLE - 10, x - 12, y + BUBBLE + 12, x + 24, y + BUBBLE - 2);
  bubble.lineBetween(x + 6, y + BUBBLE - 8, x - 12, y + BUBBLE + 12);
  bubble.lineBetween(x - 12, y + BUBBLE + 12, x + 22, y + BUBBLE);
}
