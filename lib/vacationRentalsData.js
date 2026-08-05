// Vacation Rentals marketplace data. Static for now (mirrors the pattern
// used by lib/rentalsData.js and lib/yachtsData.js).

const vacationRentals = [
  {
    id: 'miami-beach-villa',
    slug: 'miami-beach-villa',
    title: 'Miami Beach Villa',
    location: 'Miami Beach, FL',
    guests: 'On request',
    bedrooms: 5,
    nightlyRate: 'On request',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80',
    description: 'Oceanfront villa with a private pool, rooftop terrace, and direct beach access steps from Ocean Drive.',
    featured: true
  },
  {
    id: 'star-island-estate',
    slug: 'star-island-estate',
    title: 'Star Island Estate',
    location: 'Star Island, Miami, FL',
    guests: 'On request',
    bedrooms: 7,
    nightlyRate: 'On request',
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=80',
    description: 'Gated waterfront estate with a private dock, home theater, and panoramic Biscayne Bay skyline views.',
    featured: true
  },
  {
    id: 'fisher-island-penthouse',
    slug: 'fisher-island-penthouse',
    title: 'Fisher Island Penthouse',
    location: 'Fisher Island, FL',
    guests: 'On request',
    bedrooms: 3,
    nightlyRate: 'On request',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
    description: 'Island-access penthouse with wraparound terraces, private ferry service, and resort-style amenities.',
    featured: true
  },
  {
    id: 'sunny-isles-luxury-condo',
    slug: 'sunny-isles-luxury-condo',
    title: 'Sunny Isles Luxury Condo',
    location: 'Sunny Isles Beach, FL',
    guests: 'On request',
    bedrooms: 3,
    nightlyRate: 'On request',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80',
    description: 'High-floor beachfront condo with floor-to-ceiling views, full-service spa, and private cabana access.',
    featured: false
  },
  {
    id: 'brickell-sky-residence',
    slug: 'brickell-sky-residence',
    title: 'Brickell Sky Residence',
    location: 'Brickell, Miami, FL',
    guests: 'On request',
    bedrooms: 2,
    nightlyRate: 'On request',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
    description: 'Sky-high residence in the financial district with skyline views, rooftop pool, and walkable nightlife.',
    featured: false
  },
  {
    id: 'key-biscayne-waterfront-home',
    slug: 'key-biscayne-waterfront-home',
    title: 'Key Biscayne Waterfront Home',
    location: 'Key Biscayne, FL',
    guests: 'On request',
    bedrooms: 4,
    nightlyRate: 'On request',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80',
    description: 'Secluded waterfront home with a private dock, lush tropical gardens, and quick access to Crandon Park.',
    featured: false
  }
];

export function getVacationRentals() {
  return vacationRentals;
}

export function getFeaturedVacationRentals() {
  return vacationRentals.filter((item) => item.featured);
}

export function getVacationRentalBySlug(slug) {
  return vacationRentals.find((item) => item.slug === slug);
}
