import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

const port = 3073;
const origin = `http://127.0.0.1:${port}`;
const expectedMetadata = {
  title: ['Miami Elio | Miami Travel & AI Concierge'],
  description: ['Explore yacht charters, villa stays, car rentals, events and experiences in Miami. Plan your trip with the Miami Elio AI concierge.'],
  canonical: ['https://gorgona-one.com']
};

function readMetadata(page, html, headOnly = false) {
  return page.evaluate(({ html, headOnly }) => {
    const source = html === undefined ? document : new DOMParser().parseFromString(html, 'text/html');
    const root = headOnly ? source.head : source;
    return {
      title: [...root.querySelectorAll('title')].map(tag => tag.textContent),
      description: [...root.querySelectorAll('meta[name="description" i]')].map(tag => tag.getAttribute('content')),
      canonical: [...root.querySelectorAll('link[rel~="canonical" i]')].map(tag => tag.getAttribute('href'))
    };
  }, { html, headOnly });
}

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: 'inherit',
  windowsHide: true
});
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) break;
    const response = await fetch(origin + '/robots.txt', { signal: AbortSignal.timeout(1200) }).catch(() => null);
    if (response?.ok) {
      ready = true;
      break;
    }
    await setTimeout(250);
  }
  assert.ok(ready, 'Next.js production server did not start');

  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }, locale: 'en-US', reducedMotion: 'reduce'
  });
  // The SEO assertions run in CI without requests to partner services.
  await context.route(url => url.origin !== origin, route => route.abort());
  const page = await context.newPage();
  const normalUserAgent = await page.evaluate(() => navigator.userAgent);
  for (const [userAgent, headOnly] of [[normalUserAgent, false], ['Twitterbot/1.0', true]]) {
    const response = await context.request.get(origin + '/', {
      headers: { 'user-agent': userAgent }, maxRedirects: 0
    });
    assert.equal(response.status(), 200);
    const html = await response.text();
    const h1Count = await page.evaluate(markup => new DOMParser().parseFromString(markup, 'text/html').querySelectorAll('h1').length, html);
    assert.equal(h1Count, 1, 'The homepage must send one native H1');
    assert.deepEqual(await readMetadata(page, html, headOnly), expectedMetadata);
  }

  await page.goto(origin + '/');
  await expect(page).toHaveTitle(expectedMetadata.title[0]);
  await expect.poll(() => readMetadata(page)).toEqual(expectedMetadata);
  await expect(page.locator('#g1-hero-q')).toBeEnabled();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Save on the everyday. Splurge on the extraordinary.');
  await expect(page.locator('.g1-stage__bg')).toHaveAttribute('alt', '');
  await expect(page.getByRole('img', { name: 'Downtown Miami and Biscayne Bay from the air' })).toHaveCount(1);
  await expect(page.locator('img:not([alt])')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Save on the everyday. Splurge on the extraordinary.');
  // Match the data attribute supplied by the Android WebView.
  await page.evaluate(() => { document.documentElement.dataset.app = 'android'; });
  await expect(page.locator('h1')).toHaveCount(1);
  const androidHeading = page.getByRole('heading', { level: 1 });
  await expect(androidHeading).toHaveCount(1);
  await expect(androidHeading.getByRole('link', { name: /Miami Elio AI Concierge/ })).toHaveAttribute('href', 'miamielio://concierge');
  console.log('Verified homepage metadata, accessible headings in web and Android modes, and image ALT.');
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) {
    const stopped = once(server, 'exit');
    server.kill();
    await stopped;
  }
}
