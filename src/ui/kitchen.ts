import { MAX_BURNERS, priceOf } from '../core/kit';
import { burnerStatus, burnerTimer, isPrepped, nextHint } from '../core/kitchen';
import { ingredientById, recipeById, type IngredientId } from '../core/recipes';
import { prepCustomer, type ShiftState } from '../core/state';
import { ingredientArt, mealArt } from './art';
import { setFlag } from './dom';

const LABELS = { empty: 'Cook', cooking: 'Cooking', ready: 'Serve!', burning: 'Hurry!' };
const STATUS_ICONS = { prep: '🔪', cooking: '🔥', ready: '✅', burning: '⚠️' };

export function kitchenMarkup(state: ShiftState): string {
  const owned = state.burners.map((_, index) => burnerSlot(index)).join('');
  const price = priceOf(state.kit, 'burners');
  const locked = Array.from({ length: MAX_BURNERS - state.burners.length }, (_, index) =>
    index === 0 && price !== null
      ? `<div class="burner locked" aria-hidden="true">🔒<small>₦${price.toLocaleString()}</small></div>`
      : '',
  ).join('');
  return `
    <div class="kitchen" data-ready="false">
      <button class="prep" type="button" data-action="chop" data-testid="chop" aria-label="Chopping board">
        <span class="board"><span class="board-item"></span><span class="cuts"></span><i class="knife" aria-hidden="true"></i></span>
        <span class="bowl" aria-hidden="true"><span class="bowl-food"></span><span class="bowl-ready">Ready to cook</span></span>
      </button>
      <div class="stove"><div class="burners">${owned}${locked}</div></div>
    </div>
  `;
}

export function isChopped(id: IngredientId): boolean {
  return ingredientById(id).chop === true;
}

export function updateKitchen(root: HTMLElement, state: ShiftState, active: boolean): void {
  const hint = state.phase === 'tutorial' ? nextHint(state) : null;
  const customer = prepCustomer(state);
  const kitchen = root.querySelector<HTMLElement>('.kitchen');
  if (kitchen) setFlag(kitchen, 'ready', Boolean(customer && isPrepped(state, customer)));
  const prep = root.querySelector<HTMLButtonElement>('.prep');
  if (prep) {
    prep.disabled = !active || state.board.length === 0;
    setFlag(prep, 'slicing', state.slicing);
    setFlag(prep, 'next', hint === 'chop' && !state.slicing);
    const signature = JSON.stringify([customer?.id, customer?.picked, state.board]);
    if (prep.dataset.signature !== signature) {
      prep.dataset.signature = signature;
      renderPrep(prep, state);
    }
  }
  const firstEmpty = state.burners.indexOf(null);
  root.querySelectorAll<HTMLButtonElement>('button.burner').forEach((button, index) => {
    const burner = state.burners[index] ?? null;
    const status = burner ? burnerStatus(state, burner) : 'empty';
    button.disabled = !active;
    if (button.dataset.state !== status) button.dataset.state = status;
    button.style.setProperty('--progress', (burner ? burnerTimer(state, burner) : 0).toFixed(3));
    setFlag(
      button,
      'next',
      hint === 'serve'
        ? status !== 'empty' && status !== 'cooking'
        : hint === 'cook' && index === firstEmpty,
    );
    const recipe = burner?.recipeId ?? '';
    const food = button.querySelector<HTMLElement>('.burner-food');
    if (food && food.dataset.recipe !== recipe) {
      food.dataset.recipe = recipe;
      food.innerHTML = burner ? mealArt(burner.recipeId, 'burner-art') : '';
    }
    const label = button.querySelector('.burner-label');
    if (label && label.textContent !== LABELS[status]) label.textContent = LABELS[status];
  });
}

export function queueMarkup(state: ShiftState): string {
  return state.customers
    .map((customer) => {
      const burner = state.burners.find((item) => item?.customerId === customer.id);
      const status = burner ? burnerStatus(state, burner) : customer.cooking ? 'cooking' : 'prep';
      const current = prepCustomer(state)?.id === customer.id;
      const name = recipeById(customer.recipeId).name;
      return `<li><button type="button" data-action="focus" data-customer="${customer.id}" data-testid="order-${customer.id}" data-status="${status}" data-current="${current}" aria-label="${name}" aria-pressed="${current}"><span class="queue-icon" aria-hidden="true">${STATUS_ICONS[status]}</span>${mealArt(customer.recipeId, 'queue-art')}<span class="queue-patience"><span data-patience="${customer.id}"></span></span></button></li>`;
    })
    .join('');
}

export function queueSignature(state: ShiftState): string {
  return state.customers
    .map((customer) => {
      const burner = state.burners.find((item) => item?.customerId === customer.id);
      return `${customer.id}:${burner ? burnerStatus(state, burner) : customer.cooking}`;
    })
    .join('|');
}

function renderPrep(prep: HTMLElement, state: ShiftState): void {
  const [head] = state.board;
  const item = prep.querySelector('.board-item');
  if (item) item.innerHTML = head ? ingredientArt(head.ingredient, 'board-art') : '';
  const cuts = prep.querySelector('.cuts');
  if (cuts) cuts.innerHTML = head ? '<i></i>'.repeat(head.cutsLeft) : '';
  const picked = prepCustomer(state)?.picked ?? [];
  const ready = picked.filter((id) => !state.board.some((entry) => entry.ingredient === id));
  const bowl = prep.querySelector('.bowl-food');
  if (bowl) bowl.innerHTML = ready.map((id) => ingredientArt(id, 'bowl-art')).join('');
  setFlag(prep, 'busy', Boolean(head));
}

function burnerSlot(index: number): string {
  return `<button class="burner" type="button" data-action="burner" data-burner="${index}" data-testid="burner-${index}" data-state="empty" aria-label="Burner ${index + 1}">
    <span class="burner-ring" aria-hidden="true"><span class="flames"></span><span class="burner-pot"><span class="burner-food"></span></span></span>
    <span class="burner-label">Cook</span>
  </button>`;
}
