/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/experiences/helicopter-tours-miami', destination: '/experiences#experience-viator-231628p7', permanent: true },
      { source: '/experiences/jet-ski-adventures-miami', destination: '/experiences', permanent: true },
      { source: '/experiences/yacht-parties-miami', destination: '/yachts', permanent: true },
      { source: '/experiences/everglades-tours-miami', destination: '/experiences/everglades', permanent: true },
      { source: '/experiences/deep-sea-fishing-miami', destination: '/experiences', permanent: true },
      { source: '/experiences/supercar-experiences-miami', destination: '/rentals', permanent: true },
      { source: '/experiences/vip-beach-experiences-miami', destination: '/experiences', permanent: true },
      { source: '/experiences/celebrity-homes-boat-tours-miami', destination: '/experiences/best-miami-water-activities-upto-20-off-headout', permanent: true },
      { source: '/experiences/luxury-shopping-tours-miami', destination: '/experiences', permanent: true },
      { source: '/experiences/private-concierge-services-miami', destination: '/discovery', permanent: true },
      { source: '/experiences/sunset-cruises-miami', destination: '/experiences/best-miami-water-activities-upto-20-off-headout', permanent: true },
      { source: '/experiences/exotic-car-experiences-miami', destination: '/rentals', permanent: true },

      { source: '/stores/restaurants', destination: '/restaurants-nightlife', permanent: true },
      { source: '/stores/:path*', destination: '/experiences', permanent: true },
      // This legacy card contained BMW X5 photographs and was corrected in place.
      { source: '/rentals/mercedes-g-class-white', destination: '/rentals/bmw-x5-white-brown', permanent: true },
      // The sportsbook section was removed; its old addresses lead home.
      { source: '/sportsbook/:path*', destination: '/', permanent: false },
      { source: '/sports-betting-promos', destination: '/', permanent: false },
      { source: '/betmgm-promos', destination: '/', permanent: false },
      { source: '/caesars-sportsbook-promos', destination: '/', permanent: false },
      { source: '/draftkings-promos', destination: '/', permanent: false },
      { source: '/fanduel-promos', destination: '/', permanent: false },
      // Promo codes and offers now live in Stores.
      { source: '/coupons', destination: '/experiences', permanent: false }
    ];
  }
};

module.exports = nextConfig;
