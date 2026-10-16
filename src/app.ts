import { AudioBus } from './game/audio';
import { observeShift } from './game/feedback';
import { logEvent } from './game/events';
import { mountStand, type StandGame } from './game/stand';
import { ANKARA_COUNTER_PRODUCT_ID } from '../shared/products';
import { buyUpgrade, earnings, type KitchenSave, type UpgradeId } from './core/kit';
import {
  burnerAction,
  needsIngredient,
  submitIngredient,
  tapBoard,
  tapBurner,
} from './core/kitchen';
import type { IngredientId } from './core/recipes';
import { tick } from './core/shift';
import {
  beginShift,
  createShift,
  focusOrder,
  openTutorial,
  pauseShift,
  prepCustomer,
  resumeShift,
  retryShift,
  withKit,
  type ShiftState,
} from './core/state';
import { claimProduct } from './platform/claim';
import type { SaveStore } from './platform/save';
import type { Platform, PlatformPlayer } from './platform/types';
import { buzz } from './ui/effects';
import { GameView, type Presentation } from './ui/view';

export class GameController {
  private state: ShiftState;
  private presentation: Presentation;
  private save: KitchenSave;
  private stand: StandGame | null = null;
  private lastTick = 0;
  private frame = 0;
  private submitted = false;
  private purchasing = false;

  constructor(
    private readonly view: GameView,
    private readonly platform: Platform,
    private readonly audio: AudioBus,
    private readonly saves: SaveStore,
    private readonly serverUrl: string | null,
    durationMs: number,
    player: PlatformPlayer,
    notice: string | null,
    personalBest: number | null,
  ) {
    this.save = saves.read();
    this.state = createShift({ seed: Date.now(), durationMs, kit: this.save.kit });
    this.presentation = {
      playerName: player.mode === 'local' ? 'Practice player' : player.name,
      modeLabel: modeLabel(player.mode),
      avatarUrl: player.avatarUrl,
      notice,
      personalBest,
      newBest: false,
      leaderboard: null,
      muted: false,
      theme: 'default',
      canPurchase: platform.kind === 'vatar' && serverUrl !== null,
      cash: this.save.cash,
      earned: null,
      shopOpen: false,
    };
  }

