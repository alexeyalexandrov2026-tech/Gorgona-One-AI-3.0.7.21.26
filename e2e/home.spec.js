import { test, expect } from './fixtures';

test('the home page opens with its heading, sections and the concierge entry', async ({ page }) => {
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  const response = await page.goto('/');
  expect(response.status()).toBe(200);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('.ai-sphere')).toBeAttached();
  for (const href of ['/rentals', '/yachts', '/vacation-rentals', '/stores', '/events']) {
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeAttached();
  }
  expect(failures).toEqual([]);
});

test('a section link from the home page opens that section', async ({ page }) => {
  await page.goto('/');
  await page.locator('main a[href="/rentals"]').first().click();
  await expect(page).toHaveURL(/\/rentals$/);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('main a[href^="/rentals/"]').first()).toBeAttached();
});
