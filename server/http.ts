import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ANKARA_COUNTER_PRODUCT_ID } from '../shared/products.js';
import type { ServerEnv } from './env.js';
import { EntitlementStore } from './store.js';

const MAX_BODY = 16 * 1024;
const PURCHASE_ID = /^[a-zA-Z0-9_-]{1,80}$/;

export interface AppOptions {
  env: ServerEnv;
  store: EntitlementStore;
  fetchImpl?: typeof fetch;
}

interface SessionInfo {
  playerId: string;
}

interface PurchaseInfo {
  id: string;
  productId: string;
  playerId: string;
  status: string;
}

export function createApp(options: AppOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const requestId = randomUUID();
    response.setHeader('x-request-id', requestId);
    const origin = header(request, 'origin');
    if (origin && !options.env.origins.includes(origin)) {
      return send(response, 403, { error: 'origin' }, requestId, request);
    }
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      log(requestId, request, 204);
      return;
    }

    try {
      if (request.method === 'GET' && request.url === '/health') {
        return send(response, 200, { ok: true }, requestId, request);
      }
      if (request.method === 'POST' && request.url === '/claim') {
        return send(response, ...(await claim(request, options, fetchImpl)), requestId, request);
      }
      if (request.method === 'POST' && request.url === '/entitlements') {
        return send(
          response,
          ...(await entitlements(request, options, fetchImpl)),
          requestId,
          request,
        );
      }
      if (request.method === 'POST' && request.url === '/vatar-webhook') {
        return send(response, ...(await webhook(request, options)), requestId, request);
      }
      if (request.method === 'POST' && request.url === '/players/delete') {
        return send(response, ...(await deletePlayer(request, options)), requestId, request);
      }
      return send(response, 404, { error: 'not_found' }, requestId, request);
    } catch {
      return send(response, 400, { error: 'bad_request' }, requestId, request);
    }
  };
}

async function claim(
  request: IncomingMessage,
  options: AppOptions,
  fetchImpl: typeof fetch,
): Promise<[number, unknown]> {
  if (!options.env.secret) return [503, { error: 'unconfigured' }];
  const body = await readJson(request);
  const session = text(body, 'session');
  const purchaseId = text(body, 'purchaseId');
  if (!session || !purchaseId || !PURCHASE_ID.test(purchaseId))
    return [400, { error: 'bad_request' }];

  const player = await verifySession(options, fetchImpl, session);
  if (!player) return [401, { error: 'invalid_token' }];
  const purchase = await getPurchase(options, fetchImpl, purchaseId);
  if (!purchase) return [404, { error: 'not_found' }];
  if (purchase.status === 'refunded') return [409, { error: 'refunded' }];
  if (purchase.status !== 'paid' && purchase.status !== 'delivered')
    return [409, { error: 'not_paid' }];
  if (purchase.playerId !== player.playerId) return [403, { error: 'wrong_player' }];
  if (purchase.productId !== ANKARA_COUNTER_PRODUCT_ID) return [403, { error: 'wrong_product' }];

  const existing = await options.store.lookup(purchaseId);
  if (
    existing &&
    (existing.playerId !== player.playerId || existing.productId !== purchase.productId)
  ) {
    return [409, { error: 'conflict' }];
  }
  if (!existing) {
    const granted = await options.store.grant(purchaseId, player.playerId, purchase.productId);
    if (granted === 'conflict') return [409, { error: 'conflict' }];
  }
  if (purchase.status === 'paid') {
    const delivered = await deliverPurchase(options, fetchImpl, purchase.id);
    if (!delivered) return [502, { error: 'delivery_failed' }];
  }
  return [200, { productId: purchase.productId }];
}

async function entitlements(
  request: IncomingMessage,
  options: AppOptions,
  fetchImpl: typeof fetch,
): Promise<[number, unknown]> {
  if (!options.env.secret) return [503, { error: 'unconfigured' }];
  const body = await readJson(request);
  const session = text(body, 'session');
  if (!session) return [400, { error: 'bad_request' }];
  const player = await verifySession(options, fetchImpl, session);
  if (!player) return [401, { error: 'invalid_token' }];
  return [200, { products: await options.store.productsFor(player.playerId) }];
}

async function webhook(request: IncomingMessage, options: AppOptions): Promise<[number, unknown]> {
  if (!options.env.webhookSecret) return [503, { error: 'unconfigured' }];
  const raw = await readRaw(request);
  if (!validSignature(raw, header(request, 'x-vatar-signature'), options.env.webhookSecret)) {
    return [401, { error: 'bad_signature' }];
  }
  const event = JSON.parse(raw.toString('utf8')) as { id?: unknown };
  if (typeof event.id === 'string' && event.id) await options.store.rememberEvent(event.id);
  return [200, { ok: true }];
}

async function deletePlayer(
  request: IncomingMessage,
  options: AppOptions,
): Promise<[number, unknown]> {
  if (!options.env.secret) return [503, { error: 'unconfigured' }];
  const authorization = header(request, 'authorization');
  if (authorization !== `Bearer ${options.env.secret}`) return [401, { error: 'bad_secret' }];
  const body = await readJson(request);
  const playerId = text(body, 'playerId');
  if (!playerId || !PURCHASE_ID.test(playerId)) return [400, { error: 'bad_request' }];
  await options.store.deletePlayer(playerId);
  return [200, { deleted: true }];
}

async function verifySession(
  options: AppOptions,
  fetchImpl: typeof fetch,
  session: string,
): Promise<SessionInfo | null> {
  const result = await vatar(options, fetchImpl, '/session/verify', { session });
  if (!result || typeof result.playerId !== 'string') return null;
  return { playerId: result.playerId };
}

async function getPurchase(
  options: AppOptions,
  fetchImpl: typeof fetch,
  purchaseId: string,
): Promise<PurchaseInfo | null> {
  const result = await vatar(options, fetchImpl, `/purchases/${encodeURIComponent(purchaseId)}`);
  if (!result) return null;
  if (
    typeof result.id !== 'string' ||
    typeof result.productId !== 'string' ||
    typeof result.playerId !== 'string' ||
    typeof result.status !== 'string'
  ) {
    return null;
  }
  return {
    id: result.id,
    productId: result.productId,
    playerId: result.playerId,
    status: result.status,
  };
}

async function deliverPurchase(
  options: AppOptions,
  fetchImpl: typeof fetch,
  purchaseId: string,
): Promise<boolean> {
  const result = await vatar(
    options,
    fetchImpl,
    `/purchases/${encodeURIComponent(purchaseId)}/deliver`,
    {},
  );
  return result?.status === 'delivered';
}

async function vatar(
  options: AppOptions,
  fetchImpl: typeof fetch,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetchImpl(`${options.env.apiBase}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${options.env.secret}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function validSignature(raw: Buffer, signature: string | undefined, secret: string): boolean {
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`);
  const received = Buffer.from(signature ?? '');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function send(
  response: ServerResponse,
  status: number,
  body: unknown,
  requestId: string,
  request: IncomingMessage,
): void {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
  log(requestId, request, status);
}

function log(requestId: string, request: IncomingMessage, status: number): void {
  const path = request.url?.split('?')[0] ?? '';
  console.info(JSON.stringify({ requestId, method: request.method, path, status }));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readRaw(request);
  const parsed = JSON.parse(raw.toString('utf8')) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('bad_request');
  return parsed as Record<string, unknown>;
}

function readRaw(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('too_large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function header(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function text(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
