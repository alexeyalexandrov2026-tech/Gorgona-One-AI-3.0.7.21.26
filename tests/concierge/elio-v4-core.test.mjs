import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import load from './load.cjs';

const { workersAiChat, modelMessages, WORKERS_AI_MODEL, WORKERS_AI_FALLBACK_MODEL } = load('lib/ai/workersBrain.mjs');
const { groundedReply } = load('lib/ai/groundedReply.mjs');
const { validateGroundedReplyText, stripStreamingMarkdown } = load('lib/ai/factGuard.mjs');
const { explicitBooking } = load('lib/ai/catalogueAnswer.mjs');
const { buildManagerHandoffUrl } = load('lib/ai/stage2Copy.mjs');
const { quickRepliesForTurn } = load('lib/ai/quickReplies.mjs');
const { buildPlan } = load('lib/ai/plan.mjs');
const { syncPlanCatalog } = load('lib/ai/syncPlanCatalog.mjs');
const { chatSnapshot } = load('lib/ai/session.mjs');
const { chatPayload, readChatRequest } = load('lib/ai/chatRequest.mjs');
const { CLIENT_TIMEOUT_MS, SERVER_BUDGET_MS } = await import('../../lib/ai/chatDeadline.mjs');

const read = (rel) => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

test('ELIO+ AI v4 Core: lean prompt diet, expanded completion budget, derived Split-Pay math in FactGuard, and live markdown stripping', () => {
  // 1. Expanded server/client budgets keep >= 5s safety margin
  assert.equal(SERVER_BUDGET_MS, 15000);
  assert.equal(CLIENT_TIMEOUT_MS, 20000);

  // 2. Lean CONVERSATION_PROTOCOL cuts ~3 KB bloat from system prompt while putting "reply" first
  const msgs = modelMessages(
    [{ role: 'user', content: 'Сравни Komodo и Carbone в Brickell' }],
    'ru',
    { conversationSummary: 'Earlier: 4 guests, Brickell, anniversary weekend.' }
  );
  const sysBytes = new TextEncoder().encode(msgs[0].content).byteLength;
  assert.ok(sysBytes < 6500, `Expected lean system prompt < 6500 bytes, got ${sysBytes}`);
  assert.match(msgs[0].content, /"version":3,"reply":"\.\.\."/);
  assert.match(msgs[0].content, /Earlier conversation summary/);

  // 3. Derived multi-day & Split-Pay arithmetic passes FactGuard while invented prices remain blocked
  const allowed = new Set([1300]);
  assert.equal(
    validateGroundedReplyText('Lamborghini Urus SE is $1,300/day — for 3 days that is $3,900 total, or $975 per guest split 4 ways.', { locale: 'en', allowedPrices: allowed }).ok,
    true
  );
  assert.equal(
    validateGroundedReplyText('Lamborghini Urus SE is $1,300/day plus a $4,750 mystery concierge fee.', { locale: 'en', allowedPrices: allowed }).ok,
    false
  );

  // 4. Streaming markdown helper cleans partial **bold** markers cleanly
  assert.equal(stripStreamingMarkdown('**Lamborghini Urus** in Brickell — **great'), 'Lamborghini Urus in Brickell — great');
});

