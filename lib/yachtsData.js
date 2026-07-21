// Yacht Rentals marketplace data. Static for now (mirrors the pattern used
// by lib/rentalsData.js) - see database/schema.sql for the table shapes
// this is designed to migrate to once a real Admin Dashboard/Supabase-backed
// CRUD exists.

const yachts = [
  {
    id: 'lamborghini-yacht-tecnomar',
    slug: 'lamborghini-yacht-tecnomar',
    title: 'Lamborghini Yacht Tecnomar',
    company: 'Miami Elite Yachts',
    location: 'Miami Beach Marina',
    capacity: 12,
    length: '63 ft',
    price: '$8,500 / day',
    image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=900&q=80',
    description: 'A carbon-fiber hypercar for the water, co-engineered with Lamborghini design language and twin MAN V12 engines.',
    featured: true
  },
  {
    id: 'sunseeker-predator-74',
    slug: 'sunseeker-predator-74',
    title: 'Sunseeker Predator 74',
    company: 'Biscayne Bay Charters',
    location: 'Fisher Island Marina',
    capacity: 13,
    length: '74 ft',
    price: '$6,200 / day',
    image: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=900&q=80',
    description: 'Sport-cruiser styling with a sundeck, jacuzzi, and full-beam master suite for open-water entertaining.',
    featured: true
  },
  {
    id: 'azimut-68-fly',
    slug: 'azimut-68-fly',
    title: 'Azimut 68 Fly',
    company: 'Miami Elite Yachts',
    location: 'Star Island Marina',
    capacity: 11,
    length: '68 ft',
    price: '$5,400 / day',
    image: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&w=900&q=80',
    description: 'A flybridge motor yacht with three staterooms, Italian interior design, and a stabilized cruise for smooth sunset runs.',
    featured: false
  },
  {
    id: 'pershing-8x',
    slug: 'pershing-8x',
    title: 'Pershing 8X',
    company: 'South Beach Yacht Club',
    location: 'South Beach Marina',
    capacity: 10,
    length: '79 ft',
    price: '$9,800 / day',
    image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=900&q=80',
    description: 'Award-winning Italian performance yacht with a beach-club stern platform and cruising speeds over 40 knots.',
    featured: true
  },
  {
    id: 'galeon-70-skydeck',
    slug: 'galeon-70-skydeck',
    title: 'Galeon 70 Skydeck',
    company: 'Biscayne Bay Charters',
    location: 'Miami Beach Marina',
    capacity: 12,
    length: '70 ft',
    price: '$5,900 / day',
    image: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=900&q=80',
    description: 'Panoramic glass hull windows and a fold-out balcony transform the main deck into an open-air lounge at anchor.',
    featured: false
  },
  {
    id: 'princess-y85',
    slug: 'princess-y85',
    title: 'Princess Y85',
    company: 'South Beach Yacht Club',
    location: 'Fisher Island Marina',
    capacity: 12,
    length: '85 ft',
    price: '$11,200 / day',
    image: 'https://images.unsplash.com/photo-1520255870062-bd79d3865de7?auto=format&fit=crop&w=900&q=80',
    description: 'Flagship British craftsmanship with a full-beam owner\'s suite, on-deck bar, and crew of four for full-service charters.',
    featured: false
  }
];

export function getYachts() {
  return yachts;
}

export function getFeaturedYachts() {
  return yachts.filter((item) => item.featured);
}

export function getYachtBySlug(slug) {
  return yachts.find((item) => item.slug === slug);
}
