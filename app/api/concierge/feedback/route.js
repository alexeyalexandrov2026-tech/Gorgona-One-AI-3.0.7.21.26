import { database, digest, json, readBody, RequestError, failure } from '../../../../lib/server/dashboardCore.mjs';
import { persistTelemetryEvent, persistTrainingSample, recordFeedbackVote } from '../../../../lib/server/conciergeTelemetry.mjs';
import { normalizeLocale } from '../../../../lib/ai/locale.js';

export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const recentByIp = new Map();

function sameOrigin(request, env) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  if (!origin) return env.APP_ENV !== 'production';
  try {
    const parsed = new URL(origin);
    if (env.APP_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) return true;
    return parsed.origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const env = process.env;
    if (!sameOrigin(request, env)) throw new RequestError(403, 'Forbidden');

    // Never persist telemetry/training data from the native Android app (Google Play Data safety).
    const ua = request.headers.get('user-agent') || '';
    if (/\bMiamiElioApp\//.test(ua)) return json({ ok: true, skipped: 'app' });

    const rawIp = request.headers.get('cf-connecting-ip');
    const validIp = Boolean(rawIp && /^[a-f0-9:.]{3,64}$/i.test(rawIp));
    if (!validIp && env.APP_ENV === 'production') throw new RequestError(503, 'Service unavailable');
    const key = await digest(validIp ? rawIp : 'local');
    const cutoff = Date.now() - WINDOW_MS;
    const list = (recentByIp.get(key) || []).filter((t) => t > cutoff);
    if (list.length >= MAX_PER_WINDOW) throw new RequestError(429, 'Too many requests');
    list.push(Date.now());
    recentByIp.set(key, list);
    if (recentByIp.size > 500) {
      for (const [k, v] of recentByIp.entries()) {
        if (!v.some((ts) => ts > cutoff)) recentByIp.delete(k);
      }
    }

    const body = await readBody(request, 12288);
    const vote = body?.vote === 'up' ? 'up' : body?.vote === 'down' ? 'down' : null;
    if (!vote) throw new RequestError(400, 'Invalid vote');
    const locale = normalizeLocale(body?.locale || 'en');

    recordFeedbackVote(vote);
    console.info(JSON.stringify({ event: 'concierge.feedback', vote, locale }));

    // Persist asynchronously (fail-safe if migration not yet applied).
    await Promise.allSettled([
      persistTelemetryEvent({ eventType: 'feedback', vote, locale }, env),
      body?.question && body?.answer
        ? persistTrainingSample({ question: body.question, answer: body.answer, vote, locale }, env)
        : Promise.resolve(false)
    ]);
    return json({ ok: true, vote });
  } catch (error) {
    return failure(error);
  }
}
