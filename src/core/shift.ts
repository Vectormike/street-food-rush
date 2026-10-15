import { tickKitchen } from './kitchen';
import { leave, MAX_QUEUE, spawn, type ShiftState } from './state';

const EMPTY_COUNTER_MS = 1_200;

export function tick(state: ShiftState, dtMs: number): ShiftState {
  const dt = Math.max(0, dtMs);
  if (state.phase === 'tutorial') return tickKitchen(state, dt);
  if (state.phase !== 'playing') return state;
  const elapsedMs = state.elapsedMs + dt;
  if (elapsedMs >= state.durationMs) return finish(state);

  let next = tickKitchen({ ...state, elapsedMs }, dt);
  next = {
    ...next,
    customers: next.customers.map((customer) => ({
      ...customer,
      remainingMs: customer.remainingMs - dt,
    })),
  };
  for (const customer of next.customers) {
    if (customer.remainingMs <= 0) next = leave(next, customer.id, 'left');
  }
  const due =
    next.customers.length === 0 ? Math.min(next.spawnInMs, EMPTY_COUNTER_MS) : next.spawnInMs;
  const spawnInMs = Math.max(0, due - dt);
  if (spawnInMs > 0 || next.customers.length >= MAX_QUEUE) return { ...next, spawnInMs };
  return spawn(next);
}

export function accuracy(state: ShiftState): number | null {
  const total = state.served + state.abandoned;
  if (total === 0) return null;
  return state.served / total;
}

function finish(state: ShiftState): ShiftState {
  return {
    ...state,
    phase: 'results',
    customers: [],
    board: [],
    burners: state.burners.map(() => null),
    spawnInMs: 0,
    elapsedMs: state.durationMs,
  };
}
