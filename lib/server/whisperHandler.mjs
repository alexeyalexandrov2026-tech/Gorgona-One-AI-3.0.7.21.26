// ===========================================================================
// Stage 3 ELIO+ Guide: Voice 2.0 Server Whisper Fallback (POST /api/concierge/transcribe).
//
// Uses the existing Cloudflare Workers AI binding (`CONCIERGE_AI`) so iPhone
// Safari, Firefox, and Instagram/TikTok WebViews without Web SpeechRecognition
// get crisp multilingual voice dictation across all 16 locales.
// Zero audio is ever stored or logged.
// ===========================================================================

import { digest, json, RequestError, failure } from './dashboardCore.mjs';
import { normalizeLocale } from '../ai/locale.js';

const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // 4 MB (~60s compressed webm/mp4/ogg)
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const recentByIp = new Map();

function allowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  if (!origin) return env.APP_ENV !== 'production';
  try {
    const parsed = new URL(origin);
    if (env.APP_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) return true;
    if (parsed.origin === new URL(request.url).origin) return true;
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

function bytesToBase64(bytes) {
  let bin = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(bin);
}

export function resetWhisperRateLimitForTests() {
  recentByIp.clear();
}

export function whisperHandlers(env = process.env, getAiBinding = null, clock = () => Date.now()) {
  return {
    transcribe: async (request) => {
      try {
        if (!allowedOrigin(request, env)) throw new RequestError(403, 'Forbidden');

        const rawIp = request.headers.get('cf-connecting-ip');
        const validIp = Boolean(rawIp && /^[a-f0-9:.]{3,64}$/i.test(rawIp));
        if (!validIp && env.APP_ENV === 'production') throw new RequestError(503, 'Service unavailable');
        const key = await digest(validIp ? rawIp : 'local');
        if (hitRateLimit(key, clock())) throw new RequestError(429, 'Too many requests');

        // Reject oversized payloads before buffering multipart/form-data into Worker memory.
        const declaredLength = Number(request.headers.get('content-length') || 0);
        if (declaredLength > MAX_AUDIO_BYTES + 32768) throw new RequestError(413, 'Audio too large');

        const contentType = (request.headers.get('content-type') || '').toLowerCase();
        let bytes;
        let rawLocale = '';

        if (contentType.includes('multipart/form-data')) {
          const form = await request.formData();
          const file = form.get('audio');
          if (!file || typeof file.arrayBuffer !== 'function') throw new RequestError(400, 'Missing audio');
          if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) throw new RequestError(413, 'Audio too large');
          bytes = new Uint8Array(await file.arrayBuffer());
          rawLocale = String(form.get('locale') || '').trim().toLowerCase();
        } else {
          const declared = Number(request.headers.get('content-length') || 0);
          if (declared > MAX_AUDIO_BYTES) throw new RequestError(413, 'Audio too large');
          const buf = await request.arrayBuffer();
          if (!buf.byteLength || buf.byteLength > MAX_AUDIO_BYTES) throw new RequestError(400, 'Invalid audio');
          bytes = new Uint8Array(buf);
          const url = new URL(request.url, 'https://gorgona-one.com');
          rawLocale = String(url.searchParams.get('locale') || '').trim().toLowerCase();
        }
        const autoDetect = !rawLocale || rawLocale === 'auto';
        const locale = autoDetect ? 'auto' : normalizeLocale(rawLocale);

        let ai = env.CONCIERGE_AI || null;
        if (!ai && typeof getAiBinding === 'function') {
          ai = await getAiBinding().catch(() => null);
        }
        if (!ai && typeof getAiBinding !== 'function') {
          try {
            const { getCloudflareContext } = await import('@opennextjs/cloudflare');
            ai = getCloudflareContext()?.env?.CONCIERGE_AI || null;
          } catch {
            ai = null;
          }
        }
        if (typeof ai?.run !== 'function') {
          return json({ text: '', unavailable: true }, 503);
        }

        const audioBase64 = bytesToBase64(bytes);
        let result = null;
        try {
          result = await ai.run('@cf/openai/whisper-large-v3-turbo', {
            audio: audioBase64,
            ...(autoDetect ? {} : { language: locale }),
            task: 'transcribe'
          });
        } catch {
          // Avoid OOM crash from spreading multi-MB Uint8Array into a JS Array:
          // retry turbo without forced language first; only use legacy byte-array
          // Whisper on small recordings <= 512 KB.
          if (!autoDetect) {
            try {
              result = await ai.run('@cf/openai/whisper-large-v3-turbo', {
                audio: audioBase64,
                task: 'transcribe'
              });
            } catch {
              result = null;
            }
          }
          if (!result && bytes.byteLength <= 512 * 1024) {
            result = await ai.run('@cf/openai/whisper', {
              audio: Array.from(bytes)
            });
          }
        }

        const text = typeof result?.text === 'string' ? result.text.trim().slice(0, 4000) : '';
        if (!text) return json({ text: '', empty: true }, 200);
        return json({ text, locale: autoDetect ? (result?.language || 'auto') : locale });
      } catch (error) {
        return failure(error);
      }
    }
  };
}
