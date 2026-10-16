import { test as setup } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(process.cwd(), 'e2e/.auth/lagoslife.json');

setup('sign in to Lagos Life developers', async ({ page }) => {
  setup.setTimeout(180_000);
  await page.goto('https://lagoslife.app/developers/dashboard');
  const signIn = page.getByRole('link', { name: /Sign in to Lagos Life/i });
  if (await signIn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await signIn.click();
    await page.getByRole('button', { name: 'Accept' }).click({ timeout: 5_000 }).catch(() => {});
    await page.getByRole('button', { name: 'Continue' }).click({ timeout: 120_000 });
  }
  await page.goto('https://lagoslife.app/developers/dashboard');
  await page.getByRole('tab', { name: 'Listing' }).waitFor({ timeout: 120_000 });
  await page.context().storageState({ path: authFile });
});
