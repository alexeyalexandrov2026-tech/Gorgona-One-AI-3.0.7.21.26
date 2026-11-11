import { test, expect } from './fixtures';

const RECEIPT = { success: true, bookingId: '55555555-5555-4555-8555-555555555555', replayed: false };

async function fill(form) {
  await expect(form.locator('input[type="date"]').first()).not.toHaveValue('');
  await form.locator('input[autocomplete="name"]').fill('E2E Guest');
  await form.locator('input[type="tel"]').fill('+13055550123');
  await form.locator('input[type="email"]').fill('e2e-guest@example.com');
}

test('a car request reaches /api/book with the guest details and shows the confirmation', async ({ page }) => {
  const requests = [];
  await page.route('**/api/book', (route) => {
    requests.push({ body: route.request().postDataJSON(), key: route.request().headers()['idempotency-key'] });
    return route.fulfill({ json: RECEIPT });
  });
  await page.goto('/rentals/lamborghini-urus-se');
  const form = page.locator('main form');
  await fill(form);
  await form.locator('button[type="submit"]').click();

  await expect(page.locator('main [role="status"] .g1-stamp')).toBeVisible();
  await expect(form).toHaveCount(0);
  expect(requests).toHaveLength(1);
  expect(requests[0].body).toMatchObject({ name: 'E2E Guest', phone: '+13055550123', email: 'e2e-guest@example.com', itemSlug: 'lamborghini-urus-se', kind: 'car' });
  expect(requests[0].body.itemTitle).toBeTruthy();
  expect(requests[0].body.dates).toMatch(/^\d{4}-\d{2}-\d{2} → \d{4}-\d{2}-\d{2}/);
  expect(requests[0].key).toBeTruthy();
});

test('a failed request keeps what the guest typed and can be sent again', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/book', (route) => {
    attempts += 1;
    return attempts === 1 ? route.fulfill({ status: 429, json: { error: 'busy' } }) : route.fulfill({ json: RECEIPT });
  });
  await page.goto('/rentals/lamborghini-urus-se');
  const form = page.locator('main form');
  await fill(form);
  await form.locator('button[type="submit"]').click();

  await expect(form.locator('button[type="submit"]')).toBeEnabled();
  await expect(form.locator('input[autocomplete="name"]')).toHaveValue('E2E Guest');
  await expect(page.locator('main [role="status"] .g1-stamp')).toHaveCount(0);

  await form.locator('button[type="submit"]').click();
  await expect(page.locator('main [role="status"] .g1-stamp')).toBeVisible();
  expect(attempts).toBe(2);
});
