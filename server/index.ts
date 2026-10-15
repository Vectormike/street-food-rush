import { createServer } from 'node:http';
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadEnv } from './env';
import { createApp } from './http';
import { EntitlementStore } from './store';

loadLocalEnv();
const env = loadEnv(process.env);
const server = createServer(createApp({ env, store: new EntitlementStore(env.entitlementsPath) }));

if (isMain()) {
  server.listen(env.port, () => {
    console.info(JSON.stringify({ status: 'listening', port: env.port }));
  });
}

function loadLocalEnv(): void {
  let text = '';
  try {
    text = readFileSync('.env', 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = trimmed.slice(separator + 1).trim();
  }
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}
