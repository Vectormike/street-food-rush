import Phaser from 'phaser';
import streetUrl from '../assets/street.webp';
import carUrl from '../assets/vehicle-car.webp';
import danfoUrl from '../assets/vehicle-danfo.webp';
import kekeUrl from '../assets/vehicle-keke.webp';
import okadaUrl from '../assets/vehicle-okada.webp';
import walker0Url from '../assets/walker-0.webp';
import walker1Url from '../assets/walker-1.webp';
import walker2Url from '../assets/walker-2.webp';
import walker3Url from '../assets/walker-3.webp';
import walker4Url from '../assets/walker-4.webp';

const BACKDROP = { key: 'street', width: 1280, height: 720 };
const VEHICLES = [
  { key: 'danfo', url: danfoUrl, height: 120, speed: 260 },
  { key: 'keke', url: kekeUrl, height: 112, speed: 190 },
  { key: 'okada', url: okadaUrl, height: 112, speed: 300 },
  { key: 'car', url: carUrl, height: 88, speed: 280 },
];
const WALKERS = [walker0Url, walker1Url, walker2Url, walker3Url, walker4Url].map((url, index) => ({
  key: `walker-${index}`,
  url,
}));
const VISIBLE_ROWS = 0.6;
const WALKER_HEIGHT = 128;
const SIDEWALK = 0.71;
const LANES = [
  { bottom: 0.85, direction: -1, depth: 0.6 },
  { bottom: 0.97, direction: 1, depth: 0.7 },
];

export function preloadStreet(scene: Phaser.Scene): void {
  scene.load.image(BACKDROP.key, streetUrl);
  for (const asset of [...VEHICLES, ...WALKERS]) scene.load.image(asset.key, asset.url);
}

export class Street {
  private readonly backdrop: Phaser.GameObjects.TileSprite;
  private movers: Phaser.GameObjects.Image[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private width = 0;
  private top = 0;
  private scale = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly reducedMotion: boolean,
  ) {
    this.backdrop = scene.add.tileSprite(0, 0, 1, 1, BACKDROP.key).setOrigin(0, 1).setDepth(0);
  }

  layout(width: number, visibleTop: number, bottom: number): void {
    this.scale = (bottom - visibleTop) / (BACKDROP.height * VISIBLE_ROWS);
    this.width = width;
    this.top = bottom - BACKDROP.height * this.scale;
    this.backdrop
      .setPosition(0, bottom)
      .setSize(width, BACKDROP.height * this.scale)
      .setTileScale(this.scale);
    this.backdrop.tilePositionX = BACKDROP.width / 2 - width / 2 / this.scale;
    this.clear();
    if (this.reducedMotion) return;
    this.every(2600, 1800, () => this.drive());
    this.every(3200, 2200, () => this.walk());
  }

  private every(base: number, jitter: number, spawn: () => void): void {
    spawn();
    const schedule = (): void => {
      const timer = this.scene.time.delayedCall(base + Math.random() * jitter, () => {
        this.timers = this.timers.filter((item) => item !== timer);
        spawn();
        schedule();
      });
      this.timers.push(timer);
    };
    schedule();
  }

  private drive(): void {
    const vehicle = Phaser.Utils.Array.GetRandom(VEHICLES);
    const lane = Phaser.Utils.Array.GetRandom(LANES);
    const y = this.top + BACKDROP.height * this.scale * lane.bottom;
    const image = this.mover(vehicle.key, y, vehicle.height, lane.depth, lane.direction);
    const distance = this.width + image.displayWidth * 2;
    this.travel(image, lane.direction, (distance / (vehicle.speed * this.scale)) * 1000);
  }

  private walk(): void {
    const walker = Phaser.Utils.Array.GetRandom(WALKERS);
    const direction = Math.random() < 0.5 ? -1 : 1;
    const y = this.top + BACKDROP.height * this.scale * SIDEWALK;
    const image = this.mover(walker.key, y, WALKER_HEIGHT, 0.5, direction);
    const distance = this.width + image.displayWidth * 2;
    this.travel(image, direction, (distance / (60 * this.scale)) * 1000);
    this.scene.tweens.add({
      targets: image,
      y: y - 3 * this.scale,
      duration: 260,
      yoyo: true,
      repeat: -1,
    });
  }

  private mover(
    key: string,
    y: number,
    height: number,
    depth: number,
    direction: number,
  ): Phaser.GameObjects.Image {
    const image = this.scene.add.image(0, y, key).setOrigin(0.5, 1).setDepth(depth);
    image.setScale((height * this.scale) / image.height).setFlipX(direction < 0);
    image.x = direction > 0 ? -image.displayWidth : this.width + image.displayWidth;
    this.movers.push(image);
    return image;
  }

  private travel(image: Phaser.GameObjects.Image, direction: number, duration: number): void {
    this.scene.tweens.add({
      targets: image,
      x: direction > 0 ? this.width + image.displayWidth : -image.displayWidth,
      duration,
      onComplete: () => {
        this.movers = this.movers.filter((item) => item !== image);
        image.destroy();
      },
    });
  }

  private clear(): void {
    for (const timer of this.timers) timer.remove();
    for (const image of this.movers) {
      this.scene.tweens.killTweensOf(image);
      image.destroy();
    }
    this.timers = [];
    this.movers = [];
  }
}
