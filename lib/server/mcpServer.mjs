// ===========================================================================
// Public Miami Elio MCP Server (Model Context Protocol — JSON-RPC 2.0).
//
// Lets external AI agents (ChatGPT, Claude, Perplexity, Apple Intelligence,
// travel assistants & B2B partners) natively discover and transact against
// Miami Elio's verified Miami luxury supply:
//   - 290 exotic & luxury cars with live calendar checks & Split-Pay math
//   - Verified Miami Michelin & flagship dining / nightlife venues
//   - Live TicketNetwork events & curated Florida experiences
//   - Deterministic multi-category Miami itinerary & budget planner
//   - Safe, rate-limited explicit booking request submission
//
// Security & brand guarantees:
//   - Strictly read-only public catalog + explicit opt-in booking submission
//   - Zero PII leakage, zero admin/private data exposure
//   - Zero fabricated prices or fake payment confirmation claims
//   - Zero "concierge" / personal residential address / personal LLC strings
// ===========================================================================

import { getRentals } from '../rentalsData.js';
import { canonicalRentalLocation, extractCarBrand, rentalBrands, rentalPage } from '../sunsetFleet.mjs';
import { getExperiences } from '../experiencesData.js';
import { diningCatalogue } from './diningCatalogue.mjs';
import { primaryAction } from '../dining/gateway.mjs';
import { filterVenues, readDiningParams } from '../dining/filters.mjs';
import { getLiveEventEntities } from './conciergeEvents.mjs';
import { planCatalog } from './planCatalog.mjs';
import { buildPlan } from '../ai/plan.mjs';
import { parseDailyPrice } from '../ai/tripProfile.mjs';
import { checkCarAvailability, isValidIsoDate } from './fleetAvailability.mjs';
import { dashboardHandlers } from './dashboardHandlers.mjs';
import { recordMcpCall, persistTelemetryEvent } from './conciergeTelemetry.mjs';
import { runBackgroundTask } from './trackHandler.mjs';
import { TERMS_VERSION } from '../legal/termsContent.mjs';
import { SUPPORTED_LANGUAGES } from '../languages.js';

export const MCP_PROTOCOL_VERSION = '2025-03-26';
export const MCP_SUPPORTED_VERSIONS = Object.freeze(['2025-03-26', '2024-11-05']);
export const MCP_SERVER_INFO = Object.freeze({
  name: 'miami-elio',
  title: 'Miami Elio — Luxury Miami Supply & Trip Engine',
  version: '1.0.0'
});

const SITE_ORIGIN = 'https://gorgona-one.com';
const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

const rateBuckets = new Map();

export function resetMcpRateLimitForTests() {
  rateBuckets.clear();
}

function checkRateLimit(key, nowMs) {
  const bucket = rateBuckets.get(key);
  if (!bucket || nowMs - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    if (rateBuckets.size > 500) {
      for (const [k, v] of rateBuckets) {
        if (nowMs - v.startedAt >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(k);
      }
    }
    rateBuckets.set(key, { startedAt: nowMs, count: 1 });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - bucket.count)
  };
}

