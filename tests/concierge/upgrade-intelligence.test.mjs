import { test } from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const { SUPPORTED_LANGUAGES } = load('lib/languages.js');
const { adviceOptions, adviceCopy, adviceQuestions } = load('lib/ai/conciergeAdvice.mjs');
const { conciergeCopy } = load('lib/ai/conciergeCopy.mjs');
const { projectConversation, missingQuestion, STOP_IDS, GUIDE_IDS } = load('lib/ai/conciergeReply.mjs');
const { groundedReply } = load('lib/ai/groundedReply.mjs');
const { catalogueAnswer } = load('lib/ai/catalogueAnswer.mjs');
const { answerConciergeFact } = load('lib/ai/conciergeFacts.mjs');
const { modelMessages } = load('lib/ai/workersBrain.mjs');
const { conversationNavigation } = load('lib/ai/conversation.mjs');
const { partySize } = load('lib/ai/plan.mjs');
const { listingCards, carModelFamily } = load('lib/ai/listingCards.mjs');
const { POST } = load('app/api/chat/route.js');

const encoder = new TextEncoder();

test('all 16 locales cover all 20 advice options, 11 questions, 8 guides, 16 stops and seasonal tips', () => {
  const adviceIds = Object.keys(adviceOptions);
  const questionIds = Object.keys(conciergeCopy.en.questions);
  const guideTopicIds = Object.keys(conciergeCopy.en.guides);
  const seasonIds = ['flibs', 'art-basel', 'nye', 'boat-show', 'miami-open', 'ultra', 'f1'];

  assert.equal(adviceIds.length, 20);
  assert.equal(questionIds.length, 11);
  assert.equal(STOP_IDS.length, 16);
  assert.equal(GUIDE_IDS.length, 8);
  assert.equal(guideTopicIds.length, 6);

  for (const { code } of SUPPORTED_LANGUAGES) {
    assert.ok(adviceCopy[code], `missing adviceCopy locale: ${code}`);
    assert.ok(conciergeCopy[code], `missing conciergeCopy locale: ${code}`);
    for (const id of adviceIds) {
      assert.ok(typeof adviceCopy[code][id] === 'string' && adviceCopy[code][id].trim().length > 15, `missing advice ${code}/${id}`);
      assert.ok(Array.isArray(adviceQuestions[adviceOptions[id].section]), `missing adviceQuestions for section of ${id}`);
    }
    for (const qId of questionIds) {
      const q = conciergeCopy[code].questions[qId];
      assert.ok(typeof q === 'string' && q.trim().length > 5, `missing question ${code}/${qId}`);
      assert.ok(q.endsWith('?') || q.endsWith('？') || q.endsWith('؟'), `question must end with question mark: ${code}/${qId}`);
    }
    for (const gId of guideTopicIds) {
      const g = conciergeCopy[code].guides[gId];
      assert.ok(typeof g === 'string' && g.trim().length > 30, `missing guide ${code}/${gId}`);
      const projected = projectConversation({ version: 2, action: 'guide', choice: gId }, code);
      assert.equal(projected?.reply, g, `guide projection mismatch: ${code}/${gId}`);
    }
    assert.ok(conciergeCopy[code].seasonFact.includes('{name}'), `missing seasonFact template: ${code}`);
    for (const sId of seasonIds) {
      assert.ok(typeof conciergeCopy[code].seasonTips[sId] === 'string' && conciergeCopy[code].seasonTips[sId].trim().length > 10, `missing seasonTip ${code}/${sId}`);
    }
  }

  // Prototype-pollution & unknown ID guards
  for (const bad of ['__proto__', 'constructor', 'toString', 'unknown-guide']) {
    assert.equal(projectConversation({ version: 2, action: 'guide', choice: bad }, 'en'), null, bad);
    assert.equal(projectConversation({ version: 2, action: 'ask', choice: bad }, 'en'), null, bad);
  }
});

