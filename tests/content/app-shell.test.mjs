// The iOS app (ios/) shows this site inside a native shell. These checks keep
// the two halves in step: the hooks the app relies on stay in the site, and
// the lists the app hard-codes still match the site they were copied from.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES } from '../../lib/languages.js';
import { APP_RESTRICTED_PATHS, isAppRestricted } from '../../lib/appRestrictedPaths.js';
import { STARTER_PROMPTS } from '../../lib/ai/conciergePrompts.js';
import { isAppRequest, appSystemPrompt } from '../../lib/ai/appPersona.mjs';

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
  assert.equal(hero.match(/data-app-hidden=""/g).length, 2);
});

test('the site has no sportsbook section: no page, no link, old addresses lead home', () => {
  const routes = fs.readdirSync(new URL('../../app', import.meta.url), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /sportsbook|betting|betmgm|draftkings|fanduel|caesars/.test(entry.name));
  assert.deepEqual(routes.map((entry) => entry.name), []);

  for (const file of ['app/components/Header.jsx', 'app/components/Footer.jsx', 'app/page.js', 'app/sitemap.js', 'lib/aiSuggestions.js', 'lib/aiEcosystemContext.js', 'lib/discoveryCategories.js', 'lib/ecosystemData.js', 'lib/dealsData.js']) {
    assert.doesNotMatch(read(file), /\/sportsbook|betting/i, file);
  }
  // Every language's starters, not only the English ones.
  assert.doesNotMatch(Object.values(STARTER_PROMPTS).flat().join(' '), /sportsbook|betting|bookmaker|букмекер/i);

  // Addresses that are still out there (search engines, old messages).
  const config = read('next.config.js');
  for (const path of APP_RESTRICTED_PATHS.filter((path) => path !== '/stores/betting')) {
    const source = path === '/sportsbook' ? '/sportsbook/:path*' : path;
    assert.ok(config.includes(`{ source: '${source}', destination: '/', permanent: false }`), `${path} is not redirected`);
  }
  assert.match(config, /\{ source: '\/stores\/:path\*', destination: '\/experiences', permanent: true \}/);
});

test('nothing on the home page or in the menus is hidden from the app by a per-item flag', () => {
  for (const file of ['app/components/Header.jsx', 'app/components/Footer.jsx', 'app/page.js']) {
    assert.doesNotMatch(read(file), /appHidden/, file);
  }
});

test('the site and the app keep the same list of sections the app does not carry', () => {
  const restricted = swiftStrings(read('ios/MiamiElioKit/Sources/MiamiElioKit/RoutePolicy.swift'), 'defaultRestrictedPaths');
  assert.deepEqual(APP_RESTRICTED_PATHS, restricted);

  assert.ok(isAppRestricted('/sportsbook'));
  assert.ok(isAppRestricted('/sportsbook/'));
  assert.ok(isAppRestricted('/sportsbook?ref=ai#top'));
  assert.ok(isAppRestricted('/stores/betting/draftkings'));
  assert.ok(!isAppRestricted('/stores'));
  assert.ok(!isAppRestricted('/sportsbooks-guide'));
  assert.ok(!isAppRestricted('https://example.com/sportsbook'));
  assert.ok(!isAppRestricted(undefined));
});

test('the web concierge leaves out anything the app does not carry', () => {
  const conversation = read('app/components/ai/AiConversation.jsx');
  // Starter prompts that lead into a restricted section...
  assert.match(conversation, /data-app-hidden=\{leadsOutOfApp\(prompt\) \? '' : undefined\}/);
  // ...and the chips and cards under a reply.
  assert.match(conversation, /data-app-hidden=\{isAppRestricted\(s\.href\) \? '' : undefined\}/);
  assert.match(read('app/components/ai/AiActionCard.jsx'), /data-app-hidden=\{isAppRestricted\(card\.href\) \? '' : undefined\}/);
  // The Discovery Room's row of sections under the conversation.
  assert.match(read('app/components/ai/ConciergeRoom.jsx'), /data-app-hidden=\{isAppRestricted\(section\.href\) \? '' : undefined\}/);

});

test('the concierge answers the app without the sportsbook section', () => {
  const [, systemPrompt] = read('lib/aiEcosystemContext.js').match(/export const SYSTEM_PROMPT = `([\s\S]*?)`;/);
  const appPrompt = appSystemPrompt(systemPrompt);
  assert.doesNotMatch(systemPrompt, /sportsbook/i);
  assert.doesNotMatch(appPrompt, /\/sportsbook/);
  assert.match(appPrompt, /\/yachts/);
  assert.match(appPrompt, /never mention, recommend or link to sportsbooks/);

  const from = (agent) => ({ headers: new Headers(agent ? { 'user-agent': agent } : {}) });
  // The app's own screens send the bare token; its web view appends it.
  assert.ok(isAppRequest(from('MiamiElioApp/1.0')));
  assert.ok(isAppRequest(from('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MiamiElioApp/1.0')));
  assert.ok(!isAppRequest(from('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')));
  assert.ok(!isAppRequest(from(null)));
  // The token the app sends is the one the site looks for.
  assert.match(read('ios/MiamiElioKit/Sources/MiamiElioKit/AppConfig.swift'), /userAgentToken: String = "MiamiElioApp\/1\.0"/);

  const route = read('app/api/chat/route.js');
  assert.match(route, /const inApp = isAppRequest\(request\);/);
  assert.match(route, /const systemPrompt = inApp \? appSystemPrompt\(SYSTEM_PROMPT\) : SYSTEM_PROMPT;/);
  assert.match(route, /askLocalBrain\(\{ messages, systemPrompt, sessionId, locale \}\)/);
  assert.match(route, /askRouter\(messages, locale, systemPrompt\)/);
  assert.match(route, /filter\(\(item\) => !isAppRestricted\(item\?\.href\)\)/);
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
