// Verified in CJ Promotional Properties and the official TicketNetwork widget
// builder on 2026-10-20. PID is the website ID, not the CJ account/CID.
// https://www.ticketnetwork.com/en/affiliate-plugin
export const TICKETNETWORK_PID = '101825540';
const CJ_WIDGET_LINK = `https://www.tkqlhce.com/click-${TICKETNETWORK_PID}-10793961`;
const SPORTS = '.1859.1988.';
const CONCERTS = '.1859.1986.';
const THEATER = '.1859.1989.';

const CATALOGUES = {
  sports: { label: 'Sport tickets', path: SPORTS, group: 'sports', sid: 'GorgonaSports' },
  concerts: { label: 'Concert tickets', path: CONCERTS, group: 'concerts', sid: 'GorgonaConcerts' },
  nfl: { label: 'NFL', group: 'sports', path: `${SPORTS}1879.1959.` },
  nhl: { label: 'NHL', group: 'sports', path: `${SPORTS}1883.1972.` },
  nba: { label: 'NBA', group: 'sports', path: `${SPORTS}1865.1971.` },
  mlb: { label: 'MLB', group: 'sports', path: `${SPORTS}1864.1969.` },
  mls: { label: 'MLS', group: 'sports', path: `${SPORTS}1913.1970.` },
  ufc: { label: 'UFC', group: 'sports', path: `${SPORTS}2027.2056.` },
  boxing: { label: 'Boxing', group: 'sports', path: `${SPORTS}1867.` },
  'formula-1': { label: 'Formula 1', group: 'sports', path: `${SPORTS}1905.1925.`, query: 'Formula 1' },
  nascar: { label: 'NASCAR', group: 'sports', path: `${SPORTS}1905.2091.` },
  tennis: { label: 'Tennis', group: 'sports', path: `${SPORTS}1916.` },
  golf: { label: 'Golf', group: 'sports', path: `${SPORTS}1880.` },
  'other-leagues': { label: 'All sports', group: 'sports', path: SPORTS },
  'pop-rock': { label: 'Pop & Rock', group: 'concerts', path: `${CONCERTS}1903.` },
  'hip-hop-rnb': { label: 'Hip-Hop & R&B', group: 'concerts', paths: [`${CONCERTS}1906.`, `${CONCERTS}1904.`] },
  'jazz-blues': { label: 'Jazz & Blues', group: 'concerts', path: `${CONCERTS}1885.` },
  'electronic-edm': { label: 'Electronic / EDM', group: 'concerts', path: `${CONCERTS}1915.` },
  'classical-opera': { label: 'Classical & Opera', group: 'concerts', paths: [`${CONCERTS}1871.`, `${THEATER}1898.`] },
  country: { label: 'Country', group: 'concerts', path: `${CONCERTS}1873.` },
  'comedy-standup': { label: 'Comedy & Stand-up', group: 'concerts', path: `${CONCERTS}1872.` },
  'theater-broadway': { label: 'Theater & Broadway', group: 'concerts', path: THEATER, marketplace: 'theater' },
  festivals: { label: 'Festivals', group: 'concerts', paths: [`${CONCERTS}1877.`, `${THEATER}2065.`] },
  'other-live': { label: 'All live shows', group: 'concerts', paths: [CONCERTS, THEATER] }
};

export function getTicketNetworkCatalogue(category) {
  if (!Object.hasOwn(CATALOGUES, category)) return null;
  const catalogue = CATALOGUES[category];
  return {
    ...catalogue,
    category,
    paths: catalogue.paths ? [...catalogue.paths] : [catalogue.path],
    sid: catalogue.sid || `Gorgona${category.replace(/-/g, '')}`,
    marketplace: catalogue.marketplace || catalogue.group
  };
}

// Keep the complete CJ redirect and encode the destination as one parameter.
// Arbitrary destinations must never turn this into an open redirect.
export function buildTicketNetworkUrl(destination = 'https://www.ticketnetwork.com/', sid = 'GorgonaEvents') {
  const target = new URL(destination);
  if (target.protocol !== 'https:' || target.hostname !== 'www.ticketnetwork.com' || target.username || target.password || target.port) {
    throw new Error('Unsupported TicketNetwork destination');
  }
  if (!/^[A-Za-z0-9]{1,100}$/.test(sid)) throw new Error('Invalid TicketNetwork SID');
  const link = new URL(CJ_WIDGET_LINK);
  link.searchParams.set('sid', sid);
  link.searchParams.set('url', target.href);
  return link.href;
}

export function getTicketNetworkFallback(category) {
  const catalogue = getTicketNetworkCatalogue(category);
  return catalogue
    ? buildTicketNetworkUrl(`https://www.ticketnetwork.com/category/${catalogue.marketplace}`, catalogue.sid)
    : buildTicketNetworkUrl();
}
