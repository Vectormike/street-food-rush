import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const root = process.cwd();
const authFile = path.join(root, 'e2e/.auth/lagoslife.json');

test.use({
  storageState: existsSync(authFile) ? authFile : undefined,
});

test('upload icon and screenshots to Vatar listing', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('https://lagoslife.app/developers/dashboard');
  const signIn = page.getByRole('link', { name: /Sign in to Lagos Life/i });
  if (await signIn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await signIn.click();
    await page.getByRole('button', { name: 'Accept' }).click({ timeout: 5_000 }).catch(() => {});
    await page.getByRole('button', { name: 'Continue' }).click({ timeout: 120_000 });
    await page.goto('https://lagoslife.app/developers/dashboard');
  }
  await page.getByRole('tab', { name: 'Listing' }).click({ timeout: 120_000 });

  const icon = path.join(root, 'review/icon-512.png');
  const shots = ['01-home.png', '02-shop.png', '03-tutorial.png', '04-kitchen.png', '05-pause.png'].map(
    (name) => path.join(root, 'review/screenshots', name),
  );

  const inputs = page.locator('input[type="file"]');
  await expect(inputs.first()).toBeVisible({ timeout: 30_000 });

  await inputs.nth(0).setInputFiles(icon);
  for (let i = 0; i < shots.length; i++) {
    await inputs.nth(i + 1).setInputFiles(shots[i]!);
  }

  await page.getByRole('button', { name: 'Save listing' }).click();
  await expect(page.getByRole('button', { name: 'Submit for review' })).toBeEnabled({ timeout: 60_000 });
});