test('ELIO+ AI v4 Core: streaming reset on Self-Heal, Llama 3.3 70B secondary fallback, and v3 followups/tripPatch/handoffSummary', async () => {
  // 1. Live streaming emits reset when Call #1 hallucinates a price, then recovers via Self-Heal
  const enc = new TextEncoder();
  const badStream = new ReadableStream({
    start(controller) {
      const badJson = JSON.stringify({
        version: 3,
        reply: '**Yacht** charter costs $2,999 for 4 hours on Biscayne Bay.',
        action: 'consult',
        sections: ['/yachts']
      });
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: badJson.slice(0, 45) } }] })}\n\n`));
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: badJson.slice(45) } }] })}\n\n`));
      controller.enqueue(enc.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  let callCount = 0;
  let resets = 0;
  const deltas = [];
  const healed = await workersAiChat(
    {
      APP_ENV: 'dashboard-staging',
      CONCIERGE_WORKERS_AI_ENABLED: 'true',
      CONCIERGE_SELF_HEAL: 'true',
      CONCIERGE_AI: {
        run: async (_model, input) => {
          callCount += 1;
          if (callCount === 1) {
            assert.equal(input.stream, true);
            return badStream;
          }
          return {
            choices: [{
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  version: 3,
                  reply: 'Private Biscayne Bay charters adjust by yacht size and hours — open the verified options below for live pricing.',
                  action: 'consult',
                  sections: ['/yachts'],
                  followups: ['Compare 4-hour vs full-day', 'Add sunset dinner in Brickell'],
                  tripPatch: { neighborhood: 'Brickell', guests: 6 },
                  handoffSummary: '6 guests seeking 4h Biscayne Bay yacht charter.'
                })
              }
            }]
          };
        }
      }
    },
    { locale: 'en', messages: [{ role: 'user', content: 'Private yacht charter in Miami for 6 guests' }] },
    {
      authorize: async () => true,
      timeoutMs: 12000,
      onReplyDelta: (chunk) => deltas.push(chunk),
      onStreamReset: () => { resets += 1; }
    }
  );
  assert.equal(healed.ok, true);
  assert.equal(resets, 1, 'must emit stream reset before Self-Heal replaces streamed draft');
  assert.doesNotMatch(deltas.join(''), /\*\*/, 'live stream must strip **bold** markers before reaching UI');
  assert.deepEqual(healed.followups, ['Compare 4-hour vs full-day', 'Add sunset dinner in Brickell']);
  assert.deepEqual(healed.tripPatch, { neighborhood: 'Brickell', guests: 6 });
  assert.match(healed.handoffSummary, /6 guests/);

  // Model-authored followups take priority in quickRepliesForTurn
  const chips = quickRepliesForTurn({
    reply: healed.reply,
    cards: [{ href: '/yachts' }],
    locale: 'en',
    followups: healed.followups
  });
  assert.deepEqual(chips, ['Compare 4-hour vs full-day', 'Add sunset dinner in Brickell']);

  // 2. Secondary fallback model (@cf/meta/llama-3.3-70b-instruct-fp8-fast) recovers when primary throws
  const modelsCalled = [];
  const fallbackRes = await workersAiChat(
    {
      APP_ENV: 'dashboard-staging',
      CONCIERGE_WORKERS_AI_ENABLED: 'true',
      CONCIERGE_FALLBACK_MODEL: 'true',
      CONCIERGE_AI: {
        run: async (model, input) => {
          modelsCalled.push(model);
          if (model === WORKERS_AI_MODEL) {
            throw new Error('DeepSeek capacity error');
          }
          assert.equal(model, WORKERS_AI_FALLBACK_MODEL);
          assert.equal(input.reasoning_effort, undefined, 'Llama fallback must omit DeepSeek-only reasoning_effort');
          return {
            choices: [{
              finish_reason: 'stop',
              message: {
                content: JSON.stringify({
                  version: 3,
                  reply: 'Komodo and LPM in Brickell are standout evening picks; open the verified links below to pick your seating time.',
                  action: 'consult',
                  sections: ['/restaurants-nightlife']
                })
              }
            }]
          };
        }
      }
    },
    { locale: 'en', messages: [{ role: 'user', content: 'Best dinner in Brickell tonight?' }] },
    { authorize: async () => true, timeoutMs: 12000 }
  );
  assert.equal(fallbackRes.ok, true);
  assert.deepEqual(modelsCalled, [WORKERS_AI_MODEL, WORKERS_AI_FALLBACK_MODEL]);
});

