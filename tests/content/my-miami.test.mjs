// "My Miami" (step 3): favourites (on the device, then in the account), a plan
// out of them, and where each request stands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import load from '../concierge/load.cjs';
import { favouriteKind, favouriteRef, planRequest, FAVOURITE_KINDS } from '../../lib/myMiami.mjs';

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const { favoriteItem, favoriteKey } = load('lib/favoriteRules.mjs');
const { planSections } = load('lib/ai/plan.mjs');
const { getTranslation } = load('lib/i18n.js');
const { SUPPORTED_LANGUAGES } = load('lib/languages.js');
const fav = (href, title, kind) => favoriteItem({ ...favouriteRef(href, kind), title });

test('a favourite comes from a yacht, villa, car or restaurant page only', () => {
  assert.equal(favouriteKind('/yachts/sunseeker-predator-74'), 'yacht');
  assert.equal(favouriteKind('/vacation-rentals/star-island-estate?x=1'), 'stay');
  assert.equal(favouriteKind('/rentals/lamborghini-urus-se'), 'car');
  assert.equal(favouriteKind('/restaurants-nightlife/carbone-miami'), 'dining');
  for (const href of ['/events/x', '/experiences/x', '/private-jets', '#listing-editor', 'https://example.com/yachts/x', '//evil.example/yachts/x', undefined]) {
    assert.equal(favouriteKind(href), null, String(href));
    assert.equal(favouriteRef(href), null, String(href));
  }
  assert.deepEqual(Object.values(FAVOURITE_KINDS).sort(), ['car', 'dining', 'stay', 'yacht']);
});

test('the card and the page of one listing are one favourite, kept by kind and slug', () => {
  assert.deepEqual(favouriteRef('/yachts/sunseeker-predator-74'), { kind: 'yacht', slug: 'sunseeker-predator-74' });
  assert.deepEqual(favouriteRef('/yachts/sunseeker-predator-74?from=card#top'), favouriteRef('/yachts/sunseeker-predator-74'));
  assert.deepEqual(favouriteRef('/vacation-rentals/star-island-estate'), { kind: 'stay', slug: 'star-island-estate' });
  // A restaurant and a club share a link shape; the card says which.
  assert.deepEqual(favouriteRef('/restaurants-nightlife/liv-miami', 'nightlife'), { kind: 'nightlife', slug: 'liv-miami' });
  assert.deepEqual(favouriteRef('/restaurants-nightlife/carbone-miami'), { kind: 'dining', slug: 'carbone-miami' });
  assert.deepEqual(favouriteRef('/yachts/x', 'nightlife'), { kind: 'yacht', slug: 'x' });
  // Section pages, nested paths and odd slugs are not favourites.
  for (const href of ['/yachts', '/yachts/', '/yachts/x/gallery', '/yachts/../admin', '/rentals/Lamborghini']) assert.equal(favouriteRef(href), null, href);
  const item = fav('/rentals/lamborghini-urus-se', 'Lamborghini Urus SE');
  assert.equal(item.href, '/rentals/lamborghini-urus-se');
  assert.equal(favoriteKey(item.kind, item.slug), 'car:lamborghini-urus-se');
});

test('the plan request names each favourite after its section, in every language', () => {
  const items = [
    fav('/yachts/sunseeker-predator-74', 'Sunseeker Predator 74'),
    fav('/rentals/lamborghini-urus-se', 'Lamborghini Urus SE'),
    fav('/restaurants-nightlife/carbone-miami', 'Carbone'),
    fav('/restaurants-nightlife/liv-miami', 'LIV', 'nightlife'),
    { href: '/events/heat', title: 'Heat tickets' }
  ];
  for (const { code } of SUPPORTED_LANGUAGES) {
    const t = getTranslation(code);
    const sections = { yacht: t.nav.yachts, stay: t.nav.villas, car: t.nav.cars, dining: t.restaurantsNightlife.pill };
    const message = planRequest(items, { template: 'Plan: {items}', sections });
    assert.ok(message.includes(`${t.nav.yachts}: Sunseeker Predator 74`), code);
    assert.ok(message.includes(`${t.restaurantsNightlife.pill}: LIV`), code);
    assert.ok(!message.includes('Heat tickets'), code);
    const found = planSections(message, code).map((section) => section.href);
    for (const href of ['/yachts', '/rentals', '/restaurants-nightlife']) assert.ok(found.includes(href), `${code}: ${href} not found in ${message}`);
  }
  assert.equal(planRequest([], { template: 'Plan: {items}', sections: {} }), '');
});

