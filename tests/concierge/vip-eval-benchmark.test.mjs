// ===========================================================================
// Wave 7: 52-Scenario Multi-Turn VIP Concierge Eval Benchmark.
//
// End-to-end deterministic quality gate verifying:
//   A. Multi-turn VIP session memory, overrides & Stay22 URL enrichment (12)
//   B. Controlled Grounded NLG (v3) & Zero-Hallucination Fact Guard (16)
//   C. Full-ecosystem partner referrals, VIP day composer & Page-Aware (14)
//   D. 7-day NOAA forecast, 16-locale UX (thinking/chips/quick-replies)
//      & zero-PII admin telemetry + auth enforcement (10)
// ===========================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const {
  extractTripProfile,
  tripProfilePromptLine,
  buildStay22ReferralUrl,
  neighborhoodProximity
} = load('lib/ai/tripProfile.mjs');
const { missingQuestion } = load('lib/ai/conciergeReply.mjs');
const { groundedReply } = load('lib/ai/groundedReply.mjs');
const { validateGroundedReplyText } = load('lib/ai/factGuard.mjs');
const { buildFactPack, normalizePagePath, resolvePageEntity } = load('lib/ai/factPack.mjs');
const { listingCards, gatedListings } = load('lib/ai/listingCards.mjs');
const { formatForecastForPrompt, getMiamiForecast, clearForecastCache } = load('lib/ai/miamiForecast.mjs');
const { formatProfileChips } = load('lib/ai/profileChips.mjs');
const { quickRepliesForTurn } = load('lib/ai/quickReplies.mjs');
const { thinkingStatusForTurn, detectThinkingTopic } = load('lib/ai/thinkingStatus.mjs');
const {
  recordChatTurn,
  recordReferralClick,
  getConciergeMetricsSnapshot,
  resetConciergeMetrics
} = load('lib/server/conciergeTelemetry.mjs');
const { GET: metricsGet } = load('app/api/dashboard/concierge-metrics/route.js');
const { getAnalyticsCopy } = load('lib/ai/analyticsCopy.mjs');
const { SUPPORTED_LANGUAGES } = load('lib/languages.js');

const NOW = new Date('2026-11-22T15:00:00Z');

