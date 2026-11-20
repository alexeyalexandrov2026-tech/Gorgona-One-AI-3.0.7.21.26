import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

const port = 3068;
const origin = `http://127.0.0.1:${port}`;
const yachtsUrl = origin + '/yachts';
const expected = {
  title: ['Miami Yacht Charters & Luxury Boat Rentals | Miami Elio'],
  description: ['Charter luxury yachts in Miami with captain and crew. Compare fleet options, hourly rates, and VIP packages with instant concierge support on Miami Elio.'],
  canonical: ['https://gorgona-one.com/yachts']
};

function readMetadata(page, html, headOnly = false) {
  return page.evaluate(({ html, headOnly }) => {
    const documentToCheck = html === undefined
      ? document
      : new DOMParser().parseFromString(html, 'text/html');
    const root = headOnly ? documentToCheck.head : documentToCheck;
    return {
      title: [...root.querySelectorAll('title')].map(tag => tag.textContent),
      description: [...root.querySelectorAll('meta[name="description" i]')].map(tag => tag.getAttribute('content')),
      canonical: [...root.querySelectorAll('link[rel~="canonical" i]')].map(tag => tag.getAttribute('href'))
    };
  }, { html, headOnly });
}

async function expectRenderedMetadata(page) {
  await expect(page).toHaveTitle(expected.title[0]);
  await expect.poll(() => readMetadata(page)).toEqual(expected);
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  // Metadata belongs to this app. The live YATR catalogue is checked separately.
  await context.route(url => url.origin !== origin, route => route.abort());
  const page = await context.newPage();
  const browserUserAgent = await page.evaluate(() => navigator.userAgent);
  for (const userAgent of [browserUserAgent, 'Twitterbot/1.0']) {
    const response = await context.request.get(yachtsUrl, {
      headers: { 'user-agent': userAgent },
      maxRedirects: 0
    });
    assert.equal(response.status(), 200, 'Yachts must respond without a redirect');
    const html = await response.text();
    assert.deepEqual(await readMetadata(page, html), expected, 'Metadata in the server response');
    if (userAgent === 'Twitterbot/1.0') {
      assert.deepEqual(await readMetadata(page, html, true), expected, 'Metadata in the HTML-only response head');
    }
  }

  await page.goto(yachtsUrl);
  await expect(page).toHaveURL(yachtsUrl);
  await expectRenderedMetadata(page);

  await page.goto(origin);
  const navigationStart = await page.evaluate(() => performance.timeOrigin);
  await page.locator('header nav a[href="/yachts"]:visible').click();
  await expect(page).toHaveURL(yachtsUrl);
  assert.equal(await page.evaluate(() => performance.timeOrigin), navigationStart, 'The header link must use client navigation');
  await expectRenderedMetadata(page);
  console.log('Verified /yachts metadata in server HTML, on page load, and after client navigation.');
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) {
    const closed = once(server, 'exit');
    server.kill();
    await closed;
  }
}