test('one favourites list: the hearts, the header count and My Miami all read FavoritesProvider', () => {
  for (const file of ['app/components/SaveButton.jsx', 'app/components/MyMiami.jsx', 'app/components/Header.jsx']) {
    assert.match(read(file), /useFavorites()/, file);
    assert.doesNotMatch(read(file), /useAI()/, file);
  }
  const layout = read('app/layout.js');
  assert.ok(layout.indexOf('<FavoritesProvider>') < layout.indexOf('<Header />'));
  assert.ok(!fs.existsSync(new URL('../../app/components/Favorites.jsx', import.meta.url)), 'one heart component only');
  assert.match(read('app/components/ai/PlanBoard.jsx'), /<SaveButton compact href={item.href} kind={item.kind}/);
  assert.ok(read('app/components/VenueCard.jsx').includes("kind={venue.category==='nightlife'?'nightlife':'dining'}"));
});

test('every catalogue card and page carries the heart, the partner preview does not', () => {
  const ui = read('app/components/g1/ui.jsx');
  assert.match(ui, /saveable = true \}\)/);
  assert.match(ui, /\{saveable && <SaveButton overlay href=\{href\} title=\{title\} image=\{img\} \/>\}/);
  assert.match(read('app/components/dashboard/ListingWorkspace.jsx'), /<ListingCard saveable=\{false\}/);
  assert.match(read('app/components/VenueCard.jsx'), /<SaveButton overlay href=\{`\/restaurants-nightlife\/\$\{venue\.slug\}`\}/);
  for (const [file, root] of [['app/yachts/[slug]/page.js', 'yachts'], ['app/rentals/[slug]/page.js', 'rentals'], ['app/vacation-rentals/[slug]/page.js', 'vacation-rentals'], ['app/restaurants-nightlife/[slug]/page.js', 'restaurants-nightlife']]) {
    assert.match(read(file), new RegExp(`<SaveButton href=\\{\`/${root}/`), file);
  }
  // A button inside the card's link would be invalid HTML and would navigate.
  assert.match(read('app/components/SaveButton.jsx'), /event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
});

test('the profile page is My Miami: favourites without an account, requests after signing in', () => {
  const page = read('app/profile/page.js');
  assert.match(page, /<MyMiami \/>/);
  assert.match(page, /<RequestBoard key=\{session\.id\} scope="customer" embedded \/>/);
  assert.match(page, /msg\('Sign in to see your requests and where each one stands\.'\)/);
  // Favourites are drawn before the sign-in check, so a guest sees them.
  assert.ok(page.indexOf('<MyMiami />') < page.indexOf('session ? ('));
  // The iOS app's Profile tab opens this page.
  assert.match(read('ios/MiamiElio/App/AppServices.swift'), /startPath: "\/profile"/);
  // The header heart is left to the app's own tab inside the app.
  assert.match(read('app/components/Header.jsx'), /href="\/profile"\s+data-app-hidden=""\s+data-my-miami-link=""/);
});

test('a request shows its four steps and, for the guest, what comes next', () => {
  const board = read('app/components/dashboard/RequestBoard.jsx');
  assert.match(board, /const STEPS=\['pending','reviewing','responded','closed'\];/);
  assert.match(board, /aria-current=\{index===current\?'step':undefined\}/);
  assert.match(board, /next=\{scope==='customer'\?nextStep\[detail\.request\.status\]:''\}/);
  const { REQUEST_STATES } = load('lib/server/dashboardCore.mjs');
  assert.deepEqual(REQUEST_STATES, ['pending', 'reviewing', 'responded', 'closed']);
});
