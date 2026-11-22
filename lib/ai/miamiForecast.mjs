// ===========================================================================
// Official 7-day NOAA/NWS Miami weather forecast for AI Concierge planning.
//
// Uses the same official api.weather.gov domain already trusted by miamiWeather.mjs
// (Miami MFL gridpoint 110,50 — zero API keys, strict allowlist, 30-min cache).
//
// Design guarantees:
// - Never called in local Node unit tests unless an explicit fetcher or
//   CONCIERGE_LIVE_FORECAST=true is supplied (caches.default gate).
// - Hard 1800 ms timeout, bounded 96 KB response body, manual redirects.
// - Fail-safe `[]` so /api/chat never degrades if NOAA is slow or unreachable.
// ===========================================================================

export const MIAMI_FORECAST_URL = 'https://api.weather.gov/gridpoints/MFL/110,50/forecast';
const MAX_BYTES = 98_304;
const TIMEOUT_MS = 1_800;
const CACHE_TTL_MS = 30 * 60 * 1000;

let cachedForecast = null; // { at, periods }
let inflight = null;

function liveForecastEnabled(env, fetcher) {
  if (fetcher) return true;
  if (env?.CONCIERGE_LIVE_FORECAST === 'false') return false;
  if (env?.CONCIERGE_LIVE_FORECAST === 'true') return true;
  return Boolean(globalThis.caches?.default);
}

const FORECAST_TRIGGER = /(?<![\p{L}\p{N}])(?:weather|forecast|rain|raining|storm|wind|temperature|degrees?|sunny|yacht|boat|charter|helicopter|beach|everglades|outdoor|weekend|tomorrow|saturday|sunday|friday|monday|tuesday|wednesday|thursday|погод|прогноз|дожд|шторм|ветер|температур|градус|солнц|яхт|катер|вертол[её]т|пляж|выходн|завтра|суббот|воскресень|пятниц|clima|tiempo|lluvia|pronóstico|yate|helicóptero|wetter|météo|meteo|pogoda|hava|מזג|طقس|هوا)(?![\p{L}\p{N}])|天气|天氣|天気|날씨/iu;

/** Decide whether a turn benefits from the 7-day Miami NWS forecast. */
export function shouldFetchForecast(text, profile = null, sections = []) {
  if (profile?.dateRange?.from) return true;
  if (Array.isArray(sections) && sections.some((s) => s === '/yachts' || s === '/experiences')) return true;
  return FORECAST_TRIGGER.test(String(text || ''));
}

async function readBoundedJson(response) {
  if (!response?.ok || Number(response.headers.get('Content-Length')) > MAX_BYTES) {
    await response?.body?.cancel?.().catch(() => {});
    return null;
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let length = 0;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) return null;
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function normalizePeriods(data) {
  const raw = data?.properties?.periods;
  if (!Array.isArray(raw) || !raw.length) return [];
  const byDate = new Map();
  for (const p of raw) {
    if (!p || typeof p.startTime !== 'string' || typeof p.temperature !== 'number') continue;
    const date = p.startTime.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const isDay = p.isDaytime !== false;
    // Prefer daytime summary for each calendar date; keep evening only if no daytime entry exists for today.
    if (byDate.has(date) && !isDay) continue;
    const tempF = p.temperatureUnit === 'C' ? Math.round(p.temperature * 9 / 5 + 32) : Math.round(p.temperature);
    const tempC = p.temperatureUnit === 'C' ? Math.round(p.temperature) : Math.round((p.temperature - 32) * 5 / 9);
    const rainChance = typeof p.probabilityOfPrecipitation?.value === 'number'
      ? Math.max(0, Math.min(100, Math.round(p.probabilityOfPrecipitation.value)))
      : null;
    const shortForecast = typeof p.shortForecast === 'string' ? p.shortForecast.trim().slice(0, 60) : '';
    const wind = typeof p.windSpeed === 'string' ? p.windSpeed.trim().slice(0, 24) : '';
    const name = typeof p.name === 'string' ? p.name.trim().slice(0, 28) : date;
    byDate.set(date, { date, name, isDaytime: isDay, tempC, tempF, rainChance, wind, shortForecast });
    if (byDate.size >= 7) break;
  }
  return [...byDate.values()];
}

/** Fetch verified 7-day NOAA/NWS Miami forecast (cached 30 min per isolate, fail-safe []). */
export async function getMiamiForecast({ env = process.env, fetcher, signal } = {}) {
  if (!liveForecastEnabled(env, fetcher)) return [];
  if (!fetcher && cachedForecast && Date.now() - cachedForecast.at < CACHE_TTL_MS) {
    return cachedForecast.periods;
  }
  if (!fetcher && inflight) return inflight;

  const task = (async () => {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    try {
      const response = await (fetcher || fetch)(MIAMI_FORECAST_URL, {
        headers: { 'User-Agent': 'Miami Elio (https://gorgona-one.com)', Accept: 'application/geo+json' },
        redirect: 'manual',
        cf: { cacheEverything: true, cacheTtlByStatus: { '200': 1800, '300-599': -1 } },
        signal: signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : timeout
      });
      const json = await readBoundedJson(response);
      const periods = normalizePeriods(json);
      if (periods.length && !fetcher) {
        cachedForecast = { at: Date.now(), periods };
      }
      return periods;
    } catch {
      return [];
    }
  })().finally(() => {
    if (!fetcher) inflight = null;
  });

  if (!fetcher) inflight = task;
  return task;
}

/** Synchronous warm-cache peek (0 network I/O). */
export function peekMiamiForecast() {
  if (!cachedForecast || Date.now() - cachedForecast.at > CACHE_TTL_MS) return [];
  return cachedForecast.periods;
}

/** Clear isolate cache (used in tests). */
export function clearForecastCache() {
  cachedForecast = null;
  inflight = null;
}

/**
 * Format verified 7-day forecast into a compact, zero-hallucination prompt line
 * tailored to the guest's dateRange (or next 3 upcoming Miami days).
 */
export function formatForecastForPrompt(periods, dateRange = null) {
  if (!Array.isArray(periods) || !periods.length) return '';
  let selected = periods;
  if (dateRange?.from) {
    const end = dateRange.to || dateRange.from;
    const matched = periods.filter((p) => p.date >= dateRange.from && p.date <= end);
    if (matched.length) {
      selected = matched;
    } else if (dateRange.from > periods.at(-1).date) {
      // Guest asked for dates beyond the 7-day NOAA window — do not pretend to forecast them.
      return '';
    }
  }
  const slice = selected.slice(0, 3);
  const rainRisk = slice.some((p) => (p.rainChance ?? 0) >= 50 || /\b(?:rain|shower|storm|thunder)\b/i.test(p.shortForecast));
  const summary = slice.map((p) => {
    const bits = [`${p.date} (${p.name}): ${p.tempC}°C/${p.tempF}°F`];
    if (p.shortForecast) bits.push(p.shortForecast);
    if (p.rainChance !== null) bits.push(`rain ${p.rainChance}%`);
    if (p.wind) bits.push(`wind ${p.wind}`);
    return bits.join(', ');
  }).join('; ');
  return `Miami official NOAA/NWS forecast: ${summary}.`
    + (rainRisk ? ' High rain/storm chance on selected day — proactively warn for yachts/helicopters and offer morning window or indoor backups (Frost Science, PAMM, Design District).' : '');
}
