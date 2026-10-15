import { priceOf, UPGRADES, type Kit, type Upgrade } from '../core/kit';

export function naira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function cashChip(cash: number): string {
  return `<p class="cash-chip" data-testid="cash"><span aria-hidden="true">💰</span>${naira(cash)}</p>`;
}

export function shopButton(kit: Kit, cash: number): string {
  const affordable = UPGRADES.filter((upgrade) => (priceOf(kit, upgrade.id) ?? Infinity) <= cash);
  const badge = affordable.length
    ? `<span class="shop-badge" data-testid="shop-badge">${affordable.length} you can buy</span>`
    : '';
  return `<button class="secondary shop-button" type="button" data-action="shop" data-testid="open-shop">🛒 Kitchen shop${badge}</button>`;
}

export function shopCard(kit: Kit, cash: number): string {
  return `
    <section class="card shop" aria-labelledby="shop-title" data-testid="shop">
      <p class="eyebrow">Upgrade your buka</p>
      <h2 id="shop-title">Kitchen shop</h2>
      ${cashChip(cash)}
      <ul class="upgrades">${UPGRADES.map((upgrade) => item(upgrade, kit, cash)).join('')}</ul>
      <button class="primary" type="button" data-action="close-shop" data-testid="close-shop">Back</button>
    </section>
  `;
}

function item(upgrade: Upgrade, kit: Kit, cash: number): string {
  const level = kit[upgrade.id];
  const price = priceOf(kit, upgrade.id);
  const pips = upgrade.prices.map((_, index) => `<i data-on="${index < level}"></i>`).join('');
  const action =
    price === null
      ? '<span class="maxed">Maxed</span>'
      : `<button type="button" data-action="buy" data-upgrade="${upgrade.id}" data-testid="buy-${upgrade.id}" ${price > cash ? 'disabled' : ''}>${naira(price)}</button>`;
  return `
    <li>
      <span class="upgrade-icon" aria-hidden="true">${upgrade.icon}</span>
      <div><h3>${upgrade.name}</h3><p>${upgrade.effect}</p><span class="pips" aria-label="Level ${level} of ${upgrade.prices.length}">${pips}</span></div>
      ${action}
    </li>
  `;
}
