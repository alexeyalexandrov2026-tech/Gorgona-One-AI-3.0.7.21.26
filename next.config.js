/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // ESPN BET became theScore Bet on December 1, 2025.
      { source: '/sportsbook/espn-bet', destination: '/sportsbook/thescore-bet', permanent: true },
      // Promo codes and offers now live in Stores.
      { source: '/coupons', destination: '/stores', permanent: false }
    ];
  }
};

module.exports = nextConfig;
