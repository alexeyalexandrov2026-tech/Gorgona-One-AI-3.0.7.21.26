import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import load from './load.cjs';

const {
  parseBookingDateRange,
  rangesOverlap,
  computeRentalDays,
  checkCarAvailability,
  batchCheckCarAvailability
} = load('lib/server/fleetAvailability.mjs');
const {
  MCP_PROTOCOL_VERSION,
  MCP_TOOLS,
  mcpHandlers,
  resetMcpRateLimitForTests
} = load('lib/server/mcpServer.mjs');
const { getConciergeMetricsSnapshot, resetConciergeMetrics } = load('lib/server/conciergeTelemetry.mjs');

const read = (rel) => fs.readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

test('Stage 1A fleetAvailability parses date strings, detects live Supabase overlaps with zero PII, and calculates Split-Pay', async () => {
  assert.deepEqual(parseBookingDateRange('2026-12-05 → 2026-12-08, MIA airport'), { from: '2026-12-05', to: '2026-12-08' });
  assert.deepEqual(parseBookingDateRange('Nov 1 – Nov 3, 2026'), { from: '2026-11-01', to: '2026-11-03' });
  assert.deepEqual(parseBookingDateRange('2026-12-10'), { from: '2026-12-10', to: '2026-12-10' });
  assert.equal(parseBookingDateRange('next weekend'), null);

  assert.equal(rangesOverlap({ from: '2026-12-05', to: '2026-12-08' }, { from: '2026-12-07', to: '2026-12-10' }), true);
  assert.equal(rangesOverlap({ from: '2026-12-05', to: '2026-12-06' }, { from: '2026-12-07', to: '2026-12-09' }), false);
  assert.equal(computeRentalDays('2026-12-05', '2026-12-08'), 3);

  const queries = [];
  const fakeFetch = async (url) => {
    queries.push(String(url));
    return new Response(
      JSON.stringify([
        { item_slug: 'sunset-2023-lamborghini-urus', dates: '2026-12-06 to 2026-12-09', status: 'responded' }
      ]),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  };
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key'
  };

  // Busy overlapping window returns alternatives + verified multi-day & Split-Pay pricing
  const busy = await checkCarAvailability(
    { slug: 'sunset-2023-lamborghini-urus', from: '2026-12-05', to: '2026-12-08', guests: 4 },
    env,
    fakeFetch
  );
  assert.equal(busy.found, true);
  assert.equal(busy.availability.status, 'busy');
  assert.equal(busy.availability.liveCalendarChecked, true);
  assert.equal(busy.availability.conflictsCount, 1);
  assert.equal(busy.pricing.days, 3);
  assert.equal(busy.pricing.dailyRateUsd, 1100);
  assert.equal(busy.pricing.estimatedTotalUsd, 3300);
  assert.equal(busy.pricing.perGuestUsd, Math.ceil(3300 / 4));
  assert.equal(busy.alternatives.length, 3);
  assert.ok(queries[0].includes('select=item_slug,dates,status'), 'must select strictly zero-PII columns');
  assert.doesNotMatch(queries[0], /client_email|client_phone|client_name/);

  // Non-overlapping window returns available
  const avail = await checkCarAvailability(
    { slug: 'sunset-2023-lamborghini-urus', from: '2026-12-15', to: '2026-12-18' },
    env,
    fakeFetch
  );
  assert.equal(avail.availability.status, 'available');
  assert.equal(avail.availability.conflictsCount, 0);

  // Batch check works in one call for Stage 1B chat agent
  const batch = await batchCheckCarAvailability(
    ['sunset-2023-lamborghini-urus', 'bmw-x5-white-brown'],
    { from: '2026-12-05', to: '2026-12-08' },
    env,
    fakeFetch
  );
  assert.equal(batch.checked, true);
  assert.equal(batch.statuses.get('sunset-2023-lamborghini-urus'), 'busy');
  assert.equal(batch.statuses.get('bmw-x5-white-brown'), 'available');
});

