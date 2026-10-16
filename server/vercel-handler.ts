import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv } from './env.js';
import { createApp } from './http.js';
import { EntitlementStore } from './store.js';

const env = loadEnv(process.env);
const entitlementsPath =
  process.env.ENTITLEMENTS_PATH?.trim() || '/tmp/street-food-rush-entitlements.json';
const app = createApp({ env, store: new EntitlementStore(entitlementsPath) });

export default function handler(request: IncomingMessage, response: ServerResponse): void {
  void app(request, response);
}
