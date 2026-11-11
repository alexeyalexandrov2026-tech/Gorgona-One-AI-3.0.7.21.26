import { test, expect } from './fixtures';

const REPLY = 'We have three convertibles free this weekend.';

test('a message to the concierge is sent once and its reply is shown', async ({ page }) => {
  const calls = [];
  await page.route('**/api/chat', (route) => {
    calls.push(route.request().postDataJSON());
    return route.fulfill({ json: { reply: REPLY, sessionId: 'e2e-session', cards: [], suggestions: [] } });
  });
  await page.goto('/discovery');
  const form = page.locator('main form').last();
  const input = form.locator('input');
  await input.fill('Do you have a convertible for Saturday?');
  await form.locator('button[type="submit"]').click();

  await expect(page.locator('main')).toContainText('Do you have a convertible for Saturday?');
  await expect(page.locator('main')).toContainText(REPLY);
  await expect(input).toHaveValue('');
  expect(calls).toHaveLength(1);
  expect(JSON.stringify(calls[0])).toContain('Do you have a convertible for Saturday?');
});

test('the conversation continues with its history', async ({ page }) => {
  const calls = [];
  await page.route('**/api/chat', (route) => {
    calls.push(route.request().postDataJSON());
    return route.fulfill({ json: { reply: `Answer ${calls.length}`, sessionId: 'e2e-session', cards: [], suggestions: [] } });
  });
  await page.goto('/discovery');
  const form = page.locator('main form').last();
  const input = form.locator('input');
  await input.fill('First question');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('main')).toContainText('Answer 1');
  await input.fill('Second question');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('main')).toContainText('Answer 2');

  expect(calls).toHaveLength(2);
  const second = JSON.stringify(calls[1]);
  expect(second).toContain('First question');
  expect(second).toContain('Second question');
});

test('a failed concierge request keeps the message and leaves the form usable', async ({ page }) => {
  await page.route('**/api/chat', (route) => route.fulfill({ status: 500, json: { error: 'down' } }));
  await page.goto('/discovery');
  const form = page.locator('main form').last();
  const input = form.locator('input');
  await input.fill('Hello');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('main')).toContainText('Hello');
  // The form recovers for another try instead of staying locked.
  await expect(input).toBeEnabled();
});
