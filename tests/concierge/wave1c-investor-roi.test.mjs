import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import load from './load.cjs';

const { persistTelemetryEvent, resetConciergeMetrics } = load('lib/server/conciergeTelemetry.mjs');
const { mcpHandlers, resetMcpRateLimitForTests } = load('lib/server/mcpServer.mjs');
const { dashboardHandlers } = load('lib/server/dashboardHandlers.mjs');
const { planHandlers } = load('lib/server/planHandlers.mjs');
const { getAnalyticsCopy } = load('lib/ai/analyticsCopy.mjs');
const { getRentals } = load('lib/rentalsData.js');

const ROOT = process.cwd();

function makeEnv(extra = {}) {
  return {
    APP_ENV: 'development',
    PLAN_REQUESTS_ENABLED: 'true',
    BOOKING_RATE_SECRET: '0123456789abcdef0123456789abcdef',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-test-key',
    ...extra
  };
}

test('Wave 1C: persistTelemetryEvent supports mcp_call, ai_booking, and ai_quote_paid with amountCents', async () => {
  const captured = [];
  const fetcher = async (url, init) => {
    captured.push({ url: String(url), body: JSON.parse(init.body) });
    return new Response(null, { status: 201 });
  };

  const ok1 = await persistTelemetryEvent({
    eventType: 'mcp_call',
    platform: 'mcp',
    action: 'mcp:search_luxury_cars',
    latencyMs: 42
  }, makeEnv(), fetcher);
  assert.equal(ok1, true);
  assert.equal(captured[0].body.event_type, 'mcp_call');
  assert.equal(captured[0].body.platform, 'mcp');
  assert.equal(captured[0].body.amount_cents, undefined);

  const ok2 = await persistTelemetryEvent({
    eventType: 'ai_quote_paid',
    platform: 'stripe',
    action: 'quote_paid',
    amountCents: 450000
  }, makeEnv(), fetcher);
  assert.equal(ok2, true);
  assert.equal(captured[1].body.event_type, 'ai_quote_paid');
  assert.equal(captured[1].body.amount_cents, 450000);
});

test('Wave 1C: MCP tool call persists event_type=mcp_call zero-PII telemetry', async () => {
  resetConciergeMetrics();
  resetMcpRateLimitForTests();
  const telemetryPosts = [];
  const fetcher = async (url, init) => {
    if (String(url).includes('/rest/v1/elio_telemetry_events')) {
      telemetryPosts.push(JSON.parse(init.body));
      return new Response(null, { status: 201 });
    }
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const handler = mcpHandlers(makeEnv(), fetcher);
  const res = await handler.post(new Request('https://gorgona-one.com/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.7' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'search_luxury_cars', arguments: { limit: 2 } }
    })
  }));
  assert.equal(res.status, 200);
  await new Promise((r) => setTimeout(r, 25));
  assert.ok(telemetryPosts.length >= 1, 'should persist mcp_call telemetry');
  assert.equal(telemetryPosts[0].event_type, 'mcp_call');
  assert.equal(telemetryPosts[0].platform, 'mcp');
  assert.equal(telemetryPosts[0].action, 'mcp:search_luxury_cars');
});

