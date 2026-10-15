import { nextHint } from '../core/kitchen';
import { recipeById, type IngredientId, type RecipeId } from '../core/recipes';
import { prepCustomer, type ShiftState } from '../core/state';
import { formatTime } from '../core/time';
import type { PlatformLeaderboard } from '../platform/types';
import { ingredientArt, mealArt } from './art';
import { setData, setText } from './dom';
import type { StandFrame } from '../game/stand';
import { flashTile, flyArt, popArt, popText, type PopKind } from './effects';
import { watchStandFrame } from './frame';
import { coachText, hudMarkup } from './hud';
import { isChopped, queueMarkup, queueSignature, updateKitchen } from './kitchen';
import { stepChip } from './markup';
import { openShelf, updatePantry } from './pantry';
import { menuCard, pausedCard, resultsCard } from './screens';
import { shopCard } from './shop';

export interface Presentation {
  playerName: string;
  modeLabel: string;
  avatarUrl: string | null;
  notice: string | null;
  personalBest: number | null;
  newBest: boolean;
  leaderboard: PlatformLeaderboard | null;
  muted: boolean;
  theme: 'default' | 'ankara';
  canPurchase: boolean;
  cash: number;
  earned: number | null;
  shopOpen: boolean;
}

const URGENT_MS = 10_000;
const MISS_MS = 1_400;

