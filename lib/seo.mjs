// Search metadata shared by the sitemap, page metadata and structured data.
// Pure functions with no framework imports, so the content tests can run them.

export const SITE_URL = 'https://gorgona-one.com';
export const SITE_NAME = 'MIAMI ELIO';
export const DEFAULT_IMAGE = { url: '/og-image.png', width: 1200, height: 630, alt: 'MIAMI ELIO' };

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
// path or a full address.
export function pageMetadata({ title, description, path, image }) {
  const name = headline(title);
  const summary = clip(description);
  const images = [image ? { url: image } : DEFAULT_IMAGE];
  return {
    title: `${name} | ${SITE_NAME}`,
    ...(summary ? { description: summary } : {}),
    alternates: { canonical: path },
    openGraph: { title: name, ...(summary ? { description: summary } : {}), url: path, siteName: SITE_NAME, images, type: 'website' },
    twitter: { card: 'summary_large_image', title: name, ...(summary ? { description: summary } : {}), images: images.map((entry) => entry.url) }
  };
}

// Sign-in, account and admin screens: useful to guests, useless in search.
export const PRIVATE_METADATA = { robots: { index: false, follow: false } };

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/apple-touch-icon.png`
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

// Safe to place inside a <script> element: "<" never appears literally.
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// --- Sitemap ---------------------------------------------------------------
// /yachts is served by a third-party widget and stays out of this file.

export const SECTION_ROUTES = [
  '', '/experiences', '/private-jets', '/events', '/rentals', '/vacation-rentals', '/restaurants-nightlife',
  '/travel', '/travel/ovago', '/entertainment/adrenaline-365', '/discovery'
];
export const LEGAL_ROUTES = ['/privacy', '/terms', '/cookie-policy', '/affiliate-disclosure', '/partner-agreement', '/partner'];
export const PRIVATE_ROUTES = ['/admin', '/login', '/register', '/profile', '/account'];

const entry = (path, changeFrequency, priority) => ({ url: `${SITE_URL}${path}`, changeFrequency, priority });

// inventory: slugs per section, read by app/sitemap.js through the same
// getters the pages use.
export function sitemapEntries({ experiences = [], eventCategories = [], leagues = [], events = [], rentals = [], stays = [], venues = [] } = {}) {
  const list = [
    ...SECTION_ROUTES.map((path) => entry(path, 'weekly', path === '' ? 1 : 0.8)),
    ...experiences.map((slug) => entry(`/experiences/${slug}`, 'weekly', 0.7)),
    ...eventCategories.map((slug) => entry(`/events/category/${slug}`, 'daily', 0.7)),
    ...leagues.map((slug) => entry(`/events/league/${slug}`, 'weekly', 0.6)),
    ...events.map((slug) => entry(`/events/${slug}`, 'daily', 0.7)),
    ...rentals.map((slug) => entry(`/rentals/${slug}`, 'weekly', 0.7)),
    ...stays.map((slug) => entry(`/vacation-rentals/${slug}`, 'weekly', 0.7)),
    ...venues.map((slug) => entry(`/restaurants-nightlife/${slug}`, 'weekly', 0.6)),
    ...LEGAL_ROUTES.map((path) => entry(path, 'yearly', 0.2))
  ];
  const seen = new Set();
  return list.filter(({ url }) => !url.includes('undefined') && !seen.has(url) && seen.add(url));
}
