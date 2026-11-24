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
  extractDurablePrefs,
  tripProfilePromptLine,
  buildStay22ReferralUrl,
  neighborhoodProximity
} = load('lib/ai/tripProfile.mjs');
const { missingQuestion } = load('lib/ai/conciergeReply.mjs');
const { groundedReply } = load('lib/ai/groundedReply.mjs');
const { validateGroundedReplyText } = load('lib/ai/factGuard.mjs');
const { buildFactPack, collectAllowedPrices, extractMentionedEntities, findCrossNeighborhoodDining, normalizePagePath, resolvePageEntity } = load('lib/ai/factPack.mjs');
const { expandMultilingualAliases, searchEcosystem } = load('lib/ai/intent.js');
const { STARTER_PROMPTS } = load('lib/ai/conciergePrompts.js');
const { explicitBooking } = load('lib/ai/catalogueAnswer.mjs');
const { matchActionCards } = load('lib/aiSuggestions.js');
const { detectMessageLocale, detectSemanticVibes } = load('lib/ai/semanticVibes.mjs');
const { buildBudgetMath, extractTripDays } = load('lib/ai/budgetEstimator.mjs');
const { buildShareablePlanText, buildTelegramShareUrl, buildWhatsAppShareUrl, getShareCopy } = load('lib/ai/sharePlan.mjs');
const { chatPayload, readChatRequest, sanitizeSavedPrefs } = load('lib/ai/chatRequest.mjs');
const { modelMessages, workersAiChat } = load('lib/ai/workersBrain.mjs');
const { listingCards, gatedListings, replyMentionedCards } = load('lib/ai/listingCards.mjs');
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

