import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Script, createContext } from 'node:vm';
import { buildTicketNetworkUrl, getTicketNetworkCatalogue, getTicketNetworkFallback, TICKETNETWORK_PID } from '../../lib/ticketnetwork.js';
import { buildTicketNetworkDocument } from '../../lib/ticketnetworkWidget.js';

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
  for (const category of ['constructor', '__proto__', 'nba', '<script>']) {
    assert.equal(getTicketNetworkCatalogue(category), null);
    assert.throws(() => buildTicketNetworkDocument(category));
  }
});

test('the supplier receives current, category-specific params with no unreliable price claims', () => {
  for (const category of ['sports', 'concerts']) {
    const html = buildTicketNetworkDocument(category, new Date('2027-03-05T12:00:00Z'));
    const params = JSON.parse(html.match(/window\.csctnCall\((\{[^\n]+\})\);/)[1]);
    assert.match(params.filters, /date\/date ge 2027-03-05 and/);
    assert.match(params.filters, /date\/date le 2029-03-05$/);
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
