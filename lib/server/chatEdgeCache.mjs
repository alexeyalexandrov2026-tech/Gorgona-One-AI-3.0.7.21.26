// ===========================================================================
// Stage 3 ELIO+ Guide: 15-minute Cloudflare Edge Cache + In-Isolate LRU
// for popular first-turn, non-personalized starter prompts (<150ms response
// and 30-40% Workers AI savings).
//
// Strictly skips caching for:
// - multi-turn threads (messages.length > 1)
// - authenticated requests (Authorization header)
// - savedPrefs or specific entity pages
// - weather / time / live-events / booking handoffs / errors
// ===========================================================================

import { normalizeLocale } from '../ai/locale.js';

const CACHE_TTL_SECONDS = 900; // 15 minutes
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;
const MAX_LOCAL_ENTRIES = 64;
const CACHE_ORIGIN = 'https://cache.elio.internal/v1/chat/';

const localCache = new Map(); // cacheKey -> { expiresAt, payload }

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(String(input || ''));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

const VOLATILE_RE = /(?<![\p{L}\p{N}])(?:weather|forecast|rain|storm|hurricane|temperature|time|clock|tonight|today|tomorrow|right\s+now|погод\p{L}*|прогноз|дожд\p{L}*|время|сколько\s+времени|сегодня|завтра|сейчас|clima|tiempo|hoy|mañana)(?![\p{L}\p{N}])/iu;

export function isCacheableChatTurn({
  messages = [],
  savedPrefs = null,
  pagePath = '',
  hasAuth = false,
  wantsForecast = false,
  wantsEvents = false,
  bookingTurn = false
} = {}) {
  if (!Array.isArray(messages) || messages.length !== 1) return false;
  if (hasAuth || savedPrefs || wantsForecast || wantsEvents || bookingTurn) return false;
  if (pagePath && pagePath !== '/' && pagePath !== '/discovery') return false;
  const text = String(messages[0]?.content || '').trim();
  if (!text || text.length > 180 || VOLATILE_RE.test(text)) return false;
  return true;
}

export async function chatCacheKey(locale, text) {
  const code = normalizeLocale(locale);
  const normalized = String(text || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  const digest = await sha256Hex(`${code}|${normalized}`);
  return `${code}-${digest.slice(0, 32)}`;
}

export async function readCachedChatReply(key) {
  if (!key) return null;
  const now = Date.now();
  const local = localCache.get(key);
  if (local) {
    if (local.expiresAt > now) {
      localCache.delete(key);
      localCache.set(key, local);
      return local.payload;
    }
    localCache.delete(key);
  }
  try {
    const cfCache = globalThis.caches?.default;
    if (cfCache) {
      const hit = await cfCache.match(new Request(CACHE_ORIGIN + key));
      if (hit && hit.ok) {
        const data = await hit.json().catch(() => null);
        if (data && typeof data.reply === 'string') {
          localCache.set(key, { expiresAt: now + CACHE_TTL_MS, payload: data });
          return data;
        }
      }
    }
  } catch {
    /* fail-safe: cache miss */
  }
  return null;
}

export async function writeCachedChatReply(key, payload) {
  if (!key || !payload || typeof payload.reply !== 'string' || payload.error || payload.handoff || payload.decidedBy !== 'model') {
    return;
  }
  const now = Date.now();
  const clean = {
    reply: payload.reply,
    ...(payload.replyLocale ? { replyLocale: payload.replyLocale } : {}),
    cards: Array.isArray(payload.cards) ? payload.cards : [],
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
    listings: Array.isArray(payload.listings) ? payload.listings : [],
    ...(payload.plan ? { plan: payload.plan } : {}),
    decidedBy: 'model',
    ...(payload.action ? { action: payload.action } : {}),
    ...(payload.responsePolicy ? { responsePolicy: payload.responsePolicy } : {}),
    configured: true,
    source: 'edge-cache'
  };
  localCache.set(key, { expiresAt: now + CACHE_TTL_MS, payload: clean });
  if (localCache.size > MAX_LOCAL_ENTRIES) {
    const oldest = localCache.keys().next().value;
    if (oldest) localCache.delete(oldest);
  }
  try {
    const cfCache = globalThis.caches?.default;
    if (cfCache) {
      const response = new Response(JSON.stringify(clean), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': `public, max-age=${CACHE_TTL_SECONDS}`
        }
      });
      await cfCache.put(new Request(CACHE_ORIGIN + key), response);
    }
  } catch {
    /* fail-safe: ignore edge cache write errors */
  }
}

export function resetChatEdgeCacheForTests() {
  localCache.clear();
}
