import { expect, test } from '@playwright/test';
import path from 'node:path';

const sandbox =
  process.env.VATAR_SANDBOX_URL ??
  'https://lagoslife.app/developers/sandbox/5235c4c07523460eb888';

test.describe('Vatar sandbox (requires Lagos Life login)', () => {
  test.use({ storageState: path.join(process.cwd(), 'e2e/.auth/lagoslife.json') });

  test('test purchase delivers ankara counter', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(sandbox);
    await page.getByRole('button', { name: 'Reload game' }).click();
    const frame = page.frameLocator('iframe');
    await expect(frame.getByTestId('purchase')).toBeVisible({ timeout: 30_000 });
    await expect(frame.getByTestId('mode-label')).not.toHaveText('Practice mode');
    await frame.getByTestId('purchase').click();
    await expect(frame.getByTestId('platform-notice')).toContainText(/unlocked|delivered|could not/i, {
      timeout: 60_000,
    });
  });
});
