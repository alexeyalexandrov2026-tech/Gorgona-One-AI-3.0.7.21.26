const rentals = [
  {
    id: 'mercedes-g63-amg',
    slug: 'mercedes-g63-amg',
    title: 'Mercedes G63 AMG',
    company: 'Elite Miami Rentals',
    category: 'Luxury Cars',
    location: 'Miami Beach',
    dailyPrice: '$320',
    weeklyPrice: '$1,850',
    monthlyPrice: '$6,200',
    securityDeposit: '$1,500',
    availability: 'Available today',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
    description: 'V8-powered luxury SUV with concierge delivery and premium airport pickup.',
    featured: true
  },
  {
    id: 'lamborghini-huracan',
    slug: 'lamborghini-huracan',
    title: 'Lamborghini Huracan',
    company: 'VIP Drive Club',
    category: 'Luxury Cars',
    location: 'South Miami',
    dailyPrice: '$480',
    weeklyPrice: '$2,900',
    monthlyPrice: '$9,700',
    securityDeposit: '$2,000',
    availability: 'Limited weekend slots',
    image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=900&q=80',
    description: 'A dramatic supercar experience for nightlife, events, and premium weekend travel.',
    featured: true
  },
  {
    id: 'ferrari-f8',
    slug: 'ferrari-f8',
    title: 'Ferrari F8',
    company: 'Miami Supercar Rentals',
    category: 'Sports Cars',
    location: 'Brickell',
    dailyPrice: '$620',
    weeklyPrice: '$3,900',
    monthlyPrice: '$12,500',
    securityDeposit: '$2,500',
    availability: 'Available this week',
    image: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=900&q=80',
    description: 'Performance-focused luxury coupe with premium delivery and valet-ready styling.',
    featured: true
  },
  {
    id: 'rolls-royce-cullinan',
    slug: 'rolls-royce-cullinan',
    title: 'Rolls Royce Cullinan',
    company: 'Prestige Mobility',
    category: 'Luxury Cars',
    location: 'Bal Harbour',
    dailyPrice: '$720',
    weeklyPrice: '$4,500',
    monthlyPrice: '$14,200',
    securityDeposit: '$3,000',
    availability: 'Available next 48hrs',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80',
    description: 'Full-size ultra-luxury SUV for executive transport, airport transfers, and VIP events.',
    featured: true
  },
  {
    id: 'porsche-911',
    slug: 'porsche-911',
    title: 'Porsche 911',
    company: 'Ocean Drive Rentals',
    category: 'Luxury Cars',
    location: 'Downtown Miami',
    dailyPrice: '$280',
    weeklyPrice: '$1,600',
    monthlyPrice: '$5,400',
    securityDeposit: '$1,300',
    availability: 'Booking window open',
    image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=80',
    description: 'Timeless sports car with polished finishes and premium weekend availability.',
    featured: false
  },
  {
    id: 'range-rover',
    slug: 'range-rover',
    title: 'Range Rover',
    company: 'The Island Fleet',
    category: 'SUVs',
    location: 'Aventura',
    dailyPrice: '$260',
    weeklyPrice: '$1,500',
    monthlyPrice: '$4,900',
    securityDeposit: '$1,200',
    availability: 'Available now',
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=900&q=80',
    description: 'Refined all-terrain SUV for upscale travel, resort transfers, and family-style comfort.',
    featured: false
  },
  {
    id: 'bmw-m8',
    slug: 'bmw-m8',
    title: 'BMW M8',
    company: 'Grand Avenue Rentals',
    category: 'Luxury Cars',
    location: 'Wynwood',
    dailyPrice: '$340',
    weeklyPrice: '$2,050',
    monthlyPrice: '$6,900',
    securityDeposit: '$1,600',
    availability: 'High demand',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80',
    description: 'Executive luxury coupe with premium cabin features and quick airport pickup.',
    featured: false
  },
  {
    id: 'corvette-c8',
    slug: 'corvette-c8',
    title: 'Corvette C8',
    company: 'Palm Rentals',
    category: 'Sports Cars',
    location: 'Coconut Grove',
    dailyPrice: '$360',
    weeklyPrice: '$2,200',
    monthlyPrice: '$7,300',
    securityDeposit: '$1,800',
    availability: 'Limited availability',
    image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=900&q=80',
    description: 'American performance icon with low-mileage availability and premium concierge support.',
    featured: false
  }
];

export function getRentals() {
  return rentals;
}

export function getFeaturedRentals() {
  return rentals.filter((item) => item.featured);
}

export function getRentalBySlug(slug) {
  return rentals.find((item) => item.slug === slug);
}
