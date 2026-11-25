import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import manifest from '../../app/manifest.js';
import { getNavExtraCopy } from '../../lib/navExtraCopy.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const LOCALES = ['en', 'ru', 'es', 'he', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'];

test('PWA manifest uses Miami Elio ocean theme color (#01212c) and exposes shortcuts', () => {
  const m = manifest();
  assert.equal(m.background_color, '#01212c');
  assert.equal(m.theme_color, '#01212c');
  assert.ok(Array.isArray(m.shortcuts) && m.shortcuts.length >= 4);
  const urls = m.shortcuts.map((s) => s.url);
  assert.ok(urls.includes('/discovery'));
  assert.ok(urls.includes('/rentals'));
  assert.ok(urls.includes('/travel'));
  assert.ok(urls.includes('/trip'));
});

test('ServiceWorkerRegister is mounted in RootLayout and guards against native app WebViews', () => {
  const swReg = fs.readFileSync(path.join(ROOT, 'app', 'components', 'ServiceWorkerRegister.jsx'), 'utf8');
  assert.ok(swReg.includes("register('/sw.js'"));
  assert.ok(swReg.includes('isMiamiElioApp'));
  const layout = fs.readFileSync(path.join(ROOT, 'app', 'layout.js'), 'utf8');
  assert.ok(layout.includes('<ServiceWorkerRegister />'));
});

test('GetTheApp renders Google Play badge on all web browsers while globals.css hides data-app-link inside native iOS/Android apps', () => {
  const getTheApp = fs.readFileSync(path.join(ROOT, 'app', 'components', 'GetTheApp.jsx'), 'utf8');
  assert.ok(getTheApp.includes('data-app-link'));
  assert.equal(getTheApp.includes('hideOnIos'), false);
  const globalsCss = fs.readFileSync(path.join(ROOT, 'app', 'globals.css'), 'utf8');
  assert.ok(globalsCss.includes('html[data-app="ios"] body::before'));
  assert.ok(globalsCss.includes('html[data-app="ios"] [data-app-link]'));
});

test('Header and Footer expose Dining (/restaurants-nightlife) and Live Trip Room (/trip) with 16-language copy', () => {
  for (const locale of LOCALES) {
    const copy = getNavExtraCopy(locale);
    assert.ok(copy.dining && copy.dining.length >= 2, `missing dining label for ${locale}`);
    assert.ok(copy.tripRoom && copy.tripRoom.length >= 2, `missing tripRoom label for ${locale}`);
  }
  const header = fs.readFileSync(path.join(ROOT, 'app', 'components', 'Header.jsx'), 'utf8');
  assert.ok(header.includes("'/restaurants-nightlife'"));
  assert.ok(header.includes("'/trip'"));
  const footer = fs.readFileSync(path.join(ROOT, 'app', 'components', 'Footer.jsx'), 'utf8');
  assert.ok(footer.includes("'/restaurants-nightlife'"));
  assert.ok(footer.includes("'/trip'"));
  assert.equal(footer.includes('affiliate-ready monetization'), false, 'legacy monetization copy must be removed from Footer');
});

test('E2E home spec uses updated ELIO+ Guide label', () => {
  const spec = fs.readFileSync(path.join(ROOT, 'e2e', 'home.spec.js'), 'utf8');
  assert.ok(spec.includes("['ELIO+ Guide', '/discovery']"));
});
