export const EVENT_CATEGORY_GROUPS = [
  { slug: 'sports', label: 'Sport Tickets', icon: '🏈' },
  { slug: 'concerts', label: 'Concert and Events Tickets', icon: '🎤' }
];

export const EVENT_CATEGORIES = [
  { slug: 'basketball', label: 'Basketball', icon: '🏀', group: 'sports' },
  { slug: 'baseball', label: 'Baseball', icon: '⚾', group: 'sports' },
  { slug: 'hockey', label: 'Hockey', icon: '🏒', group: 'sports' },
  { slug: 'soccer', label: 'Soccer', icon: '⚽', group: 'sports' },
  { slug: 'tennis', label: 'Tennis', icon: '🎾', group: 'sports' },
  { slug: 'formula1', label: 'Formula 1', icon: '🏎', group: 'sports' },
  { slug: 'golf', label: 'Golf', icon: '⛳', group: 'sports' },
  { slug: 'ufc-boxing', label: 'UFC / Boxing', icon: '🥊', group: 'sports' },
  { slug: 'theater-broadway', label: 'Theater & Broadway', icon: '🎭', group: 'concerts' },
  { slug: 'shows-entertainment', label: 'Shows & Entertainment', icon: '🎬', group: 'concerts' },
  { slug: 'festivals', label: 'Festivals', icon: '🎡', group: 'concerts' },
  { slug: 'music-events', label: 'Music Events', icon: '🎶', group: 'concerts' },
  { slug: 'comedy-shows', label: 'Comedy Shows', icon: '😂', group: 'concerts' },
  { slug: 'family-events', label: 'Family Events', icon: '🎪', group: 'concerts' },
  { slug: 'exhibitions-museums', label: 'Exhibitions & Museums', icon: '🎨', group: 'concerts' },
  { slug: 'gaming-esports', label: 'Gaming & Esports', icon: '🎮', group: 'concerts' },
  { slug: 'special-events', label: 'Special Events', icon: '🎟', group: 'concerts' }
];

export const LEAGUES = [
  { slug: 'nfl', name: 'NFL', sport: 'American Football', category: 'sports', website: 'https://www.nfl.com' },
  { slug: 'nba', name: 'NBA', sport: 'Basketball', category: 'basketball', website: 'https://www.nba.com' },
  { slug: 'mlb', name: 'MLB', sport: 'Baseball', category: 'baseball', website: 'https://www.mlb.com' },
  { slug: 'nhl', name: 'NHL', sport: 'Hockey', category: 'hockey', website: 'https://www.nhl.com' },
  { slug: 'mls', name: 'MLS', sport: 'Soccer', category: 'soccer', website: 'https://www.mlssoccer.com' },
  { slug: 'atp', name: 'ATP', sport: 'Tennis (Men)', category: 'tennis', website: 'https://www.atptour.com' },
  { slug: 'wta', name: 'WTA', sport: 'Tennis (Women)', category: 'tennis', website: 'https://www.wtatennis.com' },
  { slug: 'ufc', name: 'UFC', sport: 'Mixed Martial Arts', category: 'ufc-boxing', website: 'https://www.ufc.com' },
  { slug: 'formula-1', name: 'Formula 1', sport: 'Motorsport', category: 'formula1', website: 'https://www.formula1.com' }
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

export const PROVIDERS = [
  { slug: 'ticketmaster', name: 'Ticketmaster', website: 'https://www.ticketmaster.com' },
  { slug: 'stubhub', name: 'StubHub', website: 'https://www.stubhub.com' },
  { slug: 'seatgeek', name: 'SeatGeek', website: 'https://seatgeek.com' },
  { slug: 'vivid-seats', name: 'Vivid Seats', website: 'https://www.vividseats.com' },
  { slug: 'tickpick', name: 'TickPick', website: 'https://www.tickpick.com' },
  { slug: 'gametime', name: 'Gametime', website: 'https://gametime.co' },
  { slug: 'eventbrite', name: 'Eventbrite', website: 'https://www.eventbrite.com' },
  { slug: 'axs', name: 'AXS', website: 'https://www.axs.com' }
];

export const events = [
  {
    id: 'nba-all-star', slug: 'nba-all-star-game', name: 'NBA All-Star Game',
    category: 'basketball', league: 'nba',
    venue: 'Chase Center', city: 'San Francisco', state: 'CA', country: 'USA',
    date: '2026-02-15', time: '17:00',
    description: 'The annual exhibition game featuring the league\'s star players.',
    priceRange: '$500 - $5,000', providers: ['ticketmaster', 'stubhub'], featured: true, trending: true,
    image: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'mlb-world-series', slug: 'mlb-world-series-game-1', name: 'MLB World Series — Game 1',
    category: 'baseball', league: 'mlb',
    venue: 'TBD', city: 'TBD', state: '', country: 'USA',
    date: '2026-10-23', time: '20:00',
    description: 'The pinnacle of baseball. Game 1 of the Fall Classic.',
    priceRange: '$800 - $6,000', providers: ['stubhub', 'seatgeek'], featured: true, trending: true,
    image: 'https://images.unsplash.com/photo-1508344928928-7137b29de216?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'atp-miami-open', slug: 'miami-open-atp-finals', name: 'Miami Open — ATP Finals',
    category: 'tennis', league: 'atp',
    venue: 'Hard Rock Stadium', city: 'Miami', state: 'FL', country: 'USA',
    date: '2027-03-28', time: '14:00',
    description: 'The thrilling conclusion to one of tennis\'s most prestigious hard-court tournaments.',
    priceRange: '$150 - $1,200', providers: ['ticketmaster', 'axs'], featured: true, trending: false,
    image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'f1-miami-gp', slug: 'formula-1-miami-grand-prix', name: 'Formula 1 Miami Grand Prix',
    category: 'formula1', league: 'formula-1',
    venue: 'Miami International Autodrome', city: 'Miami', state: 'FL', country: 'USA',
    date: '2027-05-02', time: '15:00',
    description: 'Elite motorsport action meets South Florida luxury.',
    priceRange: '$400 - $5,000', providers: ['ticketmaster', 'vivid-seats'], featured: true, trending: true,
    image: 'https://images.unsplash.com/photo-1532911520117-646736a32bf2?auto=format&fit=crop&w=800&q=80'
  }
];

export function getEventCategories() { return EVENT_CATEGORIES; }
export function getLeagues() { return LEAGUES; }
export function getProviders() { return PROVIDERS; }
export function getAllEvents() { return events; }
