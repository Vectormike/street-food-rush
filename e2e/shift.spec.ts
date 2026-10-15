import { expect, test } from '@playwright/test';

test('plays, pauses and retries a short shift', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const record = { count: 0 };
    (window as unknown as { __audioStarts: { count: number } }).__audioStarts = record;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor() {
        super();
        record.count += 1;
      }
    };
  });

  await page.goto('/?duration=20');
  await expect(page.getByTestId('mode-label')).toHaveText('Practice mode');
  await expect(page.getByTestId('start-shift')).toBeVisible();
  expect(await audioStarts(page)).toBe(0);
  expect(await fits(page)).toBe(true);

  await page.getByTestId('start-shift').click();
  const coach = page.getByTestId('coach');
  await expect(coach).toBeVisible();
  await expect(page.getByTestId('recipe-name')).toHaveText('Jollof rice & chicken');
  await pick(page, 'sugar');
  await expect(coach).toHaveAttribute('data-missed', 'true');
  const mute = page.getByTestId('mute');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await mute.click();
  for (let step = 0; step < 40 && (await coach.isVisible()); step += 1) {
    const next = page.locator('[data-next="true"]:visible');
    if (await next.count()) await next.first().click();
    else await page.waitForTimeout(250);
  }
  await expect(coach).toBeHidden();
  await expect(page.getByTestId('score')).toHaveText('0');
  await expect(page.locator('[data-next="true"]')).toHaveCount(0);

  await page.getByTestId('burner-0').click();
  await expect(page.getByTestId('combo')).toHaveText('0');
  const needed = await page
    .getByTestId('steps')
    .locator('li')
    .evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.ingredient));
  for (const id of needed.reverse()) await pick(page, id ?? '');
  await expect(page.locator('.tile[data-picked="true"]')).toHaveCount(needed.length);
  const board = page.getByTestId('chop');
  if (await board.isEnabled()) await board.click();
  await expect(board).toBeDisabled({ timeout: 5_000 });
  const burner = page.getByTestId('burner-0');
  await burner.click();
  await expect(burner).toHaveAttribute('data-state', 'ready', { timeout: 6_000 });
  await burner.click();
  await expect(page.getByTestId('score')).not.toHaveText('0');
  expect(await audioStarts(page)).toBeGreaterThan(0);

  await page.getByTestId('pause').click();
  const timer = await page.getByTestId('timer').textContent();
  await page.waitForTimeout(700);
  await expect(page.getByTestId('timer')).toHaveText(timer ?? '');
  await page.getByTestId('resume').click();

  await expect(page.getByTestId('results')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('orders-served')).not.toHaveText('0');
  await expect(page.getByTestId('earned')).toContainText('earned');
  await page.getByTestId('retry').click();
  await expect(page.getByTestId('recipe-name')).toHaveText('Jollof rice & chicken');
  await expect(page.getByTestId('timer')).toHaveText(/0:(19|20)/);
  expect(await fits(page)).toBe(true);
});

test('spends saved money on an extra burner', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('street-food-rush-kitchen', JSON.stringify({ cash: 3_000, kit: {} }));
  });
  await page.goto('/?duration=12');
  await expect(page.getByTestId('cash')).toContainText('3,000');
  await page.getByTestId('open-shop').click();
  await page.getByTestId('buy-burners').click();
  await expect(page.getByTestId('cash')).toContainText('500');
  await expect(page.getByTestId('buy-knife')).toBeDisabled();
  await page.getByTestId('close-shop').click();
  await page.getByTestId('start-shift').click();
  await expect(page.getByTestId('burner-1')).toBeVisible();
});

test('lets the cook switch to another order ticket', async ({ page }) => {
  await page.goto('/?duration=60');
  await page.getByTestId('start-shift').click();
  await page.getByTestId('dismiss-tutorial').click();
  const tickets = page.locator('[data-action="focus"]');
  await expect(tickets).toHaveCount(2, { timeout: 12_000 });
  await tickets.nth(1).click();
  await expect(tickets.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(tickets.nth(0)).toHaveAttribute('aria-pressed', 'false');
});

async function pick(page: import('@playwright/test').Page, id: string): Promise<void> {
  const tile = page.getByTestId(`ingredient-${id}`);
  if (!(await tile.isVisible())) {
    const shelf = await tile.evaluate(
      (element) => element.closest<HTMLElement>('.shelf')?.dataset.shelf,
    );
    await page.getByTestId(`shelf-${shelf}`).click();
  }
  await tile.click();
}

async function audioStarts(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __audioStarts: { count: number } }).__audioStarts.count,
  );
}

async function fits(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
}
