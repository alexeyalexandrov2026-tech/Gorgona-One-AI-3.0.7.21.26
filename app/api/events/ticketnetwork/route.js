import { parseTicketNetworkQuery } from '../../../../lib/ticketnetworkSearch.js';
import { createTicketNetworkSource, ticketNetworkFailureDetails } from '../../../../lib/ticketnetworkSource.js';

export const dynamic = 'force-dynamic';
let source;

export async function GET(request) {
  let query;
  try { query = parseTicketNetworkQuery(new URL(request.url).searchParams); }
  catch { return Response.json({ error: 'Please check the event filters and date range.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }
  source ||= createTicketNetworkSource({ cache: globalThis.caches?.default });
  try {
    return Response.json(await source.get(query), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const details = ticketNetworkFailureDetails(error);
    console.warn('TicketNetwork search unavailable', details);
    return Response.json({ error: 'Events could not be refreshed. Please try again.', ...details }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' }
    });
  }
}
