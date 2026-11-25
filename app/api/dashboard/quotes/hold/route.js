import { paymentQuoteHandlers } from '../../../../../lib/server/paymentQuoteHandlers.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  return paymentQuoteHandlers(process.env).releaseHold(request);
}
