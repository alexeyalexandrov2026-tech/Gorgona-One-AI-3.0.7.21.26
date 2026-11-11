// "My Miami" (step 3): favourites kept on the device, a plan out of them,
// and where each request stands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import load from '../concierge/load.cjs';
import { favourite, favouriteKind, favouriteId, planRequest, FAVOURITE_KINDS } from '../../lib/myMiami.mjs';

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const { navigationItem, discoverySnapshot } = load('lib/ai/session.mjs');
const { planSections } = load('lib/ai/plan.mjs');
const { getTranslation } = load('lib/i18n.js');
const { SUPPORTED_LANGUAGES } = load('lib/languages.js');

test('a favourite comes from a yacht, villa, car or restaurant page only', () => {
  assert.equal(favouriteKind('/yachts/sunseeker-predator-74'), 'yacht');
  assert.equal(favouriteKind('/vacation-rentals/star-island-estate?x=1'), 'stay');
  assert.equal(favouriteKind('/rentals/lamborghini-urus-se'), 'car');
  assert.equal(favouriteKind('/restaurants-nightlife/carbone-miami'), 'dining');
  for (const href of ['/events/x', '/experiences/x', '/private-jets', '#listing-editor', 'https://example.com/yachts/x', undefined]) {
    assert.equal(favouriteKind(href), null, String(href));
  }
  assert.equal(favourite({ href: '/events/x', title: 'Concert' }), null);
  assert.equal(favourite({ href: '/yachts/x', title: '  ' }), null);
  // The card and the page of one yacht are one favourite.
  assert.equal(favouriteId('/yachts/x'), favouriteId('/yachts/x?from=card#top'));
  assert.deepEqual(Object.values(FAVOURITE_KINDS).sort(), ['car', 'dining', 'stay', 'yacht']);
});

test('a favourite survives the device store with its picture, and nothing unsafe does', () => {
  const item = favourite({ href: '/yachts/sunseeker-predator-74', title: 'Sunseeker Predator 74', image: 'https://images.unsplash.com/photo-1' });
  assert.deepEqual(navigationItem(item), { href: item.href, id: item.id, type: 'yacht', title: item.title, image: item.image });
  assert.equal(navigationItem({ ...item, image: 'javascript:alert(1)' }).image, undefined);
  assert.equal(navigationItem({ ...item, image: '/images/../secret' }).image, undefined);
  assert.equal(navigationItem({ ...item, href: '//evil.example/yachts/x' }), null);
  const restored = discoverySnapshot({ saved: [item, { ...item, id: '' }, { href: '/admin', title: 'x', id: 'x' }] });
  assert.deepEqual(restored.saved.map((saved) => saved.id), [item.id]);
});

test('the plan request names each favourite after its section, in every language', () => {
  const items = [
    favourite({ href: '/yachts/sunseeker-predator-74', title: 'Sunseeker Predator 74' }),
    favourite({ href: '/rentals/lamborghini-urus-se', title: 'Lamborghini Urus SE' }),
    favourite({ href: '/restaurants-nightlife/carbone-miami', title: 'Carbone' }),
    { id: 'q', href: '/events/heat', title: 'Heat tickets' }
  ];
  for (const { code } of SUPPORTED_LANGUAGES) {
    const t = getTranslation(code);
    const sections = { yacht: t.nav.yachts, stay: t.nav.villas, car: t.nav.cars, dining: t.restaurantsNightlife.pill };
    const message = planRequest(items, { template: 'Plan: {items}', sections });
    assert.ok(message.includes(`${t.nav.yachts}: Sunseeker Predator 74`), code);
    assert.ok(!message.includes('Heat tickets'), code);
    const found = planSections(message, code).map((section) => section.href);
    for (const href of ['/yachts', '/rentals', '/restaurants-nightlife']) assert.ok(found.includes(href), `${code}: ${href} not found in ${message}`);
  }
  assert.equal(planRequest([], { template: 'Plan: {items}', sections: {} }), '');
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
