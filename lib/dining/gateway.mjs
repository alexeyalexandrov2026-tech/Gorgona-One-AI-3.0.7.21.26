/** Versioned, deterministic provider boundary. No partner access is inferred from configuration. */
/** @typedef {'opentable'|'resy'|'sevenrooms'|'tock'|'discotech'|'tablelistpro'|'dice'|'eatwith'|'venue'} ProviderId */
/** @typedef {'DIRECT'|'EMBEDDED'|'REFERRAL'|'CONCIERGE'} BookingMode */
/** @typedef {{version:1,date:string,time:string,guests:number,option:'table'|'vip'|'private'|'guestlist',note:string}} DiningSelection */
export class DiningError extends Error {
  constructor(code, status = 400) { super(code); this.status = status; }
}
export const PROVIDERS = Object.freeze([
  {id:'opentable', name:'OpenTable', docs:'https://docs.opentable.com/', access:'approval_required'},
  {id:'sevenrooms', name:'SevenRooms', docs:'https://api-docs.sevenrooms.com/', access:'approval_required'},
  {id:'discotech', name:'Discotech', docs:'https://discotech.me/miami/', access:'venue_mapping_required'},
  {id:'resy', name:'Resy', docs:'https://resy.com/', access:'public_links'},
  {id:'tock', name:'Tock', docs:'https://www.exploretock.com/', access:'public_links'},
  {id:'tablelistpro', name:'Tablelist', docs:'https://www.tablelistpro.com/developers', access:'venue_authorization_required'},
  {id:'dice', name:'DICE', docs:'https://dice.fm/', access:'public_links'},
  {id:'eatwith', name:'Eatwith', docs:'https://www.eatwith.com/l/affiliations', access:'affiliate_approval_unverified'},
  {id:'venue', name:'Official venue', docs:null, access:'public_links'}
].map(p => Object.freeze({...p, capabilities:Object.freeze({availability:false,create:false,cancel:false,webhooks:false,embedded:false})})));

/** @param {unknown} value @returns {DiningSelection} */
export function selection(value, now = new Date()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DiningError('invalid_selection');
  const {version,date,time,guests,option,note = ''} = value;
  const calendar = typeof date === 'string' ? Date.parse(date + 'T12:00:00Z') : NaN;
  if (version !== 1 || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || (!Number.isFinite(calendar) || new Date(calendar).toISOString().slice(0,10) !== date)
    || typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    || !Number.isInteger(guests) || guests < 1 || guests > 99
    || !['table','vip','private','guestlist'].includes(option)
    || typeof note !== 'string' || note.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(note)) throw new DiningError('invalid_selection');
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  if (date < today || date > String(Number(today.slice(0,4)) + 2) + today.slice(4)) throw new DiningError('invalid_date');
  return {version:1,date,time,guests,option,note:note.trim()};
}

/** HTTPS only. The host must be an exact approved host, never a suffix match. */
export function safeDestination(href, hosts) {
  let url; try { url = new URL(href); } catch { throw new DiningError('invalid_destination'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.includes(url.hostname)) throw new DiningError('invalid_destination');
  return url.href;
}

/** Exact hosts each booking platform serves from. A host here is never a suffix match. */
export const BOOKING_HOSTS = Object.freeze({
  opentable:['www.opentable.com','opentable.com'], resy:['resy.com','www.resy.com'],
  sevenrooms:['www.sevenrooms.com','sevenrooms.com','fp.sevenrooms.com'], tock:['www.exploretock.com','exploretock.com'],
  discotech:['app.discotech.me','discotech.me'], tablelistpro:['www.tablelist.com','tablelist.com','buy.tablelist.com'],
  dice:['dice.fm'], eatwith:['www.eatwith.com','eatwith.com']
});

/** The platform a booking URL belongs to, by its exact host; 'venue' for the venue's own site. */
export function platformForUrl(href, website) {
  let host; try { host = new URL(href).hostname; } catch { return null; }
  const provider = Object.entries(BOOKING_HOSTS).find(([, hosts]) => hosts.includes(host))?.[0];
  if (provider) return provider;
  try { if (website && new URL(website).hostname === host) return 'venue'; } catch {}
  return null;
}

export function channelsFor(venue) {
  if (venue.status !== 'verified') return [];
  return venue.channels.map(channel => {
    const hosts = channel.provider === 'venue' ? (venue.website ? [new URL(venue.website).hostname] : null) : BOOKING_HOSTS[channel.provider];
    if (!hosts || !channel.evidence || !channel.externalId) throw new DiningError('invalid_channel');
    return Object.freeze({...channel, mode:'REFERRAL', href:safeDestination(channel.href,hosts), affiliate:false});
  });
}

/**
 * The one main action for a venue: its checked booking page, or Google Maps when the
 * booking link is missing or unchecked. Never a Miami Elio booking.
 * @returns {{kind:'book',href:string,platform:string}|{kind:'maps',href:string}|null}
 */
export function primaryAction(venue) {
  if (!venue || venue.status !== 'verified') return null;
  if (venue.bookingVerified && venue.bookingUrl && venue.bookingPlatform) {
    const hosts = venue.bookingPlatform === 'venue' ? (venue.website ? [new URL(venue.website).hostname] : []) : BOOKING_HOSTS[venue.bookingPlatform] || [];
    try { return {kind:'book', href:safeDestination(venue.bookingUrl, hosts), platform:venue.bookingPlatform}; } catch {}
  }
  if (venue.mapsUrl) {
    try { return {kind:'maps', href:safeDestination(venue.mapsUrl, ['www.google.com'])}; } catch {}
  }
  return null;
}

/** The public contract never returns fabricated slots or implied confirmation. */
export function availability(venue, input) {
  const requested = selection(input);
  if (venue.status !== 'verified') throw new DiningError('venue_unavailable',410);
  return {version:1,venueId:venue.id,requested,timeZone:'America/New_York',status:'check_with_provider',
    slots:null,channels:channelsFor(venue),confirmation:null};
}

/** Unprovisioned API modes fail closed even if someone supplies credentials or a flag. */
export function providerAdapter(provider) {
  const config = PROVIDERS.find(p => p.id === provider);
  if (!config) throw new DiningError('unknown_provider',404);
  const unavailable = async () => { throw new DiningError('provider_not_authorized',503); };
  return Object.freeze({version:1,provider,capabilities:config.capabilities,availability:unavailable,create:unavailable,cancel:unavailable});
}
