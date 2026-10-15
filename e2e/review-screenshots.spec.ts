import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const out = join(process.cwd(), 'review', 'screenshots');

test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});

test('captures store review screenshots', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-shift')).toBeVisible();
  await page.screenshot({ path: join(out, '01-home.png'), fullPage: false });

  await page.getByTestId('open-shop').click();
  await expect(page.getByTestId('shop')).toBeVisible();
  await page.screenshot({ path: join(out, '02-shop.png'), fullPage: false });
  await page.getByTestId('close-shop').click();

  await page.getByTestId('start-shift').click();
  await expect(page.getByTestId('coach')).toBeVisible();
  await page.screenshot({ path: join(out, '03-tutorial.png'), fullPage: false });
  await page.getByTestId('dismiss-tutorial').click();

  const tickets = page.locator('[data-action="focus"]');
  await expect(tickets.first()).toBeVisible({ timeout: 12_000 });
  await page.screenshot({ path: join(out, '04-kitchen.png'), fullPage: false });

  await page.getByTestId('pause').click();
  await expect(page.getByTestId('resume')).toBeVisible();
  await page.screenshot({ path: join(out, '05-pause.png'), fullPage: false });
});
