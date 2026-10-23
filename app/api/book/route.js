import { dashboardHandlers } from '../../../lib/server/dashboardHandlers.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return dashboardHandlers(process.env).book(request); }
