import { getRentals, getYachts, getVacationRentals } from './data/listings.js';
import { HOME_TICKETS, smallPhoto } from './homeTickets.js';
import { assembleShowcase, localPhotoPresent, usablePhoto } from './heroShowcase.js';

const JET_IMAGE = '/images/home/worlds/travel-wing.jpg';
const SHOWCASE_CACHE_TTL_MS = 60_000;

// Static assets verified at test time (tests/content/home-tickets.test.mjs and
// tests/content/hero-showcase.test.mjs). Using an explicit static set instead
// of runtime fs.existsSync('public/...') or ASSETS.fetch(HEAD) prevents Next.js
// Output File Tracing from bundling a 569 KB trace of public/ and eliminates
// ~14 cold-start subrequests on every Cloudflare Worker isolate.
const VERIFIED_STATIC_ASSETS = new Set([
  JET_IMAGE,
  ...HOME_TICKETS.flatMap((ticket) => [smallPhoto(ticket.image), ticket.image])
]);

let showcaseCache = null; // { at: number, items: Array }
let showcaseInFlight = null;

function keptSources(srcs) {
  return new Set(
    srcs.filter((src) =>
      usablePhoto(src) &&
      localPhotoPresent(src, { diskReady: false, shipped: VERIFIED_STATIC_ASSETS })
    )
  );
}

async function computeHeroShowcase() {
  const [rentals, yachts, stays] = await Promise.all([
    getRentals(),
    getYachts(),
    getVacationRentals()
  ]);
  const ticketChoices = HOME_TICKETS.map((ticket) => ({
    ticket,
    images: [smallPhoto(ticket.image), ticket.image]
  }));
  const draft = assembleShowcase({
    rentals,
    yachts,
    stays,
    tickets: ticketChoices.map(({ ticket }) => ticket),
    jetImage: JET_IMAGE
  });
  const kept = keptSources([
    JET_IMAGE,
    ...ticketChoices.flatMap((choice) => choice.images),
    ...draft.map((card) => card.image)
  ]);
  const tickets = ticketChoices.flatMap((choice) => {
    const image = choice.images.find((src) => kept.has(src));
    return image ? [{ ...choice.ticket, image }] : [];
  });
  return assembleShowcase({
    rentals,
    yachts,
    stays,
    tickets,
    jetImage: kept.has(JET_IMAGE) ? JET_IMAGE : ''
  }).filter((card) => kept.has(card.image));
}

export async function buildHeroShowcase() {
  if (showcaseCache && Date.now() - showcaseCache.at < SHOWCASE_CACHE_TTL_MS) {
    return showcaseCache.items;
  }
  if (showcaseInFlight) return showcaseInFlight;

  showcaseInFlight = (async () => {
    try {
      const items = await computeHeroShowcase();
      if (items.length > 0) {
        showcaseCache = { at: Date.now(), items };
      }
      return items;
    } catch (error) {
      console.error('hero showcase', error);
      return showcaseCache?.items || [];
    } finally {
      showcaseInFlight = null;
    }
  })();

  return showcaseInFlight;
}
