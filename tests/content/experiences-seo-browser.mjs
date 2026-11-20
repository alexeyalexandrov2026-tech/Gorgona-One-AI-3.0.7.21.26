import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';
import { HEADOUT_COLLECTIONS, headoutGalleryUrl } from '../../lib/headoutCatalog.mjs';
import { experienceSearchText } from '../../lib/seo.mjs';

const origin = 'http://127.0.0.1:3074';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3074'], {
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
  const context = await browser.newContext({ locale: 'en-US', reducedMotion: 'reduce' });
  await context.route(url => url.origin !== origin, route => route.abort());
  const page = await context.newPage();
  const userAgent = await page.evaluate(() => navigator.userAgent);

  for (const [agent, headOnly] of [[userAgent, false], ['Twitterbot/1.0', true]]) {
    const descriptions = new Set();
    for (const item of HEADOUT_COLLECTIONS) {
      const path = '/experiences/' + item.slug;
      const response = await context.request.get(origin + path, { headers: { 'user-agent': agent }, maxRedirects: 0 });
      assert.equal(response.status(), 200, path);
      const metadata = await page.evaluate(({ html, headOnly }) => {
        const source = new DOMParser().parseFromString(html, 'text/html');
        const root = headOnly ? source.head : source;
        return {
          titles: [...root.querySelectorAll('title')].map(tag => tag.textContent),
          descriptions: [...root.querySelectorAll('meta[name="description" i]')].map(tag => tag.getAttribute('content')),
          canonicals: [...root.querySelectorAll('link[rel~="canonical" i]')].map(tag => tag.getAttribute('href')),
          h1: [...source.querySelectorAll('h1')].map(tag => tag.textContent),
          robots: [...source.querySelectorAll('meta[name="robots" i]')].map(tag => tag.getAttribute('content'))
        };
      }, { html: await response.text(), headOnly });
      assert.deepEqual(metadata.titles, [experienceSearchText(item).title], path);
      assert.deepEqual(metadata.canonicals, ['https://gorgona-one.com' + path], path);
      assert.deepEqual(metadata.h1, [item.title], path);
      assert.equal(metadata.descriptions.length, 1, path);
      const [description] = metadata.descriptions;
      assert.ok(description.includes(item.title), path + ' needs a description of its own experience');
      assert.ok(description.includes('Headout') && description.length <= 160, path);
      assert.ok(!metadata.robots.some(value => value.includes('noindex')), path);
      descriptions.add(description);
    }
    assert.equal(descriptions.size, HEADOUT_COLLECTIONS.length, 'Experience pages must have distinct descriptions');
  }

  for (const slug of ['zoo-miami', 'universal-studios-orlando', 'grand-canyon-helicopter-tours', 'peppa-pig-theme-park-tickets']) {
    const item = HEADOUT_COLLECTIONS.find(entry => entry.slug === slug);
    await page.goto(origin + '/experiences/' + slug);
    await expect(page.locator('main h1')).toHaveText(item.title);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    assert.ok(description.includes(item.title), slug);
    await expect(page.locator('main header a[target="_blank"]')).toHaveAttribute('href', item.href);
    const gallery = headoutGalleryUrl(item);
    if (gallery) {
      await expect(page.locator('main iframe')).toHaveAttribute('src', gallery);
    } else {
      await expect(page.locator('main iframe')).toHaveCount(0);
      await expect(page.locator('main img')).toHaveAttribute('src', item.image);
    }
  }
  const missing = await context.request.get(origin + '/experiences/unknown-seo-check', { maxRedirects: 0 });
  assert.equal(missing.status(), 404, 'Unknown experience paths must remain 404');
  console.log('Verified all 48 experience descriptions for browser and HTML-limited crawler responses, titles, canonicals, headings, partner URLs and missing paths.');
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) {
    const stopped = once(server, 'exit');
    server.kill();
    await stopped;
  }
}
