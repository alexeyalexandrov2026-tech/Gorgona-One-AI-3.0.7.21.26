// ===========================================================================
// Citation-ready expert Miami guides (/guides & /guides/[slug]) for GEO / AEO.
// Pure data module — zero inline JSX copy; pairs live catalog data where helpful.
// ===========================================================================

export const GUIDES_UI = Object.freeze({
  home: 'Miami Elio',
  guides: 'Miami Guides',
  indexEyebrow: 'MIAMI ELIO · EXPERT GUIDES & 2026 PRICING',
  indexTitle: 'Miami Luxury Travel, Pricing & Planning Guides',
  indexLede: 'Verified 2026 price benchmarks, USCG yacht rules, Michelin dining directories, and peak-season planning timelines written from Miami Elio’s live catalog and local operations.',
  readGuide: 'Read full guide',
  updatedLabel: 'Updated',
  updatedDate: 'November 2026',
  keyTakeaways: 'Key Takeaways',
  faqTitle: 'Frequently Asked Questions',
  relatedTitle: 'More Miami Elio Guides',
  askElio: 'Plan this with ELIO+ Guide',
  telegramCta: 'Message our Miami team on Telegram',
  brandsHeading: 'Browse Miami Exotic Cars by Brand',
  venuesHeading: 'Verified Miami Restaurants & Nightlife by Neighborhood',
  reserveLabel: 'View venue & booking link'
});

