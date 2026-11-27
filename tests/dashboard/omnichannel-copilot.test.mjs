import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, ids, asUser, rpc } from './database.mjs';
import load from '../concierge/load.cjs';

const { telegramWebhookHandlers } = load('lib/server/telegramWebhookHandler.mjs');
const { whatsappWebhookHandlers, signMetaWebhookPayload } = load('lib/server/whatsappWebhookHandler.mjs');
const { adminCopilotHandlers } = load('lib/server/adminCopilotHandler.mjs');
const { shouldAutoReply, wantsHumanTakeover } = load('lib/server/messengerAgent.mjs');

function makeMockEnv(overrides = {}) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    BOOKING_RATE_SECRET: '0123456789abcdef0123456789abcdef',
    TELEGRAM_BOT_TOKEN: '123456:TEST_BOT_TOKEN',
    TELEGRAM_OWNER_CHAT_ID: '999999999',
    TELEGRAM_WEBHOOK_SECRET: 'tg-secret-token-1234567890',
    WHATSAPP_VERIFY_TOKEN: 'wa-verify-token-1234',
    WHATSAPP_APP_SECRET: 'wa-app-secret-0123456789abcdef',
    WHATSAPP_ACCESS_TOKEN: 'wa-access-token',
    WHATSAPP_PHONE_NUMBER_ID: '100200300400',
    ...overrides
  };
}

test('Omnichannel SQL migration: private tables stay locked to service_role and RPCs manage settings & thread pauses', async () => {
  const db = await fixture();
  try {
    // Non-privileged authenticated users cannot read private messenger tables or call service_role RPCs.
    await assert.rejects(
      () => asUser(db, ids.customer, 'select * from private.messenger_threads'),
      /permission denied/i
    );
    await assert.rejects(
      () => asUser(db, ids.customer, 'select public.messenger_settings_get()'),
      /permission denied/i
    );

    const initial = await rpc(db, 'messenger_settings_get', {});
    assert.equal(initial.mode, '24_7');
    assert.equal(initial.takeoverHours, 4);

    const updated = await rpc(db, 'messenger_settings_set', {
      p_mode: 'after_hours',
      p_takeover_hours: 6,
      p_actor: ids.admin
    });
    assert.equal(updated.mode, 'after_hours');
    assert.equal(updated.takeoverHours, 6);

    const upserted = await rpc(db, 'messenger_thread_upsert', {
      p_channel: 'telegram',
      p_external_chat_id: '55512345',
      p_customer_name: 'Elena',
      p_customer_handle: '@elena_miami',
      p_locale: 'ru',
      p_messages: JSON.stringify([{ role: 'user', content: 'Нужна яхта на субботу' }]),
      p_last_provider_message_id: 'tg:55512345:10',
      p_last_message_preview: 'Нужна яхта на субботу',
      p_last_reply_preview: 'Подбираю варианты…',
      p_increment_turns: true
    });
    assert.equal(upserted.ok, true);
    assert.ok(upserted.id);

    const loaded = await rpc(db, 'messenger_thread_get', {
      p_channel: 'telegram',
      p_external_chat_id: '55512345'
    });
    assert.equal(loaded.locale, 'ru');
    assert.equal(loaded.turnsCount, 1);

    const paused = await rpc(db, 'messenger_thread_set_pause', {
      p_thread_id: upserted.id,
      p_paused_until: new Date(Date.now() + 4 * 3600 * 1000).toISOString()
    });
    assert.equal(paused.ok, true);

    const recent = await rpc(db, 'messenger_threads_recent', { p_limit: 10 });
    assert.equal(recent.length, 1);
    assert.equal(recent[0].channel, 'telegram');
  } finally {
    await db.close();
  }
});

test('Messenger mode gating & human takeover rules work accurately', () => {
  assert.equal(wantsHumanTakeover('Позовите живого менеджера пожалуйста'), true);
  assert.equal(wantsHumanTakeover('Can I speak to a live manager?'), true);
  assert.equal(wantsHumanTakeover('Lamborghini Urus for 3 days'), false);

  assert.deepEqual(
    shouldAutoReply({ settings: { mode: 'copilot_only', telegramEnabled: true }, channel: 'telegram' }),
    { allowed: false, reason: 'copilot_only' }
  );
  assert.deepEqual(
    shouldAutoReply({
      settings: { mode: '24_7', telegramEnabled: true },
      thread: { humanPausedUntil: new Date(Date.now() + 60_000).toISOString() },
      channel: 'telegram'
    }),
    { allowed: false, reason: 'human_takeover' }
  );
  assert.deepEqual(
    shouldAutoReply({
      settings: { mode: 'after_hours', telegramEnabled: true },
      channel: 'telegram',
      now: new Date('2026-11-27T18:00:00Z') // 13:00 Miami time
    }),
    { allowed: false, reason: 'business_hours' }
  );
  assert.deepEqual(
    shouldAutoReply({
      settings: { mode: 'after_hours', telegramEnabled: true },
      channel: 'telegram',
      now: new Date('2026-11-27T04:00:00Z') // 23:00 Miami time
    }),
    { allowed: true, reason: 'ok' }
  );
});

