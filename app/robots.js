export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Account pages, portals, drafts and the API have nothing to index.
      disallow: ['/admin', '/partner$', '/profile', '/login', '/register', '/draft/', '/api/']
    },
    sitemap: 'https://gorgona-one.com/sitemap.xml'
  };
}
