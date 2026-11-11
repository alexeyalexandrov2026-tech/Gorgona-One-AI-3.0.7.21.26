// The iOS app (ios/) shows this site inside a native shell. These checks keep
// the two halves in step: the hooks the app relies on stay in the site, and
// the lists the app hard-codes still match the site they were copied from.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES } from '../../lib/languages.js';

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const swiftStrings = (source, declaration) => {
  const start = source.indexOf(declaration);
  assert.notEqual(start, -1, `${declaration} not found`);
  const open = source.indexOf('[', source.indexOf('=', start));
  return [...source.slice(open, source.indexOf(']', open)).matchAll(/"([^"]+)"/g)].map((match) => match[1]);
};

test('the site hides web-only chrome only when the app marks the document', () => {
  const css = read('app/globals.css');
  assert.match(css, /html\[data-app\] \[data-app-hidden\]\s*\{\s*display:\s*none !important;\s*\}/);
  // Exactly one rule keys off the marker, so a browser can never trip it.
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(rules.match(/\[data-app\]/g).length, 1);
});

test('the pieces the app replaces carry the hook', () => {
  assert.match(read('app/components/InstallPrompt.jsx'), /<div data-app-hidden=""/);
  assert.match(read('app/components/ai/AiSphere.jsx'), /data-app-hidden=""\s+onClick=\{toggle\}/);
  // The "AI" pill beside the sphere opens the same web concierge.
  assert.match(read('app/components/ai/DiscoveryDock.jsx'), /data-app-hidden=""\s+className=\{`aidock /);
});

test('the home page opens on every main section, each with a page and a picture', () => {
  const hero = read('app/components/home/HomeHero.jsx');
  const sections = [...hero.matchAll(/\{ id: '([a-z]+)', href: '([^']+)', name: /g)].map((match) => ({ id: match[1], href: match[2] }));
  assert.equal(sections.length, 9);
  for (const { id, href } of sections) {
    assert.ok(fs.existsSync(new URL(`../../app${href}/page.js`, import.meta.url)), `${href} has no page`);
    assert.ok(fs.existsSync(new URL(`../../public/images/home/sections/${id}.jpg`, import.meta.url)), `no picture for ${id}`);
  }
  // None of them leads into a section the app does not carry.
  const restricted = swiftStrings(read('ios/MiamiElioKit/Sources/MiamiElioKit/RoutePolicy.swift'), 'defaultRestrictedPaths');
  for (const { href } of sections) {
    assert.ok(!restricted.some((path) => href === path || href.startsWith(`${path}/`)), `${href} is blocked in the app`);
  }
});

test('the app leaves out the parts of the hero its own tabs already cover', () => {
  const hero = read('app/components/home/HomeHero.jsx');
  assert.match(hero, /<p data-app-hidden=""[^>]*>\s*\{copy\.lede\}/);
  assert.match(hero, /<div data-app-hidden=""[^>]*aria-label=\{copy\.chipsLabel\}>/);
  assert.match(hero, /<div data-app-hidden=""[^>]*>\s*\{stats\.map/);
  assert.equal(hero.match(/data-app-hidden=""/g).length, 3);
});

test('sportsbook entry points are left out of the app', () => {
  const header = read('app/components/Header.jsx');
  assert.match(header, /key: 'sportsbook', href: '\/sportsbook', label: 'Sportsbooks', appHidden: true/);
  // Both the desktop and the mobile menu render the hook.
  assert.equal(header.match(/data-app-hidden=\{item\.appHidden \? '' : undefined\}/g).length, 2);

  const footer = read('app/components/Footer.jsx');
  assert.match(footer, /key: 'sportsbooks', href: '\/sportsbook', fallback: 'Sportsbooks', appHidden: true/);
  assert.match(footer, /<li key=\{item\.href\} data-app-hidden=\{item\.appHidden \? '' : undefined\}>/);

  const home = read('app/page.js');
  assert.match(home, /id: 'sportsbooks', href: '\/sportsbook'.*appHidden: true/);
  assert.match(home, /<li key=\{world\.id\} data-app-hidden=\{world\.appHidden \? '' : undefined\}/);
  assert.match(home, /<section data-app-hidden=""[^>]*>\s*<SectionHead title=\{copy\.books\}/);
});

test('no other entry is hidden from the app by accident', () => {
  for (const file of ['app/components/Header.jsx', 'app/components/Footer.jsx', 'app/page.js']) {
    assert.equal(read(file).match(/appHidden: true/g).length, 1, file);
  }
});

test('the app refuses every sportsbook route the site has', () => {
  const restricted = swiftStrings(read('ios/MiamiElioKit/Sources/MiamiElioKit/RoutePolicy.swift'), 'defaultRestrictedPaths');
  const routes = fs.readdirSync(new URL('../../app', import.meta.url), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /sportsbook|betting|betmgm|draftkings|fanduel|caesars/.test(entry.name))
    .map((entry) => `/${entry.name}`);

  assert.ok(routes.includes('/sportsbook'));
  for (const route of routes) {
    assert.ok(restricted.includes(route), `${route} is a sportsbook route the iOS app does not block`);
  }
  assert.ok(restricted.includes('/stores/betting'));
});

test('the app knows the same languages as the site', () => {
  const swift = read('ios/MiamiElioKit/Sources/MiamiElioKit/SiteLocale.swift');
  assert.deepEqual(swiftStrings(swift, 'static let supported'), SUPPORTED_LANGUAGES.map((language) => language.code));
  assert.deepEqual(swiftStrings(swift, 'static let rightToLeft').sort(), [...RTL_LANGUAGES].sort());
  assert.match(swift, /static let storageKey = "gorgona-locale"/);
  assert.match(read('app/components/LocaleProvider.jsx'), /LOCALE_COOKIE_KEY = 'gorgona-locale'/);
});

test('the app strings are generated from the current site translations', () => {
  const script = new URL('../../ios/scripts/build-strings.mjs', import.meta.url);
  const output = execFileSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', script.pathname, '--check'], { encoding: 'utf8' });
  assert.match(output, /up to date \(16 languages\)/);
});
