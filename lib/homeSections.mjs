// Lightweight homepage section registry and listing thumbnail helper.
// Kept separate from lib/homeData.js so client components never pull the
// full 290-car rental fleet JSON into the browser bundle.

export function carThumb(car) {
  return car.card || car.thumbnail || car.image.replace(/cover\.jpg$/, 'cover-s.jpg');
}

export const HOME_SECTIONS = [
  { id: 'travel', href: '/travel', image: '/images/home/travel-beach.webp' },
  { id: 'exclusive', href: '/exclusive-destinations', image: '/images/experiences/miami-coast.webp' },
  { id: 'stays', href: '/vacation-rentals', image: '/images/home/worlds/stay-miami-beach.jpg' },
  { id: 'yachts', href: '/yachts', image: '/images/home/worlds/yacht-princess.jpg' },
  { id: 'cars', href: '/rentals', image: '/images/home/worlds/cars-urus.jpg' },
  { id: 'events', href: '/events', image: '/images/home/worlds/events-stage.jpg' },
  { id: 'privateJets', href: '/private-jets', image: '/images/home/worlds/travel-wing.jpg' },
  { id: 'experiences', href: '/experiences', image: '/images/home/experiences-coaster.webp' },
  { id: 'dining', href: '/restaurants-nightlife', image: '/images/dining/komodo.jpg' },
  { id: 'concierge', href: '/discovery' }
];
