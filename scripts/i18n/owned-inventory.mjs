import { getRentals } from '../../lib/rentalsData.js';
import { getYachts } from '../../lib/yachtsData.js';
import { getVacationRentals } from '../../lib/vacationRentalsData.js';
import { getExperiences } from '../../lib/experiencesData.js';
import { getVenues } from '../../lib/restaurantsNightlifeData.js';

// Our checked-in material only. Event feeds, supplier documents and user
// submissions are deliberately absent from this inventory.
export const OWNED_RECORDS = [
  ...getRentals().map(record => ({ world:'cars', record })),
  ...getYachts().map(record => ({ world:'yachts', record })),
  ...getVacationRentals().map(record => ({ world:'stays', record })),
  ...getExperiences().map(record => ({ world:'experiences', record })),
  ...getVenues().map(record => ({ world:'venues', record }))
];
export function ownedMessages() {
  return OWNED_RECORDS.flatMap(({world,record}) => {
    const fields = ['description', ...(['stays','experiences'].includes(world) ? ['title'] : [])];
    return fields.map(field => [`listing.${record.id}.${field}`, record[field], `${world} / ${record.slug} / ${field}`]);
  });
}
