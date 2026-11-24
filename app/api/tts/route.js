import { ttsHandlers } from '../../../lib/server/ttsHandler.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Opt-in female voice TTS for ELIO+ Guide (triggered strictly on user tap).
export async function GET() {
  return ttsHandlers(process.env).status();
}

export async function POST(request) {
  return ttsHandlers(process.env).speak(request);
}
