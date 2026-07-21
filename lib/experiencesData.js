// Miami Experiences marketplace data. Static for now (mirrors the pattern
// used by lib/rentalsData.js and lib/yachtsData.js). Kept separate from
// Restaurants & Nightlife - this covers activities/experiences, not dining.

const experiences = [
  {
    id: 'helicopter-tours',
    slug: 'helicopter-tours-miami',
    title: 'Helicopter Tours',
    location: 'Miami Beach Heliport',
    duration: '20-45 min',
    price: 'From $199',
    image: 'https://images.unsplash.com/photo-1534790566855-4cb788d389ec?auto=format&fit=crop&w=900&q=80',
    description: 'Aerial tour of South Beach, Downtown, and the Millionaire\'s Row waterfront estates.',
    featured: true
  },
  {
    id: 'jet-ski-adventures',
    slug: 'jet-ski-adventures-miami',
    title: 'Jet Ski Adventures',
    location: 'Haulover Marine Center',
    duration: '1-2 hours',
    price: 'From $99',
    image: 'https://images.unsplash.com/photo-1520255870062-bd79d3865de7?auto=format&fit=crop&w=900&q=80',
    description: 'Guided jet ski runs past Star Island and the sandbar, with new-model watercraft and safety escort.',
    featured: true
  },
  {
    id: 'yacht-parties',
    slug: 'yacht-parties-miami',
    title: 'Yacht Parties',
    location: 'Miami Beach Marina',
    duration: '3-4 hours',
    price: 'From $2,500',
    image: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&w=900&q=80',
    description: 'Private charter parties with sound system, catering, and crew for milestone celebrations on the water.',
    featured: true
  },
  {
    id: 'everglades-tours',
    slug: 'everglades-tours-miami',
    title: 'Everglades Tours',
    location: 'Everglades National Park',
    duration: '2-3 hours',
    price: 'From $79',
    image: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=900&q=80',
    description: 'Airboat rides through the sawgrass wetlands with wildlife spotting and a private nature guide.',
    featured: false
  },
  {
    id: 'deep-sea-fishing',
    slug: 'deep-sea-fishing-miami',
    title: 'Deep Sea Fishing',
    location: 'Haulover Marine Center',
    duration: '4-8 hours',
    price: 'From $1,200',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80',
    description: 'Offshore charters targeting mahi-mahi, sailfish, and tuna with a licensed captain and full tackle.',
    featured: false
  },
  {
    id: 'supercar-experiences',
    slug: 'supercar-experiences-miami',
    title: 'Supercar Experiences',
    location: 'Miami Design District',
    duration: 'Half-day',
    price: 'From $499',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
    description: 'Guided supercar driving routes through Miami\'s scenic corridors with a curated fleet of exotics.',
    featured: true
  },
  {
    id: 'vip-beach-experiences',
    slug: 'vip-beach-experiences-miami',
    title: 'VIP Beach Experiences',
    location: 'South Beach',
    duration: 'Full-day',
    price: 'From $650',
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&q=80',
    description: 'Private cabana setups with dedicated service, watersports access, and premium beachfront seating.',
    featured: false
  },
  {
    id: 'celebrity-homes-boat-tours',
    slug: 'celebrity-homes-boat-tours-miami',
    title: 'Celebrity Homes Boat Tours',
    location: 'Biscayne Bay',
    duration: '1.5 hours',
    price: 'From $59',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80',
    description: 'Narrated boat tour past Star Island and Millionaire\'s Row, home to Miami\'s most iconic waterfront estates.',
    featured: false
  },
  {
    id: 'luxury-shopping-tours',
    slug: 'luxury-shopping-tours-miami',
    title: 'Luxury Shopping Tours',
    location: 'Bal Harbour Shops',
    duration: 'Half-day',
    price: 'From $299',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
    description: 'Private-guided shopping itinerary across Bal Harbour and the Design District with VIP store access.',
    featured: false
  },
  {
    id: 'private-concierge-services',
    slug: 'private-concierge-services-miami',
    title: 'Private Concierge Services',
    location: 'Citywide',
    duration: 'On demand',
    price: 'Custom pricing',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=900&q=80',
    description: 'Dedicated concierge for reservations, event access, and itinerary planning across Miami.',
    featured: false
  },
  {
    id: 'sunset-cruises',
    slug: 'sunset-cruises-miami',
    title: 'Sunset Cruises',
    location: 'Miami Beach Marina',
    duration: '2 hours',
    price: 'From $89',
    image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80',
    description: 'Evening cruise along Biscayne Bay with open bar and skyline views as the sun sets over Downtown.',
    featured: true
  },
  {
    id: 'exotic-car-experiences',
    slug: 'exotic-car-experiences-miami',
    title: 'Exotic Car Experiences',
    location: 'Miami Design District',
    duration: '1 day',
    price: 'From $899',
    image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=900&q=80',
    description: 'Full-day exotic car rental package with concierge delivery, insurance, and route recommendations.',
    featured: false
  }
];

export function getExperiences() {
  return experiences;
}

export function getFeaturedExperiences() {
  return experiences.filter((item) => item.featured);
}

export function getExperienceBySlug(slug) {
  return experiences.find((item) => item.slug === slug);
}
