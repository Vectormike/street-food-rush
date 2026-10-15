import { createHmac } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ANKARA_COUNTER_PRODUCT_ID } from '../shared/products';
import type { ServerEnv } from '../server/env';
import { createApp } from '../server/http';
import { EntitlementStore } from '../server/store';

interface PurchaseState {
  playerId: string;
  purchasePlayerId: string;
  productId: string;
  status: 'paid' | 'delivered' | 'refunded' | 'pending';
  found: boolean;
  delivers: number;
}

const servers: Server[] = [];
const directories: string[] = [];

describe('purchase server', () => {
  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))),
    );
    await Promise.all(
      directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
    );
  });

  it('verifies, delivers and lists a cosmetic purchase once', async () => {
    const state = purchaseState();
    const { url, store } = await start(state);
    const first = await post(url, '/claim', { session: 'session-token', purchaseId: 'pur_1' });
    const second = await post(url, '/claim', { session: 'session-token', purchaseId: 'pur_1' });
    const owned = await post(url, '/entitlements', { session: 'session-token' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(state.delivers).toBe(1);
    expect(await owned.json()).toEqual({ products: [ANKARA_COUNTER_PRODUCT_ID] });
    expect(await store.productsFor('t_player')).toEqual([ANKARA_COUNTER_PRODUCT_ID]);
  });

  it('rejects a refund, the wrong player and a conflicting grant', async () => {
    const refunded = purchaseState({ status: 'refunded' });
    const refundServer = await start(refunded);
    expect(
      (await post(refundServer.url, '/claim', { session: 's', purchaseId: 'pur_1' })).status,
    ).toBe(409);

    const wrong = purchaseState({ purchasePlayerId: 't_other' });
    const wrongServer = await start(wrong);
    expect(
      (await post(wrongServer.url, '/claim', { session: 's', purchaseId: 'pur_1' })).status,
    ).toBe(403);

    const conflict = purchaseState();
    const conflictServer = await start(conflict);
    await conflictServer.store.grant('pur_1', 't_other', ANKARA_COUNTER_PRODUCT_ID);
    expect(
      (await post(conflictServer.url, '/claim', { session: 's', purchaseId: 'pur_1' })).status,
    ).toBe(409);
  });

  it('records a signed webhook without granting the product', async () => {
    const { url, store } = await start(purchaseState());
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'purchase.paid',
      data: { purchaseId: 'pur_1' },
    });
    const bad = await postRaw(url, '/vatar-webhook', body, 'sha256=deadbeef');
    const good = await postRaw(url, '/vatar-webhook', body, signature(body, 'whsec'));
    const repeat = await postRaw(url, '/vatar-webhook', body, signature(body, 'whsec'));
    expect(bad.status).toBe(401);
    expect(good.status).toBe(200);
    expect(repeat.status).toBe(200);
    expect(await store.productsFor('t_player')).toEqual([]);
  });

  it('deletes a player and refuses another origin', async () => {
    const { url } = await start(purchaseState());
    await post(url, '/claim', { session: 'session-token', purchaseId: 'pur_1' });
    const denied = await post(url, '/players/delete', { playerId: 't_player' });
    const removed = await post(
      url,
      '/players/delete',
      { playerId: 't_player' },
      { Authorization: 'Bearer test-secret' },
    );
    const blocked = await fetch(url + '/health', { headers: { Origin: 'https://evil.example' } });
    const owned = await post(url, '/entitlements', { session: 'session-token' });
    expect(denied.status).toBe(401);
    expect(removed.status).toBe(200);
    expect(blocked.status).toBe(403);
    expect(await owned.json()).toEqual({ products: [] });
  });
});

function purchaseState(overrides: Partial<PurchaseState> = {}): PurchaseState {
  return {
    playerId: 't_player',
    purchasePlayerId: 't_player',
    productId: ANKARA_COUNTER_PRODUCT_ID,
    status: 'paid',
    found: true,
    delivers: 0,
    ...overrides,
  };
}

async function start(state: PurchaseState) {
  const directory = await mkdtemp(join(tmpdir(), 'street-food-'));
  directories.push(directory);
  const env: ServerEnv = {
    secret: 'test-secret',
    webhookSecret: 'whsec',
    apiBase: 'https://vatar.test/api/games/v1',
    origins: ['http://127.0.0.1:5173'],
    port: 0,
    entitlementsPath: join(directory, 'entitlements.json'),
  };
  const store = new EntitlementStore(env.entitlementsPath);
  const server = createServer(createApp({ env, store, fetchImpl: fakeVatar(state) }));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${address.port}`, store };
}

function fakeVatar(state: PurchaseState): typeof fetch {
  return (async (input) => {
    const url = String(input);
    if (url.endsWith('/session/verify')) return json({ playerId: state.playerId, mode: 'test' });
    if (url.endsWith('/deliver')) {
      state.delivers += 1;
      state.status = 'delivered';
      return json({ id: 'pur_1', status: 'delivered' });
    }
    if (!state.found) return json({ error: 'not_found' }, 404);
    return json({
      id: 'pur_1',
      productId: state.productId,
      playerId: state.purchasePlayerId,
      status: state.status,
    });
  }) as typeof fetch;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function signature(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

function post(url: string, path: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(url + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function postRaw(url: string, path: string, body: string, signatureHeader: string) {
  return fetch(url + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Vatar-Signature': signatureHeader },
    body,
  });
}
