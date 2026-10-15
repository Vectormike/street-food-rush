import type { Hint } from '../core/kitchen';
import { ingredientById, PANTRY_SHELVES, recipeById, type IngredientId } from '../core/recipes';
import { prepCustomer, type ShiftState } from '../core/state';
import { ingredientArt } from './art';
import { setFlag } from './dom';

export function pantryMarkup(): string {
  const tabs = PANTRY_SHELVES.map(
    (shelf, index) =>
      `<button type="button" role="tab" data-action="shelf" data-shelf="${index}" data-testid="shelf-${index}" aria-selected="${index === 0}">${shelf.tab}<b class="tab-count"></b></button>`,
  ).join('');
  return `
    <div class="pantry" data-open="0">
      <div class="shelf-tabs" role="tablist" aria-label="Pantry shelves">${tabs}</div>
      ${PANTRY_SHELVES.map(shelf).join('')}
    </div>
  `;
}

export function openShelf(root: HTMLElement, index: number): void {
  const pantry = root.querySelector<HTMLElement>('.pantry');
  if (!pantry || pantry.dataset.open === String(index)) return;
  pantry.dataset.open = String(index);
  pantry.querySelectorAll<HTMLElement>('[data-shelf]').forEach((element) => {
    const open = element.dataset.shelf === String(index);
    if (element.matches('[role="tab"]')) element.setAttribute('aria-selected', String(open));
    else setFlag(element, 'open', open);
  });
}

export function updatePantry(
  root: HTMLElement,
  state: ShiftState,
  active: boolean,
  hint: Hint | null,
): void {
  const pantry = root.querySelector<HTMLElement>('.pantry');
  if (!pantry) return;
  const customer = prepCustomer(state);
  const missing = customer
    ? recipeById(customer.recipeId).ingredients.filter((id) => !customer.picked.includes(id))
    : [];
  // After each pick (or a new order), jump to the next shelf that still has something
  // the order needs, so the cook never hunts through tabs mid-rush. Advancing only on
  // progress leaves deliberate browsing alone.
  const progress = `${customer?.id ?? ''}:${customer?.picked.length ?? 0}`;
  if (pantry.dataset.progress !== progress) {
    pantry.dataset.progress = progress;
    const open = PANTRY_SHELVES[Number(pantry.dataset.open)];
    const stillHere = open !== undefined && missing.some((id) => open.items.includes(id));
    const [wanted] = missing;
    const next = wanted ? PANTRY_SHELVES.findIndex((shelf) => shelf.items.includes(wanted)) : -1;
    if (!stillHere && next !== -1) openShelf(root, next);
  }
  pantry.querySelectorAll<HTMLElement>('[role="tab"]').forEach((tab, index) => {
    const items = PANTRY_SHELVES[index].items;
    const count = missing.filter((id) => items.includes(id)).length;
    const badge = tab.querySelector('.tab-count');
    if (badge && badge.textContent !== (count ? String(count) : '')) {
      badge.textContent = count ? String(count) : '';
    }
    const closed = pantry.dataset.open !== String(index);
    setFlag(tab, 'next', closed && items.some((id) => id === hint));
  });
  pantry.querySelectorAll<HTMLButtonElement>('.tile').forEach((tile) => {
    const id = tile.dataset.ingredient as IngredientId;
    tile.disabled = !active || !customer;
    setFlag(tile, 'next', id === hint);
    setFlag(tile, 'picked', customer?.picked.includes(id) ?? false);
    tile.setAttribute('aria-pressed', tile.dataset.picked ?? 'false');
  });
}

function shelf({ label, items }: (typeof PANTRY_SHELVES)[number], index: number): string {
  return `<div class="shelf" role="group" aria-label="${label}" data-shelf="${index}" data-open="${index === 0}"><span class="shelf-label">${label}</span>${items.map(tile).join('')}</div>`;
}

function tile(id: IngredientId): string {
  return `<button class="tile" type="button" data-ingredient="${id}" data-testid="ingredient-${id}">${ingredientArt(id, 'tile-art')}<span class="tile-label">${ingredientById(id).label}</span></button>`;
}
