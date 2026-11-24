// Search metadata shared by the sitemap, page metadata and structured data.
// Pure functions with no framework imports, so the content tests can run them.

export const SITE_URL = 'https://gorgona-one.com';
export const SITE_NAME = 'MIAMI ELIO';
export const DEFAULT_IMAGE = { url: '/miami-elio-turquoise-wave.jpg', width: 1200, height: 630, alt: 'MIAMI ELIO over a turquoise ocean wave' };

// The language is a cookie, not a URL prefix: every language shares one
// address per page, so there are no hreflang alternates to declare.

// Cuts at a word boundary so a description never ends mid-word.
export function clip(text, max = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).replace(/[\s,;:.·—-]+$/, '')}…`;
}

const headline = (text) => String(text || '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');

// One page's title, description, canonical address and share card.
// `path` is the page's own address ('/rentals/urus'); `image` may be a site
// path or a full address. `fullTitle` replaces the browser title when it needs
// more than "<name> | MIAMI ELIO"; the share card keeps the plain name.
export function pageMetadata({ title, description, path, image, fullTitle }) {
  const name = headline(title);
  const summary = clip(description);
  const images = [image ? { url: image } : DEFAULT_IMAGE];
  return {
    title: fullTitle || `${name} | ${SITE_NAME}`,
    ...(summary ? { description: summary } : {}),
    alternates: { canonical: path },
    openGraph: { title: name, ...(summary ? { description: summary } : {}), url: path, siteName: SITE_NAME, images, type: 'website' },
    twitter: { card: 'summary_large_image', title: name, ...(summary ? { description: summary } : {}), images: images.map((entry) => entry.url) }
  };
}

// --- Search wording ----------------------------------------------------------

// The title-case wordmark that closes a page title ("... | Miami Elio").
export const withBrand = (text) => `${text} | Miami Elio`;

// English headings written for search. Other languages keep their translated
// headings: the translation catalogue is reviewed language by language, so the
// new wording stays out of it until it is approved.
export const SEO_HEADINGS = Object.freeze({
  yachts: 'Miami Yacht Charters',
  privateJets: 'Private Jet Charter in Miami',
  experiences: 'Top Miami Tours & Experiences',
  exclusive: 'Exclusive Destinations & VIP Getaways'
});
export const seoHeading = (locale, key, localized) => (locale === 'en' && SEO_HEADINGS[key]) || localized;

// Dollars from the price text the catalogue stores ("$1,200", "From $500/day").
// "On request" and anything else that is not an amount is not a price.
export function dailyPriceNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const match = /^\s*(?:from\s+)?\$\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(?:\/\s*day|per day|a day)?\s*$/i.exec(String(value ?? ''));
  const amount = match ? Number(match[1].replace(/,/g, '')) : 0;
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
const dollars = (amount) => amount.toLocaleString('en-US', { maximumFractionDigits: 2 });

const SLUG_COLORS = new Set(['white', 'black', 'red', 'blue', 'silver', 'grey', 'gray', 'green', 'yellow', 'orange', 'gold', 'pink', 'purple', 'brown', 'beige', 'burgundy', 'bronze']);

function rentalVariantTag(name, slug) {
  const cleanSlug = String(slug || '').trim().toLowerCase();
  if (!cleanSlug) return '';
  const numMatch = /-(\d+)$/.exec(cleanSlug);
  if (numMatch) return `#${numMatch[1]}`;
  const colorMatch = /-([a-z]+)$/.exec(cleanSlug);
  if (colorMatch && SLUG_COLORS.has(colorMatch[1]) && !new RegExp(`\\b${colorMatch[1]}\\b`, 'i').test(name)) {
    return colorMatch[1][0].toUpperCase() + colorMatch[1].slice(1);
  }
  return '';
}

// Car detail page. The daily price goes into the title only when the catalogue
// holds a real amount. When a catalogue slug distinguishes multiple vehicles
// sharing the same model name (color finish or fleet unit number), append a
// compact variant tag so every /rentals/[slug] URL keeps a unique title and
// meta description.
export function rentalSearchText({ title, dailyPrice, slug }) {
  const name = headline(title);
  const variant = rentalVariantTag(name, slug);
  const displayName = variant ? `${name} (${variant})` : name;
  const price = dailyPriceNumber(dailyPrice);
  const rateClause = slug && price ? ` from $${dollars(price)}/day` : '';
  // A long car name drops the closing "Book now." before anything is cut off.
  const lead = `Rent the ${displayName} in Miami${rateClause} with Miami Elio. Flexible daily rates, delivery across Miami Beach & Brickell, and 24/7 ELIO+ Guide support.`;
  return {
    title: withBrand(price ? `${displayName} Rental Miami — From $${dollars(price)}/Day` : `${displayName} Rental in Miami`),
    description: `${lead} Book now.`.length <= 160 ? `${lead} Book now.` : clip(lead)
  };
}

