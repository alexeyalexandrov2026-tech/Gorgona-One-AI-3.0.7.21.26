import { telegramWebhookHandlers } from '../../../../lib/server/telegramWebhookHandler.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  return telegramWebhookHandlers(process.env).post(request);
}