export const MCP_TOOLS = Object.freeze([
  {
    name: 'search_luxury_cars',
    title: 'Search Miami Luxury & Exotic Cars',
    description: 'Search Miami Elio\'s verified fleet of 290 exotic cars, luxury SUVs, convertibles, and sedans by brand, category, city, maximum daily USD rate, or keyword. Returns exact catalog daily rates and direct booking page URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional model or keyword search (e.g. "Urus", "Cullinan", "convertible", "Ferrari").' },
        brand: { type: 'string', description: 'Optional brand filter (e.g. "Lamborghini", "Rolls-Royce", "Mercedes-Benz", "Ferrari", "Porsche").' },
        category: { type: 'string', description: 'Optional vehicle category (e.g. "Exotic", "SUV", "Luxury", "Convertible").' },
        location: { type: 'string', description: 'Optional city filter (e.g. "Miami, FL", "New York, NY").' },
        maxDailyUsd: { type: 'number', description: 'Optional maximum daily USD rate (e.g. 900).' },
        sort: { type: 'string', enum: ['featured', 'price-asc', 'price-desc'], description: 'Sort order for results.' },
        limit: { type: 'integer', minimum: 1, maximum: 12, description: 'Number of cars to return (default 6, max 12).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'check_car_availability',
    title: 'Check Live Car Availability & Split-Pay Quote',
    description: 'Check live garage calendar availability for a specific Miami Elio vehicle slug on ISO dates (YYYY-MM-DD), compute exact multi-day total and optional Split-Pay per-guest cost, and surface closest available alternatives if busy.',
    inputSchema: {
      type: 'object',
      required: ['slug'],
      properties: {
        slug: { type: 'string', description: 'Canonical vehicle slug from search_luxury_cars (e.g. "lamborghini-urus-se").' },
        from: { type: 'string', description: 'Start date in ISO format YYYY-MM-DD.' },
        to: { type: 'string', description: 'Return date in ISO format YYYY-MM-DD.' },
        days: { type: 'integer', minimum: 1, maximum: 30, description: 'Optional explicit number of rental days when dates are flexible.' },
        guests: { type: 'integer', minimum: 1, maximum: 12, description: 'Optional group size (2–12) to compute per-person Split-Pay estimate.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'search_miami_dining',
    title: 'Search Verified Miami Dining & Nightlife',
    description: 'Search Miami Elio\'s verified directory of Michelin-starred restaurants, waterfront dining rooms, rooftops, and VIP nightlife venues with official reservation links (OpenTable, Resy, SevenRooms, Tock).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional venue name, dish, or keyword (e.g. "Komodo", "sushi", "rooftop").' },
        category: { type: 'string', enum: ['restaurant', 'nightlife'], description: 'Filter to restaurants or nightlife clubs/lounges.' },
        neighborhood: { type: 'string', description: 'Miami neighborhood (e.g. "Brickell", "South Beach", "Design District", "Wynwood").' },
        cuisine: { type: 'string', description: 'Optional cuisine filter (e.g. "Japanese", "Italian", "Steakhouse", "Mediterranean").' },
        michelin: { type: 'string', description: 'Optional Michelin distinction filter.' },
        price: { type: 'string', enum: ['$$', '$$$', '$$$$'], description: 'Optional price tier.' },
        limit: { type: 'integer', minimum: 1, maximum: 12, description: 'Maximum venues to return (default 6, max 12).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'search_miami_events_and_experiences',
    title: 'Search Live Miami Events & Curated Experiences',
    description: 'Search live upcoming Miami sports games, concerts, and theater tickets (TicketNetwork) plus curated tours, boat charters, Everglades airboats, and helicopter flights (Headout / Viator).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Event, team, artist, or experience keyword (e.g. "Miami Heat", "Inter Miami", "helicopter", "Everglades").' },
        type: { type: 'string', enum: ['all', 'events', 'experiences'], description: 'Restrict to live events, curated experiences, or both (default "all").' },
        from: { type: 'string', description: 'Optional start date YYYY-MM-DD for live events.' },
        to: { type: 'string', description: 'Optional end date YYYY-MM-DD for live events.' },
        limit: { type: 'integer', minimum: 1, maximum: 12, description: 'Maximum items to return (default 6, max 12).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'build_miami_itinerary',
    title: 'Build Verified Multi-Category Miami Trip Plan',
    description: 'Assemble a grounded multi-category Miami trip plan combining luxury cars, verified dining/nightlife, villas, yachts, and experiences based on a natural-language brief, with verified car pricing and deep booking links.',
    inputSchema: {
      type: 'object',
      required: ['brief'],
      properties: {
        brief: { type: 'string', description: 'Natural-language trip request (e.g. "3 days in Brickell for 4 guests, Lamborghini Urus, Michelin dinner, sunset yacht").' },
        locale: { type: 'string', description: 'Optional ISO language code across 16 supported languages (default "en").' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'submit_booking_request',
    title: 'Submit Explicit Miami Elio Booking Request',
    description: 'Submit a real, rate-limited booking inquiry for a verified Miami Elio car, private jet charter, or hospitality request ONLY after the guest explicitly provides contact details and accepts Terms (termsAccepted: true). Never charges a card immediately; creates a tracked request in Live Trip Room.',
    inputSchema: {
      type: 'object',
      required: ['kind', 'itemSlug', 'dates', 'name', 'email', 'phone', 'termsAccepted'],
      properties: {
        kind: { type: 'string', enum: ['car', 'jet', 'stay', 'experience'], description: 'Item category (yachts are booked directly via YATR).' },
        itemSlug: { type: 'string', description: 'Canonical slug (e.g. "lamborghini-urus-se", "private-jet-charter").' },
        itemTitle: { type: 'string', description: 'Human-readable item title (optional; auto-resolved for known cars).' },
        dates: { type: 'string', description: 'Requested dates / route summary (e.g. "2026-12-05 to 2026-12-08, MIA airport delivery").' },
        name: { type: 'string', description: 'Guest full name.' },
        email: { type: 'string', description: 'Guest email address for confirmation and Live Trip Room access.' },
        phone: { type: 'string', description: 'Guest phone or WhatsApp number with country code.' },
        termsAccepted: { type: 'boolean', description: 'Must be true — confirms the guest explicitly accepted https://gorgona-one.com/terms.' }
      },
      additionalProperties: false
    }
  }
]);

export const MCP_RESOURCES = Object.freeze([
  {
    uri: 'miami-elio://catalog/overview',
    name: 'Miami Elio Platform Overview',
    description: 'Live summary of verified inventory counts, supported 16 languages, booking & Split-Pay policy, and direct discovery URLs.',
    mimeType: 'application/json'
  },
  {
    uri: 'miami-elio://catalog/brands',
    name: 'Miami Luxury Car Fleet Brands & Price Ranges',
    description: 'Live breakdown of exotic and luxury vehicle brands, counts, and verified daily USD rate ranges in Miami Elio\'s fleet.',
    mimeType: 'application/json'
  }
]);

function clampInt(raw, fallback, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function toolJsonResult(payload, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    ...(isError ? { isError: true } : {})
  };
}

async function runSearchLuxuryCars(args = {}) {
  const all = getRentals();
  const limit = clampInt(args.limit, 6, 1, 12);
  const maxDailyUsd = Number.isFinite(Number(args.maxDailyUsd)) && Number(args.maxDailyUsd) > 0
    ? Number(args.maxDailyUsd)
    : null;

  let filtered = all;
  if (typeof args.category === 'string' && args.category.trim()) {
    const cat = args.category.trim().toLowerCase();
    filtered = filtered.filter((c) => String(c.category || '').toLowerCase() === cat);
  }
  if (typeof args.location === 'string' && args.location.trim()) {
    const targetLoc = canonicalRentalLocation(args.location.trim()).toLowerCase();
    filtered = filtered.filter((c) => canonicalRentalLocation(c.location).toLowerCase() === targetLoc);
  }
  if (maxDailyUsd !== null) {
    filtered = filtered.filter((c) => {
      const rate = parseDailyPrice(c.dailyPrice);
      return rate !== null && rate <= maxDailyUsd;
    });
  }

  const page = rentalPage(filtered, {
    brand: typeof args.brand === 'string' && args.brand.trim() ? args.brand.trim() : null,
    q: typeof args.query === 'string' ? args.query.trim().slice(0, 80) : '',
    sort: ['price-asc', 'price-desc'].includes(args.sort) ? args.sort : '',
    page: 1
  });

  const cars = page.cars.slice(0, limit).map((car) => ({
    slug: car.slug,
    title: car.title,
    brand: extractCarBrand(car),
    category: car.category,
    location: canonicalRentalLocation(car.location),
    dailyPrice: car.dailyPrice || null,
    dailyRateUsd: parseDailyPrice(car.dailyPrice),
    weeklyPrice: car.weeklyPrice || null,
    specs: car.specs || null,
    image: car.image || null,
    url: `${SITE_ORIGIN}/rentals/${car.slug}`
  }));

  return toolJsonResult({
    totalMatches: page.total,
    returned: cars.length,
    fleetSize: all.length,
    catalogUrl: `${SITE_ORIGIN}/rentals`,
    cars
  });
}

async function runCheckCarAvailability(args = {}, env, fetcher) {
  if (typeof args.slug !== 'string' || !args.slug.trim()) {
    return toolJsonResult({ error: 'missing_slug', message: 'Provide a valid vehicle slug from search_luxury_cars.' }, true);
  }
  if (args.from && !isValidIsoDate(args.from)) {
    return toolJsonResult({ error: 'invalid_from_date', message: 'from must be an ISO date YYYY-MM-DD.' }, true);
  }
  if (args.to && !isValidIsoDate(args.to)) {
    return toolJsonResult({ error: 'invalid_to_date', message: 'to must be an ISO date YYYY-MM-DD.' }, true);
  }
  const result = await checkCarAvailability(
    {
      slug: args.slug,
      from: args.from || null,
      to: args.to || null,
      days: Number.isInteger(Number(args.days)) ? Number(args.days) : null,
      guests: Number.isInteger(Number(args.guests)) ? Number(args.guests) : null
    },
    env,
    fetcher
  );
  return toolJsonResult(result, !result.found);
}

async function runSearchMiamiDining(args = {}, env, fetcher) {
  const limit = clampInt(args.limit, 6, 1, 12);
  const all = (await diningCatalogue(env, fetcher, { strict: true }).catch(() => []))
    .filter((v) => v?.status === 'verified');

  const params = readDiningParams({
    category: args.category,
    q: args.query,
    neighborhood: args.neighborhood,
    cuisine: args.cuisine,
    michelin: args.michelin,
    price: args.price
  });

  const matched = filterVenues(all, params);
  const venues = matched.slice(0, limit).map((v) => {
    const action = primaryAction(v);
    return {
      slug: v.slug,
      name: v.name,
      category: v.category,
      neighborhood: v.neighborhood || null,
      cuisine: v.cuisine || null,
      price: v.price || null,
      michelin: v.michelin || null,
      description: typeof v.description === 'string' ? v.description.slice(0, 220) : null,
      url: `${SITE_ORIGIN}/restaurants-nightlife/${v.slug}`,
      bookingChannel: action
    };
  });

  return toolJsonResult({
    totalMatches: matched.length,
    returned: venues.length,
    directoryUrl: `${SITE_ORIGIN}/restaurants-nightlife`,
    venues
  });
}

async function runSearchEventsAndExperiences(args = {}, env, fetcher) {
  const limit = clampInt(args.limit, 6, 1, 12);
  const type = ['events', 'experiences', 'all'].includes(args.type) ? args.type : 'all';
  const query = typeof args.query === 'string' ? args.query.trim().slice(0, 100) : '';
  const profile = isValidIsoDate(args.from)
    ? { dateRange: { from: args.from, to: isValidIsoDate(args.to) ? args.to : args.from } }
    : null;

  let events = [];
  if (type === 'all' || type === 'events') {
    const live = await getLiveEventEntities(query || 'miami events', { profile, locale: 'en', env, fetcher }).catch(() => []);
    events = live.slice(0, type === 'events' ? limit : Math.ceil(limit / 2)).map((ev) => ({
      id: ev.id,
      title: ev.title,
      venue: ev.subtitle || null,
      schedule: ev.price || null,
      url: `${SITE_ORIGIN}${ev.href}`,
      ticketUrl: ev.booking?.href || null,
      provider: 'TicketNetwork'
    }));
  }

  let experiences = [];
  if (type === 'all' || type === 'experiences') {
    const qLower = query.toLowerCase();
    const allExp = getExperiences();
    const matchedExp = qLower
      ? allExp.filter((item) => `${item.title} ${item.region || ''} ${item.slug}`.toLowerCase().includes(qLower))
      : allExp;
    const cap = type === 'experiences' ? limit : Math.max(2, limit - events.length);
    experiences = matchedExp.slice(0, cap).map((item) => ({
      slug: item.slug,
      title: item.title,
      region: item.region || 'miami',
      supplier: item.supplier || 'Headout',
      url: `${SITE_ORIGIN}/experiences/${item.slug}`,
      partnerUrl: item.href || null
    }));
  }

  return toolJsonResult({
    query: query || null,
    eventsUrl: `${SITE_ORIGIN}/events`,
    experiencesUrl: `${SITE_ORIGIN}/experiences`,
    events,
    experiences
  });
}

async function runBuildMiamiItinerary(args = {}, env, fetcher) {
  const brief = typeof args.brief === 'string' ? args.brief.trim().slice(0, 800) : '';
  if (!brief) {
    return toolJsonResult({ error: 'missing_brief', message: 'Provide a natural-language Miami trip brief.' }, true);
  }
  const locale = typeof args.locale === 'string' && args.locale.trim() ? args.locale.trim().slice(0, 8) : 'en';
  const catalog = await planCatalog(env, fetcher);
  const plan = buildPlan([{ role: 'user', content: brief }], {
    catalog,
    locale,
    requestable: env?.PLAN_REQUESTS_ENABLED === 'true'
  });

  if (!plan) {
    return toolJsonResult({
      matched: false,
      message: 'Add at least one category (car, restaurant, villa, yacht, event, or experience) to generate a structured Miami itinerary.',
      guideUrl: `${SITE_ORIGIN}/discovery`
    });
  }

  return toolJsonResult({
    matched: true,
    guideUrl: `${SITE_ORIGIN}/discovery`,
    tripRoomUrl: `${SITE_ORIGIN}/trip`,
    plan
  });
}

async function runSubmitBookingRequest(args = {}, request, env, fetcher) {
  if (args.termsAccepted !== true) {
    return toolJsonResult({
      error: 'terms_not_accepted',
      message: 'Explicit guest consent (termsAccepted: true) to https://gorgona-one.com/terms is required before submitting a booking request.'
    }, true);
  }
  if (!['car', 'jet', 'stay', 'experience'].includes(args.kind)) {
    return toolJsonResult({
      error: 'unsupported_kind',
      message: 'kind must be one of car, jet, stay, experience. Yacht charters are booked directly via YATR at https://gorgona-one.com/yachts.'
    }, true);
  }

  const slug = String(args.itemSlug || '').trim().slice(0, 120);
  const car = args.kind === 'car' ? getRentals().find((c) => c.slug === slug) : null;
  if (args.kind === 'car' && !car) {
    return toolJsonResult({
      error: 'unknown_car_slug',
      message: `Vehicle slug "${slug}" was not found in Miami Elio's verified fleet. Call search_luxury_cars first.`
    }, true);
  }

  const payload = {
    kind: args.kind === 'jet' ? 'experience' : args.kind,
    itemSlug: slug,
    itemTitle: (typeof args.itemTitle === 'string' && args.itemTitle.trim()) || car?.title || slug,
    dates: String(args.dates || '').trim().slice(0, 260),
    name: String(args.name || '').trim().slice(0, 120),
    email: String(args.email || '').trim().slice(0, 254),
    phone: String(args.phone || '').trim().slice(0, 40),
    termsAccepted: true,
    termsVersion: TERMS_VERSION,
    attribution: {
      utmSource: 'mcp_agent',
      utmMedium: 'ai_protocol',
      utmCampaign: 'miami_elio_mcp'
    }
  };

  const callerKey = request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key') || '';
  const validUuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(callerKey);
  const idempotencyKey = validUuidV4 ? callerKey : globalThis.crypto.randomUUID();

  const headers = new Headers({
    'content-type': 'application/json',
    'idempotency-key': idempotencyKey,
    'user-agent': request.headers.get('user-agent') || 'MiamiElio-MCP/1.0'
  });
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) headers.set('cf-connecting-ip', cfIp);

  const syntheticRequest = new Request(`${SITE_ORIGIN}/api/book`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const bookRes = await dashboardHandlers(env, fetcher).book(syntheticRequest);
  const body = await bookRes.json().catch(() => ({}));
  if (!bookRes.ok || !body?.success) {
    return toolJsonResult({
      submitted: false,
      status: bookRes.status,
      error: body?.error || 'booking_request_rejected',
      fallbackUrl: car ? `${SITE_ORIGIN}/rentals/${car.slug}` : `${SITE_ORIGIN}/discovery`
    }, true);
  }

  return toolJsonResult({
    submitted: true,
    bookingId: body.bookingId,
    replayed: Boolean(body.replayed),
    status: 'pending_confirmation',
    note: 'Request received by the Miami Elio team. No card was charged. Availability, final rate, and secure Stripe/PayPal/Split-Pay checkout link will be confirmed shortly.',
    tripRoomUrl: `${SITE_ORIGIN}/trip`,
    itemUrl: car ? `${SITE_ORIGIN}/rentals/${car.slug}` : `${SITE_ORIGIN}/discovery`
  });
}

async function readMcpResource(uri, env, fetcher) {
  if (uri === 'miami-elio://catalog/overview') {
    const cars = getRentals();
    const venues = (await diningCatalogue(env, fetcher, { strict: true }).catch(() => []))
      .filter((v) => v?.status === 'verified');
    const experiences = getExperiences();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          brand: 'MIAMI ELIO',
          website: SITE_ORIGIN,
          guideName: 'ELIO+ Guide',
          languagesSupported: SUPPORTED_LANGUAGES.map((l) => l.code),
          inventory: {
            luxuryCars: cars.length,
            verifiedDiningAndNightlife: venues.length,
            curatedExperiences: experiences.length,
            liveEventsProvider: 'TicketNetwork',
            yachtsPartner: 'YATR',
            villasPartner: 'Stay22',
            privateJetsPartners: ['PereJets', 'PrivateJetFinder']
          },
          payments: {
            methods: ['Stripe (cards, Apple Pay, Google Pay)', 'PayPal', 'Split-Pay (group checkout)'],
            compliance: 'ESIGN & KYC verification before high-value handoff; AI agents never claim a card was charged.'
          },
          endpoints: {
            mcp: `${SITE_ORIGIN}/api/mcp`,
            manifest: `${SITE_ORIGIN}/.well-known/mcp.json`,
            llmsTxt: `${SITE_ORIGIN}/llms.txt`,
            guide: `${SITE_ORIGIN}/discovery`,
            tripRoom: `${SITE_ORIGIN}/trip`
          }
        }, null, 2)
      }]
    };
  }

  if (uri === 'miami-elio://catalog/brands') {
    const cars = getRentals();
    const brands = rentalBrands(cars).map(({ name, count }) => {
      const rates = cars
        .filter((c) => extractCarBrand(c) === name)
        .map((c) => parseDailyPrice(c.dailyPrice))
        .filter((r) => Number.isFinite(r) && r > 0);
      return {
        brand: name,
        vehicles: count,
        minDailyUsd: rates.length ? Math.min(...rates) : null,
        maxDailyUsd: rates.length ? Math.max(...rates) : null
      };
    });
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ totalCars: cars.length, brands }, null, 2)
      }]
    };
  }

  return null;
}

