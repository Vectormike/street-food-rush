import { describe, expect, it } from 'vitest';
import {
  burnMs,
  buyUpgrade,
  cookMs,
  earnings,
  parseSave,
  STARTER_KIT,
  type Kit,
} from '../src/core/kit';
import {
  burnerAction,
  burntOrders,
  chop,
  nextHint,
  submitIngredient,
  tapBoard,
  tapBurner,
} from '../src/core/kitchen';
import { INGREDIENTS, PANTRY_SHELVES } from '../src/core/recipes';
import { tick } from '../src/core/shift';
import { createShift, focusOrder, prepCustomer, withKit } from '../src/core/state';
import { cook, playing, prep } from './helpers';

const kit = (levels: Partial<Kit>): Kit => ({ ...STARTER_KIT, ...levels });

describe('kitchen stations', () => {
  it('accepts ingredients in any order and sends produce to the board', () => {
    let state = submitIngredient(playing(), 'chicken');
    state = submitIngredient(state, 'tomato');
    expect(submitIngredient(state, 'tomato')).toBe(state);
    expect(state.customers[0].picked).toEqual(['chicken', 'tomato']);
    expect(state.board).toEqual([{ ingredient: 'tomato', cutsLeft: 3 }]);
    expect(nextHint(state)).toBe('chop');
    state = chop(chop(chop(state)));
    expect(state.board).toEqual([]);
    expect(state.mistakes).toBe(0);
  });

  it('resets the combo and shortens patience after a wrong ingredient', () => {
    const started = playing();
    const state = submitIngredient(submitIngredient(started, 'rice'), 'sugar');
    expect(state.combo).toBe(0);
    expect(state.mistakes).toBe(1);
    expect(state.customers[0].remainingMs).toBe(started.customers[0].patienceMs * 0.75);
  });

  it('counts cooking an unprepared order as a mistake', () => {
    const state = submitIngredient(playing(), 'rice');
    expect(burnerAction(state, 0)).toBe('miss');
    const missed = tapBurner(state, 0);
    expect(missed.mistakes).toBe(1);
    expect(missed.burners).toEqual([null]);
  });

  it('cooks, then waits, then serves from the burner', () => {
    const cooking = cook(playing());
    expect(cooking.customers[0].cooking).toBe(true);
    expect(burnerAction(cooking, 0)).toBe('wait');
    expect(tapBurner(cooking, 0)).toEqual(cooking);
    const ready = tick(cooking, cookMs(cooking.kit));
    expect(nextHint(ready)).toBe('serve');
    expect(tapBurner(ready, 0).served).toBe(1);
  });

  it('bins burnt food and lets the same customer order again', () => {
    const cooking = cook(playing());
    const burnt = tick(cooking, cookMs(cooking.kit) + burnMs(cooking.kit));
    expect(burntOrders(cooking, burnt)).toEqual(['c1']);
    expect(burnt.customers[0]).toMatchObject({ id: 'c1', cooking: false, picked: [] });
    expect(burnt.mistakes).toBe(1);
    expect(burnt.abandoned).toBe(0);
    expect(burnt.combo).toBe(0);
    expect(burnt.burners).toEqual([null]);
    expect(prepCustomer(burnt)?.id).toBe('c1');
  });

  it('slices through the whole board on its own after a single tap', () => {
    let state = submitIngredient(submitIngredient(playing(), 'tomato'), 'pepper');
    expect(state.board).toHaveLength(2);
    state = tapBoard(state);
    expect(state.slicing).toBe(true);
    expect(state.cuts).toBe(1);
    // A long frame catches up on every cut it covers instead of making just one.
    expect(tick(state, 1_000).board).toEqual([]);
    for (let step = 0; step < 10 && state.board.length > 0; step += 1) state = tick(state, 160);
    expect(state.board).toEqual([]);
    expect(state.slicing).toBe(false);
    expect(state.cuts).toBe(6);
    expect(tapBoard(state)).toBe(state);
  });

  it('lets the player choose which order to work on', () => {
    let state = tick(playing(), 9_000);
    expect(prepCustomer(state)?.id).toBe('c1');
    state = focusOrder(state, 'c2');
    expect(prepCustomer(state)?.id).toBe('c2');
    const recipe = state.customers[1].recipeId;
    state = cook(state);
    expect(state.burners[0]?.recipeId).toBe(recipe);
    expect(prepCustomer(state)?.id).toBe('c1');
  });

  it('keeps the order in focus while the board has food on it', () => {
    let state = tick(playing(), 9_000);
    state = submitIngredient(state, 'tomato');
    expect(focusOrder(state, 'c2')).toBe(state);
  });

  it('preps the next customer while the first order cooks', () => {
    let state = cook(playing(1, kit({ burners: 1, fan: 1 })));
    state = tick(state, state.spawnInMs);
    expect(prepCustomer(state)?.id).toBe(state.customers[1].id);
    state = cook(state);
    expect(state.burners.every(Boolean)).toBe(true);
    expect(prepCustomer(state)).toBeNull();
  });

  it('applies the knife, pots, fan, cooler and helper chef upgrades', () => {
    const base = playing();
    const better = playing(1, kit({ knife: 2, pots: 2, fan: 2, cooler: 2, chef: 2 }));
    expect(better.customers[0].patienceMs).toBe(Math.round(base.customers[0].patienceMs * 1.3));
    expect(cookMs(better.kit)).toBeLessThan(cookMs(base.kit));
    expect(burnMs(better.kit)).toBeGreaterThan(burnMs(base.kit));
    const picked = submitIngredient(better, 'tomato');
    expect(picked.board[0].cutsLeft).toBe(1);
    expect(tick(picked, 600).board).toEqual([]);
    expect(prep(better).board).toEqual([]);
  });

  it('sizes the burners from the kit between shifts', () => {
    const menu = createShift({ seed: 1 });
    expect(withKit(menu, kit({ burners: 2 })).burners).toHaveLength(3);
    expect(withKit(playing(), kit({ burners: 2 })).burners).toHaveLength(1);
  });
});

describe('pantry', () => {
  it('puts every ingredient on exactly one shelf', () => {
    const shelved = PANTRY_SHELVES.flatMap((shelf) => shelf.items);
    expect([...shelved].sort()).toEqual(INGREDIENTS.map((item) => item.id).sort());
  });
});

describe('shop and earnings', () => {
  it('buys an upgrade only with enough cash and up to its last level', () => {
    expect(buyUpgrade({ cash: 500, kit: STARTER_KIT }, 'knife')).toBeNull();
    const once = buyUpgrade({ cash: 3_000, kit: STARTER_KIT }, 'knife');
    expect(once).toEqual({ cash: 2_200, kit: kit({ knife: 1 }) });
    const twice = once && buyUpgrade(once, 'knife');
    expect(twice).toEqual({ cash: 200, kit: kit({ knife: 2 }) });
    expect(buyUpgrade({ cash: 99_999, kit: kit({ knife: 2 }) }, 'knife')).toBeNull();
  });

  it('pays the score plus a combo tip', () => {
    expect(earnings(1_000, 4)).toBe(1_080);
  });

  it('reads saved progress safely', () => {
    expect(parseSave(null)).toEqual({ cash: 0, kit: STARTER_KIT });
    expect(parseSave({ cash: -5, kit: { burners: 9, knife: 1.5, pots: 1 } })).toEqual({
      cash: 0,
      kit: kit({ burners: 2, pots: 1 }),
    });
  });
});
