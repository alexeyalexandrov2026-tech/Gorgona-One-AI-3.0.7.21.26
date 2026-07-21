// Restaurants & Nightlife marketplace data. Static for now (mirrors the
// pattern used by lib/rentalsData.js and lib/yachtsData.js). Kept separate
// from the Kosher Restaurants category (lib/dealsData.js) and from the
// generic fast-food "restaurants" coupon category - this is a Miami
// dining/nightlife guide, not a coupon feed.

export const VENUE_CATEGORIES = [
  { slug: 'restaurant', label: 'Restaurants' },
  { slug: 'nightlife', label: 'Nightlife' }
];

const venues = [
  {
    id: 'komodo',
    slug: 'komodo-miami',
    name: 'Komodo',
    category: 'restaurant',
    location: 'Brickell, Miami, FL',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
    description: 'Southeast Asian fine dining across three stories with a rooftop lounge and lush open-air terrace.'
  },
  {
    id: 'papi-steak',
    slug: 'papi-steak-miami',
    name: 'Papi Steak',
    category: 'restaurant',
    location: 'South Beach, Miami, FL',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    description: 'Celebrity-favorite steakhouse known for gold-dusted tomahawks and a high-energy dining room.'
  },
  {
    id: 'sexy-fish',
    slug: 'sexy-fish-miami',
    name: 'Sexy Fish',
    category: 'restaurant',
    location: 'Miami Design District, FL',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80',
    description: 'Asian-inspired seafood restaurant with striking interior art and a lively bar scene.'
  },
  {
    id: 'carbone',
    slug: 'carbone-miami',
    name: 'Carbone',
    category: 'restaurant',
    location: 'South Beach, Miami, FL',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=80',
    description: 'Red-sauce Italian-American institution with white-glove service and old-school Miami glamour.'
  },
  {
    id: 'prime-112',
    slug: 'prime-112-miami',
    name: 'Prime 112',
    category: 'restaurant',
    location: 'South Beach, Miami, FL',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    description: 'Legendary steakhouse in a historic 1915 building, famous for its bacon and people-watching.'
  },
  {
    id: 'joes-stone-crab',
    slug: 'joes-stone-crab-miami',
    name: "Joe's Stone Crab",
    category: 'restaurant',
    location: 'South Beach, Miami, FL',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80',
    description: 'Miami institution since 1913, serving fresh stone crab claws in a classic dining room.'
  },
  {
    id: 'liv',
    slug: 'liv-miami',
    name: 'LIV',
    category: 'nightlife',
    location: 'Fontainebleau, Miami Beach, FL',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1571266028243-d220c9c3b31d?auto=format&fit=crop&w=900&q=80',
    description: 'World-renowned nightclub hosting top international DJs inside the iconic Fontainebleau hotel.'
  },
  {
    id: 'e11even',
    slug: 'e11even-miami',
    name: 'E11EVEN',
    category: 'nightlife',
    location: 'Downtown Miami, FL',
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=900&q=80',
    description: 'Always-open ultraclub with live performances, aerial acts, and round-the-clock entertainment.'
  },
  {
    id: 'club-space',
    slug: 'club-space-miami',
    name: 'Club Space',
    category: 'nightlife',
    location: 'Downtown Miami, FL',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1571935441005-15f75d61b3d5?auto=format&fit=crop&w=900&q=80',
    description: 'Underground electronic music venue famous for sunrise sets on the open-air terrace.'
  },
  {
    id: 'story',
    slug: 'story-miami',
    name: 'Story',
    category: 'nightlife',
    location: 'South Beach, Miami, FL',
    rating: 4.3,
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=80',
    description: 'High-energy South Beach nightclub with a rotating lineup of hip-hop and EDM headliners.'
  },
  {
    id: 'rosa-sky',
    slug: 'rosa-sky-miami',
    name: 'Rosa Sky',
    category: 'nightlife',
    location: 'Downtown Miami, FL',
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80',
    description: 'Rooftop lounge with skyline views, craft cocktails, and a stylish sunset-to-late-night crowd.'
  },
  {
    id: 'sugar-rooftop',
    slug: 'sugar-rooftop-miami',
    name: 'Sugar Rooftop',
    category: 'nightlife',
    location: 'Downtown Miami, FL',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1560624052-449f5ddf0c31?auto=format&fit=crop&w=900&q=80',
    description: '40th-floor rooftop bar blending East Asian-inspired decor with panoramic bay views.'
  }
];

export function getVenues() {
  return venues;
}

export function getVenuesByCategory(category) {
  if (!category || category === 'all') return venues;
  return venues.filter((venue) => venue.category === category);
}

export function getVenueBySlug(slug) {
  return venues.find((venue) => venue.slug === slug);
}
