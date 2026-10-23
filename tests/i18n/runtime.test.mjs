import '../../lib/savedServerCatalog.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { SAVED_MESSAGES, savedMessage, savedListing, savedSource, savedPrice } from '../../lib/savedCopy.js';
import { canRefreshForLocale } from '../../lib/localePolicy.js';
import { LOCALES, ROOT, readJSON, appFiles, parseFile, walk } from '../../scripts/i18n/catalogue.mjs';
import { AUTH_MESSAGES, authErrorSource } from '../../lib/authMessages.js';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';

test('auth messages localize provider codes and never expose unknown diagnostics', () => {
  assert.equal(authErrorSource({code:'invalid_credentials',message:'private upstream details'}),AUTH_MESSAGES.credentials);
  assert.equal(authErrorSource({code:'email_not_confirmed'}),AUTH_MESSAGES.confirm);
  assert.equal(authErrorSource({code:'new_server_error',message:'private upstream details'}),AUTH_MESSAGES.failed);
  assert.equal(authErrorSource(new Error('Invalid email')),AUTH_MESSAGES.email);
  assert.equal(authErrorSource('You must agree to the Miami Elio Partnership Agreement.'),AUTH_MESSAGES.agreement);
  for (const locale of LOCALES.filter(code=>code!=='en')) {
    assert.notEqual(savedSource(locale,authErrorSource({code:'invalid_credentials'})),AUTH_MESSAGES.credentials,locale);
    assert.notEqual(savedSource(locale,authErrorSource(new Error('private upstream details'))),AUTH_MESSAGES.failed,locale);
  }
});

test('language registry and neutral quantity labels remain valid when inventory changes', () => {
  assert.deepEqual(LOCALES,SUPPORTED_LANGUAGES.map(language=>language.code));
  for (const locale of LOCALES) for (const n of [0,1,2,5,11,21,22]) {
    for (const id of ['home.counts.brands','home.counts.homes','home.counts.charters','home.counts.cars','home.counts.operators','deals.offers']) {
      const text=savedMessage(locale,id,{n});
      assert.ok(text.includes(String(n)),`${locale}/${id}/${n}`);
      assert.doesNotMatch(text,/\{n\}/);
    }
  }
  assert.equal(savedMessage('en','home.counts.cars',{n:1}),'Cars: 1');
});

test('only ordinary routes may refresh when changing locale', () => {
  for (const route of ['/yachts','/yachts/','/vacation-rentals','/vacation-rentals/']) assert.equal(canRefreshForLocale(route),false,route);
  for (const route of ['/','/rentals','/yachts/sunseeker-predator-74','/vacation-rentals/star-island-estate','/events']) assert.equal(canRefreshForLocale(route),true,route);
  for (const route of [null,undefined,'']) assert.equal(canRefreshForLocale(route),false);
});

test('unknown or changed material is preserved instead of receiving a stale translation', () => {
  const description = SAVED_MESSAGES.en['listing.lamborghini-urus-se.description'];
  const changed = description + ' Updated by the owner.';
  assert.equal(savedListing('ru',{id:'lamborghini-urus-se',description:changed}),changed);
  assert.equal(savedListing('ru',{id:'new-supplier-record',description}),description);
  assert.equal(savedSource('ru','A message from the customer.'),'A message from the customer.');
  assert.equal(savedMessage('invalid','home.searchGo'),SAVED_MESSAGES.en['home.searchGo']);
  assert.throws(() => savedMessage('ru','unknown.required.key'),/Unknown display message/);
});

test('named values, prices and user input keep their data', () => {
  const user = '<script>customer input</script>';
  assert.equal(savedMessage('ru','home.goTo',{name:user}),`Перейти в ${user}`);
  assert.equal(savedSource('ru','  Show code  '),'  Показать код  ');
  for (const locale of LOCALES) {
    const formatted = new Intl.NumberFormat(locale,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(199);
    assert.ok(savedPrice(locale,'From $199').includes(formatted),locale);
    assert.equal(savedPrice(locale,'€199'),'€199');
  }
});

test('external widget implementations stay byte-identical to the audited production base', () => {
  for (const [file,expected] of Object.entries(readJSON('tests/i18n/fixtures/widget-fingerprints.json'))) {
    assert.equal(createHash('sha256').update(fs.readFileSync(ROOT+file)).digest('hex'),expected,file);
  }
});

test('new visible JSX text must be localized or explicitly exempted', () => {
  const excluded = new Map([
    ['app/admin/page.js',new Set(['/api/notify'])],
    ['app/components/Header.jsx',new Set(['Miami','Elio'])],
    ['app/components/Footer.jsx',new Set(['Miami','Elio'])],
    ['app/components/ai/DiscoveryDock.jsx',new Set(['AI'])],
    ['app/entertainment/adrenaline-365/page.js',new Set(['Adrenaline 365'])],
    ['app/events/TicketNetworkEvents.jsx',new Set(['ET'])],
    ['app/events/TicketProviders.jsx',new Set(['TicketNetwork'])],
    ['app/partner/page.js',new Set(['USD ($)','EUR (€)','AED (د.إ)','THB (฿)'])],
    ['app/register/partner/page.js',new Set(['WhatsApp','Telegram'])],
    ['app/travel/ovago/page.js',new Set(['Ovago'])]
  ]);
  for (const file of appFiles()) {
    if (file.endsWith('YatrCatalog.jsx') || file.endsWith('Stay22Browse.jsx')) continue;
    walk(parseFile(file),(node,parents) => {
      if (node.type !== 'JSXText' || !/[A-Za-z]{2}/.test(node.value.trim()) || ['script','style','svg'].includes(parents[0]?.openingElement?.name?.name)) return;
      assert.ok(excluded.get(file)?.has(node.value.trim()),`Unmarked owned JSX text in ${file}: ${node.value.trim()}`);
    });
  }
});

test('event records are excluded from saved sources and remain English at their render sites', () => {
  assert.ok(!Object.keys(readJSON('i18n/source.json')).some(id => /^event\./.test(id)));
  const season = fs.readFileSync(ROOT+'app/components/home/SeasonShelf.jsx','utf8');
  assert.match(season,/event\.tip\.en/);
  assert.match(season,/const intl = 'en-US'/);
  assert.doesNotMatch(season,/pickLang\(/);
  const detail = fs.readFileSync(ROOT+'app/events/[slug]/page.js','utf8');
  assert.match(detail,/description: event\.description/);
  assert.doesNotMatch(detail,/eventDescriptions|getContentText/);
  const feed = fs.readFileSync(ROOT+'app/events/TicketNetworkEvents.jsx','utf8');
  assert.match(feed,/\{event\.name\}/);
  assert.match(feed,/\{event\.venue\}/);
  assert.match(feed,/\? 'Time TBA'/);
});
