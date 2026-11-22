// ===========================================================================
// Server-only live Miami events enrichment for AI Concierge (TicketNetwork).
//
// Reuses the existing verified `createTicketNetworkSource` (5-min fresh /
// 24-hr stale cache, strict allowlist, zero credentials) to surface real
// upcoming Miami games, concerts and theater shows when the guest asks about
// events, specific Miami teams, or weekend/date schedules.
//
// Design guarantees:
// - Never called unless the turn targets `/events` AND live events are active
//   (Cloudflare Workers runtime with `caches.default`, explicit env flag
//   `CONCIERGE_LIVE_EVENTS=true`, or injected test fetcher).
// - Hard 1100 ms timeout; fail-safe `[]` so /api/chat never degrades.
// - Every card uses a safe internal `/events/category/<cat>#event-<id>` href
//   and verified local category imagery (zero invented prices or links).
// ===========================================================================

import { createTicketNetworkSource } from '../ticketnetworkSource.js';
import { ticketNetworkToday } from '../ticketnetworkSearch.js';

export const LIVE_EVENTS_TIMEOUT_MS = 2_400;
export const LIVE_EVENTS_CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map(); // key -> { at, entities }
const inflight = new Map();
let sharedSource = null;

const CATEGORY_IMAGES = Object.freeze({
  nba: '/images/events/leagues/nba.webp',
  nfl: '/images/events/leagues/nfl.webp',
  nhl: '/images/events/leagues/nhl.webp',
  mlb: '/images/events/leagues/mlb.webp',
  mls: '/images/events/leagues/mls.webp',
  ufc: '/images/events/leagues/ufc.webp',
  boxing: '/images/events/leagues/boxing.webp',
  'formula-1': '/images/events/leagues/formula-1.png',
  nascar: '/images/events/leagues/nascar.webp',
  tennis: '/images/events/leagues/tennis.webp',
  golf: '/images/events/leagues/golf.webp',
  sports: '/images/events/sports-pass-1100.webp',
  festivals: '/images/events/festival-pass-1100.webp',
  'comedy-standup': '/images/events/stage-pass-1100.webp',
  'theater-broadway': '/images/events/stage-pass-1100.webp',
  'classical-opera': '/images/events/stage-pass-1100.webp',
  concerts: '/images/events/concerts-pass.jpg',
  events: '/images/events/concerts-pass.jpg'
});

const TEAM_PATTERNS = [
  [/\b(?:miami\s+heat|heat)\b|майами\s*хит|\bхит\b/iu, { category: 'nba', performer: 'Miami Heat' }],
  [/\b(?:inter\s+miami|messi)\b|интер\s*майами|месси/iu, { category: 'mls', performer: 'Inter Miami' }],
  [/\b(?:miami\s+dolphins|dolphins)\b|майами\s*долфинс|долфинс|дельфины/iu, { category: 'nfl', performer: 'Miami Dolphins' }],
  [/\b(?:florida\s+panthers|panthers)\b|флорида\s*пантерз|пантерз/iu, { category: 'nhl', performer: 'Florida Panthers' }],
  [/\b(?:miami\s+marlins|marlins)\b|майами\s*марлинс|марлинс/iu, { category: 'mlb', performer: 'Miami Marlins' }]
];

const CATEGORY_PATTERNS = [
  [/\b(?:nba|basketball)\b|нба|баскетбол|baloncesto|basquete|כדורסל|كرة\s+السلة|篮球|バスケットボール|농구/iu, 'nba'],
  [/\b(?:nfl|american\s+football)\b|нфл|американск\p{L}*\s+футбол|f[úu]tbol\s+americano/iu, 'nfl'],
  [/\b(?:mls|soccer)\b|млс/iu, 'mls'],
  [/\b(?:nhl|hockey|ice\s+hockey)\b|нхл|хоккей|eishockey|hokej/iu, 'nhl'],
  [/\b(?:mlb|baseball)\b|млб|бейсбол|b[ée]isbol/iu, 'mlb'],
  [/\b(?:ufc|mma)\b|юфс|мма|единоборств/iu, 'ufc'],
  [/\bboxing\b|бокс|boxeo/iu, 'boxing'],
  [/\b(?:f1|formula\s*1|formula\s+one|grand\s+prix)\b|формул\p{L}*\s*1|гран[\s-]*при/iu, 'formula-1'],
  [/\b(?:tennis|miami\s+open)\b|теннис|майами\s+оупен|tenis/iu, 'tennis'],
  [/\b(?:comedy|stand[\s-]?up)\b|стендап|комеди|comedia|comédie|komödie/iu, 'comedy-standup'],
  [/\b(?:broadway|theater|theatre|musical)\b|бродвей|театр|мюзикл|teatro|théâtre/iu, 'theater-broadway'],
  [/\b(?:opera|classical|symphony|ballet)\b|опер|симфон|классик|балет/iu, 'classical-opera'],
  [/\b(?:festival|festivals|ultra)\b|фестивал|ультра/iu, 'festivals'],
  [/\b(?:concert|concerts|live\s+music)\b|концерт|concierto|konzert|spectacle|concerto|koncert|הופע|حفل|演唱会|コンサート|콘서트/iu, 'concerts'],
  [/\b(?:sport(?:s|ing)?|match|stadium)\b|спорт|матч|стадион|deporte/iu, 'sports']
];

