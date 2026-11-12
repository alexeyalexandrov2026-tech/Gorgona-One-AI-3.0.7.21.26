import { planHandlers } from '../../../lib/server/planHandlers.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request) { return planHandlers(process.env).submit(request); }
