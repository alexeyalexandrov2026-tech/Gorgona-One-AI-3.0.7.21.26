import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import load from './load.cjs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { emailPlanHandlers, resetEmailPlanRateLimitForTests } from '../../lib/server/emailPlanHandler.mjs';
import { conciergeCopy } from '../../lib/ai/conciergeCopy.mjs';

const {
  askAboutCarCopy,
  buildManagerHandoffUrl,
  enrichPartnerBookingUrl,
  getPageContext,
  getStage2Copy
} = load('lib/ai/stage2Copy.mjs');
const { quickRepliesForTurn } = load('lib/ai/quickReplies.mjs');

const read = (rel) => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

test('Stage 2 copy covers all 16 supported locales with zero concierge leakage', () => {
  for (const { code } of SUPPORTED_LANGUAGES) {
    const copy = getStage2Copy(code);
    assert.ok(copy.viewing && copy.askAboutCar && copy.sendPlanCount && copy.quickRequest && copy.emailItinerary, code);
    assert.equal(copy.carContextPrompts.length, 4, `${code} carContextPrompts`);
    assert.equal(copy.venueContextPrompts.length, 4, `${code} venueContextPrompts`);
    assert.doesNotMatch(JSON.stringify(copy), /\bconcierge\b|консьерж/i, `${code} brand check`);
  }
});

test('Stage 2 page context awareness resolves cars, restaurants, yachts and villas with 4 situational starters', () => {
  const carCtx = getPageContext('/rentals/lamborghini-urus-se', 'ru');
  assert.ok(carCtx);
  assert.equal(carCtx.kind, 'car');
  assert.match(carCtx.title, /Urus/i);
  assert.equal(carCtx.prompts.length, 4);
  assert.ok(carCtx.prompts.every((p) => p.includes(carCtx.title)));

  const venueCtx = getPageContext('/restaurants-nightlife/komodo-miami', 'en');
  assert.ok(venueCtx);
  assert.equal(venueCtx.kind, 'dining');
  assert.match(venueCtx.title, /Komodo/i);
  assert.equal(venueCtx.prompts.length, 4);

  const yachtCtx = getPageContext('/yachts', 'ru');
  assert.ok(yachtCtx);
  assert.equal(yachtCtx.kind, 'section');
  assert.equal(yachtCtx.prompts.length, 4);

  const villaCtx = getPageContext('/vacation-rentals', 'en');
  assert.ok(villaCtx);
  assert.equal(villaCtx.prompts.length, 4);

  assert.equal(getPageContext('/', 'en'), null);
  assert.equal(getPageContext('/discovery', 'en'), null);

  const carAsk = askAboutCarCopy('ru', 'Lamborghini Urus SE');
  assert.match(carAsk.label, /ELIO/);
  assert.match(carAsk.prompt, /Lamborghini Urus SE/);
});

test('Stage 2 quickRepliesForTurn skips already-captured TripProfile dimensions', () => {
  const qHood = conciergeCopy.en.questions.neighborhood;
  const withoutProfile = quickRepliesForTurn({
    reply: `Great options in Miami. ${qHood}`,
    cards: [{ href: '/restaurants-nightlife' }],
    locale: 'en'
  });
  assert.ok(withoutProfile.some((c) => c.includes('Brickell')));

  const withHood = quickRepliesForTurn({
    reply: `Great options in Miami. ${qHood}`,
    cards: [{ href: '/restaurants-nightlife' }],
    locale: 'en',
    profile: { neighborhood: 'Brickell', guests: null, dateRange: null }
  });
  assert.ok(!withHood.some((c) => c.includes('Brickell')), 'Must not re-ask neighborhood when TripProfile already knows Brickell');

  const qGroup = conciergeCopy.en.questions.group;
  const withGuests = quickRepliesForTurn({
    reply: `Sounds great! ${qGroup}`,
    cards: [{ href: '/yachts' }],
    locale: 'en',
    profile: { guests: 8, dateRange: null, neighborhood: null }
  });
  assert.ok(!withGuests.some((c) => /For \d+ guests/i.test(c)), 'Must not re-ask group size when guests=8 is already captured');
});

test('Stage 2 smart handoff pre-fills Telegram/WhatsApp with TripProfile, page context and picks', () => {
  const plain = buildManagerHandoffUrl({ baseHref: 'https://t.me/MIAMI_ELIO', locale: 'en' });
  assert.equal(plain, 'https://t.me/MIAMI_ELIO');

  const plainWa = buildManagerHandoffUrl({
    baseHref: 'https://wa.me/message/VO7GCPZCDKRZO1',
    textBaseHref: 'https://wa.me/17864928880',
    locale: 'en'
  });
  assert.equal(plainWa, 'https://wa.me/message/VO7GCPZCDKRZO1');

  const enrichedWa = buildManagerHandoffUrl({
    baseHref: 'https://wa.me/message/VO7GCPZCDKRZO1',
    textBaseHref: 'https://wa.me/17864928880',
    locale: 'en',
    pageContext: { title: 'Lamborghini Urus SE' }
  });
  const parsedWa = new URL(enrichedWa);
  assert.equal(parsedWa.origin + parsedWa.pathname, 'https://wa.me/17864928880');
  assert.match(parsedWa.searchParams.get('text') || '', /Lamborghini Urus SE/);

  const enriched = buildManagerHandoffUrl({
    baseHref: 'https://t.me/MIAMI_ELIO',
    locale: 'ru',
    pageContext: { title: 'Lamborghini Urus SE' },
    profile: { guests: 4, neighborhood: 'Brickell', maxDailyBudget: 1500, dateRange: { from: '2026-12-05', to: '2026-12-08' } },
    listings: [{ title: 'Lamborghini Urus SE' }, { title: 'Komodo' }],
    messages: [{ role: 'user', content: 'Нужен Urus на 3 дня и ужин в Brickell' }]
  });
  const parsed = new URL(enriched);
  assert.equal(parsed.origin + parsed.pathname, 'https://t.me/MIAMI_ELIO');
  const text = parsed.searchParams.get('text') || '';
  assert.match(text, /Lamborghini Urus SE/);
  assert.match(text, /2026-12-05/);
  assert.match(text, /Brickell/);
  assert.match(text, /Komodo/);
});

