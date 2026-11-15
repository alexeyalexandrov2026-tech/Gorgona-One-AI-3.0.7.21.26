import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('button > .ai-sphere')).toBeAttached();
});

const sections = [
  ['Travel', '/travel'],
  ['Stays', '/vacation-rentals'],
  ['Yachts', '/yachts'],
  ['Cars', '/rentals'],
  ['Events', '/events'],
];

test('homepage cards navigate to each section', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const [name, path] of sections) {
    await page.goto('/');
    const link = page.locator('.g1-home-sections').getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute('href', path);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 15_000 });
    await expect(page.locator('main').first()).toBeVisible();
  }
});

test('Android Explore shows the native concierge link and the same navigation', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.app = 'android'; });
  });
  await page.goto('/');

  await expect(page.locator('.g1-home-web-hero')).toBeHidden();
  const concierge = page.getByRole('link', { name: /Miami Elio AI Concierge/ });
  await expect(concierge).toBeVisible();
  await expect(concierge).toHaveAttribute('href', 'miamielio://concierge');
  const rail = page.locator('.g1-home-sections');
  await expect(rail.getByRole('link')).toHaveCount(sections.length);
  await expect(page.locator('.g1-home-sections__pause')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);

  const events = rail.getByRole('link', { name: 'Events', exact: true });
  await events.click();
  await expect(page).toHaveURL(/\/events$/, { timeout: 15_000 });
  await expect(page.locator('main').first()).toBeVisible();
});

test('the section rail advances and can be paused', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const rail = page.locator('.g1-home-sections__track');
  const pause = page.locator('.g1-home-sections__pause');
  await expect(pause).toBeVisible();
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft), { timeout: 8000 }).toBeGreaterThan(50);
  await pause.click();
  await expect(pause).toHaveAccessibleName('Play');
  await rail.getByRole('link', { name: 'Travel' }).focus();
  await expect(rail.getByRole('link', { name: 'Travel' })).toBeFocused();
});
