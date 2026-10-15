import { LocalPlatform } from './local';
import { errorCode, noticeFor } from './notices';
import { browserBestStore, type BestStore, type Platform, type PlatformPlayer } from './types';
import { VatarPlatform, type VatarSdk } from './vatar';

export interface PlatformStartup {
  platform: Platform;
  player: PlatformPlayer;
  notice: string | null;
  personalBest: number | null;
}

export async function createPlatform(options?: {
  framed?: boolean;
  loadSdk?: () => Promise<VatarSdk>;
  bests?: BestStore;
}): Promise<PlatformStartup> {
  const bests = options?.bests ?? browserBestStore();
  const local = new LocalPlatform(bests);
  if (!(options?.framed ?? defaultFramed())) {
    return {
      platform: local,
      player: await local.init(),
      notice: null,
      personalBest: bests.read(),
    };
  }

  try {
    const platform = new VatarPlatform(options?.loadSdk);
    const player = await platform.init();
    return { platform, player, notice: null, personalBest: null };
  } catch (error) {
    return {
      platform: local,
      player: await local.init(),
      notice: noticeFor(errorCode(error)),
      personalBest: bests.read(),
    };
  }
}

function defaultFramed(): boolean {
  if (typeof window === 'undefined') return false;
  const requested = new URLSearchParams(window.location.search).get('platform') === 'vatar';
  return requested || window.parent !== window;
}
