// First-party Firebase Cloud Messaging (FCM HTTP v1) sender for Cloudflare Workers & Node.js.
// Uses pure Web Crypto RS256 OAuth2 JWT signing (zero external SDK dependencies).
// Strictly functional trip alerts: ESIGN quote ready, booking confirmed/updated, weather alerts.
import { database } from './dashboardCore.mjs';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANDROID_CHANNEL_ID = 'miami-elio-trip';

let cachedToken = null;

function b64urlBytes(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlJson(obj) {
  return b64urlBytes(new TextEncoder().encode(JSON.stringify(obj)));
}

function pemToDer(pem) {
  const clean = String(pem || '')
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function fcmConfigured(env = process.env) {
  return Boolean(
    env?.FCM_PROJECT_ID &&
    env?.FCM_CLIENT_EMAIL &&
    env?.FCM_PRIVATE_KEY &&
    String(env.FCM_PRIVATE_KEY).includes('PRIVATE KEY')
  );
}

export function resetFcmTokenCacheForTests() {
  cachedToken = null;
}

export async function signFcmJwt(env, nowSec = Math.floor(Date.now() / 1000)) {
  const header = b64urlJson({ alg: 'RS256', typ: 'JWT' });
  const claim = b64urlJson({
    iss: env.FCM_CLIENT_EMAIL,
    scope: FCM_SCOPE,
    aud: TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600
  });
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(env.FCM_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  );
  return `${unsigned}.${b64urlBytes(sig)}`;
}

async function getFcmAccessToken(env, fetcher = fetch, nowMs = Date.now()) {
  if (
    cachedToken &&
    cachedToken.email === env.FCM_CLIENT_EMAIL &&
    cachedToken.expiresAt > nowMs + 60_000
  ) {
    return cachedToken.token;
  }
  const assertion = await signFcmJwt(env, Math.floor(nowMs / 1000));
  const res = await fetcher(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }).toString()
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    throw new Error(`FCM OAuth failed (${res.status})`);
  }
  cachedToken = {
    email: env.FCM_CLIENT_EMAIL,
    token: data.access_token,
    expiresAt: nowMs + Math.min(Number(data.expires_in) || 3600, 3600) * 1000
  };
  return cachedToken.token;
}

export function localizedPushCopy(type, locale = 'en', { itemTitle = '' } = {}) {
  const lang = String(locale || 'en').toLowerCase().slice(0, 2);
  const item = String(itemTitle || '').trim().slice(0, 80);
  if (type === 'quote_ready') {
    const map = {
      ru: {
        title: 'Счёт Miami Elio готов',
        body: item ? `${item} — проверьте детали и подпишите онлайн.` : 'Ваше предложение готово к просмотру и подписи.'
      },
      es: {
        title: 'Tu cotización de Miami Elio está lista',
        body: item ? `${item} — revisa los detalles y firma en línea.` : 'Revisa y firma tu cotización en la app.'
      },
      uk: {
        title: 'Рахунок Miami Elio готовий',
        body: item ? `${item} — перевірте деталі та підпишіть онлайн.` : 'Ваша пропозиція готова до перегляду та підпису.'
      }
    };
    return map[lang] || {
      title: 'Your Miami Elio quote is ready',
      body: item ? `${item} — review details and e-sign now.` : 'Review and e-sign your quote in the app.'
    };
  }
  if (type === 'quote_paid') {
    const map = {
      ru: {
        title: 'Оплата подтверждена',
        body: item ? `${item} — пропуск и детали уже в разделе «Моя поездка».` : 'Бронь подтверждена. Детали доступны в «Моя поездка».'
      },
      es: {
        title: 'Pago confirmado',
        body: item ? `${item} — tu pase ya está listo en Mi viaje.` : 'Reserva confirmada. Abre Mi viaje para ver los detalles.'
      },
      uk: {
        title: 'Оплату підтверджено',
        body: item ? `${item} — деталі вже у розділі «Моя поїздка».` : 'Бронювання підтверджено. Відкрийте «Моя поїздка».'
      }
    };
    return map[lang] || {
      title: 'Payment confirmed — Miami Elio',
      body: item ? `${item} — your pass is ready in My Trip.` : 'Your booking is confirmed. Open My Trip for details.'
    };
  }
  const map = {
    ru: {
      title: 'Обновление по вашей поездке',
      body: item ? `${item} — команда Miami Elio обновила статус заявки.` : 'Команда Miami Elio обновила статус вашей заявки.'
    },
    es: {
      title: 'Actualización de tu viaje',
      body: item ? `${item} — el equipo de Miami Elio actualizó tu solicitud.` : 'El equipo de Miami Elio actualizó tu solicitud.'
    },
    uk: {
      title: 'Оновлення щодо вашої поїздки',
      body: item ? `${item} — команда Miami Elio оновила статус заявки.` : 'Команда Miami Elio оновила статус вашої заявки.'
    }
  };
  return map[lang] || {
    title: 'Update on your Miami trip',
    body: item ? `${item} — the Miami Elio team updated your booking.` : 'The Miami Elio team updated your booking.'
  };
}