// Rich, unique meta description for Miami dining and nightlife detail pages
// when the catalogue summary is short or shared across venues.
export function venueSearchDescription(venue) {
  const name = headline(venue?.name);
  if (!name) return '';
  const rawDesc = String(venue?.description || '').replace(/\s+/g, ' ').trim();
  if (rawDesc.length >= 90 && rawDesc.toLowerCase().includes(name.toLowerCase())) return clip(rawDesc);
  const details = [venue?.cuisine, venue?.price].filter(Boolean).join(' · ');
  const place = venue?.neighborhood ? ` in ${venue.neighborhood}, Miami` : ' in Miami';
  const lead = `${name}${place}${details ? ` — ${details}` : ''}.`;
  const tail = rawDesc && rawDesc.toLowerCase() !== lead.toLowerCase()
    ? `${rawDesc} Reserve directly or plan your evening with Miami Elio.`
    : 'Reserve directly or plan your evening with Miami Elio.';
  return clip(`${lead} ${tail}`);
}

// Words that already say what a collection sells, so "Tickets & Tours" would
// only repeat them.
const SELLS = /\b(tickets?|tours?|flights?|passes|lounges)\b/i;

// Experience detail page. "in Miami" is added only for Miami collections: the
// catalogue also holds Orlando, Tampa and helicopter collections elsewhere. The
// description names Headout, where the booking and payment happen.
export function experienceSearchText({ title, region }) {
  const name = headline(title);
  const place = region === 'miami' && !/miami/i.test(name) ? ' in Miami' : '';
  return {
    title: withBrand(`${SELLS.test(name) ? name : `${name} Tickets & Tours`}${place}`),
    description: clip(`Book ${name}${/\btickets?\b/i.test(name) ? '' : ' tickets'}${place}. Check schedules, highlights and booking options on Headout through Miami Elio.`)
  };
}

// Sign-in, account and admin screens: useful to guests, useless in search.
export const PRIVATE_METADATA = { robots: { index: false, follow: false } };

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

// The address the privacy page gives for questions. No social profiles or app
// store listings are published yet, so the organization lists none.
export const SUPPORT_EMAIL = 'support@gorgona-one.com';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/apple-touch-icon.png`,
    description: 'Luxury rentals, bookings and the 16-language ELIO+ Guide in Miami: yacht charters, exotic car rentals, villas and hotels, private jets, experiences, event tickets, restaurants and nightlife.',
    areaServed: 'Miami, Florida',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Sunny Isles Beach',
      addressRegion: 'FL',
      addressCountry: 'US'
    },
    knowsLanguage: ['en', 'ru', 'es', 'he', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'],
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: SUPPORT_EMAIL }
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/discovery?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

export function sectionJsonLd({ name, description, path }) {
  if (!name || !path) return [];
  const cleanName = headline(name);
  const cleanDesc = clip(description);
  const url = `${SITE_URL}${path}`;
  return [
    compact({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#collection`,
      name: cleanName,
      description: cleanDesc || undefined,
      url,
      isPartOf: { '@id': `${SITE_URL}/#website` }
    }),
    breadcrumbJsonLd([{ name: SITE_NAME, path: '/' }, { name: cleanName, path }])
  ].filter(Boolean);
}

// Safe to place inside a <script> element: "<" never appears literally.
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// --- Structured data for detail pages ----------------------------------------
// Each builder returns null when the record lacks what the schema needs, so a
// page never claims a price, date or address the catalogue does not hold.

const absolute = (value) => {
  const text = String(value || '').trim();
  if (!text) return undefined;
  return /^https?:\/\//i.test(text) ? text : `${SITE_URL}${text.startsWith('/') ? '' : '/'}${text}`;
};
const compact = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ''));

// trail: [{ name, path }] from the section down to the page itself.
export function breadcrumbJsonLd(trail) {
  const steps = (trail || []).filter((step) => step?.name && step.path);
  if (steps.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, index) => ({ '@type': 'ListItem', position: index + 1, name: headline(step.name), item: `${SITE_URL}${step.path}` }))
  };
}

// A car with a real daily price. "On request" cars get no Product: an offer
// without a price is an error in Google's rich result checks.
export function carJsonLd(car) {
  const price = dailyPriceNumber(car?.dailyPrice);
  if (!car?.slug || !car.title || !price) return null;
  const url = `${SITE_URL}/rentals/${car.slug}`;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: headline(car.title),
    description: String(car.description || '').replace(/\s+/g, ' ').trim(),
    image: absolute(car.image),
    category: car.category,
    url,
    offers: {
      '@type': 'Offer',
      url,
      price,
      priceCurrency: 'USD',
      priceSpecification: { '@type': 'UnitPriceSpecification', price, priceCurrency: 'USD', unitCode: 'DAY' }
    }
  });
}