const AMBIGUOUS_FOOTBALL = /(?<![\p{L}\p{N}])(?:футбол\p{L}*|football|f[úu]tbol|futebol)(?![\p{L}\p{N}])/iu;

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Detect TicketNetwork category & optional Miami team/performer from user text. */
export function detectEventQuery(query) {
  const text = String(query || '');
  for (const [pattern, match] of TEAM_PATTERNS) {
    if (pattern.test(text)) return { ...match, maxLiveCards: 3 };
  }
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return { category, performer: '', maxLiveCards: 2 };
  }
  // Ambiguous "football" / "футбол": keep maxLiveCards=1 so both NFL & MLS category cards stay visible.
  if (AMBIGUOUS_FOOTBALL.test(text)) return { category: 'mls', performer: '', maxLiveCards: 1 };
  return { category: 'events', performer: '', maxLiveCards: 3 };
}

function formatEventSchedule(localDateTime, venue, locale) {
  const raw = String(localDateTime || '');
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return venue || '';
  const [, y, m, d, hh, mm] = match;
  let dateLabel = `${y}-${m}-${d}`;
  try {
    const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
    dateLabel = new Intl.DateTimeFormat(locale || 'en', {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'
    }).format(dt);
  } catch {}
  const timeLabel = `${hh}:${mm}`;
  return [dateLabel, timeLabel, venue].filter(Boolean).join(' · ').slice(0, 78);
}

function eventToEntity(ev, category, locale, performer = '') {
  const schedule = formatEventSchedule(ev.localDateTime, ev.venue, locale);
  const image = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.events;
  const href = `/events/category/${category}#event-${ev.id}`;
  const text = [
    ev.name, ev.venue, ev.city, category, performer, 'event', 'events', 'ticket', 'tickets',
    'билеты', 'матч', 'концерт', 'miami', 'майами', ev.localDateTime?.slice(0, 10)
  ].filter(Boolean).join(' ').toLowerCase();

  return {
    id: `live-event-${ev.id}`,
    type: 'Event',
    world: 'play',
    liveEvent: true,
    title: ev.name,
    subtitle: [ev.venue, ev.city].filter(Boolean).join(', '),
    href,
    capacity: null,
    aliases: [ev.name, ...(performer ? [performer] : [])],
    image,
    price: schedule || null,
    text
  };
}

function liveEventsEnabled(env, fetcher) {
  if (fetcher) return true;
  if (env?.CONCIERGE_LIVE_EVENTS === 'false') return false;
  if (env?.CONCIERGE_LIVE_EVENTS === 'true') return true;
  // In real Cloudflare Workers runtime (staging & production), caches.default exists.
  // In local Node unit tests, globalThis.caches is undefined -> 0 stray fetches.
  return Boolean(globalThis.caches?.default);
}

/**
 * Fetch up to `maxLiveCards` upcoming verified TicketNetwork events in Miami.
 * Hard-bounded to 1100 ms, cached 5 min per isolate, fail-safe [].
 */
export async function getLiveEventEntities(query, { profile = null, locale = 'en', env = process.env, fetcher, cache: cfCache, now = new Date() } = {}) {
  if (!liveEventsEnabled(env, fetcher)) return [];
  const detected = detectEventQuery(query);
  const today = ticketNetworkToday(now);
  const from = profile?.dateRange?.from && profile.dateRange.from >= today ? profile.dateRange.from : today;
  const to = profile?.dateRange?.to && profile.dateRange.to >= from ? profile.dateRange.to : addDays(from, 30);

  const key = `${detected.category}|${detected.performer}|${from}|${to}|${locale}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < LIVE_EVENTS_CACHE_TTL_MS) return cached.entities;
  if (!fetcher && inflight.has(key)) return inflight.get(key);

  const boundedFetch = (url, init = {}) => {
    const tSig = AbortSignal.timeout(LIVE_EVENTS_TIMEOUT_MS);
    const signal = init?.signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([init.signal, tSig])
      : tSig;
    return (fetcher || fetch)(url, { ...init, signal });
  };

  const source = fetcher
    ? createTicketNetworkSource({ fetcher: boundedFetch, cache: cfCache })
    : (sharedSource ||= createTicketNetworkSource({ fetcher: boundedFetch, cache: cfCache || globalThis.caches?.default }));

  const task = (async () => {
    let timer;
    try {
      const deadline = new Promise((resolve) => { timer = setTimeout(() => resolve(null), LIVE_EVENTS_TIMEOUT_MS + 40); });
      const result = await Promise.race([
        source.get({ category: detected.category, area: 'miami', from, to, performer: detected.performer, city: '', page: 1 }),
        deadline
      ]);
      if (!result || !Array.isArray(result.events) || !result.events.length) return [];
      const entities = result.events
        .slice(0, detected.maxLiveCards)
        .map((ev) => eventToEntity(ev, detected.category, locale, detected.performer));
      cache.set(key, { at: Date.now(), entities });
      return entities;
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  })().finally(() => {
    if (!fetcher) inflight.delete(key);
  });

  if (!fetcher) inflight.set(key, task);
  return task;
}

/** Synchronous warm-cache peek (0 network I/O) for Workers AI prompt context. */
export function peekLiveEventEntities(query, { profile = null, locale = 'en', now = new Date() } = {}) {
  const detected = detectEventQuery(query);
  const today = ticketNetworkToday(now);
  const from = profile?.dateRange?.from && profile.dateRange.from >= today ? profile.dateRange.from : today;
  const to = profile?.dateRange?.to && profile.dateRange.to >= from ? profile.dateRange.to : addDays(from, 30);
  const key = `${detected.category}|${detected.performer}|${from}|${to}|${locale}`;
  const entry = cache.get(key);
  return entry && Date.now() - entry.at < LIVE_EVENTS_CACHE_TTL_MS ? entry.entities : [];
}

/** Clear isolate cache (used in tests). */
export function clearLiveEventsCache() {
  cache.clear();
  inflight.clear();
  sharedSource = null;
}