function safePath(path) {
  const p = String(path || '/trip').trim();
  return p.startsWith('/') && !p.startsWith('//') && !p.includes('\\') ? p.slice(0, 200) : '/trip';
}

export async function sendFcmMessage({ token, title, body, path = '/trip', type = 'booking_update' }, env = process.env, fetcher = fetch) {
  if (!fcmConfigured(env)) return { ok: false, skipped: 'unconfigured' };
  const accessToken = await getFcmAccessToken(env, fetcher);
  const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(env.FCM_PROJECT_ID)}/messages:send`;
  const targetPath = safePath(path);

  const res = await fetcher(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: String(title || 'Miami Elio').slice(0, 120),
          body: String(body || '').slice(0, 240)
        },
        data: {
          path: targetPath,
          type: String(type || 'booking_update').slice(0, 40)
        },
        android: {
          priority: 'high',
          notification: {
            channel_id: ANDROID_CHANNEL_ID
          }
        }
      }
    })
  });
  if (res.ok) return { ok: true };
  const errText = await res.text().catch(() => '');
  const unregistered = res.status === 404 || errText.includes('UNREGISTERED');
  return { ok: false, status: res.status, unregistered };
}

export async function notifyCustomerPush(
  { userId = null, email = null, type = 'booking_update', itemTitle = '', path = '/trip' },
  env = process.env,
  fetcher = fetch
) {
  if (!fcmConfigured(env)) return { sent: 0, skipped: 'unconfigured' };
  if (!userId && !email) return { sent: 0, skipped: 'no_recipient' };
  try {
    const db = database(env, fetcher);
    const recipients = await db.rpc('push_tokens_for_recipient', {
      p_user_id: userId || null,
      p_email: email ? String(email).trim().toLowerCase() : null
    });
    if (!Array.isArray(recipients) || !recipients.length) return { sent: 0 };

    let sent = 0;
    const staleTokens = [];
    await Promise.allSettled(
      recipients.map(async (row) => {
        if (!row?.token) return;
        const copy = localizedPushCopy(type, row.locale || 'en', { itemTitle });
        const result = await sendFcmMessage(
          { token: row.token, title: copy.title, body: copy.body, path, type },
          env,
          fetcher
        );
        if (result.ok) sent += 1;
        else if (result.unregistered) staleTokens.push(row.token);
      })
    );

    if (staleTokens.length && env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_URL) {
      await Promise.allSettled(
        staleTokens.map((tok) =>
          fetcher(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/device_push_tokens?token=eq.${encodeURIComponent(tok)}`, {
            method: 'DELETE',
            headers: {
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
            }
          })
        )
      );
    }
    return { sent, cleaned: staleTokens.length };
  } catch {
    return { sent: 0, error: true };
  }
}