test('Telegram webhook enforces secret token, replies to Telegram Business guest, and pauses on owner takeover', async () => {
  const sent = [];
  const state = { thread: null };
  const fetcher = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/rest/v1/rpc/messenger_settings_get')) {
      return Response.json({ mode: '24_7', telegramEnabled: true, whatsappEnabled: true, takeoverHours: 4 });
    }
    if (u.includes('/rest/v1/rpc/messenger_thread_get')) {
      return Response.json(state.thread);
    }
    if (u.includes('/rest/v1/rpc/messenger_thread_upsert')) {
      const body = JSON.parse(init.body);
      state.thread = {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        channel: body.p_channel,
        externalChatId: body.p_external_chat_id,
        locale: body.p_locale,
        messages: body.p_messages,
        lastProviderMessageId: body.p_last_provider_message_id,
        humanPausedUntil: body.p_human_paused_until ?? (body.p_keep_pause ? state.thread?.humanPausedUntil : null),
        bookingId: body.p_booking_id
      };
      return Response.json({ ok: true, id: state.thread.id });
    }
    if (u.includes('/rest/v1/rpc/dashboard_submit')) {
      return Response.json({ success: true, bookingId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' });
    }
    if (u.includes('api.telegram.org')) {
      sent.push(JSON.parse(init.body));
      return Response.json({ ok: true });
    }
    return Response.json({ ok: true });
  };

  const env = makeMockEnv();
  const handler = telegramWebhookHandlers(env, fetcher);

  // 1. Missing/invalid secret fails closed with 401
  const bad = await handler.post(new Request('https://gorgona-one.com/api/webhooks/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-telegram-bot-api-secret-token': 'wrong' },
    body: JSON.stringify({})
  }));
  assert.equal(bad.status, 401);

  // 2. Guest sends a Telegram Business message to @MIAMI_ELIO
  const guestRes = await handler.post(new Request('https://gorgona-one.com/api/webhooks/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-telegram-bot-api-secret-token': env.TELEGRAM_WEBHOOK_SECRET },
    body: JSON.stringify({
      business_message: {
        business_connection_id: 'bc_miami_elio_1',
        message_id: 101,
        chat: { id: 777111, type: 'private' },
        from: { id: 777111, is_bot: false, first_name: 'Alexey', username: 'guest_ru' },
        text: 'Нужен Rolls-Royce на 3 дня с субботы в Майами'
      }
    })
  }));
  const guestJson = await guestRes.json();
  assert.equal(guestRes.status, 200);
  assert.equal(guestJson.action, 'replied');
  assert.equal(guestJson.delivered, true);
  assert.ok(sent.some((m) => m.chat_id === '777111' && m.business_connection_id === 'bc_miami_elio_1'));

  // 3. Owner steps into the @MIAMI_ELIO chat -> instant Human Takeover, zero bot reply
  const sentBeforeOwner = sent.length;
  const ownerRes = await handler.post(new Request('https://gorgona-one.com/api/webhooks/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-telegram-bot-api-secret-token': env.TELEGRAM_WEBHOOK_SECRET },
    body: JSON.stringify({
      business_message: {
        business_connection_id: 'bc_miami_elio_1',
        message_id: 102,
        chat: { id: 777111, type: 'private' },
        from: { id: 999999999, is_bot: false, first_name: 'Miami Elio' },
        text: 'Привет! Я уже на связи, сейчас пришлю точное КП.'
      }
    })
  }));
  const ownerJson = await ownerRes.json();
  assert.equal(ownerJson.action, 'owner_takeover');
  assert.equal(sent.length, sentBeforeOwner);

  // 4. Subsequent guest message while paused stays silent so manager handles it
  const nextRes = await handler.post(new Request('https://gorgona-one.com/api/webhooks/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-telegram-bot-api-secret-token': env.TELEGRAM_WEBHOOK_SECRET },
    body: JSON.stringify({
      business_message: {
        business_connection_id: 'bc_miami_elio_1',
        message_id: 103,
        chat: { id: 777111, type: 'private' },
        from: { id: 777111, is_bot: false, first_name: 'Alexey' },
        text: 'Супер, спасибо!'
      }
    })
  }));
  const nextJson = await nextRes.json();
  assert.equal(nextJson.action, 'skipped');
  assert.equal(sent.length, sentBeforeOwner);
});

