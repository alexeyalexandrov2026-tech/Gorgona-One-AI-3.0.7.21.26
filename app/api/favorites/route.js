import { favoritesHandlers } from '../../../lib/server/favoritesHandlers.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request) { return favoritesHandlers(process.env).list(request); }
export async function POST(request) { return favoritesHandlers(process.env).change(request); }
