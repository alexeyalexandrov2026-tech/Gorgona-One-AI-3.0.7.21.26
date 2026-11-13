#!/usr/bin/env node
// Runs the script every Miami Elio page starts with (WebBootstrap.script in
// the app) against a stand-in page and checks what it does. There is no
// JavaScript engine in the unit tests, so this is where the script's
// behaviour is verified.
//
//   cd android && ./gradlew testDebugUnitTest     writes the script the app injects
//   node android/scripts/verify-web-bridge.cjs    checks it
//
// WebBootstrapTest writes the scripts into android/app/build/outputs/web.
// Pass another path to bootstrap.js to check a different copy and its
// sibling favorite-change.js.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = process.argv[2] || path.join(__dirname, '..', 'app', 'build', 'outputs', 'web', 'bootstrap.js');
const favoriteFile = path.join(path.dirname(file), 'favorite-change.js');
if (!fs.existsSync(file) || !fs.existsSync(favoriteFile)) {
  console.error('Missing Android web scripts. Run testDebugUnitTest in android/ first.');
  process.exit(1);
}
const source = fs.readFileSync(file, 'utf8');
const favoriteChange = fs.readFileSync(favoriteFile, 'utf8');

/** A page as the script sees it, recording everything the script does to it. */
function page(hostname, options = {}) {
  const posted = [];
  const listeners = {};
  const attributes = {};
  const root = { lang: 'ru', setAttribute: (name, value) => { attributes[name] = value; } };
  const document = {
    documentElement: root,
    cookie: options.cookie || '',
    addEventListener: (type, run, capture) => { (listeners[type] = listeners[type] || []).push({ run, capture }); },
  };
  const sandbox = {
    location: { hostname, href: `https://${hostname}/` },
    document,
    URL,
    MutationObserver: function MutationObserver() { this.observe = () => {}; this.disconnect = () => {}; },
    localStorage: { getItem: () => options.stored || null },
  };
  sandbox.window = sandbox;
  // The object the web view gives the site's own pages (WebBootstrap.BRIDGE).
  sandbox.miamiElioNative = { postMessage: (text) => posted.push(JSON.parse(text)) };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { posted, listeners, attributes, document, sandbox };
}

function click(target, href) {
  let prevented = false;
  let stopped = false;
  const link = { getAttribute: () => href };
  const event = {
    target: { closest: () => link },
    preventDefault: () => { prevented = true; },
    stopPropagation: () => { stopped = true; },
  };
  (target.listeners.click || []).forEach((listener) => listener.run(event));
  return { prevented, stopped };
}

let failed = 0;
function check(name, ok) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  if (!ok) failed += 1;
}

const own = page('gorgona-one.com');
check('marks the document for the app', own.attributes['data-app'] === 'android');
check('sets the language cookie when none is stored', /gorgona-locale=ru; path=\//.test(own.document.cookie));
check('offers the door the iPhone app has', typeof own.sandbox.webkit.messageHandlers.miamiElio.postMessage === 'function');
own.sandbox.webkit.messageHandlers.miamiElio.postMessage({ favorites: ['yacht:a'] });
check('the door posts JSON to the bridge', JSON.stringify(own.posted) === '[{"favorites":["yacht:a"]}]');
(own.listeners.DOMContentLoaded || []).forEach((listener) => listener.run());
check('reports the language the site shows', own.posted.some((message) => message.locale === 'ru'));

const blocked = click(own, '/sportsbook/offers');
check('stops a link into a section the app does not carry', blocked.prevented && blocked.stopped);
check('hands that link to the app', own.posted.some((message) => message.open === 'https://gorgona-one.com/sportsbook/offers'));
check('listens before the site\'s own router', own.listeners.click[0].capture === true);

const before = own.posted.length;
const allowed = click(own, '/yachts');
check('leaves ordinary links alone', !allowed.prevented && own.posted.length === before);
const partner = click(own, 'https://partner.example.com/sportsbook');
check('leaves other sites\' links alone', !partner.prevented && own.posted.length === before);

vm.runInContext(source, own.sandbox);
check('a second injection does nothing', own.listeners.click.length === 1);

const chosen = page('www.gorgona-one.com', { cookie: 'gorgona-locale=he' });
check('keeps a language the guest already chose', chosen.document.cookie === 'gorgona-locale=he');

const foreign = page('partner.example.com');
check(
  'does nothing on another site',
  Object.keys(foreign.attributes).length === 0 &&
    !foreign.listeners.click &&
    foreign.sandbox.webkit === undefined &&
    foreign.document.cookie === ''
);

function runFavorite(origin, ready = false) {
  const delivered = [];
  const context = {
    location: { origin },
    __miamiFavoriteV2: ready ? (change) => delivered.push(change) : undefined,
  };
  context.window = context;
  const accepted = vm.runInNewContext(favoriteChange, context);
  return { accepted, delivered };
}

const siteOrigin = 'https://gorgona-one.com';
const expected = { kind: 'yacht', slug: 'azimut-55', title: 'Azimut "55"', on: true,
  receipt: '11111111-1111-4111-8111-111111111111', owner: null };
const direct = runFavorite(siteOrigin, true);
check('starts a favorite edit with its receipt ID and owner', direct.accepted &&
  JSON.stringify(direct.delivered) === JSON.stringify([expected]));

const notReady = runFavorite(siteOrigin);
check('keeps the native edit pending on sites without the confirmed bridge', notReady.accepted === false &&
  notReady.delivered.length === 0);

const navigated = runFavorite('https://partner.example.com', true);
check('does not hand off favorites when the document has changed origin', navigated.accepted === false &&
  navigated.delivered.length === 0);

if (failed) {
  console.error(`${failed} check(s) failed.`);
  process.exit(1);
}
console.log('The page script behaves as the app expects.');
