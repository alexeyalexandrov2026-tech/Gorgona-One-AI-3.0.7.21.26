// ===========================================================================
// Stage 3 ELIO+ Guide: Opt-In Female Voice TTS Handler (/api/tts).
//
// Strictly opt-in (triggered only when the guest taps the speaker button on
// a non-error assistant reply; never auto-plays). Brand voice: warm female
// ("женский") across all configured providers:
//   1. Premium provider via lib/ai/voice.js (ElevenLabs Sarah, OpenAI nova,
//      or Google Studio/Neural2 Female) when TTS_PROVIDER is set.
//   2. Cloudflare Workers AI female voice (@cf/deepgram/aura-2-en speaker
//      'luna' for English) via existing CONCIERGE_AI binding.
//   3. Graceful 503 { available: false, fallback: 'browser' } so client UI
//      can fall back cleanly to an on-demand female Web Speech voice.
// ===========================================================================

import { digest, json, readBody, RequestError, failure } from './dashboardCore.mjs';
import { getTtsConfig, synthesizeSpeech } from '../ai/voice.js';
import { normalizeLocale, speechLocale } from '../ai/locale.js';
import { readCachedTtsAudio, ttsCacheKey, writeCachedTtsAudio } from './ttsEdgeCache.mjs';

const MAX_TEXT_CHARS = 1200;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 15;
const recentByIp = new Map();

function allowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
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
  return false;
}

export function cleanSpeechText(raw) {
  return String(raw || '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\r?\n\s*[•*\-]\s+/g, '. ')
    .replace(/\r?\n+/g, '. ')
    .replace(/[•·|]+/g, ', ')
    .replace(/[*#_`~]+/g, ' ')
    .replace(/([.!?…:;])\s*\./g, '$1')
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*,/g, ',')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/^[.,;:\s]+/, '')
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

async function resolveRuntimeEnv(env) {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cfEnv = getCloudflareContext()?.env;
    if (cfEnv && typeof cfEnv === 'object') return { ...env, ...cfEnv };
  } catch {
    /* local Node / test environment */
  }
  return env || process.env;
}

async function resolveWorkersAi(env, getAiBinding) {
  if (env?.CONCIERGE_AI && typeof env.CONCIERGE_AI.run === 'function') return env.CONCIERGE_AI;
  if (typeof getAiBinding === 'function') return getAiBinding().catch(() => null);
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    return getCloudflareContext()?.env?.CONCIERGE_AI || null;
  } catch {
    return null;
  }
}

async function toArrayBuffer(output) {
  if (!output) return null;
  if (output instanceof ArrayBuffer) return output;
  if (ArrayBuffer.isView(output)) return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
  if (typeof output.arrayBuffer === 'function') return output.arrayBuffer();
  if (typeof output.getReader === 'function') {
    const reader = output.getReader();
    const chunks = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.byteLength;
        }
      }
    } finally {
      reader.releaseLock();
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    return merged.buffer;
  }
  if (typeof output.audio === 'string') {
    const bin = atob(output.audio);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  return null;
}

export function resetTtsRateLimitForTests() {
  recentByIp.clear();
}

export function ttsHandlers(env = process.env, { getAiBinding = null, synthesize = synthesizeSpeech, clock = () => Date.now() } = {}) {
  return {
    status: async () => {
      const runtimeEnv = await resolveRuntimeEnv(env);
      const cfg = getTtsConfig(runtimeEnv);
      const ai = await resolveWorkersAi(runtimeEnv, getAiBinding);
      const hasWorkersAi = typeof ai?.run === 'function';
      const provider = cfg.provider !== 'off' ? cfg.provider : (hasWorkersAi ? 'workers-ai' : 'browser');
      return json({ available: true, voice: 'female', provider });
    },
    speak: async (request) => {
      try {
        const runtimeEnv = await resolveRuntimeEnv(env);
        if (!allowedOrigin(request, runtimeEnv)) throw new RequestError(403, 'Forbidden');

        const ip = request.headers.get('cf-connecting-ip') || 'local';
        const rateKey = await digest(ip);
        if (hitRateLimit(rateKey, clock())) throw new RequestError(429, 'Too many requests');

        const body = await readBody(request, 8192);
        const text = cleanSpeechText(body?.text);
        if (!text) throw new RequestError(400, 'Text is required');
        const locale = normalizeLocale(body?.locale || 'en');
        const lang = speechLocale(locale);

        // 1. Premium multilingual female TTS (ElevenLabs Sarah / OpenAI nova / Google Studio Female)
        //    Check 24h Cloudflare Edge Cache first to save ElevenLabs credits on repeated phrases.
        const cfg = getTtsConfig(runtimeEnv);
        if (cfg.provider !== 'off') {
          const voiceId = cfg.voiceIdFemale || cfg.voiceFemale || cfg.voiceName || 'female';
          const cacheKey = await ttsCacheKey({ provider: cfg.provider, voiceId, locale, text });
          const cached = await readCachedTtsAudio(cacheKey);
          if (cached?.audio) {
            return new Response(cached.audio.slice(0), {
              status: 200,
              headers: {
                'content-type': cached.mime || 'audio/mpeg',
                'cache-control': 'private, max-age=3600',
                'x-elio-voice': 'female',
                'x-elio-tts-provider': cached.provider || cfg.provider,
                'x-elio-tts-cache': 'HIT'
              }
            });
          }

          const result = await synthesize(text, { lang, gender: 'female', env: runtimeEnv });
          if (result?.ok && result.audio) {
            await writeCachedTtsAudio(cacheKey, {
              audio: result.audio,
              mime: result.mime || 'audio/mpeg',
              provider: cfg.provider
            });
            return new Response(result.audio, {
              status: 200,
              headers: {
                'content-type': result.mime || 'audio/mpeg',
                'cache-control': 'private, max-age=3600',
                'x-elio-voice': 'female',
                'x-elio-tts-provider': cfg.provider,
                'x-elio-tts-cache': 'MISS'
              }
            });
          }
        }

        // 2. Cloudflare Workers AI female voice (@cf/deepgram/aura-2-en speaker 'luna' for English)
        const ai = await resolveWorkersAi(runtimeEnv, getAiBinding);
        if (typeof ai?.run === 'function' && locale === 'en') {
          try {
            const raw = await ai.run('@cf/deepgram/aura-2-en', {
              text,
              speaker: 'luna',
              encoding: 'mp3'
            });
            const audio = await toArrayBuffer(raw);
            if (audio && audio.byteLength > 256) {
              return new Response(audio, {
                status: 200,
                headers: {
                  'content-type': 'audio/mpeg',
                  'cache-control': 'no-store',
                  'x-elio-voice': 'female',
                  'x-elio-tts-provider': 'workers-ai-luna'
                }
              });
            }
          } catch {
            /* fall through cleanly to browser female voice fallback */
          }
        }

        // 3. No server audio produced: let client fall back smoothly to female Web Speech voice.
        return json({ available: false, voice: 'female', fallback: 'browser' }, 503);
      } catch (error) {
        return failure(error);
      }
    }
  };
}
