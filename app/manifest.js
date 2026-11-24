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
    background_color: '#01212c',
    theme_color: '#01212c',
    categories: ['lifestyle', 'travel', 'entertainment'],
    shortcuts: [
      {
        name: 'ELIO+ Guide',
        short_name: 'ELIO+ Guide',
        url: '/discovery',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Exotic Cars',
        short_name: 'Cars',
        url: '/rentals',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Travel & Stays',
        short_name: 'Travel',
        url: '/travel',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Live Trip Room',
        short_name: 'Trip Room',
        url: '/trip',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
      }
    ],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
