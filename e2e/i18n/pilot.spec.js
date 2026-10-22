import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const snapshots = JSON.parse(fs.readFileSync('i18n/pilot/snapshots.json', 'utf8'));
const source = snapshots.en;
const headingHash = Object.keys(source).find((hash) => source[hash] === 'Explore Marketplace');
const placeholderHash = Object.keys(source).find((hash) => source[hash] === 'Search deals, stores, restaurants, and more');
const locales = ['en', 'ru', 'es', 'he', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'];
const nativeNames = ['English (US)', 'Русский', 'Español', 'עברית', '中文', 'Português', 'Українська', '日本語', '한국어', 'Deutsch', 'العربية', 'Türkçe', 'فارسی', 'Italiano', 'Français', 'Polski'];

async function selectLocale(page, index) {
  await page.locator('button[aria-haspopup="listbox"]').click();
  await page.getByRole('option').filter({ hasText: nativeNames[index] }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locales[index]);
  await expect(page.locator('html')).toHaveAttribute('dir', ['he', 'ar', 'fa'].includes(locales[index]) ? 'rtl' : 'ltr');
}

async function prepareSuppliers(page) {
  const requests = { frames: 0, gt: 0, documents: 0 };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || (message.type() === 'warning' && /translation|hydration|gt-next/i.test(message.text()))) {
      errors.push(message.text());
    }
  });
  page.on('request', (request) => {
    if (/gtx\.dev/.test(request.url())) requests.gt++;
    if (request.isNavigationRequest()) {
      if (request.frame() === page.mainFrame()) requests.documents++;
      else requests.frames++;
    }
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'yatr.co' || url.hostname === 'www.stay22.com') {
      // Isolated provider fixture. The real iframe URLs and host components
      // remain intact; these inputs measure document/state preservation only.
      await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><label>Selected dates<input aria-label="Selected dates"></label></body></html>' });
    } else if (url.hostname === '127.0.0.1') {
      await route.continue();
    } else {
      await route.fulfill({ status: 204, body: '' });
    }
  });
  return { requests, errors };
}

async function rememberFrames(page) {
  const result = [];
  const frames = await page.locator('iframe[id]').all();
  for (const locator of frames) {
    await locator.scrollIntoViewIfNeeded();
    const id = await locator.getAttribute('id');
    const handle = await locator.elementHandle();
    const attributes = await handle.evaluate((element) => Object.fromEntries(
      element.getAttributeNames().filter((name) => name !== 'title').map((name) => [name, element.getAttribute(name)])));
    const input = page.frameLocator(`#${id}`).getByLabel('Selected dates');
    await input.fill('2026-12-12 / 2026-12-15');
    result.push({ id, handle, attributes, input });
  }
  await page.getByRole('banner').scrollIntoViewIfNeeded();
  return result;
}

async function expectFramesPreserved(frames) {
  for (const { handle, id, attributes, input } of frames) {
    expect(await handle.evaluate((element, frameId) => element.isConnected && element === document.getElementById(frameId), id)).toBe(true);
    expect(await handle.evaluate((element) => Object.fromEntries(
      element.getAttributeNames().filter((name) => name !== 'title').map((name) => [name, element.getAttribute(name)])))).toEqual(attributes);
    await expect(input).toHaveValue('2026-12-12 / 2026-12-15');
  }
}

test('all 16 pilot locales preserve form, supplier documents and referral parameters', async ({ page, context }, testInfo) => {
  const { requests, errors } = await prepareSuppliers(page);
  await page.goto('/i18n-pilot');
  await expect(page).toHaveTitle('Miami Elio — localization qualification');
  await expect(page.locator('h1')).toHaveText('Explore Marketplace');
  await expect(page.locator('nextjs-portal')).toHaveCount(0);
  await page.locator('#pilot-query').fill('Miami, December 12');
  await page.locator('main button[type="submit"]').click();
  await expect(page.getByRole('status')).toBeVisible();
  const frames = await rememberFrames(page);
  expect(frames.map(({ id }) => id)).toEqual(['yatr-catalogue', 'stay22-map', 'stay22-list']);
  const frameRequests = requests.frames;
  for (let i = 1; i < locales.length; i++) {
    await selectLocale(page, i);
    await expect(page.locator('h1')).toHaveText(snapshots[locales[i]][headingHash]);
    await expect(page.locator('#pilot-query')).toHaveAttribute('placeholder', snapshots[locales[i]][placeholderHash]);
    await expect(page.locator('#pilot-query')).toHaveValue('Miami, December 12');
    await expect(page.getByRole('status')).toBeVisible();
    await expectFramesPreserved(frames);
  }
  await selectLocale(page, 1);
  await expect(page.locator('h1')).toHaveText(snapshots.ru[headingHash]);
  expect(requests).toEqual({ frames: frameRequests, gt: 0, documents: 1 });
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => window.localStorage.getItem('gorgona-locale'))).toBe('ru');
  const cookie = (await context.cookies()).find(({ name }) => name === 'gorgona-locale');
  expect(cookie.value).toBe('ru');
  expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 300 * 86400);
  await expect(page.locator('html')).not.toHaveAttribute('data-nextjs-dialog-overlay', 'true');
  await page.locator('h1').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('pilot-ru.png'), fullPage: false });
});

for (const route of ['/yachts', '/vacation-rentals']) {
  test(`${route} keeps existing supplier state while switching all languages`, async ({ page }) => {
    const { requests, errors } = await prepareSuppliers(page);
    await page.goto(route);
    const frames = await rememberFrames(page);
    expect(frames.length).toBe(route === '/yachts' ? 1 : 2);
    const frameRequests = requests.frames;
    for (let i = 1; i < locales.length; i++) {
      await selectLocale(page, i);
      await expectFramesPreserved(frames);
    }
    expect(requests).toEqual({ frames: frameRequests, gt: 0, documents: 1 });
    expect(errors).toEqual([]);
  });
}
