import { whisperHandlers } from '../../../../lib/server/whisperHandler.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  return whisperHandlers(process.env).transcribe(request);
}