test('spelled-out numerals extract party size across languages without confusing durations or ticket counts', () => {
  const positive = [
    ['Мне нужна яхта на субботу для восьми человек', 8],
    ['Ужин сегодня на четверых', 4],
    ['Столик на двоих в Brickell', 2],
    ['Романтический ужин вдвоём', 2],
    ['Нас шестеро, ищем виллу', 6],
    ['A yacht for eight guests this Saturday', 8],
    ['Dinner tonight for four', 4],
    ['Yate para ocho personas', 8],
    ['Dîner ce soir pour quatre', 4],
    ['Yacht für acht Personen', 8],
    ['Yacht per otto persone', 8],
    ['Jacht dla ośmiu osób', 8],
    ['Sekiz kişilik yat', 8],
    ['יאכטה לשמונה אנשים', 8],
    ['يخت لثمانية أشخاص', 8],
    ['今夜4人でディナー', 4],
    ['今晚四人晚餐', 4],
    ['오늘 밤 네 명 저녁', 4],
  ];
  for (const [text, expected] of positive) {
    assert.equal(partySize(text), expected, text);
  }

  const nonParty = [
    'Найди Lamborghini на три дня',
    'Rolls-Royce for three days',
    'Найди два билета на футбол в воскресенье',
    'something with four doors and a driver',
    'Two nights in South Beach',
    'Write a 300 word poem about 300 stars',
  ];
  for (const text of nonParty) {
    assert.equal(partySize(text), null, `should not read as partySize: ${text}`);
  }
});

test('missingQuestion suppresses redundant questions when details are already supplied', () => {
  assert.equal(missingQuestion('group', 'Мне нужна яхта для восьми человек'), false);
  assert.equal(missingQuestion('group', 'Ужин на четверых'), false);
  assert.equal(missingQuestion('group', 'Хочу яхту в Майами'), true);

  assert.equal(missingQuestion('neighborhood', 'Посоветуй ресторан в Brickell'), false);
  assert.equal(missingQuestion('neighborhood', 'Dinner in Design District'), false);
  assert.equal(missingQuestion('neighborhood', 'Посоветуй ресторан'), true);

  assert.equal(missingQuestion('vibe', 'Ресторан с Мишленом'), false);
  assert.equal(missingQuestion('vibe', 'Romantic sunset rooftop'), false);
  assert.equal(missingQuestion('vibe', 'Ресторан в Brickell'), true);

  assert.equal(missingQuestion('sport-or-artist', 'Найди два билета на футбол в воскресенье'), false);
  assert.equal(missingQuestion('sport-or-artist', 'Miami Heat tickets'), false);
  assert.equal(missingQuestion('sport-or-artist', 'Билеты на выходные'), true);

  assert.equal(missingQuestion('car-style', 'Найди Lamborghini на три дня'), false);
  assert.equal(missingQuestion('car-style', 'Хочу кабриолет'), false);
  assert.equal(missingQuestion('car-style', 'Подбери машину в Майами'), true);
});

test('expanded 16 stops work in plan and ideas while keeping indoor rain plans valid', () => {
  const newStops = ['design-district', 'brickell', 'coconut-grove', 'little-havana', 'key-biscayne', 'bal-harbour', 'sunny-isles', 'vizcaya', 'biscayne-bay'];
  const plan = groundedReply(
    JSON.stringify({ version: 2, action: 'plan', days: [['design-district', 'brickell'], ['vizcaya', 'coconut-grove'], ['key-biscayne', 'little-havana']] }),
    { messages: [{ role: 'user', content: 'Plan three days in Miami' }], locale: 'ru' }
  );
  assert.ok(plan);
  assert.match(plan.reply, /День 1.*Miami Design District · Brickell/);
  assert.match(plan.reply, /День 2.*Vizcaya Museum & Gardens · Coconut Grove/);
  assert.match(plan.reply, /День 3.*Key Biscayne · Little Havana/);
  for (const stop of newStops) {
    const idea = projectConversation({ version: 2, action: 'ideas', stops: [stop] }, 'en');
    assert.ok(idea?.reply, `stop failed in ideas: ${stop}`);
  }
});

