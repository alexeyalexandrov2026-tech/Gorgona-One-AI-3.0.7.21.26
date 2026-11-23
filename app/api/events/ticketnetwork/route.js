import { parseTicketNetworkQuery } from '../../../../lib/ticketnetworkSearch.js';
import { createTicketNetworkSource, ticketNetworkFailureDetails } from '../../../../lib/ticketnetworkSource.js';

export const dynamic = 'force-dynamic';
let source;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 90;
const ipHits = new Map();

function checkRateLimit(request) {
  const ip = request?.headers?.get('cf-connecting-ip')?.trim();
  if (!ip) return true;
  const now = Date.now();
  if (ipHits.size > 2000) {
    for (const [k, v] of ipHits) {
      if (now - v.start >= RATE_WINDOW_MS) ipHits.delete(k);
    }
  }
  const entry = ipHits.get(ip);
  if (!entry || now - entry.start >= RATE_WINDOW_MS) {
    ipHits.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT;
}

export async function GET(request) {
  if (!checkRateLimit(request)) {
    return Response.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } }
    );
  }
  let query;
  try { query = parseTicketNetworkQuery(new URL(request.url).searchParams); }
  catch { return Response.json({ error: 'Please check the event filters and date range.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }
  source ||= createTicketNetworkSource({ cache: globalThis.caches?.default });
  try {
    return Response.json(await source.get(query), {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' }
    });
  } catch (error) {
    const details = ticketNetworkFailureDetails(error);
    console.warn('TicketNetwork search unavailable', details);
    return Response.json({ error: 'Events could not be refreshed. Please try again.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' }
    });
  }
}
