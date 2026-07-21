export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin']
    },
    sitemap: 'https://gorgona-one.com/sitemap.xml'
  };
}
