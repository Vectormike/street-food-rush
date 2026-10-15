import { describe, expect, it } from 'vitest';
import { cookMs } from '../src/core/kit';
import { submitIngredient, tapBurner } from '../src/core/kitchen';
import { RECIPES, recipeById, type RecipeId } from '../src/core/recipes';
import { orderScore } from '../src/core/scoring';
import { tick } from '../src/core/shift';
import {
  beginShift,
  createShift,
  MAX_QUEUE,
  openTutorial,
  pauseShift,
  resumeShift,
  retryShift,
} from '../src/core/state';
import { cook, cookAndServe, playing, prep } from './helpers';

describe('shift flow', () => {
  it('starts on the menu and teaches with a practice jollof order', () => {
    const menu = createShift({ seed: 1 });
    expect(menu.phase).toBe('menu');
    const tutorial = openTutorial(menu);
    expect(tutorial.phase).toBe('tutorial');
    expect(tutorial.customers).toHaveLength(1);
    expect(tutorial.customers[0].recipeId).toBe('jollof');
    expect(tutorial.customers[0].temperament).toBe('steady');
  });

  it('keeps the practice order free of time, burning, penalties and points', () => {
    const tutorial = openTutorial(createShift({ seed: 1 }));
    const waited = tick(tutorial, 60_000);
    expect(waited.customers[0].remainingMs).toBe(tutorial.customers[0].remainingMs);
    expect(submitIngredient(waited, 'sugar')).toBe(waited);
    expect(tapBurner(waited, 0)).toBe(waited);
    const left = tick(cook(waited), 60_000);
    expect(left.customers).toHaveLength(1);
    expect(left.burners[0]?.cookedMs).toBe(cookMs(left.kit));
    const shift = tapBurner(left, 0);
    expect(shift.phase).toBe('playing');
    expect(shift.score).toBe(0);
    expect(shift.served).toBe(0);
    expect(shift.elapsedMs).toBe(0);
    expect(shift.customers).toHaveLength(1);
  });

  it('skips the practice order straight into the shift', () => {
    const shift = beginShift(openTutorial(createShift({ seed: 1 })));
    expect(shift.phase).toBe('playing');
    expect(shift.mistakes).toBe(0);
    expect(shift.customers[0].id).toBe('c2');
    expect(shift.spawnInMs).toBe(9_000);
  });

  it('eases new players in with simple, patient first orders', () => {
    let shift = beginShift(openTutorial(createShift({ seed: 3 })));
    expect(shift.customers[0]).toMatchObject({ recipeId: 'puffpuff', temperament: 'steady' });
    const plain = Math.round(38_000 * 1);
    expect(shift.customers[0].patienceMs).toBe(Math.round(38_000 * 1.3));
    shift = tick(shift, shift.spawnInMs);
    expect(shift.customers[1]).toMatchObject({ recipeId: 'suya', temperament: 'steady' });
    const third = tick(shift, shift.spawnInMs);
    expect(['steady', 'rush', 'patient']).toContain(third.customers[2].temperament);
    expect(plain).toBeLessThan(shift.customers[0].patienceMs);
  });

  it('scores a cooked jollof by the patience left when served', () => {
    const started = playing();
    const customer = started.customers[0];
    const served = cookAndServe(started);
    expect(served.served).toBe(1);
    expect(served.combo).toBe(1);
    expect(served.lastExit).toEqual({ id: customer.id, reason: 'served' });
    expect(served.score).toBe(
      orderScore(130, customer.patienceMs - cookMs(started.kit), customer.patienceMs, 1),
    );
  });

  it('queues up to three customers', () => {
    let state = playing();
    for (let count = 0; count < 5; count += 1) state = tick(state, state.spawnInMs);
    expect(state.customers).toHaveLength(MAX_QUEUE);
  });

  it('calls the next customer quickly when the counter is empty', () => {
    const served = cookAndServe(playing());
    expect(served.customers).toHaveLength(0);
    expect(tick(served, 1_200).customers).toHaveLength(1);
  });

  it('abandons a customer when patience runs out and clears their board', () => {
    const chopping = submitIngredient(playing(), 'tomato');
    const state = tick(chopping, chopping.customers[0].patienceMs);
    expect(state.abandoned).toBe(1);
    expect(state.mistakes).toBe(0);
    expect(state.combo).toBe(0);
    expect(state.board).toEqual([]);
    expect(state.lastExit).toEqual({ id: 'c1', reason: 'left' });
  });

  it('keeps the timer frozen while paused', () => {
    const started = playing();
    const remaining = started.customers[0].remainingMs;
    const paused = tick(pauseShift(started), 5_000);
    expect(paused.phase).toBe('paused');
    expect(paused.customers[0].remainingMs).toBe(remaining);
    const resumed = tick(resumeShift(paused), 1_000);
    expect(resumed.customers[0].remainingMs).toBe(remaining - 1_000);
  });

  it('ends the shift and clears the kitchen', () => {
    const started = cook(playing());
    const state = tick(started, started.durationMs);
    expect(state.phase).toBe('results');
    expect(state.elapsedMs).toBe(started.durationMs);
    expect(state.abandoned).toBe(0);
    expect(state.customers).toEqual([]);
    expect(state.burners).toEqual([null]);
  });

  it('retries directly into a new shift with the same kit', () => {
    const kit = { burners: 2, knife: 0, pots: 0, fan: 0, cooler: 0, chef: 0 };
    const again = retryShift(tick(playing(1, kit), 90_000), 4);
    expect(again.phase).toBe('playing');
    expect(again.score).toBe(0);
    expect(again.customers[0].recipeId).toBe('jollof');
    expect(again.burners).toHaveLength(3);
  });

  it('serves every dish through the same recipe rules', () => {
    const seen = new Set<RecipeId>();
    let state = beginShift(openTutorial(createShift({ seed: 7, durationMs: 6_000_000 })));
    for (let count = 0; count < 400 && seen.size < RECIPES.length; count += 1) {
      if (state.customers.length === 0) state = tick(state, state.spawnInMs);
      seen.add(state.customers[0].recipeId);
      expect(recipeById(state.customers[0].recipeId)).toBeTruthy();
      state = cookAndServe(state);
    }
    expect([...seen].sort()).toEqual(RECIPES.map((recipe) => recipe.id).sort());
    expect(state.score).toBeGreaterThan(0);
  });

  it('gives the same second customer for the same seed', () => {
    const next = (seed: number) => {
      const first = prep(playing(seed));
      return tick(first, first.spawnInMs).customers[1]?.recipeId;
    };
    expect(next(11)).toBeTruthy();
    expect(next(11)).toBe(next(11));
  });
});
