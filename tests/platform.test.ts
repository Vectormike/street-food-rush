import { describe, expect, it } from 'vitest';
import { createPlatform } from '../src/platform/create';
import { LocalPlatform } from '../src/platform/local';
import { memoryBestStore } from '../src/platform/types';
import type { VatarSdk } from '../src/platform/vatar';

function sdk(overrides: Partial<VatarSdk> = {}): VatarSdk {
  return {
    init: async () => ({
      player: { id: 't_1', name: 'Ada', avatar: 'data:image/png;base64,abc' },
      session: 'session-token',
      mode: 'test',
    }),
    session: async () => ({ session: 'session-token', exp: 1 }),
    submitScore: async () => ({ best: 10, accepted: true }),
    leaderboard: async () => ({ top: [], me: null }),
    purchases: async () => [],
    purchase: async (productId) => ({ purchaseId: 'pur_1', productId }),
    onPause: () => undefined,
    onResume: () => undefined,
    ...overrides,
  };
}

describe('platform adapters', () => {
  it('keeps a local personal best', async () => {
    const bests = memoryBestStore();
    const platform = new LocalPlatform(bests);
    await platform.submitScore(10);
    await platform.submitScore(4);
    expect(bests.read()).toBe(10);
    expect(platform.kind).toBe('local');
  });

  it('stays local when the game is not framed', async () => {
    const startup = await createPlatform({ framed: false, bests: memoryBestStore() });
    expect(startup.platform.kind).toBe('local');
    expect(startup.player.mode).toBe('local');
    expect(startup.notice).toBeNull();
  });

  it('falls back to practice mode when Lagos Life refuses the frame', async () => {
    const startup = await createPlatform({
      framed: true,
      bests: memoryBestStore(8),
      loadSdk: async () => {
        throw Object.assign(new Error('outside'), { code: 'not_framed' });
      },
    });
    expect(startup.platform.kind).toBe('local');
    expect(startup.personalBest).toBe(8);
    expect(startup.notice).toContain('Open Street Food Rush inside Lagos Life');
  });

  it('uses the hosted adapter after a successful init', async () => {
    const startup = await createPlatform({
      framed: true,
      bests: memoryBestStore(),
      loadSdk: async () =>
        sdk({
          init: async () => ({
            player: { id: 't_1', name: 'Ada', avatar: 'https://example.invalid/a.png' },
            session: 'session-token',
            mode: 'test',
          }),
        }),
    });
    expect(startup.platform.kind).toBe('vatar');
    expect(startup.player).toEqual({ name: 'Ada', avatarUrl: null, mode: 'test' });
    expect(startup.personalBest).toBeNull();
  });
});
