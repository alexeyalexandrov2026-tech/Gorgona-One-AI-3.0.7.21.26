import { paymentQuoteHandlers } from '../../../../lib/server/paymentQuoteHandlers.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request) { return paymentQuoteHandlers(process.env).listQuotes(request); }
export async function POST(request) { return paymentQuoteHandlers(process.env).createQuote(request); }
export async function DELETE(request) { return paymentQuoteHandlers(process.env).cancelQuote(request); }
