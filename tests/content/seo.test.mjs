// node --test tests/content/seo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  SITE_URL, DEFAULT_IMAGE, GOOGLE_PLAY_URL, HOME_SEO_HEADING, LEGAL_ROUTES, PRIVATE_ROUTES, SECTION_ROUTES, SEO_HEADINGS, SITEMAP_LASTMOD, SUPPORT_EMAIL,
  attractionJsonLd, breadcrumbJsonLd, carJsonLd, clip, dailyPriceNumber, eventJsonLd, experienceSearchText, faqJsonLd, homeSeoHeading, itemListJsonLd,
  mobileAppJsonLd, organizationJsonLd, pageMetadata, rentalSearchText, sectionFaqJsonLd, sectionJsonLd, seoHeading, serializeJsonLd, sitemapEntries,
  vehicleJsonLd, venueJsonLd, venueSearchDescription, websiteJsonLd, withBrand
} from '../../lib/seo.mjs';
import { HEADOUT_COLLECTIONS } from '../../lib/headoutCatalog.mjs';
import { getRentals } from '../../lib/rentalsData.js';
import { getVenueAudit } from '../../lib/restaurantsNightlifeData.js';

const source = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../../${path}`, import.meta.url));

test('pages without their own metadata name themselves as canonical, not the home page', () => {
  const layout = source('app/layout.js');
  assert.match(layout, /alternates: \{ canonical: '\.\/' \}/);
  assert.doesNotMatch(layout, /canonical: baseUrl/);
  // One address per page for every language: no hreflang pointing at a single URL.
  assert.doesNotMatch(layout, /languages:|HREFLANG/);
  assert.match(layout, /url: '\.\/'/, 'the share card must not point every page at the home page');
});

test('share card is a raster image search engines and messengers can show', () => {
  assert.equal(DEFAULT_IMAGE.url, '/miami-elio-turquoise-wave.jpg');
  const jpeg = readFileSync(new URL(`../../public${DEFAULT_IMAGE.url}`, import.meta.url));
  assert.deepEqual([...jpeg.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.deepEqual([...jpeg.subarray(-2)], [0xff, 0xd9]);
  assert.equal(DEFAULT_IMAGE.width, 1200);
  assert.equal(DEFAULT_IMAGE.height, 630);
  for (const icon of ['public/favicon-32.png', 'public/apple-touch-icon.png']) assert.ok(exists(icon), icon);
});

test('page metadata carries title, description, canonical and share card', () => {
  const meta = pageMetadata({ title: 'Villas in Miami.', description: 'x '.repeat(120), path: '/vacation-rentals' });
  assert.equal(meta.title, 'Villas in Miami | MIAMI ELIO');
  assert.ok(meta.description.length <= 160);
  assert.equal(meta.alternates.canonical, '/vacation-rentals');
  assert.ok(!('languages' in meta.alternates));
  assert.equal(meta.openGraph.url, '/vacation-rentals');
  assert.deepEqual(meta.openGraph.images, [DEFAULT_IMAGE]);
  assert.deepEqual(meta.twitter.images, [DEFAULT_IMAGE.url]);
  const withImage = pageMetadata({ title: 'Urus', path: '/rentals/urus', image: '/cars/urus.jpg' });
  assert.ok(!('description' in withImage), 'an empty description must not hide the site description');
  assert.deepEqual(withImage.twitter.images, ['/cars/urus.jpg']);
  assert.equal(clip('word '.repeat(50), 40).length <= 40, true);
});

test('sign-in, account and admin screens are noindex, not robots-blocked', () => {
  for (const route of PRIVATE_ROUTES) {
    const layout = source(`app${route}/layout.js`);
    assert.match(layout, /export const metadata = PRIVATE_METADATA/, route);
  }
  const robots = source('app/robots.js');
  for (const route of ['/login', '/register', '/profile', '/account']) assert.ok(!robots.includes(`'${route}'`), `${route} would hide its noindex`);
});

test('section, legal and listing pages declare their own titles', () => {
  for (const route of LEGAL_ROUTES) assert.match(source(`app${route}/layout.js`), new RegExp(`path: '${route}'`), route);
  for (const route of ['/rentals', '/restaurants-nightlife', '/vacation-rentals']) assert.match(source(`app${route}/page.js`), new RegExp(`path: '${route}'`), route);
  for (const [file, path] of [
    ['app/restaurants-nightlife/[slug]/page.js', '/restaurants-nightlife/${venue.slug}'],
    ['app/events/league/[league]/page.js', '/events/league/${league.slug}'],
    ['app/events/category/[category]/page.js', '/events/category/${entry.slug}']
  ]) {
    const page = source(file);
    assert.match(page, /export async function generateMetadata\(/, file);
    assert.ok(page.includes(path), `${file} canonical`);
  }
});

test('the sitemap includes the yachts section once and excludes yacht details and private pages', () => {
  const entries = sitemapEntries({ rentals: ['urus', 'urus'], stays: ['villa-a'], venues: ['komodo'], events: [undefined], eventCategories: ['nba'] });
  const paths = entries.map((entry) => entry.url.slice(SITE_URL.length));
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(paths.filter((path) => path === '/yachts').length, 1);
  for (const path of [...SECTION_ROUTES, ...LEGAL_ROUTES, '/rentals/urus', '/vacation-rentals/villa-a', '/restaurants-nightlife/komodo', '/events/category/nba']) assert.ok(paths.includes(path), path);
  assert.ok(!paths.some((path) => path.includes('undefined')));
  assert.ok(!paths.some((path) => path.startsWith('/yachts/')), 'yacht detail address listed');
  assert.ok(!paths.some((path) => /^\/(admin|login|register|profile|account|api)(\/|$)/.test(path)), 'private address listed');
  for (const path of [...SECTION_ROUTES, ...LEGAL_ROUTES]) assert.ok(exists(`app${path}/page.js`), `no page for ${path || '/'}`);
});

test('home page carries organization and website structured data', () => {
  const home = source('app/page.js');
  assert.match(home, /<JsonLd data=\{\[organizationJsonLd\(\), websiteJsonLd\(\)\]\} \/>/);
  const script = serializeJsonLd({ name: '</script>' });
  assert.ok(!script.includes('<') && JSON.parse(script).name === '</script>');
});

test('the organization describes the business and lists only contact details that exist', () => {
  const org = organizationJsonLd();
  assert.match(org.description, /16-language ELIO\+ Guide/);
  assert.doesNotMatch(org.description, /real estate|retail/i);
  assert.equal(org.contactPoint.email, SUPPORT_EMAIL);
  assert.equal(org.contactPoint.telephone, '+1-786-492-8880');
  assert.equal(org.telephone, '+1-786-492-8880');
  assert.deepEqual(org.sameAs, ['https://t.me/MIAMI_ELIO', 'https://wa.me/message/VO7GCPZCDKRZO1', GOOGLE_PLAY_URL]);
  assert.match(source('app/privacy/page.js'), new RegExp(`CONTACT = '${SUPPORT_EMAIL}'`), 'the privacy page names the same address');
});

test('titles and descriptions on the section pages use the approved search wording', () => {
  const expected = {
    'app/page.js': ['Miami Yachts, Villas, Car Rentals & Events | Miami Elio', 'Miami Elio: Yachts, Villas, Exotic Cars, Events & ELIO+ Guide'],
    'app/yachts/page.js': ['Miami Yacht Charters & Luxury Boat Rentals | Miami Elio'],
    'app/private-jets/page.js': ['Private Jet Charter Miami — On-Demand Flights | Miami Elio'],
    'app/experiences/page.js': ['Things to Do in Miami: Tours & Experiences | Miami Elio'],
    'app/exclusive-destinations/page.js': ['Exclusive Luxury Destinations & VIP Travel'],
    'app/events/page.js': ['Miami Concerts, Sports & VIP Event Tickets | Miami Elio']
  };
  for (const [file, strings] of Object.entries(expected)) for (const text of strings) assert.ok(source(file).includes(text), `${file}: ${text}`);
  const exclusive = pageMetadata({ title: 'Exclusive Luxury Destinations & VIP Travel', fullTitle: withBrand('Exclusive Luxury Destinations & VIP Travel'), path: '/exclusive-destinations' });
  assert.equal(exclusive.title, 'Exclusive Luxury Destinations & VIP Travel | Miami Elio');
  assert.equal(exclusive.openGraph.title, 'Exclusive Luxury Destinations & VIP Travel', 'the share card keeps the plain name');
  // A page's own openGraph replaces the layout's, so the home page repeats the image and site name.
  assert.match(source('app/page.js'), /openGraph: \{[^}]*siteName: 'MIAMI ELIO'[^}]*images: \[DEFAULT_IMAGE\]/);
});

test('English search headings replace only the English heading', () => {
  assert.equal(seoHeading('en', 'yachts', 'Yates en Miami.'), 'Miami Yacht Charters');
  assert.equal(seoHeading('es', 'yachts', 'Yates en Miami.'), 'Yates en Miami.');
  assert.deepEqual(Object.keys(SEO_HEADINGS).sort(), ['exclusive', 'experiences', 'privateJets', 'yachts']);
  for (const [file, key] of [['app/yachts/YachtContent.jsx', 'yachts'], ['app/private-jets/PrivateJetsContent.jsx', 'privateJets'], ['app/experiences/ExperiencesContent.jsx', 'experiences'], ['app/experiences/ExperiencesContent.jsx', 'exclusive']]) {
    assert.match(source(file), new RegExp(`seoHeading\\(locale,'${key}'`), `${file} uses the ${key} heading`);
  }
});

test('the events heading reads as one sentence in plain text and keeps its translation key', () => {
  const page = source('app/events/page.js');
  assert.match(page, /break: <>\{' '\}<br \/><\/>/, 'a space before the line break');
  assert.match(page, /source="Experience the\{break\}\{highlight\}"/, 'the saved translations are keyed by this text');
});

test('car pages show a daily price in the title only when the catalogue has one', () => {
  assert.equal(dailyPriceNumber('$1,200'), 1200);
  assert.equal(dailyPriceNumber('From $500/day'), 500);
  for (const value of ['On request', '', '$0', 'abc', null, undefined, NaN, -5]) assert.equal(dailyPriceNumber(value), null, String(value));
  const priced = rentalSearchText({ title: 'Lamborghini Urus SE', dailyPrice: '$1,500' });
  assert.equal(priced.title, 'Lamborghini Urus SE Rental Miami — From $1,500/Day | Miami Elio');
  const onRequest = rentalSearchText({ title: 'Lamborghini Urus SE', dailyPrice: 'On request' });
  assert.equal(onRequest.title, 'Lamborghini Urus SE Rental in Miami | Miami Elio');
  for (const text of [priced, onRequest]) {
    assert.equal(text.title.split('| Miami Elio').length, 2, 'the brand closes the title once');
    assert.equal(text.description, 'Rent the Lamborghini Urus SE in Miami with Miami Elio. Flexible daily rates, delivery across Miami Beach & Brickell, and 24/7 ELIO+ Guide support. Book now.');
  }
  const long = rentalSearchText({ title: '2024 Lamborghini Huracan Evo Spyder Performante', dailyPrice: '$1,100' });
  assert.ok(long.description.length <= 160 && !long.description.endsWith('Book now.'), 'the closing call to action goes before a name is cut');
});

test('experience pages say "in Miami" only for Miami collections and keep naming Headout', () => {
  assert.equal(experienceSearchText({ title: 'Everglades', region: 'miami' }).title, 'Everglades Tickets & Tours in Miami | Miami Elio');
  assert.equal(experienceSearchText({ title: 'Zoo Miami', region: 'miami' }).title, 'Zoo Miami Tickets & Tours | Miami Elio');
  assert.equal(experienceSearchText({ title: 'Miami Boat Tours', region: 'miami' }).title, 'Miami Boat Tours | Miami Elio');
  assert.equal(experienceSearchText({ title: 'Universal Studios Orlando', region: 'orlando' }).title, 'Universal Studios Orlando Tickets & Tours | Miami Elio');
  assert.equal(experienceSearchText({ title: 'Everglades', region: 'miami' }).description, 'Book Everglades tickets in Miami. Check schedules, highlights and booking options on Headout through Miami Elio.');
  for (const item of HEADOUT_COLLECTIONS) {
    const text = experienceSearchText(item);
    assert.ok(text.title.endsWith(' | Miami Elio') && text.title.split('| Miami Elio').length === 2, item.slug);
    assert.ok(text.description.length <= 160 && text.description.includes('Headout') && text.description.includes(item.title), item.slug);
    if (item.region !== 'miami') assert.ok(!/ in Miami \|/.test(text.title) && !text.description.includes('in Miami.'), `${item.slug} is not in Miami`);
  }
});

test('every sitemap address carries a valid lastmod', () => {
  const entries = sitemapEntries({ rentals: ['urus', { slug: 'dated', lastModified: '2026-11-01' }, { slug: 'bad', lastModified: 'soon' }], experiences: ['zoo'] });
  assert.ok(entries.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.lastModified)));
  assert.equal(entries.find((item) => item.url.endsWith('/rentals/dated')).lastModified, '2026-11-01');
  assert.equal(entries.find((item) => item.url.endsWith('/rentals/bad')).lastModified, SITEMAP_LASTMOD);
  assert.equal(entries.find((item) => item.url.endsWith('/rentals/urus')).lastModified, SITEMAP_LASTMOD);
  assert.ok(entries.some((item) => item.url.endsWith('/experiences/zoo')));
});

test('llms.txt names the brand, the offer and every main section', () => {
  const llms = source('public/llms.txt');
  assert.match(llms, /^# Miami Elio/m);
  assert.match(llms, /Miami Elio, by Gorgona One/);
  assert.doesNotMatch(llms, /Gorgona\s*1\b/);
  for (const path of ['/yachts', '/rentals', '/vacation-rentals', '/private-jets', '/experiences', '/events', '/restaurants-nightlife', '/exclusive-destinations']) assert.ok(llms.includes(`(${SITE_URL}${path})`), path);
});

test('the home and exclusive descriptions are short, honest and free of repeated words', () => {
  const home = /description: '([^']+)'/.exec(source('app/page.js'))[1];
  assert.ok(home.length <= 155, `home description is ${home.length} characters`);
  assert.doesNotMatch(home, /instant/i, 'booking goes through the concierge');
  assert.match(home, /Miami/);
  const exclusive = /description: '([^']+)'/.exec(source('app/exclusive-destinations/page.js'))[1];
  assert.equal(exclusive.match(/curated/gi).length, 1, 'curated appears once');
});

test('a car with a daily price becomes a Product with an Offer; one without gets none', () => {
  const car = { slug: 'urus', title: 'Lamborghini Urus SE.', description: '  Fast   SUV. ', image: '/images/urus.webp', category: 'SUV', dailyPrice: '$1,500' };
  const product = carJsonLd(car);
  assert.equal(product['@type'], 'Product');
  assert.equal(product.name, 'Lamborghini Urus SE');
  assert.equal(product.description, 'Fast SUV.');
  assert.equal(product.image, `${SITE_URL}/images/urus.webp`);
  assert.deepEqual([product.offers.price, product.offers.priceCurrency, product.offers.url], [1500, 'USD', `${SITE_URL}/rentals/urus`]);
  assert.equal(carJsonLd({ ...car, dailyPrice: 'On request' }), null);
  assert.equal(carJsonLd({ ...car, slug: '' }), null);
  for (const entry of getRentals()) {
    const markup = carJsonLd(entry);
    assert.equal(markup === null, dailyPriceNumber(entry.dailyPrice) === null, entry.slug);
    if (markup) assert.ok(/^https:\/\//.test(markup.image) && markup.description && markup.offers.price > 0, entry.slug);
  }
});

test('breadcrumbs list the section and the page, and need at least two steps', () => {
  const trail = breadcrumbJsonLd([{ name: 'Cars', path: '/rentals' }, { name: 'Urus', path: '/rentals/urus' }]);
  assert.deepEqual(trail.itemListElement.map((step) => [step.position, step.name, step.item]), [[1, 'Cars', `${SITE_URL}/rentals`], [2, 'Urus', `${SITE_URL}/rentals/urus`]]);
  assert.equal(breadcrumbJsonLd([{ name: 'Cars', path: '/rentals' }]), null);
  assert.equal(breadcrumbJsonLd([{ name: '', path: '/a' }, { name: 'B', path: '/b' }]), null);
});

test('an event needs a name, venue, city and a real date; the time is kept as local time', () => {
  const event = { slug: 'heat', name: 'Heat game', venue: 'Arena', city: 'Miami', state: 'FL', country: 'US', date: '2026-12-05', time: '19:30', description: 'Game.' };
  const markup = eventJsonLd(event);
  assert.equal(markup.startDate, '2026-12-05T19:30');
  assert.equal(markup.location.address.addressLocality, 'Miami');
  assert.ok(!('offers' in markup), 'the price range is free text, so no offer is invented');
  assert.equal(eventJsonLd({ ...event, time: undefined }).startDate, '2026-12-05');
  for (const broken of [{ date: 'soon' }, { date: undefined }, { venue: '' }, { city: '' }, { name: '' }]) assert.equal(eventJsonLd({ ...event, ...broken }), null, JSON.stringify(broken));
});

test('only verified venues get business markup, with the address split into parts', () => {
  const venue = { slug: 'komodo', name: 'Komodo', category: 'restaurant', status: 'verified', address: '801 Brickell Avenue, Miami, FL 33131', cuisine: 'Asian', website: 'https://komodomiami.com/', image: '/images/dining/komodo.jpg' };
  const markup = venueJsonLd(venue);
  assert.equal(markup['@type'], 'Restaurant');
  assert.deepEqual(markup.address, { '@type': 'PostalAddress', streetAddress: '801 Brickell Avenue', addressLocality: 'Miami', addressRegion: 'FL', postalCode: '33131', addressCountry: 'US' });
  assert.equal(markup.servesCuisine, 'Asian');
  assert.deepEqual(markup.sameAs, ['https://komodomiami.com/']);
  const club = venueJsonLd({ ...venue, category: 'nightlife' });
  assert.equal(club['@type'], 'LocalBusiness');
  assert.ok(!('servesCuisine' in club));
  assert.equal(venueJsonLd({ ...venue, status: 'held' }), null);
  assert.equal(venueJsonLd({ ...venue, address: 'Somewhere in Miami' }).address, 'Somewhere in Miami');
  for (const entry of getVenueAudit()) assert.equal(venueJsonLd(entry) === null, entry.status !== 'verified', entry.slug);
});

test('attractions are places only, not flights, passes, ferries or tours', () => {
  const find = (slug) => HEADOUT_COLLECTIONS.find((item) => item.slug === slug);
  assert.equal(attractionJsonLd(find('zoo-miami'))['@type'], 'TouristAttraction');
  assert.equal(attractionJsonLd(find('zoo-miami')).url, `${SITE_URL}/experiences/zoo-miami`);
  for (const slug of ['grand-canyon-helicopter-tours', 'bimini-ferry', 'orlando-city-cards-passes', 'best-miami-water-activities-upto-20-off-headout']) assert.equal(attractionJsonLd(find(slug)), null, slug);
  for (const item of HEADOUT_COLLECTIONS) {
    const markup = attractionJsonLd(item);
    if (markup) assert.deepEqual(JSON.parse(serializeJsonLd(markup)), markup, item.slug);
  }
});

test('detail pages render their structured data inside the page', () => {
  for (const [file, builders] of [
    ['app/rentals/[slug]/page.js', ['breadcrumbJsonLd', 'carJsonLd']],
    ['app/experiences/[slug]/page.js', ['breadcrumbJsonLd', 'attractionJsonLd']],
    ['app/restaurants-nightlife/[slug]/page.js', ['breadcrumbJsonLd', 'venueJsonLd']],
    ['app/events/[slug]/page.js', ['breadcrumbJsonLd', 'eventJsonLd']]
  ]) {
    const page = source(file);
    assert.match(page, /import JsonLd from '\.\.\/\.\.\/components\/JsonLd'/, file);
    assert.match(page, /<JsonLd data=\{\[/, file);
    for (const builder of builders) assert.ok(page.includes(`${builder}(`), `${file} calls ${builder}`);
  }
});

test('decorative home page images are hidden from assistive technology', () => {
  for (const file of ['app/HomePage.jsx', 'app/components/home/HeroShowcase.jsx', 'app/components/home/HomeHero.jsx', 'app/components/home/HomeSectionRail.jsx', 'app/components/home/TicketCarousel.jsx']) {
    const html = source(file);
    const emptyAlt = html.match(/alt=""/g) || [];
    assert.ok(emptyAlt.length > 0, file);
    assert.equal((html.match(/alt=""\s+aria-hidden="true"/g) || []).length, emptyAlt.length, `${file}: every empty alt is also aria-hidden`);
  }
});

test('Wave 11: sectionJsonLd, 16-language organization schema, venue priceRange/telephone, forgot-password noindex and llms-full.txt', () => {
  const org = organizationJsonLd();
  assert.equal(Array.isArray(org.knowsLanguage) && org.knowsLanguage.length, 16);

  const sec = sectionJsonLd({ name: 'Miami Yacht Charters', description: 'Charter luxury yachts in Miami.', path: '/yachts' });
  assert.equal(sec.length, 2);
  assert.equal(sec[0]['@type'], 'CollectionPage');
  assert.equal(sec[0].url, `${SITE_URL}/yachts`);
  assert.equal(sec[1]['@type'], 'BreadcrumbList');

  const venue = venueJsonLd({
    slug: 'lpm-miami',
    name: 'LPM Restaurant & Bar',
    category: 'restaurant',
    status: 'verified',
    address: '1300 Brickell Bay Drive, Miami, FL 33131',
    cuisine: 'French Mediterranean',
    price: '$$$$',
    phone: '(305) 403-9133',
    website: 'https://lpmrestaurants.com/miami/'
  });
  assert.equal(venue.priceRange, '$$$$');
  assert.equal(venue.telephone, '(305) 403-9133');

  assert.match(source('app/forgot-password/layout.js'), /export const metadata = PRIVATE_METADATA/);
  assert.match(source('app/ai-ready/page.js'), /permanentRedirect\('\/discovery'\)/);
  assert.doesNotMatch(source('app/layout.js'), /shopping/i);
  assert.doesNotMatch(source('app/manifest.js'), /shopping/i);
  assert.match(source('public/ai.webmanifest'), /"start_url": "\/discovery"/);

  const llmsFull = source('public/llms-full.txt');
  assert.match(llmsFull, /# Miami Elio — Full AI & LLM Reference/);
  assert.match(llmsFull, /Komodo/);
  assert.match(llmsFull, /Brickell/);
});

test('PR #141: favicon.ico, /partner noindex, /concierge 308, unique rental/venue SEO, ocean-gold /travel and clean brand footer', () => {
  assert.ok(exists('public/favicon.ico'), 'public/favicon.ico must exist');
  const ico = readFileSync(new URL('../../public/favicon.ico', import.meta.url));
  assert.deepEqual([...ico.subarray(0, 6)], [0, 0, 1, 0, 1, 0], 'valid single-icon ICO header');

  assert.ok(PRIVATE_ROUTES.includes('/partner') && !LEGAL_ROUTES.includes('/partner'), '/partner is private');
  assert.match(source('app/partner/layout.js'), /export const metadata = PRIVATE_METADATA/);
  assert.match(source('app/concierge/page.js'), /permanentRedirect\('\/discovery'\)/);
  assert.doesNotMatch(source('app/exclusive-destinations/page.js'), /concierge/i);
  assert.doesNotMatch(source('app/privacy/layout.js'), /concierge/i);

  const cars = getRentals();
  const rentalTitles = cars.map((c) => rentalSearchText(c).title);
  const rentalDescs = cars.map((c) => rentalSearchText(c).description);
  assert.equal(new Set(rentalTitles).size, cars.length, 'every /rentals/[slug] page has a unique title');
  assert.equal(new Set(rentalDescs).size, cars.length, 'every /rentals/[slug] page has a unique description');
  assert.match(source('app/rentals/[slug]/page.js'), /twitter:\s*\{/);

  const venues = getVenueAudit();
  const venueDescs = venues.map((v) => venueSearchDescription(v));
  assert.equal(new Set(venueDescs).size, venues.length, 'every venue detail page has a unique description');
  assert.ok(venueDescs.every((d) => d.length >= 65 && d.length <= 160), 'venue descriptions stay within SEO bounds');
  assert.match(source('app/restaurants-nightlife/[slug]/page.js'), /image:\s*venue\.image/);

  const travel = source('app/travel/page.js');
  assert.match(travel, /pageMetadata\(/);
  assert.match(travel, /\/images\/travel\/hero-miami-dusk\.webp/);
  assert.doesNotMatch(travel, /images\.unsplash\.com|travel-violet|travel-lavender|travel-void|175,80,255/);

  const i18n = source('lib/i18n.js');
  assert.doesNotMatch(i18n, /affiliate-ready monetization/i);
  assert.doesNotMatch(i18n, /concierge: 'كونسيرج'/);
});

test('PR #143: Header drops framer-motion, /events above-the-fold local hero, full OG on experiences & leagues, SearchAction & clean brand', () => {
  assert.doesNotMatch(source('app/components/Header.jsx'), /framer-motion/);
  assert.doesNotMatch(source('app/components/LanguageSwitcher.jsx'), /active\.flag|language\.flag/);

  const events = source('app/events/page.js');
  assert.match(events, /pageMetadata\(/);
  assert.match(events, /\/images\/events\/concerts-pass\.jpg/);
  assert.doesNotMatch(events, /images\.unsplash\.com|min-h-\[92svh\]|bg-travel-void/);

  assert.match(source('app/experiences/page.js'), /pageMetadata\(/);
  assert.match(source('app/experiences/[slug]/page.js'), /pageMetadata\(/);
  assert.match(source('app/experiences/viator/[code]/page.js'), /pageMetadata\(/);
  assert.match(source('app/events/league/[league]/page.js'), /sectionJsonLd\(/);

  const site = websiteJsonLd();
  assert.equal(site.potentialAction['@type'], 'SearchAction');
  assert.match(site.potentialAction.target.urlTemplate, /\/discovery\?q=\{search_term_string\}/);
  assert.equal(organizationJsonLd().address.addressLocality, 'Miami');

  assert.equal(exists('app/opengraph-image.alt.txt'), false, 'orphaned opengraph-image.alt.txt must be removed');
  assert.doesNotMatch(source('public/sms-alerts.html'), /concierge/i);
  assert.doesNotMatch(source('public/sms-alerts.html'), /ALEXEY AAA|250 174/i);
});

test('P0 GEO / AI Visibility: robots opens /api/mcp for AI bots, rich Organization/MobileApp/FAQ/Car/ItemList schemas, Link headers, and upgraded llms.txt', () => {
  const robotsSrc = source('app/robots.js');
  assert.match(robotsSrc, /OAI-SearchBot/);
  assert.match(robotsSrc, /GPTBot/);
  assert.match(robotsSrc, /ClaudeBot/);
  assert.match(robotsSrc, /PerplexityBot/);
  assert.match(robotsSrc, /Google-Extended/);
  assert.match(robotsSrc, /allow:\s*\['\/',\s*'\/api\/mcp'\]/);

  const org = organizationJsonLd();
  assert.deepEqual(org['@type'], ['Organization', 'TravelAgency']);
  assert.equal(org.legalName, 'ALEXEY AAA LOGISTICS LLC');
  assert.ok(org.alternateName.includes('Miami Elio') && org.alternateName.includes('Gorgona One'));
  assert.ok(org.sameAs.includes(GOOGLE_PLAY_URL));

  const app = mobileAppJsonLd();
  assert.equal(app['@type'], 'MobileApplication');
  assert.equal(app.url, GOOGLE_PLAY_URL);
  assert.equal(app.inLanguage.length, 16);

  const faq = sectionFaqJsonLd('home');
  assert.equal(faq['@type'], 'FAQPage');
  assert.ok(faq.mainEntity.length >= 3);
  for (const key of ['home', 'rentals', 'yachts', 'villas', 'privateJets', 'dining']) {
    const f = sectionFaqJsonLd(key);
    assert.equal(f['@type'], 'FAQPage', key);
    assert.doesNotMatch(JSON.stringify(f), /\bconcierge\b/i, `${key} FAQ must not use concierge wording`);
  }
  assert.equal(faqJsonLd([]), null);

  const onReqCar = vehicleJsonLd({ slug: 'mercedes-amg-cle-53-cabriolet', title: 'Mercedes-Benz AMG CLE 53 Cabriolet', category: 'Convertibles', image: '/cars/cle.jpg', dailyPrice: 'On request' });
  assert.equal(onReqCar['@type'], 'Car');
  assert.equal(onReqCar.brand.name, 'Mercedes-Benz');
  assert.ok(!('offers' in onReqCar), 'Car schema for On request vehicles does not fabricate a price');

  const list = itemListJsonLd({ name: 'Cars', path: '/rentals', items: [{ name: 'Lamborghini Urus SE', path: '/rentals/lamborghini-urus-se' }] });
  assert.equal(list['@type'], 'ItemList');
  assert.equal(list.itemListElement[0].url, `${SITE_URL}/rentals/lamborghini-urus-se`);

  assert.equal(homeSeoHeading('en', 'fallback'), HOME_SEO_HEADING);
  assert.equal(homeSeoHeading('ru', 'fallback'), 'fallback');

  const layout = source('app/layout.js');
  assert.match(layout, /rel="alternate" type="text\/markdown".*href="\/llms\.txt"/);
  const mw = source('middleware.js');
  assert.match(mw, /<\/llms\.txt>; rel="alternate"; type="text\/markdown"/);
  assert.match(mw, /X-Robots-Tag/);

  const llms = source('public/llms.txt');
  const llmsFull = source('public/llms-full.txt');
  assert.match(llms, /com\.miamielio\.app/);
  assert.match(llmsFull, /PereJets/);
  assert.match(llmsFull, /Group Split-Pay/);
  assert.doesNotMatch(llms, /\bconcierge\b/i);
  assert.doesNotMatch(llmsFull, /\bconcierge\b/i);
});
