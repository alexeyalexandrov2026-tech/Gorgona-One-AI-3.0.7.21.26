export default function manifest() {
  return {
    id: '/',
    name: 'MIAMI ELIO',
    short_name: 'Miami Elio',
    description: 'ELIO+ Guide — private AI travel and lifestyle platform for yachts, cars, stays, dining and events in Miami.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#050505',
    theme_color: '#050505',
    categories: ['lifestyle', 'travel', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