test('ELIO+ AI v4 Core: conversion-friendly v3 booking handoff, Split-Pay single-car plan, warm manager brief, and UI wiring', async () => {
  // 1. Discovery / Split-Pay booking questions no longer hit hard dead-end handoff
  for (const q of [
    'Where can I book a sunset yacht in Miami?',
    'Can we use Split-Pay for a Lamborghini Urus for 4 friends?',
    'Как работает Split-Pay и можно ли разделить оплату на четверых?',
    'Подскажи, где лучше забронировать ужин в Brickell на субботу?'
  ]) {
    assert.equal(explicitBooking(q), false, `soft inquiry should not block LLM: ${q}`);
  }

  // 2. Direct v3 booking request keeps disclaimer FIRST AND preserves validated v3 answer below it
  const v3Book = groundedReply(JSON.stringify({
    version: 3,
    action: 'consult',
    sections: ['/rentals'],
    reply: 'Lamborghini Urus SE is available in our verified fleet — tap Quick Request below or message our manager for instant delivery.',
    handoffSummary: 'Guest wants Lamborghini Urus SE delivered to Brickell this weekend.'
  }), {
    messages: [{ role: 'user', content: 'Book Lamborghini Urus SE for this weekend' }],
    locale: 'en',
    allowedPrices: new Set()
  });
  assert.equal(v3Book?.handoff, true);
  assert.match(v3Book.reply, /^Check current terms and availability through the selected channel; this chat does not create or confirm reservations\.\n\nLamborghini Urus SE is available/);

  // 3. <<<ELIO_META>>> delimiter envelope parses cleanly into v3
  const metaParsed = groundedReply(
    'Komodo in Brickell brings energetic Southeast Asian dining with indoor-outdoor seating.\n<<<ELIO_META>>>\n{"action":"consult","sections":["/restaurants-nightlife"],"followups":["Compare with Sexy Fish"]}',
    { messages: [{ role: 'user', content: 'Tell me about Komodo' }], locale: 'en', allowedPrices: new Set() }
  );
  assert.equal(metaParsed?.decidedBy, 'model');
  assert.deepEqual(metaParsed?.followups, ['Compare with Sexy Fish']);

  // 4. Single-car multi-day / Split-Pay inquiry builds an interactive AiPlan calculator
  const carPlan = buildPlan(
    [{ role: 'user', content: 'Lamborghini Urus for 3 days split between 4 guests in Brickell' }],
    { catalog: syncPlanCatalog(), locale: 'en', requestable: true }
  );
  assert.ok(carPlan);
  assert.equal(carPlan.singleCarPackage, true);
  assert.equal(carPlan.guests, 4);
  assert.equal(carPlan.sections.length, 1);
  assert.equal(carPlan.sections[0].href, '/rentals');

  const snap = chatSnapshot({
    messages: [{ role: 'assistant', content: 'Here is your plan.', plan: carPlan, followups: ['Add Brickell dinner'], handoffSummary: '3d Urus Split-Pay x4' }],
    plan: carPlan
  });
  assert.equal(snap.plan?.singleCarPackage, true);
  assert.deepEqual(snap.messages[0].followups, ['Add Brickell dinner']);
  assert.equal(snap.messages[0].handoffSummary, '3d Urus Split-Pay x4');

  // 5. Warm manager handoff URL carries full structured summary, airport, Split-Pay & picks
  const waUrl = new URL(buildManagerHandoffUrl({
    baseHref: 'https://wa.me/message/VO7GCPZCDKRZO1',
    textBaseHref: 'https://wa.me/17864928880',
    locale: 'en',
    profile: { guests: 4, neighborhood: 'Brickell', airport: 'MIA', maxDailyBudget: 1500, dietaryOrCuisine: ['steakhouse'], dateRange: { from: '2026-12-05', to: '2026-12-08' } },
    listings: [{ title: 'Lamborghini Urus SE', price: '$1,300/day' }],
    plan: carPlan,
    handoffSummary: '4 guests arriving MIA, 3-day Urus SE with Split-Pay.'
  }));
  const waText = waUrl.searchParams.get('text') || '';
  assert.match(waText, /MIA/);
  assert.match(waText, /Split-Pay: 4 guests/);
  assert.match(waText, /Summary: 4 guests arriving MIA/);

  // 6. conversationSummary survives chatPayload -> readChatRequest
  const wire = chatPayload([{ role: 'user', content: 'And what about dinner?' }], {
    locale: 'en',
    conversationSummary: 'Guests=4, Brickell, Urus SE 3 days.'
  });
  const parsed = await readChatRequest(new Request('https://gorgona-one.com/api/chat', { method: 'POST', body: JSON.stringify(wire) }));
  assert.equal(parsed.conversationSummary, 'Guests=4, Brickell, Urus SE 3 days.');

  // 7. UI component wiring checks (ConciergeRoom isLoading, ChatProvider 7d localStorage + reset + Stop degraded, AiPlan clickwrap Terms)
  const room = read('app/components/ai/ConciergeRoom.jsx');
  assert.match(room, /streaming=\{Boolean\(isLoading\)\}/);
  assert.doesNotMatch(room, /\bpending\b/);

  const provider = read('app/components/ai/ChatProvider.jsx');
  assert.match(provider, /THREAD_TTL_MS/);
  assert.match(provider, /eventName === 'reset'/);
  assert.match(provider, /stripStreamingMarkdown\(streamingRef\.current\)/);
  assert.match(provider, /clearPrefs === true/);

  const actionCard = read('app/components/ai/AiActionCard.jsx');
  assert.match(actionCard, /termsAccepted: true,\s*termsVersion: TERMS_VERSION,\s*items:/);
});
