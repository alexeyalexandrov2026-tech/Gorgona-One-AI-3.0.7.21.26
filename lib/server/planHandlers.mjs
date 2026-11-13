// One request for a whole plan: several catalogue items, one form, one
// idempotency key. Every item is resolved again from the catalogue here, so
// a title or an item the browser invents never reaches the database.
import { database, readBody, requireKey, digest, json, failure, bookingInput, RequestError } from './dashboardCore.mjs';
import { diningVenue } from './diningCatalogue.mjs';
import { getYachtBySlug, getVacationRentalBySlug, getRentalBySlug } from '../data/listings.js';
import { isPlanReceipt, PLAN_KINDS, PLAN_LIMITS } from '../planRules.mjs';

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
const invalid = () => new RequestError(400, 'Invalid request');
const restaurant = kind => kind === 'dining' || kind === 'nightlife';

function calendar(value) {
  if (typeof value !== 'string' || !DAY.test(value)) return null;
  const time = Date.parse(value + 'T12:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}
const newYorkToday = now => new Intl.DateTimeFormat('en-CA', { timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit' }).format(now);

/** Validates the browser payload. Item titles are deliberately not read. */
function planInput(body) {
  const text = (key, max, optional = false) => {
    const value = body[key];
    if (optional && (value === undefined || value === null || value === '')) return '';
    if (typeof value !== 'string') throw invalid();
    const trimmed = value.trim();
    if ((!trimmed && !optional) || trimmed.length > max || CONTROL.test(trimmed)) throw invalid();
    return trimmed;
  };
  const name = text('name', 120), email = text('email', 254).toLowerCase(), phone = text('phone', 40), note = text('note', 1000, true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw invalid();
  const start = body.start, end = body.end, first = calendar(start), last = calendar(end);
  if (first === null || last === null || last < first || (last - first) / 86_400_000 > PLAN_LIMITS.maxNights) throw invalid();
  const guests = body.guests;
  if (!Number.isInteger(guests) || guests < 1 || guests > 99) throw invalid();
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > PLAN_LIMITS.maxItems) throw invalid();
  const seen = new Set();
  const items = body.items.map(item => {
    if (!item || typeof item !== 'object' || !PLAN_KINDS.includes(item.kind) || typeof item.slug !== 'string'
      || item.slug.length > 120 || !SLUG.test(item.slug) || seen.has(item.kind + ':' + item.slug)) throw invalid();
    seen.add(item.kind + ':' + item.slug);
    return { kind:item.kind, slug:item.slug };
  });
  const time = items.some(item => restaurant(item.kind)) ? body.time : null;
  if (time !== null && (typeof time !== 'string' || !TIME.test(time))) throw invalid();
  return { name, email, phone, start, end, guests, time, note, items };
}

/** The live catalogue decides what an item is called and whether it can be requested. */
export async function catalogueItem(kind, slug, env = process.env, fetcher = fetch) {
  if (kind === 'yacht') { const item = await getYachtBySlug(slug); return item ? { title:item.title } : null; }
  if (kind === 'car') { const item = await getRentalBySlug(slug); return item ? { title:item.title } : null; }
  if (kind === 'stay') { const item = await getVacationRentalBySlug(slug); return item && item.availability !== 'booked' ? { title:item.title } : null; }
  if (restaurant(kind)) {
    const venue = await diningVenue(slug, env, fetcher, { strict:true });
    return venue && venue.status === 'verified' && (venue.category === 'nightlife' ? 'nightlife' : 'dining') === kind ? { title:venue.name, venue } : null;
  }
  return null;
}

export const diningEnabled = env => env.DINING_REQUESTS_ENABLED === 'true' && env.DINING_SCHEMA_ENABLED === 'true';

function planResponse(receipt, itemCount) {
  if (!isPlanReceipt(receipt) || receipt.bookingIds.length !== itemCount) throw new RequestError(503, 'Service unavailable');
  return json({ success:true, planId:receipt.planId, bookingIds:receipt.bookingIds, replayed:receipt.replayed === true });
}

export function planHandlers(env, fetcher = fetch, resolve = catalogueItem, clock = () => new Date()) {
  return {
    submit: async request => {
      try {
        if (env.PLAN_REQUESTS_ENABLED !== 'true') throw new RequestError(503, 'Plan requests are not enabled');
        const key = requireKey(request);
        const input = planInput(await readBody(request, 16384));
        const db = database(env, fetcher), user = await db.identity(request, true);
        // The submitted data is stable across catalogue edits and guest request claims.
        const fingerprint = await digest(JSON.stringify([input, user?.id || null]));
        const previous = await db.rpc('dashboard_plan_receipt', { p_key:key, p_fingerprint:fingerprint });
        if (previous !== null) return planResponse(previous, input.items.length);

        const now = clock(), today = newYorkToday(now);
        const latest = String(Number(today.slice(0, 4)) + 2) + today.slice(4);
        if (input.start < today || input.start > latest) throw invalid();
        if (input.items.some(item => restaurant(item.kind)) && !diningEnabled(env)) throw invalid();
        const items = [];
        for (const item of input.items) {
          const found = await resolve(item.kind, item.slug, env, fetcher);
          if (!found) throw new RequestError(400, 'Invalid item');
          if (restaurant(item.kind)) {
            // The single-venue rules (options, verified status, calendar) apply unchanged.
            const valid = bookingInput({ name:input.name, email:input.email, phone:input.phone, dates:'plan', itemSlug:item.slug, itemTitle:found.title, kind:item.kind,
              hospitality:{ version:1, date:input.start, time:input.time, guests:input.guests, option:'table', note:input.note } }, found.venue, now);
            items.push({ kind:item.kind, itemSlug:item.slug, itemTitle:valid.itemTitle, dates:valid.dates, hospitality:valid.hospitality });
          } else {
            items.push({ kind:item.kind, itemSlug:item.slug, itemTitle:found.title, dates:`Plan ${input.start} → ${input.end} · ${input.guests} guests` });
          }
        }
        if (!env.BOOKING_RATE_SECRET || env.BOOKING_RATE_SECRET.length < 32) throw new RequestError(503, 'Service unavailable');
        // CF-Connecting-IP is set by the site's Cloudflare ingress, never the body.
        const rate = await digest(request.headers.get('cf-connecting-ip') || 'unavailable', env.BOOKING_RATE_SECRET);
        const payload = { name:input.name, email:input.email, phone:input.phone, start:input.start, end:input.end, guests:input.guests, note:input.note, items };
        const receipt = await db.rpc('dashboard_submit_plan', { p_key:key, p_fingerprint:fingerprint, p_rate:rate, p_user:user?.id || null, p_input:payload });
        return planResponse(receipt, items.length);
      } catch (error) { return failure(error); }
    }
  };
}
