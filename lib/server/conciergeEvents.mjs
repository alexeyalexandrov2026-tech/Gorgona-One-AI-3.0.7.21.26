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
  nba: '/images/events/leagues/nba.png',
  nfl: '/images/events/leagues/nfl.png',
  nhl: '/images/events/leagues/nhl.png',
  mlb: '/images/events/leagues/mlb.png',
  mls: '/images/events/leagues/mls.jpg',
  ufc: '/images/events/leagues/ufc.png',
  boxing: '/images/events/sports-pass-1100.webp',
  'formula-1': '/images/events/leagues/formula-1.png',
  nascar: '/images/events/leagues/nascar.png',
  tennis: '/images/events/leagues/tennis.webp',
  golf: '/images/events/leagues/golf.jpg',
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
  [/\b(?:miami\s+marlins|marlins)\b|майами\s*марлинс|марлинс/iu, { category: 'mlb', performer: 'Miami Marlins' }],
  // Major visiting NBA teams
  [/\b(?:los\s+angeles\s+lakers|la\s+lakers|lakers)\b|лейкерс/iu, { category: 'nba', performer: 'Lakers' }],
  [/\b(?:boston\s+celtics|celtics)\b|селтикс/iu, { category: 'nba', performer: 'Celtics' }],
  [/\b(?:golden\s+state\s+warriors|warriors)\b|уорриор[зс]/iu, { category: 'nba', performer: 'Warriors' }],
  [/\b(?:new\s+york\s+knicks|knicks)\b|никс/iu, { category: 'nba', performer: 'Knicks' }],
  [/\b(?:chicago\s+bulls|bulls)\b|булл[зс]/iu, { category: 'nba', performer: 'Bulls' }],
  [/\b(?:milwaukee\s+bucks|bucks)\b|бакс/iu, { category: 'nba', performer: 'Bucks' }],
  [/\b(?:dallas\s+mavericks|mavericks)\b|маверикс/iu, { category: 'nba', performer: 'Mavericks' }],
  [/\b(?:denver\s+nuggets|nuggets)\b|наггетс/iu, { category: 'nba', performer: 'Nuggets' }],
  [/\b(?:oklahoma\s+city\s+thunder|thunder)\b|тандер/iu, { category: 'nba', performer: 'Thunder' }],
  [/\b(?:orlando\s+magic)\b|орландо\s*мэджик/iu, { category: 'nba', performer: 'Orlando Magic' }],
  [/\b(?:philadelphia\s+76ers|76ers|sixers)\b|сиксерс/iu, { category: 'nba', performer: '76ers' }],
  [/\b(?:brooklyn\s+nets|nets)\b|\bнетс\b/iu, { category: 'nba', performer: 'Nets' }],
  [/\b(?:cleveland\s+cavaliers|cavaliers|cavs)\b|кавальерс/iu, { category: 'nba', performer: 'Cavaliers' }],
  [/\b(?:phoenix\s+suns|suns)\b|\bсанз\b/iu, { category: 'nba', performer: 'Suns' }],
  // Major visiting NFL teams
  [/\b(?:buffalo\s+bills|bills)\b|билл[зс]/iu, { category: 'nfl', performer: 'Bills' }],
  [/\b(?:new\s+england\s+patriots|patriots)\b|пэтриотс/iu, { category: 'nfl', performer: 'Patriots' }],
  [/\b(?:kansas\s+city\s+chiefs|chiefs)\b|чифс/iu, { category: 'nfl', performer: 'Chiefs' }],
  [/\b(?:dallas\s+cowboys|cowboys)\b|ковбой[зс]/iu, { category: 'nfl', performer: 'Cowboys' }],
  [/\b(?:philadelphia\s+eagles|eagles)\b|игл[зс]/iu, { category: 'nfl', performer: 'Eagles' }],
  [/\b(?:san\s+francisco\s+49ers|49ers)\b/iu, { category: 'nfl', performer: '49ers' }],
  [/\b(?:baltimore\s+ravens|ravens)\b|рейвенс/iu, { category: 'nfl', performer: 'Ravens' }],
  [/\b(?:new\s+york\s+jets|ny\s+jets)\b/iu, { category: 'nfl', performer: 'Jets' }],
  // Major visiting NHL, MLS & MLB teams
  [/\b(?:new\s+york\s+rangers|ny\s+rangers|rangers)\b|рейнджерс/iu, { category: 'nhl', performer: 'Rangers' }],
  [/\b(?:boston\s+bruins|bruins)\b|брюин[зс]/iu, { category: 'nhl', performer: 'Bruins' }],
  [/\b(?:tampa\s+bay\s+lightning|lightning)\b|лайтнинг/iu, { category: 'nhl', performer: 'Lightning' }],
  [/\b(?:toronto\s+maple\s+leafs|maple\s+leafs)\b|мейпл\s*лифс/iu, { category: 'nhl', performer: 'Maple Leafs' }],
  [/\b(?:edmonton\s+oilers|oilers)\b|ойлер[зс]/iu, { category: 'nhl', performer: 'Oilers' }],
  [/\b(?:la\s+galaxy|los\s+angeles\s+galaxy)\b|гэлакси/iu, { category: 'mls', performer: 'LA Galaxy' }],
  [/\b(?:orlando\s+city)\b|орландо\s*сити/iu, { category: 'mls', performer: 'Orlando City' }],
  [/\b(?:atlanta\s+united)\b|атланта\s*юнайтед/iu, { category: 'mls', performer: 'Atlanta United' }],
  [/\b(?:new\s+york\s+yankees|yankees)\b|янки[зс]/iu, { category: 'mlb', performer: 'Yankees' }],
  [/\b(?:los\s+angeles\s+dodgers|dodgers)\b|доджерс/iu, { category: 'mlb', performer: 'Dodgers' }],
  [/\b(?:new\s+york\s+mets|mets)\b|\bметс\b/iu, { category: 'mlb', performer: 'Mets' }]
];

