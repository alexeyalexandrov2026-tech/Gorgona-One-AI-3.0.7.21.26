import { NextResponse } from 'next/server';
import { searchListings } from '../../../lib/data/listings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===========================================================================
// HTTP adapter for inventory search. The engine lives in Postgres
// (search_listings RPC) behind lib/data/listings.js - this route only
// validates input and shapes the response. The site search UI and (Phase 3)
// the AI concierge's search tool consume this same engine.
// ===========================================================================

const MAX_QUERY_LENGTH = 80;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH);
  const world = searchParams.get('world') || undefined;
  const limit = searchParams.get('limit') || undefined;

  if (q.length < 2) {
    return NextResponse.json({ query: q, results: [] });
  }

  const results = await searchListings(q, { limit, world });

  return NextResponse.json(
    { query: q, results },
    // Anonymous, deterministic per-query responses: let the edge absorb
    // bursts while inventory edits still surface within a minute.
    { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120' } }
  );
}
