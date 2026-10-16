import Phaser from 'phaser';
import { burntOrders } from '../core/kitchen';
import { MAX_QUEUE, type Customer, type ShiftState } from '../core/state';
import { CustomerSprite, type Emotion } from './customer';

const REACTION_MS = 750;
const DEPTH_SHRINK = 0.14;

export interface QueueLayout {
  width: number;
  cx: number;
  y: number;
  scale: number;
  spacing: number;
}

export class CustomerQueue {
  private readonly sprites = new Map<string, CustomerSprite>();
  private readonly targets = new Map<string, string>();
  private readonly slides = new Map<string, Phaser.Tweens.Tween>();
  private layout: QueueLayout | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly reducedMotion: boolean,
  ) {}

  relayout(layout: QueueLayout): void {
    this.layout = layout;
    this.targets.clear();
    for (const sprite of this.sprites.values()) sprite.container.setY(layout.y);
  }

  sync(previous: ShiftState | null, state: ShiftState): void {
    const layout = this.layout;
    if (!layout) return;
    const visible = state.phase === 'menu' || state.phase === 'results' ? [] : state.customers;
    const ids = new Set(visible.map((customer) => customer.id));
    if (previous) for (const id of burntOrders(previous, state)) this.react(id, 'disgusted');
    let leaving = false;
    for (const [id, sprite] of this.sprites) {
      if (ids.has(id)) continue;
      this.forget(id);
      this.leave(sprite, reactionFor(previous, state, id));
      leaving = true;
    }
    visible.forEach((customer, index) => {
      const spot = spotInLine(layout, index);
      const sprite = this.sprites.get(customer.id);
      if (!sprite) this.arrive(customer, spot, leaving ? REACTION_MS : 0);
      else {
        sprite.update(customer, index > 0);
        this.slide(customer.id, sprite, spot, 0);
      }
      (sprite ?? this.sprites.get(customer.id))?.container.setDepth(1 - index * 0.01);
    });
  }

  react(id: string | undefined, emotion: Emotion): void {
    if (id) this.sprites.get(id)?.react(emotion, 1100);
  }

  private arrive(customer: Customer, spot: Spot, delay: number): void {
    const layout = this.layout;
    if (!layout) return;
    const sprite = new CustomerSprite(this.scene, customer, spot.scale, this.reducedMotion);
    sprite.container.setPosition(layout.width + 160, layout.y);
    this.sprites.set(customer.id, sprite);
    this.slide(customer.id, sprite, spot, delay);
    if (this.reducedMotion) return;
    this.scene.tweens.add({
      targets: sprite.container,
      y: layout.y - 6,
      delay,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private slide(id: string, sprite: CustomerSprite, { x, scale }: Spot, delay: number): void {
    const key = `${x}:${scale}`;
    if (this.targets.get(id) === key) return;
    this.targets.set(id, key);
    this.slides.get(id)?.remove();
    if (this.reducedMotion) {
      sprite.container
        .setVisible(delay === 0)
        .setX(x)
        .setScale(scale);
      if (delay) this.scene.time.delayedCall(delay, () => sprite.container.setVisible(true));
      return;
    }
    const tween = this.scene.tweens.add({
      targets: sprite.container,
      x,
      scale,
      delay,
      duration: 420,
      ease: 'Back.Out',
    });
    this.slides.set(id, tween);
  }

  private forget(id: string): void {
    this.sprites.delete(id);
    this.targets.delete(id);
    this.slides.get(id)?.remove();
    this.slides.delete(id);
  }

  private leave(sprite: CustomerSprite, reaction: Emotion | null): void {
    this.scene.tweens.killTweensOf(sprite.container);
    if (reaction) sprite.react(reaction, 2000);
    const wait = reaction ? REACTION_MS : 0;
    if (this.reducedMotion) {
      this.scene.time.delayedCall(wait, () => sprite.destroy());
      return;
    }
    const container = sprite.container;
    if (reaction === 'delighted' || reaction === 'laughing') {
      this.scene.tweens.add({
        targets: container,
        y: container.y - 24,
        duration: 160,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.Out',
      });
    }
    this.scene.tweens.add({
      targets: container,
      x: -200,
      delay: wait,
      duration: reaction === 'sad' ? 700 : 380,
      ease: 'Quad.In',
      onComplete: () => sprite.destroy(),
    });
  }
}

interface Spot {
  x: number;
  scale: number;
}

function spotInLine(layout: QueueLayout, index: number): Spot {
  return {
    x: layout.cx + (index - (MAX_QUEUE - 1) / 2) * layout.spacing,
    scale: layout.scale * (1 - index * DEPTH_SHRINK),
  };
}

function reactionFor(previous: ShiftState | null, state: ShiftState, id: string): Emotion | null {
  if (state.lastExit?.id === id) {
    if (state.lastExit.reason === 'served') return state.combo >= 3 ? 'laughing' : 'delighted';
    return 'sad';
  }
  if (previous?.phase === 'tutorial' && state.phase === 'playing') {
    return previous.burners.some((burner) => burner?.customerId === id) ? 'delighted' : null;
  }
  return null;
}
