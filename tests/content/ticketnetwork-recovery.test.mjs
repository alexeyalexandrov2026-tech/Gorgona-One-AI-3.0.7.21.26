import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTicketNetworkSource, readPublicTicketNetworkConfig, ticketNetworkFailureDetails } from '../../lib/ticketnetworkSource.js';
import { parseTicketNetworkQuery } from '../../lib/ticketnetworkSearch.js';

const epoch = Date.parse('2026-10-20T12:00:00Z');
const query = params => parseTicketNetworkQuery(new URLSearchParams({ category: 'nba', ...params }), new Date(epoch));
const host = 'example-1.a1.typesense.net';
const fakeKey = 'public_test_configuration_only_1234';
const configScript = `x-typesense-api-key /collections/ dev:{host:"${host}",apiKey:"${fakeKey}"}`;
const empty = { found: 0, hits: [], facet_counts: [] };
const inventory = { found: 12, hits: [{ document: {
  event_id: 123, event_name: 'SYNTHETIC TEST fixture', event_local_timestamp: Date.parse('2026-11-01T19:00:00Z') / 1000,
  venue_name: 'TEST venue', venue_city: 'Miami', venue_state_province_short: 'FL'
} }], facet_counts: [] };

function setup({ cache, configStatus, scriptStatus } = {}) {
  let time = epoch;
  let failure = false;
  let payload = inventory;
  const calls = [];
  const source = createTicketNetworkSource({
    cache, now: () => time,
    fetcher: async (url, options) => {
      calls.push(url);
      assert.ok(options.signal instanceof AbortSignal);
      if (url === 'https://www.ticketnetwork.com/en/affiliate-plugin') return configStatus ? new Response(fakeKey, { status: configStatus }) : new Response('<script src="/_next/static/chunks/current-search.js"></script><script src="https://untrusted.test/evil.js"></script>');
      if (url === 'https://www.ticketnetwork.com/_next/static/chunks/current-search.js') return scriptStatus ? new Response(fakeKey, { status: scriptStatus }) : new Response(configScript);
      assert.equal(new URL(url).origin, `https://${host}`);
      assert.equal(options.headers['X-TYPESENSE-API-KEY'], fakeKey);
      return failure ? new Response('unavailable', { status: failure }) : Response.json(payload);
    }
  });
  return { source, calls, advance: ms => { time += ms; }, fail: code => { failure = code; }, payload: value => { payload = value; } };
}

test('only the current public storefront search configuration is accepted; arbitrary hosts fail closed', () => {
  assert.deepEqual(readPublicTicketNetworkConfig(configScript), { host, key: fakeKey });
  for (const source of [configScript.replace(host, 'internal.local'), configScript.replace(host, 'example.a1.typesense.net.evil.test'), configScript.replace('/collections/', 'unrelated'), '{}']) assert.equal(readPublicTicketNetworkConfig(source), null);
});

test('concurrent identical searches are coalesced, fresh results reused, and no vendor key reaches the response', async () => {
  const s = setup();
  const results = await Promise.all([s.source.get(query({})), s.source.get(query({}))]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(s.calls.length, 3);
  assert.equal(results[0].events[0].name, 'SYNTHETIC TEST fixture');
  assert.ok(!JSON.stringify(results[0]).includes(fakeKey));
  await s.source.get(query({})); assert.equal(s.calls.length, 3);
});

test('an upstream outage serves an explicitly stale matching list, and expired saved inventory is never used', async () => {
  const s = setup();
  const live = await s.source.get(query({}));
  s.advance(300001); s.fail(503);
  const saved = await s.source.get(query({}));
  assert.equal(saved.stale, true); assert.equal(saved.updatedAt, live.updatedAt);
  assert.deepEqual(saved.events, live.events);
  s.advance(86400001);
  await assert.rejects(() => s.source.get(query({})), /unavailable/);
});

test('page 1 cache never substitutes for a failed page 2 or for another area', async () => {
  const s = setup(); await s.source.get(query({})); s.fail(503);
  await assert.rejects(() => s.source.get(query({ page: '2' })), /unavailable/);
  await assert.rejects(() => s.source.get(query({ area: 'all' })), /unavailable/);
  s.fail(false); s.payload(empty);
  const next = await s.source.get(query({ page: '2' }));
  assert.equal(next.page, 2); assert.equal(next.hasMore, false); assert.deepEqual(next.events, []);
});

test('malformed JSON and supplier errors produce a failure, never an empty successful catalogue', async () => {
  const s = setup(); s.payload({ message: 'wrong schema' });
  await assert.rejects(() => s.source.get(query({})), /unavailable/);
  s.fail(503);
  await assert.rejects(() => s.source.get(query({})), /unavailable/);
  s.fail(false); s.payload(empty);
  assert.equal((await s.source.get(query({}))).total, 0);
});

test('edge cache preserves valid inventory across service instances and cache failures do not break live results', async () => {
  const entries = new Map();
  const cache = { match: async key => entries.get(key)?.clone(), put: async (key, response) => { entries.set(key, response.clone()); } };
  await setup({ cache }).source.get(query({}));
  const other = setup({ cache }); other.fail(503);
  assert.equal((await other.source.get(query({}))).events.length, 1); assert.equal(other.calls.length, 0);
  const brokenCache = { match: async () => { throw new Error('cache unavailable'); }, put: async () => { throw new Error('cache full'); } };
  assert.equal((await setup({ cache: brokenCache }).source.get(query({}))).events.length, 1);
});

test('a rotated public search key triggers discovery again on manual retry', async () => {
  const s = setup(); s.fail(401);
  await assert.rejects(() => s.source.get(query({})));
  s.fail(false); await s.source.get(query({}));
  assert.equal(s.calls.filter(url => url.endsWith('/en/affiliate-plugin')).length, 2);
});

test('public failure details distinguish discovery and search errors without exposing supplier bodies or keys', async () => {
  const cases = [
    [setup({ configStatus: 403 }), { code: 'TN_CONFIG_PAGE_HTTP', upstreamStatus: 403 }],
    [setup({ scriptStatus: 502 }), { code: 'TN_CONFIG_SCRIPT_HTTP', upstreamStatus: 502 }],
    [setup(), { code: 'TN_SEARCH_HTTP', upstreamStatus: 503 }]
  ];
  cases[2][0].fail(503);
  for (const [s, details] of cases) {
    await assert.rejects(() => s.source.get(query({})), error => {
      assert.deepEqual(ticketNetworkFailureDetails(error), details);
      assert.ok(!JSON.stringify(ticketNetworkFailureDetails(error)).includes(fakeKey));
      return true;
    });
  }
  const malformed = setup(); malformed.payload({ leaked: fakeKey });
  await assert.rejects(() => malformed.source.get(query({})), error => {
    assert.deepEqual(ticketNetworkFailureDetails(error), { code: 'TN_SEARCH_FORMAT' });
    return true;
  });
  assert.deepEqual(ticketNetworkFailureDetails(new Error(`fetch failed: ${fakeKey}`)), { code: 'TN_SOURCE_UNAVAILABLE' });
});
