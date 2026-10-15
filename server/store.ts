import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface Grant {
  playerId: string;
  productId: string;
  grantedAt: string;
}

interface StoreFile {
  grants: Record<string, Grant>;
  events: string[];
}

const EMPTY: StoreFile = { grants: {}, events: [] };
const MAX_EVENTS = 500;

export class EntitlementStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  lookup(purchaseId: string): Promise<Grant | null> {
    return this.update((data) => data.grants[purchaseId] ?? null);
  }

  grant(
    purchaseId: string,
    playerId: string,
    productId: string,
  ): Promise<'created' | 'exists' | 'conflict'> {
    return this.update((data) => {
      const existing = data.grants[purchaseId];
      if (existing) {
        return existing.playerId === playerId && existing.productId === productId
          ? 'exists'
          : 'conflict';
      }
      data.grants[purchaseId] = { playerId, productId, grantedAt: this.now() };
      return 'created';
    });
  }

  productsFor(playerId: string): Promise<string[]> {
    return this.update((data) => {
      const products = new Set<string>();
      for (const grant of Object.values(data.grants)) {
        if (grant.playerId === playerId) products.add(grant.productId);
      }
      return [...products];
    });
  }

  deletePlayer(playerId: string): Promise<number> {
    return this.update((data) => {
      let removed = 0;
      for (const [purchaseId, grant] of Object.entries(data.grants)) {
        if (grant.playerId !== playerId) continue;
        delete data.grants[purchaseId];
        removed += 1;
      }
      return removed;
    });
  }

  rememberEvent(eventId: string): Promise<boolean> {
    return this.update((data) => {
      if (data.events.includes(eventId)) return false;
      data.events.push(eventId);
      if (data.events.length > MAX_EVENTS) data.events.splice(0, data.events.length - MAX_EVENTS);
      return true;
    });
  }

  private update<T>(change: (data: StoreFile) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      const result = change(data);
      await this.write(data);
      return result;
    });
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async read(): Promise<StoreFile> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<StoreFile>;
      return {
        grants: parsed.grants ?? {},
        events: Array.isArray(parsed.events) ? parsed.events : [],
      };
    } catch (error) {
      if (isMissing(error)) return structuredClone(EMPTY);
      throw error;
    }
  }

  private async write(data: StoreFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(data));
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
