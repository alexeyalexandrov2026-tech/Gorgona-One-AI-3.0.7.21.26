import test from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const { modelMessages, workersAiChat } = load('lib/ai/workersBrain.mjs');
const { validateGroundedReplyText } = load('lib/ai/factGuard.mjs');
const { chatPayload, readChatRequest } = load('lib/ai/chatRequest.mjs');
const { analyzeSemanticIntent, semanticConceptScore } = load('lib/ai/semanticSearch.mjs');

test('Wave 2A: human-natural persona stays lean (< 6500 bytes), elevates primary temperature, and adapts rhythm in voiceMode', async () => {
  const textMsgs = modelMessages(
    [{ role: 'user', content: 'Хочу тихую красивую машину для встречи с инвесторами в Брикелле' }],
    'ru'
  );
  const sysBytes = new TextEncoder().encode(textMsgs[0].content).byteLength;
  assert.ok(sysBytes < 6500, `system prompt must stay lean (< 6500 bytes), got ${sysBytes}`);
  assert.match(textMsgs[0].content, /real human warmth/i);
  assert.doesNotMatch(textMsgs[0].content, /Live voice conversation:/);

  const voiceMsgs = modelMessages(
    [{ role: 'user', content: 'Куда сходить на ужин у воды сегодня?' }],
    'ru',
    { voiceMode: true }
  );
  assert.match(voiceMsgs[0].content, /Live voice conversation:/);

  // Verify temperature is elevated for human conversation (0.48 text / 0.52 voice) and drops to 0.25 on Self-Heal repair
  const temps = [];
  await workersAiChat(
    {
      APP_ENV: 'dashboard-staging',
      CONCIERGE_WORKERS_AI_ENABLED: 'true',
      CONCIERGE_SELF_HEAL: 'true',
      CONCIERGE_AI: {
        run: async (_model, input) => {
          temps.push(input.temperature);
          if (temps.length === 1) {
            // Trigger Self-Heal once with an invented price
            return {
              choices: [{
                finish_reason: 'stop',
                message: { content: JSON.stringify({ version: 3, reply: 'Rolls-Royce Ghost costs $9,999/day right now.', action: 'consult', sections: ['/rentals'] }) }
              }]
            };
          }
          return {
            choices: [{
              finish_reason: 'stop',
              message: { content: JSON.stringify({ version: 3, reply: 'For an investor meeting in Brickell, a Rolls-Royce Ghost or Mercedes-Maybach gives you quiet cabin comfort without loud track flash.', action: 'consult', sections: ['/rentals'] }) }
            }]
          };
        }
      }
    },
    { locale: 'en', messages: [{ role: 'user', content: 'Quiet car for an investor meeting in Brickell' }] },
    { authorize: async () => true, voiceMode: true }
  );
  assert.deepEqual(temps, [0.52, 0.25]);
});

test('Wave 2A: voiceMode survives chatPayload -> readChatRequest cleanly', async () => {
  const wire = chatPayload([{ role: 'user', content: 'Hi ELIO, any sunset spots?' }], {
    locale: 'en',
    voiceMode: true
  });
  assert.equal(wire.voiceMode, true);
  const parsed = await readChatRequest(new Request('https://gorgona-one.com/api/chat', { method: 'POST', body: JSON.stringify(wire) }));
  assert.equal(parsed.voiceMode, true);

  const wireOff = chatPayload([{ role: 'user', content: 'Hi ELIO' }], { locale: 'en', voiceMode: false });
  assert.equal(wireOff.voiceMode, undefined);
});

test('Wave 2A: FactGuard allows natural short human replies while preserving zero-hallucination guards', () => {
  const shortOk = validateGroundedReplyText('Да, Urus отлично подойдёт!', { locale: 'ru', allowedPrices: new Set() });
  assert.equal(shortOk.ok, true);

  const priceBad = validateGroundedReplyText('Думаю, это выйдет около $888.', { locale: 'ru', allowedPrices: new Set() });
  assert.equal(priceBad.ok, false);
  assert.equal(priceBad.reason, 'unverified_price');
});

test('Wave 2A: 16-language semantic brain understands executive cars, quiet luxury, wellness, instagram & first-time Miami across scripts', () => {
  const cases = [
    ['Хочу тихую красивую машину для встречи с инвесторами', 'executive-car', 'Rolls-Royce Ghost'],
    ['低调奢华的迈阿密晚餐', 'stealth-luxury', 'Bal Harbour'],
    ['第一次来迈阿密有什么建议', 'first-time-miami', 'Brickell'],
    ['הצעת נישואין במיאמי', 'proposal-unforgettable', 'helicopter'],
    ['سيارة فخمة للأعمال في ميامي', 'executive-car', 'Maybach'],
    ['조용한 럭셔리 분위기 레스토랑', 'stealth-luxury', 'Carbone'],
    ['初めてのマイアミでおすすめは？', 'first-time-miami', 'Wynwood'],
    ['Спокойный отдых без толп у океана', 'wellness-chill', 'Key Biscayne'],
    ['Make an entrance with an Instagrammable exotic car', 'instagram-wow', 'Lamborghini'],
    ['비 올 때 실내에서 갈 만한 곳', 'rainy-day-indoor', 'Design District']
  ];

  for (const [query, expectedVibe, expectedBoost] of cases) {
    const intent = analyzeSemanticIntent(query);
    assert.ok(intent.vibes.includes(expectedVibe), `Expected ${expectedVibe} for "${query}", got ${JSON.stringify(intent.vibes)}`);
    assert.ok(intent.searchBoostTerms.toLowerCase().includes(expectedBoost.toLowerCase()), `Expected boost "${expectedBoost}" for "${query}"`);
  }

  // Executive car intent ranks Rolls-Royce Ghost ahead of Ferrari track coupe
  const execIntent = analyzeSemanticIntent('Тихая красивая машина для встречи с инвесторами');
  assert.ok(
    semanticConceptScore({ title: 'Rolls-Royce Ghost', category: 'Sedan' }, execIntent) >
    semanticConceptScore({ title: 'Ferrari 488 Pista', category: 'Supercar' }, execIntent)
  );
});
