import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

// Exercise the real Workers Request implementation: Node accepts redirect:
// "error", but workerd rejects it before calling the outbound service.
const bundled = await build({
  stdin: {
    resolveDir: fileURLToPath(new URL('../../', import.meta.url)),
    contents: `
      import { createTicketNetworkSource, ticketNetworkFailureDetails } from './lib/ticketnetworkSource.js';
      import { parseTicketNetworkQuery } from './lib/ticketnetworkSearch.js';
      const source = createTicketNetworkSource();
      export default { async fetch() {
        try {
          const query = parseTicketNetworkQuery(new URLSearchParams('category=nba'), new Date('2026-10-20T12:00:00Z'));
          return Response.json(await source.get(query));
        } catch (error) { return Response.json(ticketNetworkFailureDetails(error), { status: 503 }); }
      } };
    `
  },
  bundle: true, write: false, platform: 'browser', format: 'esm'
});
const script = bundled.outputFiles[0].text;
const fakeKey = 'public_worker_test_configuration_only_1234';
const urls = [
  'https://www.ticketnetwork.com/en/affiliate-plugin',
  'https://www.ticketnetwork.com/_next/static/chunks/current-search.js',
  'https://example-1.a1.typesense.net/collections/Event/documents/search'
];

async function run(redirectAt = -1) {
  const calls = [];
  const worker = new Miniflare({
    modules: true, script, compatibilityDate: '2026-07-11',
    outboundService(request) {
      const url = new URL(request.url);
      const address = `${url.origin}${url.pathname}`;
      calls.push(address);
      const index = urls.indexOf(address);
      assert.notEqual(index, -1, 'no request may leave the validated supplier origins');
      if (index === redirectAt) return new Response('moved', { status: 302, headers: { Location: 'https://untrusted.test/capture' } });
      if (index === 0) return new Response('<script src="/_next/static/chunks/current-search.js"></script>');
      if (index === 1) return new Response(`x-typesense-api-key /collections/ dev:{host:"example-1.a1.typesense.net",apiKey:"${fakeKey}"}`);
      assert.equal(request.headers.get('X-TYPESENSE-API-KEY'), fakeKey);
      return Response.json({ found: 1, hits: [{ document: {
        event_id: 123, event_name: 'SYNTHETIC Worker fixture',
        event_local_timestamp: Date.parse('2026-11-01T19:00:00Z') / 1000,
        venue_name: 'TEST venue', venue_city: 'Miami', venue_state_province_short: 'FL'
      } }], facet_counts: [] });
    }
  });
  try {
    const response = await worker.dispatchFetch('https://portal.test/api/events/ticketnetwork');
    const data = await response.json();
    assert.ok(!JSON.stringify(data).includes(fakeKey));
    return { status: response.status, data, calls };
  } finally { await worker.dispose(); }
}

test('native Workers requests discover configuration and return a real-shaped catalogue', { timeout: 20000 }, async () => {
  const result = await run();
  assert.equal(result.status, 200);
  assert.equal(result.data.total, 1);
  assert.equal(result.data.events[0].name, 'SYNTHETIC Worker fixture');
  assert.deepEqual(result.calls, urls);
});

test('native Workers rejects supplier redirects at every stage without following Location', { timeout: 30000 }, async () => {
  const stages = ['CONFIG_PAGE', 'CONFIG_SCRIPT', 'SEARCH'];
  for (let index = 0; index < stages.length; index++) {
    const result = await run(index);
    assert.equal(result.status, 503);
    assert.deepEqual(result.data, { code: `TN_${stages[index]}_HTTP`, upstreamStatus: 302 });
    assert.deepEqual(result.calls, urls.slice(0, index + 1));
  }
});
