import { whatsappWebhookHandlers } from '../../../../lib/server/whatsappWebhookHandler.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  return whatsappWebhookHandlers(process.env).get(request);
}

export async function POST(request) {
  return whatsappWebhookHandlers(process.env).post(request);
}
