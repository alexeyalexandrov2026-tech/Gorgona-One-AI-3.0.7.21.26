import { dashboardHandlers } from '../../../../lib/server/dashboardHandlers.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request) { return dashboardHandlers(process.env).notifications(request); }
