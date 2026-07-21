export default function manifest() {
  return {
    id: '/',
    name: 'GORGONA ONE',
    short_name: 'GORGONA',
    description: 'A luxury AI concierge for travel, dining, shopping, stays, yachts, cars, sportsbooks and events.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#050505',
    theme_color: '#050505',
    categories: ['lifestyle', 'travel', 'shopping'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
