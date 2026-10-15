export const SHIFT_DURATION_MS = 90_000;

export function formatTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatAccuracy(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value * 100)}%`;
}

export function shiftDurationFromSearch(search: string, production: boolean): number {
  if (production) return SHIFT_DURATION_MS;
  const raw = new URLSearchParams(search).get('duration');
  if (!raw || !/^\d+$/.test(raw)) return SHIFT_DURATION_MS;
  const seconds = Number(raw);
  if (seconds < 8 || seconds > 90) return SHIFT_DURATION_MS;
  return seconds * 1000;
}
