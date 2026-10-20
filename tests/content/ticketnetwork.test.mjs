import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Script, createContext } from 'node:vm';
import { buildTicketNetworkUrl, getTicketNetworkCatalogue, getTicketNetworkFallback, TICKETNETWORK_PID } from '../../lib/ticketnetwork.js';
import { buildTicketNetworkDocument } from '../../lib/ticketnetworkWidget.js';
import { EVENT_CATEGORIES, EVENT_CATEGORY_GROUPS } from '../../lib/mockEventsData.js';
import { TICKETNETWORK_AREAS } from '../../lib/ticketnetworkLocation.js';

const widgetParams = html => JSON.parse(html.match(/var params = (\{[^\n]+\});/)[1]);

test('CJ links preserve the verified website PID and encode the complete destination', () => {
  const destination = 'https://www.ticketnetwork.com/category/sports?query=Miami&sort=date';
  const link = new URL(buildTicketNetworkUrl(destination, 'GorgonaSports'));
  assert.equal(TICKETNETWORK_PID, '101825540');
  assert.equal(link.origin, 'https://www.tkqlhce.com');
  assert.equal(link.pathname, '/click-101825540-10793961');
  assert.equal(link.searchParams.get('sid'), 'GorgonaSports');
  assert.equal(link.searchParams.get('url'), destination);
  assert.equal(link.searchParams.size, 2);
});

test('tracking never redirects to arbitrary domains or accepts unsafe campaign IDs', () => {
  for (const target of ['https://example.com', 'https://www.ticketnetwork.com.evil.test/', 'http://www.ticketnetwork.com/', 'javascript:alert(1)', 'https://user:pass@www.ticketnetwork.com/', 'https://www.ticketnetwork.com:8443/']) {
    assert.throws(() => buildTicketNetworkUrl(target));
  }
  for (const sid of ['', 'sports&url=other', '<script>', 'a'.repeat(101)]) {
    assert.throws(() => buildTicketNetworkUrl(undefined, sid));
  }
});

test('sports and concerts have separate destinations and reporting SIDs', () => {
  for (const [category, path, sid] of [['sports', '.1859.1988.', 'GorgonaSports'], ['concerts', '.1859.1986.', 'GorgonaConcerts']]) {
    assert.equal(getTicketNetworkCatalogue(category).path, path);
    const link = new URL(getTicketNetworkFallback(category));
    assert.equal(link.searchParams.get('url'), `https://www.ticketnetwork.com/category/${category}`);
    assert.equal(link.searchParams.get('sid'), sid);
  }
  for (const category of ['constructor', '__proto__', 'not-a-category', '<script>']) {
    assert.equal(getTicketNetworkCatalogue(category), null);
    assert.throws(() => buildTicketNetworkDocument(category));
  }
});

test('every visible genre and sports league has a live catalogue and a distinct reporting SID', () => {
  const sids = new Set();
  for (const category of [...EVENT_CATEGORY_GROUPS, ...EVENT_CATEGORIES]) {
    const catalogue = getTicketNetworkCatalogue(category.slug);
    assert.ok(catalogue, category.slug);
    assert.equal(catalogue.group, category.group || category.slug);
    assert.match(catalogue.sid, /^[A-Za-z0-9]{1,100}$/);
    assert.ok(!sids.has(catalogue.sid), `duplicate SID: ${catalogue.sid}`);
    sids.add(catalogue.sid);
    for (const path of catalogue.paths) assert.match(path, /^\.(?:\d+\.)+$/);
    const html = buildTicketNetworkDocument(category.slug);
    new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  }
});

test('subcategories request their own inventory rather than the entire parent catalogue', () => {
  const expected = {
    'pop-rock': '.1859.1986.1903.',
    nba: '.1859.1988.1865.1971.',
    nfl: '.1859.1988.1879.1959.',
    ufc: '.1859.1988.2027.2056.',
    'theater-broadway': '.1859.1989.'
  };
  for (const [category, path] of Object.entries(expected)) {
    const html = buildTicketNetworkDocument(category);
    const params = widgetParams(html);
    assert.equal(params.specialFilters, `&categoryFilter=startswith(path,'${path}')&includeFacets=true`);
    assert.equal(new URL(params.url).searchParams.get('sid'), getTicketNetworkCatalogue(category).sid);
  }
  const rock = buildTicketNetworkDocument('pop-rock');
  assert.match(rock, /<title>Pop &amp; Rock/);
});

test('mixed genres include both taxonomies, while Formula 1 narrows the auto-racing category', () => {
  for (const category of ['hip-hop-rnb', 'classical-opera', 'festivals', 'other-live']) {
    const params = widgetParams(buildTicketNetworkDocument(category));
    assert.equal((params.specialFilters.match(/startswith/g) || []).length, 2);
    assert.match(params.specialFilters, / or /);
  }
  const params = widgetParams(buildTicketNetworkDocument('formula-1'));
  assert.match(params.filters, /^q=Formula%201&filter=/);
  assert.match(params.specialFilters, /\.1859\.1988\.1905\.1925\./);
});

