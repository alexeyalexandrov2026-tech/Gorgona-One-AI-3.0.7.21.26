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
    description: '2025 Model Year — Plug-in hybrid super-SUV in light blue, with silent electric running and a twin-turbo V8.',
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
    description: '2025 Model Year — A powerful AMG convertible with elegant styling, a turbocharged inline-six, and premium open-air cruising.',
    featured: true
  }
  ,{
    id: 'bmw-7-series-white',
    slug: 'bmw-7-series-white',
    title: 'BMW 7-Series',
    company: 'GORGONA ONE Fleet',
    category: 'Sedans',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/bmw-7-series-white/cover.jpg',
    gallery: [
      '/images/rentals/bmw-7-series-white/cover.jpg',
      '/images/rentals/bmw-7-series-white/01-front.jpg',
      '/images/rentals/bmw-7-series-white/02-rear.jpg',
      '/images/rentals/bmw-7-series-white/03-rear-angle.jpg',
      '/images/rentals/bmw-7-series-white/04-side-top.jpg',
      '/images/rentals/bmw-7-series-white/05-interior.jpg'
    ],
    description: '2025 Model Year — A flagship luxury sedan in pristine white with advanced technology and rear-seat comfort.',
    featured: true
  }
  ,{
    id: 'mercedes-g-class-white',
    slug: 'mercedes-g-class-white',
    title: 'Mercedes-Benz G-Class',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/mercedes-g-class-white/cover.jpg',
    gallery: [
      '/images/rentals/mercedes-g-class-white/cover.jpg',
      '/images/rentals/mercedes-g-class-white/01-front.jpg',
      '/images/rentals/mercedes-g-class-white/02-rear.jpg',
      '/images/rentals/mercedes-g-class-white/03-rear-angle.jpg',
      '/images/rentals/mercedes-g-class-white/04-side-top.jpg',
      '/images/rentals/mercedes-g-class-white/05-interior.jpg'
    ],
    description: '2026 Model Year — The iconic luxury off-roader in striking white, blending rugged performance with ultimate comfort.',
    featured: true
  }
  ,{
    id: 'porsche-911-cabriolet-white',
    slug: 'porsche-911-cabriolet-white',
    title: 'Porsche 911 Cabriolet',
    company: 'GORGONA ONE Fleet',
    category: 'Convertibles',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/porsche-911-cabriolet-white/cover.jpg',
    gallery: [
      '/images/rentals/porsche-911-cabriolet-white/cover.jpg',
      '/images/rentals/porsche-911-cabriolet-white/01-front.jpg',
      '/images/rentals/porsche-911-cabriolet-white/02-rear.jpg',
      '/images/rentals/porsche-911-cabriolet-white/03-rear-angle.jpg',
      '/images/rentals/porsche-911-cabriolet-white/04-side-top.jpg',
      '/images/rentals/porsche-911-cabriolet-white/05-interior.jpg'
    ],
    description: '2025 Model Year — A classic sports car in white with a bold red interior, offering thrilling performance and open-top driving.',
    featured: true
  }
  ,{
    id: 'bmw-x6-light-blue',
    slug: 'bmw-x6-light-blue',
    title: 'BMW X6',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/bmw-x6-light-blue/cover.jpg',
    gallery: [
      '/images/rentals/bmw-x6-light-blue/cover.jpg',
      '/images/rentals/bmw-x6-light-blue/01-front.jpg',
      '/images/rentals/bmw-x6-light-blue/02-rear.jpg',
      '/images/rentals/bmw-x6-light-blue/03-rear-angle.jpg',
      '/images/rentals/bmw-x6-light-blue/04-side-top.jpg',
      '/images/rentals/bmw-x6-light-blue/05-interior.jpg'
    ],
    description: '2026 Model Year — A sporty luxury coupe-SUV in light blue, featuring dynamic styling and a refined driving experience.',
    featured: true
  }
  ,{
    id: 'mercedes-g-class-blue',
    slug: 'mercedes-g-class-blue',
    title: 'Mercedes-Benz G-Class',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/mercedes-g-class-blue/cover.jpg',
    gallery: [
      '/images/rentals/mercedes-g-class-blue/cover.jpg',
      '/images/rentals/mercedes-g-class-blue/01-front.jpg',
      '/images/rentals/mercedes-g-class-blue/02-rear.jpg',
      '/images/rentals/mercedes-g-class-blue/03-rear-angle.jpg',
      '/images/rentals/mercedes-g-class-blue/04-side-top.jpg',
      '/images/rentals/mercedes-g-class-blue/05-interior.jpg'
    ],
    description: '2025 Model Year — A bold luxury SUV in blue, renowned for its timeless design and commanding presence.',
    featured: true
  }
  ,{
    id: 'range-rover-sport-white',
    slug: 'range-rover-sport-white',
    title: 'Range Rover Sport',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/range-rover-sport-white/cover.jpg',
    gallery: [
      '/images/rentals/range-rover-sport-white/cover.jpg',
      '/images/rentals/range-rover-sport-white/01-front.jpg',
      '/images/rentals/range-rover-sport-white/02-rear.jpg',
      '/images/rentals/range-rover-sport-white/03-rear-angle.jpg',
      '/images/rentals/range-rover-sport-white/04-side-top.jpg',
      '/images/rentals/range-rover-sport-white/05-interior.jpg'
    ],
    description: '2025 Model Year — A dynamic luxury SUV in white, delivering sporty performance and refined comfort.',
    featured: true
  }
  ,{
    id: 'bentley-flying-spur-white',
    slug: 'bentley-flying-spur-white',
    title: 'Bentley Flying Spur',
    company: 'GORGONA ONE Fleet',
    category: 'Sedans',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/bentley-flying-spur-white/cover.jpg',
    gallery: [
      '/images/rentals/bentley-flying-spur-white/cover.jpg',
      '/images/rentals/bentley-flying-spur-white/01-front.jpg',
      '/images/rentals/bentley-flying-spur-white/02-rear.jpg',
      '/images/rentals/bentley-flying-spur-white/03-rear-angle.jpg',
      '/images/rentals/bentley-flying-spur-white/04-side-top.jpg',
      '/images/rentals/bentley-flying-spur-white/05-interior.jpg'
    ],
    description: '2024 Model Year — An ultra-luxury grand touring sedan in white, featuring exquisite craftsmanship and powerful performance.',
    featured: true
  }
  ,{
    id: 'bentley-bentayga-white',
    slug: 'bentley-bentayga-white',
    title: 'Bentley Bentayga',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/bentley-bentayga-white/cover.jpg',
    gallery: [
      '/images/rentals/bentley-bentayga-white/cover.jpg',
      '/images/rentals/bentley-bentayga-white/01-front.jpg',
      '/images/rentals/bentley-bentayga-white/02-rear.jpg',
      '/images/rentals/bentley-bentayga-white/03-rear-angle.jpg',
      '/images/rentals/bentley-bentayga-white/04-side-top.jpg',
      '/images/rentals/bentley-bentayga-white/05-interior.jpg'
    ],
    description: '2023 Model Year — A premium luxury SUV in white, combining effortless power with an opulent interior.',
    featured: true
  }
  ,{
    id: 'rolls-royce-cullinan-black',
    slug: 'rolls-royce-cullinan-black',
    title: 'Rolls-Royce Cullinan',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/rolls-royce-cullinan-black/cover.jpg',
    gallery: [
      '/images/rentals/rolls-royce-cullinan-black/cover.jpg',
      '/images/rentals/rolls-royce-cullinan-black/01-front.jpg',
      '/images/rentals/rolls-royce-cullinan-black/02-rear.jpg',
      '/images/rentals/rolls-royce-cullinan-black/03-rear-angle.jpg',
      '/images/rentals/rolls-royce-cullinan-black/04-side-top.jpg',
      '/images/rentals/rolls-royce-cullinan-black/05-interior.jpg'
    ],
    description: '2024 Model Year — The pinnacle of luxury SUVs in elegant black, offering an unmatched magic carpet ride.',
    featured: true
  }
  ,{
    id: 'bentley-continental-gt-conv-grey',
    slug: 'bentley-continental-gt-conv-grey',
    title: 'Bentley Continental GT Convertible',
    company: 'GORGONA ONE Fleet',
    category: 'Convertibles',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/bentley-continental-gt-conv-grey/cover.jpg',
    gallery: [
      '/images/rentals/bentley-continental-gt-conv-grey/cover.jpg',
      '/images/rentals/bentley-continental-gt-conv-grey/01-front.jpg',
      '/images/rentals/bentley-continental-gt-conv-grey/02-rear.jpg',
      '/images/rentals/bentley-continental-gt-conv-grey/03-rear-angle.jpg',
      '/images/rentals/bentley-continental-gt-conv-grey/04-side-top.jpg',
      '/images/rentals/bentley-continental-gt-conv-grey/05-interior.jpg'
    ],
    description: '2024 Model Year — A luxurious grand tourer in grey, perfect for elegant and powerful open-air cruising.',
    featured: true
  }
  ,{
    id: 'mercedes-gle-white',
    slug: 'mercedes-gle-white',
    title: 'Mercedes-Benz GLE',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/mercedes-gle-white/cover.jpg',
    gallery: [
      '/images/rentals/mercedes-gle-white/cover.jpg',
      '/images/rentals/mercedes-gle-white/01-front.jpg',
      '/images/rentals/mercedes-gle-white/02-rear.jpg',
      '/images/rentals/mercedes-gle-white/03-rear-angle.jpg',
      '/images/rentals/mercedes-gle-white/04-side-top.jpg',
      '/images/rentals/mercedes-gle-white/05-interior.jpg'
    ],
    description: '2026 Model Year — A versatile luxury SUV in white, featuring a spacious interior and smooth ride.',
    featured: true
  }
  ,{
    id: 'mercedes-gls-white',
    slug: 'mercedes-gls-white',
    title: 'Mercedes-Benz GLS',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/mercedes-gls-white/cover.jpg',
    gallery: [
      '/images/rentals/mercedes-gls-white/cover.jpg',
      '/images/rentals/mercedes-gls-white/01-front.jpg',
      '/images/rentals/mercedes-gls-white/02-rear.jpg',
      '/images/rentals/mercedes-gls-white/03-rear-angle.jpg',
      '/images/rentals/mercedes-gls-white/04-side-top.jpg',
      '/images/rentals/mercedes-gls-white/05-interior.jpg'
    ],
    description: '2026 Model Year — A full-size luxury SUV in white, offering first-class travel for all passengers.',
    featured: true
  }
  ,{
    id: 'mercedes-maybach-gls-white',
    slug: 'mercedes-maybach-gls-white',
    title: 'Mercedes-Maybach GLS',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/mercedes-maybach-gls-white/cover.jpg',
    gallery: [
      '/images/rentals/mercedes-maybach-gls-white/cover.jpg',
      '/images/rentals/mercedes-maybach-gls-white/01-front.jpg',
      '/images/rentals/mercedes-maybach-gls-white/02-rear.jpg',
      '/images/rentals/mercedes-maybach-gls-white/03-rear-angle.jpg',
      '/images/rentals/mercedes-maybach-gls-white/04-side-top.jpg',
      '/images/rentals/mercedes-maybach-gls-white/05-interior.jpg'
    ],
    description: '2026 Model Year — The ultimate luxury SUV in white, redefining opulence with executive seating and bespoke details.',
    featured: true
  }
  ,{
    id: 'mercedes-gle-coupe-white',
    slug: 'mercedes-gle-coupe-white',
    title: 'Mercedes-Benz GLE Coupe',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/mercedes-gle-coupe-white/cover.jpg',
    gallery: [
      '/images/rentals/mercedes-gle-coupe-white/cover.jpg',
      '/images/rentals/mercedes-gle-coupe-white/01-front.jpg',
      '/images/rentals/mercedes-gle-coupe-white/02-rear.jpg',
      '/images/rentals/mercedes-gle-coupe-white/03-rear-angle.jpg',
      '/images/rentals/mercedes-gle-coupe-white/04-side-top.jpg',
      '/images/rentals/mercedes-gle-coupe-white/05-interior.jpg'
    ],
    description: '2026 Model Year — A stylish luxury coupe-SUV in white, blending sporty aesthetics with premium comfort.',
    featured: true
  }
  ,{
    id: 'mercedes-gle-black',
    slug: 'mercedes-gle-black',
    title: 'Mercedes-Benz GLE',
    company: 'GORGONA ONE Fleet',
    category: 'SUVs',
    location: 'Miami',
    dailyPrice: 'On request',
    weeklyPrice: 'On request',
    monthlyPrice: 'On request',
    securityDeposit: 'On request',
    availability: 'Enquire',
    image: '/images/rentals/mercedes-gle-black/cover.jpg',
    gallery: [
      '/images/rentals/mercedes-gle-black/cover.jpg',
      '/images/rentals/mercedes-gle-black/01-front.jpg',
      '/images/rentals/mercedes-gle-black/02-rear.jpg',
      '/images/rentals/mercedes-gle-black/03-rear-angle.jpg',
      '/images/rentals/mercedes-gle-black/04-side-top.jpg',
      '/images/rentals/mercedes-gle-black/05-interior.jpg'
    ],
    description: '2025 Model Year — A sleek luxury SUV in black, offering advanced technology and elegant design.',
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
