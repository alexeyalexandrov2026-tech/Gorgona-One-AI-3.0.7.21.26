import {partnerListingHandlers} from '../../../../../../lib/server/partnerListingHandlers.mjs';
export const dynamic='force-dynamic';
export async function GET(request,{params}){return partnerListingHandlers(process.env).publicPhoto(request,params.id,params.version,params.file);}
