// The photo of the Adventures tile in Android app builds released before
// Adrenaline 365 was removed. It now points at the Exclusive Destinations
// photo. Delete together with app/entertainment/adrenaline-365/route.js.
export function GET() {
  return new Response(null, { status: 308, headers: { Location: '/images/experiences/miami-coast.webp' } });
}