test('memory follow-ups retain context for neighborhood, Michelin, cuisine, vehicle color and schedule', () => {
  const michelinBrickell = conversationNavigation([
    { role: 'user', content: 'Посоветуй ресторан' },
    { role: 'assistant', content: 'Какой район Майами вам ближе?' },
    { role: 'user', content: 'в Brickell, с Мишленом' }
  ], { locale: 'ru' });
  assert.equal(michelinBrickell.cards[0]?.href, '/restaurants-nightlife');

  const brickellOnly = conversationNavigation([
    { role: 'user', content: 'Посоветуй ресторан' },
    { role: 'assistant', content: 'Какой район Майами вам ближе?' },
    { role: 'user', content: 'в Brickell' }
  ], { locale: 'ru' });
  assert.equal(brickellOnly.cards[0]?.href, '/restaurants-nightlife');
  assert.match(brickellOnly.query, /Brickell/i);
  const brickellCards = listingCards(brickellOnly.query, { locale: 'ru', sections: ['/restaurants-nightlife'] });
  assert.ok(brickellCards.length >= 1);
  assert.ok(brickellCards.every(card => /Brickell/i.test(card.summary || '')));

  const carColor = conversationNavigation([
    { role: 'user', content: 'Хочу Ferrari' },
    { role: 'assistant', content: 'На какие даты?' },
    { role: 'user', content: 'на выходные' }
  ], { locale: 'ru' });
  assert.equal(carColor.cards[0]?.href, '/rentals');
});

test('six core concierge smoke dialogues produce accurate advice, listings, facts and guardrails', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-22T12:00:00Z') });

  // 1. Football tickets -> MLS + NFL + sports-game advice
  const football = catalogueAnswer([{ role: 'user', content: 'Найди два билета на футбол в воскресенье' }], 'ru');
  assert.equal(football.navigation.cards[0]?.href, '/events');
  assert.ok(football.reply.includes(adviceCopy.ru['sports-game']));
  const footballHrefs = football.listings.map(item => item.href);
  assert.ok(footballHrefs.includes('/events/category/mls'), `expected MLS in ${footballHrefs}`);
  assert.ok(footballHrefs.includes('/events/category/nfl'), `expected NFL in ${footballHrefs}`);

  // City word ("Miami") must not outrank the actual subject ("concierto")
  const esConcerts = listingCards('Quiero entradas para un concierto en Miami', { locale: 'es', sections: ['/events'] });
  assert.equal(esConcerts[0]?.href, '/events/category/concerts', `expected concerts #1, got ${JSON.stringify(esConcerts.map(c => c.href))}`);

  // 2. Lamborghini for 3 days -> 3 distinct Lamborghini models + supercar advice
  const lambo = catalogueAnswer([{ role: 'user', content: 'Найди Lamborghini на три дня' }], 'ru');
  assert.equal(lambo.navigation.cards[0]?.href, '/rentals');
  assert.ok(lambo.reply.includes(adviceCopy.ru.supercar));
  assert.equal(lambo.listings.length, 3);
  assert.equal(new Set(lambo.listings.map(c => carModelFamily(c.title))).size, 3);

  // 3. Helicopter over Miami -> Viator 231628p7 + helicopter-tour advice
  const heli = catalogueAnswer([{ role: 'user', content: 'Хочу вертолёт над Майами' }], 'ru');
  assert.equal(heli.navigation.cards[0]?.href, '/experiences');
  assert.ok(heli.reply.includes(adviceCopy.ru['helicopter-tour']));
  assert.equal(heli.listings[0]?.href, '/experiences/viator/231628p7');

  // 4. Restaurant -> Brickell + Michelin follow-up -> Michelin advice + verified Michelin venues
  const dining = catalogueAnswer([
    { role: 'user', content: 'Посоветуй ресторан' },
    { role: 'assistant', content: 'Какой район Майами вам ближе?' },
    { role: 'user', content: 'в Brickell, с Мишленом' }
  ], 'ru');
  assert.equal(dining.navigation.cards[0]?.href, '/restaurants-nightlife');
  assert.ok(dining.reply.includes(adviceCopy.ru['michelin-dining']));
  assert.ok(dining.listings.length >= 1 && dining.listings.length <= 3);
  assert.ok(dining.listings.every(c => c.booking && c.more === '/restaurants-nightlife?collection=michelin'));

  // 5. "Когда Art Basel?" -> instant zero-token fact via /api/chat (0 fetch calls, 0 LLM calls)
  const fetcher = t.mock.method(globalThis, 'fetch', () => { throw new Error('No external fetch or LLM for seasonal fact'); });
  const baselRes = await POST(new Request('https://example.test/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.42' },
    body: JSON.stringify({ locale: 'ru', messages: [{ role: 'user', content: 'Когда Art Basel?' }] })
  }));
  const basel = await baselRes.json();
  assert.equal(baselRes.status, 200);
  assert.equal(basel.decidedBy, 'fact');
  assert.equal(basel.action, 'fact');
  assert.match(basel.reply, /Art Basel Miami Beach/);
  assert.match(basel.reply, /4[\s–-]+6.*декабря.*2026/i);
  assert.deepEqual(basel.listings, []);
  assert.equal(fetcher.mock.callCount(), 0);

  // Mixed seasonal fact + commercial request splits cleanly
  const mixed = await answerConciergeFact('Когда Art Basel и найди Lamborghini на эти даты', 'ru');
  assert.ok(mixed);
  assert.match(mixed.reply, /Art Basel Miami Beach/);
  assert.match(mixed.remainingMessage, /найди Lamborghini на эти даты/i);

  // Other upcoming season events work in EN & RU
  for (const [q, locale, match] of [
    ['When is Formula 1 Miami?', 'en', /Formula 1 Miami Grand Prix.*2027/],
    ['Когда Miami Boat Show?', 'ru', /Miami International Boat Show.*2027/],
    ['When is Ultra Music Festival?', 'en', /Ultra Music Festival.*2027/],
    ['Когда Miami Open?', 'ru', /Miami Open.*2027/],
  ]) {
    const res = await answerConciergeFact(q, locale);
    assert.ok(res && res.remainingMessage === '', q);
    assert.match(res.reply, match, q);
  }

  // Commercial queries naming a seasonal event are NOT intercepted as bare facts
  for (const q of ['Art Basel restaurants', 'Билеты на Formula 1 в Майами', 'Tickets for Miami Open']) {
    assert.equal(await answerConciergeFact(q, 'en'), null, `must not intercept commercial query as bare fact: ${q}`);
  }

  // 6. Booking & payment guardrail -> handoff: true + disclaimer + listings: []
  const booked = catalogueAnswer([{ role: 'user', content: 'Забронируй яхту и спиши с карты' }], 'ru');
  assert.equal(booked.handoff, true);
  assert.equal(booked.action, 'handoff');
  assert.match(booked.reply, /этот чат не создаёт и не подтверждает бронирования/);
  assert.deepEqual(booked.listings, []);
});

