import { ANKARA_COUNTER_PRODUCT_ID } from '../../shared/products';
import { errorCode, noticeFor } from './notices';
import type {
  Platform,
  PlatformLeaderboard,
  PlatformPlayer,
  PurchaseResult,
  ScoreSubmission,
} from './types';

const SDK_URL = 'https://lagoslife.app/sdk/vatar-games-v1.js';

export interface VatarSdk {
  init(): Promise<{
    player: { id: string; name: string; avatar: string | null };
    session: string;
    mode: 'live' | 'test';
  }>;
  session(): Promise<{ session: string; exp: number }>;
  submitScore(score: number): Promise<{ best: number; accepted: boolean }>;
  leaderboard(): Promise<{
    top: { rank: number; name: string; score: number }[];
    me: { rank: number | null; label: string; score: number } | null;
  }>;
  purchases(): Promise<{ purchaseId: string; productId: string }[]>;
  purchase(productId: string): Promise<{ purchaseId: string; productId: string }>;
  onPause(listener: () => void): void;
  onResume(listener: () => void): void;
}

declare global {
  interface Window {
    Vatar?: VatarSdk;
  }
}

export class VatarPlatform implements Platform {
  readonly kind = 'vatar' as const;
  private sdk: VatarSdk | null = null;
  private player: PlatformPlayer | null = null;

  constructor(private loadSdk: () => Promise<VatarSdk> = loadHostedSdk) {}

  async init(): Promise<PlatformPlayer> {
    this.sdk = await withTimeout(this.loadSdk(), 10_000, 'timeout');
    const result = await withTimeout(this.sdk.init(), 10_000, 'timeout');
    this.player = {
      name: result.player.name,
      avatarUrl: safeAvatar(result.player.avatar),
      mode: result.mode,
    };
    return this.player;
  }

  async submitScore(score: number): Promise<ScoreSubmission> {
    try {
      const result = await this.requiredSdk().submitScore(normalizeScore(score));
      return { accepted: result.accepted, best: result.best, notice: null };
    } catch (error) {
      return { accepted: false, best: null, notice: noticeFor(errorCode(error)) };
    }
  }

  async leaderboard(): Promise<PlatformLeaderboard | null> {
    try {
      const result = await this.requiredSdk().leaderboard();
      return {
        top: result.top.map((entry) => ({
          rank: entry.rank,
          name: entry.name,
          score: entry.score,
        })),
        me: result.me ? { label: result.me.label, score: result.me.score } : null,
      };
    } catch {
      return null;
    }
  }

  onPause(listener: () => void): () => void {
    this.sdk?.onPause(listener);
    return () => undefined;
  }

  onResume(listener: () => void): () => void {
    this.sdk?.onResume(listener);
    return () => undefined;
  }

  async session(): Promise<string | null> {
    try {
      const result = await this.requiredSdk().session();
      return result.session;
    } catch {
      return null;
    }
  }

  async purchase(productId: string): Promise<PurchaseResult | null> {
    try {
      const result = await this.requiredSdk().purchase(productId);
      return { ...result, notice: null };
    } catch (error) {
      return { purchaseId: '', productId, notice: noticeFor(errorCode(error)) };
    }
  }

  async syncProducts(serverUrl: string): Promise<string[]> {
    const sdk = this.requiredSdk();
    const pending = await sdk.purchases();
    for (const purchase of pending) {
      if (purchase.productId !== ANKARA_COUNTER_PRODUCT_ID) continue;
      const session = await sdk.session();
      const claim = await postJson(`${serverUrl}/claim`, {
        session: session.session,
        purchaseId: purchase.purchaseId,
      });
      if (!claim.ok) return [];
    }
    const session = await sdk.session();
    const response = await postJson(`${serverUrl}/entitlements`, { session: session.session });
    if (!response.ok) return [];
    const body = (await response.json()) as { products?: unknown };
    return Array.isArray(body.products)
      ? body.products.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private requiredSdk(): VatarSdk {
    if (!this.sdk) throw Object.assign(new Error('SDK is not ready'), { code: 'sdk_unavailable' });
    return this.sdk;
  }
}

export function loadHostedSdk(): Promise<VatarSdk> {
  if (typeof window === 'undefined') {
    return Promise.reject(Object.assign(new Error('SDK unavailable'), { code: 'not_framed' }));
  }
  if (window.Vatar) return Promise.resolve(window.Vatar);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Vatar) resolve(window.Vatar);
      else reject(Object.assign(new Error('SDK missing'), { code: 'sdk_unavailable' }));
    };
    script.onerror = () =>
      reject(Object.assign(new Error('SDK failed'), { code: 'sdk_unavailable' }));
    document.head.appendChild(script);
  });
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function safeAvatar(value: string | null): string | null {
  return value?.startsWith('data:image/') ? value : null;
}

function normalizeScore(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.round(score);
}

function withTimeout<T>(promise: Promise<T>, ms: number, code: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error(code), { code })), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
