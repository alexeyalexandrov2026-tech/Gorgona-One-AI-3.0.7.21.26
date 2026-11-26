import test from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const { isOpenAirBooking, detectWeatherOverlap, buildProactiveCarePromptLine } = load('lib/ai/proactiveCare.mjs');
const { modelMessages } = load('lib/ai/workersBrain.mjs');
const { getPageContext } = load('lib/ai/stage2Copy.mjs');
const { loadGuestAccountMemory } = load('lib/server/guestMemory.mjs');

test('Wave 2C: proactiveCare detects convertible rain overlap and produces hardtop/SUV Plan B hint', () => {
  assert.deepEqual(isOpenAirBooking({ title: 'Mercedes-Benz AMG CLE 53 Cabriolet', kind: 'car' }), { openAir: true, isConvertible: true });
  assert.deepEqual(isOpenAirBooking({ title: 'Rolls-Royce Cullinan', kind: 'car' }), { openAir: false, isConvertible: false });
  assert.deepEqual(isOpenAirBooking({ title: '70ft Azimut Yacht', kind: 'yacht' }), { openAir: true, isConvertible: false });

  const forecast = [
    { date: '2026-12-01', name: 'Tuesday', tempC: 26, tempF: 79, rainChance: 15, shortForecast: 'Sunny' },
    { date: '2026-12-02', name: 'Wednesday', tempC: 24, tempF: 75, rainChance: 70, shortForecast: 'Showers and Thunderstorms' }
  ];

  const overlap = detectWeatherOverlap(
    [{ title: 'Mercedes-Benz AMG CLE 53 Cabriolet', kind: 'car', status: 'pending', dates: '2026-12-01 → 2026-12-03' }],
    forecast
  );
  assert.ok(overlap);
  assert.equal(overlap.isConvertible, true);
  assert.equal(overlap.date, '2026-12-02');
  assert.equal(overlap.rainChance, 70);

  const line = buildProactiveCarePromptLine({
    memory: {
      activeBookings: [{ title: 'Mercedes-Benz AMG CLE 53 Cabriolet', kind: 'car', status: 'pending', dates: '2026-12-01 → 2026-12-03' }]
    },
    forecastPeriods: forecast
  });
  assert.match(line, /Proactive VIP care:.*70% rain.*2026-12-02.*Cabriolet.*hardtop\/luxury SUV swap/i);
  assert.ok(line.length <= 260);

  const msgs = modelMessages(
    [{ role: 'user', content: 'Проверь мои брони в Майами' }],
    'ru',
    { proactiveCareLine: line }
  );
  assert.ok(msgs[0].content.includes(line));
});

test('Wave 2C: proactiveCare handles pending ESIGN quotes and returning VIP taste recall with zero PII', () => {
  const esignLine = buildProactiveCarePromptLine({
    memory: { pendingEsign: 2, activeBookings: [] },
    forecastPeriods: []
  });
  assert.match(esignLine, /2 quote\(s\) awaiting ESIGN\/payment/);

  const tasteLine = buildProactiveCarePromptLine({
    memory: null,
    forecastPeriods: [],
    profile: { datesMentioned: false },
    savedPrefs: { neighborhood: 'Brickell', airport: 'MIA', dietaryOrCuisine: ['sushi'] }
  });
  assert.match(tasteLine, /VIP taste memory:.*Brickell.*MIA.*sushi/);

  const emptyLine = buildProactiveCarePromptLine({});
  assert.equal(emptyLine, '');
});

test('Wave 2C: loadGuestAccountMemory preserves structured zero-PII activeBookings with dates', async () => {
  const fetcher = async (url) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      return Response.json({ id: '11111111-1111-4111-8111-111111111111', email: 'vip@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' });
    }
    if (u.includes('/rest/v1/profiles')) {
      return Response.json([{ id: '11111111-1111-4111-8111-111111111111', role: 'user' }]);
    }
    if (u.includes('/rest/v1/favorites')) {
      return Response.json([{ kind: 'dining', slug: 'komodo', title: 'Komodo' }]);
    }
    if (u.includes('/rest/v1/bookings')) {
      return Response.json([
        { item_title: 'Ferrari Portofino Spider', dates: '2026-12-02 → 2026-12-04', status: 'reviewing', kind: 'car' }
      ]);
    }
    if (u.includes('/rest/v1/rpc/payment_quote_list_for_customer')) {
      return Response.json({ quotes: [] });
    }
    return Response.json([]);
  };

  const memory = await loadGuestAccountMemory(
    new Request('https://gorgona-one.com/api/chat', {
      headers: { Authorization: 'Bearer ' + 'a'.repeat(40) }
    }),
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key'
    },
    fetcher
  );
  assert.ok(memory);
  assert.equal(memory.activeBookings.length, 1);
  assert.equal(memory.activeBookings[0].title, 'Ferrari Portofino Spider');
  assert.equal(memory.activeBookings[0].dates, '2026-12-02 → 2026-12-04');
  assert.equal(memory.bookings[0], 'Ferrari Portofino Spider (reviewing)');
});

test('Wave 2C: /trip Live Trip Room gets contextual proactive starters in EN, RU, ES, UK without concierge wording', () => {
  for (const locale of ['en', 'ru', 'es', 'uk']) {
    const ctx = getPageContext('/trip', locale);
    assert.ok(ctx, `missing /trip pageContext for ${locale}`);
    assert.equal(ctx.title, 'Live Trip Room');
    assert.equal(ctx.prompts.length, 4);
    assert.doesNotMatch(JSON.stringify(ctx), /\bconcierge\b|консьерж/i);
  }
});
