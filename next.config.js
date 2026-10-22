/** @type {import('next').NextConfig} */
const nextConfig = {
  // A build-time switch lets webpack remove the inactive SDK import entirely.
  env: { MIAMI_I18N_PILOT: process.env.MIAMI_I18N_PILOT === '1' ? '1' : '0' },
  async redirects() {
    return [
      // ESPN BET became theScore Bet on December 1, 2025.
      { source: '/sportsbook/espn-bet', destination: '/sportsbook/thescore-bet', permanent: true },
      // Promo codes and offers now live in Stores.
      { source: '/coupons', destination: '/stores', permanent: false }
    ];
  }
};

// The qualification pilot is opt-in. Existing routes keep their original
// compiler and do not acquire a GT provider, middleware, or locale routing.
if (process.env.MIAMI_I18N_PILOT === '1') {
  const { withGTConfig } = require('gt-next/config');
  const { pilotCompiler } = require('./i18n/pilot/compiler.cjs');
  nextConfig.webpack = (config) => {
    config.plugins.unshift(pilotCompiler.webpack());
    return config;
  };
  module.exports = withGTConfig(nextConfig, {
    runtimeUrl: '',
    cacheUrl: null,
    loadTranslationsPath: './i18n/pilot/loadTranslations.js',
    headersAndCookies: { localeCookieName: 'miami-gt-pilot-locale' },
    ignoreBrowserLocales: true,
    localeRouting: false,
    eslint: false,
    experimentalCompilerOptions: { type: 'none' }
  });
} else {
  module.exports = nextConfig;
}
