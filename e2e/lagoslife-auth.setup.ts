import { test as setup } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(process.cwd(), 'e2e/.auth/lagoslife.json');

setup('sign in to Lagos Life developers', async ({ page }) => {
  await page.goto('https://lagoslife.app/developers/dashboard');
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 120_000 });
  await page.context().storageState({ path: authFile });
});
