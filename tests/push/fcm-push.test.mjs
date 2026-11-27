import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  fcmConfigured,
  localizedPushCopy,
  notifyCustomerPush,
  resetFcmTokenCacheForTests,
  sendFcmMessage,
  signFcmJwt
} from '../../lib/server/fcmPush.mjs';
import { pushRegisterHandlers } from '../../lib/server/pushRegisterHandler.mjs';

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

function makeFcmEnv(extra = {}) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    FCM_PROJECT_ID: 'gorgona-platform-gcp',
    FCM_CLIENT_EMAIL: 'fcm-push-sender@gorgona-platform-gcp.iam.gserviceaccount.com',
    FCM_PRIVATE_KEY: privateKey,
    ...extra
  };
}

test('FCM Push: signs valid RS256 OAuth2 JWT and sends FCM HTTP v1 payload', async () => {
  resetFcmTokenCacheForTests();
  const env = makeFcmEnv();
  assert.equal(fcmConfigured(env), true);
  assert.equal(fcmConfigured({}), false);

  const jwt = await signFcmJwt(env, 1700000000);
  const parts = jwt.split('.');
  assert.equal(parts.length, 3);
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  assert.equal(claims.iss, env.FCM_CLIENT_EMAIL);
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/firebase.messaging');

  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), method: init?.method || 'GET', body: init?.body });
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'ya29.test-token', expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify({ name: 'projects/gorgona-platform-gcp/messages/m1' }), { status: 200 });
  };

  const res = await sendFcmMessage(
    {
      token: 'fcm_device_token_123456789012345678901234567890',
      title: 'Quote ready',
      body: 'Review and sign',
      path: '/pay/tok_abc',
      type: 'quote_ready'
    },
    env,
    fetcher
  );
  assert.equal(res.ok, true);
  assert.equal(calls.length, 2);
  const fcmCall = calls[1];
  assert.match(fcmCall.url, /fcm\.googleapis\.com\/v1\/projects\/gorgona-platform-gcp\/messages:send/);
  const sent = JSON.parse(fcmCall.body);
  assert.equal(sent.message.data.path, '/pay/tok_abc');
  assert.equal(sent.message.android.notification.channel_id, 'miami-elio-trip');
});

test('FCM Push: notifyCustomerPush sends localized alerts and cleans UNREGISTERED stale tokens', async () => {
  resetFcmTokenCacheForTests();
  const env = makeFcmEnv();
  const calls = [];
  const goodToken = 'good_device_token_123456789012345678901234567890';
  const deadToken = 'dead_device_token_123456789012345678901234567890';

  const fetcher = async (url, init) => {
    const u = String(url);
    calls.push({ url: u, method: init?.method || 'GET', body: init?.body || null });
    if (u.includes('/rest/v1/rpc/push_tokens_for_recipient')) {
      return new Response(JSON.stringify([
        { token: goodToken, platform: 'android', locale: 'ru' },
        { token: deadToken, platform: 'android', locale: 'en' }
      ]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (u.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'ya29.test-token', expires_in: 3600 }), { status: 200 });
    }
    if (u.includes('fcm.googleapis.com')) {
      const payload = JSON.parse(init.body);
      if (payload.message.token === deadToken) {
        return new Response(JSON.stringify({ error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } }), { status: 404 });
      }
      return new Response(JSON.stringify({ name: 'projects/gorgona-platform-gcp/messages/ok' }), { status: 200 });
    }
    return new Response(null, { status: 204 });
  };

  const out = await notifyCustomerPush(
    { email: 'vip@example.com', type: 'quote_ready', itemTitle: 'Lamborghini Urus SE', path: '/pay/tok_99' },
    env,
    fetcher
  );
  assert.equal(out.sent, 1);
  assert.equal(out.cleaned, 1);
  assert.ok(calls.some((c) => c.method === 'DELETE' && c.url.includes(encodeURIComponent(deadToken))));

  const ruCopy = localizedPushCopy('quote_ready', 'ru', { itemTitle: 'Urus SE' });
  assert.match(ruCopy.title, /Miami Elio/);
  assert.doesNotMatch(ruCopy.title + ruCopy.body, /concierge|консьерж/i);
});

test('FCM Push: /api/push/register enforces auth, validates token format, and upserts under caller JWT', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    const u = String(url);
    calls.push({ url: u, method: init?.method || 'GET', headers: init?.headers, body: init?.body });
    if (u.includes('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', email: 'vip@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' }), { status: 200 });
    }
    if (u.includes('/rest/v1/profiles')) {
      return new Response(JSON.stringify([{ role: 'user' }]), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const handlers = pushRegisterHandlers(makeFcmEnv(), fetcher);

  const anon = await handlers.register(new Request('https://gorgona-one.com/api/push/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'valid_token_123456789012345678901234567890' })
  }));
  assert.equal(anon.status, 401);

  const badTok = await handlers.register(new Request('https://gorgona-one.com/api/push/register', {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-token-12345678901234567890', 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'too-short' })
  }));
  assert.equal(badTok.status, 400);

  const ok = await handlers.register(new Request('https://gorgona-one.com/api/push/register', {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-token-12345678901234567890', 'content-type': 'application/json' },
    body: JSON.stringify({ token: 'valid_token_123456789012345678901234567890', platform: 'android', locale: 'ru', appVersion: '1.5.1' })
  }));
  assert.equal(ok.status, 200);
  const rpc = calls.find((c) => c.url.includes('/rest/v1/rpc/push_token_upsert'));
  assert.ok(rpc, 'must call push_token_upsert RPC');
  assert.equal(JSON.parse(rpc.body).p_locale, 'ru');

  const sql = fs.readFileSync(new URL('../../supabase/migrations/20261127000000_device_push_tokens.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on function public\.push_tokens_for_recipient/);
});
