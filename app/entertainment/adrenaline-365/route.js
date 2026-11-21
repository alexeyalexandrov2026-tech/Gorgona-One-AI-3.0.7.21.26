// Adrenaline 365 is gone from the site. Android app builds released before its
// removal still open this address from their Adventures tile, so it sends
// them to Exclusive Destinations. Delete once those builds are out of use.
export function GET() {
  return new Response(null, { status: 308, headers: { Location: '/exclusive-destinations' } });
}
