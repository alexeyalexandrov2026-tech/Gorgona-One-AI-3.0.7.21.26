/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // This legacy card contained BMW X5 photographs and was corrected in place.
      { source: '/rentals/mercedes-g-class-white', destination: '/rentals/bmw-x5-white-brown', permanent: true },
      // ESPN BET became theScore Bet on December 1, 2025.
      { source: '/sportsbook/espn-bet', destination: '/sportsbook/thescore-bet', permanent: true },
      // Promo codes and offers now live in Stores.
      { source: '/coupons', destination: '/stores', permanent: false }
    ];
  }
};

module.exports = nextConfig;
