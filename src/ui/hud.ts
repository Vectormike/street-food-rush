import { nextHint } from '../core/kitchen';
import { ingredientById } from '../core/recipes';
import { prepCustomer, type ShiftState } from '../core/state';
import { kitchenMarkup } from './kitchen';
import { pantryMarkup } from './pantry';
import type { Presentation } from './view';

export function hudMarkup(state: ShiftState, presentation: Presentation): string {
  return `
    <header class="topbar">
      <p class="pill timer"><span aria-hidden="true">⏱️</span><strong data-testid="timer">1:30</strong></p>
      <p class="pill"><span aria-hidden="true">⭐</span><strong data-testid="score">0</strong></p>
      <p class="pill combo" data-active="false"><span aria-hidden="true">🔥</span><strong data-testid="combo">0</strong><span class="sr-only"> combo</span></p>
      <span class="spacer"></span>
      <button class="icon-btn" type="button" data-action="mute" data-testid="mute" aria-label="Mute" aria-pressed="${presentation.muted}">${presentation.muted ? '🔇' : '🔊'}</button>
      <button class="icon-btn pause-btn" type="button" data-action="pause" data-testid="pause" aria-label="Pause">⏸️</button>
    </header>
    <p class="banner" data-testid="platform-notice" hidden></p>
    <section class="ticket" data-testid="order" aria-live="polite">
      <div class="ticket-head">
        <span class="dish-art"></span>
        <div>
          <p class="ticket-meta" data-testid="customer-label"></p>
          <h2 data-testid="recipe-name">Waiting</h2>
        </div>
        <ol class="queue" data-testid="queue" aria-label="Customers waiting"></ol>
      </div>
      <ol class="steps" data-testid="steps"></ol>
      <div class="patience" data-level="high" aria-hidden="true"><span data-testid="patience"></span></div>
      <div class="coach" data-testid="coach" hidden>
        <p aria-live="polite"></p>
        <button type="button" data-action="tutorial" data-testid="dismiss-tutorial">Skip</button>
      </div>
    </section>
    <span class="spacer"></span>
    <div class="tray" data-testid="stations">
      ${pantryMarkup()}
      ${kitchenMarkup(state)}
    </div>
  `;
}

export function coachText(state: ShiftState, missed: boolean): string {
  if (missed) return 'Not yet! Follow the glowing step.';
  const next = nextHint(state);
  if (next === 'serve') return 'Food don ready! Tap the pot to serve.';
  if (next === 'chop') {
    const item = state.board[0];
    return `Tap the chopping board to cut the ${ingredientById(item.ingredient).label}.`;
  }
  if (next === 'cook') return 'All in the bowl! Tap a burner to cook.';
  if (next === 'wait') return 'It dey cook… wait for the pot to glow.';
  if (!next) return '';
  const label = ingredientById(next).label;
  if (prepCustomer(state)?.picked.length === 0) {
    return `No clock yet. Pick the ticket items in any order. Try ${label}.`;
  }
  return `Nice! Now find the ${label}.`;
}