function rpcOk(id, result) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function rpcError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message, ...(data !== undefined ? { data } : {}) }
  };
}

async function handleSingleRpc(msg, { request, env, fetcher }) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return { body: rpcError(msg?.id, -32600, 'Invalid JSON-RPC 2.0 request'), status: 200 };
  }

  const { id, method, params = {} } = msg;

  // Notifications carry no `id` and expect 202 Accepted with no body.
  if (method === 'notifications/initialized' || method.startsWith('notifications/')) {
    return { notification: true, status: 202 };
  }

  if (method === 'initialize') {
    const requested = typeof params?.protocolVersion === 'string' ? params.protocolVersion : MCP_PROTOCOL_VERSION;
    const protocolVersion = MCP_SUPPORTED_VERSIONS.includes(requested) ? requested : MCP_PROTOCOL_VERSION;
    return {
      status: 200,
      body: rpcOk(id, {
        protocolVersion,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false }
        },
        serverInfo: MCP_SERVER_INFO,
        instructions: 'Miami Elio MCP Server provides live verified Miami luxury car rentals (290 vehicles), Michelin & flagship dining, live events, experiences, and itinerary planning. Always quote exact verified rates returned by tools and never claim a booking or payment is confirmed without an explicit bookingId.'
      })
    };
  }

  if (method === 'ping') {
    return { status: 200, body: rpcOk(id, {}) };
  }

  if (method === 'tools/list') {
    return { status: 200, body: rpcOk(id, { tools: MCP_TOOLS }) };
  }

  if (method === 'resources/list') {
    return { status: 200, body: rpcOk(id, { resources: MCP_RESOURCES }) };
  }

  if (method === 'resources/read') {
    const uri = typeof params?.uri === 'string' ? params.uri.trim() : '';
    const resource = await readMcpResource(uri, env, fetcher);
    if (!resource) {
      return { status: 200, body: rpcError(id, -32002, `Resource not found: ${uri}`) };
    }
    return { status: 200, body: rpcOk(id, resource) };
  }

  if (method === 'tools/call') {
    const name = typeof params?.name === 'string' ? params.name.trim() : '';
    const args = params?.arguments && typeof params.arguments === 'object' ? params.arguments : {};
    const started = Date.now();
    let result;
    let isErr = false;

    try {
      if (name === 'search_luxury_cars') {
        result = await runSearchLuxuryCars(args);
      } else if (name === 'check_car_availability') {
        result = await runCheckCarAvailability(args, env, fetcher);
      } else if (name === 'search_miami_dining') {
        result = await runSearchMiamiDining(args, env, fetcher);
      } else if (name === 'search_miami_events_and_experiences') {
        result = await runSearchEventsAndExperiences(args, env, fetcher);
      } else if (name === 'build_miami_itinerary') {
        result = await runBuildMiamiItinerary(args, env, fetcher);
      } else if (name === 'submit_booking_request') {
        result = await runSubmitBookingRequest(args, request, env, fetcher);
      } else {
        return { status: 200, body: rpcError(id, -32602, `Unknown tool: ${name}`) };
      }
      isErr = Boolean(result?.isError);
    } catch {
      isErr = true;
      result = toolJsonResult({ error: 'tool_execution_failed', tool: name }, true);
    }

    const ms = Date.now() - started;
    recordMcpCall({ tool: name, error: isErr, ms });
    try {
      void runBackgroundTask(
        persistTelemetryEvent({
          eventType: 'mcp_call',
          locale: 'en',
          decidedBy: 'fact',
          action: `mcp:${name}`.slice(0, 32),
          platform: 'mcp',
          latencyMs: ms,
          error: isErr,
          cached: false
        }, env, fetcher)
      );
    } catch {}

    return { status: 200, body: rpcOk(id, result) };
  }

  return { status: 200, body: rpcError(id, -32601, `Method not found: ${method}`) };
}

