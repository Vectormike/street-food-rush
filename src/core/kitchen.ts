import { burnMs, chefEveryMs, cookMs, cutsPerItem } from './kit';
import { ingredientById, recipeById, type IngredientId } from './recipes';
import { orderScore } from './scoring';
import {
  beginShift,
  leave,
  prepCustomer,
  rejectIngredient,
  updateCustomer,
  type Burner,
  type Customer,
  type ShiftState,
} from './state';

export type BurnerAction = 'cook' | 'serve' | 'wait' | 'miss' | null;
export type BurnerStatus = 'cooking' | 'ready' | 'burning';
export type Hint = IngredientId | 'chop' | 'cook' | 'serve' | 'wait';

const SLICE_MS = 160;

export function submitIngredient(state: ShiftState, ingredient: IngredientId): ShiftState {
  const customer = prepCustomer(state);
  if (!customer || customer.picked.includes(ingredient)) return state;
  if (!recipeById(customer.recipeId).ingredients.includes(ingredient)) {
    return state.phase === 'tutorial' ? state : rejectIngredient(state);
  }
  const next = {
    ...updateCustomer(state, { ...customer, picked: [...customer.picked, ingredient] }),
    focusId: customer.id,
  };
  if (!ingredientById(ingredient).chop) return next;
  return { ...next, board: [...next.board, { ingredient, cutsLeft: cutsPerItem(state.kit) }] };
}

/** One tap sets the knife going; it keeps slicing on its own until the board is clear. */
export function tapBoard(state: ShiftState): ShiftState {
  if (state.board.length === 0 || !prepCustomer(state)) return state;
  return chop({ ...state, slicing: true });
}

export function chop(state: ShiftState): ShiftState {
  const [head, ...rest] = state.board;
  if (!head || !prepCustomer(state)) return state;
  const cut = { ...state, cuts: state.cuts + 1 };
  if (head.cutsLeft > 1)
    return { ...cut, board: [{ ...head, cutsLeft: head.cutsLeft - 1 }, ...rest] };
  return { ...cut, board: rest, slicing: rest.length > 0 && state.slicing };
}

export function isPrepped(state: ShiftState, customer: Customer): boolean {
  const recipe = recipeById(customer.recipeId);
  return state.board.length === 0 && recipe.ingredients.every((id) => customer.picked.includes(id));
}

export function needsIngredient(state: ShiftState, ingredient: IngredientId): boolean {
  const customer = prepCustomer(state);
  if (!customer || customer.picked.includes(ingredient)) return false;
  return recipeById(customer.recipeId).ingredients.includes(ingredient);
}

export function burnerStatus(state: ShiftState, burner: Burner): BurnerStatus {
  const ready = cookMs(state.kit);
  if (burner.cookedMs < ready) return 'cooking';
  return burner.cookedMs < ready + burnMs(state.kit) / 2 ? 'ready' : 'burning';
}

export function burnerTimer(state: ShiftState, burner: Burner): number {
  const ready = cookMs(state.kit);
  if (burner.cookedMs < ready) return burner.cookedMs / ready;
  return Math.max(0, 1 - (burner.cookedMs - ready) / burnMs(state.kit));
}

export function burnerAction(state: ShiftState, index: number): BurnerAction {
  if (state.phase !== 'playing' && state.phase !== 'tutorial') return null;
  const burner = state.burners[index];
  if (burner === undefined) return null;
  if (burner) return burnerStatus(state, burner) === 'cooking' ? 'wait' : 'serve';
  const customer = prepCustomer(state);
  if (!customer) return null;
  return isPrepped(state, customer) ? 'cook' : 'miss';
}

export function tapBurner(state: ShiftState, index: number): ShiftState {
  const action = burnerAction(state, index);
  const burner = state.burners[index];
  if (action === 'serve' && burner) return serve(state, burner);
  if (action === 'miss') return state.phase === 'tutorial' ? state : rejectIngredient(state);
  const customer = prepCustomer(state);
  if (action !== 'cook' || !customer) return state;
  const burners = state.burners.map((item, slot) =>
    slot === index ? { customerId: customer.id, recipeId: customer.recipeId, cookedMs: 0 } : item,
  );
  return { ...updateCustomer(state, { ...customer, cooking: true }), burners, focusId: null };
}

export function tickKitchen(state: ShiftState, dt: number): ShiftState {
  const practice = state.phase === 'tutorial';
  const limit = practice ? cookMs(state.kit) : Infinity;
  let next: ShiftState = {
    ...state,
    burners: state.burners.map((burner) =>
      burner ? { ...burner, cookedMs: Math.min(limit, burner.cookedMs + dt) } : null,
    ),
  };
  const burnt = next.burners.find(
    (burner) => burner && burner.cookedMs >= cookMs(state.kit) + burnMs(state.kit),
  );
  if (burnt) next = binBurnt(next, burnt);
  if (next.board.length === 0) return next.slicing ? { ...next, slicing: false } : next;
  const every = autoChopEveryMs(next);
  if (!every) return next;
  let chefMs = next.chefMs + dt;
  while (chefMs >= every && next.board.length > 0) {
    next = chop(next);
    chefMs -= every;
  }
  return { ...next, chefMs: next.board.length > 0 ? chefMs : 0 };
}

/** The knife slices on its own after a tap; a helper chef chops even without one. */
function autoChopEveryMs(state: ShiftState): number {
  const chef = chefEveryMs(state.kit);
  if (!state.slicing) return chef;
  return chef ? Math.min(chef, SLICE_MS) : SLICE_MS;
}

export function nextHint(state: ShiftState): Hint | null {
  if (state.burners.some((burner) => burner && burnerStatus(state, burner) !== 'cooking')) {
    return 'serve';
  }
  const customer = prepCustomer(state);
  if (state.board.length > 0) return 'chop';
  if (customer) {
    const missing = recipeById(customer.recipeId).ingredients.find(
      (id) => !customer.picked.includes(id),
    );
    if (missing) return missing;
    if (state.burners.includes(null)) return 'cook';
  }
  return state.burners.some(Boolean) ? 'wait' : null;
}

export function burntOrders(previous: ShiftState, state: ShiftState): string[] {
  return previous.burners
    .filter((burner): burner is Burner => burner !== null)
    .filter((burner) => !state.burners.some((item) => item?.customerId === burner.customerId))
    .map((burner) => burner.customerId)
    .filter((id) => state.customers.some((customer) => customer.id === id && !customer.cooking));
}

function binBurnt(state: ShiftState, burnt: Burner): ShiftState {
  const customer = state.customers.find((item) => item.id === burnt.customerId);
  const binned: ShiftState = {
    ...state,
    burners: state.burners.map((burner) => (burner === burnt ? null : burner)),
    combo: 0,
    mistakes: state.mistakes + 1,
  };
  return customer ? updateCustomer(binned, { ...customer, cooking: false, picked: [] }) : binned;
}

function serve(state: ShiftState, burner: Burner): ShiftState {
  if (state.phase === 'tutorial') return beginShift(state);
  const customer = state.customers.find((item) => item.id === burner.customerId);
  if (!customer) return state;
  const combo = state.combo + 1;
  const points = orderScore(
    recipeById(customer.recipeId).basePoints,
    customer.remainingMs,
    customer.patienceMs,
    combo,
  );
  return leave(
    {
      ...state,
      combo,
      bestCombo: Math.max(state.bestCombo, combo),
      score: state.score + points,
      served: state.served + 1,
    },
    customer.id,
    'served',
  );
}
