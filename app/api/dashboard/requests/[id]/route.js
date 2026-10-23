import { dashboardHandlers } from '../../../../../lib/server/dashboardHandlers.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) { return dashboardHandlers(process.env).detail(request, params.id); }
export async function POST(request, { params }) { return dashboardHandlers(process.env).command(request, params.id); }