test('system prompt fits comfortably under 9,000 bytes and worst-case 12-turn CJK dialog fits <= 24,000 bytes', () => {
  const simple = modelMessages([{ role: 'user', content: 'Find a Lamborghini in Miami' }], 'en');
  assert.ok(simple);
  const systemBytes = encoder.encode(simple[0].content).byteLength;
  assert.ok(systemBytes <= 9000, `system prompt too large: ${systemBytes} bytes (limit 9000)`);
  assert.match(simple[0].content, /Miami date: \d{4}-\d{2}-\d{2}\./);

  // Heavy 12-turn CJK conversation (each turn 4,000 CJK chars = 12,000 UTF-8 bytes)
  const heavyCjk = Array.from({ length: 12 }, (_, i) => ({
    role: i % 2 ? 'user' : 'assistant',
    content: '語'.repeat(4000)
  }));
  const prepared = modelMessages(heavyCjk, 'ja');
  assert.ok(prepared, 'heavy CJK dialog must not fail modelMessages budget');
  const totalBytes = encoder.encode(JSON.stringify(prepared)).byteLength;
  assert.ok(totalBytes <= 24000, `serialized messages exceeded 24000 bytes: ${totalBytes}`);
  assert.equal(prepared.at(-1).content, heavyCjk.at(-1).content);

  // extraEntities are visible to workersBrain indexed catalogue matches
  const extra = [{
    id: 'car-partner-test',
    type: 'Car',
    world: 'drive',
    title: 'Koenigsegg Jesko Absolut',
    subtitle: 'Sports · Miami',
    href: '/rentals/partner-test',
    capacity: 2,
    aliases: ['Koenigsegg Jesko'],
    text: 'koenigsegg jesko absolut car rental miami'
  }];
  const withExtra = modelMessages([{ role: 'user', content: 'Koenigsegg Jesko' }], 'en', { extraEntities: extra });
  assert.match(withExtra[0].content, /Koenigsegg Jesko Absolut/);
});
