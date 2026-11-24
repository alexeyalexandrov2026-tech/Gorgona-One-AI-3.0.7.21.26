import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import load from './load.cjs';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

test('Stage 1 ELIO UX: single floating AI launcher, no overlap on open dock or hero bar, global overflow-x clip', () => {
  const layout = read('app/layout.js');
  assert.doesNotMatch(layout, /<DiscoveryDock\s*\/>/, 'legacy DiscoveryDock must not compete with AiSphere on live pages');
  assert.match(layout, /<AiSphere \/>/);

  const sphere = read('app/components/ai/AiSphere.jsx');
  assert.match(sphere, /isOpen \? ['"]pointer-events-none scale-90 opacity-0['"]/, 'AiSphere hides while AiDock is open');

  const hero = read('app/components/home/HomeHero.jsx');
  assert.match(hero, /heroBarVisible/, 'HomeHero tracks hero bar visibility so corner launchers step aside');

  const overlays = read('app/ai-overlays.css');
  assert.match(overlays, /html\[data-hero-bar-visible="true"\] \[data-floating-launcher\]/);
  assert.match(overlays, /\.elio-scroll/);

  const globals = read('app/globals.css');
  assert.match(globals, /html\s*\{[^}]*overflow-x:\s*clip;/);
});

test('Stage 1 ELIO UX: AiDock drops dev header, keeps Telegram shortcut, and preserves per-message cards', () => {
  const dock = read('app/components/ai/AiDock.jsx');
  assert.doesNotMatch(dock, /msg\(["']AI Dock["']\)/, 'visible header must not display internal AI Dock label');
  assert.match(dock, /configuredManagerTelegram/);

  const { chatSnapshot } = load('lib/ai/session.mjs');
  const { chatPayload } = load('lib/ai/chatRequest.mjs');
  const snap = chatSnapshot({
    messages: [
      { role: 'user', content: 'Show me a Lamborghini Urus' },
      {
        role: 'assistant',
        content: 'Here is our Urus selection.',
        replyLocale: 'ru',
        cards: [{ href: '/rentals', title: 'Cars', label: 'Cars' }],
        listings: [{ href: '/rentals/lamborghini-urus-se', title: 'Lamborghini Urus SE', price: '$1,300/day' }]
      },
      { role: 'user', content: 'What is the weather tomorrow?' }
    ]
  });
  assert.equal(snap.messages[1].replyLocale, 'ru');
  assert.equal(snap.messages[1].cards?.length, 1);
  assert.equal(snap.messages[1].listings?.[0]?.href, '/rentals/lamborghini-urus-se');
  const payload = chatPayload(snap.messages, { locale: 'en' });
  assert.ok(payload.messages.every((m) => Object.keys(m).join() === 'role,content'), 'per-turn display attachments never leak upstream');
});

test('Stage 1 ELIO Brain: deposit/policy questions consult normally while direct booking/card charges still hand off', () => {
  const { explicitBooking } = load('lib/ai/catalogueAnswer.mjs');
  for (const q of [
    'What is the deposit for a Lamborghini Urus?',
    'How much deposit do I need for a yacht?',
    'How does booking work?',
    'Какой депозит нужен на Lamborghini Urus?',
    'Как происходит бронирование авто?'
  ]) {
    assert.equal(explicitBooking(q), false, `policy question should not hard-block LLM: ${q}`);
  }
  for (const cmd of [
    'Book a yacht for 6 people tomorrow and charge my card now',
    'Reserve a table for 4',
    'Забронируй яхту и спиши с карты',
    'Reserva un yate y cobra mi tarjeta'
  ]) {
    assert.equal(explicitBooking(cmd), true, `direct booking/charge must still hand off: ${cmd}`);
  }
});

test('Stage 1 ELIO Brain: factGuard catches updated persona leak, supports multi-domain production origins, and removes concierge summaries', async () => {
  const { validateGroundedReplyText } = load('lib/ai/factGuard.mjs');
  assert.equal(
    validateGroundedReplyText('As a Four Seasons Miami private specialist, I suggest Komodo.', { locale: 'en' }).ok,
    false
  );

  const { workersAiChat } = load('lib/ai/workersBrain.mjs');
  const valid = JSON.stringify({ version: 1, action: 'recommend', sections: ['/yachts'] });
  const miamiElioRes = await workersAiChat(
    {
      APP_ENV: 'production',
      CONCIERGE_WORKERS_AI_ENABLED: 'true',
      NEXT_PUBLIC_SUPABASE_URL: 'https://ctszqhhvalyqxhbfqifx.supabase.co',
      PUBLIC_SITE_ORIGIN: 'https://custom.miamielio.com',
      CONCIERGE_AI: { run: async () => ({ choices: [{ message: { content: valid }, finish_reason: 'stop' }] }) }
    },
    { locale: 'en', messages: [{ role: 'user', content: 'Recommend a yacht' }], request: new Request('https://miamielio.com/api/chat') },
    { authorize: async () => true }
  );
  assert.equal(miamiElioRes.ok, true);
  assert.equal(miamiElioRes.replyLocale, 'en');

  const suggestions = read('lib/aiSuggestions.js');
  assert.doesNotMatch(suggestions, /with concierge delivery|with concierge service|The full concierge room/i);
});