const PERFORMER_STOP = new Set([
  'miami', 'miami beach', 'south beach', 'brickell', 'wynwood', 'downtown', 'florida', 'south florida',
  'hard rock', 'hard rock stadium', 'hard rock live', 'kaseya', 'kaseya center', 'chase stadium', 'amerant',
  'loandepot', 'art basel', 'miami open', 'ultra', 'formula', 'formula 1', 'grand prix',
  'concerts', 'concert', 'sports', 'sport', 'tickets', 'ticket', 'events', 'event', 'show', 'shows',
  'comedy', 'standup', 'theater', 'theatre', 'broadway', 'opera', 'festival', 'festivals',
  'nba', 'nfl', 'mls', 'nhl', 'mlb', 'ufc', 'f1', 'nascar', 'vip',
  'today', 'tonight', 'tomorrow', 'weekend', 'this weekend', 'next week',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'концерт', 'концерты', 'шоу', 'стендап', 'театр', 'матч', 'игра', 'футбол', 'баскетбол', 'хоккей', 'теннис', 'бокс',
  'майами', 'сегодня', 'завтра', 'послезавтра', 'выходные', 'пятницу', 'субботу', 'воскресенье',
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'
]);

function cleanPerformerCandidate(raw) {
  if (!raw) return '';
  const trimmed = String(raw)
    .replace(/\s+(?:in\s+miami|at\s+miami|en\s+miami|в\s+майами|на\s+выходных|в\s+это\s+\S+|this\s+\S+|next\s+\S+|on\s+\S+|в\s+(?:пятниц|суббот|воскресень|декабр|январ|ноябр)\S*|\d{1,2}\s+\S+).*$/iu, '')
    .replace(/[?!.,;:"'«»]+$/g, '')
    .trim();
  if (trimmed.length < 3 || trimmed.length > 48) return '';
  const lower = trimmed.toLowerCase();
  if (PERFORMER_STOP.has(lower)) return '';
  const words = lower.split(/\s+/);
  if (words.every((w) => PERFORMER_STOP.has(w) || /^\d+$/.test(w))) return '';
  return trimmed;
}

/** Extract a specific named artist, comedian, or show from user query text. */
export function extractPerformerFromQuery(query) {
  const text = String(query || '').trim();
  if (!text) return '';

  // 1. Quoted artist/show name: «Damon Wayans», "Andrea Bocelli"
  const quoted = text.match(/["«“]([A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9\s.'&-]{2,40})["»”]/u);
  if (quoted) {
    const c = cleanPerformerCandidate(quoted[1]);
    if (c) return c;
  }

  // 2. Explicit trigger + Capitalized Artist Name: "билеты на Damon Wayans", "концерт Andrea Bocelli", "Tickets for Shakira"
  const triggered = text.match(
    /(?:[Бб]илеты?\s+на|[Кк]онцерт|[Шш]оу|[Вв]ыступлени\p{L}*|[Сс]тендап|[Tt]ickets?\s+(?:for|to)|[Cc]oncert\s+(?:by|of|for)|[Ss]how\s+(?:by|for)|[Ee]ntradas?\s+para|[Cc]oncierto\s+de)\s+([A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9.'&-]{1,24}(?:\s+[A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9.'&-]{1,24}){0,2})/u
  );
  if (triggered) {
    const c = cleanPerformerCandidate(triggered[1]);
    if (c) return c;
  }

  // 3. Multi-word Capitalized Latin proper name inside a Cyrillic/non-Latin query (e.g. "Когда выступает Damon Wayans в Майами?")
  if (/[А-Яа-яЁё\u0590-\u06ff\u3040-\u9fff\uac00-\ud7af]/u.test(text)) {
    const latinProper = text.match(/\b([A-Z][a-zA-Z0-9.'&-]{2,20}(?:\s+[A-Z][a-zA-Z0-9.'&-]{1,20}){1,2})\b/);
    if (latinProper) {
      const c = cleanPerformerCandidate(latinProper[1]);
      if (c) return c;
    }
  }

  return '';
}

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
  const performer = extractPerformerFromQuery(text);
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return { category, performer, maxLiveCards: performer ? 3 : 2 };
  }
  // Ambiguous "football" / "футбол": keep maxLiveCards=1 so both NFL & MLS category cards stay visible.
  if (AMBIGUOUS_FOOTBALL.test(text)) return { category: 'mls', performer: '', maxLiveCards: 1 };
  return { category: 'events', performer, maxLiveCards: 3 };
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
    'билеты', 'матч', 'концерт', 'афиша', 'мероприятия', 'события', 'шоу', 'entradas',
    'miami', 'майами', ev.localDateTime?.slice(0, 10)
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
    ...(ev.url ? { booking: { kind: 'book', platform: 'ticketnetwork', href: ev.url } } : {}),
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
  // Protect the shared TicketNetwork concurrency pool (/events) from concierge cache-busting DoS.
  if (!fetcher && inflight.size >= 3) return [];

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
      let activeCategory = detected.category;
      let result = await Promise.race([
        source.get({ category: activeCategory, area: 'miami', from, to, performer: detected.performer, city: '', page: 1 }),
        deadline
      ]);
      if (result && Array.isArray(result.events) && !result.events.length && from === to) {
        result = await Promise.race([
          source.get({ category: activeCategory, area: 'miami', from, to: addDays(from, 14), performer: detected.performer, city: '', page: 1 }),
          deadline
        ]);
      }
      // If a dynamically extracted performer wasn't in the specific category (e.g. a comedian asked as "concert"),
      // try across all 'events'. For visiting sports teams with no match in window, fall back to Miami league games;
      // for named artists/comedians with 0 live Miami matches, return [] so listingCards builds a deep TicketNetwork artist search CJ link.
      if (result && Array.isArray(result.events) && !result.events.length && detected.performer) {
        if (activeCategory !== 'events') {
          const broader = await Promise.race([
            source.get({ category: 'events', area: 'miami', from, to: from === to ? addDays(from, 14) : to, performer: detected.performer, city: '', page: 1 }),
            deadline
          ]);
          if (broader && Array.isArray(broader.events) && broader.events.length) {
            result = broader;
            activeCategory = 'concerts';
          }
        }
        if (!result?.events?.length && TEAM_PATTERNS.some(([pattern]) => pattern.test(String(query || '')))) {
          result = await Promise.race([
            source.get({ category: detected.category, area: 'miami', from, to: from === to ? addDays(from, 14) : to, performer: '', city: '', page: 1 }),
            deadline
          ]);
        }
      }
      if (!result || !Array.isArray(result.events) || !result.events.length) return [];
      const entities = result.events
        .slice(0, detected.maxLiveCards)
        .map((ev) => eventToEntity(ev, activeCategory, locale, detected.performer));
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
