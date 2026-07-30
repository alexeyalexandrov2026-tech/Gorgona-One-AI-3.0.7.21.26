export const EVENT_CATEGORY_GROUPS = [
  { slug: 'sports', label: 'Sport Tickets', icon: '🏈' },
  { slug: 'concerts', label: 'Concert and Events Tickets', icon: '🎤' }
];

// The two Events pillars break down into these subcategories. `logo` points at
// the official emblem in public/images/events/leagues when one ships with the
// build; entries without it fall back to the drawn glyph in
// app/events/CategoryGlyph.jsx, so every tile always renders a mark.
export const EVENT_CATEGORIES = [
  { slug: 'nfl', label: 'NFL', icon: '🏈', group: 'sports', logo: '/images/events/leagues/nfl.png' },
  { slug: 'nhl', label: 'NHL', icon: '🏒', group: 'sports', logo: '/images/events/leagues/nhl.png' },
  { slug: 'nba', label: 'NBA', icon: '🏀', group: 'sports', logo: '/images/events/leagues/nba.png' },
  { slug: 'mlb', label: 'MLB', icon: '⚾', group: 'sports', logo: '/images/events/leagues/mlb.png' },
  { slug: 'mls', label: 'MLS', icon: '⚽', group: 'sports', logo: '/images/events/leagues/mls.jpg' },
  { slug: 'ufc', label: 'UFC', icon: '🥋', group: 'sports', logo: '/images/events/leagues/ufc.png' },
  { slug: 'boxing', label: 'Boxing', icon: '🥊', group: 'sports' },
  { slug: 'formula-1', label: 'F1', icon: '🏎', group: 'sports', logo: '/images/events/leagues/formula-1.png' },
  { slug: 'nascar', label: 'NASCAR', icon: '🏁', group: 'sports', logo: '/images/events/leagues/nascar.png' },
  { slug: 'tennis', label: 'Tennis', icon: '🎾', group: 'sports', logo: '/images/events/leagues/tennis.webp' },
  { slug: 'golf', label: 'Golf', icon: '⛳', group: 'sports', logo: '/images/events/leagues/golf.jpg' },
  { slug: 'other-leagues', label: 'Other Leagues', icon: '🏆', group: 'sports' },
  { slug: 'pop-rock', label: 'Pop & Rock', icon: '🎸', group: 'concerts' },
  { slug: 'hip-hop-rnb', label: 'Hip-Hop & R&B', icon: '🎤', group: 'concerts' },
  { slug: 'jazz-blues', label: 'Jazz & Blues', icon: '🎺', group: 'concerts' },
  { slug: 'electronic-edm', label: 'Electronic / EDM', icon: '🎛', group: 'concerts' },
  { slug: 'classical-opera', label: 'Classical & Opera', icon: '🎼', group: 'concerts' },
  { slug: 'country', label: 'Country', icon: '🤠', group: 'concerts' },
  { slug: 'comedy-standup', label: 'Comedy & Stand-up', icon: '😂', group: 'concerts' },
  { slug: 'theater-broadway', label: 'Theater & Broadway', icon: '🎭', group: 'concerts' },
  { slug: 'festivals', label: 'Festivals', icon: '🎪', group: 'concerts' },
  { slug: 'other-live', label: 'Others', icon: '🎟', group: 'concerts' }
];

export const LEAGUES = [
  { slug: 'nfl', name: 'NFL', sport: 'American Football', category: 'nfl', website: 'https://www.nfl.com' },
  { slug: 'nba', name: 'NBA', sport: 'Basketball', category: 'nba', website: 'https://www.nba.com' },
  { slug: 'mlb', name: 'MLB', sport: 'Baseball', category: 'mlb', website: 'https://www.mlb.com' },
  { slug: 'nhl', name: 'NHL', sport: 'Hockey', category: 'nhl', website: 'https://www.nhl.com' },
  { slug: 'mls', name: 'MLS', sport: 'Soccer', category: 'mls', website: 'https://www.mlssoccer.com' },
  { slug: 'atp', name: 'ATP', sport: 'Tennis (Men)', category: 'tennis', website: 'https://www.atptour.com' },
  { slug: 'wta', name: 'WTA', sport: 'Tennis (Women)', category: 'tennis', website: 'https://www.wtatennis.com' },
  { slug: 'ufc', name: 'UFC', sport: 'Mixed Martial Arts', category: 'ufc', website: 'https://www.ufc.com' },
  { slug: 'formula-1', name: 'Formula 1', sport: 'Motorsport', category: 'formula-1', website: 'https://www.formula1.com' }
];

