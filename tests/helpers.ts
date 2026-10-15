import { cookMs, type Kit } from '../src/core/kit';
import { chop, submitIngredient, tapBurner } from '../src/core/kitchen';
import { recipeById } from '../src/core/recipes';
import { tick } from '../src/core/shift';
import { beginShift, createShift, prepCustomer, type ShiftState } from '../src/core/state';

export function playing(seed = 1, kit?: Kit): ShiftState {
  return beginShift(createShift({ seed, durationMs: 90_000, kit }));
}

export function prep(state: ShiftState): ShiftState {
  const customer = prepCustomer(state);
  if (!customer) return state;
  let next = [...recipeById(customer.recipeId).ingredients]
    .reverse()
    .reduce((current, item) => submitIngredient(current, item), state);
  while (next.board.length > 0) next = chop(next);
  return next;
}

export function cook(state: ShiftState): ShiftState {
  return tapBurner(prep(state), state.burners.indexOf(null));
}

export function cookAndServe(state: ShiftState): ShiftState {
  const index = state.burners.indexOf(null);
  const cooked = tick(tapBurner(prep(state), index), cookMs(state.kit));
  return tapBurner(cooked, index);
}
