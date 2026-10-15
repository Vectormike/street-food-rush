import type {
  BestStore,
  Platform,
  PlatformLeaderboard,
  PlatformPlayer,
  PurchaseResult,
  ScoreSubmission,
} from './types';

type Listener = () => void;

export class LocalPlatform implements Platform {
  readonly kind = 'local' as const;
  private pauseListeners = new Set<Listener>();
  private resumeListeners = new Set<Listener>();

  constructor(private bests: BestStore) {}

  async init(): Promise<PlatformPlayer> {
    return { name: 'Practice player', avatarUrl: null, mode: 'local' };
  }

  async submitScore(score: number): Promise<ScoreSubmission> {
    const safeScore = normalizeScore(score);
    return { accepted: true, best: this.bests.write(safeScore), notice: null };
  }

  async leaderboard(): Promise<PlatformLeaderboard | null> {
    return null;
  }

  onPause(listener: Listener): () => void {
    return subscribe(this.pauseListeners, listener);
  }

  onResume(listener: Listener): () => void {
    return subscribe(this.resumeListeners, listener);
  }

  async session(): Promise<string | null> {
    return null;
  }

  async purchase(_productId: string): Promise<PurchaseResult | null> {
    return null;
  }

  async syncProducts(_serverUrl: string): Promise<string[]> {
    return [];
  }

  currentBest(): number | null {
    return this.bests.read();
  }
}

function subscribe(listeners: Set<Listener>, listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function normalizeScore(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.round(score);
}
