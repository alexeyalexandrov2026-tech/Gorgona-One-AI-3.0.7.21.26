// ===========================================================================
// Wave 2C — Proactive VIP Trip Care (Pure, Deterministic, Zero PII).
//
// Cross-checks a guest's active Live Trip Room bookings against the official
// 7-day NOAA/NWS Miami forecast and remembered VIP taste profile to inject a
// single compact, natural care hint into ELIO's system prompt (<= 260 chars):
//   1. Rain/storm overlap with an upcoming convertible / yacht / outdoor booking
//      -> thoughtfully suggest a hardtop/luxury SUV swap or indoor evening Plan B.
//   2. Pending ESIGN/payment quotes -> remind ELIO it can surface direct links.
//   3. Remembered returning-guest taste (airport, neighborhood, cuisine) ->
//      tailor advice naturally like a real Miami host who remembers them.
// ===========================================================================

const OPEN_TOP_CAR_RE = /\b(?:convertible|cabrio(?:let)?|spider|spyder|roadster|drop[\s-]?top|dawn|gtc|volante|targa)\b/i;
const OUTDOOR_BOOKING_RE = /\b(?:yacht|boat|charter|catamaran|helicopter|everglades|airboat|jet\s*ski|beach|cruise)\b/i;
const RAIN_FORECAST_RE = /\b(?:rain|shower|storm|thunder|squall|downpour)\b/i;

const ISO_DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/g;

function extractIsoRange(datesText) {
  const raw = String(datesText || '');
  const matches = [...raw.matchAll(ISO_DATE_RE)].map((m) => m[1]).sort();
  if (!matches.length) return null;
  return { from: matches[0], to: matches.at(-1) };
}

export function isOpenAirBooking(item) {
  if (!item || typeof item !== 'object') return { openAir: false, isConvertible: false };
  const title = String(item.title || '');
  const kind = String(item.kind || '').toLowerCase();
  if (kind === 'car' && OPEN_TOP_CAR_RE.test(title)) {
    return { openAir: true, isConvertible: true };
  }
  if (kind === 'yacht' || OUTDOOR_BOOKING_RE.test(title)) {
    return { openAir: true, isConvertible: false };
  }
  return { openAir: false, isConvertible: false };
}

export function detectWeatherOverlap(activeBookings = [], forecastPeriods = []) {
  if (!Array.isArray(activeBookings) || !activeBookings.length) return null;
  if (!Array.isArray(forecastPeriods) || !forecastPeriods.length) return null;

  const rainyDays = forecastPeriods.filter((p) =>
    p && typeof p.date === 'string'
    && ((typeof p.rainChance === 'number' && p.rainChance >= 50) || RAIN_FORECAST_RE.test(String(p.shortForecast || '')))
  );
  if (!rainyDays.length) return null;

  for (const booking of activeBookings) {
    const { openAir, isConvertible } = isOpenAirBooking(booking);
    if (!openAir) continue;
    const range = extractIsoRange(booking.dates);
    if (!range) continue;
    const hit = rainyDays.find((p) => p.date >= range.from && p.date <= range.to);
    if (hit) {
      return {
        bookingTitle: String(booking.title || '').slice(0, 56),
        kind: String(booking.kind || 'car'),
        isConvertible,
        date: hit.date,
        rainChance: typeof hit.rainChance === 'number' ? hit.rainChance : null,
        shortForecast: String(hit.shortForecast || 'rain').slice(0, 40)
      };
    }
  }
  return null;
}

/**
 * Build a compact, zero-PII proactive VIP care hint for Workers AI (<= 260 chars),
 * or '' when nothing proactive applies.
 */
export function buildProactiveCarePromptLine({
  memory = null,
  forecastPeriods = [],
  profile = null,
  savedPrefs = null
} = {}) {
  const overlap = detectWeatherOverlap(memory?.activeBookings, forecastPeriods);
  if (overlap) {
    const rainLabel = overlap.rainChance !== null ? `${overlap.rainChance}% rain` : overlap.shortForecast;
    if (overlap.isConvertible) {
      return `Proactive VIP care: NOAA forecasts ${rainLabel} on ${overlap.date} overlapping guest's ${overlap.bookingTitle} — warmly suggest a hardtop/luxury SUV swap or indoor evening Plan B if helpful.`.slice(0, 260);
    }
    return `Proactive VIP care: NOAA forecasts ${rainLabel} on ${overlap.date} overlapping guest's ${overlap.bookingTitle} — warmly offer a clear morning slot or indoor Miami backup (Design District, PAMM, Carbone/LPM) if helpful.`.slice(0, 260);
  }

  if (Number.isInteger(memory?.pendingEsign) && memory.pendingEsign > 0) {
    return `Proactive VIP care: guest has ${memory.pendingEsign} quote(s) awaiting ESIGN/payment in Live Trip Room — mention naturally you can pull up their direct link whenever they're ready.`.slice(0, 260);
  }

  const tasteBits = [];
  const prefs = savedPrefs && typeof savedPrefs === 'object' ? savedPrefs : null;
  if (prefs?.neighborhood) tasteBits.push(`prefers ${prefs.neighborhood}`);
  if (prefs?.airport) tasteBits.push(`flies via ${prefs.airport}`);
  if (Array.isArray(prefs?.dietaryOrCuisine) && prefs.dietaryOrCuisine.length) {
    tasteBits.push(`likes ${prefs.dietaryOrCuisine.slice(0, 2).join('/')}`);
  }
  if (!tasteBits.length && Array.isArray(memory?.favorites) && memory.favorites.length) {
    tasteBits.push(`saved ${memory.favorites.slice(0, 2).join(', ')}`);
  }
  if (tasteBits.length && !profile?.datesMentioned) {
    return `VIP taste memory: subtly weave in guest's known preferences (${tasteBits.join('; ')}) like a host who remembers them, without over-explaining.`.slice(0, 260);
  }

  return '';
}
