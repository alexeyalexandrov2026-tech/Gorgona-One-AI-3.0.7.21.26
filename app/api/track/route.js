import { trackHandlers } from '../../../lib/server/trackHandler.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  return trackHandlers(process.env).ingest(request);
}
