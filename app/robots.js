import { SITE_URL } from '../lib/seo.mjs';

// Sign-in and account screens carry noindex instead: a robots.txt block would
// hide that tag from crawlers.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/']
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
