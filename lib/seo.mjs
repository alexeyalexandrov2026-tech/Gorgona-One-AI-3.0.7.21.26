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

export const HOME_SEO_HEADING = 'Miami Elio — Luxury Yacht Charters, Exotic Car Rentals, Villas, Private Jets & Dining in Miami';
export const homeSeoHeading = (locale, localized) => (locale === 'en' ? HOME_SEO_HEADING : localized);

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

// Official public Miami Elio support & business contact details.
export const SUPPORT_EMAIL = 'support@gorgona-one.com';
export const SUPPORT_PHONE = '+1-786-492-8880';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.miamielio.app';
export const OFFICIAL_CHANNELS = Object.freeze([
  'https://t.me/MIAMI_ELIO',
  'https://wa.me/message/VO7GCPZCDKRZO1',
  GOOGLE_PLAY_URL
]);

const KNOWN_CAR_BRANDS = [
  'Rolls-Royce', 'Lamborghini', 'Ferrari', 'McLaren', 'Bentley', 'Porsche',
  'Mercedes-Maybach', 'Mercedes-Benz', 'Mercedes-AMG', 'Aston Martin',
  'Maserati', 'Range Rover', 'Land Rover', 'Cadillac', 'Chevrolet',
  'Corvette', 'BMW', 'Audi', 'Tesla', 'Jeep', 'Lexus', 'Ford', 'Dodge'
];

function inferCarBrand(title) {
  const clean = String(title || '');
  return KNOWN_CAR_BRANDS.find((brand) => new RegExp(`\\b${brand.replace(/-/g, '[-\\s]?')}\\b`, 'i').test(clean)) || null;
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'TravelAgency'],
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: 'ALEXEY AAA LOGISTICS LLC',
    alternateName: ['Miami Elio', 'Gorgona One', 'ELIO+ Guide'],
    url: SITE_URL,
    logo: `${SITE_URL}/apple-touch-icon.png`,
    telephone: SUPPORT_PHONE,
    priceRange: '$$$-$$$$',
    sameAs: [...OFFICIAL_CHANNELS],
    description: 'Luxury rentals, bookings and the 16-language ELIO+ Guide in Miami: yacht charters, exotic car rentals, villas and hotels, private jets, experiences, event tickets, restaurants and nightlife.',
    areaServed: 'Miami, Florida',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Miami',
      addressRegion: 'FL',
      addressCountry: 'US'
    },
    knowsLanguage: ['en', 'ru', 'es', 'he', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'],
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: SUPPORT_EMAIL, telephone: SUPPORT_PHONE }
  };
}

export function mobileAppJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    '@id': `${SITE_URL}/#android-app`,
    name: 'Miami Elio',
    operatingSystem: 'ANDROID',
    applicationCategory: 'TravelApplication',
    url: GOOGLE_PLAY_URL,
    downloadUrl: GOOGLE_PLAY_URL,
    inLanguage: ['en', 'ru', 'es', 'he', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'],
    description: 'Plan and book Miami yacht charters, exotic car rentals, villas, private jets, Michelin dining, and live event tickets with the 16-language ELIO+ Guide.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': ORGANIZATION_ID }
  };
}

export function faqJsonLd(items) {
  const valid = (items || []).filter((item) => item?.question && item?.answer);
  if (!valid.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: valid.map((item) => ({
      '@type': 'Question',
      name: String(item.question).trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: String(item.answer).trim()
      }
    }))
  };
}

export function itemListJsonLd({ name, path, items = [] } = {}) {
  const valid = items.filter((item) => item?.name && item?.path).slice(0, 12);
  if (!name || !path || !valid.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${SITE_URL}${path}#itemlist`,
    name: headline(name),
    numberOfItems: valid.length,
    itemListElement: valid.map((item, index) => compact({
      '@type': 'ListItem',
      position: index + 1,
      name: headline(item.name),
      url: item.path.startsWith('http') ? item.path : `${SITE_URL}${item.path}`
    }))
  };
}

