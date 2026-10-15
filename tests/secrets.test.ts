import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const forbidden = ['VATAR_SECRET', 'VATAR_WEBHOOK', 'vtr_live_', 'vtr_test_', 'vtr_whsec_'];

describe('client bundle', () => {
  it('does not contain server secrets', async () => {
    const paths = [...(await files('src')), 'index.html'];
    const source = (await Promise.all(paths.map((path) => readFile(path, 'utf8')))).join('\n');
    for (const secret of forbidden) expect(source).not.toContain(secret);
  });
});

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? files(path) : [path];
    }),
  );
  return paths.flat();
}