  async start(): Promise<void> {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      const stand = mountStand(this.view.game, reducedMotion);
      this.view.onStandFrame = (frame) => stand.align(frame);
      this.stand = stand;
    } catch {
      this.presentation.notice = 'The stand animation could not start. The controls still work.';
    }
    this.bind();
    this.publish();
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      this.publish();
    });
    this.frame = window.requestAnimationFrame((now) => this.loop(now));
    if (this.serverUrl && this.platform.kind === 'vatar') {
      try {
        const products = await this.platform.syncProducts(this.serverUrl);
        this.presentation.theme = products.includes(ANKARA_COUNTER_PRODUCT_ID)
          ? 'ankara'
          : 'default';
        this.publish();
      } catch {
        this.presentation.notice = 'Saved purchases could not be restored.';
        this.publish();
      }
    }
  }

  private bind(): void {
    this.view.stage.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      this.audio.unlock();
      const button = target.closest<HTMLElement>('[data-action]');
      const tile = target.closest<HTMLElement>('[data-ingredient]');
      if (button?.dataset.action === 'burner') this.onBurner(button);
      else if (button?.dataset.action === 'chop') this.onChop();
      else if (button?.dataset.action === 'buy') this.onBuy(button.dataset.upgrade as UpgradeId);
      else if (button?.dataset.action === 'shelf')
        this.view.showShelf(Number(button.dataset.shelf));
      else if (button?.dataset.action === 'focus') {
        this.update(focusOrder(this.state, button.dataset.customer ?? ''));
      } else if (button?.dataset.action) this.onAction(button.dataset.action);
      if (tile) this.onIngredient(tile, tile.dataset.ingredient as IngredientId);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });
    this.platform.onPause(() => this.pause());
    this.platform.onResume(() => this.resume());
  }

  private loop(now: number): void {
    const dt = this.lastTick === 0 ? 0 : Math.min(250, now - this.lastTick);
    this.lastTick = now;
    this.update(tick(this.state, dt));
    this.frame = window.requestAnimationFrame((time) => this.loop(time));
  }

  private update(next: ShiftState): void {
    const previous = this.state;
    this.state = next;
    observeShift(previous, next, this.view, this.audio);
    if (next.phase === 'playing' && previous.phase !== 'playing' && previous.phase !== 'paused') {
      this.submitted = false;
      this.lastTick = 0;
    }
    if (next.phase === 'results' && previous.phase !== 'results') void this.finishShift();
    this.publish();
  }

  private onAction(action: string): void {
    if (action === 'start') this.update(openTutorial(this.state));
    if (action === 'tutorial') this.update(beginShift(this.state));
    if (action === 'pause') this.pause();
    if (action === 'resume') this.resume();
    if (action === 'retry') this.retry();
    if (action === 'shop' || action === 'close-shop') {
      this.presentation.shopOpen = action === 'shop';
      this.publish();
    }
    if (action === 'mute') {
      this.presentation.muted = this.audio.toggleMute();
      this.publish();
    }
    if (action === 'purchase') void this.purchase();
  }

  private onIngredient(tile: HTMLElement, ingredient: IngredientId): void {
    const customer = prepCustomer(this.state);
    if (!customer || customer.picked.includes(ingredient)) return;
    if (needsIngredient(this.state, ingredient)) this.view.accepted(tile, ingredient);
    else this.miss(tile, 'surprised');
    this.update(submitIngredient(this.state, ingredient));
  }

  private onChop(): void {
    this.update(tapBoard(this.state));
  }

  private onBurner(button: HTMLElement): void {
    const index = Number(button.dataset.burner);
    const action = burnerAction(this.state, index);
    const burner = this.state.burners[index];
    if (action === 'miss') this.miss(button, 'disgusted');
    if (action === 'cook') this.audio.play('sizzle');
    if (action === 'serve' && burner) this.view.served(burner.recipeId);
    this.update(tapBurner(this.state, index));
  }

  private onBuy(id: UpgradeId): void {
    const next = buyUpgrade(this.save, id);
    if (!next) return;
    this.save = next;
    this.saves.write(next);
    this.presentation.cash = next.cash;
    this.audio.play('done');
    logEvent('upgrade_bought', { upgrade: id });
    this.update(withKit(this.state, next.kit));
  }

  private miss(element: HTMLElement, emotion: 'surprised' | 'disgusted'): void {
    const practice = this.state.phase === 'tutorial';
    this.view.rejected(element, practice);
    this.stand?.react(emotion);
    buzz(60);
    if (practice) this.audio.play('bad');
  }

  private pause(): void {
    this.state = pauseShift(this.state);
    this.lastTick = 0;
    void this.audio.suspend();
    this.publish();
  }

  private resume(): void {
    this.state = resumeShift(this.state);
    this.lastTick = 0;
    void this.audio.resume();
    this.publish();
  }

  private retry(): void {
    this.presentation.leaderboard = null;
    this.presentation.newBest = false;
    this.presentation.earned = null;
    this.presentation.shopOpen = false;
    this.update(retryShift(this.state, Date.now()));
  }

  private async finishShift(): Promise<void> {
    if (this.submitted) return;
    this.submitted = true;
    const earned = earnings(this.state.score, this.state.bestCombo);
    this.save = { ...this.save, cash: this.save.cash + earned };
    this.saves.write(this.save);
    this.presentation.earned = earned;
    this.presentation.cash = this.save.cash;
    logEvent('shift_ended', { score: this.state.score, served: this.state.served, earned });
    try {
      const previousBest = this.presentation.personalBest;
      const submission = await this.platform.submitScore(this.state.score);
      if (submission.best !== null) this.presentation.personalBest = submission.best;
      this.presentation.newBest =
        this.state.score > 0 &&
        (previousBest === null
          ? submission.best === this.state.score
          : this.state.score > previousBest);
      if (submission.notice) this.presentation.notice = submission.notice;
      this.presentation.leaderboard = await this.platform.leaderboard();
    } catch {
      this.presentation.notice = 'The score could not be submitted.';
    }
    this.publish();
  }

  private async purchase(): Promise<void> {
    if (this.purchasing || !this.serverUrl) return;
    this.purchasing = true;
    const claim = await claimProduct(this.platform, this.serverUrl, ANKARA_COUNTER_PRODUCT_ID);
    if (claim.delivered) this.presentation.theme = 'ankara';
    this.presentation.notice = claim.notice;
    this.purchasing = false;
    this.publish();
  }

  private publish(): void {
    this.view.render(this.state, this.presentation);
    this.stand?.sync(this.state);
    this.audio.setBackground(this.state.phase === 'tutorial' || this.state.phase === 'playing');
  }

  destroy(): void {
    window.cancelAnimationFrame(this.frame);
    this.audio.setBackground(false);
    this.stand?.destroy();
  }
}

function modeLabel(mode: PlatformPlayer['mode']): string {
  if (mode === 'test') return 'Lagos Life test';
  if (mode === 'live') return 'Lagos Life';
  return 'Practice mode';
}
