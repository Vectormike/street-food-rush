import { difficultyAt } from './difficulty';
import { burnerCount, patienceScale, STARTER_KIT, type Kit } from './kit';
import { nextRng } from './random';
import { RECIPES, type IngredientId, type RecipeId } from './recipes';
import { SHIFT_DURATION_MS } from './time';

export type Phase = 'menu' | 'tutorial' | 'playing' | 'paused' | 'results';
export type Temperament = 'steady' | 'rush' | 'patient';
export type ExitReason = 'served' | 'left';

export interface Customer {
  id: string;
  recipeId: RecipeId;
  temperament: Temperament;
  label: string;
  patienceMs: number;
  remainingMs: number;
  picked: IngredientId[];
  cooking: boolean;
}

export interface BoardItem {
  ingredient: IngredientId;
  cutsLeft: number;
}

export interface Burner {
  customerId: string;
  recipeId: RecipeId;
  cookedMs: number;
}

export interface ShiftState {
  phase: Phase;
  seed: number;
  rngState: number;
  kit: Kit;
  durationMs: number;
  elapsedMs: number;
  score: number;
  combo: number;
  bestCombo: number;
  served: number;
  abandoned: number;
  mistakes: number;
  customers: Customer[];
  board: BoardItem[];
  burners: (Burner | null)[];
  focusId: string | null;
  /** True while the knife is slicing through the board on its own after a tap. */
  slicing: boolean;
  /** Total cuts made this shift, so the UI can react to each slice. */
  cuts: number;
  chefMs: number;
  spawnInMs: number;
  customerCount: number;
  lastExit: { id: string; reason: ExitReason } | null;
}

export const MAX_QUEUE = 3;
const TEMPERAMENTS: Temperament[] = ['steady', 'rush', 'patient'];
// The first real customers get simple, low-chop dishes and extra patience so a
// new player can land a clean serve and a combo before the rush ramps up.
const EASY_OPENERS: RecipeId[] = ['puffpuff', 'suya'];
const OPENER_PATIENCE = 1.3;

export function createShift(input: { seed: number; durationMs?: number; kit?: Kit }): ShiftState {
  const seed = input.seed >>> 0;
  const kit = input.kit ?? STARTER_KIT;
  return {
    phase: 'menu',
    seed,
    rngState: seed,
    kit,
    durationMs: input.durationMs ?? SHIFT_DURATION_MS,
    elapsedMs: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    abandoned: 0,
    mistakes: 0,
    customers: [],
    board: [],
    burners: Array.from({ length: burnerCount(kit) }, () => null),
    focusId: null,
    slicing: false,
    cuts: 0,
    chefMs: 0,
    spawnInMs: 0,
    customerCount: 0,
    lastExit: null,
  };
}

export function openTutorial(state: ShiftState): ShiftState {
  if (state.phase !== 'menu') return state;
  return spawn({ ...state, phase: 'tutorial' });
}

export function beginShift(state: ShiftState): ShiftState {
  if (state.phase !== 'menu' && state.phase !== 'tutorial') return state;
  const fresh = createShift({ seed: state.seed, durationMs: state.durationMs, kit: state.kit });
  const started = spawn({
    ...fresh,
    phase: 'playing',
    rngState: state.rngState,
    customerCount: state.customerCount,
  });
  return { ...started, spawnInMs: difficultyAt(0, started.durationMs).gapMs };
}

export function pauseShift(state: ShiftState): ShiftState {
  if (state.phase !== 'playing') return state;
  return { ...state, phase: 'paused' };
}

export function resumeShift(state: ShiftState): ShiftState {
  if (state.phase !== 'paused') return state;
  return { ...state, phase: 'playing' };
}

export function retryShift(state: ShiftState, seed: number): ShiftState {
  const fresh = createShift({ seed, durationMs: state.durationMs, kit: state.kit });
  return beginShift({ ...fresh, phase: 'tutorial' });
}

