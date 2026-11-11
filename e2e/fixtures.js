import { test as base, expect } from '@playwright/test';

// Every scenario stays on the site itself: stock photos, supplier widgets,
// fonts and the database are blocked, so a run never depends on another
// company's server and never sends anything out.
export const test = base.extend({
  page: async ({ page, baseURL }, runTest) => {
    const own = new URL(baseURL).host;
    await page.route((url) => url.host !== own, (route) => route.abort());
    await runTest(page);
  }
});

export { expect };

// Opens the language menu and picks a language by the name shown in the menu.
export async function chooseLanguage(page, nativeLabel, code) {
  const button = page.locator('header button[aria-haspopup="listbox"]');
  // A click before the page is interactive is lost, so open only when closed and retry.
  await expect(async () => {
    if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 800 });
  }).toPass({ timeout: 20_000 });
  await page.getByRole('option').filter({ has: page.getByText(nativeLabel, { exact: true }) }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', code, { timeout: 15_000 });
}