test('VIP Concierge Eval Benchmark: 52 multi-turn, guardrail, partner, forecast & telemetry scenarios pass 100%', async () => {
  let passed = 0;
  const check = (name, fn) => {
    fn();
    passed += 1;
  };

  // --- A. Multi-Turn VIP Session Memory & Overrides (12 scenarios) ---
  const fourTurnThread = [
    { role: 'user', content: 'Flying into MIA for 4 people in South Beach on Dec 5-7' },
    { role: 'assistant', content: 'Welcome to Miami.' },
    { role: 'user', content: 'Actually we are 6 guests staying in Brickell, car budget under $700/day' },
    { role: 'assistant', content: 'Updated to 6 guests in Brickell.' },
    { role: 'user', content: 'It is our anniversary; we love sushi but my wife does not eat seafood' }
  ];
  const prof = extractTripProfile(fourTurnThread, NOW);
  check('A01 guest count override 4->6', () => assert.equal(prof.guests, 6));
  check('A02 neighborhood override South Beach->Brickell', () => assert.equal(prof.neighborhood, 'Brickell'));
  check('A03 car budget extracted ($700)', () => assert.equal(prof.maxDailyBudget, 700));
  check('A04 airport MIA retained from turn 1', () => assert.equal(prof.airport, 'MIA'));
  check('A05 date range Dec 5-7 retained', () => assert.deepEqual(prof.dateRange, { from: '2026-12-05', to: '2026-12-07' }));
  check('A06 anniversary occasion extracted', () => assert.equal(prof.occasion, 'anniversary'));
  check('A07 sushi + no-seafood extracted without conflicting seafood', () => {
    assert.ok(prof.dietaryOrCuisine.includes('sushi'));
    assert.ok(prof.dietaryOrCuisine.includes('no-seafood'));
    assert.ok(!prof.dietaryOrCuisine.includes('seafood'));
  });
  check('A08 Stay22 URL injects checkin/checkout/guests & keeps aid=gorgonaone', () => {
    const u = new URL(buildStay22ReferralUrl(prof));
    assert.equal(u.searchParams.get('aid'), 'gorgonaone');
    assert.equal(u.searchParams.get('checkin'), '2026-12-05');
    assert.equal(u.searchParams.get('checkout'), '2026-12-07');
    assert.equal(u.searchParams.get('guests'), '6');
  });
  check('A09 missingQuestion suppresses already-supplied group/dates/neighborhood', () => {
    const sessionText = fourTurnThread.filter((m) => m.role === 'user').map((m) => m.content).join(' ');
    assert.equal(missingQuestion('group', 'Where should we eat?', sessionText), false);
    assert.equal(missingQuestion('dates', 'Where should we eat?', sessionText), false);
    assert.equal(missingQuestion('neighborhood', 'Where should we eat?', sessionText), false);
  });
  check('A10 Russian/Ukrainian family + FLL + halal profile', () => {
    const p2 = extractTripProfile([{ role: 'user', content: 'Прилетаем в FLL с детьми, нас пятеро, нужна халяль еда в Sunny Isles' }], NOW);
    assert.equal(p2.airport, 'FLL');
    assert.equal(p2.guests, 5);
    assert.equal(p2.occasion, 'family-kids');
    assert.equal(p2.hasKids, true);
    assert.equal(p2.neighborhood, 'Sunny Isles Beach');
    assert.ok(p2.dietaryOrCuisine.includes('halal'));
  });
  check('A11 Brickell proximity ranks Downtown/Key Biscayne closer than Kendall', () => {
    assert.ok(neighborhoodProximity('Brickell', 'Downtown Miami') > neighborhoodProximity('Brickell', 'Kendall'));
  });
  check('A12 tripProfilePromptLine stays compact and zero-PII', () => {
    const line = tripProfilePromptLine(prof);
    assert.ok(line.length > 30 && line.length <= 220);
    assert.match(line, /guests=6.*neighborhood=Brickell.*occasion=anniversary.*airport=MIA/);
  });

  // --- B. Controlled Grounded NLG (v3) & Zero-Hallucination Fact Guard (16 scenarios) ---
  const allowed = new Set([400, 700, 1300]);
  check('B01 v3 accepts verified comparison with exact prices & strips **bold**', () => {
    const res = groundedReply(JSON.stringify({
      version: 3,
      action: 'consult',
      sections: ['/rentals'],
      reply: '**Cadillac Escalade** ($400/день) лучше подходит для 5 человек с чемоданами, чем суперкар, и вписывается в бюджет до $700/день.'
    }), { messages: [{ role: 'user', content: 'Что лучше на 5 человек до $700?' }], locale: 'ru', allowedPrices: allowed });
    assert.ok(res && res.decidedBy === 'model');
    assert.doesNotMatch(res.reply, /\*\*/);
  });
  check('B02 v3 preserves stops on plan and attaches Viator/Headout cards', () => {
    const res = groundedReply(JSON.stringify({
      version: 3,
      action: 'plan',
      sections: ['/experiences'],
      stops: ['zoo-miami', 'everglades'],
      reply: 'Day 1: Zoo Miami in the cooler morning hours. Day 2: Everglades airboat adventure.'
    }), { messages: [{ role: 'user', content: '2 days with kids' }], locale: 'en', allowedPrices: new Set() });
    assert.deepEqual(res?.stops, ['zoo-miami', 'everglades']);
    const cards = gatedListings('2 days with kids', { locale: 'en', action: 'plan', sections: ['/experiences'], stops: res.stops });
    assert.ok(cards.some((c) => c.booking?.platform === 'headout') && cards.some((c) => c.booking?.platform === 'viator'));
  });
  check('B03 Fact Guard blocks invented USD price ($1,999)', () => {
    assert.equal(validateGroundedReplyText('You can charter this boat for $1,999 per afternoon.', { locale: 'en', allowedPrices: allowed }).ok, false);
  });
  check('B04 Fact Guard blocks invented EUR price (€550)', () => {
    assert.equal(validateGroundedReplyText('The tasting menu costs €550 per guest.', { locale: 'en', allowedPrices: allowed }).ok, false);
  });
  check('B05 Fact Guard blocks invented trailing currency (850 USD)', () => {
    assert.equal(validateGroundedReplyText('Expect to pay 850 USD for the evening transfer.', { locale: 'en', allowedPrices: allowed }).ok, false);
  });
  check('B06 Fact Guard allows $$$$ price tier symbols (not numeric prices)', () => {
    assert.equal(validateGroundedReplyText('LPM and Nuna in Brickell are $$$$ dining rooms suited for an anniversary.', { locale: 'en', allowedPrices: new Set() }).ok, true);
  });
  check('B07 Fact Guard blocks raw https URL', () => {
    assert.equal(validateGroundedReplyText('Reserve directly at https://unverified-broker.example for VIP seating.', { locale: 'en', allowedPrices: allowed }).ok, false);
  });
  check('B08 Fact Guard blocks markdown link', () => {
    assert.equal(validateGroundedReplyText('Open [Yachts](/yachts) to pick your boat today.', { locale: 'en', allowedPrices: allowed }).ok, false);
  });
  check('B09 Fact Guard blocks internal route path leak (/admin, /yachts)', () => {
    assert.equal(validateGroundedReplyText('Check /yachts or /admin for current availability.', { locale: 'en', allowedPrices: allowed }).ok, false);
  });
  check('B10 Fact Guard blocks phone numbers', () => {
    assert.equal(validateGroundedReplyText('Call our desk at +1 305-555-0144 to finalize.', { locale: 'en', allowedPrices: allowed }).ok, false);
  });
  check('B11 Fact Guard blocks email addresses', () => {
    assert.equal(validateGroundedReplyText('Email vip@fake-concierge.example with your card details.', { locale: 'en', allowedPrices: allowed }).ok, false);
  });
  check('B12 Fact Guard blocks English fake booking confirmation', () => {
    assert.equal(validateGroundedReplyText('I have booked your table at Komodo for 6 guests tonight.', { locale: 'en', allowedPrices: allowed }).ok, false);
  });
  check('B13 Fact Guard blocks Russian fake booking confirmation', () => {
    assert.equal(validateGroundedReplyText('Я уже забронировал столик в Komodo на шестерых.', { locale: 'ru', allowedPrices: allowed }).ok, false);
  });
  check('B14 Fact Guard blocks Spanish/French fake booking confirmation', () => {
    assert.equal(validateGroundedReplyText('He reservado tu mesa en Komodo para las ocho.', { locale: 'es', allowedPrices: allowed }).ok, false);
    assert.equal(validateGroundedReplyText("J'ai réservé votre yacht pour samedi matin.", { locale: 'fr', allowedPrices: allowed }).ok, false);
  });
  check('B15 Fact Guard blocks wrong script on non-Latin locales (ru/ja/ar/he/ko/zh)', () => {
    for (const loc of ['ru', 'uk', 'ar', 'fa', 'he', 'zh', 'ja', 'ko']) {
      assert.equal(validateGroundedReplyText('Komodo in Brickell is a popular upscale dinner venue.', { locale: loc, allowedPrices: allowed }).ok, false, loc);
    }
  });
  check('B16 Explicit booking request STILL forces handoff disclaimer over v3', () => {
    const res = groundedReply(JSON.stringify({
      version: 3,
      action: 'consult',
      sections: ['/yachts'],
      reply: 'Private yacht charters are ready for Saturday afternoon.'
    }), { messages: [{ role: 'user', content: 'Book this yacht now and charge my card' }], locale: 'en', allowedPrices: allowed });
    assert.equal(res?.handoff, true);
    assert.equal(res?.action, 'handoff');
    assert.match(res?.reply || '', /does not create or confirm reservations/);
  });

  // --- C. Full-Ecosystem Partner Referrals, VIP Day & Page-Aware (14 scenarios) ---
  check('C01 Bad Bunny -> clean TicketNetwork CJ artist search card', () => {
    const c = listingCards('Билеты на Bad Bunny', { locale: 'ru', sections: ['/events'] });
    assert.equal(c.length, 1);
    assert.equal(c[0].title, 'Bad Bunny — TicketNetwork');
    assert.equal(new URL(c[0].booking.href).searchParams.get('url'), 'https://www.ticketnetwork.com/search?q=Bad%20Bunny');
  });
  check('C02 Shakira concert -> clean TicketNetwork CJ artist search card', () => {
    const c = listingCards('Tickets for Shakira in Miami', { locale: 'en', sections: ['/events'] });
    assert.equal(c.length, 1);
    assert.equal(c[0].title, 'Shakira — TicketNetwork');
  });
  check('C03 Andrea Bocelli -> clean TicketNetwork CJ artist search card', () => {
    const c = listingCards('Концерт Andrea Bocelli в Майами', { locale: 'ru', sections: ['/events'] });
    assert.equal(c.length, 1);
    assert.equal(c[0].title, 'Andrea Bocelli — TicketNetwork');
  });
  check('C04 Helicopter -> Viator pid=P00329248', () => {
    const c = listingCards('Miami helicopter tour', { locale: 'en', sections: ['/experiences'] });
    assert.equal(c[0]?.booking?.platform, 'viator');
    assert.match(c[0].booking.href, /pid=P00329248/);
  });
  check('C05 Zoo Miami -> Headout affiliate_code=4VzJB0', () => {
    const c = listingCards('Zoo Miami tickets', { locale: 'en', sections: ['/experiences'] });
    assert.ok(c.some((x) => x.booking?.platform === 'headout' && /affiliate_code=/.test(x.booking.href)));
  });
  check('C06 Yachts for 8 -> Viator boat charters with capacity match', () => {
    const c = listingCards('Private yacht charter for 8 guests', { locale: 'en', sections: ['/yachts'] });
    assert.ok(c.length >= 2 && c.every((x) => x.booking?.platform === 'viator' && /pid=P00329248/.test(x.booking.href)));
  });
  check('C07 Flights -> Ovago CJ referral links', () => {
    const c = listingCards('Cheap flights to Miami', { locale: 'en', sections: ['/travel'] });
    assert.ok(c.length >= 2 && c.every((x) => x.booking?.platform === 'ovago' && /click-101825540-/.test(x.booking.href)));
  });
  check('C08 Multi-section balanced VIP day (yachts + helicopter) returns BOTH', () => {
    const c = listingCards('Собери субботу на 6 человек: яхта днём и вертолёт на закате', {
      locale: 'ru', limit: 4, sections: ['/yachts', '/experiences'], profile: prof
    });
    assert.ok(c.some((x) => x.href === '/experiences/viator/231628p7'));
    assert.ok(c.some((x) => x.href !== '/experiences/viator/231628p7' && x.booking?.platform === 'viator'));
  });
  check('C09 Brickell dining returns verified Brickell venues with booking links', () => {
    const c = listingCards('Dinner in Brickell', { locale: 'en', sections: ['/restaurants-nightlife'], profile: prof });
    assert.ok(c.length >= 2 && c.every((x) => x.booking?.href));
  });
  check('C10 Car under $700/day filters strictly <= $700', () => {
    const c = listingCards('SUV rental under $700 per day', { locale: 'en', sections: ['/rentals'], profile: prof });
    assert.ok(c.length >= 1);
    assert.ok(c.every((x) => !x.price || Number(String(x.price).replace(/[^0-9]/g, '')) <= 700));
  });
  check('C11 Page-Aware resolves Komodo detail page', () => {
    const e = resolvePageEntity('/restaurants-nightlife/komodo-miami');
    assert.equal(e?.title, 'Komodo');
    assert.equal(e?.partner, 'sevenrooms');
  });
  check('C12 Page-Aware resolves Viator helicopter detail page', () => {
    const e = resolvePageEntity('/experiences/viator/231628p7');
    assert.equal(e?.partner, 'viator');
    assert.equal(e?.section, '/experiences');
  });
  check('C13 Page-Aware rejects traversal & external URLs', () => {
    assert.equal(normalizePagePath('https://attacker.example/rentals'), '');
    assert.equal(normalizePagePath('/rentals/../admin'), '');
  });
  check('C14 Fact Pack includes Miami clusters + page entity + allowedPrices', () => {
    const fp = buildFactPack({
      messages: [{ role: 'user', content: 'Успеем сюда из Kaseya Center? Бюджет до $700' }],
      locale: 'ru',
      pagePath: '/restaurants-nightlife/komodo-miami'
    });
    assert.equal(fp.pageEntity?.title, 'Komodo');
    assert.ok(fp.allowedPrices.has(700));
    assert.match(fp.logisticsNote, /Bay\/Core.*Kaseya Center/);
  });

  // --- D. Forecast, 16-Locale UX & Admin Telemetry (10 scenarios) ---
  clearForecastCache();
  const samplePeriods = [
    { date: '2026-11-28', name: 'Saturday', isDaytime: true, tempC: 26, tempF: 79, rainChance: 65, wind: '12 mph', shortForecast: 'Showers Likely' },
    { date: '2026-11-29', name: 'Sunday', isDaytime: true, tempC: 27, tempF: 81, rainChance: 10, wind: '8 mph', shortForecast: 'Sunny' }
  ];
  check('D01 NOAA forecast skips stray network calls in Node test env', async () => {
    assert.deepEqual(await getMiamiForecast({ env: {} }), []);
  });
  check('D02 Forecast warns when rain >= 50%', () => {
    const f = formatForecastForPrompt(samplePeriods, { from: '2026-11-28', to: '2026-11-28' });
    assert.match(f, /rain 65%/);
    assert.match(f, /High rain\/storm chance/);
  });
  check('D03 Forecast has no storm warning on sunny Sunday', () => {
    const f = formatForecastForPrompt(samplePeriods, { from: '2026-11-29', to: '2026-11-29' });
    assert.match(f, /Sunny/);
    assert.doesNotMatch(f, /High rain\/storm chance/);
  });
  check('D04 Forecast returns empty string beyond 7-day window', () => {
    assert.equal(formatForecastForPrompt(samplePeriods, { from: '2026-12-20', to: '2026-12-22' }), '');
  });
  check('D05 Progressive thinking status covers all 16 locales (stage 0 & 1)', () => {
    assert.equal(detectThinkingTopic('Билеты на Damon Wayans', [{ href: '/events' }]), 'events');
    assert.equal(detectThinkingTopic('Какая погода в субботу?', []), 'weather');
    for (const { code } of SUPPORTED_LANGUAGES) {
      const s0 = thinkingStatusForTurn({ message: 'Miami Heat tickets', cards: [{ href: '/events' }], locale: code, stage: 0 });
      const s1 = thinkingStatusForTurn({ message: 'Miami Heat tickets', cards: [{ href: '/events' }], locale: code, stage: 1 });
      assert.ok(s0.length > 8 && s1.length > 8 && s0 !== s1, code);
    }
  });
  check('D06 Profile memory chips cover all 16 locales', () => {
    for (const { code } of SUPPORTED_LANGUAGES) {
      const r = formatProfileChips(prof, code);
      assert.ok(r.chips.length >= 5 && r.resetLabel.length >= 2, code);
    }
  });
  check('D07 Quick-reply chips cover all 16 locales', () => {
    for (const { code } of SUPPORTED_LANGUAGES) {
      assert.ok(quickRepliesForTurn({ reply: 'Choose dining', cards: [{ href: '/restaurants-nightlife' }], locale: code }).length >= 3, code);
    }
  });
  check('D08 Telemetry computes modelSharePct, avg/p95 latency & partner CTR with zero PII', () => {
    resetConciergeMetrics();
    recordChatTurn({ decidedBy: 'model', action: 'consult', locale: 'ru', referrals: ['ticketnetwork', 'viator'], ms: 1200 });
    recordChatTurn({ decidedBy: 'model', action: 'plan', locale: 'en', referrals: ['viator'], ms: 2400 });
    recordChatTurn({ decidedBy: 'lexicon', action: 'recommend', locale: 'es', referrals: ['viator'], error: true, ms: 300 });
    recordReferralClick('ticketnetwork');
    recordReferralClick('viator');
    const snap = getConciergeMetricsSnapshot();
    assert.equal(snap.totalTurns, 3);
    assert.equal(snap.modelSharePct, 66.7);
    assert.equal(snap.totalReferralClicks, 2);
    const tn = snap.partners.find((p) => p.platform === 'ticketnetwork');
    const vt = snap.partners.find((p) => p.platform === 'viator');
    assert.equal(tn.ctrPct, 100);
    assert.equal(vt.ctrPct, 33.3);
    assert.equal(JSON.stringify(snap).includes('Bad Bunny'), false);
    resetConciergeMetrics();
  });
  // D09 & D10 checks
  const unauthRes = await metricsGet(new Request('https://example.test/api/dashboard/concierge-metrics'));
  assert.ok(unauthRes.status === 401 || unauthRes.status === 503, 'unauthenticated admin metrics request must be rejected');
  passed += 1;
  check('D10 Admin analytics copy localizes cleanly for all 16 locales', () => {
    for (const { code } of SUPPORTED_LANGUAGES) {
      const c = getAnalyticsCopy(code);
      assert.ok(c.title.length > 5 && c.ctrCol.length >= 2, code);
    }
  });

  assert.equal(passed, 52);
  console.log(`VIP Concierge Eval Benchmark: ${passed}/${passed} passed (100.0%)`);
});
