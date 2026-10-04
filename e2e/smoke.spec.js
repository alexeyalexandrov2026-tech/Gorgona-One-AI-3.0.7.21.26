import { existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// With a .env.local the dev server talks to the real Supabase project and
// mailer, so anything that would submit data is skipped.
const usesRealBackends = existsSync('.env.local');

const CORE_PAGES = [
  '/',
  '/yachts',
  '/rentals',
  '/rentals/lamborghini-urus-se',
  '/vacation-rentals',
  '/restaurants-nightlife',
  '/experiences',
  '/sportsbook',
  '/sportsbook/draftkings'
];

for (const path of CORE_PAGES) {
  test(`${path} renders`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
  });
}

test('pages send the baseline security headers', async ({ request }) => {
  const headers = (await request.get('/')).headers();
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
});

test('each page declares itself as canonical', async ({ page }) => {
  await page.goto('/yachts');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://gorgona-one.com/yachts');
});

test('sportsbook profiles show the responsible-gaming notice', async ({ page }) => {
  await page.goto('/sportsbook/draftkings');
  await expect(page.getByText('Call 1-800-GAMBLER').first()).toBeVisible();
});

test('the concierge answers every message, with or without an AI engine', async ({ page }) => {
  await page.goto('/discovery');
  // The same conversation can be on screen in more than one surface, so
  // compare growth: every new guest message must gain a reply alongside it.
  const questions = page.locator('[data-role="user"]:visible');
  const replies = page.locator('[data-role="assistant"]:visible');
  const questionsBefore = await questions.count();
  const repliesBefore = await replies.count();

  const input = page.locator('input[placeholder="Ask Gorgona One AI"]:visible').first();
  await input.fill('I need a yacht for ten people');
  await input.press('Enter');

  await expect(questions.last()).toHaveText('I need a yacht for ten people');
  await expect
    .poll(async () => {
      const asked = (await questions.count()) - questionsBefore;
      const answered = (await replies.count()) - repliesBefore;
      return asked > 0 && answered === asked;
    }, { timeout: 60_000 })
    .toBe(true);
  await expect(replies.last()).not.toBeEmpty();
});

test('a booking that cannot be delivered shows an error, not "Request Sent"', async ({ page }) => {
  test.skip(usesRealBackends, 'would submit a real booking');
  await page.goto('/rentals/lamborghini-urus-se');
  await page.getByPlaceholder('Name').fill('Ada Guest');
  await page.getByPlaceholder('Phone number').fill('+1 305 555 0100');
  await page.getByPlaceholder('Email').fill('ada@example.com');
  await page.getByPlaceholder(/Preferred dates/).fill('Oct 12 - Oct 15');
  await page.getByRole('button', { name: /submit reservation request/i }).click();
  await expect(page.getByText(/could not submit your request/i)).toBeVisible();
  await expect(page.getByText('Request Sent!')).toHaveCount(0);
});