test('Stage 1A MCP Server implements JSON-RPC 2.0 handshake, tools, resources, telemetry, and security boundaries', async () => {
  resetMcpRateLimitForTests();
  resetConciergeMetrics();

  const rpcCalls = [];
  const fakeFetch = async (url, init) => {
    const s = String(url);
    rpcCalls.push({ url: s, method: init?.method || 'GET', body: init?.body });
    if (s.includes('/rest/v1/bookings?')) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (s.includes('/rest/v1/rpc/dashboard_submit')) {
      return new Response(
        JSON.stringify({ success: true, bookingId: '55555555-5555-4555-8555-555555555555', replayed: false }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    if (s.includes('/rest/v1/rpc/booking_record_consent')) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const env = {
    APP_ENV: 'production',
    PLAN_REQUESTS_ENABLED: 'true',
    DINING_SCHEMA_ENABLED: 'true',
    DINING_REQUESTS_ENABLED: 'true',
    NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-test',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
    BOOKING_RATE_SECRET: '0123456789abcdef0123456789abcdef0123456789'
  };

  const handler = mcpHandlers(env, fakeFetch, () => 1700000000000);
  const postRpc = (payload, extraHeaders = {}) =>
    handler.post(
      new Request('https://gorgona-one.com/api/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': '203.0.113.42',
          ...extraHeaders
        },
        body: typeof payload === 'string' ? payload : JSON.stringify(payload)
      })
    );

  // GET discovery + OPTIONS CORS
  const discRes = handler.discovery();
  assert.equal(discRes.status, 200);
  assert.equal(discRes.headers.get('access-control-allow-origin'), '*');
  const disc = await discRes.json();
  assert.equal(disc.protocolVersion, MCP_PROTOCOL_VERSION);
  assert.equal(disc.tools.length, MCP_TOOLS.length);

  const optRes = handler.options();
  assert.equal(optRes.status, 204);
  assert.match(optRes.headers.get('access-control-allow-methods') || '', /POST/);

  // initialize + notifications/initialized + ping
  const initRes = await postRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } });
  const init = await initRes.json();
  assert.equal(init.result.protocolVersion, '2025-03-26');
  assert.equal(init.result.serverInfo.name, 'miami-elio');
  assert.doesNotMatch(JSON.stringify(init), /\bconcierge\b|250 174th|ALEXEY AAA/i);

  const notifRes = await postRpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(notifRes.status, 202);

  const pingRes = await postRpc({ jsonrpc: '2.0', id: 2, method: 'ping' });
  assert.deepEqual((await pingRes.json()).result, {});

  // tools/list & resources/read
  const listRes = await postRpc({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  const list = await listRes.json();
  assert.equal(list.result.tools.length, 6);
  assert.doesNotMatch(JSON.stringify(list), /\bconcierge\b/i);

  const overviewRes = await postRpc({ jsonrpc: '2.0', id: 4, method: 'resources/read', params: { uri: 'miami-elio://catalog/overview' } });
  const overview = JSON.parse((await overviewRes.json()).result.contents[0].text);
  assert.ok(overview.inventory.luxuryCars >= 250);
  assert.equal(overview.languagesSupported.length, 16);

  const brandsRes = await postRpc({ jsonrpc: '2.0', id: 5, method: 'resources/read', params: { uri: 'miami-elio://catalog/brands' } });
  const brands = JSON.parse((await brandsRes.json()).result.contents[0].text);
  assert.ok(brands.brands.some((b) => b.brand === 'Lamborghini' && b.vehicles >= 50));

  // tools/call: search_luxury_cars
  const carSearchRes = await postRpc({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: 'search_luxury_cars', arguments: { brand: 'Lamborghini', maxDailyUsd: 1600, sort: 'price-asc', limit: 4 } }
  });
  const carSearch = (await carSearchRes.json()).result.structuredContent;
  assert.ok(carSearch.cars.length > 0 && carSearch.cars.length <= 4);
  assert.ok(carSearch.cars.every((c) => c.brand === 'Lamborghini' && c.dailyRateUsd <= 1600));

  // tools/call: check_car_availability
  const availRes = await postRpc({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name: 'check_car_availability', arguments: { slug: 'lamborghini-urus-se', from: '2026-12-20', to: '2026-12-23', guests: 4 } }
  });
  const avail = (await availRes.json()).result.structuredContent;
  assert.equal(avail.availability.status, 'available');
  assert.equal(avail.pricing.days, 3);
  assert.equal(avail.pricing.splitWays, 4);

  // tools/call: search_miami_dining
  const dineRes = await postRpc({
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/call',
    params: { name: 'search_miami_dining', arguments: { query: 'Komodo', limit: 3 } }
  });
  const dine = (await dineRes.json()).result.structuredContent;
  assert.ok(dine.venues.some((v) => /komodo/i.test(v.name)));

  // tools/call: build_miami_itinerary
  const planRes = await postRpc({
    jsonrpc: '2.0',
    id: 9,
    method: 'tools/call',
    params: { name: 'build_miami_itinerary', arguments: { brief: 'Lamborghini Urus for 3 days and dinner in Brickell for 4 guests', locale: 'en' } }
  });
  const planData = (await planRes.json()).result.structuredContent;
  assert.equal(planData.matched, true);
  assert.ok(planData.plan.sections.length >= 1);

  // tools/call: submit_booking_request rejects without termsAccepted: true
  const noTermsRes = await postRpc({
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: {
      name: 'submit_booking_request',
      arguments: {
        kind: 'car',
        itemSlug: 'lamborghini-urus-se',
        dates: '2026-12-20 to 2026-12-23',
        name: 'Alex Test',
        email: 'alex@example.com',
        phone: '+13055550199',
        termsAccepted: false
      }
    }
  });
  assert.equal((await noTermsRes.json()).result.isError, true);

  // tools/call: submit_booking_request succeeds with explicit consent and routes to dashboard_submit
  const bookRes = await postRpc({
    jsonrpc: '2.0',
    id: 11,
    method: 'tools/call',
    params: {
      name: 'submit_booking_request',
      arguments: {
        kind: 'car',
        itemSlug: 'lamborghini-urus-se',
        dates: '2026-12-20 to 2026-12-23',
        name: 'Alex Test',
        email: 'alex@example.com',
        phone: '+13055550199',
        termsAccepted: true
      }
    }
  });
  const bookData = (await bookRes.json()).result.structuredContent;
  assert.equal(bookData.submitted, true);
  assert.equal(bookData.bookingId, '55555555-5555-4555-8555-555555555555');
  assert.equal(bookData.tripRoomUrl, 'https://gorgona-one.com/trip');

  // Telemetry captured all MCP calls
  const snap = getConciergeMetricsSnapshot();
  assert.ok(snap.mcp.calls >= 6);
  assert.equal(snap.mcp.byTool.search_luxury_cars, 1);
  assert.equal(snap.mcp.byTool.submit_booking_request, 2);

  // Security: invalid JSON & rate limit
  const badJson = await postRpc('{not valid json');
  assert.equal(badJson.status, 400);
  const badMethod = await postRpc({ jsonrpc: '2.0', id: 99, method: 'admin/delete_all' });
  assert.equal((await badMethod.json()).error.code, -32601);

  for (let i = 0; i < 65; i += 1) {
    const r = await postRpc({ jsonrpc: '2.0', id: 200 + i, method: 'ping' }, { 'cf-connecting-ip': '198.51.100.88' });
    if (i < 60) assert.equal(r.status, 200);
    else assert.equal(r.status, 429);
  }
});

test('Stage 1A discovery files (/.well-known/mcp.json and /llms.txt) are valid and brand-compliant', () => {
  const manifestRaw = read('public/.well-known/mcp.json');
  const manifest = JSON.parse(manifestRaw);
  assert.equal(manifest.name, 'miami-elio');
  assert.equal(manifest.transport.endpoint, 'https://gorgona-one.com/api/mcp');
  assert.deepEqual(manifest.tools, MCP_TOOLS.map((t) => t.name));
  assert.equal(manifest.languages.length, 16);
  assert.doesNotMatch(manifestRaw, /\bconcierge\b|250 174th|ALEXEY AAA/i);

  const llms = read('public/llms.txt');
  assert.match(llms, /https:\/\/gorgona-one\.com\/api\/mcp/);
  assert.match(llms, /https:\/\/gorgona-one\.com\/\.well-known\/mcp\.json/);
});