export function withKit(state: ShiftState, kit: Kit): ShiftState {
  if (state.phase !== 'menu' && state.phase !== 'results') return state;
  return { ...state, kit, burners: Array.from({ length: burnerCount(kit) }, () => null) };
}

export function prepCustomer(state: ShiftState): Customer | null {
  if (state.phase !== 'playing' && state.phase !== 'tutorial') return null;
  const waiting = state.customers.filter((customer) => !customer.cooking);
  return waiting.find((customer) => customer.id === state.focusId) ?? waiting[0] ?? null;
}

export function focusOrder(state: ShiftState, id: string): ShiftState {
  const customer = state.customers.find((item) => item.id === id);
  if (!customer || customer.cooking || state.board.length > 0) return state;
  if (state.phase !== 'playing' && state.phase !== 'tutorial') return state;
  return { ...state, focusId: id };
}

export function leave(state: ShiftState, id: string, reason: ExitReason): ShiftState {
  const focused = state.focusId === id;
  return {
    ...state,
    customers: state.customers.filter((customer) => customer.id !== id),
    burners: state.burners.map((burner) => (burner?.customerId === id ? null : burner)),
    board: focused ? [] : state.board,
    focusId: focused ? null : state.focusId,
    combo: reason === 'served' ? state.combo : 0,
    abandoned: reason === 'served' ? state.abandoned : state.abandoned + 1,
    lastExit: { id, reason },
  };
}

export function rejectIngredient(state: ShiftState): ShiftState {
  const customer = prepCustomer(state);
  if (!customer) return state;
  const remainingMs = customer.remainingMs - customer.patienceMs * 0.25;
  const mistaken: ShiftState = { ...state, combo: 0, mistakes: state.mistakes + 1 };
  if (remainingMs <= 0) return leave(mistaken, customer.id, 'left');
  return updateCustomer(mistaken, { ...customer, remainingMs });
}

export function updateCustomer(state: ShiftState, customer: Customer): ShiftState {
  return {
    ...state,
    customers: state.customers.map((item) => (item.id === customer.id ? customer : item)),
  };
}

export function spawn(state: ShiftState): ShiftState {
  const difficulty = difficultyAt(state.elapsedMs, state.durationMs);
  const first = state.customerCount === 0;
  const opener = first ? undefined : EASY_OPENERS[state.customerCount - 1];
  const easing = first || opener !== undefined;
  const recipeRoll = nextRng(state.rngState);
  const temperamentRoll = nextRng(recipeRoll.seed);
  const recipeId: RecipeId = first
    ? 'jollof'
    : (opener ?? RECIPES[Math.floor(recipeRoll.value * RECIPES.length)].id);
  const temperament: Temperament = easing
    ? 'steady'
    : TEMPERAMENTS[Math.floor(temperamentRoll.value * TEMPERAMENTS.length)];
  const onboarding = opener !== undefined ? OPENER_PATIENCE : 1;
  const patienceMs = Math.round(
    difficulty.patienceMs * temperamentScale(temperament) * patienceScale(state.kit) * onboarding,
  );
  const customer: Customer = {
    id: `c${state.customerCount + 1}`,
    recipeId,
    temperament,
    label: temperamentLabel(temperament),
    patienceMs,
    remainingMs: patienceMs,
    picked: [],
    cooking: false,
  };
  return {
    ...state,
    rngState: temperamentRoll.seed,
    customerCount: state.customerCount + 1,
    spawnInMs: difficulty.gapMs,
    customers: [...state.customers, customer],
  };
}

function temperamentScale(temperament: Temperament): number {
  if (temperament === 'rush') return 0.8;
  if (temperament === 'patient') return 1.15;
  return 1;
}

function temperamentLabel(temperament: Temperament): string {
  if (temperament === 'rush') return 'In a hurry';
  if (temperament === 'patient') return 'Patient';
  return 'Steady';
}
