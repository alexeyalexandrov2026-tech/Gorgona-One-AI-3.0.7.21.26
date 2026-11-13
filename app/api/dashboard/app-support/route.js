import { appSupportHandlers } from '../../../../lib/server/appSupport.mjs';

export const dynamic = 'force-dynamic';
export async function GET(request) { return appSupportHandlers(process.env).list(request); }
export async function PATCH(request) { return appSupportHandlers(process.env).resolve(request); }
