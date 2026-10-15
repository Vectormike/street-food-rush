const MAX_COMBO_STEPS = 5;

export function comboMultiplier(comboAfterSuccess: number): number {
  const bonusSteps = Math.max(0, Math.min(comboAfterSuccess, MAX_COMBO_STEPS + 1) - 1);
  return 1 + bonusSteps * 0.2;
}

export function orderScore(
  basePoints: number,
  remainingMs: number,
  patienceMs: number,
  comboAfterSuccess: number,
): number {
  const ratio = patienceMs <= 0 ? 0 : Math.min(1, Math.max(0, remainingMs / patienceMs));
  const speedBonus = Math.round(basePoints * 0.5 * ratio);
  return Math.max(0, Math.round((basePoints + speedBonus) * comboMultiplier(comboAfterSuccess)));
}
