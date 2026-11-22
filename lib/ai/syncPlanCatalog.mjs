// Catalogue a plan can rank without Supabase. Dining uses the verified venues
// already published on the site, so a dinner request still has somewhere to go
// when the dining request flags are off.
import {getYachts} from '../yachtsData.js';
import {getVacationRentals} from '../vacationRentalsData.js';
import {getRentals} from '../rentalsData.js';
import {getVenues} from '../restaurantsNightlifeData.js';
import {seatsForCar} from '../carSeats.mjs';
import {primaryAction} from '../dining/gateway.mjs';

const count = value => { const match = String(value ?? '').match(/\d{1,3}/); return match ? Number(match[0]) : null; };
const words = (...values) => values.flat().filter(value => typeof value === 'string' && value).join(' ');
const image = value => typeof value === 'string' && (/^https:\/\//.test(value) || /^\/(?!\/)/.test(value)) ? value : undefined;

export function syncPlanCatalog() {
  return {
    yacht: getYachts().map(item => ({
      kind: 'yacht', slug: item.slug, title: item.title,
      subtitle: words(item.length, item.location) || undefined,
      image: image(item.image), price: item.price || undefined,
      capacity: count(item.capacity), featured: !!item.featured,
      text: words(item.company, item.location, item.description, 'yacht boat charter')
    })),
    stay: getVacationRentals().filter(item => item.availability !== 'booked').map(item => ({
      kind: 'stay', slug: item.slug, title: item.title,
      subtitle: item.location || undefined, image: image(item.image),
      price: item.nightlyRate || undefined, capacity: count(item.guests),
      featured: !!item.featured, text: words(item.location, item.description, 'villa stay house')
    })),
    car: getRentals().map(item => ({
      kind: 'car', slug: item.slug, title: item.title,
      subtitle: words(item.category, item.company) || undefined,
      image: image(item.thumbnail) || image(item.image),
      price: item.dailyPrice || undefined,
      capacity: seatsForCar(item), featured: !!item.featured,
      text: words(item.company, item.category, item.description, 'car rental drive')
    })),
    dining: getVenues().filter(item => item.status === 'verified').map(item => ({
      kind: item.category === 'nightlife' ? 'nightlife' : 'dining',
      slug: item.slug, title: item.name,
      subtitle: words(item.neighborhood || item.location) || undefined,
      image: image(item.image), price: item.price || undefined,
      booking: primaryAction(item) || undefined,
      capacity: null, featured: false,
      text: words(item.category, item.cuisine, item.neighborhood, item.description, item.features, item.category === 'nightlife' ? 'nightlife nightclub club bar' : 'restaurant dinner dining')
    }))
  };
}