test('WhatsApp Cloud API webhook verifies Meta GET challenge and HMAC-SHA256 POST signature', async () => {
  const sentWhatsApp = [];
  const fetcher = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/rest/v1/rpc/messenger_settings_get')) {
      return Response.json({ mode: '24_7', telegramEnabled: true, whatsappEnabled: true, takeoverHours: 4 });
    }
    if (u.includes('/rest/v1/rpc/messenger_thread_get')) return Response.json(null);
    if (u.includes('/rest/v1/rpc/messenger_thread_upsert')) return Response.json({ ok: true, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' });
    if (u.includes('graph.facebook.com')) {
      sentWhatsApp.push(JSON.parse(init.body));
      return Response.json({ messages: [{ id: 'wamid.out1' }] });
    }
    return Response.json({ ok: true });
  };

  const env = makeMockEnv();
  const handler = whatsappWebhookHandlers(env, fetcher);

  // 1. GET challenge verification
  const challengeRes = await handler.get(
    new Request(`https://gorgona-one.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${env.WHATSAPP_VERIFY_TOKEN}&hub.challenge=987654321`)
  );
  assert.equal(challengeRes.status, 200);
  assert.equal(await challengeRes.text(), '987654321');

  // 2. POST rejects forged HMAC signature
  const body = JSON.stringify({
    entry: [{
      changes: [{
        value: {
          contacts: [{ wa_id: '13055551234', profile: { name: 'Sofia' } }],
          messages: [{ id: 'wamid.in1', from: '13055551234', type: 'text', text: { body: 'Looking for a Lamborghini Urus in Miami' } }]
        }
      }]
    }]
  });
  const forged = await handler.post(new Request('https://gorgona-one.com/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': 'sha256=deadbeef' },
    body
  }));
  assert.equal(forged.status, 401);

  // 3. Valid HMAC-SHA256 processes and replies via Graph API
  const validSig = await signMetaWebhookPayload(body, env.WHATSAPP_APP_SECRET);
  const okRes = await handler.post(new Request('https://gorgona-one.com/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': validSig },
    body
  }));
  const okJson = await okRes.json();
  assert.equal(okRes.status, 200);
  assert.equal(okJson.processed, 1);
  assert.equal(sentWhatsApp.length, 1);
  assert.equal(sentWhatsApp[0].to, '13055551234');
  assert.doesNotMatch(sentWhatsApp[0].text.body, /\bconcierge\b/i);
});

test('Admin Copilot enforces admin-only RBAC and generates localized reply draft + quote pre-fill', async () => {
  const bookingId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const fetcher = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      const isCustomer = init.headers?.Authorization === 'Bearer customer-token';
      return Response.json({ id: isCustomer ? ids.customer : ids.admin, email: isCustomer ? 'c@example.com' : 'a@example.com' });
    }
    if (u.includes('/rest/v1/profiles')) {
      const isCustomer = u.includes(ids.customer);
      return Response.json([{ id: isCustomer ? ids.customer : ids.admin, role: isCustomer ? 'user' : 'admin', name: 'Test' }]);
    }
    if (u.includes('/rest/v1/bookings')) {
      return Response.json([{
        id: bookingId,
        item_slug: 'lamborghini-urus-se',
        item_title: 'Lamborghini Urus SE',
        dates: '3 дня с субботы · 4 гостей',
        status: 'pending',
        kind: 'car',
        client_name: 'Дмитрий',
        client_email: 'dmitry@example.com',
        client_phone: '+1 305 555 0199'
      }]);
    }
    return Response.json([]);
  };

  const env = makeMockEnv();
  const handler = adminCopilotHandlers(env, fetcher);

  // Customer gets 403
  const forbidden = await handler.draftForRequest(new Request('https://gorgona-one.com/api/dashboard/copilot', {
    method: 'POST',
    headers: { Authorization: 'Bearer customer-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId })
  }));
  assert.equal(forbidden.status, 403);

  // Admin gets localized Russian reply draft + quote pre-fill + direct WhatsApp link
  const ok = await handler.draftForRequest(new Request('https://gorgona-one.com/api/dashboard/copilot', {
    method: 'POST',
    headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId })
  }));
  const data = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(data.clientLanguage, 'ru');
  assert.match(data.replyDraft, /Miami Elio/);
  assert.doesNotMatch(data.replyDraft, /\bconcierge\b|консьерж/iu);
  assert.ok(Number(data.quoteDraft.amountUsd) > 1000);
  assert.equal(data.quoteDraft.splitWays, '4');
  assert.ok(data.directLinks.whatsappHref.startsWith('https://wa.me/13055550199?text='));
  assert.ok(Array.isArray(data.managerTips) && data.managerTips.length >= 1);
});