test('Wave 1C: dashboardHandlers.book records booking_attributions and ai_booking telemetry for elio_guide', async () => {
  const car = getRentals()[0];
  const calls = [];
  const bookingId = '11111111-1111-4111-8111-111111111111';
  const fetcher = async (url, init) => {
    const u = String(url);
    const body = init?.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, body });
    if (u.includes('/rest/v1/rpc/dashboard_submit')) {
      return new Response(JSON.stringify({ success: true, bookingId }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (u.includes('/rest/v1/rpc/booking_record_consent')) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(null, { status: 201 });
  };

  const handlers = dashboardHandlers(makeEnv(), fetcher);
  const res = await handlers.book(new Request('https://gorgona-one.com/api/book', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': '22222222-2222-4222-8222-222222222222',
      'cf-connecting-ip': '203.0.113.10',
      'user-agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({
      name: 'Guest Test',
      email: 'guest@example.com',
      phone: '+13055550199',
      dates: '2026-12-10 → 2026-12-13',
      itemSlug: car.slug,
      itemTitle: car.title,
      kind: 'car',
      termsAccepted: true,
      attribution: {
        utmSource: 'elio_guide',
        utmMedium: 'ai_chat',
        utmCampaign: 'inline_car_request'
      }
    })
  }));

  assert.equal(res.status, 200);
  const attrCall = calls.find((c) => c.url.includes('/rest/v1/booking_attributions'));
  assert.ok(attrCall, 'should insert booking_attributions row');
  assert.equal(attrCall.body.booking_id, bookingId);
  assert.equal(attrCall.body.utm_source, 'elio_guide');

  const telCall = calls.find((c) => c.url.includes('/rest/v1/elio_telemetry_events'));
  assert.ok(telCall, 'should persist ai_booking telemetry');
  assert.equal(telCall.body.event_type, 'ai_booking');
  assert.equal(telCall.body.platform, 'elio_guide');
});

