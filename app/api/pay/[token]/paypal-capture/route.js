import { paymentQuoteHandlers } from '../../../../../lib/server/paymentQuoteHandlers.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request, { params }) {
  params = await params;
  return paymentQuoteHandlers(process.env).capturePayPal(request, params.token);
}
