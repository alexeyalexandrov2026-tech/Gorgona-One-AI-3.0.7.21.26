import {diningVenue} from '../../../../lib/server/diningCatalogue.mjs';
import {availability,DiningError} from '../../../../lib/dining/gateway.mjs';
import {json} from '../../../../lib/server/dashboardCore.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const query = new URL(request.url).searchParams;
    const venue = await diningVenue(query.get('venue'),process.env,fetch,{strict:true});
    if (!venue) return json({error:'venue_not_found'},404);
    return json(availability(venue,{version:1,date:query.get('date'),time:query.get('time'),guests:Number(query.get('guests')),option:query.get('option')||'table'}));
  } catch(error) { return json({error:error instanceof DiningError ? error.message : 'service_unavailable'},error instanceof DiningError ? error.status : 503); }
}
