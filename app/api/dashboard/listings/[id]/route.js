import {partnerListingHandlers} from '../../../../../lib/server/partnerListingHandlers.mjs';
export const dynamic='force-dynamic';
export async function GET(request,{params}){
  params = await params;return partnerListingHandlers(process.env).detail(request,params.id);}