test('the supplier receives current, category-specific params with no unreliable price claims', () => {
  for (const category of ['sports', 'concerts']) {
    const html = buildTicketNetworkDocument(category, new Date('2027-03-05T12:00:00Z'));
    const params = widgetParams(html);
    assert.match(params.filters, /date\/date ge 2027-03-05 and/);
    assert.match(params.filters, /date\/date le 2029-03-05 and/);
    assert.ok(params.specialFilters.includes(getTicketNetworkCatalogue(category).path));
    assert.match(params.url, /^https:\/\/www\.tkqlhce\.com\/click-101825540-10793961\?sid=Gorgona(?:Sports|Concerts)&url=$/);
    assert.equal(params.target, '_blank');
    assert.equal(params.perPage, '10');
    assert.equal(params.pricing, '');
    assert.equal(params.count, '');
    assert.match(html, /setTimeout\(fail, 20000\)/);
    assert.doesNotMatch(html, /http:\/\//);
    // Compile the complete embedded program, including serialized params.
    new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  }
});

test('all categories start in Miami and nearby Florida venue cities, with wider areas explicitly available', () => {
  for (const category of [...EVENT_CATEGORY_GROUPS, ...EVENT_CATEGORIES]) {
    const html = buildTicketNetworkDocument(category.slug);
    const params = widgetParams(html);
    assert.ok(params.filters.endsWith(TICKETNETWORK_AREAS[0].filter));
    assert.match(params.filters, /stateProvince\/text\/abbr eq 'FL'/);
    for (const city of ['Miami', 'Miami Gardens', 'Sunrise', 'Fort Lauderdale']) {
      assert.ok(params.filters.includes(`'${city}'`));
    }
    assert.match(html, /tner-date-filter_gorgona/);
    assert.match(html, /tner-performer-filter_gorgona/);
    assert.match(html, /tner-city-filter_gorgona/);
  }
  assert.equal(TICKETNETWORK_AREAS[1].filter, " and stateProvince/text/abbr eq 'FL'");
  assert.equal(TICKETNETWORK_AREAS[2].filter, '');
});

test('changing area restarts pagination, keeps dates and teams, and clears the previous city', async () => {
  const calls = [];
  let changeArea;
  let initialized;
  const ready = new Promise(resolve => { initialized = resolve; });
  const fields = new Map();
  const storedFilters = { city: ['Miami%2C%20FL'], performer: ['Miami%20Heat'], 'date-start': ['Nov 1, 2026'] };
  const area = { value: 'miami', addEventListener: (_, callback) => { changeArea = callback; } };
  fields.set('widget-area', area);
  fields.set('tner-filter-storage_gorgona', { value: encodeURIComponent(JSON.stringify(storedFilters)) });
  fields.set('tner-call-storage_gorgona', { value: 'previous-page-2' });
  const element = { classList: { remove() {} }, querySelectorAll: () => [] };
  const context = createContext({
    document: {
      getElementById: id => fields.get(id) || element,
      createElement: () => ({}), head: { appendChild: script => queueMicrotask(() => script.onload()) }
    },
    window: {
      addEventListener() {}, tnerLoaded: true, initializeDatepickers() {},
      jQuery: () => ({ ajaxError() {} }),
      csctnCall: (params, replace) => { calls.push({ params: structuredClone(params), replace }); initialized(); }
    },
    MutationObserver: class { observe() {} }, ResizeObserver: class { observe() {} },
    setTimeout: () => 1, clearTimeout() {}, clearInterval() {},
    setInterval: callback => { queueMicrotask(callback); return 1; }, Promise
  });
  const html = buildTicketNetworkDocument('nba');
  new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]).runInContext(context);
  await ready;
  area.value = 'all'; changeArea();
  assert.equal(calls[1].replace, true);
  assert.equal(calls[1].params.page, 1);
  assert.doesNotMatch(calls[1].params.filters, /city\/|stateProvince/);
  assert.equal(calls[1].params.specialFilters, calls[0].params.specialFilters);
  assert.equal(calls[1].params.url, calls[0].params.url);
  const saved = JSON.parse(decodeURIComponent(fields.get('tner-filter-storage_gorgona').value));
  assert.deepEqual(saved, { performer: ['Miami%20Heat'], 'date-start': ['Nov 1, 2026'] });
  assert.equal(fields.get('tner-call-storage_gorgona').value, '');
  area.value = 'florida'; changeArea();
  assert.match(calls[2].params.filters, /stateProvince\/text\/abbr eq 'FL'$/);
  area.value = 'miami'; changeArea();
  assert.equal(calls[3].params.filters, calls[0].params.filters);
});

test('a supplier script failure yields a visible error instead of an indefinite loader', async () => {
  const status = { hidden: false, textContent: '' };
  const container = { hidden: true };
  const messages = [];
  let signal;
  const reported = new Promise(resolve => { signal = resolve; });
  const context = createContext({
    document: {
      getElementById: id => id === 'widget-status' ? status : container,
      body: { getBoundingClientRect: () => ({ height: 80 }) },
      createElement: () => ({}),
      head: { appendChild: script => queueMicrotask(() => script.onerror()) }
    },
    window: { addEventListener() {} },
    parent: { postMessage: message => { messages.push(message); signal(); } },
    MutationObserver: class { observe() {} },
    ResizeObserver: class { observe() {} },
    setTimeout: () => 1, clearTimeout() {}, Promise
  });
  const html = buildTicketNetworkDocument('sports');
  new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]).runInContext(context);
  await reported;
  assert.equal(container.hidden, true);
  assert.equal(status.hidden, false);
  assert.match(status.textContent, /temporarily unavailable/);
  assert.equal(messages.at(-1).state, 'error');
  assert.equal(messages.at(-1).category, 'sports');
  assert.ok(messages.at(-1).height >= 120);
});