test('VIP Concierge Eval Benchmark: 82 multi-turn, guardrail, partner, forecast, telemetry & Wave 8-12 Apex Intelligence scenarios pass 100%', async () => {
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

  // --- E. Wave 8 Apex Intelligence (10 scenarios) ---
  check('E01 Multi-entity compare loads full dossiers for Carbone, Komodo & Papi Steak', () => {
    const mentioned = extractMentionedEntities('Сравни Carbone, Komodo и Papi Steak для ужина в пятницу');
    assert.ok(mentioned.length >= 3);
    const fp = buildFactPack({
      messages: [{ role: 'user', content: 'Сравни Carbone, Komodo и Papi Steak для ужина в пятницу' }],
      locale: 'ru'
    });
    for (const name of ['Carbone', 'Komodo', 'Papi Steak']) {
      const entry = fp.facts.find((f) => f.title === name);
      assert.ok(entry && entry.desc && entry.desc.length > 20, `missing full dossier for ${name}`);
    }
  });
  check('E02 Semantic Vibe Engine translates metaphors & archetypes accurately', () => {
    assert.ok(detectSemanticVibes('Нужно тихое место для серьёзных переговоров с инвесторами').vibes.includes('executive-quiet'));
    assert.ok(detectSemanticVibes('Хочу сделать предложение руки и сердца так, чтобы запомнилось на всю жизнь').vibes.includes('proposal-unforgettable'));
    assert.ok(detectSemanticVibes('Give me a Miami Vice cinematic vibe with a supercar').vibes.includes('miami-vice-cinematic'));
    assert.ok(detectSemanticVibes('Вайб как в Сен-Тропе и пляжный клуб').vibes.includes('st-tropez-beach-club'));
    assert.ok(detectSemanticVibes('Looking for quiet luxury old money spots in Miami').vibes.includes('stealth-luxury'));
  });
  check('E03 Auto-Language Intelligence detects 10+ languages & allows Russian v3 reply on EN UI', () => {
    assert.equal(detectMessageLocale('Найди внедорожник в Brickell на выходные', 'en'), 'ru');
    assert.equal(detectMessageLocale('Знайди ресторан у Маямі на вечерю', 'en'), 'uk');
    assert.equal(detectMessageLocale('أبحث عن يخت فاخر في ميامي', 'en'), 'ar');
    assert.equal(detectMessageLocale('می‌خواهم یک قایق در میامی اجاره کنم', 'en'), 'fa');
    assert.equal(detectMessageLocale('מחפש מסעדה רומנטית במיאמי', 'en'), 'he');
    assert.equal(detectMessageLocale('マイアミでおすすめのレストランは？', 'en'), 'ja');
    assert.equal(detectMessageLocale('마이애미 추천 레스토랑 알려줘', 'en'), 'ko');
    assert.equal(detectMessageLocale('Quiero alquilar un yate en Miami para 6 personas', 'en'), 'es');
    const crossLang = groundedReply(JSON.stringify({
      version: 3,
      action: 'consult',
      sections: ['/restaurants-nightlife'],
      reply: 'Для ужина в Brickell отлично подойдут Komodo и Sexy Fish — оба места легко бронируются через карточки ниже.'
    }), {
      messages: [{ role: 'user', content: 'Посоветуй ресторан в Brickell' }],
      locale: 'en',
      replyLocale: 'ru',
      allowedPrices: new Set()
    });
    assert.ok(crossLang && crossLang.decidedBy === 'model');
  });
  check('E04 Deterministic Budget Calculator computes exact multi-day car math & whitelists derived total', () => {
    assert.equal(extractTripDays('Нужен Cadillac Escalade на 3 дня'), 3);
    const bm = buildBudgetMath({
      text: 'Сколько выйдет Cadillac Escalade на 3 дня?',
      facts: [{ type: 'Car', title: 'Cadillac Escalade', price: '$400' }]
    });
    assert.ok(bm.derivedPrices.has(400) && bm.derivedPrices.has(1200));
    assert.match(bm.budgetNote, /\$1,200/);
    assert.equal(validateGroundedReplyText('Cadillac Escalade стоит $400 в день, за 3 дня выйдет $1,200.', { locale: 'ru', allowedPrices: bm.derivedPrices }).ok, true);
    assert.equal(validateGroundedReplyText('Cadillac Escalade за 3 дня выйдет $1,999.', { locale: 'ru', allowedPrices: bm.derivedPrices }).ok, false);
  });
  check('E05 Self-healing length truncation preserves long grounded reply at clean sentence boundary', () => {
    const longReply = Array.from({ length: 16 }, (_, i) => `Sentence ${i + 1} highlights Komodo in Brickell for an upscale evening dinner with friends.`).join(' ');
    assert.ok(longReply.length > 1350);
    const verdict = validateGroundedReplyText(longReply, { locale: 'en', allowedPrices: new Set() });
    assert.equal(verdict.ok, true);
    assert.ok(verdict.text.length <= 1350 && verdict.text.endsWith('.'));
  });
  // E06 async: Self-Healing Micro-Retry saves v3 when Call #1 hallucinates an unverified price
  {
    let attempts = 0;
    const repaired = await workersAiChat(
      {
        APP_ENV: 'dashboard-staging',
        CONCIERGE_WORKERS_AI_ENABLED: 'true',
        CONCIERGE_SELF_HEAL: 'true',
        CONCIERGE_AI: {
          run: async () => {
            attempts += 1;
            if (attempts === 1) {
              return { response: JSON.stringify({ version: 3, action: 'consult', sections: ['/yachts'], reply: 'Яхта на заливе Бискейн стоит ровно $2,950 за 4 часа.' }) };
            }
            return { response: JSON.stringify({ version: 3, action: 'consult', sections: ['/yachts'], reply: 'Для компании отлично подойдёт чартер по заливу Бискейн — актуальные цены и доступность открываются в партнёрских карточках ниже.' }) };
          }
        }
      },
      { locale: 'ru', messages: [{ role: 'user', content: 'Хочу яхту в Майами' }] },
      { authorize: async () => true, timeoutMs: 10000 }
    );
    assert.equal(attempts, 2);
    assert.equal(repaired.ok, true);
    assert.equal(repaired.decidedBy, 'model');
    passed += 1;
  }
  check('E07 Cross-session persistent VIP preferences seed defaults & yield to current-session overrides', () => {
    const saved = extractDurablePrefs(prof);
    assert.deepEqual(saved, { neighborhood: 'Brickell', maxDailyBudget: 700, airport: 'MIA', dietaryOrCuisine: ['no-seafood', 'sushi'] });
    const nextSession = extractTripProfile([{ role: 'user', content: 'Recommend dinner tonight' }], NOW, saved);
    assert.equal(nextSession.neighborhood, 'Brickell');
    assert.equal(nextSession.airport, 'MIA');
    const overridden = extractTripProfile([{ role: 'user', content: 'Dinner in South Beach tonight' }], NOW, saved);
    assert.equal(overridden.neighborhood, 'South Beach');
  });
  check('E08 Share VIP Plan works across all 16 locales with verified links & WhatsApp URL', () => {
    for (const { code } of SUPPORTED_LANGUAGES) {
      const c = getShareCopy(code);
      assert.ok(c.copy.length >= 3 && c.whatsapp.length >= 3, code);
    }
    const text = buildShareablePlanText({
      reply: 'Komodo in Brickell at 8 PM.',
      listings: [{ title: 'Komodo', booking: { href: 'https://www.sevenrooms.com/reservations/komodo' } }],
      locale: 'ru'
    });
    assert.match(text, /MIAMI ELIO/);
    assert.match(text, /sevenrooms\.com\/reservations\/komodo/);
    assert.match(buildWhatsAppShareUrl(text), /^https:\/\/wa\.me\/\?text=/);
  });
  check('E09 System prompt with dossiers + vibes + budget math stays comfortably under 9,000 bytes', () => {
    const msgs = modelMessages(
      [{ role: 'user', content: 'Сравни Carbone, Komodo и Papi Steak — тихие переговоры с инвесторами, плюс Escalade на 3 дня' }],
      'ru',
      { savedPrefs: { neighborhood: 'Brickell', airport: 'MIA' } }
    );
    const bytes = new TextEncoder().encode(msgs[0].content).byteLength;
    assert.ok(bytes < 9000, `system prompt too large: ${bytes} bytes`);
  });
  // E10 async: chatPayload + readChatRequest sanitize & forward savedPrefs cleanly
  {
    const dirty = { neighborhood: 'Brickell', maxDailyBudget: 700, airport: 'MIA', dietaryOrCuisine: ['sushi', 'evil_tag'], piiEmail: 'secret@test.com' };
    const clean = sanitizeSavedPrefs(dirty);
    assert.deepEqual(clean, { neighborhood: 'Brickell', maxDailyBudget: 700, airport: 'MIA', dietaryOrCuisine: ['sushi'] });
    const wire = chatPayload([{ role: 'user', content: 'Dinner tonight' }], { locale: 'en', savedPrefs: dirty });
    const parsed = await readChatRequest(new Request('https://example.test/api/chat', { method: 'POST', body: JSON.stringify(wire) }));
    assert.deepEqual(parsed.savedPrefs, clean);
    passed += 1;
  }

  // --- F. Wave 9 Zero-Gap Conversion & 4-Service VIP Day (4 scenarios) ---
  check('F01 Version 3 accepts 4-service VIP day (rentals + dining + yachts + experiences) without lexicon fallback', () => {
    const res = groundedReply(JSON.stringify({
      version: 3,
      action: 'consult',
      sections: ['/rentals', '/yachts', '/experiences', '/restaurants-nightlife'],
      reply: 'На субботу в Brickell на 6 гостей удобно выстроить день так: утром Cadillac Escalade ($400/день), днём яхта по заливу Бискейн, на закате вертолётный полёт, а вечером ужин в Komodo или Sexy Fish.'
    }), {
      messages: [{ role: 'user', content: 'Собери субботу на 6 человек в Brickell: внедорожник до $700, яхта днём, вертолёт на закате и ужин вечером' }],
      locale: 'ru',
      allowedPrices: new Set([400, 700])
    });
    assert.ok(res && res.decidedBy === 'model');
    assert.equal(res.navigation.cards.length >= 2, true);
  });
  check('F02 replyMentionedCards attaches clickable booking frames for semantic-vibe recommendations (LPM, COTE, Carbone)', () => {
    const reply = 'Для переговоров с инвесторами лучше всего подойдут LPM Restaurant & Bar в Brickell, COTE Miami в Design District и Carbone на South Beach.';
    const cards = replyMentionedCards(reply, { sections: ['/restaurants-nightlife'], limit: 3 });
    assert.equal(cards.length, 3);
    assert.ok(cards.every((c) => c.booking?.href && c.href.startsWith('/restaurants-nightlife/')));
    // Strictly bounded to requested sections: must NOT leak dining cards when sections is ['/yachts']
    assert.deepEqual(replyMentionedCards(reply, { sections: ['/yachts'], limit: 3 }), []);
  });
  check('F03 Telegram share URL & 16-locale Telegram label work cleanly', () => {
    for (const { code } of SUPPORTED_LANGUAGES) {
      assert.ok(getShareCopy(code).telegram.length >= 4, code);
    }
    const tg = buildTelegramShareUrl('MIAMI ELIO plan for Brickell');
    assert.match(tg, /^https:\/\/t\.me\/share\/url\?url=https%3A%2F%2Fgorgona-one\.com&text=/);
  });
  // F04 async: Exact-reason Self-Healing Micro-Retry passes specific unverified_price hint into repair prompt
  {
    let seenRepairHint = '';
    const healed = await workersAiChat(
      {
        APP_ENV: 'dashboard-staging',
        CONCIERGE_WORKERS_AI_ENABLED: 'true',
        CONCIERGE_SELF_HEAL: 'true',
        CONCIERGE_AI: {
          run: async (_m, body) => {
            const last = body.messages.at(-1)?.content || '';
            if (last.includes('failed verification')) {
              seenRepairHint = last;
              return { response: JSON.stringify({ version: 3, action: 'consult', sections: ['/yachts'], reply: 'Для субботы на 6 человек подойдёт частный чартер по заливу Бискейн — актуальные цены открываются в партнёрских карточках ниже.' }) };
            }
            return { response: JSON.stringify({ version: 3, action: 'consult', sections: ['/yachts'], reply: 'Частная яхта на субботу стоит ровно $3,200 за 4 часа.' }) };
          }
        }
      },
      { locale: 'ru', messages: [{ role: 'user', content: 'Хочу яхту в субботу' }] },
      { authorize: async () => true, timeoutMs: 10000 }
    );
    assert.equal(healed.ok, true);
    assert.match(seenRepairHint, /unverified dollar price/i);
    passed += 1;
  }

  // --- G. Wave 10 Conversion, 4-Section Integrity, Token Safety & Security (8 scenarios) ---
  check('G01 All 16 locales starter prompts avoid dead-end explicitBooking handoff & prompt #3 matches dining', () => {
    for (const { code } of SUPPORTED_LANGUAGES) {
      const prompts = STARTER_PROMPTS[code];
      assert.equal(prompts?.length, 4, `missing 4 starter prompts for ${code}`);
      for (const p of prompts) {
        assert.equal(explicitBooking(p), false, `starter prompt must not trip explicitBooking (${code}): ${p}`);
      }
      const cards = matchActionCards(prompts[2], { locale: code });
      assert.ok(cards.some((c) => c.href === '/restaurants-nightlife'), `starter #3 must route to dining (${code}): ${prompts[2]}`);
    }
  });
  check('G02 Version 3 preserves all 4 sections (not clipped to 2) for downstream booking cards', () => {
    const res = groundedReply(JSON.stringify({
      version: 3,
      action: 'plan',
      sections: ['/rentals', '/yachts', '/experiences', '/restaurants-nightlife'],
      reply: 'Суббота: Cadillac Escalade ($400/день), днём яхта по Бискейн-Бей, вертолёт на закате и ужин в Komodo.'
    }), {
      messages: [{ role: 'user', content: 'Внедорожник до $700, яхта днём, вертолёт на закате и ужин вечером' }],
      locale: 'ru',
      allowedPrices: new Set([400, 700])
    });
    assert.deepEqual(res?.sections, ['/rentals', '/yachts', '/experiences', '/restaurants-nightlife']);
  });
  check('G03 collectAllowedPrices ignores bare non-price numbers (911, 8 guests, 2026) while keeping explicit budgets', () => {
    const allowed = collectAllowedPrices([], [
      { role: 'user', content: 'Porsche 911 for 8 guests in 2026 with budget under $700 and 500 USD deposit' }
    ]);
    assert.equal(allowed.has(700), true);
    assert.equal(allowed.has(500), true);
    assert.equal(allowed.has(911), false);
    assert.equal(allowed.has(8), false);
    assert.equal(allowed.has(2026), false);
  });
  check('G04 FactGuard blocks bare phishing domains, Telegram handles, trailing currency & prompt leakage', () => {
    assert.equal(validateGroundedReplyText('Book directly on scam-miami.com for instant yacht access today.', { locale: 'en', allowedPrices: new Set() }).ok, false);
    assert.equal(validateGroundedReplyText('Message t.me/fakeconcierge or @fakevip for a table tonight.', { locale: 'en', allowedPrices: new Set() }).ok, false);
    assert.equal(validateGroundedReplyText('Яхта на 4 часа выйдет 1500$ или 1400 евро в субботу.', { locale: 'ru', allowedPrices: new Set() }).ok, false);
    assert.equal(validateGroundedReplyText('As an elite Four Seasons Miami concierge I follow Allowed section catalogue rules.', { locale: 'en', allowedPrices: new Set() }).ok, false);
    assert.equal(validateGroundedReplyText('Your table is all set for 8pm and I have secured your VIP entry.', { locale: 'en', allowedPrices: new Set() }).ok, false);
  });
  check('G05 Auto-language detects English on non-Latin UI & coastal vibe references verified catalog venues only', () => {
    assert.equal(detectMessageLocale('Can you please recommend dinner in Miami for 4 guests tonight?', 'ru'), 'en');
    assert.equal(detectMessageLocale('Please suggest tickets for tomorrow in Miami', 'ar'), 'en');
    const coastal = detectSemanticVibes('Вайб как в Сен-Тропе и пляжный клуб');
    assert.doesNotMatch(coastal.promptNote, /Milos|Kiki on the River/i);
    assert.match(coastal.promptNote, /LPM.*Nikki Beach.*Amara/i);
  });
  check('G06 Quick replies contain zero stray Cyrillic typos in Latin locales (de/es/fr/it/pt/pl/tr/en)', () => {
    for (const code of ['en', 'es', 'pt', 'de', 'tr', 'it', 'fr', 'pl']) {
      for (const href of ['/restaurants-nightlife', '/rentals', '/events', '/experiences', '/yachts']) {
        const chips = quickRepliesForTurn({ reply: 'Choose option', cards: [{ href }], locale: code });
        for (const chip of chips) {
          assert.doesNotMatch(chip, /[\u0400-\u04ff]/, `stray Cyrillic in ${code} (${href}): ${chip}`);
        }
      }
    }
  });
  check('G07 Non-Latin dense-script prompts inject token-safety brevity guard & stay under 9,000 bytes', () => {
    const msgsRu = modelMessages([{ role: 'user', content: 'Подбери ужин в Brickell на субботу' }], 'ru');
    assert.match(msgsRu[0].content, /<= 520 chars/);
    assert.ok(new TextEncoder().encode(msgsRu[0].content).byteLength < 9000);
    const msgsAr = modelMessages([{ role: 'user', content: 'أريد مطعماً في بريكل يوم السبت' }], 'ar');
    assert.match(msgsAr[0].content, /<= 520 chars/);
  });
  // G08 async: Self-Healing Micro-Retry detects finish_reason='length' truncation and repairs cleanly
  {
    let seenTruncHint = '';
    const healedTrunc = await workersAiChat(
      {
        APP_ENV: 'dashboard-staging',
        CONCIERGE_WORKERS_AI_ENABLED: 'true',
        CONCIERGE_SELF_HEAL: 'true',
        CONCIERGE_AI: {
          run: async (_m, body) => {
            const last = body.messages.at(-1)?.content || '';
            if (last.includes('failed verification')) {
              seenTruncHint = last;
              return { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ version: 3, action: 'consult', sections: ['/restaurants-nightlife'], reply: 'В Brickell подойдут Komodo и Sexy Fish. На сколько гостей и во сколько планируете ужин?' }) } }] };
            }
            return { choices: [{ finish_reason: 'length', message: { content: '{"version":3,"action":"consult","sections":["/restaurants-nightlife"],"reply":"В Brickell подойдут Komodo, Sexy Fish и LPM, во сколько хотит' } }] };
          }
        }
      },
      { locale: 'ru', messages: [{ role: 'user', content: 'Подбери ужин в Brickell' }] },
      { authorize: async () => true, timeoutMs: 10000 }
    );
    assert.equal(healedTrunc.ok, true);
    assert.match(seenTruncHint, /640-token limit/i);
    passed += 1;
  }

  // -------------------------------------------------------------------------
  // H. WAVE 12: TOP-0.1% MULTILINGUAL PHONETICS, SCOPED BUDGET & PROACTIVE GEO (8)
  // -------------------------------------------------------------------------

  // H01. Typo-tolerant & transliterated search across Russian/Arabic/typos
  {
    const expanded = expandMultilingualAliases('Сравни Карбон, Комодо и Папи Стейк + Lamborgini Урус');
    assert.match(expanded, /carbone/);
    assert.match(expanded, /komodo/);
    assert.match(expanded, /papi steak/);
    assert.match(expanded, /lamborghini urus/);
    const hits = searchEcosystem('Хочу Ламборгини Урус или Гелендваген', { limit: 4 }).results;
    assert.equal(hits.some((h) => /urus|g63/i.test(h.title)), true);
    const mentioned = extractMentionedEntities([{ role: 'user', content: 'Сравни Карбон, Комодо и Папи Стейк' }], 3);
    assert.equal(mentioned.length, 3);
    passed += 1;
  }

  // H02. 16-language neighborhood script & typo detection
  {
    assert.equal(extractTripProfile([{ role: 'user', content: 'مطعم في بريكل' }]).neighborhood, 'Brickell');
    assert.equal(extractTripProfile([{ role: 'user', content: "מסעדה בסאות' ביץ'" }]).neighborhood, 'South Beach');
    assert.equal(extractTripProfile([{ role: 'user', content: '布里克尔晚餐' }]).neighborhood, 'Brickell');
    assert.equal(extractTripProfile([{ role: 'user', content: 'ブリッケルのディナー' }]).neighborhood, 'Brickell');
    assert.equal(extractTripProfile([{ role: 'user', content: '브리켈 레스토랑' }]).neighborhood, 'Brickell');
    assert.equal(extractTripProfile([{ role: 'user', content: 'Dinner in Brikell' }]).neighborhood, 'Brickell');
    passed += 1;
  }

  // H03. Scoped car budget isolation vs dining budget & explicit multi-turn resets
  {
    const p1 = extractTripProfile([
      { role: 'user', content: 'Едем с детьми, бюджет на авто до $700 в день' },
      { role: 'user', content: 'Хочу ужин в ресторане до $250 на человека' }
    ]);
    assert.equal(p1.maxDailyBudget, 700);
    assert.equal(p1.hasKids, true);

    const p2 = extractTripProfile([
      { role: 'user', content: 'Едем с детьми, бюджет на авто до $700 в день' },
      { role: 'user', content: 'Планы поменялись: уже без детей, и бюджет не важен' }
    ]);
    assert.equal(p2.hasKids, false);
    assert.equal(p2.maxDailyBudget, null);
    passed += 1;
  }

  // H04. Supercar capacity protection after large yacht group turn
  {
    const history = [
      { role: 'user', content: 'Нужна яхта на 8 гостей в субботу' },
      { role: 'user', content: 'А ещё покажи суперкар Ferrari или Huracan на выходные' }
    ];
    const profile = extractTripProfile(history);
    assert.equal(profile.guests, 8);
    const cards = listingCards('А ещё покажи суперкар Ferrari или Huracan на выходные', ['/rentals'], 'ru', 4, profile);
    assert.equal(cards.some((c) => /ferrari|hurac/i.test(c.title)), true);
    passed += 1;
  }

  // H05. Stay22 referral URL prefills neighborhood address in Miami
  {
    const url = buildStay22ReferralUrl({ guests: 4, checkIn: '2026-05-10', checkOut: '2026-05-14', neighborhood: 'Brickell' });
    assert.match(url, /address=Brickell%2C\+Miami%2C\+FL%2C\+USA/);
    assert.match(url, /guests=4/);
    passed += 1;
  }

  // H06. Cross-neighborhood proactive dining intelligence (e.g. Brickell + steakhouse)
  {
    const cross = findCrossNeighborhoodDining('Brickell', ['steakhouse'], 3);
    assert.equal(cross.length, 3);
    assert.equal(cross.some((v) => /klaw|cote|papi steak/i.test(v.title)), true);
    const pack = buildFactPack(
      [
        { role: 'user', content: 'Мы остановились в Brickell, очень любим стейки' },
        { role: 'user', content: 'Куда сходить на ужин?' }
      ],
      'ru'
    );
    assert.match(pack.crossNeighborhoodNote, /No exact steakhouse match inside Brickell/i);
    assert.equal(pack.facts.some((f) => /Klaw|COTE Miami|Papi Steak/.test(f.title)), true);
    passed += 1;
  }

  // H07. Multi-section 16-language FactPack & listingCards balance (Arabic 3-service VIP day)
  {
    const arQuery = 'أريد خطة يوم فاخر في ميامي: يخت خاص، سيارة فاخرة ومطعم راقٍ في بريكل لعشاء رومانسي يوم السبت';
    const sections = ['/yachts', '/rentals', '/restaurants-nightlife'];
    const profile = extractTripProfile([{ role: 'user', content: arQuery }]);
    assert.equal(profile.neighborhood, 'Brickell');
    const pack = buildFactPack([{ role: 'user', content: arQuery }], 'ar');
    assert.equal(pack.facts.some((f) => f.section === '/yachts'), true);
    assert.equal(pack.facts.some((f) => f.section === '/rentals'), true);
    assert.equal(pack.facts.some((f) => f.section === '/restaurants-nightlife'), true);
    const cards = listingCards(arQuery, sections, 'ar', 4, profile);
    assert.equal(cards.some((c) => c.label === 'Experience' || c.href.startsWith('/yachts')), true);
    assert.equal(cards.some((c) => c.label === 'Car' || c.href.startsWith('/rentals/')), true);
    assert.equal(cards.some((c) => c.label === 'Restaurant' || c.href.startsWith('/restaurants-nightlife/')), true);
    passed += 1;
  }

  // H08. Transliterated replyMentionedCards attaches verified booking cards
  {
    const cards = replyMentionedCards(
      'Для вечернего выхода рекомендую Комодо в Брикелле или Карбон на Саус Бич, а для поездки — Ламборгини Урус.',
      ['/restaurants-nightlife', '/rentals'],
      'ru',
      4
    );
    assert.equal(cards.some((c) => c.title === 'Komodo'), true);
    assert.equal(cards.some((c) => c.title === 'Carbone'), true);
    assert.equal(cards.some((c) => /Urus/i.test(c.title)), true);
    passed += 1;
  }

  assert.equal(passed, 82);
  console.log(`VIP Concierge Eval Benchmark: ${passed}/${passed} passed (100.0%)`);
});