export function mcpCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Idempotency-Key',
    'Access-Control-Expose-Headers': 'MCP-Protocol-Version',
    'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
    'Cache-Control': 'no-store'
  };
}

export function mcpHandlers(env = process.env, fetcher = fetch, clock = () => Date.now()) {
  const headers = mcpCorsHeaders();

  return {
    options() {
      return new Response(null, { status: 204, headers });
    },

    discovery() {
      return new Response(
        JSON.stringify({
          server: MCP_SERVER_INFO,
          protocolVersion: MCP_PROTOCOL_VERSION,
          transport: 'streamable-http',
          endpoint: `${SITE_ORIGIN}/api/mcp`,
          manifest: `${SITE_ORIGIN}/.well-known/mcp.json`,
          authentication: { type: 'none', note: 'Public catalog search requires no key. Booking submission requires explicit guest contact details and Terms acceptance.' },
          tools: MCP_TOOLS.map((t) => ({ name: t.name, title: t.title, description: t.description })),
          resources: MCP_RESOURCES
        }, null, 2),
        {
          status: 200,
          headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    },

    async post(request) {
      const ip = request.headers.get('cf-connecting-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'local';
      const limit = checkRateLimit(ip, clock());
      if (!limit.allowed) {
        return new Response(
          JSON.stringify(rpcError(null, -32029, 'Rate limit exceeded. Retry in 60 seconds.')),
          { status: 429, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': '60' } }
        );
      }

      let rawText;
      try {
        rawText = await request.text();
      } catch {
        return new Response(
          JSON.stringify(rpcError(null, -32700, 'Unable to read request body')),
          { status: 400, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
      if (!rawText || new TextEncoder().encode(rawText).byteLength > MAX_BODY_BYTES) {
        return new Response(
          JSON.stringify(rpcError(null, -32600, 'Request payload empty or exceeds 32 KB limit')),
          { status: 413, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return new Response(
          JSON.stringify(rpcError(null, -32700, 'Parse error: invalid JSON')),
          { status: 400, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }

      if (Array.isArray(parsed)) {
        if (!parsed.length || parsed.length > 5) {
          return new Response(
            JSON.stringify(rpcError(null, -32600, 'Batch size must be between 1 and 5 requests')),
            { status: 400, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } }
          );
        }
        const outcomes = await Promise.all(parsed.map((item) => handleSingleRpc(item, { request, env, fetcher })));
        const responses = outcomes.filter((o) => !o.notification).map((o) => o.body);
        if (!responses.length) {
          return new Response(null, { status: 202, headers });
        }
        return new Response(JSON.stringify(responses), {
          status: 200,
          headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
        });
      }

      const outcome = await handleSingleRpc(parsed, { request, env, fetcher });
      if (outcome.notification) {
        return new Response(null, { status: 202, headers });
      }
      return new Response(JSON.stringify(outcome.body), {
        status: outcome.status || 200,
        headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  };
}