// Dated listing: needs a name, venue, city and a YYYY-MM-DD date. The catalogue
// holds no time zone, so a time is written without an offset (local time).
export function eventJsonLd(event) {
  if (!event?.slug || !event.name || !event.venue || !event.city || !/^\d{4}-\d{2}-\d{2}$/.test(event.date || '')) return null;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    startDate: /^\d{2}:\d{2}$/.test(event.time || '') ? `${event.date}T${event.time}` : event.date,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue,
      address: compact({ '@type': 'PostalAddress', addressLocality: event.city, addressRegion: event.state, addressCountry: event.country })
    },
    description: event.description,
    image: absolute(event.image),
    url: `${SITE_URL}/events/${event.slug}`
  });
}

const US_ADDRESS = /^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/;

// A verified venue only: unverified pages show no description and no booking.
export function venueJsonLd(venue) {
  if (!venue?.slug || !venue.name || venue.status !== 'verified') return null;
  const parts = US_ADDRESS.exec(String(venue.address || ''));
  const restaurant = venue.category === 'restaurant';
  return compact({
    '@context': 'https://schema.org',
    '@type': restaurant ? 'Restaurant' : 'LocalBusiness',
    name: venue.name,
    url: `${SITE_URL}/restaurants-nightlife/${venue.slug}`,
    image: absolute(venue.image),
    address: parts
      ? { '@type': 'PostalAddress', streetAddress: parts[1], addressLocality: parts[2], addressRegion: parts[3], postalCode: parts[4], addressCountry: 'US' }
      : (venue.address || undefined),
    servesCuisine: restaurant ? venue.cuisine : undefined,
    priceRange: venue.price || undefined,
    telephone: venue.phone || undefined,
    sameAs: venue.website ? [venue.website] : undefined
  });
}

// Only collections named after a place. Flights, passes, ferries and the
// catch-all Orlando bundle are not attractions.
const NOT_AN_ATTRACTION = /\b(tours?|passes|cards|lounges|ferry|flights?|attractions)\b/i;
export function attractionJsonLd(item) {
  const name = headline(item?.title);
  if (!item?.slug || !name || !['miami', 'orlando', 'tampa'].includes(item.region) || NOT_AN_ATTRACTION.test(name)) return null;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name,
    url: `${SITE_URL}/experiences/${item.slug}`,
    image: absolute(item.image)
  });
}

// --- Sitemap ---------------------------------------------------------------

export const SECTION_ROUTES = [
  '', '/experiences', '/exclusive-destinations', '/private-jets', '/events', '/rentals', '/yachts', '/vacation-rentals', '/restaurants-nightlife',
  '/travel', '/travel/ovago', '/discovery'
];
export const LEGAL_ROUTES = ['/privacy', '/terms', '/cookie-policy', '/affiliate-disclosure', '/partner-agreement'];
export const PRIVATE_ROUTES = ['/admin', '/login', '/register', '/profile', '/account', '/partner'];

// The catalogue does not store when a listing changed, so an address without
// its own date carries the date of the last content release. A listing that
// does know its date can pass { slug, lastModified: 'YYYY-MM-DD' } instead of
// a plain slug.
export const SITEMAP_LASTMOD = '2026-11-24';

const DATE = /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))?$/;
const entry = (path, changeFrequency, priority, lastModified) => ({
  url: `${SITE_URL}${path}`,
  lastModified: DATE.test(String(lastModified || '')) ? String(lastModified) : SITEMAP_LASTMOD,
  changeFrequency,
  priority
});
// Entries for one section, from slugs or { slug, lastModified } objects.
const section = (prefix, items, changeFrequency, priority) => items.map((item) => {
  const { slug, lastModified } = item && typeof item === 'object' ? item : { slug: item };
  return entry(`${prefix}/${slug}`, changeFrequency, priority, lastModified);
});

// inventory: slugs per section, read by app/sitemap.js through the same
// getters the pages use.
export function sitemapEntries({ experiences = [], eventCategories = [], leagues = [], events = [], rentals = [], stays = [], venues = [] } = {}) {
  const list = [
    ...SECTION_ROUTES.map((path) => entry(path, 'weekly', path === '' ? 1 : 0.8)),
    ...section('/experiences', experiences, 'weekly', 0.7),
    ...section('/events/category', eventCategories, 'daily', 0.7),
    ...section('/events/league', leagues, 'weekly', 0.6),
    ...section('/events', events, 'daily', 0.7),
    ...section('/rentals', rentals, 'weekly', 0.7),
    ...section('/vacation-rentals', stays, 'weekly', 0.7),
    ...section('/restaurants-nightlife', venues, 'weekly', 0.6),
    ...LEGAL_ROUTES.map((path) => entry(path, 'yearly', 0.2))
  ];
  const seen = new Set();
  return list.filter(({ url }) => !url.includes('undefined') && !seen.has(url) && seen.add(url));
}
