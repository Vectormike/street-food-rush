import { burntOrders } from '../core/kitchen';
import { recipeById } from '../core/recipes';
import { prepCustomer, type ShiftState } from '../core/state';
import { buzz } from '../ui/effects';
import type { GameView } from '../ui/view';
import type { AudioBus } from './audio';
import { logEvent } from './events';

/** Only nudge during the first serves; after that the cook knows the rhythm. */
const NUDGE_UNTIL_SERVED = 2;

export function observeShift(
  previous: ShiftState,
  state: ShiftState,
  view: GameView,
  audio: AudioBus,
): void {
  if (pickedCount(state) > pickedCount(previous)) audio.play('ok');
  if (state.cuts > previous.cuts) {
    audio.play('chop');
    view.chopped();
  }
  if (state.phase === 'playing' && previous.phase !== 'playing' && previous.phase !== 'paused') {
    audio.play('done');
    view.pop('Shift on!', 'go');
    view.announce('Shift started');
    logEvent('shift_started', { durationMs: state.durationMs });
  }
  if (state.phase === 'playing' && cookingCount(state) > cookingCount(previous)) {
    nudgeNextOrder(state, view);
  }
  if (state.served > previous.served) {
    audio.play('done');
    buzz(state.combo >= 3 ? 45 : 20);
    view.flash('served');
    view.pop(`+${state.score - previous.score}`, 'score');
    if (state.combo > 1) {
      view.pop(`${state.combo >= 3 ? '🔥 ' : ''}Combo ${state.combo}!`, 'combo');
    }
    view.announce('Order served');
    logEvent('order_served', { score: state.score, combo: state.combo });
  }
  if (state.mistakes > previous.mistakes) {
    audio.play('bad');
    view.flash('wrong');
    const burnt = burntOrders(previous, state).length > 0;
    if (burnt) view.pop('Burnt! 🗑️', 'combo');
    view.announce(burnt ? 'The food burnt. Cook it again.' : 'Wrong move');
    logEvent('ingredient_rejected', { mistakes: state.mistakes });
  }
  if (state.abandoned > previous.abandoned) {
    audio.play('leave');
    view.announce('Customer left');
    logEvent('order_abandoned', { abandoned: state.abandoned });
  }
}

function pickedCount(state: ShiftState): number {
  return state.customers.reduce((total, customer) => total + customer.picked.length, 0);
}

function cookingCount(state: ShiftState): number {
  return state.burners.filter(Boolean).length;
}

/** Cook time is idle time unless the cook knows another order is waiting. */
function nudgeNextOrder(state: ShiftState, view: GameView): void {
  const next = prepCustomer(state);
  if (!next || state.served >= NUDGE_UNTIL_SERVED) return;
  view.pop(`Next up: ${recipeById(next.recipeId).name}`, 'hint');
}
