// Search metadata shared by the sitemap, page metadata and structured data.
// Pure functions with no framework imports, so the content tests can run them.

export const SITE_URL = 'https://gorgona-one.com';
export const SITE_NAME = 'MIAMI ELIO';

// Every language is served from one address per page (the language is a
// cookie, not a URL prefix), so each hreflang variant points at that address.
export const HREFLANG_CODES = ['en-US', 'ru', 'es', 'he-IL', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'];

const DEFAULT_IMAGE = { url: '/og-image.svg', width: 1200, height: 630 };

export function absoluteUrl(path = '') {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') || !path ? path : `/${path}`}`;
}

// Cuts at a word boundary so a description never ends mid-word.
export function clip(text, max = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).replace(/[\s,;:.·—-]+$/, '')}…`;
}

const headline = (text) => String(text || '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');

export function languageAlternates(path) {
  return { ...Object.fromEntries(HREFLANG_CODES.map((code) => [code, path])), 'x-default': path };
}

// One page's title, description, canonical address and share card.
// `path` is the page's own address ('/yachts/atlantis'); `image` may be a
// site path or a full address.
export function pageMetadata({ title, description, path, image, type = 'website' }) {
  const name = headline(title);
  const summary = clip(description);
  const images = [image ? { url: image } : DEFAULT_IMAGE];
  return {
    title: `${name} | ${SITE_NAME}`,
    ...(summary ? { description: summary } : {}),
    alternates: { canonical: path, languages: languageAlternates(path) },
    openGraph: {
      title: name,
      ...(summary ? { description: summary } : {}),
      url: path,
      siteName: SITE_NAME,
      images,
      type
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      ...(summary ? { description: summary } : {}),
      images: images.map((entry) => entry.url)
    }
  };
}

// "$1,250.00" or "$350.00 / h" is a price; "On request" and "From $199" are not.
export function numericPrice(text) {
  const match = /^\$(\d{1,3}(?:,\d{3})*|\d+)(\.\d{1,2})?(?:\s*\/\s*([a-z]+))?$/i.exec(String(text || '').trim());
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, '') + (match[2] || ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { price: amount.toFixed(2), priceCurrency: 'USD' };
}

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/apple-touch-icon.png')
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': ORGANIZATION_ID }
  };
}

// items: [[name, path], ...] in page order; the last one is the page itself.
export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: absoluteUrl(path)
    }))
  };
}

const SERVICE_TYPES = { yacht: 'Yacht charter', car: 'Car rental', experience: 'Experience' };
const present = (value) => value !== undefined && value !== null && value !== '';
const compact = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => present(value)));
const offer = (price, url) => (price ? { '@type': 'Offer', ...price, url } : undefined);

// Structured data for one listing. Only what the page itself shows goes in:
// no ratings, and a price only when the page shows an exact amount.
// kind: yacht | car | stay | venue | experience | deal | sportsbook
export function listingJsonLd(kind, item, path) {
  const url = absoluteUrl(path);
  const base = { '@context': 'https://schema.org', url };
  const image = item.image ? absoluteUrl(item.image) : undefined;

  if (kind === 'yacht' || kind === 'car' || kind === 'experience') {
    const price = numericPrice(kind === 'car' ? item.dailyPrice : item.price);
    return compact({
      ...base,
      '@type': 'Service',
      serviceType: SERVICE_TYPES[kind],
      name: item.title,
      description: item.description,
      image,
      areaServed: item.location,
      provider: { '@id': ORGANIZATION_ID },
      offers: offer(price, url)
    });
  }
  if (kind === 'stay') {
    return compact({
      ...base,
      '@type': 'Accommodation',
      name: item.title,
      description: item.description,
      image,
      numberOfBedrooms: Number.isFinite(Number(item.bedrooms)) && Number(item.bedrooms) > 0 ? Number(item.bedrooms) : undefined,
      address: item.location ? { '@type': 'PostalAddress', addressLocality: item.location } : undefined
    });
  }
  if (kind === 'venue') {
    return compact({
      ...base,
      '@type': item.category === 'restaurant' ? 'Restaurant' : 'NightClub',
      name: item.name,
      description: item.description,
      image,
      address: item.location ? { '@type': 'PostalAddress', addressLocality: item.location } : undefined
    });
  }
  if (kind === 'deal') {
    return compact({
      ...base,
      '@type': 'Offer',
      name: `${item.discount} at ${item.name}`,
      category: item.category,
      validThrough: /^\d{4}-\d{2}-\d{2}$/.test(item.expirationDate || '') ? item.expirationDate : undefined,
      seller: { '@type': 'Organization', name: item.name }
    });
  }
  if (kind === 'sportsbook') {
    return compact({
      ...base,
      '@type': 'Organization',
      name: item.name,
      description: item.description,
      sameAs: /^https:\/\//.test(item.website || '') ? item.website : undefined
    });
  }
  throw new Error(`Unknown listing kind: ${kind}`);
}

// Safe to place inside a <script> element: "<" never appears literally.
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// --- Sitemap ---------------------------------------------------------------

const SECTION_ROUTES = [
  '/yachts', '/rentals', '/vacation-rentals', '/restaurants-nightlife', '/experiences',
  '/stores', '/events', '/sportsbook', '/travel', '/travel/ovago', '/entertainment/adrenaline-365', '/discovery'
];
const LANDING_ROUTES = [
  '/best-shopping-deals', '/nike-coupons', '/amazon-promo-codes', '/fashion-discounts', '/sports-betting-promos',
  '/draftkings-promos', '/fanduel-promos', '/betmgm-promos', '/caesars-sportsbook-promos'
];
const LEGAL_ROUTES = ['/privacy', '/terms', '/cookie-policy', '/affiliate-disclosure', '/partner-agreement'];

export const LISTING_ROUTES = {
  yachts: '/yachts',
  rentals: '/rentals',
  stays: '/vacation-rentals',
  venues: '/restaurants-nightlife',
  experiences: '/experiences'
};

// Every public address on the site. The caller passes the same inventory the
// pages read, so the sitemap never lists a page that would not open.
export function sitemapEntries({
  yachts = [], rentals = [], stays = [], venues = [], experiences = [],
  sportsbooks = [], deals = [], storeCategories = [],
  eventGroups = [], eventCategories = [], leagues = [], events = []
} = {}) {
  const seen = new Set();
  const entries = [];
  const add = (path, changeFrequency, priority) => {
    if (seen.has(path)) return;
    seen.add(path);
    entries.push({ url: absoluteUrl(path), changeFrequency, priority });
  };
  const slugs = (items) => items.map((item) => item?.slug).filter((slug) => typeof slug === 'string' && slug);

  add('', 'daily', 1);
  for (const route of SECTION_ROUTES) add(route, 'daily', 0.9);
  for (const [key, route] of Object.entries(LISTING_ROUTES)) {
    for (const slug of slugs({ yachts, rentals, stays, venues, experiences }[key])) add(`${route}/${slug}`, 'weekly', 0.8);
  }
  for (const slug of slugs(storeCategories)) add(`/stores/${slug}`, 'weekly', 0.7);
  for (const slug of slugs(deals)) add(`/deals/${slug}`, 'weekly', 0.6);
  for (const slug of slugs(sportsbooks)) add(`/sportsbook/${slug}`, 'weekly', 0.6);
  for (const slug of slugs([...eventGroups, ...eventCategories])) add(`/events/category/${slug}`, 'daily', 0.7);
  for (const slug of slugs(leagues)) add(`/events/league/${slug}`, 'weekly', 0.6);
  for (const slug of slugs(events)) add(`/events/${slug}`, 'daily', 0.8);
  for (const route of LANDING_ROUTES) add(route, 'weekly', 0.5);
  for (const route of LEGAL_ROUTES) add(route, 'yearly', 0.3);
  return entries;
}
