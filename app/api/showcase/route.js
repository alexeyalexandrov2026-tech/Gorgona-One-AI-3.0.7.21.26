import { NextResponse } from 'next/server';
import { buildHeroShowcase } from '../../../lib/heroShowcaseData.js';
import { showcaseApiResult } from '../../../lib/showcaseApi.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===========================================================================
// Read-only JSON feed of the home-page showcase for the Android app. It is
// anonymous: no cookies, no auth, no personal data, and nothing is taken from
// the request but its origin, which turns site-relative images into absolute
// https URLs. The cards are the ones the home page shows
// (lib/heroShowcaseData.js); the field list, image rules and cache policy live
// in lib/showcaseApi.js.
// ===========================================================================

export async function GET(request) {
  const { body, cacheControl } = await showcaseApiResult(buildHeroShowcase, request.url);
  return NextResponse.json(body, { headers: { 'Cache-Control': cacheControl } });
}