test('Wave 1C: planHandlers.submit links every plan bookingId in booking_attributions and logs ai_booking', async () => {
  const car = getRentals()[0];
  const calls = [];
  const planId = '33333333-3333-4333-8333-333333333333';
  const b1 = '44444444-4444-4444-8444-444444444444';

  const fetcher = async (url, init) => {
    const u = String(url);
    const body = init?.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, body });
    if (u.includes('/rest/v1/rpc/dashboard_plan_receipt')) {
      return new Response(JSON.stringify(null), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (u.includes('/rest/v1/rpc/dashboard_submit_plan')) {
      return new Response(JSON.stringify({ success: true, planId, bookingIds: [b1] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(null, { status: 201 });
  };

  const handlers = planHandlers(
    makeEnv(),
    fetcher,
    async () => ({ title: car.title }),
    () => new Date('2026-11-26T15:00:00Z')
  );

  const res = await handlers.submit(new Request('https://gorgona-one.com/api/plan', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': '55555555-5555-4555-8555-555555555555',
      'cf-connecting-ip': '203.0.113.11',
      'user-agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({
      name: 'Plan Guest',
      email: 'plan@example.com',
      phone: '+13055550188',
      start: '2026-12-10',
      end: '2026-12-13',
      guests: 4,
      note: 'Split-Pay requested',
      items: [{ kind: 'car', slug: car.slug }],
      attribution: {
        utmSource: 'elio_guide',
        utmMedium: 'ai_chat',
        utmCampaign: 'elio_trip_plan'
      }
    })
  }));

  assert.equal(res.status, 200);
  const attrCall = calls.find((c) => c.url.includes('/rest/v1/booking_attributions'));
  assert.ok(attrCall, 'should link booking_attributions for plan bookingId');
  assert.equal(attrCall.body.booking_id, b1);
  assert.equal(attrCall.body.utm_source, 'elio_guide');

  const telCall = calls.find((c) => c.url.includes('/rest/v1/elio_telemetry_events'));
  assert.ok(telCall, 'should persist ai_booking telemetry for plan');
  assert.equal(telCall.body.event_type, 'ai_booking');
  assert.equal(telCall.body.action, 'plan');
});

test('Wave 1C: Android app plan submissions record first-party elio_android ROI attribution while skipping Meta CAPI', async () => {
  const car = getRentals()[0];
  const calls = [];
  const planId = '66666666-6666-4666-8666-666666666666';
  const b1 = '77777777-7777-4777-8777-777777777777';

  const fetcher = async (url, init) => {
    const u = String(url);
    const body = init?.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, body });
    if (u.includes('/rest/v1/rpc/dashboard_plan_receipt')) {
      return new Response(JSON.stringify(null), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (u.includes('/rest/v1/rpc/dashboard_submit_plan')) {
      return new Response(JSON.stringify({ success: true, planId, bookingIds: [b1] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(null, { status: 201 });
  };

  const handlers = planHandlers(
    { ...makeEnv(), META_PIXEL_ID: '1234567890', META_CAPI_TOKEN: 'EAAG_test_token' },
    fetcher,
    async () => ({ title: car.title }),
    () => new Date('2026-11-26T15:00:00Z')
  );

  const res = await handlers.submit(new Request('https://gorgona-one.com/api/plan', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': '88888888-8888-4888-8888-888888888888',
      'cf-connecting-ip': '203.0.113.12',
      'user-agent': 'MiamiElioApp/1.0'
    },
    body: JSON.stringify({
      name: 'Android Guest',
      email: 'android@example.com',
      phone: '+13055550199',
      start: '2026-12-10',
      end: '2026-12-13',
      guests: 2,
      note: 'Split-Pay requested',
      items: [{ kind: 'car', slug: car.slug }]
    })
  }));

  assert.equal(res.status, 200);
  const attrCall = calls.find((c) => c.url.includes('/rest/v1/booking_attributions'));
  assert.ok(attrCall, 'Android plan must record first-party elio_android attribution');
  assert.equal(attrCall.body.utm_source, 'elio_android');

  const telCall = calls.find((c) => c.url.includes('/rest/v1/elio_telemetry_events'));
  assert.ok(telCall, 'Android plan must record ai_booking telemetry');
  assert.equal(telCall.body.platform, 'elio_android');

  const funnelCall = calls.find((c) => c.url.includes('/rest/v1/funnel_events'));
  assert.ok(funnelCall, 'Android plan must record first-party funnel event');
  assert.equal(funnelCall.body.utm_source, 'elio_android');
  assert.equal(funnelCall.body.provider, 'elio_android_plan');

  assert.equal(calls.some((c) => c.url.includes('graph.facebook.com')), false, 'Android app must never trigger Meta CAPI');
});

test('Wave 1C: analyticsCopy provides localized Investor ROI labels without forbidden concierge wording', () => {
  const required = [
    'investorTitle', 'investorSubtitle', 'aiLeads30d', 'aiGmv30d', 'totalGmv30d',
    'mcpCalls30d', 'cacheSavings30d', 'estAiCost30d', 'feedbackPositive30d',
    'p95Latency30d', 'mcpToolsTitle', 'toolCol', 'callsCol'
  ];
  for (const locale of ['en', 'ru', 'es', 'uk']) {
    const copy = getAnalyticsCopy(locale);
    for (const key of required) {
      assert.ok(typeof copy[key] === 'string' && copy[key].length >= 3, `missing ${key} in ${locale}`);
    }
    const joined = Object.values(copy).join(' ').toLowerCase();
    assert.doesNotMatch(joined, /\bconcierge\b|консьерж/i, `forbidden wording in ${locale}`);
  }
});

test('Wave 1C: Supabase migration locks elio_investor_roi_30d strictly to service_role', () => {
  const sql = fs.readFileSync(
    path.join(ROOT, 'supabase', 'migrations', '20261126120000_elio_investor_roi_metrics.sql'),
    'utf8'
  );
  assert.match(sql, /create or replace function public\.elio_investor_roi_30d\(\)/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /revoke all on function public\.elio_investor_roi_30d\(\) from public, anon, authenticated;/i);
  assert.match(sql, /grant execute on function public\.elio_investor_roi_30d\(\) to service_role;/i);
  assert.match(sql, /'mcp_call',\s*'ai_booking',\s*'ai_quote_paid'/i);
  assert.match(sql, /from private\.payment_quotes pq/i);
  assert.match(sql, /left join public\.booking_attributions ba on ba\.booking_id = pq\.booking_id/i);
});
