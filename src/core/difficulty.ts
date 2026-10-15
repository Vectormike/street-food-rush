export interface Difficulty {
  patienceMs: number;
  gapMs: number;
}

export function difficultyAt(elapsedMs: number, durationMs: number): Difficulty {
  const progress = durationMs <= 0 ? 1 : Math.min(1, Math.max(0, elapsedMs / durationMs));
  return {
    patienceMs: Math.round(38_000 - progress * 12_000),
    gapMs: Math.round(9_000 - progress * 4_000),
  };
}
