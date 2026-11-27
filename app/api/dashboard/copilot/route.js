import { adminCopilotHandlers } from '../../../../lib/server/adminCopilotHandler.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  return adminCopilotHandlers(process.env).draftForRequest(request);
}
