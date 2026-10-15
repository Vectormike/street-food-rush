export type PlatformKind = 'local' | 'vatar';
export type PlatformMode = 'local' | 'test' | 'live';

export interface PlatformPlayer {
  name: string;
  avatarUrl: string | null;
  mode: PlatformMode;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
}

export interface PlatformLeaderboard {
  top: LeaderboardEntry[];
  me: { label: string; score: number } | null;
}

export interface ScoreSubmission {
  accepted: boolean;
  best: number | null;
  notice: string | null;
}

export interface PurchaseResult {
  purchaseId: string;
  productId: string;
  notice: string | null;
}

export interface Platform {
  readonly kind: PlatformKind;
  init(): Promise<PlatformPlayer>;
  submitScore(score: number): Promise<ScoreSubmission>;
  leaderboard(): Promise<PlatformLeaderboard | null>;
  onPause(listener: () => void): () => void;
  onResume(listener: () => void): () => void;
  session(): Promise<string | null>;
  purchase(productId: string): Promise<PurchaseResult | null>;
  syncProducts(serverUrl: string): Promise<string[]>;
}

export interface BestStore {
  read(): number | null;
  write(score: number): number;
}

export function memoryBestStore(initial: number | null = null): BestStore {
  let best = initial;
  return {
    read: () => best,
    write(score: number) {
      best = Math.max(best ?? 0, score);
      return best;
    },
  };
}

export function browserBestStore(): BestStore {
  const key = 'street-food-rush-local-best';
  return {
    read() {
      try {
        const raw = localStorage.getItem(key);
        return raw && /^\d+$/.test(raw) ? Number(raw) : null;
      } catch {
        return null;
      }
    },
    write(score: number) {
      const best = Math.max(this.read() ?? 0, score);
      try {
        localStorage.setItem(key, String(best));
      } catch {
        // Practice scores stay in memory when storage is unavailable.
      }
      return best;
    },
  };
}
