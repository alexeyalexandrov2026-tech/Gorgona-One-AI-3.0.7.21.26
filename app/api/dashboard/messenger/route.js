import { adminCopilotHandlers } from '../../../../lib/server/adminCopilotHandler.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  return adminCopilotHandlers(process.env).messengerStatus(request);
}

export async function POST(request) {
  return adminCopilotHandlers(process.env).messengerUpdate(request);
}
