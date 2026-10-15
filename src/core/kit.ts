export type UpgradeId = 'burners' | 'knife' | 'pots' | 'fan' | 'cooler' | 'chef';
export type Kit = Record<UpgradeId, number>;

export interface Upgrade {
  id: UpgradeId;
  name: string;
  icon: string;
  effect: string;
  prices: number[];
}

export interface KitchenSave {
  cash: number;
  kit: Kit;
}

export const UPGRADES: Upgrade[] = [
  {
    id: 'burners',
    name: 'Extra burner',
    icon: '🔥',
    effect: 'Cook more orders at once',
    prices: [2_500, 6_000],
  },
  {
    id: 'knife',
    name: 'Sharp knife',
    icon: '🔪',
    effect: 'Fewer cuts on the board',
    prices: [800, 2_000],
  },
  {
    id: 'pots',
    name: 'Heavy pots',
    icon: '🍲',
    effect: 'Food cooks faster',
    prices: [1_000, 2_500],
  },
  {
    id: 'fan',
    name: 'Hand fan',
    icon: '💨',
    effect: 'Food takes longer to burn',
    prices: [600, 1_500],
  },
  {
    id: 'cooler',
    name: 'Cold drinks cooler',
    icon: '🧊',
    effect: 'Customers wait longer',
    prices: [900, 2_200],
  },
  {
    id: 'chef',
    name: 'Helper chef',
    icon: '👨🏾‍🍳',
    effect: 'Chops on the board for you',
    prices: [3_000, 7_000],
  },
];

export const STARTER_KIT: Kit = { burners: 0, knife: 0, pots: 0, fan: 0, cooler: 0, chef: 0 };
export const MAX_BURNERS = 1 + upgradeById('burners').prices.length;

const COOK_MS = [4_000, 3_200, 2_500];
const BURN_MS = [5_000, 7_000, 9_000];
const PATIENCE = [1, 1.15, 1.3];
const CHEF_MS = [0, 1_200, 600];
const COMBO_TIP = 20;

export function burnerCount(kit: Kit): number {
  return 1 + kit.burners;
}

export function cutsPerItem(kit: Kit): number {
  return 3 - kit.knife;
}

export function cookMs(kit: Kit): number {
  return COOK_MS[kit.pots];
}

export function burnMs(kit: Kit): number {
  return BURN_MS[kit.fan];
}

export function patienceScale(kit: Kit): number {
  return PATIENCE[kit.cooler];
}

export function chefEveryMs(kit: Kit): number {
  return CHEF_MS[kit.chef];
}

export function upgradeById(id: UpgradeId): Upgrade {
  const upgrade = UPGRADES.find((item) => item.id === id);
  if (!upgrade) throw new Error(`Unknown upgrade: ${id}`);
  return upgrade;
}

export function priceOf(kit: Kit, id: UpgradeId): number | null {
  return upgradeById(id).prices[kit[id]] ?? null;
}

export function buyUpgrade(save: KitchenSave, id: UpgradeId): KitchenSave | null {
  const price = priceOf(save.kit, id);
  if (price === null || price > save.cash) return null;
  return { cash: save.cash - price, kit: { ...save.kit, [id]: save.kit[id] + 1 } };
}

export function earnings(score: number, bestCombo: number): number {
  return score + bestCombo * COMBO_TIP;
}

export function parseSave(raw: unknown): KitchenSave {
  const fallback = { cash: 0, kit: STARTER_KIT };
  if (!raw || typeof raw !== 'object') return fallback;
  const { cash, kit } = raw as { cash?: unknown; kit?: Record<string, unknown> };
  const levels = { ...STARTER_KIT };
  for (const upgrade of UPGRADES) {
    const level = kit?.[upgrade.id];
    if (Number.isInteger(level) && (level as number) >= 0) {
      levels[upgrade.id] = Math.min(level as number, upgrade.prices.length);
    }
  }
  return {
    cash: Number.isInteger(cash) && (cash as number) >= 0 ? (cash as number) : 0,
    kit: levels,
  };
}