export class GameView {
  readonly stage: HTMLElement;
  readonly game: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly pops: HTMLElement;
  private readonly live: HTMLElement;
  private playReady = false;
  private orderSignature = '';
  private queueSignature = '';
  private overlaySignature = '';
  private feedbackTimer = 0;
  private missUntil = 0;
  private stopFrame = (): void => undefined;
  onStandFrame: (frame: StandFrame | null) => void = () => undefined;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <h1 class="sr-only">Street Food Rush</h1>
      <div id="stage" data-phase="menu" data-theme="default">
        <div id="game"></div>
        <div id="hud"></div>
        <div id="pops" aria-hidden="true"></div>
        <div id="overlay"></div>
        <div id="live" class="sr-only" aria-live="polite"></div>
      </div>
    `;
    this.stage = required(root, '#stage');
    this.game = required(root, '#game');
    this.hud = required(root, '#hud');
    this.pops = required(root, '#pops');
    this.overlay = required(root, '#overlay');
    this.live = required(root, '#live');
  }

  render(state: ShiftState, presentation: Presentation): void {
    this.stage.dataset.phase = state.phase;
    this.stage.dataset.theme = presentation.theme;
    if (state.phase === 'menu' || state.phase === 'results') {
      if (this.playReady) this.clearPlay();
    } else {
      this.ensurePlay(state, presentation);
      this.updatePlay(state, presentation);
    }
    const overlaySignature = overlayKey(state, presentation);
    if (overlaySignature === this.overlaySignature) return;
    this.overlaySignature = overlaySignature;
    const card = overlayCard(state, presentation);
    this.overlay.hidden = card === null;
    this.overlay.innerHTML = card ?? '';
  }

  flash(kind: 'wrong' | 'served'): void {
    delete this.stage.dataset.feedback;
    void this.stage.offsetWidth;
    this.stage.dataset.feedback = kind;
    window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = window.setTimeout(() => {
      delete this.stage.dataset.feedback;
    }, 450);
  }

  accepted(button: HTMLElement, ingredient: IngredientId): void {
    const target = this.hud.querySelector(isChopped(ingredient) ? '.board' : '.bowl');
    flyArt(this.pops, button, target, ingredientArt(ingredient, 'fly-art'));
  }

  chopped(): void {
    const prep = this.hud.querySelector('.prep');
    prep?.classList.remove('chopping');
    void (prep as HTMLElement | null)?.offsetWidth;
    prep?.classList.add('chopping');
  }

  served(recipe: RecipeId): void {
    popArt(this.pops, mealArt(recipe, 'cooked-art'));
  }

  showShelf(index: number): void {
    openShelf(this.hud, index);
  }

  rejected(button: HTMLElement, practice: boolean): void {
    flashTile(button);
    if (practice) this.missUntil = performance.now() + MISS_MS;
  }

  pop(text: string, kind: PopKind): void {
    popText(this.pops, text, kind);
  }

  announce(message: string): void {
    this.live.textContent = message;
  }

  private ensurePlay(state: ShiftState, presentation: Presentation): void {
    if (this.playReady) return;
    this.playReady = true;
    this.hud.innerHTML = hudMarkup(state, presentation);
    this.stopFrame = watchStandFrame(this.hud, this.game, (frame) => this.onStandFrame(frame));
  }

  private updatePlay(state: ShiftState, presentation: Presentation): void {
    const remaining = state.durationMs - state.elapsedMs;
    setText(this.hud, '[data-testid="timer"]', formatTime(remaining));
    setText(this.hud, '[data-testid="score"]', String(state.score));
    setText(this.hud, '[data-testid="combo"]', String(state.combo));
    setData(this.hud, '.timer', 'urgent', String(remaining <= URGENT_MS));
    setData(this.hud, '.combo', 'active', String(state.combo > 1));
    const notice = this.hud.querySelector<HTMLElement>('[data-testid="platform-notice"]');
    if (notice) {
      notice.hidden = !presentation.notice;
      notice.textContent = presentation.notice ?? '';
    }
    const mute = this.hud.querySelector<HTMLButtonElement>('[data-testid="mute"]');
    if (mute && mute.getAttribute('aria-pressed') !== String(presentation.muted)) {
      mute.textContent = presentation.muted ? '🔇' : '🔊';
      mute.setAttribute('aria-pressed', String(presentation.muted));
    }
    this.updateCoach(state);
    this.updateOrder(state);
    this.updateQueue(state);
    const active = state.phase === 'playing' || state.phase === 'tutorial';
    const hint = state.phase === 'tutorial' ? nextHint(state) : null;
    updatePantry(this.hud, state, active, hint);
    updateKitchen(this.hud, state, active);
  }

  private updateCoach(state: ShiftState): void {
    const coach = this.hud.querySelector<HTMLElement>('.coach');
    if (!coach) return;
    const practice = state.phase === 'tutorial';
    coach.hidden = !practice;
    if (!practice) return;
    const missed = performance.now() < this.missUntil;
    coach.dataset.missed = String(missed);
    setText(coach, 'p', coachText(state, missed));
  }

  private updateOrder(state: ShiftState): void {
    const customer = prepCustomer(state);
    const bar = this.hud.querySelector<HTMLElement>('[data-testid="patience"]');
    if (bar) {
      const ratio = customer ? Math.max(0, customer.remainingMs / customer.patienceMs) : 0;
      bar.style.width = `${ratio * 100}%`;
      setData(this.hud, '.patience', 'level', ratio > 0.5 ? 'high' : ratio > 0.25 ? 'mid' : 'low');
    }
    const signature = JSON.stringify([customer?.id, customer?.picked, state.board.length]);
    if (signature === this.orderSignature) return;
    this.orderSignature = signature;
    const recipe = customer ? recipeById(customer.recipeId) : null;
    const label = state.phase === 'tutorial' ? 'Practice order' : customer?.label;
    const waiting = state.customers.length > 0 ? 'Serve the pots when they glow' : 'Hold on';
    const dish = this.hud.querySelector('.dish-art');
    if (dish) dish.innerHTML = recipe ? mealArt(recipe.id, 'ticket-art') : '⏳';
    setText(this.hud, '[data-testid="customer-label"]', label ?? waiting);
    setText(
      this.hud,
      '[data-testid="recipe-name"]',
      recipe?.name ??
        (state.customers.length > 0 ? 'Everything is on the fire' : 'Next customer is on the way'),
    );
    const steps = this.hud.querySelector<HTMLOListElement>('[data-testid="steps"]');
    if (!steps) return;
    const chopping = state.board.map((item) => item.ingredient);
    steps.innerHTML =
      customer && recipe
        ? recipe.ingredients
            .map((id) => stepChip(id, customer.picked.includes(id), chopping.includes(id)))
            .join('')
        : '';
  }

  private updateQueue(state: ShiftState): void {
    const queue = this.hud.querySelector<HTMLElement>('.queue');
    if (!queue) return;
    const signature = `${queueSignature(state)}:${prepCustomer(state)?.id}`;
    if (signature !== this.queueSignature) {
      this.queueSignature = signature;
      queue.innerHTML = state.customers.length > 1 ? queueMarkup(state) : '';
    }
    for (const customer of state.customers) {
      const bar = queue.querySelector<HTMLElement>(`[data-patience="${customer.id}"]`);
      if (bar)
        bar.style.width = `${Math.max(0, customer.remainingMs / customer.patienceMs) * 100}%`;
    }
  }

  private clearPlay(): void {
    this.playReady = false;
    this.orderSignature = '';
    this.queueSignature = '';
    this.stopFrame();
    this.onStandFrame(null);
    this.hud.innerHTML = '';
  }
}

function overlayCard(state: ShiftState, presentation: Presentation): string | null {
  const between = state.phase === 'menu' || state.phase === 'results';
  if (between && presentation.shopOpen) return shopCard(state.kit, presentation.cash);
  if (state.phase === 'menu') return menuCard(state, presentation);
  if (state.phase === 'results') return resultsCard(state, presentation);
  if (state.phase === 'paused') return pausedCard();
  return null;
}

function overlayKey(state: ShiftState, presentation: Presentation): string {
  if (state.phase !== 'menu' && state.phase !== 'results') return state.phase;
  return JSON.stringify([
    state.phase,
    state.phase === 'results' ? state.score : '',
    state.kit,
    presentation.cash,
    presentation.earned,
    presentation.shopOpen,
    presentation.notice ?? '',
    presentation.theme,
    presentation.personalBest ?? '',
    presentation.newBest,
    presentation.leaderboard?.me?.label ?? '',
  ]);
}

function required(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
