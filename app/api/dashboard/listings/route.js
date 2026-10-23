import {partnerListingHandlers} from '../../../../lib/server/partnerListingHandlers.mjs';
export const dynamic='force-dynamic';
export async function GET(request){return partnerListingHandlers(process.env).list(request);}
export async function POST(request){return partnerListingHandlers(process.env).command(request);}
