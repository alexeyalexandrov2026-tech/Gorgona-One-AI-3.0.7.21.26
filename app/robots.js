export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/profile', '/account/', '/draft/']
    },
    sitemap: 'https://gorgona-one.com/sitemap.xml'
  };
}
