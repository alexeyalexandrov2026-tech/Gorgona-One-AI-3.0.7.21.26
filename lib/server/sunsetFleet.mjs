import details from './sunsetFleetDetails.json' with { type: 'json' };
import { rewriteRentalImages } from '../rentalMedia.mjs';

// Kept server-side: multi-page descriptions and complete galleries must not
// enter the client search/AI intent index through rentalsData or homeData.
export function sunsetDetail(slug) {
  return Object.hasOwn(details, slug) ? rewriteRentalImages(details[slug]) : null;
}
