// ===========================================================================
// Soft lead-capture & guest convenience: email a curated ELIO+ Guide plan via
// the existing Resend configuration with strict same-origin, rate-limit, and
// daily email budget guards (zero guest text logged).
// ===========================================================================

import { database, digest, json, readBody, RequestError, failure } from './dashboardCore.mjs';
import { getShareCopy } from '../ai/sharePlan.mjs';
import { normalizeLocale } from '../ai/locale.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const MAX_DAILY_PLAN_EMAILS = 20;
const recentByIp = new Map();
let dailyCounter = { day: '', count: 0 };

function allowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  if (!origin) return env.APP_ENV !== 'production';
  try {
    const parsed = new URL(origin);
    if (env.APP_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) return true;
    const reqUrl = new URL(request.url);
    if (parsed.origin === reqUrl.origin) return true;
    const allowed = new Set([
      'https://gorgona-one.com',
      'https://miamielio.com',
      'https://www.miamielio.com',
      ...String(env.PUBLIC_SITE_ORIGIN || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)
    ]);
    return allowed.has(parsed.origin);
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hitRateLimit(key, now = Date.now()) {
  const cutoff = now - WINDOW_MS;
  const list = (recentByIp.get(key) || []).filter((ts) => ts > cutoff);
  if (list.length >= MAX_PER_WINDOW) {
    recentByIp.set(key, list);
    return true;
  }
  list.push(now);
  recentByIp.set(key, list);
  if (recentByIp.size > 500) {
    for (const [k, v] of recentByIp.entries()) {
      if (!v.some((ts) => ts > cutoff)) recentByIp.delete(k);
    }
  }
  return false;
}

function hitDailyPlanCap(now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  if (dailyCounter.day !== day) {
    dailyCounter = { day, count: 0 };
  }
  if (dailyCounter.count >= MAX_DAILY_PLAN_EMAILS) return true;
  dailyCounter.count += 1;
  return false;
}

export function resetEmailPlanRateLimitForTests() {
  recentByIp.clear();
  dailyCounter = { day: '', count: 0 };
}

export function emailPlanHandlers(env = process.env, fetcher = fetch, clock = () => Date.now()) {
  return {
    send: async (request) => {
      try {
        if (!allowedOrigin(request, env)) throw new RequestError(403, 'Forbidden');

        const body = await readBody(request, 8192);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const planText = typeof body.planText === 'string' ? body.planText.trim() : '';
        const locale = normalizeLocale(body.locale || 'en');

        if (!email || email.length > 254 || !EMAIL_RE.test(email) || CONTROL.test(email)) {
          throw new RequestError(400, 'Invalid email');
        }
        if (!planText || planText.length < 20 || planText.length > 4000 || CONTROL.test(planText)) {
          throw new RequestError(400, 'Invalid itinerary');
        }

        // Rate-limit strictly by caller IP (not ip|email) so one IP cannot relay
        // spam to arbitrary victim addresses or exhaust the owner's alert budget.
        const rawIp = request.headers.get('cf-connecting-ip');
        const validIp = Boolean(rawIp && /^[a-f0-9:.]{3,64}$/i.test(rawIp));
        if (!validIp && env.APP_ENV === 'production') {
          throw new RequestError(503, 'Service unavailable');
        }
        const now = clock();
        const ipKey = await digest(`email-plan:${validIp ? rawIp : 'local'}`);
        if (hitRateLimit(ipKey, now)) {
          throw new RequestError(429, 'Too many requests');
        }

        if (!env.RESEND_API_KEY || !env.NOTIFICATIONS_FROM_EMAIL) {
          return json({ sent: false, reason: 'unavailable' }, 503);
        }

        // Dedicated daily cap for guest itinerary emails so they never starve
        // critical owner booking/payment alerts in dashboard_reserve_email.
        if (hitDailyPlanCap(now)) {
          return json({ sent: false, reason: 'quota' }, 429);
        }

        // Also respect shared daily Resend quota when Supabase service credentials are present.
        if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
          const db = database(env, fetcher);
          const reserved = await db.rpc('dashboard_reserve_email', {});
          if (!reserved) return json({ sent: false, reason: 'quota' }, 429);
        }

        const shareCopy = getShareCopy(locale);
        const subject = shareCopy.header || 'MIAMI ELIO — Personal ELIO+ Guide Plan';
        const htmlLines = planText
          .split(/\r?\n/)
          .map((line) => {
            const safe = escapeHtml(line);
            const linked = safe.replace(/(https:\/\/gorgona-one\.com[^\s<]*)/g, '<a href="$1" style="color:#d4af37;text-decoration:underline;">$1</a>');
            return linked ? `<p style="margin:0 0 10px;line-height:1.55;">${linked}</p>` : '<div style="height:6px;"></div>';
          })
          .join('');

        const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#01212c;color:#f5f2eb;font-family:Inter,Arial,sans-serif;">
          <div style="max-width:600px;margin:0 auto;border:1px solid rgba(212,175,55,0.35);border-radius:20px;background:#07151e;padding:28px;">
            <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#d4af37;">MIAMI ELIO · ELIO+ GUIDE</p>
            <div style="font-size:15px;color:#edf2f3;">${htmlLines}</div>
            <hr style="border:none;border-top:1px solid rgba(255,255,255,0.12);margin:20px 0;" />
            <p style="margin:0;font-size:12px;color:#9ca3af;">MIAMI ELIO · <a href="https://gorgona-one.com/trip" style="color:#d4af37;">Live Trip Room</a> · <a href="https://gorgona-one.com" style="color:#d4af37;">gorgona-one.com</a></p>
          </div>
        </body></html>`;

        const idempotencyKey = 'plan-email/' + (await digest(`${email}|${planText.slice(0, 500)}|${Math.floor(clock() / WINDOW_MS)}`)).slice(0, 32);
        const response = await fetcher('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + env.RESEND_API_KEY,
            'Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            from: env.NOTIFICATIONS_FROM_EMAIL,
            to: email,
            subject,
            text: planText,
            html
          }),
          signal: AbortSignal.timeout(8000)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.id !== 'string') {
          return json({ sent: false, reason: 'provider_error' }, 502);
        }
        return json({ sent: true });
      } catch (error) {
        return failure(error);
      }
    }
  };
}
