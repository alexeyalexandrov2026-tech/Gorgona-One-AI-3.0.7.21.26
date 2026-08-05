// Real client fleet. Every car here is one we hold assets for - no invented
// listings, and no prices until the client confirms them.
//
// Fields consumed by the UI, which is untouched: `image` is the cover shown on
// the grid card and behind the hero, `gallery` is the strip on the detail page.
// Price and availability strings render straight into their existing slots, so
// 'On request' keeps the layout intact while the real numbers are pending.
const rentals = [
  {
    id: 'lamborghini-urus-se',
    slug: 'lamborghini-urus-se',
    title: 'Lamborghini Urus SE',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/lamborghini-urus-se/cover.jpg',
    gallery: [
      '/images/rentals/lamborghini-urus-se/01-front-three-quarter.jpg',
      '/images/rentals/lamborghini-urus-se/02-front-low.jpg',
      '/images/rentals/lamborghini-urus-se/03-front-quarter-marina.jpg',
      '/images/rentals/lamborghini-urus-se/04-front-quarter-close.jpg',
      '/images/rentals/lamborghini-urus-se/05-front.jpg',
      '/images/rentals/lamborghini-urus-se/06-front-close.jpg',
      '/images/rentals/lamborghini-urus-se/07-profile.jpg',
      '/images/rentals/lamborghini-urus-se/08-rear-quarter.jpg',
      '/images/rentals/lamborghini-urus-se/09-rear-door-open.jpg',
      '/images/rentals/lamborghini-urus-se/10-doors-open.jpg',
      '/images/rentals/lamborghini-urus-se/11-wheel-flank.jpg',
      '/images/rentals/lamborghini-urus-se/12-wheel-caliper.jpg',
      '/images/rentals/lamborghini-urus-se/13-bonnet-badge.jpg',
      '/images/rentals/lamborghini-urus-se/14-charge-port.jpg',
      '/images/rentals/lamborghini-urus-se/15-cabin.jpg',
      '/images/rentals/lamborghini-urus-se/16-dashboard.jpg',
      '/images/rentals/lamborghini-urus-se/17-steering-wheel.jpg',
      '/images/rentals/lamborghini-urus-se/18-cluster.jpg',
      '/images/rentals/lamborghini-urus-se/19-infotainment.jpg',
      '/images/rentals/lamborghini-urus-se/20-console.jpg',
      '/images/rentals/lamborghini-urus-se/21-dash-script.jpg'
    ],
    // Kept to the length of the listings this replaced (~85 characters), so the
    // card body wraps to the same two lines and the grid keeps its old height.
    description: 'Plug-in hybrid super-SUV in light blue, with silent electric running and a twin-turbo V8.',
    featured: true
  },
  {
    id: 'mercedes-amg-cle-53-cabriolet',
    slug: 'mercedes-amg-cle-53-cabriolet',
    title: 'Mercedes-Benz AMG CLE 53 Cabriolet',
    company: 'GORGONA ONE Fleet',
    category: 'Convertibles',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/mercedes-amg-cle-53/cover.jpg',
    gallery: [
      '/images/rentals/mercedes-amg-cle-53/01-front.jpg',
      '/images/rentals/mercedes-amg-cle-53/02-rear.jpg',
      '/images/rentals/mercedes-amg-cle-53/03-rear-angle.jpg',
      '/images/rentals/mercedes-amg-cle-53/04-side-top.jpg',
      '/images/rentals/mercedes-amg-cle-53/05-interior.jpg'
    ],
    description: 'A powerful AMG convertible with elegant styling, a turbocharged inline-six, and premium open-air cruising.',
    featured: true
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
