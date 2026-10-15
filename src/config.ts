import { shiftDurationFromSearch } from './core/time';

export function readServerUrl(): string | null {
  const value = import.meta.env.VITE_SERVER_URL?.trim();
  return value ? value.replace(/\/$/, '') : null;
}

export function readDuration(): number {
  return shiftDurationFromSearch(window.location.search, import.meta.env.PROD);
}