export const SECTION_FAQS = Object.freeze({
  home: [
    {
      question: 'What services can I arrange through Miami Elio?',
      answer: 'Miami Elio (gorgona-one.com) brings together eight Miami verticals in one account: exotic and luxury car rentals (290+ vehicles), captained yacht charters, waterfront villas and stays, private jet charters, 74+ verified Michelin and flagship restaurants, live sports and concert tickets, curated Florida experiences, and flights — guided by our 16-language ELIO+ Guide and handled personally by our Miami team.'
    },
    {
      question: 'How does booking and payment work on Miami Elio?',
      answer: 'You can browse verified rates or ask ELIO+ Guide in 16 languages on the web, in the Miami Elio Android app, or via Telegram (@MIAMI_ELIO) and WhatsApp. Nothing is charged without confirmation: direct fleet bookings use a mandatory ESIGN electronic agreement and Stripe 3D Secure 2 or PayPal Business checkout (with optional Group Split-Pay), while partner listings link to the verified operator.'
    },
    {
      question: 'What is ELIO+ Shield & Care 24/7?',
      answer: 'Confirmed bookings settled through Miami Elio include our contractual 100% Fulfillment & Replacement Guarantee and 24/7 live specialist support through trip completion, with a direct private phone line unlocked after payment confirmation.'
    },
    {
      question: 'Which languages does Miami Elio support?',
      answer: 'Miami Elio and ELIO+ Guide operate natively in 16 languages: English, Russian, Spanish, Hebrew, Chinese, Portuguese, Ukrainian, Japanese, Korean, German, Arabic, Turkish, Persian, Italian, French, and Polish.'
    }
  ],
  rentals: [
    {
      question: 'How much does it cost to rent an exotic or luxury car in Miami on Miami Elio?',
      answer: 'Verified daily rates across our 290-vehicle Miami catalog start around $250/day for luxury sedans and SUVs and range from $750 to $2,000+/day for supercars and flagship models such as Lamborghini Urus, Huracan, Ferrari, McLaren, Bentley, and Rolls-Royce Cullinan.'
    },
    {
      question: 'Do you deliver exotic cars to MIA, FLL, OPF airports and Miami hotels?',
      answer: 'Yes. The Miami Elio team coordinates curbside and white-glove delivery across Miami Beach, South Beach, Brickell, Sunny Isles Beach, Bal Harbour, Fisher Island, Key Biscayne, Miami International Airport (MIA), Fort Lauderdale (FLL), and Opa-locka Executive Airport (OPF).'
    },
    {
      question: 'What are the age, insurance, and deposit requirements for Miami exotic car rentals?',
      answer: 'Drivers generally must be 25+ with a valid driver license (international licenses accepted) and transferable full-coverage auto insurance; a refundable security deposit hold is confirmed in writing before any card is charged.'
    }
  ],
  yachts: [
    {
      question: 'How many guests can board a private yacht charter in Miami?',
      answer: 'Under US Coast Guard rules, standard uninspected private yacht charters carry up to 6 or 12–13 day guests depending on vessel certification, while inspected charter yachts accommodate larger groups. Each charter listing on Miami Elio specifies vessel length, captain, and guest capacity.'
    },
    {
      question: 'What routes are popular for Biscayne Bay yacht charters?',
      answer: 'Popular 4-hour and 8-hour Miami yacht routes depart from Miami Beach, Brickell, and Coconut Grove to cruise past Star Island and Fisher Island, anchor at Haulover Sandbar or Nixon Sandbar off Key Biscayne, or enjoy sunset views of the Downtown Miami skyline.'
    },
    {
      question: 'Are captain, crew, and fuel included in Miami yacht charter quotes?',
      answer: 'Charter quotes on Miami Elio display published partner rates from licensed operators (YATR and verified Viator charters) with transparent details on captain, crew, fuel, taxes, and dockage confirmed prior to booking.'
    }
  ],
  villas: [
    {
      question: 'Which Miami neighborhoods are best for luxury villa and stay rentals?',
      answer: 'Top Miami stay areas include Miami Beach and South Beach for walkability and nightlife, Brickell for skyline and dining access, Sunny Isles Beach and Bal Harbour for calm oceanfront living, and Coconut Grove or Coral Gables for gated waterfront privacy.'
    },
    {
      question: 'Can I bundle a Miami villa with an exotic car and yacht charter?',
      answer: 'Yes. Ask ELIO+ Guide or message our Miami Elio team on Telegram (@MIAMI_ELIO) or WhatsApp with your check-in dates and guest count to coordinate villa check-in, driveway exotic car delivery, and a Biscayne Bay yacht day under one itinerary.'
    }
  ],
  privateJets: [
    {
      question: 'Which private jet airports serve Miami?',
      answer: 'Private aviation flights into Miami primarily operate through Miami-Opa locka Executive Airport (OPF), Miami International Airport (MIA) FBO terminals, and Fort Lauderdale Executive Airport (FXE), with tarmac-to-car handoff arranged by our team.'
    },
    {
      question: 'What are typical one-way private jet guide prices from Miami?',
      answer: 'Published one-way partner estimates through PereJets start around $8,000 for Miami to Nassau (1h), $23,000 to Providenciales (1h 34m), $32,000 to Punta Cana (2h 14m), $35,000 to San Juan (2h 30m), and $36,500 between New York and Miami (2h 36m), subject to aircraft class and availability.'
    }
  ],
  dining: [
    {
      question: 'How does Miami Elio verify Miami restaurants and nightlife reservations?',
      answer: 'Miami Elio curates 74+ verified Michelin-recognized dining rooms, rooftop lounges, beach clubs, and nightclubs across Brickell, South Beach, Design District, Wynwood, Surfside, Coconut Grove, and Coral Gables, linking directly to official reservation platforms including Resy, SevenRooms, OpenTable, Tock, and Discotech.'
    },
    {
      question: 'Which Michelin and flagship Miami restaurants are listed on Miami Elio?',
      answer: 'Verified venues include L’Atelier de Joel Robuchon, COTE Miami, The Surf Club Restaurant, Le Jardinier, Stubborn Seed, Ariete, Los Felix, Shingo, Carbone, Komodo, Sexy Fish, LPM Restaurant & Bar, Papi Steak, MILA, Mandolin Aegean Bistro, and Joe’s Stone Crab.'
    }
  ]
});

