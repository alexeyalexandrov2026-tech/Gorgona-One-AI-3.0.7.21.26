import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===========================================================================
// Text-to-speech: PERMANENTLY DISABLED.
//
// The Gorgona One concierge is strictly text and UI. Browser speechSynthesis
// has been removed from app/components/ai/useVoice.js, and this route - the
// only other way audio could ever be produced - is closed here rather than
// left dormant behind an env flag, so no configuration change can bring a
// synthetic voice back.
//
// GET keeps answering `{ available: false }` because that is the shape a
// client would probe for; it now always reports unavailable. POST refuses.
// The provider implementation in lib/ai/voice.js is retained but has no
// caller and is unreachable from the app.
//
// Voice INPUT (speech-to-text) is unaffected - see useVoice.js, which binds
// recognition to the language chosen in the global switcher.
// ===========================================================================

export async function GET() {
  return NextResponse.json({ available: false, disabled: true });
}

export async function POST() {
  return NextResponse.json(
    { error: 'Text-to-speech is disabled. The concierge replies in text only.' },
    { status: 410 }
  );
}
