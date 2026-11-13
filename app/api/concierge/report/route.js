import { appSupportHandlers } from '../../../../lib/server/appSupport.mjs';

export const dynamic = 'force-dynamic';
export async function POST(request) { return appSupportHandlers(process.env).report(request); }
