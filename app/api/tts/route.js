import { NextResponse } from 'next/server';
import { isTtsAvailable, synthesizeSpeech } from '../../../lib/ai/voice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===========================================================================
// HTTP adapter for premium TTS (lib/ai/voice.js). GET reports availability
// so clients probe once and otherwise keep using browser speechSynthesis;
// POST synthesizes audio. Feature-flagged via TTS_PROVIDER - with the flag
// off this route is inert and the concierge voice still works everywhere.
// ===========================================================================

export async function GET() {
  return NextResponse.json({ available: isTtsAvailable() });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const text = String(body?.text || '').trim();
  if (!text) return NextResponse.json({ error: 'No text provided.' }, { status: 400 });

  // Optional BCP-47 reply language (e.g. 'ru-RU') so providers that select a
  // voice by language (Google) speak in the guest's language.
  const lang = typeof body?.lang === 'string' ? body.lang.slice(0, 12) : undefined;
  const gender = body?.gender === 'male' ? 'male' : 'female';

  const result = await synthesizeSpeech(text, { lang, gender });
  if (!result.ok) {
    // 503 (not 404): the client treats this as "fall back to system voice".
    return NextResponse.json({ error: 'TTS unavailable.' }, { status: 503 });
  }

  return new Response(result.audio, {
    headers: { 'Content-Type': result.mime, 'Cache-Control': 'no-store' }
  });
}