export function sectionFaqJsonLd(key) {
  return faqJsonLd(SECTION_FAQS[key]);
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

// Safe to place inside a <script> element: HTML/script-closing and line-separator
// characters are escaped so JSON-LD can never break out of <script>.
export function serializeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
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
  const brand = inferCarBrand(car.title);
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: headline(car.title),
    description: String(car.description || '').replace(/\s+/g, ' ').trim(),
    image: absolute(car.image),
    category: car.category,
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    url,
    offers: {
      '@type': 'Offer',
      url,
      price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      seller: { '@id': ORGANIZATION_ID },
      priceSpecification: { '@type': 'UnitPriceSpecification', price, priceCurrency: 'USD', unitCode: 'DAY' }
    }
  });
}

// Structured entity for "On request" vehicles (and supplemental Car entity)
// without fabricating a numeric Offer price.
export function vehicleJsonLd(car) {
  if (!car?.slug || !car.title) return null;
  const url = `${SITE_URL}/rentals/${car.slug}`;
  const brand = inferCarBrand(car.title);
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: headline(car.title),
    description: String(car.description || '').replace(/\s+/g, ' ').trim() || undefined,
    image: absolute(car.image),
    bodyType: car.category || undefined,
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    url,
    provider: { '@id': ORGANIZATION_ID }
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
export const SITEMAP_LASTMOD = '2026-11-28';

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