export const GEO_GUIDES = Object.freeze([
  {
    slug: 'miami-exotic-car-rental-prices-2026',
    category: 'Exotic Cars · Pricing Guide',
    title: 'Miami Exotic Car Rental Prices 2026: Daily Rates, Deposits & Airport Delivery',
    metaDescription: '2026 guide to Miami exotic & luxury car rental prices: Lamborghini, Rolls-Royce, Ferrari, AMG G63 daily rates, deposits, insurance rules, and MIA/FLL/OPF delivery.',
    heroImage: '/images/home/hero-tower.webp',
    heroAlt: 'Miami skyline and coastal roads for exotic car rentals',
    lede: 'A transparent breakdown of real 2026 daily rates across 290+ exotic and luxury vehicles in Miami — including deposits, insurance requirements, age rules, and airport delivery to MIA, FLL, and OPF.',
    takeaways: [
      'Luxury SUVs and executive sedans (BMW X5/X7, Range Rover, Mercedes S-Class) typically run $250–$650/day; Mercedes-AMG G63 and Maybach range from $550–$1,100/day.',
      'Supercars and ultra-luxury flagships (Lamborghini Urus/Huracán, Ferrari F8/Portofino, McLaren 720S, Rolls-Royce Cullinan/Ghost) range from $850–$2,400+/day.',
      'Standard requirements: age 25+, valid US or international driver license, full-coverage transferable insurance, and a refundable security deposit confirmed in writing prior to ESIGN & payment.'
    ],
    tableTitle: '2026 Miami Exotic & Luxury Car Rental Price Benchmarks (USD)',
    tableHeaders: ['Category / Brand', 'Popular Miami Models', 'Typical Daily Rate', 'Typical Deposit Hold'],
    tableRows: [
      ['Executive SUVs & Sedans', 'BMW X5, BMW X7, BMW 7-Series, Escalade ESV', '$250 – $550 / day', '$500 – $1,500'],
      ['Luxury Icons & AMG', 'Mercedes-AMG G63, Porsche 911 Carrera, Range Rover', '$550 – $950 / day', '$1,500 – $2,500'],
      ['Ultra-Luxury Grand Tourers', 'Mercedes-Maybach GLS/S580, Bentley Continental GT/Bentayga', '$650 – $1,400 / day', '$2,000 – $3,000'],
      ['Italian & British Supercars', 'Lamborghini Urus/Huracán, Ferrari Portofino/F8, McLaren 720S', '$900 – $2,200 / day', '$2,500 – $5,000'],
      ['Flagship Rolls-Royce', 'Rolls-Royce Cullinan, Ghost, Dawn, Spectre', '$1,100 – $2,000+ / day', '$2,500 – $5,000']
    ],
    sections: [
      {
        heading: 'How Airport & Hotel Delivery Works in Miami (MIA, FLL, OPF)',
        paragraphs: [
          'Instead of waiting in rental-center shuttles, Miami Elio coordinates direct delivery to Miami International Airport (MIA), Fort Lauderdale-Hollywood International Airport (FLL), Opa-locka Executive Airport (OPF) private jet FBOs, and hotels or villas across Miami Beach, Brickell, Sunny Isles Beach, Bal Harbour, Fisher Island, and Key Biscayne.',
          'Typical drive times from our Sunny Isles Beach garage and partner hubs: MIA to Brickell takes 18–30 minutes, MIA to South Beach 25–40 minutes, and OPF to Miami Beach 25–40 minutes depending on bridge traffic.'
        ]
      },
      {
        heading: 'Deposits, Insurance, ESIGN & Group Split-Pay',
        paragraphs: [
          'Every direct fleet booking through Miami Elio provides written confirmation of the all-in rate, mileage allowance, delivery fee, and refundable security hold before any card is charged. Guests complete a mandatory ESIGN electronic agreement and settle securely via Stripe 3D Secure 2 or PayPal Business.',
          'Traveling with friends for a Miami weekend? Miami Elio supports Group Split-Pay so the total rental can be split cleanly across participants while staying covered by our ELIO+ Shield 100% Fulfillment & Replacement Guarantee.'
        ]
      }
    ],
    showBrandGrid: true,
    primaryCta: { label: 'Browse all 290+ Miami cars', href: '/rentals' },
    faqs: [
      {
        question: 'What is the minimum age to rent an exotic car in Miami?',
        answer: 'Most exotic and ultra-luxury rentals in Miami require drivers to be at least 25 years old with a valid domestic or international license and verifiable full-coverage insurance.'
      },
      {
        question: 'How far in advance should I book an exotic car for Art Basel or F1 Miami?',
        answer: 'For peak Miami weekends (Art Basel Miami Beach, New Year’s Eve, Miami International Boat Show, Ultra Music Festival, and F1 Miami Grand Prix), reserve 3 to 8 weeks ahead because flagship Lamborghinis and Rolls-Royces sell out first.'
      },
      {
        question: 'Does Miami Elio charge hidden broker markups on car rentals?',
        answer: 'No. Published daily rates are shown upfront across our Sunny Isles own fleet and verified partners, and all fees and refundable deposit terms are confirmed in writing before payment.'
      }
    ]
  },
  {
    slug: 'miami-yacht-charter-guide',
    category: 'Yacht Charters · Biscayne Bay',
    title: 'Miami Yacht Charter Guide 2026: Prices, USCG 6 vs 13 Guest Rules & Best Routes',
    metaDescription: 'Complete 2026 Miami yacht charter guide: 4h & 8h prices by vessel size (34–110+ ft), USCG 6-vs-13 passenger rule, Biscayne Bay sandbar routes, and crew/fuel tips.',
    heroImage: '/images/home/hero-tower.webp',
    heroAlt: 'Biscayne Bay turquoise water and Miami yacht charter routes',
    lede: 'Everything travelers need before chartering a private yacht in Miami: realistic 4-hour and 8-hour charter rates by boat length, US Coast Guard passenger laws, top Biscayne Bay routes, and what is included.',
    takeaways: [
      '4-hour Miami day charters typically start around $1,200–$3,500 for 34–52 ft cruisers, $4,000–$7,500 for 60–80 ft flybridge yachts, and $8,000–$25,000+ for 90–110+ ft superyachts.',
      'US Coast Guard law caps standard bareboat/uninspected charters at 6 or 12–13 day passengers depending on vessel certification; groups over 13 require a USCG-inspected vessel.',
      'Always verify upfront whether captain, mate, fuel, dockage, 7% Florida tax, and standard 15–20% crew gratuity are bundled or billed separately.'
    ],
    tableTitle: 'Miami Private Yacht Charter Price & Capacity Guide (USD)',
    tableHeaders: ['Yacht Class & Length', 'Typical Day Capacity', '4-Hour Guide Rate', '8-Hour Guide Rate'],
    tableRows: [
      ['Express Cruiser (34 – 45 ft)', 'Up to 10–12 guests', '$1,200 – $2,600', '$2,200 – $4,200'],
      ['Mid-Size Flybridge (46 – 58 ft)', 'Up to 12–13 guests', '$2,500 – $4,200', '$4,000 – $6,800'],
      ['Large Luxury Yacht (60 – 85 ft)', 'Up to 13 guests (or inspected)', '$4,500 – $7,900', '$7,000 – $12,500'],
      ['Superyacht (90 – 120+ ft)', '13 day guests / bespoke events', '$8,000 – $20,000+', '$14,000 – $40,000+']
    ],
    sections: [
      {
        heading: 'The US Coast Guard 6-Passenger vs. 13-Passenger Rule Explained',
        paragraphs: [
          'Miami is strictly patrolled by the US Coast Guard and Miami-Dade Marine Patrol. Under federal law, an uninspected passenger vessel ("six-pack") may carry at most 6 paying passengers, while properly structured bareboat charters may carry up to 12 guests (13 total including the charterer depending on operator compliance).',
          'If your group has 14 or more guests — such as a corporate outing, birthday celebration, or bachelorette party — you must book a USCG Certificate of Inspection (COI) vessel or split into two coordinated yachts that raft up at the sandbar.'
        ]
      },
      {
        heading: 'Top Biscayne Bay & Sandbar Routes',
        paragraphs: [
          'Classic 4-hour route: depart Miami Beach Marina or Bayside Marina, cruise past celebrity waterfront homes on Star Island, Hibiscus Island, and Fisher Island, then anchor at Monument Island or Nixon Sandbar off Key Biscayne for swimming.',
          'Full-day 8-hour route: head north to Haulover Sandbar (lively weekend atmosphere) or south past Stiltsville and Boca Chita Key, returning at golden hour against the Brickell skyline. ELIO+ Guide checks live 7-day NOAA marine weather (KMIA) before your charter date.'
        ]
      }
    ],
    primaryCta: { label: 'Explore Miami yacht charters', href: '/yachts' },
    faqs: [
      {
        question: 'Are captain and fuel included in Miami yacht charter prices?',
        answer: 'Many Miami listings publish a base vessel rate plus separate captain/crew fees, fuel, marina dockage, tax, and standard 15–20% crew gratuity. On Miami Elio, YATR and verified Viator listings display transparent terms upfront.'
      },
      {
        question: 'What happens if it rains or winds are high on my Miami yacht day?',
        answer: 'Miami Elio tracks 7-day NOAA Miami weather forecasts and offers Weather Shield coordination so your specialist can reschedule or adjust routes safely if marine advisories occur.'
      },
      {
        question: 'Can I pair a yacht charter with an exotic car and waterfront dinner?',
        answer: 'Yes. Many guests arrive at Miami Beach Marina in a Rolls-Royce or Lamborghini, spend 4 hours on Biscayne Bay, and head straight to Carbone, Komodo, or Klaw — coordinated in one conversation with ELIO+ Guide.'
      }
    ]
  },
  {
    slug: 'best-michelin-restaurants-miami',
    category: 'Dining & Nightlife · 74+ Verified Venues',
    title: 'Best Michelin & Luxury Restaurants in Miami 2026 (With Direct Resy & SevenRooms Links)',
    metaDescription: 'Curated 2026 guide to Miami’s best Michelin-starred restaurants, rooftops, and nightlife across Brickell, South Beach, Design District, and Surfside with direct booking links.',
    heroImage: '/images/home/hero-tower.webp',
    heroAlt: 'Miami fine dining neighborhoods including Brickell and South Beach',
    lede: 'A neighborhood-by-neighborhood directory of Miami’s most sought-after Michelin-recognized dining rooms, rooftop lounges, and iconic dinner spots — pulled directly from Miami Elio’s 74+ verified venues with official Resy, SevenRooms, OpenTable, and Tock links.',
    takeaways: [
      'Miami’s top dining clusters are separated by 10–25 minutes: Brickell, South Beach, Design District/Wynwood, Surfside/Bal Harbour, and Coconut Grove/Coral Gables.',
      'Prime Friday/Saturday tables at Carbone, COTE Miami, L’Atelier de Joël Robuchon, The Surf Club, and Komodo release 14–30 days ahead on Resy and SevenRooms.',
      'Miami Elio links directly to official restaurant reservation channels with zero booking markup and coordinates luxury car drop-off right to the valet.'
    ],
    tableTitle: 'Top Miami Dining Neighborhoods & Official Booking Platforms',
    tableHeaders: ['Neighborhood', 'Standout Verified Venues', 'Vibe & Cuisine', 'Primary Platforms'],
    tableRows: [
      ['Brickell & Brickell Key', 'Komodo, Sexy Fish, LPM Restaurant & Bar, Osaka, Naoe, Sugar Rooftop', 'High-energy Asian, French Mediterranean, Nikkei, omakase & rooftops', 'SevenRooms, OpenTable, Tock'],
      ['South Beach & Miami Beach', 'Carbone, Papi Steak, Stubborn Seed, MILA, Joe’s Stone Crab, Macchialina', 'Iconic Italian, Michelin tasting menus, rooftop MediterrAsian & classics', 'Resy, SevenRooms, OpenTable'],
      ['Design District & Wynwood', 'L’Atelier de Joël Robuchon, COTE Miami, Le Jardinier, Mandolin, DOYA', '2-Michelin-star French, Korean steakhouse, Aegean courtyard', 'SevenRooms, Resy'],
      ['Surfside, Grove & Gables', 'The Surf Club Restaurant, Makoto, Ariete, Los Félix, Shingo, Bouchon Bistro', 'Michelin omakase, Thomas Keller classics, refined neighborhood icons', 'Resy, SevenRooms, OpenTable']
    ],
    sections: [
      {
        heading: 'How to Pair Your Dinner Reservation with Miami Logistics',
        paragraphs: [
          'Traffic across the MacArthur, Julia Tuttle, and Venetian causeways peaks between 7:00 PM and 9:30 PM on weekends. Grouping your sunset yacht disembarkation or hotel stay in the same cluster — such as Brickell marinas + LPM/Komodo, or Miami Beach Marina + Carbone/Stubborn Seed — saves 30–45 minutes each way.',
          'Every verified venue in Miami Elio’s directory includes official street address, cuisine, price tier, and direct link to its verified reservation partner.'
        ]
      }
    ],
    showVerifiedVenues: true,
    primaryCta: { label: 'Browse all 74+ verified Miami venues', href: '/restaurants-nightlife' },
    faqs: [
      {
        question: 'Which reservation apps do Miami’s top Michelin and luxury restaurants use?',
        answer: 'Most flagship Miami restaurants split across SevenRooms (L’Atelier, Komodo, Sexy Fish, LPM, Papi Steak, Stubborn Seed, Ariete), Resy (Carbone, COTE Miami, The Surf Club, Mandolin, Macchialina), OpenTable (MILA, Joe’s Stone Crab, Osaka, Makoto), and Tock (Naoe).'
      },
      {
        question: 'Does Miami Elio add fees to restaurant reservations?',
        answer: 'No. Miami Elio links directly to each restaurant’s official verified booking platform and helps coordinate surrounding logistics like exotic car valet delivery or nightlife access.'
      }
    ]
  },
  {
    slug: 'miami-peak-season-events-planner',
    category: 'Seasonal Planning · Events & VIP',
    title: 'Miami Peak Season Calendar 2026–2027: Art Basel, Boat Show, Ultra & F1 Planning Guide',
    metaDescription: 'Plan Miami’s sell-out weeks: Art Basel, New Year’s Eve, Miami International Boat Show, Miami Open, Ultra & Formula 1 Miami Grand Prix — lead times, traffic & bookings.',
    heroImage: '/images/home/hero-tower.webp',
    heroAlt: 'Miami peak season events skyline and Biscayne Bay',
    lede: 'Six marquee weeks drive the highest demand for Miami yachts, exotic cars, waterfront villas, private jets, and Michelin tables. Use this timeline to lock availability before rates surge.',
    takeaways: [
      'Art Basel Miami Beach (early December), New Year’s Eve (Dec 31), and Formula 1 Miami Grand Prix (early May) sell out flagship yachts, Rolls-Royces, and villas 4–12 weeks early.',
      'Miami International Boat Show (February), Miami Open (March), and Ultra Music Festival (late March) heavily impact Downtown/Brickell, Miami Beach, and Hard Rock Stadium corridors.',
      'Miami Elio combines live TicketNetwork event inventory, live fleet availability, and 7-day NOAA weather planning in 16 languages.'
    ],
    tableTitle: 'Miami Peak Season Calendar & Recommended Booking Lead Times',
    tableHeaders: ['Event & Typical Timing', 'Primary Hub / Venue', 'What Sells Out First', 'Recommended Lead Time'],
    tableRows: [
      ['Art Basel Miami Beach (Dec)', 'Miami Beach Convention Center & Design District', 'Michelin dinners, Rolls-Royce/Maybach, Beach villas', '4 – 8 weeks ahead'],
      ['New Year’s Eve on Biscayne Bay (Dec 31)', 'Biscayne Bay, South Beach & Brickell', 'Fireworks charter yachts & waterfront penthouses', '4 – 10 weeks ahead'],
      ['Miami International Boat Show (Feb)', 'Miami Beach & Downtown Marinas', 'Captained yachts, Brickell/Beach hotels & SUVs', '3 – 6 weeks ahead'],
      ['Miami Open Tennis (March)', 'Hard Rock Stadium (Miami Gardens)', 'Stadium suites/tickets, chauffeur SUVs & villas', '2 – 5 weeks ahead'],
      ['Ultra & Miami Music Week (Late March)', 'Bayfront Park & South Beach clubs', 'Downtown/Brickell stays, VIP club tables & yachts', '3 – 6 weeks ahead'],
      ['Formula 1 Miami Grand Prix (Early May)', 'Miami International Autodrome', 'Private jets (OPF), supercars, villas & Paddock/race tickets', '6 – 12 weeks ahead']
    ],
    sections: [
      {
        heading: 'Smart Airport & Stadium Logistics During Major Weeks',
        paragraphs: [
          'For Hard Rock Stadium events (Miami Open, F1 Miami Grand Prix, Miami Dolphins), plan 30–50 minutes from Brickell or Miami Beach on normal days and 60–90 minutes during race/match egress.',
          'Private aviation guests arriving at Opa-locka Executive Airport (OPF) are closest to Hard Rock Stadium (15–20 minutes) and Sunny Isles Beach (20–30 minutes). Miami Elio coordinates synchronized OPF car handoffs and Group Split-Pay weekend packages.'
        ]
      }
    ],
    primaryCta: { label: 'Browse live Miami event tickets', href: '/events' },
    faqs: [
      {
        question: 'When is the busiest luxury travel season in Miami?',
        answer: 'Peak Miami season runs from late November through early May, anchored by Art Basel, New Year’s Eve, Miami International Boat Show, Miami Open, Ultra Music Festival, and the Formula 1 Miami Grand Prix.'
      },
      {
        question: 'Can Miami Elio coordinate event tickets together with a car, villa, and yacht?',
        answer: 'Yes. Ask ELIO+ Guide on the web, in the Android app, or via Telegram (@MIAMI_ELIO) and WhatsApp with your event dates and group size to build a unified itinerary handled by our live Miami team.'
      }
    ]
  }
]);

export function getGeoGuide(slug) {
  return GEO_GUIDES.find((g) => g.slug === slug) || null;
}
