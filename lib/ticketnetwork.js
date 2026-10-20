// Verified in CJ Promotional Properties and the official TicketNetwork widget
// builder on 2026-10-20. PID is the website ID, not the CJ account/CID.
// https://www.ticketnetwork.com/en/affiliate-plugin
export const TICKETNETWORK_PID = '101825540';
const CJ_WIDGET_LINK = `https://www.tkqlhce.com/click-${TICKETNETWORK_PID}-10793961`;

const CATALOGUES = {
  sports: { label: 'Sport tickets', path: '.1859.1988.', sid: 'GorgonaSports' },
  concerts: { label: 'Concert tickets', path: '.1859.1986.', sid: 'GorgonaConcerts' }
};

export function getTicketNetworkCatalogue(category) {
  if (!Object.hasOwn(CATALOGUES, category)) return null;
  return { ...CATALOGUES[category], category };
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
    ? buildTicketNetworkUrl(`https://www.ticketnetwork.com/category/${category}`, catalogue.sid)
    : buildTicketNetworkUrl();
}