test('Stage 2 partner URL enrichment appends dates/guests while keeping affiliate parameters', () => {
  const profile = { guests: 6, neighborhood: 'Brickell', dateRange: { from: '2026-12-10', to: '2026-12-13' } };

  const stay = new URL(enrichPartnerBookingUrl({ platform: 'stay22', href: 'https://www.stay22.com/embed/gm?aid=gorgonaone' }, profile));
  assert.equal(stay.searchParams.get('aid'), 'gorgonaone');
  assert.equal(stay.searchParams.get('checkin'), '2026-12-10');
  assert.equal(stay.searchParams.get('checkout'), '2026-12-13');
  assert.equal(stay.searchParams.get('guests'), '6');

  const yatr = new URL(enrichPartnerBookingUrl({ platform: 'yatr', href: 'https://yatr.co?ref=MIAMI-ELIO-GORGONA-ONE' }, profile));
  assert.equal(yatr.searchParams.get('ref'), 'MIAMI-ELIO-GORGONA-ONE');
  assert.equal(yatr.searchParams.get('date'), '2026-12-10');
  assert.equal(yatr.searchParams.get('guests'), '6');

  const viator = new URL(enrichPartnerBookingUrl({ platform: 'viator', href: 'https://www.viator.com/tours/Miami/123?pid=P00293572' }, profile));
  assert.equal(viator.searchParams.get('pid'), 'P00293572');
  assert.equal(viator.searchParams.get('startDate'), '2026-12-10');
  assert.equal(viator.searchParams.get('endDate'), '2026-12-13');
});

test('Stage 2 POST /api/concierge/email-plan validates origin/payload, respects rate limits and sends via Resend', async () => {
  resetEmailPlanRateLimitForTests();
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: 're_test_123' }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const env = {
    APP_ENV: 'production',
    RESEND_API_KEY: 're_live_mock',
    NOTIFICATIONS_FROM_EMAIL: 'ELIO <hello@gorgona-one.com>'
  };
  const handler = emailPlanHandlers(env, fakeFetch, () => 1700000000000);

  // Reject cross-origin requests
  const badOrigin = await handler.send(new Request('https://gorgona-one.com/api/concierge/email-plan', {
    method: 'POST',
    headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'vip@example.com', planText: 'MIAMI ELIO itinerary with Komodo and Urus SE.' })
  }));
  assert.equal(badOrigin.status, 403);

  // Reject invalid email
  const badEmail = await handler.send(new Request('https://gorgona-one.com/api/concierge/email-plan', {
    method: 'POST',
    headers: { origin: 'https://gorgona-one.com', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', planText: 'MIAMI ELIO itinerary with Komodo and Urus SE.' })
  }));
  assert.equal(badEmail.status, 400);

  // Accept valid same-origin request and send via Resend
  const okRes = await handler.send(new Request('https://gorgona-one.com/api/concierge/email-plan', {
    method: 'POST',
    headers: { origin: 'https://gorgona-one.com', 'cf-connecting-ip': '203.0.113.10', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'vip@example.com', planText: 'MIAMI ELIO Plan:\n• Komodo: https://gorgona-one.com/restaurants-nightlife/komodo', locale: 'ru' })
  }));
  assert.equal(okRes.status, 200);
  assert.deepEqual(await okRes.json(), { sent: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');

  // Rate limit triggers after 3 requests in 15 min
  for (let i = 0; i < 2; i++) {
    const r = await handler.send(new Request('https://gorgona-one.com/api/concierge/email-plan', {
      method: 'POST',
      headers: { origin: 'https://gorgona-one.com', 'cf-connecting-ip': '203.0.113.10', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'vip@example.com', planText: 'MIAMI ELIO Plan:\n• Komodo: https://gorgona-one.com/restaurants-nightlife/komodo' })
    }));
    assert.equal(r.status, 200);
  }
  const limited = await handler.send(new Request('https://gorgona-one.com/api/concierge/email-plan', {
    method: 'POST',
    headers: { origin: 'https://gorgona-one.com', 'cf-connecting-ip': '203.0.113.10', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'vip@example.com', planText: 'MIAMI ELIO Plan:\n• Komodo: https://gorgona-one.com/restaurants-nightlife/komodo' })
  }));
  assert.equal(limited.status, 429);
});

test('Stage 2 UI wiring connects SaveButton, POST /api/plan, POST /api/book, and AskButton on car detail pages', () => {
  const actionCard = read('app/components/ai/AiActionCard.jsx');
  assert.match(actionCard, /import SaveButton from '\.\.\/SaveButton'/);
  assert.match(actionCard, /fetch\('\/api\/plan'/);
  assert.match(actionCard, /fetch\('\/api\/book'/);
  assert.match(actionCard, /href="\/trip"/);

  const carPage = read('app/rentals/[slug]/page.js');
  assert.match(carPage, /import AskButton from '\.\.\/\.\.\/components\/g1\/AskButton'/);
  assert.match(carPage, /askAboutCarCopy/);

  const conv = read('app/components/ai/AiConversation.jsx');
  assert.match(conv, /data-page-context="true"/);
  assert.match(conv, /\/api\/concierge\/email-plan/);
  assert.match(conv, /buildManagerHandoffUrl/);
});
