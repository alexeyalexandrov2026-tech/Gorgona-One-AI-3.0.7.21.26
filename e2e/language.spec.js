import { test, expect, chooseLanguage } from './fixtures';

test('switching language translates the page and survives a reload', async ({ page }) => {
  await page.goto('/rentals');
  const heading = page.locator('main h1');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const english = await heading.textContent();

  await chooseLanguage(page, 'Русский', 'ru');
  await expect(heading).not.toHaveText(english);
  await expect(heading).toHaveText(/[а-яё]/i);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(heading).toHaveText(/[а-яё]/i);
});

test('a right-to-left language flips the page direction', async ({ page }) => {
  await page.goto('/');
  await chooseLanguage(page, 'العربية', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  // Nothing may stick out sideways once the layout is mirrored.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