export const TEAMS = [
  { slug: 'kansas-city-chiefs', name: 'Kansas City Chiefs', league: 'nfl', city: 'Kansas City', website: 'https://www.chiefs.com' },
  { slug: 'dallas-cowboys', name: 'Dallas Cowboys', league: 'nfl', city: 'Dallas', website: 'https://www.dallascowboys.com' },
  { slug: 'san-francisco-49ers', name: 'San Francisco 49ers', league: 'nfl', city: 'Santa Clara', website: 'https://www.49ers.com' },
  { slug: 'miami-dolphins', name: 'Miami Dolphins', league: 'nfl', city: 'Miami Gardens', website: 'https://www.miamidolphins.com' },
  { slug: 'los-angeles-lakers', name: 'Los Angeles Lakers', league: 'nba', city: 'Los Angeles', website: 'https://www.nba.com/lakers' },
  { slug: 'boston-celtics', name: 'Boston Celtics', league: 'nba', city: 'Boston', website: 'https://www.nba.com/celtics' },
  { slug: 'miami-heat', name: 'Miami Heat', league: 'nba', city: 'Miami', website: 'https://www.nba.com/heat' },
  { slug: 'golden-state-warriors', name: 'Golden State Warriors', league: 'nba', city: 'San Francisco', website: 'https://www.nba.com/warriors' },
  { slug: 'new-york-yankees', name: 'New York Yankees', league: 'mlb', city: 'New York', website: 'https://www.mlb.com/yankees' },
  { slug: 'los-angeles-dodgers', name: 'Los Angeles Dodgers', league: 'mlb', city: 'Los Angeles', website: 'https://www.mlb.com/dodgers' },
  { slug: 'miami-marlins', name: 'Miami Marlins', league: 'mlb', city: 'Miami', website: 'https://www.mlb.com/marlins' },
  { slug: 'florida-panthers', name: 'Florida Panthers', league: 'nhl', city: 'Sunrise', website: 'https://www.nhl.com/panthers' },
  { slug: 'toronto-maple-leafs', name: 'Toronto Maple Leafs', league: 'nhl', city: 'Toronto', website: 'https://www.nhl.com/mapleleafs' },
  { slug: 'vegas-golden-knights', name: 'Vegas Golden Knights', league: 'nhl', city: 'Las Vegas', website: 'https://www.nhl.com/goldenknights' },
  { slug: 'inter-miami-cf', name: 'Inter Miami CF', league: 'mls', city: 'Fort Lauderdale', website: 'https://www.intermiamicf.com' },
  { slug: 'la-galaxy', name: 'LA Galaxy', league: 'mls', city: 'Carson', website: 'https://www.lagalaxy.com' },
  { slug: 'seattle-sounders-fc', name: 'Seattle Sounders FC', league: 'mls', city: 'Seattle', website: 'https://www.soundersfc.com' }
];

// Ticket aggregators an event can be bought through. `logo` is set only for the
// brands whose official artwork ships in public/images/events/providers -
// getTicketProvidersWithLogos() drives the provider wall on subcategory pages,
// so a brand joins that wall the moment its file lands here.
// `logoClass` optically balances marks with very different aspect ratios.
export const PROVIDERS = [
  { slug: 'ticketmaster', name: 'Ticketmaster', website: 'https://www.ticketmaster.com' },
  { slug: 'stubhub', name: 'StubHub', website: 'https://www.stubhub.com' },
  { slug: 'seatgeek', name: 'SeatGeek', website: 'https://seatgeek.com' },
  {
    slug: 'vivid-seats',
    name: 'Vivid Seats',
    website: 'https://www.vividseats.com',
    logo: '/images/events/providers/vivid-seats.svg',
    logoClass: 'max-h-7'
  },
  { slug: 'tickpick', name: 'TickPick', website: 'https://www.tickpick.com' },
  { slug: 'gametime', name: 'Gametime', website: 'https://gametime.co' },
  {
    slug: 'eventbrite',
    name: 'Eventbrite',
    website: 'https://www.eventbrite.com',
    logo: '/images/events/providers/eventbrite.svg',
    logoClass: 'max-h-6'
  },
  { slug: 'axs', name: 'AXS', website: 'https://www.axs.com' },
  {
    slug: 'ticket-tailor',
    name: 'Ticket Tailor',
    website: 'https://www.tickettailor.com',
    logo: '/images/events/providers/ticket-tailor.svg',
    logoClass: 'max-h-9'
  },
  {
    slug: 'online-ticket-seller',
    name: 'Online Ticket Seller',
    website: 'https://www.onlineticketseller.com',
    logo: '/images/events/providers/online-ticket-seller.png',
    logoClass: 'max-h-12'
  }
];

// Dated listings. Deliberately empty: the four rows that used to sit here were
// invented - real tournament names against made-up venues, dates and price
// ranges, shown to visitors as bookable with a "Book Tickets" link. Nothing
// goes in here that has not been verified against a provider. Until a listing
// exists, the subcategory pages hand visitors straight to the ticket
// marketplaces in PROVIDERS, which is where the section earns anyway.
//
// Shape for a real row:
//   {
//     id, slug, name, category, league,
//     venue, city, state, country,
//     date: 'YYYY-MM-DD', time: 'HH:MM',
//     description, priceRange,
//     providers: ['vivid-seats', ...],
//     featured, trending, image
//   }
export const events = [];

export function getEventCategories() { return EVENT_CATEGORIES; }
export function getLeagues() { return LEAGUES; }
export function getProviders() { return PROVIDERS; }
export function getAllEvents() { return events; }

export function getTicketProvidersWithLogos() {
  return PROVIDERS.filter((provider) => provider.logo);
}

export function getEventCategoryGroup(slug) {
  return EVENT_CATEGORY_GROUPS.find((group) => group.slug === slug) || null;
}

export function getEventCategoryBySlug(slug) {
  return EVENT_CATEGORIES.find((category) => category.slug === slug) || null;
}

export function getEventCategoriesByGroup(groupSlug) {
  return EVENT_CATEGORIES.filter((category) => category.group === groupSlug);
}

export function getEventsByCategory(categorySlug) {
  return events.filter((event) => event.category === categorySlug);
}

export function getEventsByCategoryGroup(groupSlug) {
  const slugs = new Set(getEventCategoriesByGroup(groupSlug).map((category) => category.slug));
  return events.filter((event) => slugs.has(event.category));
}
